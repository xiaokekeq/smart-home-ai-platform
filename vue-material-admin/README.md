<p align="center">
  <img width="200" src="https://gitee.com/chenhuajie/vue-material-admin/raw/master/src/assets/admin-logo.png">
</p>

<h1 align="center">
    Vue Material Admin
<div align="center">

![version](https://img.shields.io/badge/Vue-3.x-blue.svg)
![version](https://img.shields.io/badge/Vuetify-3.5.x-red.svg)
![version](https://img.shields.io/badge/Vite-5.x-green.svg)
![version](https://img.shields.io/badge/Nestjs-10.x-blue.svg)
![stars](https://img.shields.io/github/stars/armomu/vue-material-admin.svg?style=social&label=Stars)

</div>

</h1>


Vue Material Admin 是一个基于 `Vuetify` 组件的开源中后台系统模板，采用了` Nesjs + Vue3 + TypeScript` 全栈开发，项目前端UI视觉遵循 [Material Design](https://m3.material.io/) 的设计规范，并在 [Vuetify](https://vuetifyjs.com/zh-Hans/) 基础组件继续向上构建开发，对其进行了扩展和优化，旨在实现一个简洁、轻量化的中后台解决方案，项目目前阶段主要用于学习、功能展示和开发用例测试，同时也适合作为生产环境项目的启动模板，项目会保持更新、增加更多的功能和优化，欢迎大家来[Issue](https://github.com/armomu/vue-material-admin/issues)  💭💭💭 聊天交流 ➡️ ➡️ ➡️ 

> 由于更新了`液态玻璃`卡片模式并且设`置为默认`，增加了性能提示框切换回普通模式，大多数设备都是不到20帧的性能甚至更低，可以在`设置面板`切换为其它模式就行了，液态玻璃代码在 `src/directives/liquidGlass.ts`是一个指令，可以自行修改。

## ⛲ 技术栈

前端
- 🧺 框架: Vue3                                     
- 🌲 状态管理: Pinia
- 🌈 UI: Vuetify

服务器
- 💻 框架: Nest.js
- 🫙 数据库: MySQL、TypeORM
- 🍪 缓存: Redis

## 🌻 页面截图

<p align="center">
  <img width="49%" src="https://github.com/armomu/vue-material-admin/raw/master/src/assets/tesla.png">
  <img width="49%" src="https://github.com/armomu/vue-material-admin/raw/master/src/assets/smart_house.png">
  <img width="49%" src="https://github.com/armomu/vue-material-admin/raw/master/src/assets/edit_layer.png">
  <img width="49%" src="https://github.com/armomu/vue-material-admin/raw/master/src/assets/babylonjs.png">
</p>

## 🍭 在线预览

- 🌍 Vercel [https://vue-material-admin.vercel.app/](https://vue-material-admin-alpha.vercel.app/)


## 👊 TODO

1. 🍳 Vuetify 组件
    - ✅ Card
    - ✅ Form
    - ✅ Data Table
    - ✅ Calendar
    - ✅ Menu
    - ✅ Tree
    - loading...
2. 🐝 优化适配
    - ✅ 深色模式
    - ✅ 适配移动设备(大部分适配)
    - ✅ 主题颜色修改
    - ✅ 液态玻璃等...
3. 💻 服务器
    - ✅ Nest.js
    - ✅ MySQL、TypeORM、Redis
    - ✅ RBAC 权限控制

## 📑 本地开发

### Vue 前端

由于已经是配套了 `Nest.js` 服务端，本地开发环境接口使用了 [`apifoxmock`](https://nliq7vrniv.apifox.cn)模拟了服务器全部都接口，所以 `.env.development` 文件需要配置接口服务器地址 `VITE_API = https://apifoxmock.com/m1/5061937-4723200-default` 

如果想和服务端一起开发预览，请切换到 [Serve](https://github.com/armomu/vue-material-admin/tree/serve) 分支查看启动服务端教程，然后把 `.env.development` 文件服务器地址改为 `VITE_API = http://localhost:8085` 


```
git clone https://github.com/armomu/vue-material-admin.git

cd vue-material-admin

pnpm install

pnpm run dev

```

### Nest.js 服务端

切换 [Serve](https://github.com/armomu/vue-material-admin/tree/serve) 分支查看教程，接口文档 [https://nliq7vrniv.apifox.cn](https://nliq7vrniv.apifox.cn)

> 非常感谢 [zclzone](https://github.com/zclzone)大佬提供的Nestjs服务项目，让我快速搭建了这个模版的后台服务

