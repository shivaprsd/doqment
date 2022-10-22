import { addLink, execOnEvent } from "../utils.js";

/* Rebranding */
document.title = "doqment PDF Reader";
const favIcon = addLink("icon", "../../images/icon32.png");

/* Make Solarized the pre-selected color scheme */
function selectSolarized() {
  /* scheme = 3 because of the migration code in doq */
  let pref = JSON.stringify({ scheme: 3, tone: "1" });
  localStorage.setItem("doq.preferences.light", pref);
  pref = JSON.stringify({ scheme: 3, tone: "2" });
  localStorage.setItem("doq.preferences.dark", pref);
}

/* Disable hardware accelerated rendering of canvas */
function forceSoftwareRender() {
  const doqOptions = { softwareRender: true };
  localStorage.setItem("doq.options", JSON.stringify(doqOptions));
}

execOnEvent("init", [selectSolarized, forceSoftwareRender])
