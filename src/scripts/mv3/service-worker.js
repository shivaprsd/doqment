/**
 * Add a context menu to open links (to PDF) in the extension
 * We won't check the link and leave error handling to viewer
 */
import { getViewerURL } from "../utils.js";

chrome.runtime.onInstalled.addListener(createMenus);
chrome.contextMenus.onClicked.addListener(handleClick);
chrome.permissions.onRemoved.addListener(resetMenus);
chrome.permissions.onAdded.addListener(checkPermit);
chrome.action.onClicked.addListener(newViewer);
chrome.runtime.onMessage.addListener(respond);

const baseUrl = chrome.runtime.getURL("pdfjs/web/viewer.html");
const messageUrl = getViewerURL(baseUrl, "/pages/Access Denied");
const splashUrl = getViewerURL(baseUrl, "/pages/Open File");
const autoOpener = "scripts/mv3/content-script.js";
const viewerCSS = "scripts/mv3/viewer.css";

function getMenuTitle(autoOpenEnabled) {
  return !autoOpenEnabled ? "Open in do&qment" : "Open in built-in PDF viewer";
}

/* Event handlers */
function createMenus() {
  const createMenu = (id, title, contexts, extras) => {
    chrome.contextMenus.create({ id, title, contexts, ...extras });
  };
  const createOption = (id, title, extras) => {
    createMenu(id, title, ["action"], { type: "checkbox", ...extras });
  };

  createMenu("open-link", getMenuTitle(false), ["link", "frame"]);
  createOption("allow-all", "Always allow access to sites");
  createOption("make-default", "Make doqment the default viewer");
}

async function handleClick(info, tab) {
  const menuId = info.menuItemId;
  const tabId = (tab.id < 0) ? null : tab.id;
  switch (menuId) {
    case "open-link":
      const url = info.linkUrl || info.frameUrl;
      await openLink(url, tabId);
      break;
    case "allow-all":
      await requestAccess(menuId, info.checked, tabId);
      break;
    case "make-default":
      const enable = info.checked && await requestAccess("allow-all", true);
      toggleAutoOpen(enable, menuId);
      break;
  }
}

/* Open link in the viewer after requesting host permission to it;
/* if doqment is the default, open in the built-in viewer instead */
async function openLink(url, openerTabId) {
  const permit = { origins: [url] };
  const allowed = await chrome.permissions.request(permit).catch(r => {});
  if (allowed === false) {
    return;
  }
  const isViewerUrl = url.startsWith(baseUrl);
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  /* We cannot check this earlier because `permissions.request()`
   * has to be called immediately after user action where needed */
  if (scripts.length > 0) {
    if (isViewerUrl) {
      url = new URL(url).searchParams.get("file");
    }
    url = new URL(url);
    url.searchParams.set("doqment", "ignore");
    chrome.tabs.create({ url: url.toString(), openerTabId });
  } else {
    const newTab = await chrome.tabs.create({ url, openerTabId });
    if (allowed)
      loadViewer(getViewerURL(baseUrl, url), newTab.id);
  }
}

async function requestAccess(menuId, allow, openerTabId) {
  let allowed;
  if (allow) {
    const permit = { origins: ["<all_urls>"] };
    allowed = await chrome.permissions.request(permit);
  } else {
    /* Users have to manually revoke site access via settings;
     * otherwise, no prompt is shown for future requests */
    allowed = true;
    openSettings(openerTabId);
  }
  updateMenu(menuId, { checked: allowed });
  return allowed;
}

/* Set content script to detect PDFs and send back the URL;
 * respond by loading the viewer frame in the sender tab */
function toggleAutoOpen(enable, menuId) {
  if (enable) {
    chrome.scripting.registerContentScripts([{
      id: "auto-open",
      js: [autoOpener],
      runAt: "document_start",
      matches: ["<all_urls>"],
      allFrames: true
    }]);
  } else {
    chrome.scripting.unregisterContentScripts();
  }
  updateMenu(menuId, { checked: enable });
  updateMenu("open-link", { title: getMenuTitle(enable) });
}

function respond(request, sender, sendResponse) {
  const tabId = sender.tab.id;
  if (request.action === "loadViewer") {
    const viewerUrl = getViewerURL(baseUrl, request.body);
    if (sender.frameId === 0) {
      loadViewer(viewerUrl, tabId);
    } else {
      sendResponse({ url: viewerUrl });
    }
  } else if (request.action === "removeViewer") {
    const func = () => document.getElementById("doqmentViewer").remove();
    chrome.scripting.executeScript({ target: {tabId}, func });
  } else if (request.action === "updateTitle") {
    const func = title => document.title = title;
    const title = request.body;
    chrome.scripting.executeScript({ target: { tabId }, func, args: [title] });
  }
}

/* Guide users in removing all-sites access permission, and prompt them
 * to open the settings page. Since the SW has no window object, to show
 * the dialog we have to workaround by executing a script in the current
 * tab (if allowed) or an extension page/frame (if one exists). */
function openSettings(openerTabId) {
  const message = "Extensions cannot truly give up granted permissions.\n\n" +
                  "To revoke or modify the permission, visit 'Site access' " +
                  "settings in extension details.\n\nDo you want to open it?";
  const confirm = {
    target: { tabId: openerTabId },
    func: msg => window.confirm(msg),
    args: [message]
  };
  chrome.scripting.executeScript(confirm)
    .catch(r => chrome.tabs.sendMessage(openerTabId, message))
    .catch(r => messageExtensionFrame(message))
    .catch(r => {})
    .then(results => {
      /* If couldn't display the dialog (open anyway) or user clicked OK */
      if (!results || results[0].result) {
        const settingsUrl = "chrome://extensions/?id=" + chrome.runtime.id;
        chrome.tabs.create({ url: settingsUrl, openerTabId });
      } else {
        /* User cancelled; reactivate original tab in case it was switched */
        chrome.tabs.update(openerTabId, { active: true });
      }
    });
}

function messageExtensionFrame(message) {
  let tabId, frameId;
  return chrome.runtime.getContexts({ contextTypes: ["TAB"] })
           .then(tabs => ({tabId, frameId} = tabs[0]))
           .then(() => chrome.tabs.sendMessage(tabId, message, {frameId}));
}

function updateMenu(menuId, params) {
  chrome.contextMenus.update(menuId, params);
}

function resetMenus(permit) {
  if (permit.origins.includes("<all_urls>")) {
    updateMenu("allow-all", { checked: false });
    updateMenu("make-default", { checked: false });
    chrome.scripting.unregisterContentScripts();
  }
}

function checkPermit(permit) {
  if (permit.origins.includes("<all_urls>")) {
    updateMenu("allow-all", { checked: true });
  }
}

/* Open current URL in a viewer frame, if it is a PDF;
 * otherwise open a blank viewer with the splash screen */
async function newViewer(tab) {
  const hasFilesAccess = () => {
    /* Work around Chromium bug: activeTab insufficient for file: URL access */
    chrome.permissions.request({ origins: [url] }).catch(r => {});
    return chrome.extension.isAllowedFileSchemeAccess();
  };
  const url = tab.url;
  let viewerUrl = splashUrl;
  if (new URL(url).protocol === "file:" && !await hasFilesAccess()) {
    viewerUrl = messageUrl;
  } else if (await isPdfTab(tab.id)) {
    loadViewer(getViewerURL(baseUrl, url), tab.id);
    return;
  }
  chrome.tabs.create({ url: viewerUrl, index: tab.index + 1 });
}

/* Load viewer in a full page frame in the given tab */
function loadViewer(viewerUrl, tabId) {
  const injectFrame = src => {
    const frame = document.createElement("iframe");
    frame.src = src;
    frame.name = frame.id = "doqmentViewer";
    frame.setAttribute("allow", "fullscreen");
    document.body.prepend(frame);
  };
  const removeEmbed = () => {
    document.querySelector("embed[type='application/pdf']")?.remove();
  };
  chrome.scripting.executeScript({
    target: {tabId}, func: injectFrame, args: [viewerUrl]
  }).then(() => {
    chrome.scripting.insertCSS({ target: {tabId}, files: [viewerCSS] });
  }).then(() => {
    chrome.scripting.executeScript({ target: {tabId}, func: removeEmbed });
  });
}

/* Check if the document MIME type is PDF in given tab */
async function isPdfTab(tabId) {
  const isPdfContent = () => {
    if (document.contentType?.includes("application/pdf"))
      return document.getElementById("doqmentViewer") == null;
  }
  const check = { target: {tabId}, func: isPdfContent };
  const results = await chrome.scripting.executeScript(check).catch(r => {});
  if (results) {
    const {frameId, result} = results[0];
    return frameId === 0 && result;
  }
  return false;
}
