# Sailing — 读懂风，才能航行

一个基于 Web（Three.js）的**帆船教学游戏**：玩家转舵、调帆，在变化的风场中前往目标浮标。
核心学习转变：**Beginners think sailing means steering toward the target; experts know sailing means reading the wind and adjusting the boat, sail, and route in relation to it.**

## 如何运行（无需 npm / 无需联网）

> 游戏使用浏览器原生 ES Module + `importmap` 加载**本地** `assets/vendor/three.module.js`，
> 因此**不需要** `npm install`，也**不需要** Vite，且可完全离线运行。
> 注意：ES Module 不能用 `file://` 双击打开，必须经本地静态服务器。

```bash
# 在项目根目录执行其一：
python3 -m http.server 8000
# 或
npx serve .
```

然后浏览器打开：

- `http://localhost:8000/index.html` —— 项目网站（概念 / 领域知识 / 系统设计 / 开发过程）
- `http://localhost:8000/game.html` —— 游戏页（选关、HUD、设计面板）
- `http://localhost:8000/process.html` —— 开发过程时间线

（可选：如需用 Vite 开发，仍可用 `npm install && npm run dev`，但**运行版不依赖它**。）

## 操作

| 按键 | 功能 |
|------|------|
| `A` / `←` | 左舵（向左转，松开自动回正） |
| `D` / `→` | 右舵（向右转，松开自动回正） |
| `W` / `↑` | 收帆（帆角变小，更紧） |
| `S` / `↓` | 松帆（帆角变大，更松） |
| `Q` | 缩帆（减小帆面积） |
| `E` | 展帆（增大帆面积） |
| `Space` | 舵回正 |
| `R` | 重开本关 |

## 关卡（Challenge Presets）

| 关卡 | 风 | 限时 | 礁石 | 学习重点 |
|------|----|------|------|----------|
| Level 1 · 横风初航 | 横风 | 不限制 | 无 | 熟悉转舵/调帆反馈 |
| Level 2 · 顶风限时 | 顶风 | 150s | 无 | 必须走之字形（tack）抢风 |
| Level 3 · 礁石迷宫 | 横风 | 160s | >5 | 读风 + 规划避障航线 |

胜负：限时内抵达浮标且船体血量 > 0 即胜利；时间耗尽或船体损毁（触礁）即失败。

## 设计面板（实时调参）

游戏页右上角「设计面板」暴露 14 个可调参数，方便调整设计：

- **风**：风向、风速
- **水流**：启用、流向、流速（默认关闭，可在任意关卡开启）
- **物理**：船质量、水阻、舵效、最大舵角、最大帆角、默认帆面积、禁航区
- **关卡**：限时、目标距离

改动即时生效（物理/风/水流）；点「应用」按当前参数重载本关。修改后可在 `src/config/levels.js` 固化默认值。

## 项目结构

```
Sailing_WorkBuddy/
├── index.html                 # 项目网站主页（概念/领域/系统/过程导航）
├── game.html                  # 游戏页（importmap + HUD + 设计面板 + 覆盖层）
├── process.html               # 开发过程时间线页
├── styles.css                 # 共享航海主题样式
├── assets/
│   ├── vendor/three.module.js # 本地 Three.js（离线运行关键）
│   ├── system-graph.png       # 系统图（导出后放入）
│   └── preview.png            # 16:9 展览预览（截图后放入）
├── src/
│   ├── main.js                # 主循环：输入→风→帆→船→水流→关卡→相机→HUD
│   ├── config/levels.js       # Level 1–3 默认数据 + 物理默认值
│   ├── systems/
│   │   ├── WaterCurrent.js    # 水流（漂移）
│   │   ├── RockField.js       # 礁石（可视化 + 碰撞）
│   │   └── LevelManager.js    # 关卡加载/计时/血量/胜负
│   ├── scene/                 # SceneManager / Ocean / Sky / Trail / Wake
│   ├── physics/               # WindSystem / SailPhysics / BoatDynamics
│   ├── boat/                  # Sailboat / Target
│   ├── controls/              # InputController / CameraController
│   ├── ui/                    # HUD / DesignPanel
│   └── utils/math.js
├── agent-development-log.md   # 人机协作开发日志（按 brief §10）
├── submission-manifest.json   # 提交清单
├── docs/DESIGN.md             # 物理模型与设计文档
└── README.md
```

## 技术栈

- **3D 引擎**：Three.js r165（本地 `assets/vendor/three.module.js`，importmap 加载）
- **物理**：自研简化模型（帆空气动力 + 船体动力学），参数全部可调
- **渲染**：自定义 GLSL 海面/天空着色器
- **运行**：浏览器原生 ES Module + 静态服务器，无 npm/Vite 运行依赖

## 后续路线

- 导出 `assets/system-graph.png` 与 `preview.png`
- 校准 Level 2/3 难度
- 加入「计划航线 vs 实际航迹」对比反馈
- 运行 submission audit 并打包 `2026-Camp-Group-XX-Sailing.zip`
