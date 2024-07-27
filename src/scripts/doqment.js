import { addLink, getViewerEventBus, isTouchScreen } from "./utils.js";

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
    addLink("stylesheet", path + "doqment.css");
    this.load();
  },

  load() {
    this.config = this.getReaderConfig();
    /* Auto-hide toolbar by default on touch devices */
    if (isTouchScreen()) {
      this.options.autoToolbar = true;
    }
    const {viewer} = this.config;
    viewer.addEventListener("scroll", this.toggleToolbar.bind(this));
    viewer.addEventListener("dblclick", this.toggleSmartZoom.bind(this));
    document.addEventListener("keydown", this.handleShortcut.bind(this));
    const app = window.PDFViewerApplication;
    getViewerEventBus(app).then(eventBus => {
      /* In Firefox, set base URL of PDF's links to the original URL */
      if (window.location.protocol === "moz-extension:") {
        eventBus.on("documentinit", () => {
          app.pdfLinkService.baseUrl = app.baseUrl;
        });
      }
      eventBus.on("documenterror", this.handleError.bind(this));
      eventBus.on("resize", this.resetZoomStatus.bind(this));
      eventBus.on("scalechanging", this.resetZoomStatus.bind(this));
    });
  },

  toggleToolbar() {
    const smallDevice = window.matchMedia("(max-height: 384px)");
    if (!this.options.autoToolbar || !smallDevice.matches) {
      return;
    }
    const hideThresh = 50, showThresh = -20;
    const {viewer} = this.config;
    let delta = viewer.scrollTop - this.oldScrollTop;
    this.oldScrollTop = viewer.scrollTop;
    if (!this.scrollMark && this.scrollDir * delta < 0) {
      this.scrollDir = -this.scrollDir;
      this.scrollMark = viewer.scrollTop;
    }
    if (this.scrollMark) {
      const { viewerClassList } = this.config;
      delta = viewer.scrollTop - this.scrollMark;
      if (delta > hideThresh) {
        viewerClassList.add("toolbarHidden", "auto");
        this.scrollMark = 0;
      } else if (delta < showThresh) {
        viewerClassList.remove("toolbarHidden", "auto");
        this.scrollMark = 0;
      }
    }
  },

  handleShortcut(e) {
    const tag = e.target.tagName;
    const modifier = e.ctrlKey || e.metaKey || e.altKey;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
        e.target.isContentEditable || modifier)
      return;
    if (e.code === "F3" && !e.shiftKey) {
      const { viewerClassList } = this.config;
      viewerClassList.toggle("toolbarHidden");
      viewerClassList.remove("auto");
      e.preventDefault();
    } else if (e.key === "z" || e.key === "Z") {
      this.toggleSmartZoom(e);
    }
  },

  handleError(details) {
    const app = window.PDFViewerApplication;
    window.alert(details.message);
    app.loadingBar?.hide();
    app.close();
  },

  /* Smart zoom */
  toggleSmartZoom(e) {
    const pdfViewer = window.PDFViewerApplication.pdfViewer;
    if (!pdfViewer.pagesCount || pdfViewer.isInPresentationMode ||
        pdfViewer.annotationEditorMode > 0)
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
    const textLayerDiv = page.textLayer.div;
    const texts = [...textLayerDiv.querySelectorAll("span")];
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

/* Initialisation */
if (document.readyState === "interactive" || document.readyState === "complete") {
  Doqment.init();
} else {
  document.addEventListener("DOMContentLoaded", Doqment.init, true);
}
