import { LEVELS, cloneLevel, DEFAULT_PHYSICS } from '../config/levels.js';
import { normalizeDeg, normalizeDeg180 } from '../utils/math.js';

const BOAT_RADIUS = 10;        // 船碰撞半径（世界单位）
const REACH_THRESHOLD = 9.0;   // 到达判定半径（世界单位）
const COLLISION_DPS = 32;      // 触礁每秒扣血
const MAX_HEALTH = 100;

/**
 * LevelManager — 关卡加载、胜负判定、计时与血量
 *
 * 整合 wind / sail / boat / current / rockField / target，
 * 把 system graph 的 Win / Game Over 条件落地：
 *   Win      : 限时内到达终点 且 船体血量 > 0
 *   Game Over: 时间耗尽(timeLeft<=0) 或 船体损毁(health<=0) 或 持续触礁
 */
export class LevelManager {
  /**
   * @param {object} ctx { wind, sail, boat, current, rockField, target }
   */
  constructor(ctx) {
    this.wind = ctx.wind;
    this.sail = ctx.sail;
    this.boat = ctx.boat;
    this.current = ctx.current;
    this.rockField = ctx.rockField;
    this.target = ctx.target;

    this.index = 0;
    this.physics = { ...DEFAULT_PHYSICS };
    this.state = {
      levelIndex: 0,
      levelName: '—',
      timeLimit: 0,
      timeLeft: 0,
      health: MAX_HEALTH,
      maxHealth: MAX_HEALTH,
      status: 'idle',     // idle | playing | won | lost
      loseReason: '',
    };
    this.onWin = null;
    this.onLose = null;
    this._colliding = false;
  }

  /** 关卡数量 */
  get count() { return LEVELS.length; }

  /** 当前关名称列表（给关卡选择 UI） */
  listLevels() {
    return LEVELS.map((l, i) => ({ index: i, nameKey: l.nameKey, descKey: l.descKey }));
  }

  /**
   * 加载关卡
   * @param {number} index 关卡索引
   * @param {object} [overrides] 设计面板覆盖：{ windDir, windSpeed, timeLimit, target, rocks, current:{...}, physics:{...} }
   */
  load(index, overrides = {}) {
    this.index = index;
    const cfg = cloneLevel(LEVELS[index]);

    // 合并覆盖
    if (overrides.windDir !== undefined) cfg.windDir = overrides.windDir;
    if (overrides.windSpeed !== undefined) cfg.windSpeed = overrides.windSpeed;
    if (overrides.timeLimit !== undefined) cfg.timeLimit = overrides.timeLimit;
    if (overrides.target) cfg.target = { ...cfg.target, ...overrides.target };
    if (overrides.rocks) cfg.rocks = overrides.rocks.map((r) => ({ ...r }));
    if (overrides.current) cfg.current = { ...cfg.current, ...overrides.current };
    if (overrides.physics) this.physics = { ...this.physics, ...overrides.physics };

    // 应用风
    this.wind.direction = cfg.windDir;
    this.wind.speed = cfg.windSpeed;
    this.wind.targetDirection = cfg.windDir;
    this.wind.targetSpeed = cfg.windSpeed;

    // 应用物理
    this.boat.mass = this.physics.boatMass;
    this.boat.dragCoeff = this.physics.dragCoeff;
    this.boat.rudderAuthority = this.physics.rudderAuthority;
    this.boat.maxRudder = this.physics.maxRudder;
    this.sail.maxSailAngle = this.physics.maxSailAngle;
    this.sail.sailArea = this.physics.sailAreaDefault;
    this.sail.sailAngle = 30;

    // 应用水流
    this.current.configure(cfg.current);

    // 应用礁石
    this.rockField.setRocks(cfg.rocks);

    // 应用终点
    this.target.setAt(cfg.target.x, cfg.target.z);

    // 重置船
    this.boat.position = { x: 0, z: 0 };
    // 初始航向：默认朝向目标；若“朝目标的方向”落在禁航区(顶风)内，
    // 则自动偏到抢风角(close-hauled, 偏离 45°)一侧。
    // 这样既避免开局死锁（顶风无速→无法转向），又保留“顶风需走之字形”的教学意图。
    const dx = cfg.target.x;
    const dz = cfg.target.z;
    let initHeading = normalizeDeg(Math.atan2(dx, -dz) * 180 / Math.PI); // 朝目标的罗盘航向
    const twaToTarget = Math.abs(normalizeDeg180(cfg.windDir - initHeading));
    const CLOSE_HAULED = 45; // 略大于 noGo 半角(30)，确保有推进力
    if (twaToTarget < CLOSE_HAULED) {
      initHeading = normalizeDeg(initHeading + CLOSE_HAULED); // 偏右舷 close-hauled（确定性选择）
    }
    this.boat.heading = initHeading;
    this.boat.speed = 0;
    this.boat.rudderAngle = 0;

    // 重置状态
    this.state = {
      levelIndex: index,
      levelNameKey: cfg.nameKey,
      levelDescKey: cfg.descKey,
      timeLimit: cfg.timeLimit,
      timeLeft: cfg.timeLimit,
      health: MAX_HEALTH,
      maxHealth: MAX_HEALTH,
      status: 'playing',
      loseReason: '',
    };
    this._colliding = false;
  }

  /** 最近一帧是否处于碰撞（供 HUD 反馈） */
  get colliding() { return this._colliding; }

  /** 每帧更新：计时、碰撞、到达、胜负 */
  update(dt) {
    if (this.state.status !== 'playing') return;

    // 计时
    if (this.state.timeLimit > 0) {
      this.state.timeLeft -= dt;
      if (this.state.timeLeft <= 0) {
        this.state.timeLeft = 0;
        this._lose('时间耗尽');
        return;
      }
    }

    // 碰撞
    const hit = this.rockField.checkCollision(this.boat.position, BOAT_RADIUS);
    this._colliding = !!hit;
    if (hit) {
      this.state.health -= COLLISION_DPS * dt;
      this.boat.speed *= 0.94; // 触礁减速
      if (this.state.health <= 0) {
        this.state.health = 0;
        this._lose('船体损毁（触礁）');
        return;
      }
    }

    // 到达
    if (this.target.checkReached(this.boat.position, REACH_THRESHOLD)) {
      this._win();
    }
  }

  _win() {
    this.state.status = 'won';
    this.target.hideTarget();
    if (this.onWin) this.onWin(this.state);
  }

  _lose(reason) {
    this.state.status = 'lost';
    this.state.loseReason = reason;
    if (this.onLose) this.onLose(this.state, reason);
  }

  /** 当前关卡配置（供设计面板回显） */
  currentConfig() {
    const cfg = cloneLevel(LEVELS[this.index]);
    return cfg;
  }
}
