import * as THREE from 'three';
import { DEG2RAD, damp } from '../utils/math.js';

/**
 * CameraController —— 第三人称跟随相机
 *
 * 相机锚定在船的后上方，跟随船的位置与航向。
 * 玩家可用鼠标拖拽临时环绕观察（松手后平滑回正）。
 */
export class CameraController {
  constructor(camera) {
    this.camera = camera;
    // 相机相对船的本地偏移（后方 + 上方），抬高以便看清行进方向
    this.offset = new THREE.Vector3(0, 16, 24);
    // 平滑跟随的目标
    this._pos = new THREE.Vector3(0, 16, 24);
    this._look = new THREE.Vector3(0, 2, 0);
  }

  /**
   * 固定高位第三人称跟随：相机永远在船后上方、看向船头前方。
   * 不响应鼠标旋转，避免丢失行进方向。
   * @param {object} boatState { position, heading }
   * @param {number} dt
   */
  update(boatState, dt) {
    const { position, heading } = boatState;
    const hRad = heading * DEG2RAD;
    const sinH = Math.sin(hRad);
    const cosH = Math.cos(hRad);

    const dist = this.offset.z;   // 船尾后方的水平距离 (24)
    const height = this.offset.y; // 相机高度 (16)
    const lookDist = 6;           // 看向船头前方的提前量

    // 船头世界方向 = unit(heading) = (sin h, -cos h)
    // ⇒ 船尾后方 = 反方向 = (-sin h, cos h)，乘以距离得到相机偏移
    // 这样无论航向如何，相机始终在船的**正后方**，不会跑到屏幕前
    const targetPos = new THREE.Vector3(
      position.x - sinH * dist,
      height,
      position.z + cosH * dist
    );

    // 看向船头前方一点，强化"行进方向"感知
    const lookAhead = new THREE.Vector3(
      position.x + sinH * lookDist,
      2,
      position.z - cosH * lookDist
    );

    // 阻尼平滑：船掉头后，相机沿弧线慢慢绕回船尾后方（不瞬移、不穿到船头前）
    const k = 5.0; // 越大跟得越紧，越小越"慢慢调整"
    this._pos.x = damp(this._pos.x, targetPos.x, k, dt);
    this._pos.y = damp(this._pos.y, targetPos.y, k, dt);
    this._pos.z = damp(this._pos.z, targetPos.z, k, dt);
    this._look.x = damp(this._look.x, lookAhead.x, k, dt);
    this._look.y = damp(this._look.y, lookAhead.y, k, dt);
    this._look.z = damp(this._look.z, lookAhead.z, k, dt);

    this.camera.position.copy(this._pos);
    this.camera.lookAt(this._look);
  }
}
