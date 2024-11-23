/* Detect PDF and send URL to Service Worker to open it in viewer;
 * If the SW returned the viewer URL, load it in the current frame */
if (document.contentType.includes("application/pdf")) {
  const request = {
    action: "loadViewer",
    body: window.location.href
  };
  chrome.runtime.sendMessage(request).then(response => {
    if (response)
      window.location.replace(response.url);
  });
}
