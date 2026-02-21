const KEY = "neonSiteState.v1";
const PRESET_VERSION = 7;
const BUILD_UPDATED_AT = "2026-02-21 11:10";

const defaults = {
  presetVersion: PRESET_VERSION,
  helloVisible: true,
  helloText: "Hello World",
  fontSize: 84,
  fontFamily: "system",
  panelCollapsed: false,
  preset: "neonFlow",
  warm: [1.62, 0.06, 0.01],
  cool: [0.02, 0.1, 1.58],
  spark: [1.36, 0.62, 0.04],
  brightness: 1.14,
  saturation: 1.68,
  sparkPower: 0.88
};

const presets = {
  neonFlow: {
    warm: [1.62, 0.06, 0.01],
    cool: [0.02, 0.1, 1.58],
    spark: [1.36, 0.62, 0.04],
    brightness: 1.14,
    saturation: 1.68,
    sparkPower: 0.88
  },
  electricIce: {
    warm: [0.18, 0.38, 0.46],
    cool: [0.01, 1.1, 1.66],
    spark: [0.54, 1.42, 1.04],
    brightness: 1.12,
    saturation: 1.52,
    sparkPower: 0.92
  },
  hyperPop: {
    warm: [1.32, 0.08, 0.58],
    cool: [0.26, 0.04, 1.62],
    spark: [1.76, 0.66, 0.96],
    brightness: 1.08,
    saturation: 1.72,
    sparkPower: 0.98
  },
  pinkHaze: {
    warm: [1.82, 0.3, 0.02],
    cool: [1.1, 0.1, 0.01],
    spark: [1.92, 0.92, 0.06],
    brightness: 1.08,
    saturation: 1.78,
    sparkPower: 0.94
  },
  arcticVolt: {
    warm: [0.05, 0.62, 0.68],
    cool: [0.02, 0.26, 1.72],
    spark: [0.48, 1.56, 1.36],
    brightness: 1.1,
    saturation: 1.58,
    sparkPower: 0.9
  },
  toxicWave: {
    warm: [0.46, 1.62, 0.05],
    cool: [0.02, 0.58, 0.14],
    spark: [1.22, 1.82, 0.12],
    brightness: 1.08,
    saturation: 1.66,
    sparkPower: 0.84
  }
};

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const parsed = JSON.parse(raw);
    if (parsed.preset === "neonSunset") {
      parsed.preset = "neonFlow";
    }
    const merged = {
      ...structuredClone(defaults),
      ...parsed,
      warm: Array.isArray(parsed.warm) ? parsed.warm : defaults.warm,
      cool: Array.isArray(parsed.cool) ? parsed.cool : defaults.cool,
      spark: Array.isArray(parsed.spark) ? parsed.spark : defaults.spark
    };

    if (merged.preset !== "custom" && !presets[merged.preset]) {
      merged.preset = defaults.preset;
    }

    if ((parsed.presetVersion ?? 0) < PRESET_VERSION && merged.preset !== "custom" && presets[merged.preset]) {
      const preset = presets[merged.preset];
      merged.warm = [...preset.warm];
      merged.cool = [...preset.cool];
      merged.spark = [...preset.spark];
      merged.brightness = preset.brightness;
      merged.saturation = preset.saturation;
      merged.sparkPower = preset.sparkPower;
    }

    merged.presetVersion = PRESET_VERSION;
    return merged;
  } catch {
    return structuredClone(defaults);
  }
}

function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function fmt(n) {
  return (+n).toFixed(2);
}

const canvas = document.getElementById("bg");
const renderer = globalThis.NeonFlow.createRenderer(canvas);

if (!renderer.supported) {
  document.body.style.background = "linear-gradient(120deg, #ff00d4, #ff2b2b, #1e6bff, #ffd200)";
  throw new Error("WebGL not supported");
}

let state = loadState();
let uiHidden = false;

const helloWrap = document.getElementById("helloWrap");
const helloTitle = document.querySelector("#helloWrap .title");

const uiPanel = document.getElementById("uiPanel");
const panelBtn = document.getElementById("panelBtn");
const resetBtn = document.getElementById("resetBtn");
const helloTextInput = document.getElementById("helloText");
const fontSizeSlider = document.getElementById("fontSize");
const fontFamilySel = document.getElementById("fontFamily");
const presetSel = document.getElementById("preset");

const sliders = {
  warmR: document.getElementById("warmR"),
  warmG: document.getElementById("warmG"),
  warmB: document.getElementById("warmB"),
  coolR: document.getElementById("coolR"),
  coolG: document.getElementById("coolG"),
  coolB: document.getElementById("coolB"),
  sparkR: document.getElementById("sparkR"),
  sparkG: document.getElementById("sparkG"),
  sparkB: document.getElementById("sparkB"),
  brightness: document.getElementById("brightness"),
  saturation: document.getElementById("saturation"),
  sparkPower: document.getElementById("sparkPower")
};

const vals = {
  fontSizeVal: document.getElementById("fontSizeVal"),
  warmRVal: document.getElementById("warmRVal"),
  warmGVal: document.getElementById("warmGVal"),
  warmBVal: document.getElementById("warmBVal"),
  coolRVal: document.getElementById("coolRVal"),
  coolGVal: document.getElementById("coolGVal"),
  coolBVal: document.getElementById("coolBVal"),
  sparkRVal: document.getElementById("sparkRVal"),
  sparkGVal: document.getElementById("sparkGVal"),
  sparkBVal: document.getElementById("sparkBVal"),
  brightnessVal: document.getElementById("brightnessVal"),
  saturationVal: document.getElementById("saturationVal"),
  sparkPowerVal: document.getElementById("sparkPowerVal")
};

const fontFamilies = {
  system: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  display: "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif"
};

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function applyTitleSettings() {
  const familyKey = fontFamilies[state.fontFamily] ? state.fontFamily : defaults.fontFamily;
  const size = clamp(Number(state.fontSize) || defaults.fontSize, 32, 160);
  const text = typeof state.helloText === "string" ? state.helloText : defaults.helloText;

  state.fontFamily = familyKey;
  state.fontSize = size;
  state.helloText = text;

  helloTitle.textContent = text;
  helloTitle.style.fontSize = `${size}px`;
  helloTitle.style.fontFamily = fontFamilies[familyKey];
}

function setHelloVisible(visible) {
  state.helloVisible = visible;
  if (visible) {
    helloWrap.style.display = "grid";
    requestAnimationFrame(() => helloWrap.classList.remove("is-hidden"));
  } else {
    helloWrap.classList.add("is-hidden");
    globalThis.setTimeout(() => {
      if (!state.helloVisible) helloWrap.style.display = "none";
    }, 280);
  }
  saveState(state);
}

function setPanelCollapsed(collapsed) {
  state.panelCollapsed = collapsed;
  uiPanel.classList.toggle("collapsed", collapsed);
  panelBtn.textContent = collapsed ? "Expand" : "Collapse";
  saveState(state);
}

function syncValueReadoutsOnly() {
  vals.fontSizeVal.textContent = `${Math.round(state.fontSize)}px`;
  vals.warmRVal.textContent = fmt(state.warm[0]);
  vals.warmGVal.textContent = fmt(state.warm[1]);
  vals.warmBVal.textContent = fmt(state.warm[2]);
  vals.coolRVal.textContent = fmt(state.cool[0]);
  vals.coolGVal.textContent = fmt(state.cool[1]);
  vals.coolBVal.textContent = fmt(state.cool[2]);
  vals.sparkRVal.textContent = fmt(state.spark[0]);
  vals.sparkGVal.textContent = fmt(state.spark[1]);
  vals.sparkBVal.textContent = fmt(state.spark[2]);
  vals.brightnessVal.textContent = fmt(state.brightness);
  vals.saturationVal.textContent = fmt(state.saturation);
  vals.sparkPowerVal.textContent = fmt(state.sparkPower);
}

function syncUIFromState() {
  helloTextInput.value = state.helloText;
  fontSizeSlider.value = state.fontSize;
  fontFamilySel.value = state.fontFamily;

  presetSel.value = state.preset;

  sliders.warmR.value = state.warm[0];
  sliders.warmG.value = state.warm[1];
  sliders.warmB.value = state.warm[2];

  sliders.coolR.value = state.cool[0];
  sliders.coolG.value = state.cool[1];
  sliders.coolB.value = state.cool[2];

  sliders.sparkR.value = state.spark[0];
  sliders.sparkG.value = state.spark[1];
  sliders.sparkB.value = state.spark[2];

  sliders.brightness.value = state.brightness;
  sliders.saturation.value = state.saturation;
  sliders.sparkPower.value = state.sparkPower;

  syncValueReadoutsOnly();
  setPanelCollapsed(state.panelCollapsed);

  if (state.helloVisible) {
    helloWrap.style.display = "grid";
    helloWrap.classList.remove("is-hidden");
  } else {
    helloWrap.style.display = "none";
    helloWrap.classList.add("is-hidden");
  }

  applyTitleSettings();
  renderer.applyUniforms(state);
}

function applyPreset(name) {
  if (!presets[name]) return;
  const preset = presets[name];
  state.presetVersion = PRESET_VERSION;
  state.preset = name;
  state.warm = [...preset.warm];
  state.cool = [...preset.cool];
  state.spark = [...preset.spark];
  state.brightness = preset.brightness;
  state.saturation = preset.saturation;
  state.sparkPower = preset.sparkPower;
  saveState(state);
  syncUIFromState();
}

function markCustom() {
  if (state.preset !== "custom") {
    state.preset = "custom";
    presetSel.value = "custom";
  }
}

function bindSlider(slider, onChange) {
  const handler = () => {
    onChange(Number.parseFloat(slider.value));
    markCustom();
    saveState(state);
    renderer.applyUniforms(state);
    syncValueReadoutsOnly();
  };

  slider.addEventListener("input", handler);
  slider.addEventListener("change", handler);
}

function setUiHidden(hidden) {
  uiHidden = hidden;
  document.body.classList.toggle("ui-hidden", hidden);
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
    return;
  }
  await document.exitFullscreen();
}

panelBtn.addEventListener("click", () => setPanelCollapsed(!state.panelCollapsed));

resetBtn.addEventListener("click", () => {
  state = structuredClone(defaults);
  saveState(state);
  syncUIFromState();
});

helloTextInput.addEventListener("input", () => {
  state.helloText = helloTextInput.value;
  saveState(state);
  applyTitleSettings();
});

fontSizeSlider.addEventListener("input", () => {
  state.fontSize = Number.parseFloat(fontSizeSlider.value);
  saveState(state);
  applyTitleSettings();
  vals.fontSizeVal.textContent = `${Math.round(state.fontSize)}px`;
});

fontFamilySel.addEventListener("change", () => {
  state.fontFamily = fontFamilySel.value;
  saveState(state);
  applyTitleSettings();
});

presetSel.addEventListener("change", (event) => {
  const value = event.target.value;
  if (value === "custom") {
    state.preset = "custom";
    saveState(state);
    return;
  }
  applyPreset(value);
});

bindSlider(sliders.warmR, (v) => (state.warm[0] = v));
bindSlider(sliders.warmG, (v) => (state.warm[1] = v));
bindSlider(sliders.warmB, (v) => (state.warm[2] = v));

bindSlider(sliders.coolR, (v) => (state.cool[0] = v));
bindSlider(sliders.coolG, (v) => (state.cool[1] = v));
bindSlider(sliders.coolB, (v) => (state.cool[2] = v));

bindSlider(sliders.sparkR, (v) => (state.spark[0] = v));
bindSlider(sliders.sparkG, (v) => (state.spark[1] = v));
bindSlider(sliders.sparkB, (v) => (state.spark[2] = v));

bindSlider(sliders.brightness, (v) => (state.brightness = v));
bindSlider(sliders.saturation, (v) => (state.saturation = v));
bindSlider(sliders.sparkPower, (v) => (state.sparkPower = v));

globalThis.addEventListener("keydown", (event) => {
  const tag = event.target?.tagName?.toLowerCase() ?? "";
  if (tag === "input" || tag === "select" || tag === "textarea") return;

  const key = event.key.toLowerCase();
  if (key === "h") setHelloVisible(!state.helloVisible);
  if (key === "p") setPanelCollapsed(!state.panelCollapsed);
  if (key === "f") {
    toggleFullscreen().catch(() => {});
  }
  if (key === "x") setUiHidden(!uiHidden);
  if (key === "r") {
    state = structuredClone(defaults);
    saveState(state);
    syncUIFromState();
  }
});

syncUIFromState();
renderer.start();
