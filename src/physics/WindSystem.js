import * as THREE from 'three';
import { DEG2RAD, normalizeDeg } from '../utils/math.js';

/**
 * WindSystem —— 风场系统
 * 风以「来向」（罗盘角度，0=从北吹来）和风速（节）描述。
 * 真实航海中风会缓慢漂移、阵风变化，这里用低频噪声模拟。
 */
export class WindSystem {
  constructor() {
    // 初始风从东北吹来（45°），12 节
    this.direction = 45;      // 风的来向，罗盘角度 [0,360)
    this.speed = 12;          // 风速（节）
    this.targetDirection = this.direction;
    this.targetSpeed = this.speed;
    this.changeTimer = 0;
    this.changeInterval = 8;  // 每 8 秒重新设定目标
  }

  /**
   * 风向（来向）转 Three.js 世界方向向量
   * 风从 direction 方向吹来 → 风的流向 = direction + 180
   * 罗盘 0°=北 → 世界 -Z；90°=东 → +X
   */
  getFlowVector() {
    const flowDeg = normalizeDeg(this.direction + 180);
    const rad = -flowDeg * DEG2RAD; // 转为 Three.js Y 轴弧度
    return new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).multiplyScalar(this.speed);
  }

  update(dt) {
    this.changeTimer += dt;
    if (this.changeTimer > this.changeInterval) {
      this.changeTimer = 0;
      // 风向随机漂移 ±15°，风速在 8~18 节间游走
      this.targetDirection = normalizeDeg(this.direction + (Math.random() - 0.5) * 30);
      this.targetSpeed = 8 + Math.random() * 10;
    }
    // 平滑趋近目标
    const k = 1 - Math.exp(-0.3 * dt);
    this.direction = normalizeDeg(this.direction + (this.targetDirection - this.direction) * k);
    this.speed += (this.targetSpeed - this.speed) * k;
  }
}
