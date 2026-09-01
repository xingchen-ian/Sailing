import * as THREE from 'three';
import { DEG2RAD } from '../utils/math.js';

/**
 * WakeSystem — 船尾尾迹与运动反馈
 *
 * 提供三种视觉信号让玩家感知船在运动：
 * 1. V 型尾迹（wake）—— 船后扩散的 V 形白色水痕，越快越宽越亮
 * 2. 泡沫粒子（foam particles）—— 沿航迹散布的白色粒子，模拟水面泡沫
 * 3. 船首浪花（bow splash）—— 高速时船头的小浪花
 */
export class WakeSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.maxWakePoints = 80;   // V 型尾迹段数
    this.maxParticles = 400;   // 泡沫粒子上限
    this.wakeWidth = 0;        // 当前尾迹宽度（随速度变化）
    this.wakeLength = 40;      // 尾迹总长度（米）

    // 海浪高度采样器：把尾迹/泡沫贴在水面上方，避免被水面 mesh 深度剔除
    this.getWaveHeight = options.getWaveHeight || (() => 0);

    // ---- 尾迹历史点 ----
    this.wakeHistory = [];     // [{x, z, speed, heading}]
    this._recordCounter = 0;
    this._lastRecordPos = null; // 按距离记录：上次写入尾迹点的世界位置

    this._createWakeMesh();
    this._createParticleSystems();
    this._createBowSplash();
    this._createWaterlineFoam(); // 船体水线泡沫（增强相对运动感）
  }

  // ===== V 型尾迹网格 =====
  _createWakeMesh() {
    // 动态三角形带：每帧重建几何体
    const geo = new THREE.BufferGeometry();

    // 顶点：每个历史点左右各一个 + 下一个点左右各一个 → 4 verts per segment
    const maxVerts = this.maxWakePoints * 4;
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxVerts * 3), 3));
    geo.setAttribute('alpha',   new THREE.BufferAttribute(new Float32Array(maxVerts), 1));
    geo.setDrawRange(0, 0);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#e8f4fc') },
      },
      vertexShader: /* glsl */ `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(uColor, vAlpha * 0.92);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    this.wakeMesh = new THREE.Mesh(geo, mat);
    this.wakeMesh.renderOrder = 2;
    // 顶点每帧手动更新但包围球不会自动重算（初始全零 → 半径0在原点），
    // 船驶离原点后会被视锥剔除 → 整条尾迹消失。关闭剔除。
    this.wakeMesh.frustumCulled = false;
    this.scene.add(this.wakeMesh);
  }

  // ===== 泡沫粒子系统 =====
  _createParticleSystems() {
    // 泡沫粒子
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.maxParticles * 3), 3));
    pGeo.setAttribute('size',    new THREE.BufferAttribute(new Float32Array(this.maxParticles), 1));
    pGeo.setAttribute('life',    new THREE.BufferAttribute(new Float32Array(this.maxParticles), 1));
    pGeo.setDrawRange(0, 0);

    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#e8f4fc') }, // 与海面泡沫同色
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float life;
        varying float vLife;
        void main() {
          vLife = life;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (220.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vLife;

        // 方块像素风格 —— 硬边缘方形粒子，与海面方形噪点统一
        void main() {
          // 用 Chebyshev 距离（∞范数）代替欧氏距离 → 正方形
          vec2 p = gl_PointCoord - 0.5;
          float d = max(abs(p.x), abs(p.y)) * 2.0;
          if (d > 1.0) discard; // 硬裁剪为正方形

          // 方形内亮度变化：中心亮、边缘略暗，模拟像素块感
          float bright = 1.0 - d * 0.3;
          // 每个方块内部加一点随机噪点打破均匀
          float noise = fract(sin(dot(gl_PointCoord * 20.0 + vLife, vec2(12.9898,78.233))) * 43758.5453);

          float alpha = (0.85 + 0.15 * noise) * bright * vLife;
          gl_FragColor = vec4(uColor, alpha * 0.95);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.particles = new THREE.Points(pGeo, pMat);
    this.particles.renderOrder = 3;
    // 同 wakeMesh：顶点手动更新、包围球不重算 → 关闭剔除，否则船远离原点后泡沫全消失
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);

    // 粒子数据：{x, y, z, vx, vy, vz, life, maxLife, size}
    this.particlePool = [];
  }

  // ===== 船首浪花 =====
  _createBowSplash() {
    // 简单的半透明面片放在船头位置
    const geo = new THREE.PlaneGeometry(2.5, 1.2);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uIntensity;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 pos = position;
          // 轻微起伏动画
          pos.y += sin(pos.x * 4.0 + uTime * 8.0) * 0.15 * uIntensity;
          pos.z += sin(pos.y * 3.0 + uTime * 6.0) * 0.1 * uIntensity;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float alpha = (1.0 - smoothstep(0.2, 1.0, d)) * uIntensity * 0.45;
          vec3 col = mix(vec3(0.85, 0.95, 1.0), vec3(1.0), 1.0 - d);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.bowSplash = new THREE.Mesh(geo, mat);
    this.bowSplash.renderOrder = 3;
    this.bowSplash.visible = false;
    this.scene.add(this.bowSplash);
  }

  // ===== 船体水线泡沫环 =====
  // 沿船体轮廓的一圈白色泡沫，速度越快越大越亮
  // 这是"看出船在动"最直接的视觉信号——船和水面的交界处有动态泡沫
  _createWaterlineFoam() {
    const geo = new THREE.RingGeometry(0.9, 2.6, 32);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 p = position;
          // 微弱抖动模拟泡沫翻滚
          float angle = atan(p.z, p.x);
          float r = length(p.xz);
          p.y += sin(angle * 12.0 + uTime * 8.0) * 0.04;
          p.x += sin(angle * 8.0 + uTime * 6.0) * 0.03;
          p.z += cos(angle * 10.0 - uTime * 7.0) * 0.03;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uIntensity;
        uniform float uTime;

        // 方块像素风格水线泡沫 —— 与海面方形噪点 + 泡沫粒子统一
        void main() {
          // 把环坐标转为极坐标，再映射到网格
          float r = length(vUv - 0.5) * 2.0;
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);

          // 环形区域（内径到外径之间）
          float ringEdge = 1.0 - smoothstep(0.25, 1.0, r);

          // 网格化：沿角度和半径方向做离散块
          vec2 gridUV = vec2(angle * 6.0, r * 12.0 + uTime * 1.5);
          vec2 cellId = floor(gridUV);
          vec2 cellFrac = fract(gridUV);

          // 每个格子独立随机亮灭，模拟方块像素泡沫
          float cellHash = fract(sin(dot(cellId + uTime * 0.15, vec2(127.1, 311.7))) * 43758.5453);

          // 只在部分格子里显示（约 55% 密度）
          float cellOn = step(0.45, cellHash);

          // 方形格子内部亮度（中心略亮）
          float bright = 0.7 + 0.3 * (1.0 - max(abs(cellFrac.x-0.5), abs(cellFrac.y-0.5)) * 2.0);

          vec3 col = mix(vec3(0.80, 0.94, 1.0), vec3(1.0), cellHash * 0.35);
          float alpha = ringEdge * cellOn * bright * uIntensity * 0.92;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.waterlineFoam = new THREE.Mesh(geo, mat);
    this.waterlineFoam.renderOrder = 2;
    this.waterlineFoam.visible = false;
    this.scene.add(this.waterlineFoam);
  }

  /**
   * 每帧调用
   * @param {Object} boatState - { position: {x,z}, speed, heading }
   * @param {number} dt - 帧间隔秒
   */
  update(boatState, dt) {
    const { position, speed, heading } = boatState;

    // 记录尾迹点：按「行驶距离」而非帧数，航迹长度稳定可见（约 80×1.2≈96 单位）
    if (speed > 0.15) {
      const dx = position.x - (this._lastRecordPos?.x ?? Infinity);
      const dz = position.z - (this._lastRecordPos?.z ?? Infinity);
      const moved = Math.hypot(dx, dz);
      if (moved > 1.2 || this._lastRecordPos === null) {
        this.wakeHistory.push({
          x: position.x,
          z: position.z,
          speed: Math.min(speed, 20),
          heading,
        });
        // 保留最近 N 个点
        while (this.wakeHistory.length > this.maxWakePoints) {
          this.wakeHistory.shift();
        }
        this._lastRecordPos = { x: position.x, z: position.z };

        // 在船两侧生成泡沫粒子（按帧率节奏，避免一帧爆量）
        this._recordCounter++;
        if (this._recordCounter % 2 === 0 && speed > 0.5) {
          this._emitFoamParticles(position, heading, speed);
        }
      }
    } else {
      // 几乎静止时不记录，但保留最后位置以便恢复航行后连续
      this._lastRecordPos = null;
    }

    // 更新 V 型尾迹几何体
    this._updateWakeGeometry();

    // 更新泡沫粒子
    this._updateParticles(dt);

    // 更新船首浪花
    this._updateBowSplash(position, heading, speed, dt);

    // 更新船体水线泡沫环
    this._updateWaterlineFoam(position, heading, speed, dt);

    // 尾迹宽度由速度决定（低速也有明显宽度）
    this.wakeWidth = Math.min(speed * 0.7 + 1.4, 12);
  }

  // ---- 发射泡沫粒子 ----
  _emitFoamParticles(pos, heading, speed) {
    const count = Math.floor(speed * 0.6) + 2; // 速度越快粒子越多
    const emitPerSide = Math.min(count, 6);     // 每侧最多 6 个

    for (let i = 0; i < emitPerSide; i++) {
      for (let side of [-1, 1]) {
        if (this.particlePool.length >= this.maxParticles) return;

        // 船尾后方偏侧向发射
        const backDist = 2.5 + Math.random() * 2.0;
        const sideDist = side * (1.5 + Math.random() * this.wakeWidth * 0.5);
        const rad = (heading - 90) * DEG2RAD; // 转为数学角（-Z 方向为 0°）

        const px = pos.x - Math.cos(rad) * backDist + Math.cos(rad + Math.PI / 2) * sideDist;
        const pz = pos.z + Math.sin(rad) * backDist + Math.sin(rad + Math.PI / 2) * sideDist;

        this.particlePool.push({
          x: px, y: this.getWaveHeight(px, pz) + 0.35, z: pz,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.2) * 0.4,
          vz: (Math.random() - 0.5) * 0.6,
          life: 1.0,
          maxLife: 1.8 + Math.random() * 2.5, // 存活 1.8~4.3 秒
          size: 1.4 + Math.random() * 1.8 + speed * 0.15,
        });
      }
    }
  }

  // ---- 更新 V 型尾迹几何体 ----
  _updateWakeGeometry() {
    const hist = this.wakeHistory;
    if (hist.length < 2) {
      this.wakeMesh.geometry.setDrawRange(0, 0);
      return;
    }

    const posArr = this.wakeMesh.geometry.attributes.position.array;
    const alphaArr = this.wakeMesh.geometry.attributes.alpha.array;
    let idx = 0;

    for (let i = 0; i < hist.length - 1; i++) {
      const curr = hist[i];
      const next = hist[i + 1];

      // 从最新到最旧：透明度递减
      const t = i / (hist.length - 1);
      const alpha = (1.0 - t) * (1.0 - t); // 二次衰减——近处亮远处淡

      // 该点的宽度：速度越宽，远处收窄
      const w = this.wakeWidth * (1.0 - t * 0.6) * (0.5 + curr.speed * 0.05);

      // V 型展开角度（约 ±35~55°）
      const spreadAngle = (30 + curr.speed * 1.5) * DEG2RAD;
      const rad = (curr.heading - 90) * DEG2RAD;

      // 左右两个端点
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);
      const cosS = Math.cos(spreadAngle);
      const sinS = Math.sin(spreadAngle);

      // 左点（-side）
      const lx = curr.x + (cosR * cosS - sinR * sinS) * w;
      const lz = curr.z + (sinR * cosS + cosR * sinS) * w;
      // 右点（+side）
      const rx = curr.x + (cosR * cosS + sinR * sinS) * w;
      const rz = curr.z + (sinR * cosS - cosR * sinS) * w;

      // 当前段的 4 个顶点（两个三角组成四边形）
      // 左当前、右当前、左下一个、右下一个 —— y 贴在海浪高度上方，避免被水面剔除
      posArr[idx * 3]     = lx;
      posArr[idx * 3 + 1] = this.getWaveHeight(lx, lz) + 0.35;
      posArr[idx * 3 + 2] = lz;
      alphaArr[idx]       = alpha;
      idx++;

      posArr[idx * 3]     = rx;
      posArr[idx * 3 + 1] = this.getWaveHeight(rx, rz) + 0.35;
      posArr[idx * 3 + 2] = rz;
      alphaArr[idx]       = alpha;
      idx++;

      // 下一段的左右点
      const nextW = this.wakeWidth * (1.0 - ((i + 1) / (hist.length - 1)) * 0.6) * (0.5 + next.speed * 0.05);
      const nextSpread = (30 + next.speed * 1.5) * DEG2RAD;
      const nextRad = (next.heading - 90) * DEG2RAD;
      const ncosR = Math.cos(nextRad);
      const nsinR = Math.sin(nextRad);
      const ncosS = Math.cos(nextSpread);
      const nsinS = Math.sin(nextSpread);

      const nlx = next.x + (ncosR * ncosS - nsinR * nsinS) * nextW;
      const nlz = next.z + (nsinR * ncosS + ncosR * nsinS) * nextW;
      const nrx = next.x + (ncosR * ncosS + nsinR * nsinS) * nextW;
      const nrz = next.z + (nsinR * ncosS - ncosR * nsinS) * nextW;

      posArr[idx * 3]     = nlx;
      posArr[idx * 3 + 1] = this.getWaveHeight(nlx, nlz) + 0.35;
      posArr[idx * 3 + 2] = nlz;
      alphaArr[idx]       = alpha * 0.85;
      idx++;

      posArr[idx * 3]     = nrx;
      posArr[idx * 3 + 1] = this.getWaveHeight(nrx, nrz) + 0.35;
      posArr[idx * 3 + 2] = nrz;
      alphaArr[idx]       = alpha * 0.85;
      idx++;
    }

    this.wakeMesh.geometry.attributes.position.needsUpdate = true;
    this.wakeMesh.geometry.attributes.alpha.needsUpdate = true;
    this.wakeMesh.geometry.setDrawRange(0, idx);
  }

  // ---- 更新泡沫粒子 ----
  _updateParticles(dt) {
    // 更新存活粒子
    for (let i = this.particlePool.length - 1; i >= 0; i--) {
      const p = this.particlePool[i];
      p.life -= dt / p.maxLife;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 0.15 * dt; // 微重力下沉

      if (p.life <= 0 || p.y < -0.3) {
        this.particlePool.splice(i, 1);
      }
    }

    // 写入 GPU buffer
    const posArr = this.particles.geometry.attributes.position.array;
    const sizeArr = this.particles.geometry.attributes.size.array;
    const lifeArr = this.particles.geometry.attributes.life.array;

    for (let i = 0; i < this.particlePool.length; i++) {
      const p = this.particlePool[i];
      const j = i * 3;
      posArr[j]     = p.x;
      posArr[j + 1] = p.y;
      posArr[j + 2] = p.z;
      sizeArr[i]    = p.size * p.life; // 随生命值缩小
      lifeArr[i]    = Math.max(p.life, 0);
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.size.needsUpdate = true;
    this.particles.geometry.attributes.life.needsUpdate = true;
    this.particles.geometry.setDrawRange(0, this.particlePool.length);
  }

  // ---- 更新船首浪花 ----
  _updateBowSplash(pos, heading, speed, dt) {
    const minSpeed = 2.0; // 最低速度才显示（降低门槛）
    if (speed < minSpeed) {
      this.bowSplash.visible = false;
      return;
    }

    this.bowSplash.visible = true;
    const intensity = Math.min((speed - minSpeed) / 8.0, 1.0); // 3kn→0, 11kn→1
    this.bowSplash.material.uniforms.uIntensity.value = intensity;
    this.bowSplash.material.uniforms.uTime.value += dt;

    // 放在船头前方
    const rad = (heading - 90) * DEG2RAD;
    const fwd = 3.0; // 船头前方距离
    const bx = pos.x + Math.cos(rad) * fwd;
    const bz = pos.z - Math.sin(rad) * fwd;
    this.bowSplash.position.set(
      bx,
      this.getWaveHeight(bx, bz) + 0.3,
      bz
    );
    this.bowSplash.rotation.y = -rad;
  }

  // ---- 更新船体水线泡沫环 ----
  _updateWaterlineFoam(pos, heading, speed, dt) {
    if (speed < 0.4) {
      this.waterlineFoam.visible = false;
      return;
    }

    this.waterlineFoam.visible = true;
    // 泡沫强度：0.4kn 起就明显，6kn+ 饱和（比之前更早可见、更亮）
    const intensity = Math.min(0.35 + speed / 6.0, 1.0);
    this.waterlineFoam.material.uniforms.uIntensity.value = intensity;
    this.waterlineFoam.material.uniforms.uTime.value += dt;

    // 环大小随速度变化
    const baseScale = 1.0 + speed * 0.08;
    this.waterlineFoam.scale.setScalar(baseScale);

    // 放在船体位置（贴水面，抬到网格插值误差之上，避免被水面遮挡）
    const waveY = this.getWaveHeight(pos.x, pos.z) + 0.3;
    this.waterlineFoam.position.set(pos.x, waveY, pos.z);
    this.waterlineFoam.rotation.y = -heading * DEG2RAD + Math.PI / 2; // 对齐航向
  }

  /** 清空所有尾迹和粒子 */
  clear() {
    this.wakeHistory = [];
    this.particlePool = [];
    this.wakeMesh.geometry.setDrawRange(0, 0);
    this.particles.geometry.setDrawRange(0, 0);
    this.bowSplash.visible = false;
    this.waterlineFoam.visible = false;
  }

  dispose() {
    this.scene.remove(this.wakeMesh);
    this.scene.remove(this.particles);
    this.scene.remove(this.bowSplash);
    this.scene.remove(this.waterlineFoam);
    this.wakeMesh.geometry.dispose();
    this.wakeMesh.material.dispose();
    this.particles.geometry.dispose();
    this.particles.material.dispose();
    this.bowSplash.geometry.dispose();
    this.bowSplash.material.dispose();
    this.waterlineFoam.geometry.dispose();
    this.waterlineFoam.material.dispose();
  }
}
