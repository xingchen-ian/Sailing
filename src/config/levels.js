/**
 * levels.js — 关卡预设与可调物理默认值
 *
 * 坐标系：罗盘 0°=北(-Z)，90°=东(+X)。世界单位 = 米 × 3（worldScale）。
 * 关卡数据即 system graph 右侧三关的默认实现：
 *   Level 1  横风初航   crosswind · 无水流 · 无礁石 · 到达终点
 *   Level 2  顶风限时   headwind  · 无水流 · 无礁石 · 限时到达（必须走之字形）
 *   Level 3  礁石迷宫   crosswind · 无水流 · >5 礁石 · 限时到达
 *
 * 注意：brief/system graph 中三关水流均为 none；但“水流”作为环境数据已完整实现，
 * 设计面板可随时为任意关卡开启并调参（current.enabled = true）。
 */

// 物理默认值（集中放置，便于 DesignPanel 调整与 README 说明）
export const DEFAULT_PHYSICS = {
  boatMass: 450,        // 船质量（越小惯性越小，调帆反应越快）
  dragCoeff: 1.0,       // 水阻系数（越大失速越快）
  rudderAuthority: 0.9, // 舵效
  maxRudder: 30,        // 最大舵角（度）
  maxSailAngle: 90,     // 最大帆角（度）
  sailAreaDefault: 1.0, // 默认帆面积
  noGoZone: 30,         // 禁航区半角（度）：迎风角 < 此值无法有效航行
};

/**
 * 关卡预设数组
 * @typedef {Object} LevelConfig
 * @property {string} name
 * @property {string} desc
 * @property {number} windDir        风来向（度）
 * @property {number} windSpeed      风速（节）
 * @property {{x:number,z:number}} target   终点坐标（世界单位）
 * @property {number} timeLimit      限时（秒），0 = 不限制
 * @property {Array<{x:number,z:number,radius:number}>} rocks
 * @property {{enabled:boolean,dir:number,speed:number}} current
 */
export const LEVELS = [
  {
    nameKey: 'levels.lv1.name',
    descKey: 'levels.lv1.desc',
    windDir: 90,          // 风从东来 → 船侧面受风，正侧风附近最快
    windSpeed: 10,
    target: { x: 0, z: -500 },   // 正北 500 单位 ≈ 167m
    timeLimit: 0,         // 不限制
    rocks: [],
    current: { enabled: false, dir: 0, speed: 0 },
  },
  {
    nameKey: 'levels.lv2.name',
    descKey: 'levels.lv2.desc',
    windDir: 0,           // 风从北来，目标在北 → 顶风
    windSpeed: 10,
    target: { x: 0, z: -500 },
    timeLimit: 150,
    rocks: [],
    current: { enabled: false, dir: 0, speed: 0 },
  },
  {
    nameKey: 'levels.lv3.name',
    descKey: 'levels.lv3.desc',
    windDir: 90,
    windSpeed: 11,
    target: { x: 0, z: -600 },
    timeLimit: 160,
    // 礁石迷宫：>5 块小礁石，沿正前方通道交错布置，挡住直接路线但留出左右绕行空间。
    // 半径从 22-26 缩小到 10-13，视觉上更像“礁石”而非岛屿；从起点仍能看到远处目标光柱。
    rocks: [
      { x:   0, z: -130, radius: 12 }, // 中心线第一道门，必须绕行
      { x: -34, z:  -70, radius: 10 }, // 左侧边界，压缩左通道
      { x:  34, z: -190, radius: 11 }, // 右侧边界，压缩右通道
      { x: -15, z: -250, radius: 12 }, // 向左偏转
      { x:  32, z: -310, radius: 10 }, // 右侧边界
      { x:  16, z: -370, radius: 12 }, // 向右偏转
      { x:  30, z: -430, radius: 10 }, // 右侧边界
      { x: -14, z: -480, radius: 11 }, // 向左偏转
      { x:  10, z: -550, radius: 10 }, // 靠近目标的最后偏向
    ],
    current: { enabled: false, dir: 0, speed: 0 },
  },
];

/** 深拷贝一个关卡配置（避免运行时改动原始预设） */
export function cloneLevel(cfg) {
  return {
    nameKey: cfg.nameKey,
    descKey: cfg.descKey,
    windDir: cfg.windDir,
    windSpeed: cfg.windSpeed,
    target: { ...cfg.target },
    timeLimit: cfg.timeLimit,
    rocks: cfg.rocks.map((r) => ({ ...r })),
    current: { ...cfg.current },
  };
}
