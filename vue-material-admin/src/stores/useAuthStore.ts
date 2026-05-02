import { ref } from 'vue';
import { defineStore } from 'pinia';
import router from '@/router';
import { cloneDeep } from 'lodash';
import type { RouteRecordRaw } from 'vue-router';
import type { CurrentUserDetail } from '@/api/auth';
import type { Role } from '@/api/role';
import { ApiUser } from '@/api/user';

// 默认用户信息模板。
// 还没获取到真实用户数据时，先用这份结构兜底。
export const userInfoTemplate = {
    id: 0,
    username: '',
    enable: true,
    createTime: '',
    updateTime: '',
    profile: {
        id: 0,
        nickName: '',
        gender: 0,
        avatar: '',
        address: '',
        email: '',
        userId: 4,
    },
    roles: [] as Role[],
    currentRole: {
        id: 0,
        code: '',
        name: '',
        enable: true,
        permissionIds: [] as number[],
    },
};

// auth 是这个 store 的唯一 id。
// 这里主要管理菜单数据和当前登录用户信息。
export const useAuthStore = defineStore('auth', () => {
    // 初始菜单先取静态路由，后面再由 syncRouter 追加动态菜单。
    const menus = ref<RouteRecordRaw[]>(cloneDeep(router.options.routes) as RouteRecordRaw[]);

    // 向菜单列表中追加动态路由。
    const addMenu = (menu: RouteRecordRaw) => {
        menus.value.push(cloneDeep(menu));
    };
    /**
     * 重置菜单
     * 切换角色应该回出现BUG
     */
    // 重置为最初的静态路由状态，避免动态菜单重复叠加。
    const resetMenu = () => {
        menus.value = cloneDeep(router.options.routes) as RouteRecordRaw[];
    };

    // 当前登录用户详情。
    const userDetail = ref<CurrentUserDetail>(cloneDeep(userInfoTemplate));

    // 设置当前用户信息；不传参数时回退到默认模板。
    const setUserDetail = (data = cloneDeep(userInfoTemplate)) => {
        userDetail.value = data;
    };

    // 退出登录后同时清空 token，并强制刷新页面重置状态。
    const logout = async () => {
        await ApiUser.logout();
        localStorage.removeItem('accessToken');
        router.push('/login');
        location.reload();
    };

    return {
        menus,
        addMenu,
        resetMenu,
        userDetail,
        setUserDetail,
        logout,
    };
});
