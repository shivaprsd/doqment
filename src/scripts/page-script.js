/* Rebranding */
document.title = "doqment PDF Reader";
linkIcon("/images/favicon.png");

function linkIcon(href) {
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = href;
  document.head.appendChild(link);
}
