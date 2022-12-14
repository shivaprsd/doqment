/* Load extension scripts and add-on into the viewer page */
if (window.location.protocol === "moz-extension:")
  import("./page-script.js");
else
  import("./mv3-script.js");

import "./doqment.js";
import "/doq/addon/doq.js";
