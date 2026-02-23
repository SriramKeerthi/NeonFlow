const KEY = "neonFlowState.v1";
const defaults = {
  helloVisible: true,
  helloText: "Neon Flow",
  fontSize: 84,
  fontFamily: "atelier",
  invertMode: false,
  invertColor: "#f4f1ec",
  panelCollapsed: false,
  preset: "neonFlow",
  warm: [1.62, 0.06, 0.01],
  cool: [0.02, 0.1, 1.58],
  spark: [1.36, 0.62, 0.04],
  brightness: 1.14,
  saturation: 1.68,
  sparkPower: 0.88
};

function cloneDefaults() {
  if (typeof structuredClone === "function") {
    return structuredClone(defaults);
  }
  return {
    ...defaults,
    warm: [...defaults.warm],
    cool: [...defaults.cool],
    spark: [...defaults.spark]
  };
}

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
  },
  neonSunset: {
    warm: [1.35, 0.18, 0.1],
    cool: [0.15, 0.3, 1.2],
    spark: [1.45, 1.25, 0.15],
    brightness: 1.28,
    saturation: 1.3,
    sparkPower: 1.15
  }
};

const fontFamilies = {
  atelier: "ui-sans-serif, system-ui, -apple-system, 'SF Pro Text', 'Helvetica Neue', Arial",
  noir: "'Helvetica Neue', Helvetica, 'SF Pro Display', ui-sans-serif, system-ui",
  luxe: "ui-serif, 'Times New Roman', Times, Georgia, serif",
  gallery: "'Palatino', 'Palatino Linotype', 'Book Antiqua', ui-serif, serif",
  editorial: "'Baskerville', 'Baskerville Old Face', 'Garamond', 'Times New Roman', serif",
  studio: "'Avenir Next', 'Avenir', 'Segoe UI', 'Helvetica Neue', ui-sans-serif, system-ui",
  rounded: "'Avenir Next Rounded', 'SF Pro Rounded', 'Arial Rounded MT Bold', ui-sans-serif, system-ui",
  classic: "'Iowan Old Style', 'Palatino', 'Book Antiqua', 'Times New Roman', serif",
  slab: "'Rockwell', 'Rockwell Nova', 'Roboto Slab', 'Times New Roman', serif",
  script: "'Snell Roundhand', 'Zapfino', 'Apple Chancery', 'Brush Script MT', cursive",
  wide: "'Unbounded', 'Arial Black', 'Impact', 'Haettenschweiler', ui-sans-serif, system-ui",
  stencil: "'Black Ops One', 'Stencil', 'Stencil Std', 'Impact', sans-serif",
  blackletter: "'UnifrakturMaguntia', 'UnifrakturCook', 'Old English Text MT', 'Goudy Text', serif",
  pixel: "'Silkscreen', 'Press Start 2P', 'Pixel', 'SF Mono', 'Courier New', ui-monospace, monospace",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  condensed: "'Arial Narrow', 'Helvetica Neue Condensed', 'Roboto Condensed', ui-sans-serif, system-ui"
};

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return cloneDefaults();
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    return {
      ...cloneDefaults(),
      ...parsed
    };
  } catch (error) {
    console.error("Hello, developer! Nice to see you here, something seems off!", "\n  (\"^_^\")", "\nFailed to load saved state", error);
    return cloneDefaults();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
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
const maskLayer = document.getElementById("maskLayer");
const maskSvg = document.getElementById("maskSvg");
const maskText = document.getElementById("maskText");
const maskRect = document.getElementById("maskRect");

const uiPanel = document.getElementById("uiPanel");
const resetBtn = document.getElementById("resetBtn");
const helloTextInput = document.getElementById("helloText");
const invertColorInput = document.getElementById("invertColor");
const invertColorLabel = document.getElementById("invertColorLabel");
const fontSizeSlider = document.getElementById("fontSize");
const fontFamilySel = document.getElementById("fontFamily");
const presetSel = document.getElementById("preset");
const actionTextBtn = document.getElementById("actionText");
const actionInvertBtn = document.getElementById("actionInvert");
const actionUiBtn = document.getElementById("actionUi");
const actionFullBtn = document.getElementById("actionFull");
const actionPanelBtn = document.getElementById("actionPanel");

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

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function normalizeHex(value) {
  if (typeof value !== "string") return defaults.invertColor;
  const trimmed = value.trim();
  if (/^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  }
  return defaults.invertColor;
}

function updateMaskSize() {
  if (!maskSvg || !maskText || !maskRect) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  maskSvg.setAttribute("width", String(w));
  maskSvg.setAttribute("height", String(h));
  maskSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  maskRect.setAttribute("width", String(w));
  maskRect.setAttribute("height", String(h));
}

function refreshMaskLayout() {
  updateMaskSize();
  syncMaskText();
}

function syncMaskText() {
  if (!maskText || !helloTitle) return;
  maskText.textContent = state.helloText || defaults.helloText;
  const style = getComputedStyle(helloTitle);
  maskText.style.fontFamily = style.fontFamily;
  maskText.style.fontSize = style.fontSize;
  maskText.style.fontWeight = style.fontWeight;
  maskText.style.letterSpacing = style.letterSpacing;
  maskText.style.textTransform = style.textTransform;
  if (state.helloVisible) {
    const rect = helloTitle.getBoundingClientRect();
    const fontSize = Number.parseFloat(style.fontSize) || 84;
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(style.paddingRight) || 0;
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const lineHeight = style.lineHeight.endsWith("px")
      ? Number.parseFloat(style.lineHeight)
      : fontSize * 1.1;
    const textAlign = style.textAlign;
    let anchor = "start";
    let x = rect.left + paddingLeft;
    if (textAlign === "center") {
      anchor = "middle";
      x = rect.left + rect.width / 2;
    } else if (textAlign === "right" || textAlign === "end") {
      anchor = "end";
      x = rect.right - paddingRight;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let ascent = fontSize * 0.8;
    if (ctx) {
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const metrics = ctx.measureText(maskText.textContent || "");
      if (metrics.actualBoundingBoxAscent) {
        ascent = metrics.actualBoundingBoxAscent;
      }
    }

    const extra = Math.max(0, (lineHeight - fontSize) / 2);
    const baselineOffset = 6;
    const y = rect.top + paddingTop + extra + ascent + baselineOffset;

    maskText.setAttribute("text-anchor", anchor);
    maskText.setAttribute("dominant-baseline", "alphabetic");
    maskText.setAttribute("x", String(x));
    maskText.setAttribute("y", String(y));
  } else {
    maskText.setAttribute("text-anchor", "middle");
    maskText.setAttribute("dominant-baseline", "middle");
    maskText.setAttribute("x", String(window.innerWidth / 2));
    maskText.setAttribute("y", String(window.innerHeight / 2));
  }
  maskText.setAttribute("opacity", state.helloVisible ? "1" : "0");
}

function updateInvertButtons() {
  const label = state.invertMode ? "Disable invert" : "Enable invert";
  if (actionInvertBtn) {
    actionInvertBtn.setAttribute("aria-label", label);
    actionInvertBtn.setAttribute("title", `${label} (I)`);
  }
  if (invertColorLabel) {
    invertColorLabel.textContent = state.invertMode ? "Background Color" : "Text Color";
  }
  if (invertColorInput) {
    invertColorInput.setAttribute("aria-label", state.invertMode ? "Background color" : "Text color");
  }
}

function setInvertMode(enabled, options = {}) {
  const { save = true } = options;
  state.invertMode = Boolean(enabled);
  document.body.classList.toggle("invert-mode", state.invertMode);
  updateInvertButtons();
  if (save) {
    saveState(state);
  }
}

function setInvertColor(value, options = {}) {
  const { save = true } = options;
  const color = normalizeHex(value);
  state.invertColor = color;
  document.documentElement.style.setProperty("--invert-color", color);
  document.documentElement.style.setProperty("--text-color", color);
  if (invertColorInput) {
    invertColorInput.value = color;
  }
  if (save) {
    saveState(state);
  }
}

function applyTitleSettings() {
  const familyKey = state.fontFamily;
  const size = clamp(Number(state.fontSize) || defaults.fontSize, 32, 160);
  const text = typeof state.helloText === "string" ? state.helloText : defaults.helloText;

  state.fontFamily = familyKey;
  state.fontSize = size;
  state.helloText = text;

  helloTitle.textContent = text;
  document.title = text || defaults.helloText;
  helloTitle.style.fontSize = `${size}px`;
  helloTitle.style.fontFamily = fontFamilies[familyKey];
  syncMaskText();
}

function setHelloVisible(visible) {
  state.helloVisible = visible;
  if (visible) {
    helloWrap.style.display = "grid";
  } else {
    helloWrap.style.display = "none";
  }
  syncMaskText();
  document.title = state.helloText || defaults.helloText;
  saveState(state);
}

function setPanelCollapsed(collapsed, options = {}) {
  const { save = true } = options;
  state.panelCollapsed = collapsed;
  uiPanel.classList.toggle("collapsed", collapsed);
  if (actionPanelBtn) {
    const label = collapsed ? "Show panel" : "Hide panel";
    actionPanelBtn.setAttribute("aria-label", label);
    actionPanelBtn.setAttribute("title", `${label} (P)`);
  }
  if (save) {
    saveState(state);
  }
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
  setPanelCollapsed(state.panelCollapsed, { save: false });
  setInvertMode(state.invertMode, { save: false });
  setInvertColor(state.invertColor, { save: false });
  refreshMaskLayout();

  if (state.helloVisible) {
    helloWrap.style.display = "grid";
  } else {
    helloWrap.style.display = "none";
  }

  applyTitleSettings();
  renderer.applyUniforms(state);
}

function applyPreset(name) {
  if (!presets[name]) return;
  const preset = presets[name];
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
  if (actionUiBtn) {
    const label = uiHidden ? "Show UI" : "Hide UI";
    actionUiBtn.setAttribute("aria-label", label);
    actionUiBtn.setAttribute("title", `${label} (X)`);
  }
}

function toggleUiHidden() {
  setUiHidden(!uiHidden);
}

let shakeEnabled = false;
let lastShakeAt = 0;

function handleShake(event) {
  if (!uiHidden) return;
  const acc = event.accelerationIncludingGravity;
  if (!acc) return;
  const ax = acc.x || 0;
  const ay = acc.y || 0;
  const az = acc.z || 0;
  const magnitude = Math.hypot(ax, ay, az);
  if (magnitude > 20 && performance.now() - lastShakeAt > 1200) {
    lastShakeAt = performance.now();
    setUiHidden(false);
  }
}

function enableShake() {
  if (shakeEnabled) return;
  const motion = globalThis.DeviceMotionEvent;
  if (motion && typeof motion.requestPermission === "function") {
    motion.requestPermission().then((state) => {
      if (state === "granted") {
        globalThis.addEventListener("devicemotion", handleShake, { passive: true });
        shakeEnabled = true;
      }
    }).catch(() => {});
    return;
  }
  globalThis.addEventListener("devicemotion", handleShake, { passive: true });
  shakeEnabled = true;
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
    return;
  }
  await document.exitFullscreen();
}

resetBtn.addEventListener("click", () => {
  state = cloneDefaults();
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

if (actionInvertBtn) {
  actionInvertBtn.addEventListener("click", () => setInvertMode(!state.invertMode));
}

if (invertColorInput) {
  invertColorInput.addEventListener("input", () => setInvertColor(invertColorInput.value));
}

if (actionTextBtn) {
  actionTextBtn.addEventListener("click", () => setHelloVisible(!state.helloVisible));
}

if (actionUiBtn) {
  actionUiBtn.addEventListener("click", () => {
    toggleUiHidden();
    enableShake();
  });
}

if (actionFullBtn) {
  actionFullBtn.addEventListener("click", () => {
    toggleFullscreen().catch(() => {});
  });
}

if (actionPanelBtn) {
  actionPanelBtn.addEventListener("click", () => {
    setPanelCollapsed(!state.panelCollapsed);
  });
}

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

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r") {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "t") setHelloVisible(!state.helloVisible);
  if (key === "p") setPanelCollapsed(!state.panelCollapsed);
  if (key === "f") {
    toggleFullscreen().catch(() => {});
  }
  if (key === "x") setUiHidden(!uiHidden);
  if (key === "i") setInvertMode(!state.invertMode);
  if (key === "r") {
    state = cloneDefaults();
    saveState(state);
    syncUIFromState();
  }
});

let lastTapAt = 0;
globalThis.addEventListener("touchend", () => {
  const now = performance.now();
  if (now - lastTapAt < 280) {
    setUiHidden(!uiHidden);
  }
  lastTapAt = now;
}, { passive: true });

globalThis.addEventListener("touchstart", () => {
  enableShake();
}, { passive: true, once: true });

globalThis.addEventListener("resize", refreshMaskLayout, { passive: true });
globalThis.addEventListener("fullscreenchange", () => {
  requestAnimationFrame(refreshMaskLayout);
});

syncUIFromState();
renderer.start();
