import * as THREE from 'three';

/**
 * Ocean — 海面（Gerstner 波 + 高频涟漪法线 + 运动感增强）
 *
 * 设计目标：让水面有丰富的视觉细节，使船的相对运动清晰可辨。
 * 关键手段：
 *   1) Gerstner 几何波（低频大波浪形）
 *   2) Fragment 高频涟漪法线（细碎表面纹理 —— 运动感核心）
 *   3) 宽覆盖太阳高光 + 菲涅尔反射
 *   4) 浪尖泛白 + 随机泡沫噪点
 *
 * 性能：128×128 网格，每顶点 8 次 trig（解析偏导法线）
 */
export class Ocean {
  constructor(scene, size = 2000) {
    this.scene = scene;
    this.size = size;
    this.time = 0;
    this.create();
  }

  create() {
    const geo = new THREE.PlaneGeometry(this.size, this.size, 128, 128);
    geo.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        // 颜色 —— 更亮更丰富，便于辨识细节
        uDeepColor:    { value: new THREE.Color('#053a5c') },
        uShallowColor: { value: new THREE.Color('#1490a8') },
        uFoamColor:    { value: new THREE.Color('#e0f4fc') },
        uSkyColor:     { value: new THREE.Color('#5599cc') },
        uSunDir:       { value: new THREE.Vector3(0.45, 0.65, 0.28).normalize() },
        uSunColor:     { value: new THREE.Color('#fff8e8') },
        // 波参数 —— 增大振幅让波浪几何更明显
        uWaveAmp:      { value: 1.6 },
        uWaveFreq:     { value: 0.10 },
        uWaveChop:     { value: 0.90 },
        uCameraPos:    { value: new THREE.Vector3(0, 10, 20) },
      },

      // ================================================================
      //  VERTEX SHADER — Gerstner 4 列波 + 解析偏导法线
      //  每列波 1 次 sin/cos，同时产出位移和 X/Z 切线偏导
      // ================================================================
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uWaveAmp;
        uniform float uWaveFreq;
        uniform float uWaveChop;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vHeight;

        void main() {
          vec2 pos = position.xz;

          vec3 disp = vec3(0.0);
          vec3 dT   = vec3(1.0, 0.0, 0.0);
          vec3 dB   = vec3(0.0, 0.0, 1.0);

          // ===== 波列 1：主涌浪（最长波长）=====
          {
            vec2 dir = normalize(vec2( 1.0,  0.25));
            float freq = uWaveFreq * 0.85;
            float amp  = uWaveAmp * 0.50;
            float phase = uTime * 0.65;
            float steep = uWaveChop;

            float phi = dot(dir, pos) * freq + phase;
            float c = cos(phi), s = sin(phi);
            float q = steep * 0.18;
            float qa = q * amp * freq * s;

            disp += vec3(-dir.x * q * amp * c, amp * c, -dir.y * q * amp * c);
            dT += vec3(dir.x*dir.x*qa, -dir.x*amp*freq*s, dir.x*dir.y*qa);
            dB += vec3(dir.x*dir.y*qa, -dir.y*amp*freq*s, dir.y*dir.y*qa);
          }

          // ===== 波列 2：横浪 =====
          {
            vec2 dir = normalize(vec2(-0.55,  1.0));
            float freq = uWaveFreq * 1.5;
            float amp  = uWaveAmp * 0.32;
            float phase = uTime * 0.95;
            float steep = uWaveChop;

            float phi = dot(dir, pos) * freq + phase;
            float c = cos(phi), s = sin(phi);
            float q = steep * 0.16;
            float qa = q * amp * freq * s;

            disp += vec3(-dir.x*q*amp*c, amp*c, -dir.y*q*amp*c);
            dT += vec3(dir.x*dir.x*qa, -dir.x*amp*freq*s, dir.x*dir.y*qa);
            dB += vec3(dir.x*dir.y*qa, -dir.y*amp*freq*s, dir.y*dir.y*qa);
          }

          // ===== 波列 3：中频波 =====
          {
            vec2 dir = normalize(vec2(-0.35, -0.75));
            float freq = uWaveFreq * 2.6;
            float amp  = uWaveAmp * 0.20;
            float phase = uTime * 1.25;
            float steep = uWaveChop * 0.7;

            float phi = dot(dir, pos) * freq + phase;
            float c = cos(phi), s = sin(phi);
            float q = steep * 0.14;
            float qa = q * amp * freq * s;

            disp += vec3(-dir.x*q*amp*c, amp*c, -dir.y*q*amp*c);
            dT += vec3(dir.x*dir.x*qa, -dir.x*amp*freq*s, dir.x*dir.y*qa);
            dB += vec3(dir.x*dir.y*qa, -dir.y*amp*freq*s, dir.y*dir.y*qa);
          }

          // ===== 波列 4：高频细碎波 =====
          {
            vec2 dir = normalize(vec2( 0.80, -0.45));
            float freq = uWaveFreq * 4.2;
            float amp  = uWaveAmp * 0.09;
            float phase = uTime * 1.70;
            float steep = uWaveChop * 0.45;

            float phi = dot(dir, pos) * freq + phase;
            float c = cos(phi), s = sin(phi);
            float q = steep * 0.12;
            float qa = q * amp * freq * s;

            disp += vec3(-dir.x*q*amp*c, amp*c, -dir.y*q*amp*c);
            dT += vec3(dir.x*dir.x*qa, -dir.x*amp*freq*s, dir.x*dir.y*qa);
            dB += vec3(dir.x*dir.y*qa, -dir.y*amp*freq*s, dir.y*dir.y*qa);
          }

          vec3 worldPos = position + disp;
          vWorldPos = worldPos;
          vHeight = worldPos.y;
          vNormal = normalize(cross(dB, dT));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
        }
      `,

      // ================================================================
      //  FRAGMENT SHADER — 高频涟漪法线 + 多层高光 + 泡沫
      //  这是"看出船在动"的核心：高频纹理提供可追踪的运动参照
      // ================================================================
      fragmentShader: /* glsl */ `
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uFoamColor;
        uniform vec3 uSkyColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uTime;
        uniform float uWaveAmp;
        uniform vec3 uCameraPos;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vHeight;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float hash21(float n) { return fract(sin(n) * 43758.5453); }

        // ---- 高频涟漪法线（多层叠加，产生可追踪的细碎波纹）----
        vec3 rippleNormal(vec2 uv, float t) {
          vec3 n = vec3(0.0, 1.0, 0.0);

          // 层 1：主涟漪（中等尺度）
          {
            float s1 = sin(uv.x * 18.0 + t * 2.2) * sin(uv.y * 14.0 - t * 1.8);
            float s2 = sin(uv.x * 11.0 - t * 1.5 + uv.y * 9.0);
            n.x += s1 * 0.06 + s2 * 0.04;
            n.z += sin(uv.x * 13.0 + uv.y * 17.0 + t * 2.0) * 0.05;
          }

          // 层 2：细碎毛细波（小尺度快速变化）
          {
            float f = 38.0;
            n.x += sin(uv.x * f + t * 4.5) * sin(uv.y * f * 0.8 - t * 3.8) * 0.02;
            n.z += cos(uv.x * f * 0.85 + uv.y * f + t * 4.0) * 0.02;
          }

          // 层 3：方向性波纹（模拟风吹过的痕迹）
          {
            vec2 windUV = uv + vec2(t * 0.3, t * 0.15);
            float w = sin(windUV.x * 7.0 + windUV.y * 3.0) * sin(windUV.y * 5.0);
            n.x += w * 0.03;
            n.z += w * 0.025;
          }

          return normalize(n);
        }

        void main() {
          vec2 uv = vWorldPos.xz * 0.06;  // 世界坐标→纹理坐标缩放

          // ---- 基础法线（来自顶点 Gerstner 波）+ 叠加高频涟漪 ----
          vec3 Ngeo = normalize(vNormal);
          vec3 Nrip = rippleNormal(uv, uTime);
          // 涟漪强度随距离衰减（远处不需要那么细）
          float distFactor = smoothstep(5.0, 150.0, length(vWorldPos.xz - uCameraPos.xz));
          vec3 N = normalize(mix(Ngeo, Nrip, 0.55 * distFactor));

          vec3 V = normalize(uCameraPos - vWorldPos);
          vec3 L = uSunDir;

          // ---- 菲涅尔（远反射近透射）----
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.5);

          // ---- 深度色（波峰亮/波谷暗）----
          float depthF = smoothstep(-uWaveAmp * 0.7, uWaveAmp * 1.1, vHeight);
          vec3 baseCol = mix(uDeepColor, uShallowColor, depthF);

          // ---- 微妙的位置色彩变化（打破均匀感）----
          float colVar = hash(floor(vWorldPos.xz * 0.08)) * 0.04 - 0.02;
          baseCol = clamp(baseCol + colVar, 0.0, 1.0);

          // ---- 反射混合 ----
          vec3 reflectCol = mix(baseCol, uSkyColor, fresnel * 0.60);

          // ---- 太阳高光（三层：锐利主高光 + 中等光晕 + 广角环境光斑）----
          vec3 H = normalize(L + V);
          float NdotH = max(dot(N, H), 0.0);

          reflectCol += uSunColor * pow(NdotH, 256.0) * 2.5;   // 锐利焦点
          reflectCol += uSunColor * pow(NdotH, 64.0)  * 0.40; // 中等光晕
          reflectCol += uSunColor * pow(NdotH, 12.0)  * 0.08; // 广角柔和光斑

          // ---- 浪尖泛白（基于高度阈值）----
          float foamThresh = uWaveAmp * 0.72;
          float foam = smoothstep(foamThresh, foamThresh + 0.5, vHeight);
          foam *= 0.6 + 0.4 * hash(vWorldPos.xz * 4.0);
          reflectCol = mix(reflectCol, uFoamColor, foam * 0.60);

          // ---- 表面随机泡沫噪点（始终存在少量白色斑点，增强纹理感）----
          float surfNoise = hash(floor(vWorldPos.xz * 2.5 + uTime * 0.1));
          if (surfNoise > 0.82 && vHeight > -uWaveAmp * 0.3) {
            float spotAlpha = (surfNoise - 0.82) / 0.18;
            spotAlpha *= smoothstep(300.0, 30.0, distFactor * 100.0); // 远处淡出
            reflectCol = mix(reflectCol, uFoamColor, spotAlpha * 0.22);
          }

          // ---- 次表面散射近似（逆光时水面透绿）----
          float sss = pow(max(dot(V, -L), 0.0), 4.0) * (1.0 - fresnel) * 0.15;
          reflectCol += vec3(0.04, 0.28, 0.22) * sss;

          // ---- 远处雾化 ----
          float fogDist = length(vWorldPos.xz - uCameraPos.xz);
          float fog = smoothstep(120.0, 900.0, fogDist);
          reflectCol = mix(reflectCol, uSkyColor * 0.55, fog * 0.50);

          gl_FragColor = vec4(reflectCol, 0.96);
        }
      `,

      transparent: true,
      side: THREE.FrontSide,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'ocean';
    this.scene.add(this.mesh);
  }

  /** 获取某 (x,z) 位置的海浪高度（与 vertex shader 参数一致） */
  getWaveHeight(x, z) {
    const t = this.time;
    const A = 1.6;  // 与 uWaveAmp 一致
    const F = 0.10; // 与 uWaveFreq 一致

    let h = 0;
    h += Math.cos((x * 1.0 + z * 0.25) * F * 0.85 + t * 0.65) * A * 0.50;
    h += Math.cos((-x * 0.55 + z * 1.0) * F * 1.5  + t * 0.95) * A * 0.32;
    h += Math.cos((-x * 0.35 - z * 0.75)* F * 2.6  + t * 1.25) * A * 0.20;
    h += Math.cos(( x * 0.80 - z * 0.45)* F * 4.2  + t * 1.70) * A * 0.09;

    return h;
  }

  update(dt, cameraPosition) {
    this.time += dt;
    this.material.uniforms.uTime.value = this.time;
    if (cameraPosition) {
      this.material.uniforms.uCameraPos.value.copy(cameraPosition);
    }
  }
}
