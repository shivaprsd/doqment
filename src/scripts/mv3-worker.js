/**
 * Add a context menu to open links (to PDF) in the extension
 * We won't check the link and leave error handling to PDF.js
 */
chrome.runtime.onInstalled.addListener(createMenus);
chrome.contextMenus.onClicked.addListener(handleClick);
chrome.action.onClicked.addListener(newViewer);

const baseUrl = chrome.runtime.getURL("pdfjs/web/viewer.html");
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
}

function handleClick(info, tab) {
  switch (info.menuItemId) {
    case "open-link":
      const viewerUrl = getViewerURL(info.linkUrl);
      chrome.tabs.create({ url: viewerUrl });
      break;
    case "copy-url":
      if (tab.url.startsWith(baseUrl)) {
        const message = { action: "copyPdfURL" };
        chrome.tabs.sendMessage(tab.id, message);
      }
  }
}

async function newViewer(tab) {
  const url = tab.url;
  let viewerUrl;
  if (url.startsWith(baseUrl) || url.startsWith("chrome://")) {
    viewerUrl = splashUrl;
  } else if (url.startsWith("file://")) {
    if (await chrome.extension.isAllowedFileSchemeAccess())
      viewerUrl = getViewerURL(url);
    else
      viewerUrl = messageUrl;
  } else {
    viewerUrl = getViewerURL(url);
  }
  chrome.tabs.create({ url: viewerUrl });
}

function getViewerURL(url) {
  const encodeFirst = (c, i) => !i && encodeURIComponent(c) || c;
  url = url.split("#", 2).map(encodeFirst).join("#");
  return `${baseUrl}?file=${url}`;
}
