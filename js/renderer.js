(() => {
const { vertSrc, fragSrc } = globalThis.NeonFlow.shaders;

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

function createRenderer(canvas) {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });

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
    toxicWave: 6
  };

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uniforms.res, w, h);
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

  function start() {
    const startTime = performance.now();

    function frame(now) {
      resize();
      gl.uniform1f(uniforms.time, (now - startTime) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  return { supported: true, applyUniforms, start };
}

globalThis.NeonFlow = globalThis.NeonFlow || {};
globalThis.NeonFlow.createRenderer = createRenderer;
})();
