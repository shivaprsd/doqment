import { execOnEvent } from "./utils.js";

/* Load extension scripts and add-on into the viewer page */
import "./mv2/page-script.js";
import "./doqment.js";
import "../doq/addon/doq.js";

/* TEMP: Enable signature editor and comment annotations by default */
function enableSignAndComment() {
  const app = window.PDFViewerApplication;
  app.preferences.set("enableSignatureEditor", true);
  app.preferences.set("enableComment", true);
  localStorage.removeItem("update-1.0");
}
execOnEvent("update-1.2", [enableSignAndComment])
