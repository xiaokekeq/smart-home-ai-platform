import { reactive, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { vuetify } from '@/plugins/vuetify';
import { useStorage } from '@vueuse/core';

// useAppStore：管理整个应用的全局界面状态
// 这里主要负责移动端判断、主题切换、主题色和卡片风格等设置
export const useAppStore = defineStore('main', () => {
    // 初始化是否是移动端设备
    window.addEventListener('resize', () => {
        const res = getMobile();
        if (res !== isMobile.value) {
            isMobile.value = res;
        }
    });
    // 根据页面宽度判断当前是不是移动端
    const getMobile = () => {
        const rect = document.body.getBoundingClientRect();
        if (!document.hidden) {
            const res = rect.width - 1 < 777;
            return res;
        } else {
            return false;
        }
    };
    // isMobile：给页面和组件判断当前是否是小屏设备
    const isMobile = ref(getMobile());

    // 读取系统明暗主题偏好 window.matchMedia读取系统当前偏好的明暗主题。
    // 判断当前系统/浏览器是不是偏好深色主题 通常就是 true
    // matchMedia 这里是在问浏览器：
    // “用户系统当前是不是偏好 dark 主题？”
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', () => {
        theme.value = scheme.matches ? 'dark' : 'light';
    });
    // 根节点上挂一个 theme 属性，方便全局样式切换 light / dark
    // :root 基本就是页面最外层根节点（通常可以理解成 html）。
    // 给它加 theme 属性，是为了让 CSS 能直接根据根节点属性切换主题样式。
    const root = document.querySelector(':root');
    root?.setAttribute('theme', scheme.matches ? 'dark' : 'light');

    // theme：当前应用主题状态
    const theme = ref<'dark' | 'light'>('dark');
    // const theme = ref(scheme.matches ? 'dark' : 'light');

    // 切换主题：
    // 1. 传了值就直接切到指定主题
    // 2. 不传值就在 light / dark 之间切换
    const onTheme = (val?: 'dark' | 'light') => {
        if (typeof val === 'string') {
            theme.value = val;
        } else {
            theme.value = theme.value === 'light' ? 'dark' : 'light';
        }
        root?.setAttribute('theme', theme.value);
    };
    // 默认界面设置
    let obj: Settings = {
        welt: false,
        backgroundColor: '#ffffff',
        drawer: false,
        primary: '#7F85F9',
        cardStyle: 'shadow', // border // default //
        backgroundColors: ['#ffffff', '#f8f8f8', '#e5eaef'],
        fixedHeader: true,
        cursor: 'fluid',
        primaryColors: [
            '#7F85F9',
            '#2196F3',
            '#03A9F4',
            '#8E24AA',
            '#3F51B5',
            '#0A7EA4',
            '#01C0C8',
            '#8BC34A',
            '#CDDC39',
            '#F44336',
            '#FF5722',
            '#FA896B',
        ],
    };
    // 如果本地已经存过设置，就优先恢复本地缓存
    // localStorage 里取出来的是字符串，所以后面要配合 JSON.parse 还原成对象。
    const s = localStorage.getItem('appSettings');
    if (s) {
        obj = JSON.parse(s);
    }
    // settings：真正给页面使用的全局设置对象
    const settings: Settings = reactive({ ...obj });

    // 监听 settings，任意设置变化后都同步写回 localStorage
    watch(
        () => settings,
        () => {
            // localStorage 只能存字符串，所以这里要先 JSON.stringify
            localStorage.setItem('appSettings', JSON.stringify(settings));
        },
        {
            immediate: true,
            deep: true,
        }
    );
    // 打开/关闭设置抽屉
    const onDrawer = () => {
        settings.drawer = !settings.drawer;
    };

    // 修改全局背景色
    const onBackgroundColor = (val: string) => {
        settings.backgroundColor = val;
    };

    // 修改 Vuetify 主色，并同步更新 light / dark 两套主题
    // val 就是新的主题主色，例如 #2196F3
    // 这里不仅修改 settings 里的记录，也同步修改 Vuetify 的 light / dark 主题主色
    const onPrimary = (val: string) => {
        settings.primary = val;
        vuetify.theme.themes.value.light.colors.primary = val;
        vuetify.theme.themes.value.dark.colors.primary = val;
    };

    // 修改卡片风格
    // liquid-glass 时启用 fluid 光标，其它风格恢复默认光标
    // 最后刷新页面，让整套视觉风格重新生效
    // val: Settings['cardStyle'] 表示这个参数类型直接复用 Settings 接口里 cardStyle 的类型
    // 也就是只允许 shadow / border / liquid-glass / none 这几种值
    const onCardStyleChange = (val: Settings['cardStyle']) => {
        if (val === 'liquid-glass') {
            settings.cursor = 'fluid';
        } else {
            settings.cursor = 'default';
            // 把本地存储里的 frosted 标记重置为关闭状态
            localStorage.setItem('frosted', '0');
        }
        settings.drawer = false;
        location.reload();
    };

    return {
        theme,
        isMobile,
        onTheme,
        settings,
        onDrawer,
        onPrimary,
        onBackgroundColor,
        onCardStyleChange,
    };
});

// Settings：整个应用界面设置对象的类型定义
interface Settings {
    // 项目自定义的 welt 效果开关
    welt: boolean;
    // 全局鼠标样式模式
    cursor: 'default' | 'round' | 'fluid';
    // 页面背景色
    backgroundColor: string;
    // 右侧设置抽屉是否打开
    drawer: boolean;
    // 顶部是否固定
    fixedHeader: boolean;
    // 当前主色
    primary: string;
    // 卡片风格类型
    cardStyle: 'shadow' | 'border' | 'liquid-glass' | 'none';
    // 可选主色列表
    primaryColors: string[];
    // 可选背景色列表
    backgroundColors: string[];
}
