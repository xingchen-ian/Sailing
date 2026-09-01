import { DEG2RAD, normalizeDeg180 } from '../utils/math.js';

/**
 * SailPhysics —— 帆的空气动力学（游戏向标定版）
 *
 * 设计原则：
 *  1. 调帆好坏必须有**明显的、立即可感知的**速度差异
 *  2. 缩小"死区"，让玩家在更多航向下都能感受到调帆的作用
 *  3. 夸张物理响应以换取游戏手感（不是精确模拟器）
 *
 * 输出：
 *  - driveForce：前向推力
 *  - sideForce：横向力 → 横倾
 *  - heelAngle：横倾角
 *  - efficiency：总效率 [0,1]
 *  - optimalSailAngle：该航向最佳帆角
 *  - trimQuality：调帆质量 [0,1]（供帆的颜色反馈用）
 */
export class SailPhysics {
  constructor() {
    // 可调参数
    this.sailAngle = 30;
    this.maxSailAngle = 90;
    this.sailArea = 1.0;
    this.boatMass = 800;
    this.heelDamping = 2.0;
    this.noGoZone = 30;     // 禁航区半角（度）：迎风角 < 此值无法有效直航
    this._heel = 0;
    // 帆所在舷（自动换舷用，与 HUD 标签一致）：
    //   +1 = 帆在左舷（port side）
    //   -1 = 帆在右舷（starboard side）
    // 注意：sailAngle 在这里只表示“帆松开的程度（幅度）”，符号侧由 sailSide 决定。
    this.sailSide = 1;
  }

  /**
   * @param {number} twa 真实迎风角 [-180,180]
   * @param {number} windSpeed 风速（节）
   * @returns {{drive: number, side: number, heel: number, efficiency: number, optimalSailAngle: number, trimQuality: number}}
   */
  compute(twa, windSpeed) {
    const absTwa = Math.abs(twa);

    // ── 1) 基础效率：随迎风角变化 ──
    // 旧：No-Go 区 <30°，<15° 完全归零 → 玩家在大部分时间感觉不到调帆作用
    // 新：No-Go 区缩到 <12°（接近正顶风才完全死），12°~35° 低效但非零
    let baseEfficiency;
    if (absTwa < 12) {
      // 正顶风区（in irons）：几乎无推力
      baseEfficiency = (absTwa / 12) * 0.08; // 最大才 8%，几乎不动但不是零
    } else if (absTwa < 40) {
      // 抢风过渡区（close-hauled）：从低效快速爬升
      const t = (absTwa - 12) / 28; // [0,1]
      baseEfficiency = 0.08 + t * t * 0.52; // 二次缓出：0.08 → 0.60
    } else if (absTwa <= 100) {
      // 有效航行区（beam reach → broad reach）：高效率
      baseEfficiency = 0.60 + Math.sin((absTwa - 40) * DEG2RAD * 1.8) * 0.38;
      baseEfficiency = Math.min(baseEfficiency, 1.0);
    } else {
      // 近顺风（running）：风直接推，效率中等偏上
      baseEfficiency = 0.75 - (absTwa - 100) * 0.002;
    }

    // ── 2) 调帆匹配度：这是核心——好调帆 vs 差调帆要有数量级差异 ──
    const optimalSailAngle = Math.min(this.maxSailAngle, absTwa / 2);
    const trimError = Math.abs(normalizeDeg180(this.sailAngle - optimalSailAngle));

    // 旧的 trimFactor = max(0.2, 1-(trimError/45)^1.5)
    // 问题：下限 0.2 太高了——即使调得极差也有 20% 效率，速度差异只有 ~2 倍
    // 新：更陡峭的衰减曲线，下限更低
    let trimFactor;
    if (trimError < 8) {
      // 误差 < 8°：接近完美，效率 95%~100%
      trimFactor = 0.95 + (1 - trimError / 8) * 0.05;
    } else if (trimError < 35) {
      // 误差 8~35°：线性衰减 0.95→0.15
      const t = (trimError - 8) / 27;
      trimFactor = 0.95 * (1 - t) + 0.15 * t;
    } else {
      // 误差 > 35°：严重失调，效率 <15% 且继续衰减
      trimFactor = Math.max(0.03, 0.15 * Math.exp(-(trimError - 35) / 25));
    }

    // ── 3) 总气动力 ──
    // 0.85 标定系数（相比旧 0.65 略增），补偿加大水阻后维持 ~5 节巡航
    const dynamicPressure = windSpeed * windSpeed * this.sailArea;
    const totalForce = dynamicPressure * baseEfficiency * trimFactor * 0.85;

    // ── 4) 前向推力占比 ──
    let driveFrac;
    if (absTwa < 15) {
      driveFrac = 0.05; // 顶风区微弱推力
    } else if (absTwa < 90) {
      driveFrac = 0.25 + 0.75 * ((absTwa - 15) / 75); // 0.25 → 1.0
    } else {
      driveFrac = Math.max(0.6, 1.0 - 0.4 * (absTwa - 90) / 90); // 1.0 → 0.6
    }

    const drive = totalForce * driveFrac;
    const side = totalForce * Math.sin(absTwa * DEG2RAD) * 0.55;

    // ── 5) 横倾 ──
    const targetHeel = (side / this.boatMass) * 14;
    this._heel += (targetHeel - this._heel) * (1 - Math.exp(-this.heelDamping * 0.016));
    const heel = this._heel * Math.sign(twa);

    // 调帆质量 [0,1] —— 给帆的颜色反馈用
    const trimQuality = trimFactor;

    return {
      drive: Math.max(0, drive),
      side,
      heel,
      efficiency: baseEfficiency * trimFactor,
      optimalSailAngle,
      trimQuality,
    };
  }
}
