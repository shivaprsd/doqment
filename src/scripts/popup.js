const getUrl = tabs => browser.tabs.sendMessage(tabs[0].id, {action: "getURL"});
const activeTab = { active: true, currentWindow: true };

browser.tabs.query(activeTab).then(getUrl).then(updateBody);

function updateBody(result) {
  const urlTag = document.querySelector("p");
  urlTag.textContent = result.url;
  urlTag.onmousedown = copyUrl;
}

function copyUrl() {
  navigator.clipboard.writeText(this.textContent).then(() => {
    this.textContent = "Copied to clipboard!";
    this.classList.remove("url");
    this.onmousedown = null;
    window.setTimeout(window.close, 2500);
  });
}
