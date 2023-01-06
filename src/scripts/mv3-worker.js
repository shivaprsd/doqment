/**
 * Add a context menu to open links (to PDF) in the extension
 * We won't check the link and leave error handling to PDF.js
 */
chrome.runtime.onInstalled.addListener(createMenus);
chrome.contextMenus.onClicked.addListener(handleClick);
chrome.permissions.onRemoved.addListener(uncheckMenu);
chrome.action.onClicked.addListener(newViewer);

const baseUrl = chrome.runtime.getURL("pdfjs/web/viewer.html");
const extProto = new URL(baseUrl).protocol;
const messageUrl = getViewerURL("/pages/Access Denied");
const splashUrl = getViewerURL("/pages/Open File");

/* Event handlers */
function createMenus() {
  chrome.contextMenus.create({
    id: "open-link",
    title: "Open in do&qment",
    contexts: ["link"]
  });
  chrome.contextMenus.create({
    id: "copy-url",
    title: "Copy original link to PDF",
    contexts: ["action"],
    documentUrlPatterns: [baseUrl + "*"]
  });
  chrome.contextMenus.create({
    id: "allow-all",
    type: "checkbox",
    title: "Always allow access to links",
    contexts: ["action"],
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
      const permit = { origins: ["<all_urls>"] };
      if (info.checked) {
        if (!await chrome.permissions.request(permit))
          uncheckMenu(permit);
      } else {
        chrome.permissions.remove(permit);
      }
      break;
    case "copy-url":
      if (tab.url.startsWith(baseUrl)) {
        const message = { action: "copyPdfURL" };
        chrome.tabs.sendMessage(tab.id, message);
      }
  }
}

function uncheckMenu(permit) {
  if (permit.origins.includes("<all_urls>")) {
    chrome.contextMenus.update("allow-all", { checked: false });
  }
}

async function newViewer(tab) {
  const url = tab.url;
  let viewerUrl;
  switch (new URL(url).protocol) {
    case "chrome:":
    case "edge:":
    case "opera:":
    case "brave:":
    case "about:":
    case extProto:
      viewerUrl = splashUrl;
      break;
    case "file:":
      // Work around Chromium bug: activeTab insufficient for file: URL access
      chrome.permissions.request({ origins: [url] }).catch(r => {});
      if (await chrome.extension.isAllowedFileSchemeAccess())
        viewerUrl = getViewerURL(url);
      else
        viewerUrl = messageUrl;
      break;
    default:
      viewerUrl = getViewerURL(url);
  }
  chrome.tabs.create({ url: viewerUrl });
}

function getViewerURL(url) {
  const encodeFirst = (c, i) => !i && encodeURIComponent(c) || c;
  url = url.split("#", 2).map(encodeFirst).join("#");
  return `${baseUrl}?file=${url}`;
}
