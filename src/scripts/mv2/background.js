/**
 * Intercept loading of PDF files and redirect them to the add-on
 * Adapted from => [pdf.js]/extensions/chromium/pdfHandler.js
 */
import { getViewerURL, execOnEvent } from "../utils.js";

const pdfSources = {
  urls: ["<all_urls>"],
  types: ["main_frame", "sub_frame", "object"]
};
const options = ["blocking", "responseHeaders"];
const localPdf = {
  url: [
    { urlPrefix: "file://", pathSuffix: ".pdf" },
    { urlPrefix: "file://", pathSuffix: ".PDF" }
  ]
};
browser.webRequest.onHeadersReceived.addListener(redirect, pdfSources, options);
browser.browserAction.onClicked.addListener(newViewer);
browser.webNavigation.onBeforeNavigate.addListener(showMessage, localPdf);

/* Event handlers */
const baseUrl = browser.runtime.getURL("pdfjs/web/viewer.html");
const messageUrl = getViewerURL(baseUrl, "/pages/Try Again");
const splashUrl = getViewerURL(baseUrl, "/pages/Open File");

function redirect(details) {
  if (isPdfResp(details) && !shouldDownload(details))
    return { redirectUrl: getViewerURL(baseUrl, details.url) };
}
function showMessage(details) {
  if (!details.frameId) {
    const messageTab = { openerTabId: details.tabId, url: messageUrl };
    execOnEvent("open-local-pdf", [() => browser.tabs.create(messageTab)]);
    browser.webNavigation.onBeforeNavigate.removeListener(showMessage);
  }
}
function newViewer(_, clickData) {
  const btn = clickData?.button;
  const mods = clickData?.modifiers;
  if (mods?.includes("Ctrl") || mods?.includes("Command") || btn === 1)
    browser.windows.create({ type: "popup", url: splashUrl });
  else
    browser.tabs.create({ url: splashUrl });
}

/* Determine if response is a PDF by inspecting its MIME type, file extension
 * or Content-Disposition header */
function isPdfResp(details) {
  const mimeType = getHeader(details.responseHeaders, "content-type");
  if (mimeType) {
    switch (mimeType.split(";", 1)[0].trim()) {
      case "application/pdf":
        return true;
      case "application/octet-stream":
        if (details.url.toLowerCase().indexOf(".pdf") > 0)
          return true;
        const cd = getHeader(details.responseHeaders, "content-disposition");
        return /\.pdf(['"]|$)/i.test(cd);
    }
  }
  return false;
}
/* Check if the PDF should actually be downloaded; sites like Google Docs use
 * a hidden <iframe> to download docs as PDF */
function shouldDownload(details) {
  if (details.url.includes("pdfjs.action=download"))
    return true;
  if (details.type !== "main_frame") {
    const cd = getHeader(details.responseHeaders, "content-disposition");
    return /^attachment/i.test(cd);
  }
  return false;
}
function getHeader(respHeaders, header) {
  const match = respHeaders.find(h => h.name.toLowerCase() === header);
  return match && match.value.toLowerCase();
}
