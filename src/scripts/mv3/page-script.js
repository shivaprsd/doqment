import { getPdfUrl } from "../utils.js";

/* Copy PDF URL to clipboard */
chrome.runtime.onMessage.addListener(respond);

function respond(request) {
  if (request.action === "copyPdfURL") {
    const pdfUrl = getPdfUrl();
    if (pdfUrl.startsWith("http"))
      navigator.clipboard.writeText(pdfUrl);
  }
}
