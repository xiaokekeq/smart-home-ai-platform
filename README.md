# 车家互联智能控制平台

一个基于 `Vue 3 + TypeScript + Pinia + FastAPI` 的车家互联智能控制平台，支持家庭设备控制、车辆状态管理、3D 车辆展示，以及 AI 助手对话与智能建议能力。

## 项目简介

本项目围绕“家庭设备 + 车辆设备 + AI 助手”的统一交互体验展开，主要包含以下能力：

- 首页总览：集中展示家庭状态、车辆状态、告警信息与 AI 建议
- 家居控制：灯光、窗帘、空调、摄像头、加湿器等设备控制
- 车辆控制：车内空调、车门、充电状态、车辆在线状态等管理
- 3D 展示：基于 `Three.js` 的车辆模型展示组件
- AI 助手：支持流式对话、Markdown 渲染、设备状态总结与命令执行反馈

## 技术栈

### 前端

- Vue 3
- TypeScript
- Pinia
- Vuetify
- Axios
- Three.js

### 后端

- FastAPI
- Pydantic
- OpenAI SDK / 兼容大模型接口

## 目录结构

```text
aiAssistance/
├─ vue-material-admin/      # 前端项目
├─ vue-material-backend/    # 后端项目
├─ LICENSE                  # 仓库许可证
├─ 开源说明.md              # 二次开发说明
└─ 项目面试复习-车家互联平台.md
```

## 主要亮点

### 1. 统一状态管理

前端基于 `Pinia` 分别管理环境状态、车辆状态与首页聚合状态，支持：

- 状态获取
- 局部更新
- 失败回滚
- 页面联动同步

### 2. AI 助手流式对话

AI 助手基于 `SSE` 实现流式返回，支持：

- 增量文本输出
- `start / chunk / done / error` 事件解析
- 消息逐段渲染
- 异常中断处理

### 3. Markdown 富文本渲染

前端支持对 AI 回复进行受控 Markdown 渲染，包含：

- 标题
- 列表
- 引用
- 行内代码
- 代码块
- 粗体 / 斜体 / 删除线

同时对原始内容进行转义处理，降低 XSS 风险。

### 4. 首页建议与智能联动

首页提供：

- 重点事项
- 告警提示
- AI 建议卡片
- 场景快捷入口

支持用户在首页直接执行常见操作，提升平台联动体验。

## 本地启动

### 1. 启动后端

进入后端目录：

```powershell
cd vue-material-backend
```

安装依赖：

```powershell
pip install -r requirements.txt
```

启动服务：

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

启动后端后，可通过以下地址检查服务是否正常：

```text
http://127.0.0.1:8000/api/health
```

### 2. 启动前端

进入前端目录：

```powershell
cd vue-material-admin
```

安装依赖：

```powershell
pnpm install
```

启动开发环境：

```powershell
pnpm run dev
```

### 3. 环境说明

当前前端开发环境中：

- `VITE_API` 使用 mock 接口
- `VITE_API_AI_BACKEND` 指向本地 AI 后端：

```env
VITE_API_AI_BACKEND=http://localhost:8000/api
```

## AI 模块说明

后端 `vue-material-backend/app/routers/ai.py` 主要负责：

- AI 对话
- 指令解析
- SSE 流式输出
- AI 建议生成

前端 `vue-material-admin/src/api/ai.ts` 与 `src/stores/useAiAssistant.ts` 负责：

- 流式请求发起
- SSE 事件解析
- assistant 消息状态维护
- Markdown 内容展示

## 开源与来源说明

本项目基于开源项目 `vue-material-admin` 二次开发。

- 上游项目：`armomu/vue-material-admin`
- 上游许可证：MIT License

更多说明见：

- [LICENSE](./LICENSE)
- [开源说明.md](./开源说明.md)

## 说明

本仓库当前以学习、练手、功能验证与面试项目沉淀为主，重点在于：

- 前后端联调能力
- 状态管理能力
- AI 助手能力接入
- 流式渲染与展示安全

