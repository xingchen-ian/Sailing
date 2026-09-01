import * as THREE from 'three';

/**
 * Target — 目标浮标（Buoy）
 *
 * 3D 浮标模型 + 浮动动画 + 距离/方位计算 + 到达判定。
 * 对应 Sailing.md Step 3：目标方向是可观察要素的第一项。
 */
export class Target {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'target-buoy';
    this.reached = false;
    this._floatSeed = Math.random() * Math.PI * 2;
    this.build();
  }

  build() {
    // 底座 —— 大且亮黄色，高对比
    const baseGeo = new THREE.CylinderGeometry(1.4, 1.7, 0.7, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xffdd00,
      roughness: 0.4,
      emissive: 0xaa8800,
      emissiveIntensity: 0.35,
    });
    this.base = new THREE.Mesh(baseGeo, baseMat);
    this.base.position.y = 0.4;
    this.group.add(this.base);

    // 白色反光环（底座顶部）
    const bandGeo = new THREE.CylinderGeometry(1.45, 1.45, 0.18, 16);
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      emissive: 0xaaaaaa,
      emissiveIntensity: 0.5,
    });
    this.band = new THREE.Mesh(bandGeo, bandMat);
    this.band.position.y = 0.8;
    this.group.add(this.band);

    // 杆 —— 高、白色，带旗杆
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 6.5, 10);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.2 });
    this.pole = new THREE.Mesh(poleGeo, poleMat);
    this.pole.position.y = 3.8;
    this.group.add(this.pole);

    // 顶部标记球 —— 亮绿色自发光
    const topGeo = new THREE.SphereGeometry(0.8, 16, 12);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x39ff5b,
      roughness: 0.3,
      emissive: 0x11cc33,
      emissiveIntensity: 0.6,
    });
    this.topMarker = new THREE.Mesh(topGeo, topMat);
    this.topMarker.position.y = 7.0;
    this.group.add(this.topMarker);

    // 顶部三角帆/旗帜 —— 红色高对比
    const flagShape = new THREE.Shape();
    flagShape.moveTo(0, 0);
    flagShape.lineTo(0, 1.2);
    flagShape.lineTo(1.6, 0.6);
    flagShape.lineTo(0, 0);
    const flagGeo = new THREE.ExtrudeGeometry(flagShape, { depth: 0.05, bevelEnabled: false });
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      roughness: 0.4,
      emissive: 0xaa1111,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
    });
    this.flag = new THREE.Mesh(flagGeo, flagMat);
    this.flag.position.set(0.1, 6.6, 0);
    this.flag.rotation.y = -Math.PI / 2;
    this.group.add(this.flag);

    // 远处可视标记：始终面向相机的发光精灵
    this._sprite = this._buildMarkerSprite();
    this._sprite.position.y = 9.5;
    this.group.add(this._sprite);

    // 垂直光柱（微弱，远距离也可识别）
    const beamGeo = new THREE.CylinderGeometry(0.25, 0.8, 14, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x44ee66,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.beam = new THREE.Mesh(beamGeo, beamMat);
    this.beam.position.y = 7.0;
    this.group.add(this.beam);

    // 光环 —— 到达提示区（亮绿色圆环，浮标周围地面）
    const ringGeo = new THREE.TorusGeometry(7.0, 0.35, 10, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x44ff66, roughness: 0.3, transparent: true, opacity: 0.45,
      emissive: 0x22cc44, emissiveIntensity: 0.4,
    });
    this.reachRing = new THREE.Mesh(ringGeo, ringMat);
    this.reachRing.rotation.x = -Math.PI / 2;
    this.reachRing.position.y = 0.05;
    this.group.add(this.reachRing);

    // 初始隐藏
    this.group.visible = false;
  }

  /** 构建一个发光的圆形 Sprite 纹理，用于远距离标记 */
  _buildMarkerSprite() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 外圈发光
    const grd = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2 - 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(68,255,102,0.85)');
    grd.addColorStop(0.6, 'rgba(68,255,102,0.25)');
    grd.addColorStop(1, 'rgba(68,255,102,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(5, 5, 1);
    return sprite;
  }

  /**
   * 在船周围随机生成目标
   * @param {THREE.Vector3} boatPos 船当前位置
   * @param {number} [minDist=180] 最小距离
   * @param {number} [maxDist=300] 最大距离
   */
  spawn(boatPos, minDist = 180, maxDist = 300) {
    const angle = Math.random() * Math.PI * 2;
    const dist = minDist + Math.random() * (maxDist - minDist);
    this.group.position.set(
      boatPos.x + Math.cos(angle) * dist,
      0,
      boatPos.z + Math.sin(angle) * dist
    );
    this.group.visible = true;
    this.reached = false;
    this._floatSeed = Math.random() * Math.PI * 2;
  }

  /**
   * 固定终点（关卡使用）：直接放置到世界坐标 (x, z)
   * @param {number} x
   * @param {number} z
   */
  setAt(x, z) {
    this.group.position.set(x, 0, z);
    this.group.visible = true;
    this.reached = false;
    this._floatSeed = Math.random() * Math.PI * 2;
  }

  /**
   * 浮动动画（正弦波上下浮动 + 轻微旋转闪烁）
   */
  update(dt, time) {
    if (!this.group.visible) return;
    const floatY = Math.sin(time * 1.5 + this._floatSeed) * 0.35;
    this.group.position.y = floatY;

    // 顶部标记和旗子轻微摆动
    this.topMarker.position.y = 7.0 + floatY * 0.3;
    this.flag.position.y = 6.6 + floatY * 0.3;
    this._sprite.position.y = 9.5 + floatY * 0.3;

    // 到达光环脉动
    const pulse = 1 + Math.sin(time * 2.5) * 0.15;
    this.reachRing.scale.setScalar(pulse);
    this.reachRing.material.opacity = 0.35 + Math.sin(time * 2.5) * 0.1;

    // 远处精灵标记呼吸闪烁
    const breathe = 1 + Math.sin(time * 3.0) * 0.15;
    this._sprite.scale.set(5 * breathe, 5 * breathe, 1);
  }

  /** 世界坐标 */
  getPosition() {
    return this.group.position.clone();
  }

  /** 到某点的 2D 距离（XZ平面） */
  distanceTo(pos) {
    const dx = this.group.position.x - pos.x;
    const dz = this.group.position.z - pos.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /** 从 pos 看目标的罗盘方位角（°），0=北 */
  bearingFrom(pos) {
    const dx = this.group.position.x - pos.x;
    const dz = this.group.position.z - pos.z;
    let deg = Math.atan2(dx, -dz) * (180 / Math.PI);
    if (deg < 0) deg += 360;
    return deg;
  }

  /** 是否到达（距离 < threshold） */
  checkReached(pos, threshold = 8.0) {
    if (this.reached || !this.group.visible) return false;
    if (this.distanceTo(pos) < threshold) {
      this.reached = true;
      return true;
    }
    return false;
  }

  /** 目标到达后的视觉反馈（闪烁后消失） */
  hideTarget() {
    this.group.visible = false;
    this.reached = true;
  }
}
