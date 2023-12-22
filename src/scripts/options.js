const pdfjsSchema = browser.runtime.getURL("pdfjs/preferences_schema.json");
const pdfjsOptions = document.getElementById("pdfjsOptions");
const moreOptions = document.getElementById("moreOptions").content;

pdfjsOptions.addEventListener("change", updatePdfjsPref);
moreOptions.querySelector("legend").addEventListener("change", toggleMore);

fetch(pdfjsSchema).then(resp => resp.json()).then(schema => {
  delete schema.properties["disableTelemetry"];
  render(schema, pdfjsOptions, moreOptions, updatePdfjsOption);
});

async function render(schema, options, moreOptions, updateOption) {
  const {properties} = schema;

  for (let key in properties) {
    const {title, description, default: default_} = properties[key];

    if (description?.startsWith("DEPRECATED")) {
      continue;
    }
    const option = renderOption(key, properties[key]);
    await updateOption(option, key, default_);
    if (title) {
      options.appendChild(option);
    } else {
      moreOptions.firstElementChild.appendChild(option);
    }
  }
  if (moreOptions)
    options.appendChild(moreOptions);
}

function renderOption(key, property) {
  const {title, description} = property;
  const option = document.getElementById("option").content.cloneNode(true);

  option.querySelector("span").textContent = title || key;
  if (description) {
    const caption = description.split("\n", 1)[0];
    option.querySelector(".caption").textContent = caption;
  }
  const control = renderControl(key, property);
  option.querySelector(".header").appendChild(control);
  return option;
}

function renderControl(key, property) {
  const {type, enum: nums} = property;

  if (type === "boolean") {
    return renderToggle(key);
  }
  const control = (nums ? renderSelect : renderInput)(key, property);
  control.id = key;
  control.dataset.type = type;
  return control;
}

function renderToggle(key) {
  const toggle = document.getElementById("toggle").content.cloneNode(true);

  toggle.querySelector("input").id = key;
  toggle.querySelector("label").htmlFor = key;
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

async function updatePdfjsPref(e) {
  const {target} = e;
  if (!target.checkValidity()) {
    return;
  }
  let value = (target.type === "checkbox") ? target.checked : target.value;
  if (target.dataset?.type === "integer") {
    value = Number(value);
  }
  await viewerLoad;
  const app = viewer.contentWindow.PDFViewerApplication;
  app.preferences.set(target.id, value);
}

async function updatePdfjsOption(option, key, defaultValue) {
  await viewerLoad;
  const app = viewer.contentWindow.PDFViewerApplication;
  const value = await app.preferences.get(key);

  const control = option.querySelector("#" + key);
  const attr = (control.type === "checkbox") ? "checked" : "value";
  control[attr] = value ?? defaultValue;
}

function toggleMore(e) {
  const {target} = e;
  target.closest(".more.options").disabled = !target.checked;
  e.stopPropagation();
}
