const KEY = "neonFlowState.v1";
const defaults = {
  helloVisible: true,
  helloText: "Neon Flow",
  fontSize: 84,
  fontFamily: "inter",
  textAlign: "center",
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
  inter: "'Inter', 'Helvetica Neue', Helvetica, Arial, ui-sans-serif, system-ui",
  raleway: "'Raleway', 'Helvetica Neue', Helvetica, Arial, ui-sans-serif, system-ui",
  playfair: "'Playfair Display', 'Times New Roman', Georgia, ui-serif, serif",
  fraunces: "'Fraunces', 'Times New Roman', Georgia, ui-serif, serif",
  slab: "'Roboto Slab', 'Times New Roman', Georgia, ui-serif, serif",
  rounded: "'Nunito', 'Avenir Next Rounded', 'SF Pro Rounded', ui-sans-serif, system-ui",
  script: "'Pacifico', 'Brush Script MT', 'Snell Roundhand', cursive",
  mono: "'Space Mono', 'SF Mono', 'Courier New', ui-monospace, monospace",
  wide: "'Unbounded', 'Arial Black', 'Impact', 'Haettenschweiler', ui-sans-serif, system-ui",
  stencil: "'Black Ops One', 'Stencil', 'Stencil Std', 'Impact', sans-serif",
  blackletter: "'UnifrakturMaguntia', 'UnifrakturCook', 'Old English Text MT', 'Goudy Text', serif",
  pixel: "'Silkscreen', 'Press Start 2P', 'Pixel', 'SF Mono', 'Courier New', ui-monospace, monospace"
};

const TITLE_WEIGHT = 800;
const TITLE_LINE_HEIGHT = 1.1;
const fontWeights = {
  stencil: 400
};
const CARD_STYLE = {
  paddingX: 32,
  paddingY: 24,
  radius: 24,
  borderWidth: 0.4,
  fill: [1, 1, 1, 0],
  border: [1, 1, 1, 0.2],
  blurAlpha: 0.95,
  shadowColor: [0, 0, 0, 1],
  shadowAlpha: 0.06,
  shadowBlur: 32,
  shadowOffset: [0, 0]
};
const TEXT_GLOW = {
  color: [0.95, 0.6, 1, 1],
  alpha: 0,
  range: 12,
  shadowColor: [0, 0, 0, 1],
  shadowAlpha: 0.16,
  shadowOffset: [0, 0],
  shadowPad: 8
};
const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");
let fontLoadToken = 0;
let msdfMeasureToken = 0;

function waitForFontLoad(fontSpec) {
  if (!document.fonts || typeof document.fonts.load !== "function") {
    return Promise.resolve(false);
  }
  return document.fonts.load(fontSpec).then(() => true).catch(() => false);
}


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

const uiPanel = document.getElementById("uiPanel");
const resetBtn = document.getElementById("resetBtn");
const helloTextInput = document.getElementById("helloText");
const invertColorInput = document.getElementById("invertColor");
const invertColorLabel = document.getElementById("invertColorLabel");
const fontSizeSlider = document.getElementById("fontSize");
const fontFamilySel = document.getElementById("fontFamily");
const textAlignGroup = document.getElementById("textAlign");
const textAlignButtons = textAlignGroup
  ? Array.from(textAlignGroup.querySelectorAll("[data-align]"))
  : [];
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

function hexToRgb(value) {
  const hex = normalizeHex(value).slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function getTextMaxWidth() {
  const width = window.innerWidth;
  const padded = Math.max(240, width - 160);
  return Math.min(width * 0.8, padded);
}

function getFontFamily(key) {
  return fontFamilies[key] || fontFamilies.inter;
}

function getFontWeight(key) {
  return fontWeights[key] || TITLE_WEIGHT;
}

function getFontWidthScale() {
  return 1;
}

function measureTextBlock(text, fontFamily, fontSize, fontWeight, maxWidth) {
  if (!measureCtx) {
    return { lines: [String(text || "")], maxLineWidth: 0, lineHeight: fontSize * TITLE_LINE_HEIGHT };
  }
  const rawLines = String(text || "").split("\n");
  const lines = [];
  const lineHeight = fontSize * TITLE_LINE_HEIGHT;
  const font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  measureCtx.font = font;

  rawLines.forEach((raw) => {
    const words = raw.trim() ? raw.trim().split(/\s+/) : [""];
    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      const width = measureCtx.measureText(test).width;
      if (maxWidth && line && width > maxWidth) {
        lines.push(line);
        line = word;
        return;
      }
      line = test;
    });
    lines.push(line);
  });

  const maxLineWidth = lines.reduce((max, line) => {
    const width = measureCtx.measureText(line).width;
    return Math.max(max, width);
  }, 0);

  return { lines, maxLineWidth, lineHeight };
}

function updateCanvasText() {
  if (typeof renderer.setTextState !== "function") return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const fontKey = state.fontFamily;
  const fontFamily = getFontFamily(fontKey);
  const fontWeight = getFontWeight(fontKey);
  const fontWidthScale = getFontWidthScale();
  const fontSize = clamp(Number(state.fontSize) || defaults.fontSize, 32, 160);
  const maxWidth = getTextMaxWidth();
  const layoutMaxWidthDpr = maxWidth * dpr;
  const wrapBufferDpr = 12 * dpr;
  const text = state.helloText || defaults.helloText;
  const align = ["left", "center", "right"].includes(state.textAlign)
    ? state.textAlign
    : "center";
  const metrics = measureTextBlock(text, fontFamily, fontSize, fontWeight, maxWidth);
  const minCardWidth = 240 * dpr;
  const maxCardWidth = maxWidth * dpr;
  const padXDpr = CARD_STYLE.paddingX * dpr;
  const padYDpr = CARD_STYLE.paddingY * dpr;
  const shadowPadDpr = TEXT_GLOW.shadowAlpha > 0 ? (TEXT_GLOW.shadowPad * dpr) : 0;
  const textWidthDpr = Math.max(minCardWidth - padXDpr * 2, metrics.maxLineWidth * fontWidthScale * dpr);
  const cardWidthDpr = Math.round(Math.min(
    maxCardWidth,
    Math.max(minCardWidth, textWidthDpr + padXDpr * 2 + shadowPadDpr * 2)
  ));
  const cardHeightDpr = Math.round((metrics.lines.length * metrics.lineHeight * dpr) + padYDpr * 2 + shadowPadDpr * 2);
  const textOffsetX = 0;
  const box = {
    x: Math.round((window.innerWidth * dpr - cardWidthDpr) * 0.5),
    y: Math.round((window.innerHeight * dpr - cardHeightDpr) * 0.5),
    width: cardWidthDpr,
    height: cardHeightDpr,
    paddingLeft: padXDpr,
    paddingRight: padXDpr,
    paddingTop: padYDpr,
    paddingBottom: padYDpr
  };
  const textMaxWidth = Math.max(
    0,
    Math.min(layoutMaxWidthDpr + wrapBufferDpr, cardWidthDpr - padXDpr * 2 + wrapBufferDpr)
  );
  const color = [...hexToRgb(state.invertColor), 1];
  const visible = state.helloVisible && !state.invertMode;
  const cardVisible = state.helloVisible && !state.invertMode;
  if (typeof renderer.setCardState === "function") {
    renderer.setCardState({
      visible: cardVisible,
      box,
      radius: CARD_STYLE.radius * dpr,
      borderWidth: CARD_STYLE.borderWidth * dpr,
      fill: CARD_STYLE.fill,
      border: CARD_STYLE.border,
      blurAlpha: CARD_STYLE.blurAlpha,
      shadowColor: CARD_STYLE.shadowColor,
      shadowAlpha: CARD_STYLE.shadowAlpha,
      shadowBlur: CARD_STYLE.shadowBlur * dpr,
      shadowOffset: [CARD_STYLE.shadowOffset[0] * dpr, CARD_STYLE.shadowOffset[1] * dpr]
    });
  }
  if (typeof renderer.setGlowState === "function") {
    renderer.setGlowState({
      color: TEXT_GLOW.color,
      alpha: TEXT_GLOW.alpha,
      shadowColor: TEXT_GLOW.shadowColor,
      shadowAlpha: TEXT_GLOW.shadowAlpha,
      shadowOffset: TEXT_GLOW.shadowOffset
    });
  }
  renderer
    .setTextState({
      text,
      fontKey,
      fontSize: fontSize * dpr,
      color,
      align,
      maxWidth: textMaxWidth,
      box,
      offsetX: textOffsetX
    })
    .then((ready) => {
      if (typeof renderer.measureTextState === "function") {
        const token = ++msdfMeasureToken;
        const applyMetrics = (msdfMetrics) => {
          if (!msdfMetrics || token !== msdfMeasureToken) return;
          const nextTextWidth = Math.max(minCardWidth - padXDpr * 2, msdfMetrics.blockWidth * fontWidthScale);
          const nextWidth = Math.round(Math.min(
            maxCardWidth,
            Math.max(minCardWidth, nextTextWidth + padXDpr * 2 + shadowPadDpr * 2)
          ));
          const nextHeight = Math.round(msdfMetrics.blockHeight + padYDpr * 2 + shadowPadDpr * 2);
          const deltaW = Math.abs(nextWidth - box.width);
          const deltaH = Math.abs(nextHeight - box.height);
          if (deltaW < 1 && deltaH < 1) return;
          const nextBox = {
            x: Math.round((window.innerWidth * dpr - nextWidth) * 0.5),
            y: Math.round((window.innerHeight * dpr - nextHeight) * 0.5),
            width: nextWidth,
            height: nextHeight,
            paddingLeft: padXDpr,
            paddingRight: padXDpr,
            paddingTop: padYDpr,
            paddingBottom: padYDpr
          };
          const nextTextMaxWidth = Math.max(
            0,
            Math.min(layoutMaxWidthDpr + wrapBufferDpr, nextWidth - padXDpr * 2 + wrapBufferDpr)
          );
          if (typeof renderer.setCardState === "function") {
            renderer.setCardState({
              visible: cardVisible,
              box: nextBox,
              radius: CARD_STYLE.radius * dpr,
              borderWidth: CARD_STYLE.borderWidth * dpr,
              fill: CARD_STYLE.fill,
              border: CARD_STYLE.border,
              blurAlpha: CARD_STYLE.blurAlpha,
              shadowColor: CARD_STYLE.shadowColor,
              shadowAlpha: CARD_STYLE.shadowAlpha,
              shadowBlur: CARD_STYLE.shadowBlur * dpr,
              shadowOffset: [CARD_STYLE.shadowOffset[0] * dpr, CARD_STYLE.shadowOffset[1] * dpr]
            });
          }
          renderer.setTextState({
            text,
            fontKey,
            fontSize: fontSize * dpr,
            color,
            align,
            maxWidth: nextTextMaxWidth,
            box: nextBox,
            offsetX: textOffsetX
          }).catch(() => {});
        };

        renderer.measureTextState({
          text,
          fontKey,
          fontSize: fontSize * dpr,
          maxWidth: layoutMaxWidthDpr + wrapBufferDpr,
          align
        }).then((msdfMetrics) => {
          if (!msdfMetrics || token !== msdfMeasureToken) return;
          const hasManualBreak = String(text).includes("\n");
          if (!hasManualBreak && msdfMetrics.lineCount > 1) {
            renderer.measureTextState({
              text,
              fontKey,
              fontSize: fontSize * dpr,
              maxWidth: 0,
              align
            }).then((nowrapMetrics) => {
              if (!nowrapMetrics) return;
              const tolerance = 2;
              if (nowrapMetrics.blockWidth <= layoutMaxWidthDpr + wrapBufferDpr + tolerance) {
                applyMetrics(nowrapMetrics);
                return;
              }
              applyMetrics(msdfMetrics);
            }).catch(() => {});
            return;
          }
          applyMetrics(msdfMetrics);
        }).catch(() => {});
      }
      const cardSupported = typeof renderer.isCardSupported === "function"
        ? renderer.isCardSupported()
        : false;
      if (typeof renderer.setTextVisible === "function") {
        renderer.setTextVisible(visible).catch(() => {});
      }
      document.body.classList.toggle("canvas-text", Boolean(ready));
      document.body.classList.toggle("canvas-card", Boolean(ready && cardSupported));
    })
    .catch(() => {});
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
  if (typeof renderer.setTextVisible === "function") {
    renderer.setTextVisible(!state.invertMode && state.helloVisible).catch(() => {});
  }
  if (typeof renderer.setInvertState === "function") {
    renderer.setInvertState({
      enabled: state.invertMode,
      color: [...hexToRgb(state.invertColor), 1]
    });
  }
  updateCanvasText();
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
  if (typeof renderer.setInvertState === "function") {
    renderer.setInvertState({
      enabled: state.invertMode,
      color: [...hexToRgb(color), 1]
    });
  }
  updateCanvasText();
  if (save) {
    saveState(state);
  }
}

function applyTitleSettings() {
  const familyKey = state.fontFamily;
  const size = clamp(Number(state.fontSize) || defaults.fontSize, 32, 160);
  const text = typeof state.helloText === "string" ? state.helloText : defaults.helloText;
  const align = state.textAlign || defaults.textAlign;

  state.fontFamily = familyKey;
  state.fontSize = size;
  state.helloText = text;
  state.textAlign = align;

  document.title = text || defaults.helloText;
  updateCanvasText();
  const fontFamily = getFontFamily(familyKey);
  const fontWeight = getFontWeight(familyKey);
  const token = ++fontLoadToken;
  waitForFontLoad(`${fontWeight} ${size}px ${fontFamily}`).then((loaded) => {
    if (loaded && token === fontLoadToken) {
      updateCanvasText();
    }
  });
}

function setHelloVisible(visible) {
  state.helloVisible = visible;
  if (typeof renderer.setTextVisible === "function") {
    renderer.setTextVisible(visible && !state.invertMode).catch(() => {});
  }
  updateCanvasText();
  document.title = state.helloText || defaults.helloText;
  saveState(state);
}

function setPanelCollapsed(collapsed, options = {}) {
  const { save = true } = options;
  state.panelCollapsed = collapsed;
  uiPanel.classList.toggle("collapsed", collapsed);
  document.body.classList.toggle("panel-collapsed", collapsed);
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
  const currentAlign = state.textAlign || defaults.textAlign;
  if (textAlignButtons.length) {
    textAlignButtons.forEach((btn) => {
      const isActive = btn.dataset.align === currentAlign;
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

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

if (textAlignButtons.length) {
  textAlignButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.textAlign = btn.dataset.align;
      saveState(state);
      applyTitleSettings();
      syncUIFromState();
    });
  });
}

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

globalThis.addEventListener("resize", () => {
  updateCanvasText();
}, { passive: true });
globalThis.addEventListener("fullscreenchange", () => {
  requestAnimationFrame(updateCanvasText);
});

syncUIFromState();
renderer.start();
