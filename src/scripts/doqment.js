const Doqment = {
  config: {},
  options: { autoToolbar: false },
  scrollDir: -1,
  scrollMark: 0,
  oldScrollTop: 0,
  zoomScale: 0,
  zoomTfm: {},

  getReaderConfig() {
    return {
      docStyle: document.documentElement.style,
      viewer: document.getElementById("viewerContainer"),
      viewerClassList: document.getElementById("outerContainer").classList
    };
  },

  init() {
    let path = (new URL(import.meta.url)).pathname;
    path = path.substring(0, path.lastIndexOf("/") + 1);
    linkCSS(path + "doqment.css");
    this.load();
  },

  load() {
    this.config = this.getReaderConfig();
    document.addEventListener("keydown", this.handleShortcut.bind(this));
    /* Auto-hide toolbar by default on touch devices */
    if (window.matchMedia("only screen and (hover: none)").matches) {
      this.options.autoToolbar = true;
    }
    this.config.viewer.onscroll = this.toggleToolbar.bind(this);
    this.config.viewer.ondblclick = this.toggleSmartZoom.bind(this);
    const app = window.PDFViewerApplication;
    const registerMonitor = () => {
      app.initializedPromise.then(() => {
        /* Set base URL of PDF's links to the original URL */
        app.eventBus.on("documentinit", () => {
          app.pdfLinkService.baseUrl = app.baseUrl;
        });
        app.eventBus.on("resize", this.resetZoomStatus.bind(this));
        app.eventBus.on("scalechanging", this.resetZoomStatus.bind(this));
      });
    };
    if (app.initializedPromise) {
      registerMonitor();
    } else {
      document.addEventListener("webviewerloaded", registerMonitor.bind(this));
    }
    /* FIXME: temporary, experimental */
    const options = window.PDFViewerApplicationOptions;
    options.set("annotationEditorMode", 0);
    options.set("disablePreferences", 1);
  },

  toggleToolbar() {
    if (!this.options.autoToolbar)
      return;
    const hideThresh = 50, showThresh = -20;
    const {viewer} = this.config;
    let delta = viewer.scrollTop - this.oldScrollTop;
    this.oldScrollTop = viewer.scrollTop;
    if (!this.scrollMark && this.scrollDir * delta < 0) {
      this.scrollDir = -this.scrollDir;
      this.scrollMark = viewer.scrollTop;
    }
    if (this.scrollMark) {
      delta = viewer.scrollTop - this.scrollMark;
      if (delta > hideThresh) {
        this.config.viewerClassList.add("toolbarHidden");
        this.scrollMark = 0;
      } else if (delta < showThresh) {
        this.config.viewerClassList.remove("toolbarHidden");
        this.scrollMark = 0;
      }
    }
  },

  handleShortcut(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
      return;
    if (e.code === "F3") {
      this.config.viewerClassList.toggle("toolbarHidden");
      e.preventDefault();
    } else if (e.key === "z" || e.key === "Z") {
      this.toggleSmartZoom(e);
    }
  },

  /* Smart zoom */
  toggleSmartZoom(e) {
    const pdfViewer = window.PDFViewerApplication.pdfViewer;
    if (!pdfViewer.pagesCount || pdfViewer.isInPresentationMode)
      return;
    if (e.detail > 0 && !("ontouchstart" in window))    /* not a double tap */
      return;
    e.preventDefault();
    const viewBox = pdfViewer.container;
    const {target, coord} = this.getZoomTarget(e, viewBox);
    const pageNum = target.closest(".page")?.dataset.pageNumber ||
                    pdfViewer.currentPageNumber;
    const page = pdfViewer.getPageView(pageNum - 1);
    const curZoom = page.div.offsetWidth / viewBox.clientWidth;
    /* Smart zoom only if page is in view range, but zoomed out */
    if (curZoom > 0.8 && curZoom < 2 && !this.zoomScale) {
      this.zoomTfm = this.smartZoom(target, coord, page);
      const scroll = Math.round(-this.zoomTfm.scrollX);
      this.config.docStyle.setProperty("--scroll-snap", scroll + "px");
      this.config.viewerClassList.add("smartZoom")
    } else {
      const zoomInv = 1 / this.zoomTfm.scale || 1;
      pdfViewer.currentScaleValue = "page-width";
      viewBox.scrollBy(0, (zoomInv - 1) * coord);
    }
  },
  getZoomTarget(e, viewBox) {
    let tgt, ypos;
    if (e.detail) {         /* Double click */
      tgt = e.target;
      ypos = e.clientY;
    } else {                /* Keyboard shortcut */
      tgt = [...document.querySelectorAll(".page :hover")].pop() || viewBox;
      const tgtRect = tgt.getBoundingClientRect();
      ypos = (tgtRect.top + tgtRect.bottom) / 2;
    }
    return {target: tgt, coord: ypos - viewBox.offsetTop};
  },

  smartZoom(target, coord, page, nbrLines = 1, zoomPad = 0.015, maxZoom = 5) {
    const pdfViewer = window.PDFViewerApplication.pdfViewer;
    const viewBox = pdfViewer.container;
    const tgtRect = target.getBoundingClientRect();
    const nbrRects = r => {
      const {top, bottom, height} = tgtRect;
      const range = (nbrLines + 0.5) * height;
      return (r.top > top - range) && (r.bottom < bottom + range);
    }
    /* Get non-empty text rects around target in the page */
    const {textDivs, textLayerDiv} = page.textLayer;
    const texts = textDivs.filter(e => e.textContent.trim());
    let textRects = texts.map(e => e.getBoundingClientRect());
    if (texts.includes(target))
      textRects = this.colRects(target, textRects.filter(nbrRects));
    const pageLeft = textLayerDiv.getBoundingClientRect().left;
    /* Find zoom & scroll to fit text span to viewer width */
    const minLeft = Math.min(...textRects.map(r => r.left));
    const maxRight = Math.max(...textRects.map(r => r.right));
    const textSpan = maxRight - minLeft;
    let zoom = 1, offset = viewBox.scrollLeft, scroll = 0;
    if (textSpan > 0) {
      zoom = viewBox.clientWidth / textSpan * (1 - 2 * zoomPad);
      zoom = Math.min(zoom, maxZoom);
      offset = page.div.clientLeft + (minLeft - pageLeft) * zoom;
      offset -= viewBox.clientWidth * zoomPad;
      scroll = (zoom - 1) * coord;
      /* Apply if a valid zoom */
      if (zoom && zoom > 0) {
        this.zoomScale = zoom * page.scale;
        pdfViewer.currentScale = this.zoomScale;
        viewBox.scrollTo(offset, viewBox.scrollTop + scroll);
      }
    }
    return {scale: zoom, scrollX: offset, scrollY: scroll};
  },

  colRects(target, rects, gutterSize = 2.5) {
    const tgtRect = target.getBoundingClientRect();
    const charWidth = tgtRect.width / target.innerText.length;
    const range = gutterSize * charWidth;
    let {left, right} = tgtRect;
    let nbrs = [tgtRect];
    let addRects;
    do {
      addRects = 0;
      rects.forEach(r => {
        if (nbrs.includes(r))
          return;
        if (r.left < left && r.right > left - range) {
          nbrs.push(r);
          left = Math.min(left, r.left);
          ++addRects;
        } else if (r.right > right && r.left < right + range) {
          nbrs.push(r);
          right = Math.max(right, r.right);
          ++addRects;
        }
      });
    } while (addRects);
    return nbrs;
  },

  resetZoomStatus(e) {
    if (e.scale !== this.zoomScale) {
      this.zoomScale = 0;
      this.zoomTfm = {};
      this.config.viewerClassList.remove("smartZoom")
      this.config.docStyle.removeProperty("--scroll-snap");
    }
  }
}

function linkCSS(href) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

/* Initialisation */
if (document.readyState === "interactive" || document.readyState === "complete") {
  Doqment.init();
} else {
  document.addEventListener("DOMContentLoaded", Doqment.init, true);
}
