/**
 * Sailing 网站 / 游戏 中英文切换脚本
 * 通过 data-i18n 属性自动替换文本；支持嵌套 key。
 * 在静态页面与游戏页通用。
 */
(function () {
  const DEFAULT_LANG = 'zh';
  const STORAGE_KEY = 'sailing-lang';

  const dict = {
    // ---------- 导航 ----------
    'nav.home': { zh: '首页', en: 'Home' },
    'nav.idea': { zh: '游戏概念', en: 'Game Idea' },
    'nav.domain': { zh: '领域知识', en: 'Domain' },
    'nav.system': { zh: '系统设计', en: 'System' },
    'nav.process': { zh: '开发过程', en: 'Process' },
    'nav.editor': { zh: '礁石编辑器', en: 'Rock Editor' },
    'nav.play': { zh: '▶ 开始游戏', en: '▶ Play' },

    // ---------- 主页 Hero ----------
    'hero.eyebrow': { zh: 'First Playable Web Game · 来自生活的游戏设计', en: 'First Playable Web Game · Design from Life' },
    'hero.title': { zh: '读懂风，才能航行', en: 'Read the Wind to Sail' },
    'hero.desc': { zh: '一艘小帆船不会朝你指的方向直行。它取决于风向、帆角、船向与速度——这正是这个游戏要让你“体验”的核心转变。',
      en: 'A small sailboat does not simply go where you point. It depends on wind direction, sail trim, heading, and speed — the core shift this game lets you experience.' },
    'hero.btnPlay': { zh: '▶ 立刻试玩', en: '▶ Play Now' },
    'hero.btnSystem': { zh: '查看系统设计', en: 'System Design' },

    // ---------- 游戏概念 ----------
    'idea.title': { zh: '游戏概念', en: 'Game Idea' },
    'idea.lead': { zh: '玩家驾驶一艘小帆船，在变化的风场中前往目标浮标。关键张力在于：风是唯一的动力，但风不总在你想去的方向。',
      en: 'The player pilots a small sailboat toward a target buoy in a changing wind field. The central tension: wind is the only power source, but it does not always blow where you want to go.' },
    'idea.goal.tag': { zh: '玩家目标', en: 'Player Goal' },
    'idea.goal.title': { zh: '抵达目标', en: 'Reach the Target' },
    'idea.goal.desc': { zh: '在限时内把船开到绿色浮标处，同时保持船体稳定、避开礁石与危险区。', en: 'Reach the green buoy within the time limit while keeping the boat stable and avoiding rocks.' },
    'idea.control.tag': { zh: '核心操作', en: 'Core Controls' },
    'idea.control.title': { zh: '转舵 · 调帆', en: 'Steer · Trim' },
    'idea.control.desc': { zh: '用 A/D 转舵、W/S 调帆，读懂风的来向并随时调整，让帆吃到最有效的风。', en: 'Use A/D to steer, W/S to trim sail; read the wind and adjust continuously for maximum efficiency.' },
    'idea.shift.tag': { zh: '学习转变', en: 'Learning Shift' },
    'idea.shift.title': { zh: '从“指向”到“读风”', en: 'From Pointing to Reading Wind' },
    'idea.shift.desc': { zh: '新手以为朝目标开就行；真正的航行是与风对话——读懂风、调好帆、走对路。', en: 'Novices think they can just aim at the target; real sailing is a dialogue with the wind.' },

    // ---------- 领域知识 ----------
    'domain.title': { zh: '领域知识：真实航海', en: 'Domain Knowledge: Real Sailing' },
    'domain.lead': { zh: '我曾参加一次初学者帆船课，意识到船并不会简单地去我想去的地方。它取决于风、帆角、船角和速度。',
      en: 'After a beginner sailing class, I realized the boat does not simply go where I want. It depends on wind, sail angle, heading, and speed.' },
    'domain.novice.tag': { zh: '新手误解', en: 'Novice Model' },
    'domain.novice.title': { zh: '“把船指向目标就能到达”', en: '"Point the boat at the target"' },
    'domain.novice.desc': { zh: '初学者把船开得离风太近、忘记调帆角，或在需要之字形航线时试图直行。结果船失速、帆拍打、路线漂离目标。',
      en: 'Beginners sail too close to the wind, forget to trim, or try to go straight when tacking is needed. The boat stalls, luffs, and drifts off course.' },
    'domain.expert.tag': { zh: '专家判断', en: 'Expert Model' },
    'domain.expert.title': { zh: '“读风并随之调整”', en: '"Read the wind and adjust"' },
    'domain.expert.desc': { zh: '有经验的船员知道：航行意味着读取风，并据此调整船、帆与航线。顶风时走之字形（tack），顺风时放开帆，正侧风最快但横倾最猛。',
      en: 'Experienced sailors read the wind and adjust boat, sail, and route. Tack upwind, ease sails downwind, and beware the heel on a beam reach.' },
    'domain.noviceModel': { zh: '新手的心智模型', en: 'Novice Mental Model' },
    'domain.noviceText': { zh: '“帆船 = 开车。我指向哪，船就去哪。只要舵打对，就能到目标。”', en: '"Sailing = driving. I point where I want to go, and the boat goes there."' },
    'domain.expertModel': { zh: '专家的心智模型', en: 'Expert Mental Model' },
    'domain.expertText': { zh: '“帆船 = 与风谈判。我看风向，决定帆角与航线，让风的力沿着我想要的方向累积。”', en: '"Sailing = negotiating with the wind. I read its direction, choose sail angle and route, and let its force accumulate where I want to go."' },
    'domain.quote': { zh: '这个系统图的核心学习转变：', en: 'The core learning shift in this system diagram:' },

    // ---------- 系统设计 ----------
    'system.title': { zh: '系统设计', en: 'System Design' },
    'system.lead': { zh: '游戏系统由“环境数据 / 玩家可控数据 / 系统计算结果 / 反馈翻译 / 胜负条件 / 挑战预设”六部分构成。下面给出核心数据流与关卡预设。',
      en: 'The game system has six parts: environment data, player inputs, simulation outputs, feedback translation, win/loss conditions, and challenge presets.' },
    'system.caption': { zh: '系统图：玩家输入（转舵 / 调帆 / 选路 / 转向时机）→ 风场 + 水流 + 礁石 → 船速 / 漂移 / 稳定 / 距离 / 碰撞风险 → 反馈（帆拍、尾迹、横倾、航线漂离、风向变化）→ 胜负判定。',
      en: 'System: Player Input (rudder / trim / route / tack) → Wind + Current + Rocks → Speed / Drift / Stability / Distance / Risk → Feedback (luff, wake, heel, deviation, wind shift) → Win/Loss.' },
    'system.dataTitle': { zh: '核心数据与关卡预设', en: 'Core Data & Level Presets' },
    'system.table.cat': { zh: '类别', en: 'Category' },
    'system.table.field': { zh: '字段', en: 'Field' },
    'system.table.desc': { zh: '说明', en: 'Description' },
    'system.desc.wind': { zh: '风的来向与风速（低频漂移）', en: 'Wind direction and speed (low-frequency drift)' },
    'system.desc.current': { zh: '水流方向与速度（使船漂移）', en: 'Current direction and speed (causes drift)' },
    'system.desc.rocks': { zh: '礁石坐标（碰撞=扣血/失败）', en: 'Rock positions (collision = damage/loss)' },
    'system.desc.target': { zh: '终点、剩余时间、船体血量', en: 'Finish point, remaining time, hull health' },
    'system.desc.ctrl': { zh: '船向、帆角、航线选择、转向时机', en: 'Boat heading, sail angle, route choice, tack timing' },
    'system.desc.sim': { zh: '船速、侧漂、稳定、到目标距离、碰撞风险', en: 'Speed, drift, stability, distance to target, collision risk' },
    'system.desc.feedback': { zh: '帆拍→帆角低效；尾迹变短→减速；航线漂离→风/流推偏；横倾强→稳定下降', en: 'Luff → poor trim; shorter wake → slowing; deviation → wind/current push; strong heel → less stable' },
    'system.desc.feedback2': { zh: '把不可见数据变成可读反馈', en: 'Turn invisible data into readable feedback' },
    'system.challengeTitle': { zh: '挑战预设（Challenge Presets）', en: 'Challenge Presets' },
    'system.row.ctrl': { zh: '玩家可控', en: 'Player Control' },
    'system.row.sim': { zh: '系统计算', en: 'Simulation' },
    'system.row.feedback': { zh: '反馈翻译', en: 'Feedback' },
    'system.challengeTitle': { zh: '挑战预设（Challenge Presets）', en: 'Challenge Presets' },
    'system.lv1.tag': { zh: 'Level 1', en: 'Level 1' },
    'system.lv1.title': { zh: '横风初航', en: 'Crosswind Start' },
    'system.lv1.desc': { zh: '横风（crosswind）、无水流、无礁石。目标：到达终点。熟悉转舵与调帆的基本反馈。', en: 'Crosswind, no current, no rocks. Goal: reach the finish. Learn steering and sail trim feedback.' },
    'system.lv2.tag': { zh: 'Level 2', en: 'Level 2' },
    'system.lv2.title': { zh: '顶风限时', en: 'Headwind Time Trial' },
    'system.lv2.desc': { zh: '顶风（headwind）、限时到达。挑战：无法直行，必须走之字形（tack）抢风前进。', en: 'Headwind, time limit. Challenge: cannot sail straight; must tack upwind in zig-zags.' },
    'system.lv3.tag': { zh: 'Level 3', en: 'Level 3' },
    'system.lv3.title': { zh: '礁石迷宫', en: 'Rock Maze' },
    'system.lv3.desc': { zh: '横风、限时、路径上 >5 块礁石。挑战：在读懂风的同时规划避障航线。', en: 'Crosswind, time limit, more than 5 rocks on the route. Challenge: read the wind while avoiding obstacles.' },

    // ---------- 开发过程入口 ----------
    'processEntry.eyebrow': { zh: 'Development Process', en: 'Development Process' },
    'processEntry.title': { zh: '人机协作开发过程', en: 'Human–AI Collaboration' },
    'processEntry.lead': { zh: '本项目通过“原始交互日志 + 阶段反思”记录每一次有意义的人机协作。点击查看完整时间线。', en: 'This project records every meaningful human–AI collaboration through raw interaction logs and stage reflections.' },
    'processEntry.btn': { zh: '查看开发时间线 →', en: 'View Timeline →' },

    // ---------- 页脚 ----------
    'footer.line1': { zh: 'Sailing · First Playable Web Game · 使用 Three.js 构建（本地离线运行）· AI Agent: WorkBuddy', en: 'Sailing · First Playable Web Game · Built with Three.js (offline) · AI Agent: WorkBuddy' },
    'footer.home': { zh: '返回主页', en: 'Home' },
    'footer.play': { zh: '开始游戏', en: 'Play' },

    // ---------- 关卡名称（动态） ----------
    'levels.lv1.name': { zh: 'Level 1 · 横风初航', en: 'Level 1 · Crosswind Start' },
    'levels.lv1.desc': { zh: '横风（crosswind），无水流、无礁石。熟悉转舵与调帆的基本反馈，把船开到浮标。', en: 'Crosswind, no current, no rocks. Learn steering and sail-trim feedback; reach the buoy.' },
    'levels.lv2.name': { zh: 'Level 2 · 顶风限时', en: 'Level 2 · Headwind Trial' },
    'levels.lv2.desc': { zh: '顶风（headwind），目标在正前方却正对风来向。无法直行——必须走之字形（tack）抢风前进，限时到达。', en: 'Headwind: the target is straight upwind. Cannot sail straight — must tack in zig-zags within the time limit.' },
    'levels.lv3.name': { zh: 'Level 3 · 礁石迷宫', en: 'Level 3 · Rock Maze' },
    'levels.lv3.desc': { zh: '横风、限时，路径上散布 >5 块礁石。在读懂风的同时规划避障航线，抵达浮标。', en: 'Crosswind, time limit, more than 5 rocks on the route. Read the wind while planning an obstacle-free course.' },

    // ---------- 游戏页 HUD ----------
    'hud.speed': { zh: '航速', en: 'Speed' },
    'hud.heading': { zh: '航向', en: 'Heading' },
    'hud.windDir': { zh: '风向', en: 'Wind' },
    'hud.windSpeed': { zh: '风速', en: 'W.Spd' },
    'hud.current': { zh: '水流', en: 'Current' },
    'hud.currentOff': { zh: '关闭', en: 'Off' },
    'hud.target': { zh: '目标', en: 'Target' },
    'hud.bearing': { zh: '方位', en: 'Bearing' },
    'hud.direct': { zh: '可直航', en: 'Direct' },
    'hud.indirect': { zh: '逆风·需之字形', en: 'Tack Needed' },
    'hud.reached': { zh: '目标到达！', en: 'Target reached!' },
    'hud.pointOfSail': { zh: '航行', en: 'Point' },
    'hud.sailAngle': { zh: '帆角', en: 'Sail' },
    'hud.rudder': { zh: '舵角', en: 'Rudder' },
    'hud.twa': { zh: '迎风角', en: 'TWA' },
    'hud.trim': { zh: '调帆', en: 'Trim' },
    'hud.trim.best': { zh: '● 最佳', en: '● Best' },
    'hud.trim.good': { zh: '◎ 良好', en: '◎ Good' },
    'hud.trim.ok': { zh: '○ 偏差', en: '○ Fair' },
    'hud.trim.bad': { zh: '○ 失调', en: '○ Bad' },
    'hud.level': { zh: '关卡', en: 'Level' },
    'hud.timeLeft': { zh: '剩余时间', en: 'Time Left' },
    'hud.health': { zh: '船体', en: 'Hull' },
    'hud.timeUnlimited': { zh: '不限', en: 'Unlimited' },
    'hud.controls': { zh: '操作', en: 'Controls' },
    'hud.controlsHint': { zh: 'A/D 转舵（松手自动回正）· W/S 调帆 · Q/E 帆面积 · 空格 回正 · R 重开 · 穿过风时帆自动翻侧（换舷）', en: 'A/D steer (auto-center) · W/S trim · Q/E sail area · Space reset · R restart · sail auto-flips when crossing the wind (tack)' },
    'hud.tack': { zh: '帆侧', en: 'Sail Side' },
    'hud.tack.port': { zh: '左舷 Port', en: 'Port' },
    'hud.tack.starboard': { zh: '右舷 Stbd', en: 'Starboard' },
    'hud.tack.toast': { zh: '帆换侧', en: 'Sail Flip' },
    'hud.noGo': { zh: '顶风禁航区！转向离开，走之字形靠近目标', en: 'No-Go Zone! Turn away and tack toward the target' },

    // ---------- 游戏页覆盖层 ----------
    'levelSelect.eyebrow': { zh: 'First Playable · 选择关卡', en: 'First Playable · Choose Level' },
    'levelSelect.title': { zh: '读懂风，才能航行', en: 'Read the Wind to Sail' },
    'levelSelect.desc': { zh: '选一个挑战开始。目标：在限时内抵达绿色浮标，保持船体稳定、避开礁石。', en: 'Pick a challenge. Reach the green buoy within the time limit, keep the hull stable, avoid rocks.' },
    'levelSelect.start': { zh: '开始航行 →', en: 'Set Sail →' },
    'win.eyebrow': { zh: 'Arrived', en: 'Arrived' },
    'win.title': { zh: '🏁 抵达目标！', en: '🏁 Target Reached!' },
    'win.detail': { zh: '你读懂了风，把船开到了浮标。', en: 'You read the wind and brought the boat to the buoy.' },
    'win.detailDynamic': { zh: '关卡「{name}」完成：剩余时间 {time}，船体 {health}%。', en: 'Level "{name}" cleared: {time} remaining, hull {health}%.' },
    'win.next': { zh: '下一关 →', en: 'Next Level →' },
    'win.retry': { zh: '重玩本关', en: 'Replay' },
    'win.home': { zh: '返回主页', en: 'Home' },
    'lose.eyebrow': { zh: 'Failed', en: 'Failed' },
    'lose.title': { zh: '⚓ 任务失败', en: '⚓ Mission Failed' },
    'lose.detail': { zh: '时间耗尽或船体受损。', en: 'Time ran out or the hull was damaged.' },
    'lose.detailDynamic': { zh: '失败原因：{reason}。再读一次风，调整帆与航线。', en: 'Reason: {reason}. Read the wind again and adjust sail & route.' },
    'lose.retry': { zh: '再试一次', en: 'Try Again' },
    'lose.home': { zh: '返回主页', en: 'Home' },

    // ---------- 设计面板 ----------
    'dp.title': { zh: '设计面板', en: 'Design Panel' },
    'dp.collapse': { zh: '收起', en: 'Collapse' },
    'dp.toggle': { zh: '⚙ 设计', en: '⚙ Design' },
    'dp.group.wind': { zh: '风 Wind', en: 'Wind' },
    'dp.label.windDir': { zh: '风向', en: 'Wind Dir' },
    'dp.label.windSpeed': { zh: '风速', en: 'Wind Spd' },
    'dp.group.current': { zh: '水流 Current', en: 'Current' },
    'dp.label.curEnabled': { zh: '启用', en: 'Enabled' },
    'dp.label.curDir': { zh: '流向', en: 'Dir' },
    'dp.label.curSpeed': { zh: '流速', en: 'Spd' },
    'dp.on': { zh: '开', en: 'On' },
    'dp.off': { zh: '关', en: 'Off' },
    'dp.group.physics': { zh: '物理 Physics', en: 'Physics' },
    'dp.label.boatMass': { zh: '船质量', en: 'Mass' },
    'dp.label.dragCoeff': { zh: '水阻', en: 'Drag' },
    'dp.label.rudderAuthority': { zh: '舵效', en: 'Rudder' },
    'dp.label.maxRudder': { zh: '最大舵角', en: 'Max Rudder' },
    'dp.label.maxSailAngle': { zh: '最大帆角', en: 'Max Sail' },
    'dp.label.sailAreaDefault': { zh: '默认帆面积', en: 'Sail Area' },
    'dp.label.noGoZone': { zh: '禁航区', en: 'No-Go' },
    'dp.group.level': { zh: '关卡 Level', en: 'Level' },
    'dp.label.timeLimit': { zh: '限时', en: 'Time Limit' },
    'dp.label.targetDist': { zh: '目标距离', en: 'Distance' },
    'dp.reset': { zh: '重置关卡', en: 'Reset' },
    'dp.apply': { zh: '应用', en: 'Apply' },
    'dp.hint': { zh: '改动即时生效（物理/风/水流）。点“应用”会按当前参数重载本关。', en: 'Changes apply live (physics/wind/current). "Apply" reloads the level with current values.' },

    // ---------- 过程页 ----------
    'process.title': { zh: '人机协作开发时间线', en: 'Human–AI Development Timeline' },
    'process.subtitle': { zh: '本项目通过“原始交互日志 + 阶段反思”记录每一次有意义的人机协作。下方为精选手时间线，完整记录见', en: 'This project records every meaningful human–AI collaboration through raw interaction logs and stage reflections. A curated timeline is below; the full log is at' },
    'process.fullLog': { zh: 'agent-development-log.md', en: 'agent-development-log.md' },
    'process.phase0': { zh: '阶段 0 · 项目初始化', en: 'Phase 0 · Init' },
    'process.p0.title': { zh: '从设计 Brief 出发', en: 'From the Design Brief' },
    'process.p0.req': { zh: '学生请求：', en: 'Student request:' },
    'process.p0.text': { zh: '基于 development-brief.md（Sailing First Playable Web Game Brief）与系统图，启动一个帆船教学游戏。', en: 'Based on development-brief.md (Sailing First Playable Web Game Brief) and the system diagram, start a sailing teaching game.' },
    'process.p0.l1': { zh: '确立核心学习转变：新手“指向目标”，专家“读风并调整船/帆/航线”。', en: 'Established core learning shift: novices point at the target, experts read the wind and adjust boat/sail/route.' },
    'process.p0.l2': { zh: '确立核心循环：观察 → 判断 → 行动 → 反馈 → 调整。', en: 'Established core loop: observe → decide → act → feedback → adjust.' },
    'process.p0.l3': { zh: '技术选择：首个可玩原型采用 Three.js + Vite（后于本次重构改为本地离线运行）。', en: 'Tech choice: first playable prototype used Three.js + Vite (later refactored to offline static run).' },
    'process.phase1': { zh: '阶段 1 · 可玩原型', en: 'Phase 1 · Playable Prototype' },
    'process.p1.title': { zh: '3D 航海模拟原型跑通核心循环', en: '3D Sailing Simulation Core Loop' },
    'process.p1.impl': { zh: 'Agent 实现：', en: 'Agent implemented:' },
    'process.p1.text': { zh: '搭建场景/海面/天空、帆船模型、风场、帆空气动力、船体动力学、第三人称相机、HUD 与罗盘。', en: 'Built scene/ocean/sky, sailboat model, wind field, sail aerodynamics, boat dynamics, third-person camera, HUD and compass.' },
    'process.p1.l1': { zh: '风场（来向+风速，低频漂移）、帆效率曲线、横倾、船体积分。', en: 'Wind field (direction + speed, low-frequency drift), sail efficiency curve, heel, boat integration.' },
    'process.p1.l2': { zh: '操作映射：A/D 转舵、W/S 调帆、Q/E 帆面积、空格回正。', en: 'Controls: A/D steer, W/S trim, Q/E sail area, Space reset.' },
    'process.p1.l3': { zh: 'HUD 显示航速/航向/风向/帆角/舵角/迎风角/调帆质量；罗盘显示禁航区、目标方位、风来向。', en: 'HUD shows speed/heading/wind direction/sail angle/rudder angle/TWA/trim quality; compass shows no-go zone, target bearing, wind direction.' },
    'process.p1.l4': { zh: '随机目标浮标 + “目标到达”反馈。', en: 'Random target buoy + "target reached" feedback.' },
    'process.p1.test': { zh: '测试：', en: 'Test:' },
    'process.p1.testText': { zh: '核心循环可在浏览器运行；但缺少关卡、限时、胜负、水流、礁石、展览网站与开发日志。', en: 'Core loop ran in browser; missing levels, time limit, win/loss, current, rocks, exhibition website, and dev log.' },
    'process.reflection1': { zh: '覆盖 Interaction 01–02', en: 'Covers Interaction 01–02' },
    'process.r1.title': { zh: '第一个可玩循环完成', en: 'First Playable Loop Complete' },
    'process.r1.l1': { zh: '游戏变化：玩家可转舵调帆、看到风/帆/船的实时反馈。', en: 'Game change: player can steer and trim, seeing real-time wind/sail/boat feedback.' },
    'process.r1.l2': { zh: 'AI 帮助：把“调帆→推力”的效率曲线做得足够陡峭，让调帆好坏有数量级差异。', en: 'AI help: made the trim-to-thrust efficiency curve steep enough that good vs. bad trim differs by an order of magnitude.' },
    'process.r1.l3': { zh: '设计方向：原型偏“真实模拟”，与 brief 的“first playable、面向学习”有偏差——缺少明确挑战与胜负。', en: 'Design direction: prototype leaned toward "realistic simulation", deviating from brief\'s "first playable, learning-focused" — lacked clear challenges and win/loss.' },
    'process.r1.l4': { zh: '与核心转变的关系：已能体现“调帆影响速度”，但尚未强制玩家“读风选路”。', en: 'Relation to core shift: showed "trim affects speed", but did not yet force the player to "read the wind and choose route".' },
    'process.r1.pending': { zh: '待学生反思：当前游戏是否让你体验到“读风而非指向目标”？哪些 AI 建议被你接受/修改？', en: 'Pending student reflection: Does the game make you feel "read wind, not just point"? Which AI suggestions were accepted/changed?' },
    'process.phase2': { zh: '阶段 2 · 系统化重构（本次）', en: 'Phase 2 · Systematic Refactor' },
    'process.p2.title': { zh: '面向成果展示的改造', en: 'Toward Exhibition-Ready' },
    'process.p2.req': { zh: '学生请求：', en: 'Student request:' },
    'process.p2.text': { zh: '保留 3D 效果，但补齐展览网站、关卡/挑战、胜负、水流/礁石、开发日志；并把数据暴露在 UI 上方便调整设计。', en: 'Keep 3D, but add exhibition website, levels/challenges, win/loss, current/rocks, dev log; expose data in UI for design tuning.' },
    'process.p2.l1': { zh: 'Three.js 本地化（vendoring + importmap），去除 Vite/npm 运行依赖，支持离线静态运行。', en: 'Three.js localized via vendoring + importmap, removing Vite/npm runtime dependency for offline static use.' },
    'process.p2.l2': { zh: '新增 index.html 主页、game.html 游戏页、process.html 过程页、styles.css 共享样式。', en: 'Added index.html home, game.html game page, process.html process page, styles.css shared styles.' },
    'process.p2.l3': { zh: '新增 Level 1–3 关卡预设（横风 / 顶风限时 / 横风限时+礁石）。', en: 'Added Level 1–3 presets (crosswind / headwind time trial / crosswind + rocks).' },
    'process.p2.l4': { zh: '新增胜负系统：倒计时、船体血量、Win / Game Over 面板。', en: 'Added win/loss system: countdown, hull health, Win / Game Over panels.' },
    'process.p2.l5': { zh: '新增水流系统（WaterCurrent）与礁石系统（RockField），含碰撞检测。', en: 'Added water current system (WaterCurrent) and rock system (RockField) with collision detection.' },
    'process.p2.l6': { zh: '新增设计面板（DesignPanel），实时暴露并调整风/水流/物理/关卡参数。', en: 'Added design panel (DesignPanel) exposing and adjusting wind/current/physics/level parameters in real time.' },
    'process.p2.l7': { zh: '补齐 agent-development-log.md 与 submission-manifest.json。', en: 'Completed agent-development-log.md and submission-manifest.json.' },
    'process.p2.test': { zh: '测试：', en: 'Test:' },
    'process.p2.testText': { zh: '本地静态服务器联调中；各页面与资源相对路径可达。', en: 'Local static server testing in progress; all pages and assets reachable.' },
    'process.reflection2': { zh: '覆盖 Interaction 03', en: 'Covers Interaction 03' },
    'process.r2.title': { zh: '成果展示结构就绪', en: 'Exhibition Structure Ready' },
    'process.r2.l1': { zh: '游戏变化：从“无限随机浮标”变为“有目标、限时、避障、胜负”的关卡式学习。', en: 'Game change: from infinite random buoys to level-based learning with goals, time limits, obstacles, and win/loss.' },
    'process.r2.l2': { zh: 'AI 影响：重构将技术原型推向 brief 要求的提交/展览形态。', en: 'AI impact: refactor pushed technical prototype toward the submission/exhibition form required by the brief.' },
    'process.r2.l3': { zh: '与核心转变的关系：Level 2（顶风限时）强制玩家走之字形，直接对应“读风而非指向目标”。', en: 'Relation to core shift: Level 2 (headwind time trial) forces tacking, directly mapping "read wind, not point".' },
    'process.r2.pending': { zh: '待学生反思：Level 2/3 的难度是否合适？设计面板暴露的参数是否足够你调整？是否要加入“航迹 vs 计划航线”对比反馈？', en: 'Pending student reflection: Are Level 2/3 difficulties appropriate? Are exposed design parameters enough? Should we add "track vs planned route" comparison?' },
    'process.fullRecord': { zh: '完整逐条记录（含失败、调试、决策）见', en: 'Full record (including failures, debugging, decisions) at' },
    'process.play': { zh: '▶ 去试玩最新版本', en: '▶ Try Latest' },

    // ---------- 过程页 阶段 3 ----------
    'process.phase3': { zh: '阶段 3 · UI 打磨与可读性', en: 'Phase 3 · UI Polish & Readability' },
    'process.p3.title': { zh: '基于试玩的界面与可读性迭代', en: 'Playtest-driven UI & Readability Iteration' },
    'process.p3.req': { zh: '学生请求：', en: 'Student requests:' },
    'process.p3.text': { zh: '用真实系统图替换占位图；全站中英文切换；将 HUD 从右侧移到左侧并整合为单一面板；增强目标浮标可见性；修正罗盘目标标记并补充关卡说明。', en: 'Replace placeholder with the real system graph; add site-wide 中/EN switching; move HUD from right to left and merge into one panel; boost target-buoy visibility; fix the compass target marker and add a level description.' },
    'process.p3.l1': { zh: '系统图改用学生上传的“Sailing - Ian”设计图（Interaction 04）。', en: 'System graph now uses the student-uploaded “Sailing - Ian” design image (Interaction 04).' },
    'process.p3.l2': { zh: '新增 assets/i18n.js，全站文本与游戏 HUD/设计面板/胜负层支持中英切换并记忆语言（Interaction 05）。', en: 'New assets/i18n.js enables 中/EN switching across site text, game HUD, design panel and overlays, with language memory (Interaction 05).' },
    'process.p3.l3': { zh: 'HUD 整合为左侧单面板（关卡/导航/目标/帆舵/罗盘），不再遮挡场景与设计面板（Interaction 06–07）。', en: 'HUD merged into one left panel (level/nav/target/sail-rudder/compass), no longer blocking the scene or the design panel (Interaction 06–07).' },
    'process.p3.l4': { zh: '目标浮标增大、改高对比亮色 + 远处 Sprite 标记 + 光柱；罗盘补回绿色目标方位标记（Interaction 08–09）。', en: 'Target buoy enlarged with high-contrast colors + distant sprite marker + light beam; compass regained its green target-bearing marker (Interaction 08–09).' },
    'process.p3.test': { zh: '测试：', en: 'Test:' },
    'process.p3.testText': { zh: '全部 JS 语法检查通过；LevelManager 逻辑测试 12/12；各页面与资源经本地静态服务器返回 200。', en: 'All JS syntax checks pass; LevelManager logic tests 12/12; all pages and assets return 200 via local static server.' },
    'process.reflection3': { zh: '覆盖 Interaction 04–13', en: 'Covers Interaction 04–13' },
    'process.r3.title': { zh: '可读性、反馈与关卡节奏到位', en: 'Readability, Feedback & Level Pacing in Place' },
    'process.r3.l1': { zh: '游戏变化：界面不再遮挡场景；目标与罗盘信息清晰可辨；换舷现在带帆的甩动动画、左右舷航行灯与 HUD 颜色反馈，肉眼可见；中英观众均可访问。', en: 'Game change: UI no longer blocks the scene; target and compass info are clearly legible; tacking now has a sail-swing animation, port/starboard navigation lights, and HUD color feedback; accessible to both Chinese and English audiences.' },
    'process.r3.l2': { zh: 'AI 帮助：连续多轮根据截图反馈快速迭代 HUD 布局、可读性、目标可见性与换舷动作可感知性。', en: 'AI help: multiple fast iteration rounds on HUD layout, readability, target visibility, and tack perceptibility from screenshot feedback.' },
    'process.r3.l3': { zh: '与核心转变的关系：界面清理后玩家注意力回到“读风与航线”；换舷动作的清晰反馈让“专家看风而非只看目标”更易被感知。', en: 'Relation to core shift: with UI out of the way, attention returns to “reading wind & route”; clear tack feedback makes the “expert reads wind, not just target” shift more perceivable.' },
    'process.r3.pending': { zh: '⏳ 待学生反思：现在换舷动作是否清晰可见？航行灯（左红右绿）是否有帮助？是否要加入“航迹 vs 计划航线”对比反馈？', en: '⏳ Pending student reflection: Is the tack now clearly visible? Do the port/starboard lights help? Add a “track vs planned route” comparison?' },
    'process.phase3t': { zh: '阶段 3 · 换舷机制', en: 'Phase 3 · Tacking' },
    'process.p3t.title': { zh: '自动换舷：帆过风自动翻侧', en: 'Auto-Tack: Sail Flips Across Wind' },
    'process.p3t.req': { zh: '学生决定：', en: 'Student decision:' },
    'process.p3t.text': { zh: '保留 3D 与“读风/调帆”学习，采用方案 A：船穿过风时帆自动翻到背风侧，玩家只需转舵 + 微调。', en: 'Keep 3D and the “read wind / trim” learning; chose option A: when the boat crosses the wind, the sail auto-flips to leeward — the player only steers and trims.' },
    'process.p3t.l1': { zh: 'sailAngle 仅表示帆松开幅度，所在舷由 TWA 符号 + 15° 死区决定（避免禁航区内抖动误翻）。', en: 'sailAngle is now the eased-out magnitude only; the tack side is driven by TWA sign with a 15° deadband (no false flips in irons).' },
    'process.p3t.l2': { zh: 'Sailboat 据此镜像渲染帆；HUD 增加“舷 Tack”指示与换舷瞬间提示（视觉 + 轻微音效）。', en: 'Sailboat mirrors the sail; HUD adds a “Tack” indicator and a brief tack toast (visual + soft blip).' },
    'process.p3t.test': { zh: '测试：', en: 'Test:' },
    'process.p3t.testText': { zh: '换舷判定单测 14/14 通过；改文件语法检查通过；各资源 200。', en: 'Tack logic unit tests 14/14; syntax checks pass; all assets 200.' },

    'process.p3r.title': { zh: '礁石布局：从“岛屿”到“通道门”', en: 'Rock Layout: From Islands to a Gated Channel' },
    'process.p3r.req': { zh: '学生反馈：', en: 'Student feedback:' },
    'process.p3r.text': { zh: 'Level 3 礁石太大，应挡住帆船与目标之间的通道，但从起点仍能看到目标。', en: 'Level 3 rocks are too large; they should block the direct path from boat to target while still visible from the start.' },
    'process.p3r.l1': { zh: '半径从 22-26 缩小到 10-13，视觉上更像礁石而非岛屿。', en: 'Radius reduced from 22-26 to 10-13, making them look like rocks rather than islands.' },
    'process.p3r.l2': { zh: '在起点到目标 (0,0) → (0,-600) 的通道上布置 9 块礁石：中心线设第一道门，后续左右交错形成 S 形绕行路线。', en: '9 rocks placed along the (0,0) → (0,-600) channel: a central gate forces the player to choose a side, then alternating rocks create an S-shaped route.' },
    'process.p3r.l3': { zh: '两侧补小礁石压缩通道，但不完全封死；目标浮标的光柱与高度保证从起点可见。', en: 'Smaller rocks on both sides narrow the channel without sealing it; the buoy light beam keeps it visible from the start.' },
    'process.p3r.test': { zh: '测试：', en: 'Test:' },
    'process.p3r.testText': { zh: 'levels.js 语法检查通过；服务器返回 200；等待试玩校准。', en: 'levels.js syntax check passed; server returns 200; awaiting play-test calibration.' },

    'process.p3f.title': { zh: '换舷视觉反馈：从“听见”到“看见”', en: 'Tack Visual Feedback: From Heard to Seen' },
    'process.p3f.req': { zh: '学生反馈：', en: 'Student feedback:' },
    'process.p3f.text': { zh: '触发换舷后响了声，但风帆看起来仍在同一侧。', en: 'A blip sounded on tack, but the sail still seemed to be on the same side.' },
    'process.p3f.l1': { zh: 'Sailboat 加左右舷航行灯：左舷（port）= 红，右舷（starboard）= 绿，提供持续参照。', en: 'Sailboat now has port (red) and starboard (green) navigation lights as a constant reference.' },
    'process.p3f.l2': { zh: '换舷时帆做 0.35 秒“甩过中心线再回稳”的动画，而非硬切。', en: 'Tacking now plays a 0.35s sail swing animation across the centerline instead of an instant snap.' },
    'process.p3f.l3': { zh: 'HUD 舷指示按左红右绿着色，与航行灯一致。', en: 'HUD tack indicator is colored red/green to match the navigation lights.' },
    'process.p3f.test': { zh: '测试：', en: 'Test:' },
    'process.p3f.testText': { zh: '改动文件语法检查通过；本地静态服务器返回 200。', en: 'Changed files pass syntax check; local static server returns 200.' },

    'process.p3ff.title': { zh: '换舷约定校准：标签与视觉统一', en: 'Tack Convention Calibration' },
    'process.p3ff.req': { zh: '学生反馈：', en: 'Student feedback:' },
    'process.p3ff.text': { zh: 'TWA +165° 时 UI 显示 Port，但帆仍在右舷，标签与视觉不一致。', en: 'UI showed Port while the sail was still on the starboard side at TWA +165°.' },
    'process.p3ff.l1': { zh: '改为标准航海约定：TWA>0 = Starboard tack（帆在左舷），TWA<0 = Port tack（帆在右舷）。', en: 'Adopted standard sailing convention: TWA>0 = Starboard tack (sail on port), TWA<0 = Port tack (sail on starboard).' },
    'process.p3ff.l2': { zh: '修正 <code>src/main.js</code> 的 sailSide 符号映射与 <code>Sailboat.js</code> 的帆镜像渲染。', en: 'Fixed sailSide mapping in <code>src/main.js</code> and sail mirroring in <code>Sailboat.js</code>.' },
    'process.p3ff.l3': { zh: '更新相关注释，确保 HUD 标签、帆的视觉侧、真实航海术语三者一致。', en: 'Updated comments so HUD label, sail visual, and real sailing terms align.' },
    'process.p3ff.test': { zh: '测试：', en: 'Test:' },
    'process.p3ff.testText': { zh: '改动文件语法检查通过。', en: 'Changed files pass syntax check.' },

    'process.p3fff.title': { zh: 'HUD 帆侧：从航海术语到直观位置', en: 'HUD Sail Side: From Term to Visual Position' },
    'process.p3fff.req': { zh: '学生反馈：', en: 'Student feedback:' },
    'process.p3fff.text': { zh: 'TWA -26° 时 HUD 显示 Port，但帆仍在船的右侧；希望标签直接对应帆在模型上的位置。', en: 'HUD showed Port at TWA -26° but the sail was still on the right side of the boat; the label should match the visual position.' },
    'process.p3fff.l1': { zh: 'HUD 将“舷 Tack”改为“帆侧 / Sail Side”，并按帆的实际位置显示：帆在左舷标“左舷 Port”，帆在右舷标“右舷 Stbd”。', en: 'HUD changed “Tack” to “Sail Side” and labels the actual sail position: port when the sail is on the left, starboard when on the right.' },
    'process.p3fff.l2': { zh: '保留物理约定：TWA>0 时帆在左舷，TWA<0 时帆在右舷；仅调整文字映射使其与玩家直观一致。', en: 'Physics unchanged: sail is on the left when TWA>0 and on the right when TWA<0; only the label mapping was adjusted to match player intuition.' },
    'process.p3fff.l3': { zh: '换舷提示 toast 同步取反，颜色保持左红右绿，与航行灯一致。', en: 'Tack toast label mapping was also inverted; colors remain red=port and green=starboard to match navigation lights.' },
    'process.p3fff.test': { zh: '测试：', en: 'Test:' },
    'process.p3fff.testText': { zh: '改动文件语法检查通过；本地服务器返回 200。', en: 'Changed files pass syntax check; local server returns 200.' },

    'process.p3ffff.title': { zh: '帆镜像修正：真正翻到背风侧', en: 'Sail Mirror Fix: Flip to Leeward' },
    'process.p3ffff.req': { zh: '学生反馈：', en: 'Student feedback:' },
    'process.p3ffff.text': { zh: 'TWA +160° 时帆仍在船右侧（风来的同侧），模型没有反转。', en: 'At TWA +160°, the sail was still on the starboard side (same side as the wind); the model did not flip.' },
    'process.p3ffff.l1': { zh: '复现：用浏览器截图确认风向 090°/航向 000° 时，帆出现在右舷（风来向同侧），而非左舷（背风侧）。', en: 'Reproduced via browser screenshot: at wind 090°/heading 000°, the sail appeared on the starboard side (windward) instead of port (leeward).' },
    'process.p3ffff.l2': { zh: '修正：重新统一 sailSide 语义——sailSide>0 表示帆在左舷（port），sailSide<0 表示帆在右舷（starboard）；TWA>0 时 sailSide=+1，TWA<0 时 sailSide=-1。', en: 'Fix: unified sailSide semantics — sailSide>0 means sail on port (left), sailSide<0 means sail on starboard (right); TWA>0 sets sailSide=+1, TWA<0 sets sailSide=-1.' },
    'process.p3ffff.l3': { zh: '修正 `Sailboat.js` 镜像方向为 `sailSide>0 ? π : 0`，并把 HUD 的 `isPort` 判定改回 `sailSide > 0`。', en: 'Set Sailboat.js mirror to `sailSide>0 ? π : 0` and restored HUD `isPort` check to `sailSide > 0`.' },
    'process.p3ffff.test': { zh: '测试：', en: 'Test:' },
    'process.p3ffff.testText': { zh: 'node --check 全部通过；浏览器截图验证帆现在位于背风侧（与风来向相反）。', en: 'All changed files pass syntax check; browser screenshot confirms the sail is now on the leeward side (opposite to wind).' },

    'process.p3fffff.title': { zh: '换舷可见性再强化：橙色标记 + 冷却机制', en: 'Tack Visibility Boost: Orange Marker + Cooldown' },
    'process.p3fffff.req': { zh: '学生反馈：', en: 'Student feedback:' },
    'process.p3fffff.text': { zh: '仍旧没有看到模型有反转，希望帆的左右翻侧更明确。', en: 'Still did not see the model flip; make the left/right sail movement more obvious.' },
    'process.p3fffff.l1': { zh: '在帆后下角（clew）增加高对比度橙色发光标记球，帆翻侧时标记球从船的一侧明显移到另一侧。', en: 'Added a high-contrast glowing orange marker ball at the sail clew; when the sail flips, the marker clearly moves from one side of the boat to the other.' },
    'process.p3fffff.l2': { zh: '帆材质增加轻微自发光、横桁加粗，让帆在暗光海面更醒目。', en: 'Added slight emissive glow to the sail material and thickened the boom, making the sail more visible against the dark sea.' },
    'process.p3fffff.l3': { zh: '自动换舷由“15°死区”改为“0.45s 冷却”：船一旦穿过风帆立即翻到背风侧，避免在风眼前小角度徘徊时帆卡在错误侧。', en: 'Replaced the 15° dead-zone with a 0.45s cooldown: the sail flips immediately when the boat crosses the wind, preventing it from getting stuck on the wrong side while bobbing near the eye of the wind.' },
    'process.p3fffff.test': { zh: '测试：', en: 'Test:' },
    'process.p3fffff.testText': { zh: 'node --check 通过；浏览器截图验证风 090° 时帆/标记在左舷，风 270° 时帆/标记在右舷。', en: 'Syntax check passed; browser screenshots verified sail/marker on port at wind 090° and on starboard at wind 270°.' },

    'process.p3z.title': { zh: 'Level 2 顶风死锁修复：从“无法前进”到“抢风教学”', en: 'Level 2 Headwind Deadlock Fix: From Stuck to Beating' },
    'process.p3z.req': { zh: '学生反馈：', en: 'Student feedback:' },
    'process.p3z.text': { zh: 'Level 2 开局是顶风航向，但船无法前进，调整方向也很慢。', en: 'Level 2 starts into the wind, but the boat cannot move and turning is very slow.' },
    'process.p3z.l1': { zh: '根因：船初始航向正朝目标（TWA=0°）落在禁航区，推力几乎为零；速度≈0 时 BoatDynamics 的舵效 ∝ speed，导致完全无法转向。', en: 'Root cause: initial heading is directly toward the target (TWA=0°), landing in the no-go zone with almost zero thrust; with speed≈0, BoatDynamics rudder authority is proportional to speed, so the boat cannot turn at all.' },
    'process.p3z.l2': { zh: '转向速率加 25% 最低舵效下限，即使无速也能缓慢把船转出顶风区，打破死锁。', en: 'Added a 25% minimum rudder authority floor so the boat can slowly turn out of the no-go zone even at zero speed, breaking the deadlock.' },
    'process.p3z.l3': { zh: '关卡加载时若“朝目标方向”落在禁航区内，初始航向自动偏到抢风角（45°）一侧；Level 2 开局即可获得约 1.5 kn 航速。', en: 'On level load, if the bearing to the target falls inside the no-go zone, the initial heading is automatically offset to a close-hauled angle (45°); Level 2 now starts at ~1.5 kn.' },
    'process.p3z.l4': { zh: 'HUD 新增红色禁航区警示，罗盘红弧范围与物理 no-go zone 对齐，提示玩家“转向离开，走之字形靠近目标”。', en: 'HUD now shows a red no-go warning; the compass red arc is aligned with the physical no-go zone, prompting the player to turn away and tack toward the target.' },
    'process.p3z.test': { zh: '测试：', en: 'Test:' },
    'process.p3z.testText': { zh: 'node --check 全部通过；浏览器截图验证开局能前进、驶入顶风区后警示出现、转向离开后航速恢复。', en: 'All syntax checks pass; browser screenshots verified the boat moves at start, the warning appears in the no-go zone, and speed recovers after turning away.' },

    'process.reflection3': { zh: '覆盖 Interaction 04–17', en: 'Covers Interaction 04–17' },
    'process.r3.pending': { zh: '⏳ 待学生反思：现在“帆侧”标签是否一眼就能看出帆在左/右？自动换舷手感是否自然？是否要加入“航迹 vs 计划航线”对比反馈？', en: '⏳ Pending student reflection: Can you tell at a glance which side the sail is on from the “Sail Side” label? Does auto-tack feel natural? Add a “track vs planned route” comparison?' },

    // ---------- 通用 ----------
    'lang.zh': { zh: '中', en: 'CN' },
    'lang.en': { zh: 'EN', en: 'EN' },
  };

  function t(key, lang) {
    const entry = dict[key];
    return entry ? (entry[lang] || entry[DEFAULT_LANG]) : key;
  }

  function setLang(lang) {
    if (!['zh', 'en'].includes(lang)) lang = DEFAULT_LANG;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const text = t(key, lang);
      if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
        if (el.placeholder && el.dataset.i18nPlaceholder) {
          el.placeholder = t(el.dataset.i18nPlaceholder, lang);
        } else if (el.value && el.dataset.i18nValue) {
          el.value = t(el.dataset.i18nValue, lang);
        } else {
          el.textContent = text;
        }
      } else {
        el.textContent = text;
      }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle, lang);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder, lang);
    });
    window.dispatchEvent(new CustomEvent('sailing:i18n', { detail: { lang } }));
  }

  function toggle() {
    const current = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    setLang(current === 'zh' ? 'en' : 'zh');
  }

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  }

  window.SAILING_I18N = { t, setLang, toggle, getLang, dict };

  document.addEventListener('DOMContentLoaded', () => {
    // Language switcher buttons
    document.querySelectorAll('.lang-switch').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.lang;
        if (target) setLang(target);
        else toggle();
        updateLangButtons();
      });
    });
    setLang(getLang());
  });

  function updateLangButtons() {
    const lang = getLang();
    document.querySelectorAll('.lang-switch').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }
  window.addEventListener('sailing:i18n', updateLangButtons);
})();
