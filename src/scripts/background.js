/**
 * Intercept loading of PDF files and redirect them to the add-on
 * Adapted from => [pdf.js]/extensions/chromium/pdfHandler.js
 */
const pdfUrl = {
  url: [ {pathSuffix: ".pdf"}, {pathSuffix: ".PDF"} ]
};
browser.webNavigation.onBeforeNavigate.addListener(loadViewer, pdfUrl);
browser.browserAction.onClicked.addListener(newViewer);

/* Event handlers */
const baseUrl = browser.runtime.getURL("pdfjs/web/viewer.html");
const getViewerURL = (url) => `${baseUrl}?file=${encodeURIComponent(url)}`;
const messageUrl = getViewerURL("/pages/Retry.pdf");
const splashUrl = getViewerURL("/pages/Open.pdf");

function loadViewer(details) {
  const {url, tabId, frameId} = details;
  if (!frameId) {
    if (url.startsWith("file://"))
      browser.tabs.update(tabId, { url: messageUrl });
    else
      browser.tabs.update(tabId, { url: getViewerURL(url) });
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
