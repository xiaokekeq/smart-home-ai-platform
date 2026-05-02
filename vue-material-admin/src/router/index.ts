import { createRouter, createWebHashHistory } from 'vue-router';
import Layout from '@/layout/index.vue';
import { ApiAuth, type MenuInterface } from '@/api/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import localRoutes from './loca';

const router = createRouter({
    // 使用 hash 路由，URL 会带 #，部署简单，刷新页面时通常不需要服务端额外处理前端路由。
    history: createWebHashHistory(),
    // 每次切换路由后都回到页面顶部。
    scrollBehavior() {
        return { top: 0 };
    },
    routes: [
        {
            path: '/login',
            name: 'login',
            meta: {
                title: 'Login',
                icon: 'mdi-shield-account',
                visible: false,
            },
            component: () => import('@/views/login/login.vue'),
        },
        {
            // 兜底路由：匹配不到任何页面时跳转到 404。
            path: '/:pathMatch(.*)',
            redirect: '/404',
        },
        {
            path: '/404',
            name: 'NotFound',
            meta: { keepAlive: false },
            // 父级用 Layout 提供统一外壳，真正的内容页放在 children 中。
            component: Layout,
            children: [
                {
                    // 空路径表示默认子路由，访问 /404 时就会显示这个页面。
                    path: '',
                    name: 'd404',
                    meta: {
                        title: 'Not found',
                        visible: false,
                    },
                    component: () => import('@/views/feedback/no.vue'),
                    children: [],
                },
            ],
        },
    ],
});

export default router;

/**
 * 获取菜单树数据 将处理后的路由添加至路由表及菜单存储
 * @param toFirst 是否跳转第一个路由
 */
// 从接口拉取当前用户菜单树，并动态注册到前端路由里。
// toFirst 为 true 时，同步完成后会自动跳到第一个菜单页面。
// export async function syncRouter(toFirst = false) {
//     try {
//         const authEvent = useAuthStore();
//         // 重新同步前，先重置旧菜单，避免动态路由重复叠加。
//         authEvent.resetMenu();

//         // 获取当前用户可访问的菜单树和用户详情。
//         const res = await ApiAuth.curMenuTree();
//         const user = await ApiAuth.detail();

//         // 预收集 views 和 layout 下的页面模块，后面根据接口返回的 component 路径做映射。
//         const routeComponents = import.meta.glob('@/views/**/*.vue');
//         const layout = import.meta.glob('@/layout/index.vue');

//         traverseTree(res.data, async (item) => {
//             try {
//                 if (item.component === '/src/layout/index.vue') {
//                     item.component = layout[item.component];
//                 } else {
//                     item.component = routeComponents[item.component];
//                 }
//                 // 把后端菜单字段整理成 vue-router 需要的 meta 结构。
//                 item.meta = {
//                     title: item.name,
//                     icon: item.icon,
//                     visible: !!item.show,
//                 };
//                 // 用后端返回的 code 作为 route.name。
//                 item.name = item.code;
//             } catch (err) {
//                 console.log(err);
//             }
//         });

//         // 取菜单数组里的第一个路由，登录成功时会拿它作为默认落点。
//         const [route] = res.data;
//         res.data.forEach((item) => {
//             // 一边注册动态路由，一边同步到 Pinia 里的菜单状态。
//             router.addRoute(item);
//             authEvent.addMenu(item);
//         });

//         // 保存当前登录用户信息。
//         authEvent.setUserDetail(user.data);
//         if (toFirst) {
//             router.push(route.path);
//         }
//         return Promise.resolve(res.data);
//     } catch (err) {
//         console.log(err, '==================');
//         return Promise.resolve(false);
//     }
// }

export async function syncRouter(toFirst = false) {
    try {
        const authEvent = useAuthStore();
        authEvent.resetMenu();

        const routes = localRoutes;
        const [route] = routes;

        routes.forEach((item) => {
            router.addRoute(item);
            authEvent.addMenu(item);
        });

        if (toFirst && route?.redirect) {
            router.push(route.redirect as string);
        }

        return Promise.resolve(routes);
    } catch (err) {
        console.log(err, '==================');
        return Promise.resolve(false);
    }
}


function traverseTree(node: MenuInterface[], callback: (arg: MenuInterface) => void) {
    node.forEach((item: MenuInterface) => {
        // 对当前节点执行操作
        callback(item);
        if (item.children && Array.isArray(item.children)) {
            traverseTree(item.children, callback);
        }
    });
}
