if (document.contentType.includes("application/pdf")) {
  const request = {
    action: "getViewerURL",
    body: window.location.href
  };
  chrome.runtime.sendMessage(request).then(response => {
    window.location.replace(response.url)
  });
}
