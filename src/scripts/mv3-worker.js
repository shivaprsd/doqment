/**
 * Add a context menu to open links (to PDF) in the extension
 * We won't check the link and leave error handling to viewer
 */
chrome.runtime.onInstalled.addListener(createMenus);
chrome.contextMenus.onClicked.addListener(handleClick);
chrome.permissions.onRemoved.addListener(resetMenus);
chrome.action.onClicked.addListener(newViewer);
chrome.runtime.onMessage.addListener(respond);

const baseUrl = chrome.runtime.getURL("pdfjs/web/viewer.html");
const extProto = new URL(baseUrl).protocol;
const messageUrl = getViewerURL("/pages/Access Denied");
const splashUrl = getViewerURL("/pages/Open File");
const autoOpener = {
  id: "auto-open",
  js: ["scripts/mv3-content.js"],
  runAt: "document_start",
  matches: ["<all_urls>"],
  allFrames: true
};

function getViewerURL(url) {
  const encodeFirst = (c, i) => !i && encodeURIComponent(c) || c;
  url = url.split("#", 2).map(encodeFirst).join("#");
  return `${baseUrl}?file=${url}`;
}

/* Event handlers */
function createMenus() {
  const createMenu = (id, title, contexts, extras) => {
    chrome.contextMenus.create({ id, title, contexts, ...extras });
  };
  createMenu("open-link", "Open in do&qment", ["link"]);
  createMenu("copy-url", "Copy original link to PDF", ["action"], {
    documentUrlPatterns: [baseUrl + "*"]
  });
  createMenu("allow-all", "Always allow access to links", ["action"], {
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
      const url = info.linkUrl;
      if (await chrome.permissions.request({ origins: [url] })) {
        const viewerUrl = getViewerURL(url);
        chrome.tabs.create({ url: viewerUrl });
      }
      break;
    case "allow-all":
      if (info.checked) {
        if (!await chrome.permissions.request({ origins: ["<all_urls>"] }))
          updateMenu(menuId, { checked: false });
        else
          updateMenu("make-default", { enabled: true });
      } else {
        /* Users have to manually revoke site access via settings;
         * otherwise, no prompt is shown for future requests */
        updateMenu(menuId, { checked: true });
      }
      break;
    case "make-default":
      if (info.checked) {
        chrome.scripting.registerContentScripts([autoOpener]);
      } else {
        chrome.scripting.unregisterContentScripts({ ids: ["auto-open"] });
      }
      break;
    case "copy-url":
      if (tab.url.startsWith(baseUrl)) {
        const message = { action: "copyPdfURL" };
        chrome.tabs.sendMessage(tab.id, message);
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

/* Open current URL in a new viewer tab, if it is a PDF;
 * otherwise open a blank viewer with the splash screen */
async function newViewer(tab) {
  const url = tab.url;
  let viewerUrl = splashUrl;
  switch (new URL(url).protocol) {
    case "chrome:":
    case "edge:":
    case "opera:":
    case "brave:":
    case "about:":
    case extProto:
      break;
    case "file:":
      /* Work around Chromium bug: activeTab insufficient for file: URL access */
      chrome.permissions.request({ origins: [url] }).catch(r => {});
      if (!await chrome.extension.isAllowedFileSchemeAccess()) {
        viewerUrl = messageUrl;
        break;
      }
      /* else fall through */
    default:
      if (await isPdfTab(tab))
        viewerUrl = getViewerURL(url);
  }
  chrome.tabs.create({ url: viewerUrl });
}

/* Check if the document MIME type is PDF in given tab */
async function isPdfTab(tab) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.contentType
  });
  if (results) {
    const {frameId, result} = results[0];
    if (frameId === 0 && result?.includes("application/pdf"))
      return true;
  }
  return false;
}

function respond(request, sender, sendResponse) {
  if (request.action === "getViewerURL")
    sendResponse({ url: getViewerURL(request.body) });
}
