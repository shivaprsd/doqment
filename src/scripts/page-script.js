/* Rebranding */
document.title = "doqment PDF Reader";
const favIcon = linkIcon("/images/favicon.png");

/* Display host website favicon (if available) */
const pdfUrl = getPdfUrl();
if (self === top && pdfUrl?.startsWith("http")) {
  const origIcon = new URL(pdfUrl).origin + "/favicon.ico";
  fetch(origIcon, {method: "HEAD"}).then(resp => {
    if (resp.ok && resp.headers.get("content-type")?.includes("image/"))
      favIcon.href = origIcon;
  });
  browser.tabs.getCurrent().then(tab => {
    browser.pageAction.show(tab.id);
  });
}

function linkIcon(href) {
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = href;
  return document.head.appendChild(link);
}

/* Get original URL to PDF from query string */
function getPdfUrl() {
  const query = window.location.search.substring(1);
  return new URLSearchParams(query).get("file");
}
