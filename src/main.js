import { SceneManager } from './scene/SceneManager.js';
import { WindSystem } from './physics/WindSystem.js';
import { SailPhysics } from './physics/SailPhysics.js';
import { BoatDynamics } from './physics/BoatDynamics.js';
import { Sailboat } from './boat/Sailboat.js';
import { Target } from './boat/Target.js';
import { TrailRenderer } from './scene/TrailRenderer.js';
import { WakeSystem } from './scene/WakeSystem.js';
import { InputController } from './controls/InputController.js';
import { CameraController } from './controls/CameraController.js';
import { HUD } from './ui/HUD.js';
import { calcTWA } from './utils/math.js';

// 新增系统（关卡 / 水流 / 礁石 / 设计面板）
import { WaterCurrent } from './systems/WaterCurrent.js';
import { RockField } from './systems/RockField.js';
import { LevelManager } from './systems/LevelManager.js';
import { DesignPanel } from './ui/DesignPanel.js';

// ---------- 初始化 ----------
const container = document.getElementById('game-root');
const sceneMgr = new SceneManager(container);

const wind = new WindSystem();
const sail = new SailPhysics();
const boat = new BoatDynamics();
const current = new WaterCurrent();
const sailboat = new Sailboat();
sceneMgr.scene.add(sailboat.group);

const target = new Target();
sceneMgr.scene.add(target.group);

const rockField = new RockField(sceneMgr.scene);

const trail = new TrailRenderer(sceneMgr.scene);
const wake = new WakeSystem(sceneMgr.scene, {
  getWaveHeight: (x, z) => sceneMgr.ocean.getWaveHeight(x, z),
});

const input = new InputController(container);
const camera = new CameraController(sceneMgr.camera);
const hud = new HUD(wind, sail, boat);

// 关卡管理器
const levelManager = new LevelManager({ wind, sail, boat, current, rockField, target });
hud.setLevelManager(levelManager);
hud.setCurrent(current);
hud.setTarget(target);

// ---------- 关卡选择 UI ----------
const levelSelect = document.getElementById('level-select');
const levelGrid = document.getElementById('level-grid');
const startBtn = document.getElementById('start-btn');
const winOverlay = document.getElementById('win-overlay');
const loseOverlay = document.getElementById('lose-overlay');
let selectedIndex = 0;

function t(key) {
  return (typeof window !== 'undefined' && window.SAILING_I18N && window.SAILING_I18N.t)
    ? window.SAILING_I18N.t(key, window.SAILING_I18N.getLang())
    : key;
}

function renderLevelCards() {
  levelGrid.innerHTML = '';
  levelManager.listLevels().forEach((lv) => {
    const card = document.createElement('div');
    card.className = 'level-card' + (lv.index === selectedIndex ? ' selected' : '');
    card.dataset.index = lv.index;
    const name = t(lv.nameKey);
    const parts = name.split('·');
    const no = parts[0] ? parts[0].trim() : name;
    const title = parts[1] ? parts[1].trim() : name;
    card.innerHTML = `<div class="lv-no">${no}</div>
                      <div class="lv-name">${title}</div>
                      <div class="lv-desc">${t(lv.descKey)}</div>`;
    card.addEventListener('click', () => {
      selectedIndex = lv.index;
      levelGrid.querySelectorAll('.level-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
    });
    levelGrid.appendChild(card);
  });
}
renderLevelCards();

function hide(el) { el.classList.add('hidden'); }
function show(el) { el.classList.remove('hidden'); }

function startLevel(i) {
  selectedIndex = i;
  // 礁石编辑器覆盖：Level 3 时读取本地存储的自定义礁石布局
  const overrides = {};
  if (i === 2) {
    try {
      const raw = localStorage.getItem('sailing.l3rocks');
      if (raw) overrides.rocks = JSON.parse(raw);
    } catch (e) { /* 解析失败则使用默认 L3 布局 */ }
  }
  levelManager.load(i, overrides);
  syncSailSide();        // 载入关卡后按当前风重置帆侧，避免误触发换舷提示
  designPanel.syncFromState();
  hide(levelSelect);
  hide(winOverlay);
  hide(loseOverlay);
}

/**
 * 根据当前迎风角(TWA)符号设定帆所在侧，不触发提示。
 * 帆侧约定（与 HUD 文字、航行灯颜色、模型一致）：
 *   TWA>0 → 风来自右舷 → 帆在左舷（port side），sailSide=+1
 *   TWA<0 → 风来自左舷 → 帆在右舷（starboard side），sailSide=-1
 */
function syncSailSide() {
  const twa = calcTWA(boat.heading, wind.direction);
  sail.sailSide = twa >= 0 ? 1 : -1;
}

// 换舷轻微音效（WebAudio，无外部资源；需用户先交互才能发声，失败则静默）
let _audioCtx = null;
function playTackBlip() {
  try {
    if (!_audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      _audioCtx = new AC();
    }
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    const now = _audioCtx.currentTime;
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain).connect(_audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) { /* 静默 */ }
}

startBtn.addEventListener('click', () => startLevel(selectedIndex));
document.getElementById('win-next').addEventListener('click', () => startLevel((levelManager.index + 1) % levelManager.count));
document.getElementById('win-retry').addEventListener('click', () => startLevel(levelManager.index));
document.getElementById('lose-retry').addEventListener('click', () => startLevel(levelManager.index));

// 胜负回调 → 显示覆盖层
levelManager.onWin = (state) => {
  const time = state.timeLimit > 0 ? Math.ceil(state.timeLeft) + 's' : t('hud.timeUnlimited') || '不限';
  const name = state.levelNameKey ? t(state.levelNameKey) : (state.levelName || '');
  document.getElementById('win-detail').textContent =
    t('win.detailDynamic').replace('{name}', name).replace('{time}', time).replace('{health}', Math.round(state.health));
  show(winOverlay);
};
levelManager.onLose = (state, reason) => {
  document.getElementById('lose-detail').textContent = t('lose.detailDynamic').replace('{reason}', reason);
  show(loseOverlay);
};

// R 键重开本关
// R 键重开本关
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && levelManager.state.status !== 'idle') startLevel(levelManager.index);
});

// 语言切换时重渲染关卡卡片与设计面板
window.addEventListener('sailing:i18n', () => {
  renderLevelCards();
  designPanel.rebuild();
  hud.update();
});

// 礁石编辑器实时联动：在编辑器点「应用到游戏」后，若游戏已在 Level 3 中运行，
// 立即用新的自定义礁石布局刷新场景，无需手动重开本关。
// （localStorage 的 storage 事件仅在其他标签页触发，正好覆盖“编辑器 + 游戏”双开场景。）
const ROCK_STORE_KEY = 'sailing.l3rocks';
window.addEventListener('storage', (e) => {
  if (e.key !== ROCK_STORE_KEY) return;
  if (levelManager.index !== 2) return;          // 仅 Level 3 相关
  if (levelManager.state.status === 'idle') return; // 还在选关界面：开始本关时 startLevel 会自动读取
  let rocks;
  try {
    rocks = e.newValue ? JSON.parse(e.newValue) : levelManager.currentConfig().rocks;
  } catch (err) {
    rocks = levelManager.currentConfig().rocks;   // 解析失败则回退到 L3 默认
  }
  rockField.setRocks(rocks);
});

// ---------- 设计面板 ----------
const designPanel = new DesignPanel({
  levelManager, wind, sail, boat, current, target,
  bodyEl: document.getElementById('dp-body'),
});
designPanel.onApply = (overrides) => { levelManager.load(levelManager.index, overrides); designPanel.syncFromState(); };
designPanel.onReset = () => { levelManager.load(levelManager.index); designPanel.syncFromState(); };

document.getElementById('dp-apply').addEventListener('click', () => designPanel.onApply(designPanel.collectOverrides()));
document.getElementById('dp-reset').addEventListener('click', () => designPanel.onReset());
document.getElementById('design-collapse').addEventListener('click', () => {
  document.getElementById('design-panel').classList.add('collapsed');
  document.getElementById('design-toggle').style.display = 'block';
});
document.getElementById('design-toggle').addEventListener('click', () => {
  document.getElementById('design-panel').classList.remove('collapsed');
  document.getElementById('design-toggle').style.display = 'none';
});

// 初始化：先准备好 Level 0 数据（场景/设计面板回显正确），再显示关卡选择
levelManager.load(0);
syncSailSide();
designPanel.syncFromState();

// ---------- 主循环 ----------
let last = performance.now();
let elapsed = 0;
let tackCooldown = 0; // 换舷冷却（秒），防止在风眼前快速抖动

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  elapsed += dt;

  try {
    // 1) 输入
    const cmd = input.poll(dt);
    const rudderHeld = cmd.dRudder !== 0;
    if (cmd.centerRudder) {
      boat.setRudder(0);
    } else if (rudderHeld) {
      boat.setRudder(boat.rudderAngle + cmd.dRudder);
    } else {
      const ret = 90 * dt;
      if (Math.abs(boat.rudderAngle) <= ret) boat.setRudder(0);
      else boat.setRudder(boat.rudderAngle - Math.sign(boat.rudderAngle) * ret);
    }
    sail.sailAngle = Math.max(5, Math.min(sail.maxSailAngle, sail.sailAngle + cmd.dSail));
    sail.sailArea = Math.max(0.3, Math.min(1.0, sail.sailArea + cmd.dArea));

    // 2) 风
    wind.update(dt);

    // 3) 帆的空气动力
    const twa = calcTWA(boat.heading, wind.direction);
    // —— 自动换舷：船穿过风时帆自动翻到背风侧 ——
    // 以 TWA 符号为单一真相：TWA>0 → 帆在左舷（port，sailSide=+1）；
    // TWA<0 → 帆在右舷（starboard，sailSide=-1）。
    // 用冷却时间（0.45s）防止在风眼前抖动，而不是用死区把帆“卡”在错误侧。
    const targetSide = twa >= 0 ? 1 : -1;
    if (targetSide !== sail.sailSide && tackCooldown <= 0) {
      sail.sailSide = targetSide;
      tackCooldown = 0.45;
      hud.onTack(targetSide);  // HUD 视觉提示
      playTackBlip();          // 轻微音效（可选，失败静默）
    }
    if (tackCooldown > 0) tackCooldown -= dt;
    const forces = sail.compute(twa, wind.speed);
    boat.driveForce = forces.drive;
    boat.sideForce = forces.side;
    sail._lastTrimQuality = forces.trimQuality;

    // 4) 船体动力学
    boat.update(dt);

    // 4b) 水流漂移（环境数据：把船推离航线）
    const drift = current.getDriftVector();
    boat.position.x += drift.x * dt;
    boat.position.z += drift.z * dt;

    // 5) 帆船姿态
    const waveY = sceneMgr.ocean.getWaveHeight(boat.position.x, boat.position.z);
    sailboat.update({
      position: boat.position,
      heading: boat.heading,
      sailAngle: sail.sailAngle,
      sailSide: sail.sailSide,
      rudderAngle: boat.rudderAngle,
      heel: forces.heel,
      waveY,
      windDir: wind.direction,
      trimQuality: forces.trimQuality,
      dt,
    });

    // 6) 目标浮标动画
    target.update(dt, elapsed);

    // 7) 关卡更新（计时 / 碰撞 / 到达 / 胜负）
    levelManager.update(dt);

    // 8) 航迹与尾迹
    trail.record(boat.position);
    wake.update({ position: boat.position, speed: boat.speed, heading: boat.heading }, dt);

    // 9) 相机
    camera.update({ position: boat.position, heading: boat.heading }, dt);

    // 10) 海面 + 渲染
    sceneMgr.update(dt, sceneMgr.camera.position);

    // 11) HUD
    hud.update();
  } catch (err) {
    console.error('[frame error]', err);
  }
}

requestAnimationFrame(frame);

// ---------- 调试入口 ----------
window.__sailing = { wind, sail, boat, current, rockField, target, trail, wake, levelManager, sceneMgr, sailboat };
