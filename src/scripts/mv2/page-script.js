import { getPdfUrl, addLink, execOnEvent, isTouchScreen } from "../utils.js";

/* Rebranding */
document.title = "doqment PDF Reader";
const favIcon = addLink("icon", "/images/icon32.png");

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

/* Make Firefox the pre-selected color scheme */
function selectFirefox() {
  /* scheme = 0 because of the migration code in doq */
  const pref = JSON.stringify({ scheme: 0 });
  localStorage.setItem("doq.preferences.light", pref);
  localStorage.setItem("doq.preferences.dark", pref);
}

/* Disable the annotation editors by default on mobile */
async function disableAnnotEditors() {
  const platform = await browser.runtime.getPlatformInfo();
  if (platform.os === "android" && isTouchScreen()) {
    const app = window.PDFViewerApplication;
    app.preferences.set("annotationEditorMode", -1);
  }
}

/* Disable hardware accelerated rendering of canvas */
function forceSoftwareRender() {
  const doqOptions = { softwareRender: true };
  localStorage.setItem("doq.options", JSON.stringify(doqOptions));
}

execOnEvent("init", [selectFirefox, disableAnnotEditors])
execOnEvent("update-0.9", [forceSoftwareRender])
