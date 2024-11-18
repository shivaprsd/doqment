/**
 * Add a context menu to open links (to PDF) in the extension
 * We won't check the link and leave error handling to viewer
 */
import { getViewerURL } from "../utils.js";

chrome.runtime.onInstalled.addListener(createMenus);
chrome.contextMenus.onClicked.addListener(handleClick);
chrome.permissions.onRemoved.addListener(resetMenus);
chrome.action.onClicked.addListener(newViewer);
chrome.runtime.onMessage.addListener(respond);

const baseUrl = chrome.runtime.getURL("pdfjs/web/viewer.html");
const messageUrl = getViewerURL(baseUrl, "/pages/Access Denied");
const splashUrl = getViewerURL(baseUrl, "/pages/Open File");
const autoOpener = "scripts/mv3/content-script.js";
const viewerCSS = "scripts/mv3/viewer.css";

/* Event handlers */
function createMenus() {
  const createMenu = (id, title, contexts, extras) => {
    chrome.contextMenus.create({ id, title, contexts, ...extras });
  };
  createMenu("open-link", "Open in do&qment", ["link", "frame"]);
  createMenu("allow-all", "Always allow access to sites", ["action"], {
    type: "checkbox"
  });
  createMenu("make-default", "Make doqment the default viewer", ["action"], {
    type: "checkbox",
    enabled: false
  });
}

async function handleClick(info, tab) {
  const menuId = info.menuItemId;
  switch (menuId) {
    case "open-link":
      const url = info.linkUrl || info.frameUrl;
      const tabId = (tab.id < 0) ? null : tab.id;
      await openLink(url, tabId);
      break;
    case "allow-all":
      await requestAccess(menuId, info.checked);
      break;
    case "make-default":
      toggleAutoOpen(info.checked);
      break;
  }
}

async function openLink(url, tabId) {
  let viewerUrl;
  if (url.startsWith(baseUrl)) {
    viewerUrl = url;
  } else {
    const permit = { origins: [url] };
    if (!await chrome.permissions.request(permit)) {
      return;
    }
    viewerUrl = getViewerURL(baseUrl, url);
  }
  const newTab = await chrome.tabs.create({ url, openerTabId: tabId });
  loadViewer(viewerUrl, newTab.id);
}

async function requestAccess(menuId, allow) {
  if (allow) {
    const permit = { origins: ["<all_urls>"] };
    if (!await chrome.permissions.request(permit)) {
      updateMenu(menuId, { checked: false });
    } else {
      updateMenu("make-default", { enabled: true });
    }
  } else {
    /* Users have to manually revoke site access via settings;
     * otherwise, no prompt is shown for future requests */
    updateMenu(menuId, { checked: true });
  }
}

/* Set content script to detect PDFs and send back the URL;
 * respond by loading the viewer frame in the sender tab */
function toggleAutoOpen(enable) {
  if (enable) {
    chrome.scripting.registerContentScripts([{
      id: "auto-open",
      js: [autoOpener],
      runAt: "document_start",
      matches: ["<all_urls>"],
      allFrames: true
    }]);
  } else {
    chrome.scripting.unregisterContentScripts({ ids: ["auto-open"] });
  }
}

function respond(request, sender, sendResponse) {
  if (request.action === "loadViewer") {
    const viewerUrl = getViewerURL(baseUrl, request.body);
    if (sender.frameId === 0) {
      loadViewer(viewerUrl, sender.tab.id);
    } else {
      sendResponse({ url: viewerUrl });
    }
  }
}

function updateMenu(menuId, params) {
  chrome.contextMenus.update(menuId, params);
}

function resetMenus(permit) {
  if (permit.origins.includes("<all_urls>")) {
    updateMenu("allow-all", { checked: false });
    updateMenu("make-default", { checked: false, enabled: false });
    chrome.scripting.unregisterContentScripts();
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
  let viewerUrl;
  if (new URL(url).protocol === "file:" && !await hasFilesAccess()) {
    viewerUrl = messageUrl;
  } else if (await isPdfTab(tab.id)) {
    viewerUrl = getViewerURL(baseUrl, url);
  }

  if (viewerUrl) {
    loadViewer(viewerUrl, tab.id);
  } else {
    chrome.tabs.create({ url: splashUrl, index: tab.index + 1 });
  }
}

/* Load viewer in a full page frame in the given tab */
function loadViewer(viewerUrl, tabId) {
  const injectFrame = src => {
    const frame = document.createElement("iframe");
    frame.src = src;
    frame.id = "doqmentViewer";
    document.body.prepend(frame);
  };
  chrome.scripting.executeScript({
    target: {tabId}, func: injectFrame, args: [viewerUrl]
  }).then(() => {
    chrome.scripting.insertCSS({ target: {tabId}, files: [viewerCSS] });
  });
}

/* Check if the document MIME type is PDF in given tab */
async function isPdfTab(tabId) {
  const isPdfContent = () => {
    if (document.contentType?.includes("application/pdf"))
      return document.getElementById("doqmentViewer") == null;
  }
  const details = { target: {tabId}, func: isPdfContent };
  const results = await chrome.scripting.executeScript(details).catch(r => {});
  if (results) {
    const {frameId, result} = results[0];
    return frameId === 0 && result;
  }
  return false;
}
