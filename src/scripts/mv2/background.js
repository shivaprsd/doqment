/**
 * Intercept loading of PDF files and redirect them to the add-on
 * Adapted from => [pdf.js]/extensions/chromium/pdfHandler.js
 */
const pdfSources = {
  urls: ["<all_urls>"],
  types: ["main_frame", "sub_frame", "object"]
};
const options = ["blocking", "responseHeaders"];
const localPdf = {
  url: [
    {urlPrefix: "file://", pathSuffix: ".pdf"},
    {urlPrefix: "file://", pathSuffix: ".PDF"}
  ]
};
browser.webRequest.onHeadersReceived.addListener(redirect, pdfSources, options);
browser.webNavigation.onBeforeNavigate.addListener(loadViewer, localPdf);
browser.browserAction.onClicked.addListener(newViewer);

/* Event handlers */
const baseUrl = browser.runtime.getURL("pdfjs/web/viewer.html");
const messageUrl = getViewerURL("/pages/Try Again");
const splashUrl = getViewerURL("/pages/Open File");

function redirect(details) {
  if (isPdfResp(details) && !shouldDownload(details))
    return { redirectUrl: getViewerURL(details.url) };
}
function loadViewer(details) {
  if (!details.frameId)
    browser.tabs.update(details.tabId, { url: messageUrl });
}
function newViewer(_, clickData) {
  const btn = clickData?.button;
  const mods = clickData?.modifiers;
  if (mods?.includes("Ctrl") || mods?.includes("Command") || btn === 1)
    browser.windows.create({ type: "popup", url: splashUrl });
  else
    browser.tabs.create({ url: splashUrl });
}
function getViewerURL(url) {
  const encodeFirst = (c, i) => !i && encodeURIComponent(c) || c;
  url = url.split("#", 2).map(encodeFirst).join("#");
  return `${baseUrl}?file=${url}`;
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
