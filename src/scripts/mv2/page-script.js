import { getPdfUrl } from "../utils.js";

/* Rebranding */
document.title = "doqment PDF Reader";
const favIcon = linkIcon("/images/icon32.png");

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
