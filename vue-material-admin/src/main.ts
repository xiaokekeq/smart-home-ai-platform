import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './styles/index.scss';
import App from './App.vue';
import router, { syncRouter } from './router';
// Vuetify 组件库实例，页面里的 v-btn / v-card / v-row 等组件都依赖它。
import { vuetify } from '@/plugins/vuetify';
// 注册 src/components 下的全局公共组件。
import registeComponent from './components';
// 注册全局自定义指令 v-liquidGlass。
import { setupLiquidGlassDirective } from './directives/liquidGlass';

// 创建 Vue 应用，App.vue 是最外层根组件。
const app = createApp(App);

// 注册全局组件。
registeComponent(app);
// 注册 Pinia，全局状态管理使用它。
app.use(createPinia());
// 注册 Vuetify 组件库。
app.use(vuetify);
// 注册液态玻璃效果指令。
setupLiquidGlassDirective(app);

// 先同步动态路由，再挂载应用。
// 这个项目一部分菜单和页面不是写死在前端，而是登录后从接口拉取再 addRoute。
syncRouter().then((res) => {
    app.use(router);
    if (!res) {
        // 没拿到可用路由时，通常表示未登录或 token 无效，跳回登录页。
        router.push('/login');
    }
    // 把应用挂到 index.html 里的 #app 节点上。
    app.mount('#app');
});
