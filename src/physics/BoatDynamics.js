import { DEG2RAD, normalizeDeg } from '../utils/math.js';

/**
 * BoatDynamics —— 船体动力学积分
 *
 * 综合 帆推力 / 水阻力 / 舵力 / 横漂，积分得到：
 *  - speed（节）
 *  - heading（罗盘航向，度）
 *  - position（世界坐标 x, z）
 *
 * 简化假设：
 *  - 阻力 ∝ v² （典型流体阻力）
 *  - 转向速率 ∝ 舵角 × 当前速度（无速不转）
 *  - 横漂不直接改变航向，仅影响姿态（在 Sailboat 中体现为横倾）
 */
export class BoatDynamics {
  constructor() {
    // 状态
    this.speed = 0;          // 节
    this.heading = 0;        // 罗盘角度 [0,360)
    this.position = { x: 0, z: 0 };

    // 输入
    this.rudderAngle = 0;    // 舵角 [-30, 30] 度
    this.driveForce = 0;     // 来自帆的推力
    this.sideForce = 0;      // 侧向力

    // 可调参数
    this.mass = 450;             // 降低惯性 → 速度对推力/调帆变化反应更快
    this.dragCoeff = 1.0;        // 加大水阻 → 调帆失调时船会很快减速停下
    this.rudderAuthority = 0.9;  // 舵效（转向灵敏度）
    this.maxRudder = 30;
    this.speedToMs = 0.5144;     // 节 → m/s
    this.worldScale = 3.0;       // 世界单位 / 米（视觉缩放）

    // 罗盘 0°=北 → 世界 -Z，所以位置积分：
    // forwardX = sin(-headingRad) = -sin(headingRad)? 用 headingToRad 统一
  }

  setRudder(angle) {
    this.rudderAngle = Math.max(-this.maxRudder, Math.min(this.maxRudder, angle));
  }

  update(dt) {
    // 1) 推力 → 加速度
    const accel = this.driveForce / this.mass;
    let newSpeed = this.speed + accel * dt * 8.0; // 节（标定，8=更快达到巡航速度）

    // 2) 阻力 ∝ v²
    const drag = this.dragCoeff * newSpeed * Math.abs(newSpeed) / 100;
    newSpeed -= drag * dt * 8.0;

    // 3) 失速下限
    if (newSpeed < 0) newSpeed = 0;
    this.speed = newSpeed;

    // 4) 转向：舵角 × 速度 → 航向变化率
    // 速度越高舵效越强；但保留最低 25% 舵效，避免船在禁航区(无速)时完全无法转向而卡死。
    // （真实帆船静止时舵确实无效，但作为游戏安全网，保证玩家总能缓慢把船转出顶风区）
    const speedFactor = Math.max(0.25, this.speed / 6); // 速度因子（带安全下限）
    const turnRate = (this.rudderAngle / this.maxRudder)
                   * this.rudderAuthority
                   * speedFactor
                   * 30;                            // 度/秒标定
    this.heading = normalizeDeg(this.heading + turnRate * dt);

    // 5) 位置积分（节 → m/s → 世界单位）
    // 关键：前进方向必须与视觉船头一致。
    // 视觉船头 = group.rotation.y = -heading*DEG2RAD 旋转 local -Z，
    // 其世界方向为 unit(heading) = (sin h, -cos h)。物理移动必须同向，否则船会倒着漂。
    const vMs = this.speed * this.speedToMs * this.worldScale;
    const hRad = this.heading * DEG2RAD;
    this.position.x += Math.sin(hRad) * vMs * dt;
    this.position.z += -Math.cos(hRad) * vMs * dt;

    return { speed: this.speed, heading: this.heading, position: this.position };
  }
}
