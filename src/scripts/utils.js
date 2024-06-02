/* Get original URL to PDF from query string */
export function getPdfUrl() {
  const query = window.location.search.substring(1);
  return new URLSearchParams(query).get("file");
}

/* Execute passed function on the first run */
export function execOnInit(initFunc) {
  if (!localStorage.getItem("doqment.init")) {
    initFunc();
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
