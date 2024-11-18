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
