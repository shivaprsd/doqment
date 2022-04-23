const getUrl = {code: "PDFViewerApplication.baseUrl"};

browser.tabs.executeScript(getUrl).then(updateBody);

function updateBody(result) {
  document.body.textContent = result.join("");
}
