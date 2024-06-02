/* Get original URL to PDF from query string */
export function getPdfUrl() {
  const query = window.location.search.substring(1);
  return new URLSearchParams(query).get("file");
}

export { getViewerEventBus } from "../doq/addon/lib/utils.js";
