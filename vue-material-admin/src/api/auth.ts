import type { RouteMeta } from 'vue-router';
import { request } from './axios';
import type { RootInterface } from './axios';
import type { Role } from './role';

// 认证/权限相关接口：当前用户信息、当前用户菜单树、菜单管理接口都放在这里。
export const ApiAuth = {
    // 当前登陆用户的详情
    detail: (): Promise<RootInterface<CurrentUserDetail>> => request({ url: '/user/detail' }),

    // 获取当前用户可访问的菜单树。
    // 这里会先检查本地 accessToken，没有登录态就直接拒绝请求。
    curMenuTree: (): Promise<RootInterface<MenuInterface[]>> => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            return Promise.reject();
        }
        return request({
            url: '/role/permissions/tree',
        });
    },

    // 获取完整菜单树，通常用于菜单管理界面。
    menuTree: (): Promise<RootInterface<MenuInterface[]>> => {
        return request({
            url: '/permission/tree',
        });
    },

    // 编辑某个菜单节点。
    editMenu: (id: any, data: any): Promise<void> => {
        return request({
            url: '/permission/' + id,
            data,
            method: 'patch',
        });
    },

    // 新增菜单节点。
    addMenu: (data: any): Promise<void> => {
        return request({
            url: '/permission',
            data,
            method: 'post',
        });
    },
    /**
     * 删除菜单
     * @param id
     */
    // 删除菜单节点。
    delMenu: (id: any): Promise<void> => {
        return request({
            url: '/permission/' + id,
            method: 'delete',
        });
    },
};

export interface MenuInterface {
    id: number;
    // 菜单显示名。
    name: string;
    // 菜单唯一标识，前端这里会拿它当 route.name。
    code: string;
    icon_: string;
    type: string;
    type_: string;
    parentId?: any;
    // 路由路径，例如 /dashboard/smartHouse。
    path: string;
    redirect: any;
    icon: string;
    // 后端返回的组件路径，syncRouter 会根据这个路径映射到真实页面组件。
    component: any;
    layout?: string;
    keepAlive?: any;
    method?: any;
    description?: any;
    // 是否在侧边菜单中显示。
    show: boolean;
    enable: boolean;
    order: number;
    // 这是前端补充整理后的 vue-router meta 字段。
    meta?: RouteMeta | undefined;
    children?: MenuInterface[];
}

export interface CurrentUserDetail {
    createTime: string;
    currentRole: Role;
    enable: boolean;
    id: number;
    profile: Profile;
    roles: Role[];
    updateTime: string;
    username: string;
    // 允许后端额外返回未显式声明的字段。
    [property: string]: any;
}

export interface Profile {
    address: string;
    avatar: string;
    email: string;
    gender: number;
    id: number;
    nickName: string;
    userId: number;
}
