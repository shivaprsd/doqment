/* Choose PDF.js viewer based on user preference */
export async function chooseViewerPath(defaultPath, latestPath) {
  const options = JSON.parse(localStorage.getItem("doqment.options"));
  if (options?.useLatestPdfjs) {
    const versionPath = `${latestPath}VERSION`;
    if (await fetch(versionPath).then(resp => resp.ok).catch(err => false))
      return latestPath;
  }
  return defaultPath;
}

/* Get original URL to PDF from query string */
export function getPdfUrl() {
  const query = window.location.search.substring(1);
  return new URLSearchParams(query).get("file");
}

/* Set URL hash param, just like URLSearchParams.set() */
export function setHashParam(url, param, value) {
  const options = new URLSearchParams(url.hash.slice(1));
  options.set(param, value);
  url.hash = options.toString();
}

/* Get URL to the viewer with encoded PDF URL */
export function getViewerURL(viewerUrl, pdfUrl) {
  const encodeFirst = (elem, index) => {
    return !index ? encodeURIComponent(elem) : elem;
  };
  pdfUrl = pdfUrl.split("#", 2).map(encodeFirst).join("#");
  return `${viewerUrl}?file=${pdfUrl}`;
}

export function addLink(rel, href) {
  const link = document.createElement("link");
  Object.assign(link, {rel, href})
  return document.head.appendChild(link);
}

/* Execute passed callbacks on the event marked by {flag} */
export function execOnEvent(flag, callbacks) {
  const event = `doqment.${flag}`
  if (!localStorage.getItem(event)) {
    callbacks.forEach(func => func());
    localStorage.setItem(event, "true");
  }
}

export function hasCoarsePointer() {
  return window.matchMedia("(pointer: coarse)").matches;
}

export function isTouchScreen() {
  const nonHoverable = window.matchMedia("only screen and (hover: none)");
  return nonHoverable.matches && hasCoarsePointer();
}

export { getViewerEventBus } from "../doq/addon/app/utils.js";
