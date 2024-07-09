/* Get original URL to PDF from query string */
export function getPdfUrl() {
  const query = window.location.search.substring(1);
  return new URLSearchParams(query).get("file");
}

export function addLink(rel, href) {
  const link = document.createElement("link");
  Object.assign(link, {rel, href})
  return document.head.appendChild(link);
}

/* Execute passed functions on the first run */
export function execOnInit(initFuncs) {
  if (!localStorage.getItem("doqment.init")) {
    initFuncs.forEach(func => func());
    localStorage.setItem("doqment.init", "true");
  }
}

export function hasCoarsePointer() {
  return window.matchMedia("(pointer: coarse)").matches;
}

export function isTouchScreen() {
  const nonHoverable = window.matchMedia("only screen and (hover: none)");
  return nonHoverable.matches && hasCoarsePointer();
}

export { getViewerEventBus } from "../doq/addon/lib/utils.js";
