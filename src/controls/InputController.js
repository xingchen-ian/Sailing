/**
 * InputController —— 键盘输入
 *
 * 操作映射：
 *  A / ← : 左舵（向左转，松开自动回正）
 *  D / → : 右舵（向右转，松开自动回正）
 *  W / ↑ : 收帆（帆角减小，更紧）
 *  S / ↓ : 松帆（帆角增大，更松）
 *  Q     : 缩帆（减小帆面积）
 *  E     : 展帆（增大帆面积）
 *  Space : 舵立即回正（也可松手自动回正）
 *
 * 注：相机为固定高位跟随，不再提供鼠标旋转（避免迷失行进方向）。
 */
export class InputController {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();

    this._onKeyDown = (e) => this.keys.add(e.code);
    this._onKeyUp = (e) => this.keys.delete(e.code);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  /**
   * 读取本帧输入，返回离散指令（供物理模块消费）
   * @param {number} dt
   */
  poll(dt) {
    const rudderRate = 60;   // 度/秒
    const sailRate = 50;     // 度/秒
    const areaRate = 0.5;    // 每秒

    let dRudder = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dRudder -= rudderRate * dt;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dRudder += rudderRate * dt;

    let dSail = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dSail -= sailRate * dt;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dSail += sailRate * dt;

    let dArea = 0;
    if (this.keys.has('KeyQ')) dArea -= areaRate * dt;
    if (this.keys.has('KeyE')) dArea += areaRate * dt;

    const centerRudder = this.keys.has('Space');

    return { dRudder, dSail, dArea, centerRudder };
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}
