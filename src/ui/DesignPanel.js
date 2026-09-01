/**
 * DesignPanel — 可调设计参数面板
 *
 * 把风、水流、物理、关卡的所有关键数据暴露在 UI 上，方便 Ian 实时调整设计。
 * 改动即时生效（物理/风/水流）；点“应用”按当前参数重载本关（重置船/时间/血量/礁石）。
 */
export class DesignPanel {
  /**
   * @param {object} ctx { levelManager, wind, sail, boat, current, target, bodyEl, onApply, onReset }
   */
  constructor(ctx) {
    this.lm = ctx.levelManager;
    this.wind = ctx.wind;
    this.sail = ctx.sail;
    this.boat = ctx.boat;
    this.current = ctx.current;
    this.target = ctx.target;
    this.bodyEl = ctx.bodyEl;
    this.onApply = ctx.onApply || (() => {});
    this.onReset = ctx.onReset || (() => {});

    this.controls = this._defineControls();
    this._build();
  }

  _defineControls() {
    const { wind, sail, boat, current, target, lm } = this;
    return [
      // ---- 风 ----
      { groupKey: 'dp.group.wind', id: 'windDir', labelKey: 'dp.label.windDir', type: 'range', min: 0, max: 359, step: 1, unit: '°',
        get: () => Math.round(wind.direction),
        set: (v) => { wind.direction = v; wind.targetDirection = v; } },
      { groupKey: 'dp.group.wind', id: 'windSpeed', labelKey: 'dp.label.windSpeed', type: 'range', min: 0, max: 25, step: 0.5, unit: 'kn',
        get: () => wind.speed,
        set: (v) => { wind.speed = v; wind.targetSpeed = v; } },

      // ---- 水流 ----
      { groupKey: 'dp.group.current', id: 'curEnabled', labelKey: 'dp.label.curEnabled', type: 'checkbox',
        get: () => current.enabled, set: (v) => { current.enabled = v; } },
      { groupKey: 'dp.group.current', id: 'curDir', labelKey: 'dp.label.curDir', type: 'range', min: 0, max: 359, step: 1, unit: '°',
        get: () => Math.round(current.direction), set: (v) => { current.direction = v; } },
      { groupKey: 'dp.group.current', id: 'curSpeed', labelKey: 'dp.label.curSpeed', type: 'range', min: 0, max: 6, step: 0.1, unit: 'kn',
        get: () => current.speed, set: (v) => { current.speed = v; } },

      // ---- 物理 ----
      { groupKey: 'dp.group.physics', id: 'boatMass', labelKey: 'dp.label.boatMass', type: 'range', min: 100, max: 1200, step: 10, unit: '',
        get: () => boat.mass, set: (v) => { boat.mass = v; lm.physics.boatMass = v; } },
      { groupKey: 'dp.group.physics', id: 'dragCoeff', labelKey: 'dp.label.dragCoeff', type: 'range', min: 0.2, max: 3, step: 0.1, unit: '',
        get: () => boat.dragCoeff, set: (v) => { boat.dragCoeff = v; lm.physics.dragCoeff = v; } },
      { groupKey: 'dp.group.physics', id: 'rudderAuthority', labelKey: 'dp.label.rudderAuthority', type: 'range', min: 0.3, max: 2, step: 0.1, unit: '',
        get: () => boat.rudderAuthority, set: (v) => { boat.rudderAuthority = v; lm.physics.rudderAuthority = v; } },
      { groupKey: 'dp.group.physics', id: 'maxRudder', labelKey: 'dp.label.maxRudder', type: 'range', min: 10, max: 45, step: 1, unit: '°',
        get: () => boat.maxRudder, set: (v) => { boat.maxRudder = v; lm.physics.maxRudder = v; } },
      { groupKey: 'dp.group.physics', id: 'maxSailAngle', labelKey: 'dp.label.maxSailAngle', type: 'range', min: 30, max: 90, step: 1, unit: '°',
        get: () => sail.maxSailAngle, set: (v) => { sail.maxSailAngle = v; lm.physics.maxSailAngle = v; } },
      { groupKey: 'dp.group.physics', id: 'sailAreaDefault', labelKey: 'dp.label.sailAreaDefault', type: 'range', min: 0.3, max: 1, step: 0.05, unit: '',
        get: () => sail.sailArea, set: (v) => { sail.sailArea = v; lm.physics.sailAreaDefault = v; } },
      { groupKey: 'dp.group.physics', id: 'noGoZone', labelKey: 'dp.label.noGoZone', type: 'range', min: 15, max: 60, step: 1, unit: '°',
        get: () => sail.noGoZone, set: (v) => { sail.noGoZone = v; } },

      // ---- 关卡 ----
      { groupKey: 'dp.group.level', id: 'timeLimit', labelKey: 'dp.label.timeLimit', type: 'range', min: 0, max: 300, step: 5, unit: 's',
        get: () => lm.state.timeLimit, set: (v) => { lm.state.timeLimit = v; lm.state.timeLeft = v; } },
      { groupKey: 'dp.group.level', id: 'targetDist', labelKey: 'dp.label.targetDist', type: 'range', min: 150, max: 800, step: 10, unit: 'u',
        get: () => Math.round(Math.abs(target.group.position.z)), set: (v) => { target.setAt(0, -v); } },
    ];
  }

  _t(key) {
    return (typeof window !== 'undefined' && window.SAILING_I18N && window.SAILING_I18N.t)
      ? window.SAILING_I18N.t(key, window.SAILING_I18N.getLang())
      : key;
  }

  _build() {
    const body = this.bodyEl;
    body.innerHTML = '';
    let curGroup = null;
    let grpWrap = null;
    for (const c of this.controls) {
      const groupName = this._t(c.groupKey);
      if (groupName !== curGroup) {
        curGroup = groupName;
        const h = document.createElement('h4');
        h.textContent = curGroup;
        body.appendChild(h);
        grpWrap = document.createElement('div');
        grpWrap.className = 'grp';
        body.appendChild(grpWrap);
      }
      const row = document.createElement('div');
      row.className = 'dp-row';

      const label = document.createElement('label');
      label.textContent = this._t(c.labelKey);
      row.appendChild(label);

      let input, valEl;
      if (c.type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        valEl = document.createElement('span');
        valEl.className = 'dp-val';
      } else {
        input = document.createElement('input');
        input.type = 'range';
        input.min = c.min; input.max = c.max; input.step = c.step;
        valEl = document.createElement('span');
        valEl.className = 'dp-val';
      }
      input.addEventListener('input', () => {
        const v = c.type === 'checkbox' ? input.checked : parseFloat(input.value);
        c.set(v);
        this._renderVal(c, valEl, v);
      });
      row.appendChild(input);
      row.appendChild(valEl);
      grpWrap.appendChild(row);
      c._input = input;
      c._valEl = valEl;
    }
    this.syncFromState();
  }

  _renderVal(c, el, v) {
    if (c.type === 'checkbox') { el.textContent = v ? this._t('dp.on') : this._t('dp.off'); return; }
    const num = typeof v === 'number' ? v : parseFloat(v);
    const text = (c.step < 1) ? num.toFixed(1) : String(Math.round(num));
    el.textContent = text + (c.unit || '');
  }

  /** 关卡切换/重载后用当前实例值回填控件 */
  syncFromState() {
    for (const c of this.controls) {
      const v = c.get();
      if (c.type === 'checkbox') { c._input.checked = !!v; }
      else { c._input.value = v; }
      this._renderVal(c, c._valEl, v);
    }
  }

  /** 语言切换后重新构建面板 */
  rebuild() {
    this.controls = this._defineControls();
    this._build();
    this.syncFromState();
  }

  /** 收集当前面板值作为关卡覆盖 */
  collectOverrides() {
    const o = {};
    for (const c of this.controls) {
      const v = c.type === 'checkbox' ? c._input.checked : parseFloat(c._input.value);
      if (c.id === 'windDir') o.windDir = v;
      else if (c.id === 'windSpeed') o.windSpeed = v;
      else if (c.id === 'timeLimit') o.timeLimit = v;
      else if (c.id === 'targetDist') o.target = { z: -v };
      else if (c.id === 'curEnabled') o.current = o.current || {}, o.current.enabled = v;
      else if (c.id === 'curDir') (o.current = o.current || {}).dir = v;
      else if (c.id === 'curSpeed') (o.current = o.current || {}).speed = v;
      else if (c.id === 'boatMass') (o.physics = o.physics || {}).boatMass = v;
      else if (c.id === 'dragCoeff') (o.physics = o.physics || {}).dragCoeff = v;
      else if (c.id === 'rudderAuthority') (o.physics = o.physics || {}).rudderAuthority = v;
      else if (c.id === 'maxRudder') (o.physics = o.physics || {}).maxRudder = v;
      else if (c.id === 'maxSailAngle') (o.physics = o.physics || {}).maxSailAngle = v;
      else if (c.id === 'sailAreaDefault') (o.physics = o.physics || {}).sailAreaDefault = v;
      else if (c.id === 'noGoZone') (o.physics = o.physics || {}).noGoZone = v;
    }
    return o;
  }
}
