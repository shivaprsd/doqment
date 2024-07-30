import { hasCoarsePointer } from "./utils.js";

const DoqPrefs = {
  defaults: {},
  store: {},
  stash: {},
  init(properties) {
    for (let key in properties) {
      this.defaults[key] = properties[key].default;
    }
    Object.freeze(this.defaults);
    this.store = JSON.parse(localStorage.getItem("doq.options")) ?? this.store;
  },
  get(key) {
    return this.store[key] ?? this.defaults[key];
  },
  set(key, value) {
    this.store[key] = value;
    localStorage.setItem("doq.options", JSON.stringify(this.store));
  },
  reset() {
    this.store = (browser === chrome) ? {} : { softwareRender: true };
    localStorage.setItem("doq.options", JSON.stringify(this.store));
  }
}

const PdfjsPrefs = {
  store: {},
  stash: {},
  init() {
    this.viewer = document.querySelector("iframe");
    this.viewerLoad = new Promise(resolve => this.viewer.onload = resolve);
  },
  async getApp() {
    await this.viewerLoad;
    return this.viewer.contentWindow.PDFViewerApplication;
  },
  async get(key) {
    const pdfjs = await this.getApp();
    this.store[key] = await pdfjs.preferences.get(key);
    return this.store[key];
  },
  set(key, value) {
    this.store[key] = value;
    this.getApp().then(pdfjs => pdfjs.preferences.set(key, value));
  },
  async reset() {
    const pdfjs = await this.getApp();
    pdfjs.preferences.reset();
  }
}


/*==== Initialisation and events ===============*/

if (typeof browser === "undefined") {
  window.browser = chrome;
  document.body.classList.add("chrome");
}
browser.runtime.getPlatformInfo().then(info => {
  document.body.classList.add(info.os);
});

const doqOptions = document.getElementById("doqOptions");
const pdfjsOptions = document.getElementById("pdfjsOptions");
const moreOptions = document.getElementById("moreOptions").content;
const resetOptions = document.getElementById("resetOptions");
const undoReset = document.getElementById("undoReset");

doqOptions.addEventListener("change", e => updatePrefs(DoqPrefs, e.target));
pdfjsOptions.addEventListener("change", e => updatePrefs(PdfjsPrefs, e.target));
moreOptions.querySelector("legend").addEventListener("change", toggleMore);
doqOptions.addEventListener("change", toggleUndo);
pdfjsOptions.addEventListener("change", toggleUndo);
resetOptions.onclick = undoReset.onclick = restorePrefs;

const doqSchema = browser.runtime.getURL("doq/addon/options.json");
const pdfjsSchema = browser.runtime.getURL("pdfjs/preferences_schema.json");

fetch(doqSchema).then(resp => resp.json()).then(schema => {
  DoqPrefs.init(schema.properties);
  render(DoqPrefs, schema, doqOptions);
});

fetch(pdfjsSchema).then(resp => resp.json()).then(schema => {
  const themeOption = schema.properties["viewerCssTheme"];
  const captionFix = " for the viewer toolbars and background.";
  themeOption.title = "Viewer theme";
  themeOption.description = themeOption.description.replace(".", captionFix);

  delete schema.properties["disableTelemetry"];
  PdfjsPrefs.init();
  render(PdfjsPrefs, schema, pdfjsOptions, moreOptions);
});


/*==== Rendering ===============================*/

async function render(prefs, schema, options, moreOptions) {
  const {properties} = schema;
  let hasMoreOptions = false;

  for (let key in properties) {
    const {title, description} = properties[key];

    if (description?.startsWith("DEPRECATED")) {
      continue;
    }
    const option = renderOption(key, properties[key]);
    await updateControl(prefs, option.querySelector("#" + key));
    if (title) {
      options.appendChild(option);
    } else {
      moreOptions.firstElementChild.appendChild(option);
      hasMoreOptions = true;
    }
  }
  if (hasMoreOptions)
    options.appendChild(moreOptions);
}

function renderOption(key, property) {
  const {title, description, type} = property;
  const option = document.getElementById("option").content.cloneNode(true);

  option.querySelector("span").textContent = title || key;
  if (description) {
    const caption = description.split("\n", 1)[0];
    option.querySelector(".caption").textContent = caption;
  }
  const control = renderControl(key, property);
  option.querySelector(".header").appendChild(control);

  if (type === "boolean" && (browser === chrome || hasCoarsePointer())) {
    option.querySelector("div").addEventListener("click", toggleOption);
  }
  return option;
}

function renderControl(key, property) {
  const {type, enum: nums, default: default_} = property;

  if (type === "boolean") {
    return renderToggle(key, default_);
  }
  const control = (nums ? renderSelect : renderInput)(property);
  control.id = key;
  control.value = default_;
  control.dataset.type = type;
  control.classList.add("optionField");
  return control;
}

function renderToggle(key, toggled) {
  const toggle = document.getElementById("toggle").content.cloneNode(true);
  const input = toggle.querySelector("input");

  toggle.querySelector("label").htmlFor = input.id = key;
  input.checked = toggled;
  return toggle;
}

function renderInput(property) {
  const input = document.createElement("input");
  const {type, pattern} = property;

  input.type = (type === "integer") ? "number" : "text";
  if (pattern) {
    input.pattern = pattern;
  }
  return input;
}

function renderSelect(property) {
  const select = document.createElement("select");
  const {type, enum: nums, description} = property;

  if (description) {
    let [_, ...values] = description.split("\n");
    const pairUp = opt => opt.split("=", 2).map(e => e.trim());
    values = Object.fromEntries(values.map(pairUp));

    for (let n of nums) {
      const text = values[n].split(/[(.]/, 1)[0];
      select.appendChild(new Option(text, n));
    }
  } else {
    nums.forEach(n => select.appendChild(new Option(n)));
  }
  return select;
}


/*==== Event handling ==========================*/

function updatePrefs(prefs, target) {
  if (!target.checkValidity()) {
    return;
  }
  let value = (target.type === "checkbox") ? target.checked : target.value;
  if (target.dataset?.type === "integer") {
    value = Number(value);
  }
  prefs.set(target.id, value);
}

async function updateControl(prefs, control) {
  const attr = (control.type === "checkbox") ? "checked" : "value";
  control[attr] = await prefs.get(control.id);
}

/* Restore either default or stashed preferences, as per the event target */
async function restorePrefs() {
  const reset = (this === resetOptions);
  const restore = async prefs => {
    if (reset) {
      Object.assign(prefs.stash, prefs.store);
      await prefs.reset();
    }
    for (let key in prefs.stash) {
      if (!reset) {
        await prefs.set(key, prefs.stash[key]);
      }
      updateControl(prefs, document.getElementById(key));
    }
  };
  await restore(DoqPrefs);
  await restore(PdfjsPrefs);
  toggleUndo(reset);
  (reset ? undoReset : resetOptions).focus();
}

function toggleUndo(e) {
  const disable = e.target ? true : !e;
  undoReset.disabled = disable;
  resetOptions.disabled = !disable;
}

function toggleOption(e) {
  const {target} = e;
  const {tagName} = target;

  if (target === this || tagName === "INPUT" || tagName === "LABEL") {
    return;
  }
  const input = this.querySelector("input");
  input.checked = !input.checked;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function toggleMore(e) {
  const {target} = e;
  const moreOptions = target.closest(".more.options");
  moreOptions.disabled = !target.checked;
  e.stopPropagation();
}
