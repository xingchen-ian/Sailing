// 数学工具：角度归一化、向量运算辅助

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

/** 将角度归一化到 [0, 360) */
export function normalizeDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

/** 将角度归一化到 [-180, 180) */
export function normalizeDeg180(deg) {
  let d = normalizeDeg(deg);
  if (d >= 180) d -= 360;
  return d;
}

/** 将弧度归一化到 [-π, π) */
export function normalizeRad(rad) {
  while (rad > Math.PI) rad -= Math.PI * 2;
  while (rad < -Math.PI) rad += Math.PI * 2;
  return rad;
}

/**
 * 计算真实迎风角 (True Wind Angle, TWA)
 * @param {number} boatHeading 船的航向（罗盘角度，0=北）
 * @param {number} windDir 风的来向（罗盘角度，0=北）
 * @returns {number} TWA，归一化到 [-180, 180]，0=迎风，±180=顺风
 */
export function calcTWA(boatHeading, windDir) {
  return normalizeDeg180(windDir - boatHeading);
}

/**
 * 根据迎风角判断航行状态（point of sail）
 * @param {number} twa 真实迎风角 [-180,180]
 * @returns {{name: string, zone: string}}
 */
export function pointOfSail(twa) {
  const a = Math.abs(twa);
  if (a < 30) return { name: 'No-Go / 顶风区', zone: 'irons' };
  if (a < 45) return { name: 'Close-Hauled / 抢风航行', zone: 'close-hauled' };
  if (a < 90) return { name: 'Close Reach / 偏顺风', zone: 'close-reach' };
  if (a < 135) return { name: 'Beam / Broad Reach', zone: 'reach' };
  return { name: 'Running / 顺风', zone: 'running' };
}

/**
 * 判断目标是否可以直航到达
 * @param {number} targetBearing 从船看目标的罗盘方位 (°)，0=北
 * @param {number} windDir 风来向 (°)
 * @param {number} noGoZone 顶风区角度阈值，默认 30°
 * @returns {boolean} true=可直航，false=需之字形
 */
export function calcDirectReachable(targetBearing, windDir, noGoZone = 30) {
  const diff = Math.abs(normalizeDeg180(targetBearing - windDir));
  return diff > noGoZone;
}

/** 线性插值 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 阻尼插值（帧率无关） */
export function damp(a, b, lambda, dt) {
  return lerp(a, b, 1 - Math.exp(-lambda * dt));
}

/** 将罗盘角度转为 Three.js Y 轴弧度（0=北 → -Z 方向） */
export function headingToRad(headingDeg) {
  return -normalizeDeg(headingDeg) * DEG2RAD;
}
