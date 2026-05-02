现在就按“先主线、后支线”看，不要散着翻。

先看这一组，顺序别乱：

启动入口
main.ts
先搞清楚应用是怎么启动的，尤其是 syncRouter() 这一步。

路由入口
router/index.ts
这里很关键，这项目不是把所有页面直接写死在路由里，而是登录后通过接口动态加菜单和路由。

你后面真正要改的核心页面
smartHouse.vue
teslaModelS.vue
这两个就是你现在最该读的业务页，一个偏智能家居，一个偏智能汽车。

顺着核心页看它们依赖的子组件
Vr360.vue
Device.vue
AirConditioner.vue
EnergyUsed.vue
这里要看清楚哪些是纯展示，哪些后面能改成你的业务组件。

再看菜单和用户状态怎么来的
auth.ts
useAuthStore.ts
你后面改菜单、加 AI 助手入口，离不开这两块。

最后再看请求层
axios.ts
.env.development
这里只要先知道：接口基地址在哪，后面换你自己的 FastAPI 改哪里。

现在先不要优先看：

login.vue
index.html
各种零散 utils
一句话说，就是：

先看 main.ts -> router/index.ts -> smartHouse.vue -> teslaModelS.vue -> widgets -> auth/store -> axios

如果你愿意，我下一条可以直接带你先看 main.ts 和 router/index.ts，告诉你每一段代码到底在干什么。
