# NarrativeFlow · 通用叙事数据编辑器

基于 IR（中间表示）的通用叙事数据编辑器：**Excel 导入 → 列语义映射 → 可视化画布编辑 → 校验 → 导出 Unity 运行时 JSON**。

- 桌面壳：Tauri 2（Rust）
- 前端：React 18 + TypeScript + Vite 5 + Tailwind CSS
- 画布：FlowGram（@flowgram.ai/free-layout-editor 1.0.15）
- 数据：SheetJS（Excel 读取）、Zustand + zundo（状态与撤销/重做）、AJV（结构校验）

## 快速开始（新电脑）

1. 安装 Node.js LTS（https://nodejs.org，或 winget install OpenJS.NodeJS.LTS）
2. **双击 启动.bat** —— 脚本会自动：
   - 检查 Rust 工具链，缺失时自动静默安装（rustup + MSVC target）
   - 执行 npm install（依赖版本由 package-lock.json 锁定）
   - 运行 npm run tauri dev 启动应用（首次 Rust 编译需几分钟，之后有缓存会很快）

> 提示：Tauri 在 Windows 上需要 MSVC C++ 生成工具。若 rustup 安装后仍编译失败，
> 请安装 Visual Studio Build Tools 并勾选「使用 C++ 的桌面开发」工作负载。

## 功能总览

| 模块 | 说明 |
| --- | --- |
| 导入向导 | 四步流程：选文件 → 选 Sheet/表头行 → 列语义角色映射 → 预览确认 |
| 映射引擎 | Excel 行 → IR 节点/边/变量；条件/效果支持表达式或 JSON |
| 内置 Profile | 视觉小说标准（say/choice/branch/action/jump/end）、RPG 任务对话（含 quest/battle/变量系统） |
| FlowGram 画布 | 自由布局、端口连线、辅助线对齐吸附、一键自动布局、缩放/适应视图 |
| 属性面板 | 按节点类型定义动态渲染 10 种字段类型，含条件/效果可视化树编辑器 |
| 校验面板 | 14 条规则（重复 ID、缺失目标、未定义变量、类型不匹配等），点击定位 |
| 阅读模式 | IR 模拟解释器：变量监视、选项模拟、条件分支、历史回放 |
| 导出 | Unity 运行时 JSON（可剥离坐标/编辑期信息）；.nfproj 项目文件保存/加载 |
| 编辑 | 撤销/重做（Ctrl+Z / Ctrl+Shift+Z）、Ctrl+S 保存、Delete 删除选中、暗/亮主题切换 |

## 目录结构

- 启动.bat —— 一键启动（新电脑自动补齐环境）
- src/core/ —— 核心逻辑（零 UI 依赖）：ir / mapping / importer / validator / exporter
- src/features/ —— canvas / inspector / import / reader / validator / export
- src/store/ —— Zustand（项目状态 + UI 状态）
- src/components/ —— AppShell / Toolbar / SidePanel
- src-tauri/ —— Tauri 2 Rust 后端（文件读写/导出/最近项目）
- scripts/ —— 图标生成等辅助脚本

## 常用命令

    npm run dev          # 仅前端（浏览器调试，端口 1420）
    npm run tauri dev    # 完整桌面应用
    npm run build        # 前端生产构建
    npm run tauri build  # 桌面应用打包（NSIS 安装包）

## 数据流

Excel ──导入向导──▶ MappingProfile ──映射引擎──▶ NarrativeIR (Zustand)

画布与属性面板的修改实时同步回 IR；校验、阅读模式与导出器直接消费 IR。