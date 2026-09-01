import { DEG2RAD } from '../utils/math.js';

/**
 * WaterCurrent — 水流系统
 *
 * 与 WindSystem 平行的环境数据：水流把船向某个方向缓慢推离航线。
 * 这是 brief / system graph 中的 "water current direction / speed" 环境数据，
 * 也是“Boat drifts from target → 风或水流推偏路线”这一反馈的来源之一。
 *
 * 默认所有关卡关闭（与 system graph 一致）；可在设计面板随时开启。
 */
export class WaterCurrent {
  constructor() {
    this.enabled = false;
    this.direction = 0;   // 水流来向（度，罗盘）
    this.speed = 1.5;     // 水流速度（节）
    this._worldScale = 3.0;
    this._knotToMs = 0.5144;
    this._currentScale = 0.6; // 水流相对船速的视觉缩放（避免过强）
  }

  /**
   * 漂移速度向量（世界单位/秒）
   * 流向 = 来向 + 180；罗盘 0°=北→-Z，90°=东→+X
   */
  getDriftVector() {
    if (!this.enabled || this.speed <= 0) return { x: 0, z: 0 };
    const flowDeg = this.direction + 180;
    const rad = flowDeg * DEG2RAD;
    const v = this.speed * this._knotToMs * this._worldScale * this._currentScale;
    return {
      x: Math.sin(rad) * v,
      z: -Math.cos(rad) * v,
    };
  }

  /** 应用关卡/设计面板配置 */
  configure({ enabled, dir, speed }) {
    if (enabled !== undefined) this.enabled = enabled;
    if (dir !== undefined) this.direction = dir;
    if (speed !== undefined) this.speed = speed;
  }
}
