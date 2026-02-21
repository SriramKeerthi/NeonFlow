(() => {
const vertSrc = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const fragSrc = `
  precision highp float;
  varying vec2 v_uv;
  uniform vec2 u_res;
  uniform float u_time;

  uniform vec3 u_warm;
  uniform vec3 u_cool;
  uniform vec3 u_spark;
  uniform float u_brightness;
  uniform float u_saturation;
  uniform float u_sparkPower;
  uniform float u_paletteMode;

  float hash(vec2 p){
    p = fract(p * vec2(123.34,456.21));
    p += dot(p,p+45.32);
    return fract(p.x*p.y);
  }

  float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i+vec2(1.,0.));
    float c = hash(i+vec2(0.,1.));
    float d = hash(i+vec2(1.,1.));
    vec2 u = f*f*(3.-2.*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
  }

  float fbm(vec2 p){
    float v=0.;
    float a=.5;
    mat2 m=mat2(1.6,1.2,-1.2,1.6);
    for(int i=0;i<5;i++){
      v+=a*noise(p);
      p=m*p;
      a*=.5;
    }
    return v;
  }

  vec3 neonSpectrum(float t){
    vec3 col = vec3(
      0.6 + 0.6*cos(6.28318*(t+0.00)),
      0.5 + 0.5*cos(6.28318*(t+0.33)),
      0.6 + 0.6*cos(6.28318*(t+0.67))
    );
    col = pow(max(col, 0.0), vec3(0.75));
    col *= 1.25;
    return col;
  }

  vec3 saturate(vec3 c, float s){
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(l), c, s);
  }

  float max3(vec3 v){
    return max(v.x, max(v.y, v.z));
  }

  float min3(vec3 v){
    return min(v.x, min(v.y, v.z));
  }

  void main(){
    vec2 uv = v_uv;
    vec2 p = uv*2.0-1.0;
    p.x *= u_res.x/u_res.y;

    float t = u_time*0.085;

    float baseScale = 0.75;
    float warpScale = 1.10;

    vec2 q = vec2(
      fbm(p*baseScale + vec2(0., t*1.1)),
      fbm(p*baseScale + vec2(4.2, t*1.0))
    );

    vec2 r = vec2(
      fbm(p*warpScale + 2.2*q + vec2(1.7,-9.2)+t*0.65),
      fbm(p*warpScale + 2.2*q + vec2(8.3, 2.8)-t*0.70)
    );

    float f = fbm(p*1.1 + 2.6*r);

    float cells = smoothstep(0.10, 0.98, f);

    float ridges = 1.0 - abs(2.0*f - 1.0);
    ridges = smoothstep(0.10, 0.95, ridges);
    ridges = pow(ridges, 2.0);

    vec2 flow = vec2(
      fbm(p*1.25 + r*1.45 + vec2(t*0.95, -t*0.60)) - 0.5,
      fbm(p*1.25 + r*1.45 + vec2(-t*0.72, t*0.85)) - 0.5
    );

    vec2 adv = p + 1.10*r + 0.95*q + 1.45*flow;
    float hueDrift = fbm(adv*0.72 + vec2(t*0.42, -t*0.50));

    float band = (adv.x*0.42 + adv.y*-0.20) + f*0.90 + hueDrift*0.80 + t*0.34;
    vec3 base = neonSpectrum(band);

    float sweep = adv.x + 0.35*sin(t*0.90 + adv.y*1.55);
    float lr = smoothstep(-1.15, 1.15, sweep);

    float paletteMode = floor(u_paletteMode + 0.5);
    bool isNeonFlow = abs(paletteMode - 1.0) < 0.5;
    bool isElectricIce = abs(paletteMode - 2.0) < 0.5;
    bool isHyperPop = abs(paletteMode - 3.0) < 0.5;
    bool isPinkHaze = abs(paletteMode - 4.0) < 0.5;
    bool isArcticVolt = abs(paletteMode - 5.0) < 0.5;
    bool isToxicWave = abs(paletteMode - 6.0) < 0.5;
    bool isNeonSunset = abs(paletteMode - 7.0) < 0.5;

    float neonMode = isNeonFlow ? 1.0 : 0.0;
    float pinkMode = isPinkHaze ? 1.0 : 0.0;

    float paletteBlend = smoothstep(-0.75, 0.75, sweep + 0.22*sin(adv.y*1.35 + t*0.45));

    vec3 warm = clamp(u_warm, 0.0, 3.0);
    vec3 cool = clamp(u_cool, 0.0, 3.0);

    if (isNeonSunset) {
      float bandLegacy = (p.x*0.28 + p.y*-0.08) + f*0.90;
      vec3 baseLegacy = neonSpectrum(bandLegacy);
      float lrLegacy = smoothstep(-1.15, 1.15, p.x);
      vec3 tempLegacy = mix(warm, cool, lrLegacy);
      vec3 colLegacy = tempLegacy * 0.62 + baseLegacy * 0.95;

      float glowLegacy = 0.72*cells + 1.95*ridges;
      float hotLegacy = pow(clamp(fbm(p*2.0 + r*1.6 + t), 0.0, 1.0), 4.0);
      vec3 sparksLegacy = clamp(u_spark, 0.0, 3.0) * hotLegacy * (1.2 * u_sparkPower);

      vec3 outLegacy = colLegacy * (0.66 + 1.12*glowLegacy) + sparksLegacy;
      outLegacy *= u_brightness;
      outLegacy = saturate(outLegacy, u_saturation);
      outLegacy = outLegacy / (outLegacy + vec3(0.70));
      outLegacy = pow(outLegacy, vec3(0.90));

      gl_FragColor = vec4(outLegacy, 1.0);
      return;
    }

    vec3 temp = mix(warm, cool, mix(lr, paletteBlend, neonMode));

    vec3 paletteBase = base;
    if (isNeonFlow) {
      vec3 warmSun = vec3(1.20, 0.18, 0.03);
      vec3 coolSun = vec3(0.04, 0.10, 1.25);
      vec3 amber = vec3(1.25, 0.42, 0.05);
      paletteBase = mix(warmSun, coolSun, paletteBlend);
      float ember = smoothstep(0.45, 0.95, fbm(adv*1.35 + vec2(t*0.35, -t*0.25)));
      paletteBase = mix(paletteBase, amber, 0.28*ember);
      base = mix(base, paletteBase, 0.92);
    } else if (isElectricIce) {
      vec3 iceA = vec3(0.03, 0.80, 1.22);
      vec3 iceB = vec3(0.00, 0.30, 1.55);
      paletteBase = mix(iceA, iceB, paletteBlend);
      base = mix(base * vec3(0.65, 0.95, 1.15), paletteBase, 0.84);
    } else if (isHyperPop) {
      vec3 popA = vec3(1.28, 0.10, 0.70);
      vec3 popB = vec3(0.45, 0.04, 1.45);
      paletteBase = mix(popA, popB, paletteBlend);
      base = mix(base * vec3(1.10, 0.80, 1.10), paletteBase, 0.78);
    } else if (isPinkHaze) {
      vec3 sunA = vec3(1.66, 0.88, 0.02);
      vec3 sunB = vec3(1.36, 0.48, 0.01);
      vec3 gold = vec3(1.82, 1.36, 0.02);
      paletteBase = mix(sunA, sunB, paletteBlend);
      paletteBase = mix(paletteBase, gold, smoothstep(0.55, 0.95, cells));
      base = mix(base * vec3(0.55, 0.42, 0.02), paletteBase, 0.98);
    } else if (isArcticVolt) {
      vec3 arcticA = vec3(0.02, 1.05, 1.30);
      vec3 arcticB = vec3(0.03, 0.38, 1.65);
      paletteBase = mix(arcticA, arcticB, paletteBlend);
      base = mix(base * vec3(0.52, 1.00, 1.18), paletteBase, 0.86);
    } else if (isToxicWave) {
      vec3 toxA = vec3(0.55, 1.42, 0.05);
      vec3 toxB = vec3(0.03, 0.72, 0.18);
      vec3 lime = vec3(1.38, 1.72, 0.08);
      paletteBase = mix(toxA, toxB, paletteBlend);
      paletteBase = mix(paletteBase, lime, smoothstep(0.48, 0.95, ridges));
      base = mix(base * vec3(0.64, 1.06, 0.52), paletteBase, 0.86);
    }

    vec3 col = mix(temp * 0.62 + base * 0.95, temp * 1.06 + base * 0.22, neonMode);

    if (isPinkHaze) {
      vec3 pinkCol = temp * 1.22 + paletteBase * 0.26;
      col = mix(col, pinkCol, 0.96);
    }

    if (isNeonFlow) {
      float magenta = max(0.0, min(col.r, col.b) - col.g);
      col.r += 0.42 * magenta;
      col.g += 0.08 * magenta;
      col.b *= (1.0 - 0.42 * magenta);
    } else if (isPinkHaze) {
      float magenta = max(0.0, min(col.r, col.b) - col.g);
      col.r += 0.16 * magenta;
      col.g += 0.18 * magenta;
      col.b *= (1.0 - 0.90 * magenta);

      float yellowness = min(col.r, col.g) - col.b;
      if (yellowness > 0.0) {
        col.r += 0.05 * yellowness;
        col.g += 0.12 * yellowness;
      }

      col.b = min(col.b, col.r * 0.08 + col.g * 0.04);
    }

    float glow = 0.72*cells + 1.95*ridges;

    float hot = pow(clamp(fbm(adv*1.75 + r*1.35 + t), 0.0, 1.0), 4.0);

    vec3 sparks = clamp(u_spark, 0.0, 3.0) * hot * (1.2 * u_sparkPower);

    vec3 outCol = col * (0.62 + 1.00*glow) + sparks;
    outCol = max(outCol, vec3(0.0));

    outCol = outCol / (vec3(1.0) + 0.55 * outCol);

    float luma = dot(outCol, vec3(0.2126, 0.7152, 0.0722));
    float chroma = max3(outCol) - min3(outCol);
    float targetChroma = mix(0.24, 0.14, smoothstep(0.35, 1.0, luma));
    float chromaBoost = max(0.0, targetChroma - chroma);

    vec3 vivid = saturate(outCol, 1.20 + chromaBoost * 2.4);
    float vividMix = mix(0.72, 0.86, neonMode);
    outCol = mix(outCol, vivid, vividMix);

    float darkBoost = 1.0 - smoothstep(0.06, 0.42, luma);
    vec3 tintDir = normalize(outCol + vec3(0.0005));
    outCol += tintDir * (0.028 * darkBoost);

    outCol *= u_brightness;
    outCol = saturate(outCol, max(1.08, u_saturation) + 0.12 * neonMode + 0.08 * pinkMode);

    outCol = (outCol * (2.51 * outCol + 0.03)) / (outCol * (2.43 * outCol + 0.59) + 0.14);
    outCol = clamp(outCol, 0.0, 1.0);
    outCol = pow(outCol, vec3(0.94));

    gl_FragColor = vec4(outCol, 1.0);
  }
`;

globalThis.NeonFlow = globalThis.NeonFlow || {};
globalThis.NeonFlow.shaders = { vertSrc, fragSrc };
})();
