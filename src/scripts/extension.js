import { chooseViewerPath } from "./utils.js";

/* Redirect to the latest PDF.js viewer if required */
const defaultPath = "/pdfjs/";
const viewerPath = await chooseViewerPath(defaultPath, "/pdfjs-latest/");

if (!location.pathname.startsWith(viewerPath)) {
  location.replace(location.href.replace(defaultPath, viewerPath));
}

/* Load extension scripts and add-on into the viewer page */
if (location.protocol === "moz-extension:") {
  import("./mv2/page-script.js");
} else {
  import("./mv3/page-script.js");
}
import "./doqment.js";
import "/doq/addon/doq.js";
