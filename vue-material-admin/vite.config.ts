import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import Vuetify from 'vite-plugin-vuetify';
import VueJsx from '@vitejs/plugin-vue-jsx';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver, VuetifyResolver } from 'unplugin-vue-components/resolvers';

const devHost = process.env.VITE_DEV_HOST || '0.0.0.0';
const devPort = Number(process.env.VITE_DEV_PORT || process.env.PORT || 5173);

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    // base: '/vue-material-admin',
    plugins: [
        Vue(),
        // 组件自动导入
        Vuetify({ autoImport: { labs: true } }),
        VueJsx(), // 都用Vue还用什么JSX
        Components({
            resolvers: [ElementPlusResolver(), VuetifyResolver()],
            dts: 'typings/components.d.ts',
        }),
    ],
    server: {
        open: false,
        host: devHost,
        port: devPort,
        hmr: true,
    },
    optimizeDeps: {
        exclude: ['@babylonjs/havok'],
    },
    assetsInclude: ['**/*.gltf', '**/*.glb'],
    resolve: {
        alias: {
            // @ts-ignore
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
