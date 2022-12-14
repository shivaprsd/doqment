/* Copy PDF URL to clipboard */
chrome.runtime.onMessage.addListener(respond);

function respond(request) {
  if (request.action === "copyPdfURL") {
    const pdfUrl = getPdfUrl();
    if (pdfUrl.startsWith("http"))
      navigator.clipboard.writeText(pdfUrl);
  }
}

/* Get original URL to PDF from query string */
function getPdfUrl() {
  const query = window.location.search.substring(1);
  return new URLSearchParams(query).get("file");
}
