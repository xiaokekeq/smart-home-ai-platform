// import Layout from '@/layout/index.vue';

export default [
    {
        path: '/',
        redirect: '/overview',
        name: 'Dashboard',
        meta: {
            visible: true,
            title: '车家互联平台',
            icon: 'mdi-home-city-outline',
        },
        component: () => import('@/layout/index.vue'),
        children: [
            {
                path: '/overview',
                name: 'overview',
                meta: {
                    title: '首页总览',
                    icon: 'mdi-view-dashboard-outline',
                    keepAlive: false,
                    visible: true,
                },
                component: () => import('@/views/dashboard/overview.vue'),
            },
            {
                path: '/living-room',
                name: 'livingRoom',
                meta: {
                    title: '家居控制',
                    icon: 'mdi-sofa-outline',
                    keepAlive: false,
                    visible: true,
                },
                component: () => import('@/views/dashboard/smartHouse.vue'),
            },
            {
                path: '/vehicle-control',
                name: 'vehicleControl',
                meta: {
                    title: '车辆控制',
                    icon: 'mdi-car-electric-outline',
                    keepAlive: false,
                    visible: true,
                },
                component: () => import('@/views/dashboard/teslaModelS.vue'),
            },
            {
                path: '/ai-assistant',
                name: 'aiAssistant',
                redirect: '/overview',
                meta: {
                    title: 'AI 助手',
                    icon: 'mdi-robot-outline',
                    keepAlive: false,
                    visible: true,
                    menuAction: 'openAiDrawer',
                },
            },
        ],
    },
];
