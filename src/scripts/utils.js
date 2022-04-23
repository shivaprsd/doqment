/* Get original URL to PDF from query string */
function getPdfUrl() {
  const query = window.location.search.substring(1);
  return new URLSearchParams(query).get("file");
}
export {getPdfUrl};
