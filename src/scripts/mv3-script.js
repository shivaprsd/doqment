/* Make Solarized the pre-selected color scheme */
if (!localStorage.getItem("doqment.init")) {
  let pref = JSON.stringify({ scheme: 3, tone: "1" });
  localStorage.setItem("doq.preferences.light", pref);
  pref = JSON.stringify({ scheme: 3, tone: "2" });
  localStorage.setItem("doq.preferences.dark", pref);
  localStorage.setItem("doqment.init", "true");
}
