const getUrl = {code: "PDFViewerApplication.baseUrl"};
const urlTag = document.querySelector("p");

browser.tabs.executeScript(getUrl).then(updateBody);
urlTag.onmousedown = copyUrl;

function updateBody(result) {
  urlTag.textContent = result.join("");
}
function copyUrl() {
  navigator.clipboard.writeText(this.textContent).then(() => {
    this.textContent = "Copied to clipboard!";
    this.classList.remove("url");
    this.onmousedown = null;
    window.setTimeout(window.close, 2500);
  });
}
