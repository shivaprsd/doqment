/* Detect PDF and send URL to Service Worker to open it in viewer;
 * If the SW returned the viewer URL, load it in the current frame */
if (detectPdfContent()) {
  const request = {
    action: "loadViewer",
    body: window.location.href
  };
  chrome.runtime.sendMessage(request).then(response => {
    if (response)
      window.location.replace(response.url);
  });
}

function detectPdfContent() {
  const url = new URL(window.location.href);
  /* Ignore pages marked by the service worker */
  if (url.searchParams.get("doqment") === "ignore") {
    return false;
  }
  if (document.contentType?.includes("application/pdf"))
    return document.getElementById("doqmentViewer") == null;
}
