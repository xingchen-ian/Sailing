import { calcTWA, pointOfSail, normalizeDeg, calcDirectReachable } from '../utils/math.js';

/**
 * HUD —— 仪表盘更新
 * 直接操作 index.html 中的 DOM 节点，显示航海仪表。
 */
export class HUD {
  constructor(wind, sail, boat) {
    this.wind = wind;
    this.sail = sail;
    this.boat = boat;
    this.target = null; // Target 实例，由外部注入
    this.el = {
      speed: document.getElementById('speed'),
      heading: document.getElementById('heading'),
      windDir: document.getElementById('wind-dir'),
      windSpeed: document.getElementById('wind-speed'),
      sailAngle: document.getElementById('sail-angle'),
      rudder: document.getElementById('rudder-angle'),
      twa: document.getElementById('twa'),
      targetDist: document.getElementById('target-dist'),
      targetBearing: document.getElementById('target-bearing'),
      targetDirect: document.getElementById('target-direct'),
      targetReached: document.getElementById('target-reached'),
      trimQuality: document.getElementById('trim-quality'),
      levelName: document.getElementById('level-name'),
      timeLeft: document.getElementById('time-left'),
      health: document.getElementById('health'),
      levelDesc: document.getElementById('level-desc'),
      tackState: document.getElementById('tack-state'),
      tackToast: document.getElementById('tack-toast'),
      noGo: document.getElementById('no-go-warning'),
    };
    this._pointEl = document.getElementById('point-of-sail');
    this._reachedFlash = 0; // 到达闪烁计时器

    // ── 罗盘画布初始化（带 DPR 缩放保证清晰）──
    this.compass = document.getElementById('compass');
    this._cctx = this.compass.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const csize = 120; // 匹配左侧紧凑布局
    this.compass.width = csize * dpr;
    this.compass.height = csize * dpr;
    this.compass.style.width = csize + 'px';
    this.compass.style.height = csize + 'px';
    this._cctx.scale(dpr, dpr);
    this._compassSize = csize;

    // 缓存目标方位供罗盘使用
    this._targetBearing = null;
    this._targetVisible = false;
    this.levelManager = null;
    this.current = null;

    // 水流信息（#current-info 已在 HTML 中预留）
    this._currentEl = document.getElementById('current-info');
    this._tackTimer = 0; // 换舷提示剩余显示时间（秒）
  }

  /** 注入关卡管理器与水流系统（由 main.js 调用） */
  setLevelManager(lm) { this.levelManager = lm; }
  setCurrent(c) { this.current = c; }

  setTarget(target) {
    this.target = target;
  }

  update() {
    const twa = calcTWA(this.boat.heading, this.wind.direction);
    const pos = pointOfSail(twa);

    // 基础仪表
    this.el.speed.textContent = this.boat.speed.toFixed(1);
    this.el.heading.textContent = String(Math.round(normalizeDeg(this.boat.heading))).padStart(3, '0');
    this.el.windDir.textContent = String(Math.round(this.wind.direction)).padStart(3, '0');
    this.el.windSpeed.textContent = this.wind.speed.toFixed(1);
    this.el.sailAngle.textContent = Math.round(this.sail.sailAngle);
    this.el.rudder.textContent = Math.round(this.boat.rudderAngle);
    this.el.twa.textContent = (twa >= 0 ? '+' : '') + Math.round(twa);

    // 调帆质量指示
    const tq = this.sail._lastTrimQuality ?? 0;
    if (tq > 0.8) {
      this.el.trimQuality.textContent = this._t('hud.trim.best');
      this.el.trimQuality.style.color = '#44ee66';
    } else if (tq > 0.5) {
      this.el.trimQuality.textContent = this._t('hud.trim.good');
      this.el.trimQuality.style.color = '#aadd55';
    } else if (tq > 0.25) {
      this.el.trimQuality.textContent = this._t('hud.trim.ok');
      this.el.trimQuality.style.color = '#ffaa44';
    } else {
      this.el.trimQuality.textContent = this._t('hud.trim.bad');
      this.el.trimQuality.style.color = '#ff5544';
    }

    this._showPointOfSail(pos.name);

    // 目标信息
    this._updateTarget();

    // 关卡 / 水流 / 碰撞
    this._updateLevelAndCurrent();

    // 当前帆所在侧（与模型一致）：sailSide>0 → 帆在左舷；sailSide<0 → 帆在右舷
    if (this.el.tackState) {
      const isPort = this.sail.sailSide > 0;
      this.el.tackState.textContent = isPort
        ? this._t('hud.tack.port') : this._t('hud.tack.starboard');
      this.el.tackState.classList.remove('port', 'starboard');
      this.el.tackState.classList.add(isPort ? 'port' : 'starboard');
    }
    // 换舷提示计时隐藏
    if (this._tackTimer > 0) {
      this._tackTimer -= 0.016;
      if (this._tackTimer <= 0 && this.el.tackToast) {
        this.el.tackToast.classList.remove('show');
        this.el.tackToast.classList.add('hidden');
      }
    }

    // 禁航区(顶风)警示：迎风角落在 no-go 区内时提示转向离开
    if (this.el.noGo) {
      const inNoGo = Math.abs(twa) < (this.sail.noGoZone + 3);
      if (inNoGo) {
        this.el.noGo.textContent = '⚠ ' + this._t('hud.noGo');
        this.el.noGo.classList.remove('hidden');
      } else {
        this.el.noGo.classList.add('hidden');
      }
    }

    // 罗盘（实时方向：船头 / 风来向 / 目标 / 禁航区）
    this._drawCompass(this.boat.heading, this.wind.direction);
  }

  /** 换舷时由 main.js 调用：弹出短暂提示 */
  onTack(side) {
    const el = this.el.tackToast;
    if (!el) return;
    const sideName = side > 0 ? this._t('hud.tack.port') : this._t('hud.tack.starboard');
    el.innerHTML = `<span class="tack-ico">⤴</span> ${this._t('hud.tack.toast')} <b>${sideName}</b>`;
    el.classList.remove('hidden');
    el.classList.add('show');
    this._tackTimer = 1.2;
  }

  _t(key) {
    return (typeof window !== 'undefined' && window.SAILING_I18N && window.SAILING_I18N.t)
      ? window.SAILING_I18N.t(key, window.SAILING_I18N.getLang())
      : key;
  }

  _updateTarget() {
    if (!this.target || !this.target.group.visible) {
      this.el.targetDist.textContent = '—';
      this.el.targetBearing.textContent = '—';
      this.el.targetDirect.textContent = '—';
      this._targetVisible = false;
      this._targetBearing = null;
      return;
    }

    const boatPos = { x: this.boat.position.x, z: this.boat.position.z };
    const dist = this.target.distanceTo(boatPos);
    const bearing = this.target.bearingFrom(boatPos);
    const direct = calcDirectReachable(bearing, this.wind.direction, this.sail.noGoZone);

    this.el.targetDist.textContent = Math.round(dist);
    this.el.targetBearing.textContent = String(Math.round(bearing)).padStart(3, '0');
    this._targetBearing = bearing;
    this._targetVisible = true;

    if (direct) {
      this.el.targetDirect.textContent = this._t('hud.direct');
      this.el.targetDirect.style.color = '#44ee66';
    } else {
      this.el.targetDirect.textContent = this._t('hud.indirect');
      this.el.targetDirect.style.color = '#ff6644';
    }

    // 到达闪烁
    if (this.target.reached) {
      this._reachedFlash += 0.05;
      this.el.targetReached.style.display = 'block';
      this.el.targetReached.style.opacity = 0.5 + 0.5 * Math.sin(this._reachedFlash * 6);
    } else {
      this.el.targetReached.style.display = 'none';
      this._reachedFlash = 0;
    }
  }

  /** 目标到达时调用 */
  onTargetReached() {
    this._reachedFlash = 0;
  }

  /** 关卡状态 + 水流信息 + 碰撞闪烁 */
  _updateLevelAndCurrent() {
    if (this.levelManager) {
      const s = this.levelManager.state;
      const name = s.levelNameKey ? this._t(s.levelNameKey) : (s.levelName || '—');
      this.el.levelName.textContent = name;
      const desc = s.levelDescKey ? this._t(s.levelDescKey) : '';
      if (this.el.levelDesc) {
        this.el.levelDesc.textContent = desc;
        this.el.levelDesc.style.display = desc ? 'block' : 'none';
      }
      if (s.timeLimit > 0) {
        this.el.timeLeft.textContent = Math.ceil(s.timeLeft);
        this.el.timeLeft.style.color = s.timeLeft < 20 ? 'var(--bad)' : '#fff';
      } else {
        this.el.timeLeft.textContent = this._t('hud.timeUnlimited');
        this.el.timeLeft.style.color = '#fff';
      }
      const hp = Math.max(0, Math.round(s.health));
      this.el.health.textContent = hp + '%';
      this.el.health.style.color = hp < 30 ? 'var(--bad)' : (hp < 60 ? 'var(--warn)' : '#fff');
    }
    if (this.current) {
      if (this.current.enabled && this.current.speed > 0) {
        this._currentEl.innerHTML =
          `<span class="label">${this._t('hud.current')}</span> <span class="value">${String(Math.round(this.current.direction)).padStart(3, '0')}</span>° ` +
          `<span class="value">${this.current.speed.toFixed(1)}</span> kn`;
      } else {
        this._currentEl.innerHTML = `<span class="label">${this._t('hud.current')}</span> <span class="muted">${this._t('hud.currentOff')}</span>`;
      }
    }
    if (this.levelManager && this.levelManager.colliding) {
      this.el.health.style.color = (Math.floor(performance.now() / 120) % 2) ? '#ff3b30' : '#fff';
    }
  }

  _showPointOfSail(text) {
    if (this._pointEl) {
      this._pointEl.innerHTML = `<span class="label">${this._t('hud.pointOfSail')}</span> <span class="value">${text}</span>`;
    }
  }

  /**
   * 绘制罗盘（北向上）。
   * 约定：罗盘方位角 0=北(上)，顺时针 90=东(右)，180=南(下)，270=西(左)
   * 与 HUD 中航向/风向/目标方位的绝对度数一致。
   * @param {number} heading 船头朝向（度，绝对）
   * @param {number} windDir 风来向（度，绝对）
   */
  _drawCompass(heading, windDir) {
    const ctx = this._cctx;
    const S = this._compassSize;
    const cx = S / 2, cy = S / 2;
    const R = S / 2 - 12; // 标记圆半径

    // 罗盘方位角 → 画布坐标（0=北→上，顺时针）
    const pos = (r, bearing) => {
      const a = (bearing - 90) * Math.PI / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };

    ctx.clearRect(0, 0, S, S);

    // 底盘
    ctx.fillStyle = 'rgba(6,14,30,0.72)';
    ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, Math.PI * 2); ctx.stroke();

    // 禁航区（风来向 ±noGoZone 红弧）——帆船驶不进去
    const noGo = this.sail.noGoZone || 30;
    const a1 = (windDir - noGo - 90) * Math.PI / 180;
    const a2 = (windDir + noGo - 90) * Math.PI / 180;
    ctx.fillStyle = 'rgba(255,70,70,0.20)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a1, a2);
    ctx.closePath();
    ctx.fill();

    // 刻度（每 30° 小线）
    ctx.strokeStyle = 'rgba(150,190,255,0.30)';
    ctx.lineWidth = 1;
    for (let d = 0; d < 360; d += 30) {
      const [x1, y1] = pos(R, d);
      const [x2, y2] = pos(R - (d % 90 === 0 ? 7 : 4), d);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // 方位字母 N/E/S/W
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labels = [['N', 0, '#ff6b6b'], ['E', 90, '#cfe0ff'], ['S', 180, '#cfe0ff'], ['W', 270, '#cfe0ff']];
    for (const [txt, brg, col] of labels) {
      const [lx, ly] = pos(R - 14, brg);
      ctx.fillStyle = col;
      ctx.fillText(txt, lx, ly);
    }

    // 风来向箭头（红色，尾在 rim，指向圆心 = 风从这里来）
    const [wx, wy] = pos(R - 2, windDir);
    const [wix, wiy] = pos(R * 0.42, windDir);
    ctx.strokeStyle = '#ff3b30';
    ctx.fillStyle = '#ff3b30';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wix, wiy); ctx.stroke();
    // 箭头（指向圆心）
    const wa = (windDir - 90) * Math.PI / 180;
    this._arrowHead(ctx, wix, wiy, wa, 6);

    // 船头朝向指针（蓝色，从圆心指向 heading）
    const [hx, hy] = pos(R - 6, heading);
    ctx.strokeStyle = '#4ea3ff';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
    this._arrowHead(ctx, hx, hy, (heading - 90) * Math.PI / 180, 7);

    // 圆心船标
    ctx.fillStyle = '#4ea3ff';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();

    // 目标方位（绿色三角标在 rim）—— 最后画，确保不被船头指针覆盖
    if (this._targetVisible && this._targetBearing != null) {
      const tb = this._targetBearing;
      // 外圈高亮圆点
      const [txo, tyo] = pos(R - 2, tb);
      ctx.fillStyle = 'rgba(57,230,115,0.45)';
      ctx.beginPath(); ctx.arc(txo, tyo, 9, 0, Math.PI * 2); ctx.fill();

      // 绿色实心三角
      const [tx, ty] = pos(R - 2, tb);
      ctx.fillStyle = '#39e673';
      ctx.beginPath();
      const ta = (tb - 90) * Math.PI / 180;
      const p1 = [tx + Math.cos(ta) * 10, ty + Math.sin(ta) * 10];
      const p2 = [tx + Math.cos(ta + 2.5) * 10, ty + Math.sin(ta + 2.5) * 10];
      const p3 = [tx + Math.cos(ta - 2.5) * 10, ty + Math.sin(ta - 2.5) * 10];
      ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]);
      ctx.closePath(); ctx.fill();
    }  }

  /** 在 (x,y) 处沿角度 angle(弧度) 画一个箭头（指向 angle 方向） */
  _arrowHead(ctx, x, y, angle, size) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * Math.cos(angle - 0.4), y - size * Math.sin(angle - 0.4));
    ctx.lineTo(x - size * Math.cos(angle + 0.4), y - size * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  }
}
