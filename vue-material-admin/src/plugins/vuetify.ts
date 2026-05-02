// plugins/vuetify/vuetify.js
import type { Ref } from 'vue';
// 引入 Vuetify 的基础样式，不引的话很多组件样式不会正常显示。
import 'vuetify/styles';
// 创建 Vuetify 实例，后面在 main.ts 里通过 app.use(vuetify) 注册。
import { createVuetify } from 'vuetify';
// import * as components from 'vuetify/components';
// import * as directives from 'vuetify/directives';
// 引入 mdi 图标字体，v-icon 默认会使用这套图标。
import '@mdi/font/css/materialdesignicons.css';

// 统一导出项目使用的 Vuetify 实例。
export const vuetify = createVuetify({
    // components,
    // directives,
    // 全局主题配置。
    theme: {
        themes: {
            light: {
                dark: false,
                colors: {
                    primary: '#7F85F9', // #E53935 6B38FB 1C1E2C 7F85F9
                },
            },
        },
    },
    icons: {
        // 默认图标集是 mdi，所以模板里常写 mdi-wifi / mdi-menu 这种名字。
        defaultSet: 'mdi',
        // 额外图标集配置，当前项目没有扩展其他图标库，所以先留空。
        sets: {},
    },
});
// vuetify.theme.themes.value.light.colors.primary = '#E53935';

// 给表单 ref 用的类型，方便在 TS 里约束 validate / reset 等方法。
export interface VFormRef {
    items: Ref<any[]>;
    validate: () => Promise<{
        valid: boolean;
        errors: any[];
    }>;
    reset: () => void;
    resetValidation: () => void;
}
