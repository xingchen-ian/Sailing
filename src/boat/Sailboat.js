import * as THREE from 'three';
import { GLTFLoader } from '../../assets/vendor/GLTFLoader.js';
import { DEG2RAD, normalizeDeg } from '../utils/math.js';

// GLB 船身配置：路径、绕 Y 轴旋转（让模型 X 轴 = 船长 → 世界 -Z = 船头）、
// 非均匀缩放（匹配现有帆船 rig 尺寸）、位置。
// wooden_hull.glb 由 Tripo 生成，原坐标系：X ∈ [-0.5, 0.5] 船长 1.0，
// Y ∈ [0, 0.3317] 高 0.3317（原点 = 船底），Z ∈ [-0.1754, 0.1754] 宽 0.351。
// 旋转后：模型 X（船长）→ 世界 -Z（船头）；模型 Z（宽）→ 世界 X；模型 Y（高）→ 世界 Y。
const HULL_GLTF_PATH = '../../assets/3d/wooden_hull.glb';
const HULL_ROT_Y = -Math.PI / 2;             // -90° 让船头朝 -Z（游戏船头方向）
const HULL_SCALE = new THREE.Vector3(5.000, 3.480, 4.000);  // 长 5.00 / 高 1.15 / 宽 1.40
const HULL_POSITION = new THREE.Vector3(0, -0.30, 0);       // 船身吃水 ~0.35m，让浪花包裹船舷；hullGroup.position.y=0.05 另加 0.05

/**
 * Sailboat —— 极简几何体帆船（占位模型）
 *
 * 设计目标：简单、比例正确、方向正确。
 * 部件：船体、甲板、桅杆、主帆+横桁、舵、桅顶风向标、左右舷航行灯。
 *
 * 坐标约定：船头指向 -Z（罗盘 0°=北），船尾 +Z，Y 轴朝上。
 */
export class Sailboat {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'sailboat';
    // 换舷动画状态
    this._currentSailAngle = 0;
    this._lastSailSide = 1;
    this._tackTimer = 0;      // 甩动动画剩余时间
    this._tackFrom = 0;
    this._tackTo = 0;
    this.build();
    this.loadGLBModel();      // 异步加载外部船身 GLB
  }

  build() {
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.5, flatShading: true });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xb08858, roughness: 0.8, flatShading: true });
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.5, roughness: 0.4 });

    // 帆材质——颜色会根据调帆质量动态变化（白绿=好 → 灰红=差）
    this.sailMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa, roughness: 0.7, side: THREE.DoubleSide,
      transparent: true, opacity: 0.95, emissive: 0xeeeeee, emissiveIntensity: 0.12,
    });
    const rudderMat = new THREE.MeshStandardMaterial({ color: 0x7a5030, roughness: 0.7 });

    // ===== 船体（low-poly 程序化几何，替代原 ExtrudeGeometry 占位模型） =====
    // 设计：V 型龙骨 + 8 个型线站，尖船头(-Z)、略宽船尾(+Z)，flatShading 呈现硬边 low-poly 质感。
    // 舷缘高 ≈ 0.77，加 0.05 偏移后与桅杆基座(0.82)对齐；龙骨入水，整体比例沿用原占位模型。
    // 程序化 hull 作为 GLB 加载前的占位 / 加载失败时的回退
    this.hullGroup = this.buildLowPolyHull({ hullMat, deckMat });
    this.hullGroup.position.y = 0.05;
    this.hullGroup.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.group.add(this.hullGroup);

    // ===== 桅杆 =====
    const mastH = 6.0;  // 加高桅杆，让帆更大
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, mastH, 8);
    this.mast = new THREE.Mesh(mastGeo, mastMat);
    this.mast.position.set(0, 0.82 + mastH / 2, -0.3);
    this.mast.castShadow = true;
    this.group.add(this.mast);

    // ===== 主帆 + 横桁（绕桅杆转）=====
    // 帆显著加大：高 4.5m × 底宽 3.5m —— 从高位相机也能清楚看到
    const sailShape = new THREE.Shape();
    sailShape.moveTo(0, 0);           // 桅顶
    sailShape.lineTo(0, -4.5);        // 桅底（沿桅杆向下）
    sailShape.lineTo(3.5, -4.2);     // 帆后下角（向船尾伸展）
    sailShape.lineTo(0, 0);
    const sailGeo = new THREE.ShapeGeometry(sailShape);
    this.mainsail = new THREE.Mesh(sailGeo, this.sailMat);
    this.mainsail.castShadow = true;

    // 横桁（boom）—— 帆底部可见的杆，随帆一起转，是「帆角」最直观的视觉指示器
    const boomGeo = new THREE.CylinderGeometry(0.07, 0.07, 3.5, 8);
    const boomMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, metalness: 0.2, roughness: 0.6 });
    this.boom = new THREE.Mesh(boomGeo, boomMat);
    this.boom.rotation.x = Math.PI / 2;  // 水平放置
    this.boom.position.set(1.75, -4.2, 0); // 帆底中点

    // ===== 帆侧标记（clew marker）—— 让换舷肉眼可见 =====
    // 橙色高亮球固定在帆后下角（clew），随 pivot 一起旋转；
    // 帆在右舷时标记在 +X 侧，帆在左舷时标记在 -X 侧。
    const clewMarkerMat = new THREE.MeshStandardMaterial({
      color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 1.5,
      roughness: 0.3, metalness: 0.1,
    });
    this.clewMarker = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), clewMarkerMat);
    this.clewMarker.position.set(3.6, -4.25, 0.12);

    // 帆+横桁+标记放在同一个 pivot 里，绕桅杆旋转
    this.mainsailPivot = new THREE.Group();
    this.mainsailPivot.position.set(0, 0.82 + mastH - 0.4, -0.3); // 桅顶附近
    this.mainsailPivot.add(this.mainsail);
    this.mainsailPivot.add(this.boom);
    this.mainsailPivot.add(this.clewMarker);
    this.group.add(this.mainsailPivot);

    // ===== 舵 =====
    const rudderGeo = new THREE.BoxGeometry(0.05, 1.0, 0.6);
    this.rudder = new THREE.Mesh(rudderGeo, rudderMat);
    this.rudderPivot = new THREE.Group();
    this.rudderPivot.position.set(0, 0.2, 2.4);
    this.rudderPivot.add(this.rudder);
    this.rudder.position.y = -0.2;
    this.group.add(this.rudderPivot);

    // ===== 桅顶风向标（Wind Indicator）=====
    this.windIndicator = new THREE.Group();
    const wiY = 0.82 + mastH + 0.18;
    this.windIndicator.position.set(0, wiY, -0.3);

    const hub = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 })
    );
    this.windIndicator.add(hub);

    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0xff3b30, roughness: 0.45, emissive: 0x550000, emissiveIntensity: 1.0,
    });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 8), arrowMat);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -0.7;
    this.windIndicator.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 14), arrowMat);
    head.rotation.x = -Math.PI / 2;
    head.position.z = -1.5;
    this.windIndicator.add(head);

    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide,
      emissive: 0x333333, emissiveIntensity: 0.6,
    });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.45), tailMat);
    tail.position.z = 0.32;
    this.windIndicator.add(tail);

    this.group.add(this.windIndicator);

    // ===== 左右舷航行灯（port=红左，starboard=绿右） =====
    const portLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff0000, emissiveIntensity: 1.2 })
    );
    portLight.position.set(-0.85, 0.95, 0.4);
    this.group.add(portLight);
    const stbdLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x33ff66, emissive: 0x00ff44, emissiveIntensity: 1.2 })
    );
    stbdLight.position.set(0.85, 0.95, 0.4);
    this.group.add(stbdLight);
  }

  /**
   * 程序化生成 low-poly 帆船船体（壳 + 甲板盖 + 稳向板）。
   * 返回 THREE.Group，坐标系：船头 -Z、船尾 +Z、X 为宽、Y 朝上。
   * 纯几何体，无外部资源依赖，契合游戏离线部署需求。
   * @param {{hullMat:THREE.Material, deckMat:THREE.Material}} materials
   * @returns {THREE.Group}
   */
  buildLowPolyHull(materials) {
    const { hullMat, deckMat } = materials;
    const group = new THREE.Group();
    group.name = 'lowpolyHull';

    // 型线站 stations：[z(船长), halfW(半宽), deckY(舷缘高), keelY(龙骨底)]
    const stations = [
      [-2.50, 0.05, 0.40, -0.45], // 船头尖
      [-1.90, 0.32, 0.55, -0.38],
      [-1.10, 0.56, 0.68, -0.50],
      [-0.30, 0.70, 0.76, -0.55], // 最宽处
      [ 0.50, 0.70, 0.77, -0.55],
      [ 1.30, 0.62, 0.72, -0.50],
      [ 2.00, 0.46, 0.62, -0.40],
      [ 2.55, 0.34, 0.52, -0.30], // 船尾
    ];
    const rings = stations.map(([z, hw, dy, ky]) => ({
      port: new THREE.Vector3(-hw, dy, z),
      stbd: new THREE.Vector3( hw, dy, z),
      keel: new THREE.Vector3(  0, ky, z),
    }));

    // ---- 船体壳（左右舷 V 型面）----
    const pos = [];
    const push = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i], B = rings[i + 1];
      push(A.port, A.keel, B.keel); push(A.port, B.keel, B.port); // 左舷
      push(A.stbd, B.stbd, B.keel); push(A.stbd, B.keel, A.keel); // 右舷
    }
    const hullGeo = new THREE.BufferGeometry();
    hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    hullGeo.computeVertexNormals();
    group.add(new THREE.Mesh(hullGeo, hullMat));

    // ---- 甲板盖（封闭船体顶部，木色）----
    const outline = [];
    rings.forEach(r => outline.push(r.port));
    for (let i = rings.length - 1; i >= 0; i--) outline.push(rings[i].stbd);
    const c = new THREE.Vector3();
    outline.forEach(p => c.add(p));
    c.multiplyScalar(1 / outline.length);
    const dpos = [];
    const dpush = (a, b, cc) => dpos.push(a.x, a.y, a.z, b.x, b.y, b.z, cc.x, cc.y, cc.z);
    for (let i = 0; i < outline.length; i++) {
      dpush(c, outline[i], outline[(i + 1) % outline.length]);
    }
    const deckGeo = new THREE.BufferGeometry();
    deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3));
    deckGeo.computeVertexNormals();
    group.add(new THREE.Mesh(deckGeo, deckMat));

    // ---- 稳向板 / 龙骨鳍（centerboard fin）：一眼识别为帆船 ----
    const finMat = new THREE.MeshStandardMaterial({ color: 0x5a3d22, roughness: 0.8, flatShading: true });
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.42, 2.6), finMat);
    fin.position.set(0, -0.62, 0.2);
    group.add(fin);

    return group;
  }

  /**
   * 异步加载压缩版 GLB 船身，替换程序化占位 hull。
   * GLB 本身已 Y-up、船头朝 -Z，与游戏坐标系一致，只需缩放+平移匹配现有 rig。
   */
  async loadGLBModel() {
    try {
      const gltf = await new Promise((resolve, reject) => {
        new GLTFLoader().load(HULL_GLTF_PATH, resolve, undefined, reject);
      });
      const model = gltf.scene;
      model.scale.copy(HULL_SCALE);
      model.position.copy(HULL_POSITION);
      model.rotation.y = HULL_ROT_Y;
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          // wooden_hull.glb 自带 basecolor JPEG（bufferView 内嵌），
          // 输出颜色空间已正确标注；若发现偏暗可手动 o.material.needsUpdate = true。
        }
      });

      // 替换掉程序化占位 hull
      if (this.hullGroup) {
        this.group.remove(this.hullGroup);
        this.hullGroup.traverse((o) => {
          if (o.isMesh) {
            o.geometry?.dispose();
            o.material?.dispose();
          }
        });
      }
      this.hullGroup = model;
      this.group.add(model);
    } catch (err) {
      console.warn('[Sailboat] GLB 船身加载失败，保留程序化 hull:', err);
    }
  }

  /**
   * @param {object} state { position, heading, sailAngle, sailSide, rudderAngle, heel, waveY, windDir, dt }
   * @param {number} [trimQuality] 调帆质量 [0,1]，用于帆的颜色反馈
   */
  update(state) {
    const { position, heading, sailAngle, sailSide, rudderAngle, heel, waveY, windDir } = state;
    const dt = state.dt ?? 0.016;

    this.group.position.set(position.x, waveY ?? 0, position.z);
    this.group.rotation.y = -heading * DEG2RAD;
    this.group.rotation.x = heel * DEG2RAD;

    // 帆的“幅度”由 sailAngle 控制；所在舷由 sailSide 决定（与 HUD 标签一致）：
    //   sailSide>0 → 帆在左舷（port side，-X 侧）
    //   sailSide<0 → 帆在右舷（starboard side，+X 侧）
    const mirror = (sailSide && sailSide > 0) ? Math.PI : 0;
    const targetAngle = mirror - sailAngle * DEG2RAD;

    // 换舷甩动动画：sailSide 改变时帆快速越过中心线再回稳，肉眼可见
    if (this._lastSailSide !== sailSide) {
      this._tackTimer = 0;
      this._tackFrom = this._currentSailAngle;
      this._tackTo = targetAngle;
      this._lastSailSide = sailSide;
    }

    const TACK_DURATION = 0.35;
    if (this._tackTimer < TACK_DURATION) {
      this._tackTimer += dt;
      const p = Math.min(1, this._tackTimer / TACK_DURATION);
      // 余弦缓入缓出基础插值
      const base = this._tackFrom + (this._tackTo - this._tackFrom) * (0.5 - 0.5 * Math.cos(p * Math.PI));
      // 越过中心线的甩动：先多转 35% 再弹回
      const overshoot = 0.35 * Math.sin(p * Math.PI) * (this._tackTo - this._tackFrom);
      this._currentSailAngle = base + overshoot;
    } else {
      this._currentSailAngle += (targetAngle - this._currentSailAngle) * 0.15;
    }

    this.mainsailPivot.rotation.y = this._currentSailAngle;
    this.rudderPivot.rotation.y = rudderAngle * DEG2RAD;

    // 帆的颜色反馈：好调帆→偏白绿，差调帆→灰红（提示玩家调整）
    if (typeof state.trimQuality === 'number') {
      const t = state.trimQuality; // 1=完美, 0=极差
      // 好: 白色略带绿  差: 灰暗偏红
      this.sailMat.color.setRGB(
        0.90 - t * 0.10,   // R: 0.80(好) ~ 0.90(差)
        0.82 + t * 0.18,   // G: 1.00(好) ~ 0.82(差)
        0.85 + t * 0.15    // B: 1.00(好) ~ 0.85(差)
      );
      this.sailMat.opacity = 0.7 + t * 0.28; // 差时半透明(看起来"瘪")，好时不透明饱满
    }

    // 桅顶风向标
    if (typeof windDir === 'number') {
      const relBearing = normalizeDeg(windDir - heading);
      this.windIndicator.rotation.y = -relBearing * DEG2RAD;
    }
  }
}
