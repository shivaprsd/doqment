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

/* Make Solarized the pre-selected color scheme */
if (!localStorage.getItem("doqment.init")) {
  const pref = JSON.stringify({ scheme: 3 });
  localStorage.setItem("doq.preferences.light", pref);
  localStorage.setItem("doq.preferences.dark", pref);
  localStorage.setItem("doqment.init", "true");
}
