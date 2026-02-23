(() => {
const { vertSrc, fragSrc } = globalThis.NeonFlow.shaders;

const cardVertSrc = `
  attribute vec2 a_pos;
  uniform vec2 u_res;
  varying vec2 v_pos;
  void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
    v_pos = (a_pos * 0.5 + 0.5) * u_res;
  }
`;

const cardFragSrc = `
  precision highp float;
  uniform vec2 u_res;
  uniform vec4 u_box;
  uniform float u_radius;
  uniform float u_borderWidth;
  uniform vec4 u_fill;
  uniform vec4 u_border;
  uniform vec4 u_shadowColor;
  uniform float u_shadowAlpha;
  uniform float u_shadowBlur;
  uniform vec2 u_shadowOffset;
  uniform float u_blurAlpha;
  uniform sampler2D u_tex;
  varying vec2 v_pos;

  float sdRoundRect(vec2 p, vec2 halfSize, float r) {
    vec2 q = abs(p) - halfSize + vec2(r);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 frag = vec2(v_pos.x, u_res.y - v_pos.y);
    vec2 center = u_box.xy + u_box.zw * 0.5;
    vec2 halfSize = u_box.zw * 0.5;
    float r = min(u_radius, min(halfSize.x, halfSize.y));
    float dist = sdRoundRect(frag - center, halfSize, r);
    vec2 shadowCenter = center + u_shadowOffset;
    float shadowDist = sdRoundRect(frag - shadowCenter, halfSize, r);
    float aa = 1.0;
    float fill = 1.0 - smoothstep(0.0, aa, dist);
    float bw = max(u_borderWidth, 0.0);
    float border = 1.0 - smoothstep(bw - aa, bw + aa, abs(dist));
    border *= step(0.001, bw);
    vec2 uv = v_pos / max(u_res, vec2(1.0));
    vec3 glass = texture2D(u_tex, uv).rgb;

    float baseAlpha = u_blurAlpha * fill;
    float borderAlpha = u_border.a * border;
    float alpha = max(baseAlpha, borderAlpha);
    vec3 rgb = mix(glass, u_border.rgb, border);

    float shadow = 0.0;
    if (u_shadowAlpha > 0.0) {
      float softness = max(u_shadowBlur, 0.0);
      shadow = smoothstep(softness, 0.0, shadowDist) * step(0.0, shadowDist);
    }
    float shadowAlpha = u_shadowAlpha * shadow;
    float outAlpha = clamp(max(alpha, shadowAlpha), 0.0, 1.0);
    vec3 shadowRgb = u_shadowColor.rgb;
    vec3 outRgb = mix(rgb, shadowRgb, shadowAlpha / max(outAlpha, 0.0001));
    gl_FragColor = vec4(outRgb, outAlpha);
  }
`;

const blurVertSrc = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
    v_uv = a_pos * 0.5 + 0.5;
  }
`;

const blurFragSrc = `
  precision highp float;
  uniform sampler2D u_tex;
  uniform vec2 u_dir;
  varying vec2 v_uv;
  void main() {
    vec4 sum = texture2D(u_tex, v_uv) * 0.227027;
    sum += texture2D(u_tex, v_uv + u_dir * 1.384615) * 0.316216;
    sum += texture2D(u_tex, v_uv - u_dir * 1.384615) * 0.316216;
    sum += texture2D(u_tex, v_uv + u_dir * 3.230769) * 0.070270;
    sum += texture2D(u_tex, v_uv - u_dir * 3.230769) * 0.070270;
    gl_FragColor = sum;
  }
`;

const glowVertSrc = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
    v_uv = a_pos * 0.5 + 0.5;
  }
`;

const glowFragSrc = `
  precision highp float;
  uniform sampler2D u_tex;
  uniform vec4 u_color;
  uniform float u_alpha;
  uniform vec2 u_offset;
  varying vec2 v_uv;
  void main() {
    float a = texture2D(u_tex, v_uv + u_offset).a;
    gl_FragColor = vec4(u_color.rgb, a * u_alpha);
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

function createEmptyTexture(gl, width, height) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

function createFramebuffer(gl, texture) {
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return fbo;
}

function createBlurRenderer(gl) {
  let prog = null;
  try {
    const vs = compile(gl, gl.VERTEX_SHADER, blurVertSrc);
    const fs = compile(gl, gl.FRAGMENT_SHADER, blurFragSrc);
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog));
    }
  } catch (error) {
    console.warn("Blur shader compile failed, skipping glass blur", error);
    return { supported: false };
  }

  const aPos = gl.getAttribLocation(prog, "a_pos");
  const uniforms = {
    tex: gl.getUniformLocation(prog, "u_tex"),
    dir: gl.getUniformLocation(prog, "u_dir")
  };

  function draw(inputTex, outputFbo, dir, res, buffer, scale) {
    const blurScale = typeof scale === "number" ? scale : 3.6;
    gl.useProgram(prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputFbo);
    gl.viewport(0, 0, res[0], res[1]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTex);
    gl.uniform1i(uniforms.tex, 0);
    gl.uniform2f(uniforms.dir, (dir[0] * blurScale) / res[0], (dir[1] * blurScale) / res[1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return { supported: true, draw };
}

function createGlowRenderer(gl) {
  let prog = null;
  try {
    const vs = compile(gl, gl.VERTEX_SHADER, glowVertSrc);
    const fs = compile(gl, gl.FRAGMENT_SHADER, glowFragSrc);
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog));
    }
  } catch (error) {
    console.warn("Glow shader compile failed, skipping text glow", error);
    return { supported: false };
  }

  const aPos = gl.getAttribLocation(prog, "a_pos");
  const uniforms = {
    tex: gl.getUniformLocation(prog, "u_tex"),
    color: gl.getUniformLocation(prog, "u_color"),
    alpha: gl.getUniformLocation(prog, "u_alpha"),
    offset: gl.getUniformLocation(prog, "u_offset")
  };

  function draw(inputTex, color, alpha, offset, res, buffer) {
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTex);
    gl.uniform1i(uniforms.tex, 0);
    gl.uniform4f(uniforms.color, color[0], color[1], color[2], color[3]);
    gl.uniform1f(uniforms.alpha, alpha);
    const offX = (offset?.[0] || 0) / res[0];
    const offY = (offset?.[1] || 0) / res[1];
    gl.uniform2f(uniforms.offset, offX, offY);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return { supported: true, draw };
}

function fontUrls(key) {
  return {
    json: `./assets/msdf/${key}.json`,
    image: `./assets/msdf/${key}.png`
  };
}

function createCardRenderer(gl) {
  let prog = null;
  let vs = null;
  let fs = null;
  try {
    vs = compile(gl, gl.VERTEX_SHADER, cardVertSrc);
    fs = compile(gl, gl.FRAGMENT_SHADER, cardFragSrc);
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog));
    }
  } catch (error) {
    console.warn("Card shader compile failed, skipping canvas card", error);
    return { supported: false };
  }

  const aPos = gl.getAttribLocation(prog, "a_pos");
  const uniforms = {
    res: gl.getUniformLocation(prog, "u_res"),
    box: gl.getUniformLocation(prog, "u_box"),
    radius: gl.getUniformLocation(prog, "u_radius"),
    borderWidth: gl.getUniformLocation(prog, "u_borderWidth"),
    fill: gl.getUniformLocation(prog, "u_fill"),
    border: gl.getUniformLocation(prog, "u_border"),
    shadowColor: gl.getUniformLocation(prog, "u_shadowColor"),
    shadowAlpha: gl.getUniformLocation(prog, "u_shadowAlpha"),
    shadowBlur: gl.getUniformLocation(prog, "u_shadowBlur"),
    shadowOffset: gl.getUniformLocation(prog, "u_shadowOffset"),
    blurAlpha: gl.getUniformLocation(prog, "u_blurAlpha"),
    tex: gl.getUniformLocation(prog, "u_tex")
  };

  function draw(res, state, buffer, blurTex) {
    if (!state?.visible || !state.box || !blurTex) return;
    gl.useProgram(prog);
    gl.uniform2f(uniforms.res, res[0], res[1]);
    gl.uniform4f(
      uniforms.box,
      state.box.x,
      state.box.y,
      state.box.width,
      state.box.height
    );
    gl.uniform1f(uniforms.radius, state.radius || 0);
    gl.uniform1f(uniforms.borderWidth, state.borderWidth || 0);
    const fill = state.fill || [0, 0, 0, 0];
    const border = state.border || [1, 1, 1, 0];
    gl.uniform4f(uniforms.fill, fill[0], fill[1], fill[2], fill[3]);
    gl.uniform4f(uniforms.border, border[0], border[1], border[2], border[3]);
    const shadowColor = state.shadowColor || [0, 0, 0, 1];
    gl.uniform4f(
      uniforms.shadowColor,
      shadowColor[0],
      shadowColor[1],
      shadowColor[2],
      shadowColor[3]
    );
    gl.uniform1f(uniforms.shadowAlpha, state.shadowAlpha ?? 0);
    gl.uniform1f(uniforms.shadowBlur, state.shadowBlur ?? 0);
    const shadowOffset = state.shadowOffset || [0, 0];
    gl.uniform2f(uniforms.shadowOffset, shadowOffset[0], shadowOffset[1]);
    gl.uniform1f(uniforms.blurAlpha, state.blurAlpha ?? 0.45);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, blurTex);
    gl.uniform1i(uniforms.tex, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return { supported: true, draw };
}

function createRenderer(canvas) {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, stencil: true });

  if (!gl) {
    return { supported: false };
  }

  const vs = compile(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog));
  }

  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]),
    gl.STATIC_DRAW
  );

  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    res: gl.getUniformLocation(prog, "u_res"),
    time: gl.getUniformLocation(prog, "u_time"),
    warm: gl.getUniformLocation(prog, "u_warm"),
    cool: gl.getUniformLocation(prog, "u_cool"),
    spark: gl.getUniformLocation(prog, "u_spark"),
    brightness: gl.getUniformLocation(prog, "u_brightness"),
    saturation: gl.getUniformLocation(prog, "u_saturation"),
    sparkPower: gl.getUniformLocation(prog, "u_sparkPower"),
    paletteMode: gl.getUniformLocation(prog, "u_paletteMode")
  };

  const presetToMode = {
    neonFlow: 1,
    electricIce: 2,
    hyperPop: 3,
    pinkHaze: 4,
    arcticVolt: 5,
    toxicWave: 6,
    neonSunset: 7
  };

  const GLASS_BLUR_SCALE = 7;
  const SHADOW_BLUR_SCALE = 3.6;

  const textRenderer = globalThis.NeonFlow.createMsdfRenderer?.(gl);
  const cardRenderer = createCardRenderer(gl);
  const blurRenderer = createBlurRenderer(gl);
  const glowRenderer = createGlowRenderer(gl);
  let bgTex = null;
  let bgFbo = null;
  let blurTexA = null;
  let blurFboA = null;
  let blurTexB = null;
  let blurFboB = null;
  let textTex = null;
  let textFbo = null;
  let glowTexA = null;
  let glowFboA = null;
  let glowTexB = null;
  let glowFboB = null;
  const cardState = {
    visible: false,
    box: null,
    radius: 0,
    borderWidth: 0,
    fill: [0, 0, 0, 0],
    border: [1, 1, 1, 0],
    blurAlpha: 0.4,
    shadowColor: [0, 0, 0, 1],
    shadowAlpha: 0,
    shadowBlur: 0,
    shadowOffset: [0, 0]
  };
  const glowState = {
    color: [1, 0.85, 1, 1],
    alpha: 0.6,
    shadowColor: [0, 0, 0, 1],
    shadowAlpha: 0.18,
    shadowOffset: [0, 6]
  };
  const textState = {
    text: "",
    fontKey: "inter",
    fontSize: 84,
    color: [1, 1, 1, 1],
    align: "left",
    maxWidth: 0,
    offsetX: 0,
    visible: true
  };
  const invertState = {
    enabled: false,
    color: [1, 1, 1, 1]
  };
  let textReady = false;
  let textUpdatePromise = null;
  let textErrorLogged = false;
  let glowDebugLogged = false;

  async function ensureFont(key) {
    if (!textRenderer?.supported) return false;
    if (textRenderer.hasFont(key)) return true;
    try {
      const urls = fontUrls(key);
      await textRenderer.loadFont(key, urls.json, urls.image);
      return true;
    } catch (error) {
      if (!textErrorLogged) {
        console.warn("MSDF font load failed, falling back to HTML text", error);
        textErrorLogged = true;
      }
      return false;
    }
  }

  async function updateTextLayout() {
    if (!textRenderer?.supported) return false;
    const ok = await ensureFont(textState.fontKey);
    if (!ok) {
      textReady = false;
      return false;
    }
    textRenderer.setVisible(textState.visible);
    textRenderer.setText({
      text: textState.text,
      fontKey: textState.fontKey,
      fontSize: textState.fontSize,
      color: textState.color,
      align: textState.align,
      maxWidth: textState.maxWidth,
      offsetX: textState.offsetX || 0,
      box: textState.box,
      res: [canvas.width, canvas.height]
    });
    textReady = true;
    return true;
  }

  async function measureTextState(options) {
    if (!textRenderer?.supported) return null;
    const ok = await ensureFont(options.fontKey);
    if (!ok) return null;
    if (typeof textRenderer.measureText !== "function") return null;
    return textRenderer.measureText(options);
  }

  function requestTextUpdate() {
    if (!textRenderer?.supported) return Promise.resolve(false);
    if (!textUpdatePromise) {
      textUpdatePromise = updateTextLayout().finally(() => {
        textUpdatePromise = null;
      });
    }
    return textUpdatePromise;
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    const needsGlow = glowRenderer?.supported && (!textFbo || !glowFboB);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      gl.viewport(0, 0, w, h);
      gl.useProgram(prog);
      gl.uniform2f(uniforms.res, w, h);
      if (blurRenderer?.supported) {
        bgTex = createEmptyTexture(gl, w, h);
        bgFbo = createFramebuffer(gl, bgTex);
        blurTexA = createEmptyTexture(gl, w, h);
        blurFboA = createFramebuffer(gl, blurTexA);
        blurTexB = createEmptyTexture(gl, w, h);
        blurFboB = createFramebuffer(gl, blurTexB);
      }
      if (glowRenderer?.supported) {
        textTex = createEmptyTexture(gl, w, h);
        textFbo = createFramebuffer(gl, textTex);
        glowTexA = createEmptyTexture(gl, w, h);
        glowFboA = createFramebuffer(gl, glowTexA);
        glowTexB = createEmptyTexture(gl, w, h);
        glowFboB = createFramebuffer(gl, glowTexB);
      }
      if (textRenderer?.supported) {
        requestTextUpdate();
      }
      return;
    }

    if (needsGlow) {
      textTex = createEmptyTexture(gl, w, h);
      textFbo = createFramebuffer(gl, textTex);
      glowTexA = createEmptyTexture(gl, w, h);
      glowFboA = createFramebuffer(gl, glowTexA);
      glowTexB = createEmptyTexture(gl, w, h);
      glowFboB = createFramebuffer(gl, glowTexB);
    }
  }

  function applyUniforms(state) {
    gl.useProgram(prog);
    gl.uniform3f(uniforms.warm, state.warm[0], state.warm[1], state.warm[2]);
    gl.uniform3f(uniforms.cool, state.cool[0], state.cool[1], state.cool[2]);
    gl.uniform3f(uniforms.spark, state.spark[0], state.spark[1], state.spark[2]);
    gl.uniform1f(uniforms.brightness, state.brightness);
    gl.uniform1f(uniforms.saturation, state.saturation);
    gl.uniform1f(uniforms.sparkPower, state.sparkPower);
    gl.uniform1f(uniforms.paletteMode, presetToMode[state.preset] || 0);
  }

  function setTextState(next) {
    Object.assign(textState, next);
    return requestTextUpdate();
  }

  function setCardState(next) {
    if (!next) {
      cardState.visible = false;
      cardState.box = null;
      return;
    }
    Object.assign(cardState, next);
  }

  function setTextVisible(visible) {
    textState.visible = Boolean(visible);
    return requestTextUpdate();
  }

  function setGlowState(next) {
    if (!next) return;
    if (Array.isArray(next.color) && next.color.length >= 4) {
      glowState.color = next.color.slice(0, 4);
    }
    if (typeof next.alpha === "number") {
      glowState.alpha = next.alpha;
    }
    if (Array.isArray(next.shadowColor) && next.shadowColor.length >= 4) {
      glowState.shadowColor = next.shadowColor.slice(0, 4);
    }
    if (typeof next.shadowAlpha === "number") {
      glowState.shadowAlpha = next.shadowAlpha;
    }
    if (Array.isArray(next.shadowOffset) && next.shadowOffset.length >= 2) {
      glowState.shadowOffset = next.shadowOffset.slice(0, 2);
    }
  }

  function setInvertState(next) {
    if (!next) return;
    if (typeof next.enabled === "boolean") {
      invertState.enabled = next.enabled;
    }
    if (Array.isArray(next.color) && next.color.length >= 4) {
      invertState.color = next.color.slice(0, 4);
    }
  }

  function renderGlassBlur(res, time, useCard) {
    if (!useCard || !blurRenderer?.supported || !bgFbo) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, bgFbo);
    gl.viewport(0, 0, res[0], res[1]);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(uniforms.time, time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    blurRenderer.draw(bgTex, blurFboA, [1, 0], res, buf, GLASS_BLUR_SCALE);
    blurRenderer.draw(blurTexA, blurFboB, [0, 1], res, buf, GLASS_BLUR_SCALE);
    blurRenderer.draw(blurTexB, blurFboA, [1, 0], res, buf, GLASS_BLUR_SCALE);
    blurRenderer.draw(blurTexA, blurFboB, [0, 1], res, buf, GLASS_BLUR_SCALE);
  }

  function renderBackground(res, time, useInvert) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, res[0], res[1]);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    if (useInvert) {
      gl.enable(gl.STENCIL_TEST);
      gl.stencilMask(0xFF);
      gl.clearColor(
        invertState.color[0],
        invertState.color[1],
        invertState.color[2],
        invertState.color[3]
      );
      gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

      gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
      gl.colorMask(false, false, false, false);
      textRenderer.drawMask([canvas.width, canvas.height]);
      gl.colorMask(true, true, true, true);

      gl.stencilFunc(gl.EQUAL, 1, 0xFF);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(uniforms.time, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disable(gl.STENCIL_TEST);
      return;
    }
    gl.uniform1f(uniforms.time, time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function renderCard(res, useCard) {
    if (!useCard || !blurRenderer?.supported || !blurTexB) return;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    cardRenderer.draw(res, cardState, buf, blurTexB);
    gl.disable(gl.BLEND);
  }

  function renderGlow(res, useGlow) {
    if (!useGlow) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, textFbo);
    gl.viewport(0, 0, res[0], res[1]);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    textRenderer.draw(res, [1, 1, 1, 1]);

    blurRenderer.draw(textTex, glowFboA, [1, 0], res, buf, SHADOW_BLUR_SCALE);
    blurRenderer.draw(glowTexA, glowFboB, [0, 1], res, buf, SHADOW_BLUR_SCALE);
    blurRenderer.draw(glowTexB, glowFboA, [1, 0], res, buf, SHADOW_BLUR_SCALE);
    blurRenderer.draw(glowTexA, glowFboB, [0, 1], res, buf, SHADOW_BLUR_SCALE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, res[0], res[1]);
    if (glowState.shadowAlpha > 0) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      glowRenderer.draw(
        glowTexB,
        glowState.shadowColor,
        glowState.shadowAlpha,
        glowState.shadowOffset,
        res,
        buf
      );
      gl.disable(gl.BLEND);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    glowRenderer.draw(glowTexB, glowState.color, glowState.alpha, [0, 0], res, buf);
    gl.disable(gl.BLEND);
  }

  function start() {
    const startTime = performance.now();

    function frame(now) {
      resize();
      const res = [canvas.width, canvas.height];
      const time = (now - startTime) / 1000;
      const useInvert = invertState.enabled && textRenderer?.supported && textReady;
      const useCard = !invertState.enabled && cardRenderer?.supported && cardState.visible && cardState.box;
      const useGlow = !invertState.enabled
        && textRenderer?.supported
        && textReady
        && textState.visible
        && glowRenderer?.supported
        && textFbo
        && glowFboB
        && blurRenderer?.supported;
      if (!useGlow && !glowDebugLogged) {
        console.log("Glow disabled", {
          invert: invertState.enabled,
          textSupported: Boolean(textRenderer?.supported),
          textReady,
          textVisible: textState.visible,
          glowSupported: Boolean(glowRenderer?.supported),
          hasTextFbo: Boolean(textFbo),
          hasGlowFbo: Boolean(glowFboB),
          blurSupported: Boolean(blurRenderer?.supported)
        });
        glowDebugLogged = true;
      }

      renderGlassBlur(res, time, useCard);
      renderBackground(res, time, useInvert);
      renderCard(res, useCard);
      renderGlow(res, useGlow);
      if (textRenderer?.supported && textReady) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        textRenderer.draw(res, textState.color);
        gl.disable(gl.BLEND);
      }
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  return {
    supported: true,
    applyUniforms,
    measureTextState,
    setTextState,
    setCardState,
    setTextVisible,
    setInvertState,
    setGlowState,
    isCardSupported: () => Boolean(cardRenderer?.supported),
    isTextReady: () => textReady,
    start
  };
}

globalThis.NeonFlow = globalThis.NeonFlow || {};
globalThis.NeonFlow.createRenderer = createRenderer;
})();
