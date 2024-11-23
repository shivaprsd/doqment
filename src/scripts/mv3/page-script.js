/* Respond to prompt messages from the Service Worker */
chrome.runtime.onMessage.addListener(respond);

function respond(message, sender, reply) {
  if (typeof message !== "string") {
    return false;
  }
  activateAndPrompt(message, reply);
  return true;
}

/* If in a focussed browser window, activate the tab and show
 * the message to the user; then reply back with the response */
async function activateAndPrompt(message, reply) {
  const browserWindow = await chrome.windows.getCurrent();
  if (!browserWindow.focused) {
    reply(undefined);
  }
  const tab = await chrome.tabs.getCurrent();
  await chrome.tabs.update(tab.id, { active: true });
  reply([{ result: window.confirm(message) }]);
}
