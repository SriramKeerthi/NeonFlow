(() => {
const vertSrc = `
  attribute vec2 a_pos;
  attribute vec2 a_uv;
  uniform vec2 u_res;
  varying vec2 v_uv;
  void main() {
    vec2 zeroToOne = a_pos / u_res;
    vec2 clip = zeroToOne * 2.0 - 1.0;
    gl_Position = vec4(clip.x, 1.0 - zeroToOne.y * 2.0, 0.0, 1.0);
    v_uv = a_uv;
  }
`;

const fragSrc = `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  uniform sampler2D u_tex;
  uniform vec4 u_color;
  uniform vec4 u_glowColor;
  uniform float u_glowAlpha;
  uniform float u_glowRange;
  uniform float u_pxRange;
  uniform float u_maskMode;
  varying vec2 v_uv;

  float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
  }

  void main() {
    vec3 sample = texture2D(u_tex, v_uv).rgb;
    float sd = median(sample.r, sample.g, sample.b) - 0.5;
    float w = fwidth(sd);
    float alpha = clamp(sd * u_pxRange / w + 0.5, 0.0, 1.0);
    if (u_maskMode > 0.5 && alpha < 0.5) {
      discard;
    }
    float distPx = sd * u_pxRange;
    float glow = smoothstep(-u_glowRange, 0.0, distPx);
    float glowAlpha = u_glowAlpha * glow;
    vec3 rgb = mix(u_glowColor.rgb, u_color.rgb, alpha);
    float outAlpha = max(u_color.a * alpha, glowAlpha);
    gl_FragColor = vec4(rgb, outAlpha);
  }
`;

function compile(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const msg = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(msg);
  }
  return shader;
}

function createProgram(gl, vert, frag) {
  const vs = compile(gl, gl.VERTEX_SHADER, vert);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog));
  }
  return prog;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function createTexture(gl, image) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

function parseFont(json, options) {
  const common = json.common || {};
  const info = json.info || {};
  const chars = new Map();
  const list = json.chars || json.chars?.chars || [];
  if (Array.isArray(list)) {
    list.forEach((ch) => {
      if (typeof ch.id === "number") {
        chars.set(ch.id, ch);
      }
    });
  }
  const kernings = new Map();
  const klist = json.kernings || json.kernings?.kernings || [];
  if (Array.isArray(klist)) {
    klist.forEach((k) => {
      if (typeof k.first === "number" && typeof k.second === "number") {
        kernings.set(`${k.first},${k.second}`, k.amount || 0);
      }
    });
  }
  const distanceRange = options?.pxRange
    ?? json.distanceField?.distanceRange
    ?? json.distanceRange
    ?? 4;
  return { info, common, chars, kernings, distanceRange };
}

function getKerning(font, left, right) {
  if (!left || !right) return 0;
  return font.kernings.get(`${left},${right}`) || 0;
}

function pushLine(lines, state) {
  lines.push({ glyphs: state.line, width: state.lineWidth });
  state.line = [];
  state.lineWidth = 0;
  state.penX = 0;
  state.prev = null;
}

function measureWordWidth(font, wordChars, scale) {
  let wordWidth = 0;
  let last = null;
  for (const ch of wordChars) {
    const glyph = font.chars.get(ch.codePointAt(0));
    if (!glyph) continue;
    const kern = getKerning(font, last, glyph.id) * scale;
    wordWidth += kern + glyph.xadvance * scale;
    last = glyph.id;
  }
  return wordWidth;
}

function appendWordGlyphs(font, wordChars, scale, state) {
  for (const ch of wordChars) {
    const glyph = font.chars.get(ch.codePointAt(0));
    if (!glyph) continue;
    const kern = getKerning(font, state.prev, glyph.id) * scale;
    state.penX += kern;
    state.lineWidth += kern;
    state.line.push({
      glyph,
      x: state.penX,
      y: 0
    });
    state.penX += glyph.xadvance * scale;
    state.lineWidth += glyph.xadvance * scale;
    state.prev = glyph.id;
  }
}

function buildLineFromWords(font, words, scale, maxWidth, spaceAdvance, lines) {
  const state = {
    line: [],
    lineWidth: 0,
    penX: 0,
    prev: null
  };

  let wordIndex = 0;
  for (const word of words) {
    const wordChars = [...word];
    const wordWidth = measureWordWidth(font, wordChars, scale);
    const needsSpace = wordIndex > 0 && state.line.length > 0;
    const nextWidth = state.lineWidth + (needsSpace ? spaceAdvance : 0) + wordWidth;
    if (maxWidth && state.lineWidth > 0 && nextWidth > maxWidth) {
      pushLine(lines, state);
    }

    if (needsSpace && state.line.length > 0) {
      state.penX += spaceAdvance;
      state.lineWidth += spaceAdvance;
    }

    appendWordGlyphs(font, wordChars, scale, state);
    wordIndex += 1;
  }

  pushLine(lines, state);
}

function buildLines(font, text, scale, maxWidth, spaceAdvance) {
  const lines = [];
  const rawLines = String(text || "").split("\n");

  for (const raw of rawLines) {
    const words = raw.trim() ? raw.trim().split(/\s+/) : [""];
    buildLineFromWords(font, words, scale, maxWidth, spaceAdvance, lines);
  }

  let blockWidth = 0;
  for (const line of lines) {
    blockWidth = Math.max(blockWidth, line.width);
  }

  return { lines, blockWidth };
}

function computeBounds(lines, lineHeight, base, scale, blockHeight) {
  let boundsMinY = 0;
  let boundsMaxY = 0;
  let boundsSet = false;
  let lineIndex = 0;
  for (const line of lines) {
    const lineTop = lineIndex * lineHeight;
    const baseline = lineTop + base;
    for (const entry of line.glyphs) {
      const glyph = entry.glyph;
      const y0 = baseline + glyph.yoffset * scale;
      const y1 = y0 + glyph.height * scale;
      if (!boundsSet) {
        boundsMinY = y0;
        boundsMaxY = y1;
        boundsSet = true;
        continue;
      }
      boundsMinY = Math.min(boundsMinY, y0);
      boundsMaxY = Math.max(boundsMaxY, y1);
    }
    lineIndex += 1;
  }

  const boundsHeight = boundsSet ? Math.max(1, boundsMaxY - boundsMinY) : blockHeight;
  return { boundsMinY, boundsHeight };
}

function layoutText(font, text, fontSize, maxWidth, align) {
  const scale = fontSize / (font.info.size || fontSize);
  const lineHeight = (font.common.lineHeight || fontSize) * scale;
  const base = (font.common.base || fontSize) * scale;
  const space = font.chars.get(32);
  const spaceAdvance = space ? space.xadvance * scale : fontSize * 0.4;

  const { lines, blockWidth } = buildLines(font, text, scale, maxWidth, spaceAdvance);
  const blockHeight = Math.max(1, lines.length) * lineHeight;
  const { boundsMinY, boundsHeight } = computeBounds(lines, lineHeight, base, scale, blockHeight);

  return {
    lines,
    blockWidth,
    blockHeight,
    lineHeight,
    base,
    scale,
    align,
    boundsMinY,
    boundsHeight
  };
}

function createMsdfRenderer(gl) {
  const ext = gl.getExtension("OES_standard_derivatives");
  if (!ext) {
    return { supported: false };
  }
  let prog = null;
  try {
    prog = createProgram(gl, vertSrc, fragSrc);
  } catch (error) {
    console.warn("MSDF shader compile failed, falling back to HTML text", error);
    return { supported: false };
  }
  const aPos = gl.getAttribLocation(prog, "a_pos");
  const aUv = gl.getAttribLocation(prog, "a_uv");
  const uniforms = {
    res: gl.getUniformLocation(prog, "u_res"),
    tex: gl.getUniformLocation(prog, "u_tex"),
    color: gl.getUniformLocation(prog, "u_color"),
    glowColor: gl.getUniformLocation(prog, "u_glowColor"),
    glowAlpha: gl.getUniformLocation(prog, "u_glowAlpha"),
    glowRange: gl.getUniformLocation(prog, "u_glowRange"),
    pxRange: gl.getUniformLocation(prog, "u_pxRange"),
    maskMode: gl.getUniformLocation(prog, "u_maskMode")
  };

  const buffer = gl.createBuffer();
  let vertexData = new Float32Array(0);
  let vertexCount = 0;
  const fonts = new Map();
  let currentFontKey = null;
  let visible = true;

  async function loadFont(key, jsonUrl, imageUrl, options = {}) {
    const [json, image] = await Promise.all([
      fetch(jsonUrl).then((res) => {
        if (!res.ok) throw new Error(`Failed to load font JSON: ${jsonUrl}`);
        return res.json();
      }),
      loadImage(imageUrl)
    ]);
    const font = parseFont(json, options);
    font.texture = createTexture(gl, image);
    font.scaleW = font.common.scaleW || image.width;
    font.scaleH = font.common.scaleH || image.height;
    fonts.set(key, font);
    return font;
  }

  function hasFont(key) {
    return fonts.has(key);
  }

  function buildVertices(font, layout, res, options) {
    const { lines, blockWidth, blockHeight, lineHeight, base, scale, align } = layout;
    const box = options.box || null;
    let maxWidth = options.maxWidth || blockWidth;
    const offsetX = options.offsetX || 0;
    const boundsHeight = layout.boundsHeight || blockHeight;
    const boundsMinY = Number.isFinite(layout.boundsMinY) ? layout.boundsMinY : 0;
    let originX = (res[0] - Math.min(blockWidth, maxWidth)) * 0.5;
    let originY = (res[1] - boundsHeight) * 0.5;

    if (box) {
      const padL = box.paddingLeft || 0;
      const padR = box.paddingRight || 0;
      const padT = box.paddingTop || 0;
      const padB = box.paddingBottom || 0;
      const availableWidth = Math.max(0, box.width - padL - padR);
      const availableHeight = Math.max(0, box.height - padT - padB);
      maxWidth = Math.max(availableWidth, 0) || blockWidth;
      originX = box.x + padL;
      originY = box.y + padT;
      if (availableHeight > boundsHeight) {
        originY += (availableHeight - boundsHeight) * 0.5;
      }
    }

    originX += offsetX;

    const verts = [];

    const alignWidth = box ? maxWidth : blockWidth;

    let lineIndex = 0;
    for (const line of lines) {
      let lineX = originX;
      if (align === "center") {
        lineX = originX + (alignWidth - line.width) * 0.5;
      } else if (align === "right") {
        lineX = originX + (alignWidth - line.width);
      }

      const lineTop = originY - boundsMinY + lineIndex * lineHeight;
      const baseline = lineTop + base;

      for (const entry of line.glyphs) {
        const glyph = entry.glyph;
        const x0 = lineX + entry.x + glyph.xoffset * scale;
        const y0 = baseline + glyph.yoffset * scale;
        const x1 = x0 + glyph.width * scale;
        const y1 = y0 + glyph.height * scale;

        const u0 = glyph.x / font.scaleW;
        const v0 = glyph.y / font.scaleH;
        const u1 = (glyph.x + glyph.width) / font.scaleW;
        const v1 = (glyph.y + glyph.height) / font.scaleH;

        verts.push(
          x0, y0, u0, v0,
          x1, y0, u1, v0,
          x0, y1, u0, v1,
          x0, y1, u0, v1,
          x1, y0, u1, v0,
          x1, y1, u1, v1
        );
      }
      lineIndex += 1;
    }

    vertexData = new Float32Array(verts);
    vertexCount = vertexData.length / 4;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
  }

  function setText(options) {
    const { text, fontKey, fontSize, color, align, maxWidth, res, box, glow } = options;
    if (!fonts.has(fontKey)) return false;
    const font = fonts.get(fontKey);
    currentFontKey = fontKey;
    const layout = layoutText(font, text, fontSize, maxWidth, align || "left");
    buildVertices(font, layout, res, { maxWidth, box, offsetX: options.offsetX || 0 });
    if (color) {
      gl.useProgram(prog);
      gl.uniform4f(uniforms.color, color[0], color[1], color[2], color[3]);
    }
    if (glow && typeof glow === "object") {
      const gc = glow.color || [1, 1, 1, 0];
      gl.useProgram(prog);
      gl.uniform4f(uniforms.glowColor, gc[0], gc[1], gc[2], gc[3]);
      gl.uniform1f(uniforms.glowAlpha, glow.alpha ?? 0);
      gl.uniform1f(uniforms.glowRange, glow.range ?? 12);
    } else {
      gl.useProgram(prog);
      gl.uniform4f(uniforms.glowColor, 1, 1, 1, 0);
      gl.uniform1f(uniforms.glowAlpha, 0);
      gl.uniform1f(uniforms.glowRange, 12);
    }
    return true;
  }

  function measureText(options) {
    const { text, fontKey, fontSize, maxWidth, align } = options;
    if (!fonts.has(fontKey)) return null;
    const font = fonts.get(fontKey);
    const layout = layoutText(font, text, fontSize, maxWidth, align || "left");
    return {
      blockWidth: layout.blockWidth,
      blockHeight: layout.blockHeight,
      lineHeight: layout.lineHeight,
      lineCount: layout.lines.length
    };
  }

  function setVisible(next) {
    visible = Boolean(next);
  }

  function drawInternal(res, colorOverride, ignoreVisibility, maskMode) {
    if ((!visible && !ignoreVisibility) || vertexCount === 0 || !fonts.has(currentFontKey)) return;
    const font = fonts.get(currentFontKey);
    gl.useProgram(prog);
    gl.uniform2f(uniforms.res, res[0], res[1]);
    gl.uniform1f(uniforms.pxRange, font.distanceRange || 4);
    gl.uniform1f(uniforms.maskMode, maskMode ? 1 : 0);
    if (colorOverride) {
      gl.uniform4f(uniforms.color, colorOverride[0], colorOverride[1], colorOverride[2], colorOverride[3]);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, font.texture);
    gl.uniform1i(uniforms.tex, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  }

  function draw(res, colorOverride) {
    drawInternal(res, colorOverride, false, false);
  }

  function drawMask(res) {
    drawInternal(res, null, true, true);
  }

  return {
    supported: true,
    loadFont,
    hasFont,
    setText,
    setVisible,
    draw,
    drawMask,
    measureText
  };
}

globalThis.NeonFlow = globalThis.NeonFlow || {};
globalThis.NeonFlow.createMsdfRenderer = createMsdfRenderer;
})();
