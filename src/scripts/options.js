if (typeof browser === "undefined") {
  var browser = chrome;
  document.body.classList.add("chrome");
}
browser.runtime.getPlatformInfo().then(info => {
  document.body.classList.add(info.os);
});
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

const pdfjsSchema = browser.runtime.getURL("pdfjs/preferences_schema.json");
const pdfjsOptions = document.getElementById("pdfjsOptions");
const moreOptions = document.getElementById("moreOptions").content;
const resetOptions = document.getElementById("resetOptions");
const undoReset = document.getElementById("undoReset");

pdfjsOptions.addEventListener("change", () => {
  resetOptions.disabled = false;
  undoReset.disabled = true;
});
pdfjsOptions.addEventListener("change", updatePdfjsPref);
moreOptions.querySelector("legend").addEventListener("change", toggleMore);
resetOptions.onclick = undoReset.onclick = restorePdfjsPrefs;

fetch(pdfjsSchema).then(resp => resp.json()).then(schema => {
  const themeOption = schema.properties["viewerCssTheme"];
  const captionFix = " for the viewer toolbars and background.";
  themeOption.title = "Viewer theme";
  themeOption.description = themeOption.description.replace(".", captionFix);

  delete schema.properties["disableTelemetry"];
  render(schema, pdfjsOptions, moreOptions, updatePdfjsControl);
});

async function render(schema, options, moreOptions, updateControl) {
  const {properties} = schema;
  let hasMoreOptions = false;

  for (let key in properties) {
    const {title, description} = properties[key];

    if (description?.startsWith("DEPRECATED")) {
      continue;
    }
    const option = renderOption(key, properties[key]);
    await updateControl(option.querySelector("#" + key));
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

  if (type === "boolean" && (browser === chrome || coarsePointer)) {
    option.querySelector("div").addEventListener("click", toggleOption);
  }
  return option;
}

function renderControl(key, property) {
  const {type, enum: nums, default: default_} = property;

  if (type === "boolean") {
    return renderToggle(key, default_);
  }
  const control = (nums ? renderSelect : renderInput)(key, property);
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

function renderInput(key, property) {
  const input = document.createElement("input");
  const {type, pattern} = property;

  input.type = (type === "integer") ? "number" : "text";
  if (pattern) {
    input.pattern = pattern;
  }
  return input;
}

function renderSelect(key, property) {
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

const viewer = document.querySelector("iframe");
const viewerLoad = new Promise(resolve => viewer.onload = resolve);
let savedPrefs = {}

async function getPdfjsApp() {
  await viewerLoad;
  return viewer.contentWindow.PDFViewerApplication;
}

function updatePdfjsPref(e) {
  const {target} = e;
  const key = target.id;

  if (!target.checkValidity()) {
    return;
  }
  let value = (target.type === "checkbox") ? target.checked : target.value;
  if (target.dataset?.type === "integer") {
    value = Number(value);
  }
  getPdfjsApp().then(pdfjs => pdfjs.preferences.set(key, value));
  savedPrefs[key] = value;
}

async function updatePdfjsControl(control) {
  const key = control.id;
  const pdfjs = await getPdfjsApp();
  const value = await pdfjs.preferences.get(key);

  const attr = (control.type === "checkbox") ? "checked" : "value";
  savedPrefs[key] = control[attr] = value;
}

let stashedPrefs = {};

/* Restore either default or stashed preferences, as per the event target */
async function restorePdfjsPrefs() {
  const reset = this.id === "resetOptions";
  const pdfjs = await getPdfjsApp();

  if (reset) {
    Object.assign(stashedPrefs, savedPrefs);
    await pdfjs.preferences.reset();
  }
  for (let key in savedPrefs) {
    if (!reset) {
      await pdfjs.preferences.set(key, stashedPrefs[key]);
    }
    updatePdfjsControl(document.getElementById(key));
  }
  const other = reset ? undoReset : resetOptions;
  this.disabled = true;
  other.disabled = false;
  other.focus();
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
