<template>
    <v-app
        :theme="mainStore.theme"
        :class="{
            ffbg: mainStore.settings.backgroundColor === '#ffffff',
            e5bg: mainStore.settings.backgroundColor === '#e5eaef',
            f8bg: mainStore.settings.backgroundColor === '#f8f8f8',
            welt: mainStore.settings.welt,
            shadowCard: mainStore.settings.cardStyle === 'shadow',
            borderCard: mainStore.settings.cardStyle === 'border',
            glassCard: mainStore.settings.cardStyle === 'liquid-glass',
            mobile: mainStore.isMobile,
        }"
    >
        <router-view />
        <v-snackbar
            v-for="(item, key) in snackbarEvent.items"
            v-model="item.visible"
            :timeout="item.timeout"
            :key="key"
            color="grey-darken-3"
        >
            {{ item.text }}
            <template v-slot:actions>
                <v-btn color="blue" variant="text" @click="item.visible = false"> Close </v-btn>
            </template>
        </v-snackbar>
        <HatefulMouse v-if="mainStore.settings.cursor === 'round'" />
        <FluidCursor v-if="mainStore.settings.cursor === 'fluid'" />
        <v-dialog v-model="dialog" width="570px">
            <v-card title="Performance has decreased.">
                <v-card-text>
                    The current liquid glass card design is causing performance issues. Should we
                    switch to a frosted glass card?
                </v-card-text>
                <v-card-actions>
                    <v-btn @click="dialog = false">Keep Liquid Glass</v-btn>
                    <v-btn color="primary" @click="onSwitch">Switch</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-app>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { RouterView } from 'vue-router';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSnackbarStore } from '@/stores/useSnackbarStore';
import router from './router';
import { checkVersion } from './plugins/pwa';
import { delay } from 'lodash';
const mainStore = useAppStore();
const useAuthEvent = useAuthStore();
const snackbarEvent = useSnackbarStore();
let flag = 0;
// router.beforeEach(async (to, from, next) => {
//     flag = 1;
//     if (useAuthEvent.userDetail.id <= 0 && to.path !== '/login') {
//         console.log(useAuthEvent.userDetail.id, 'useAuthEvent.userDetail.id');
//         next('/login');
//         location.reload();
//         return;
//     }
//     next();
//     const d = document.getElementById('_loading_');
//     d?.setAttribute('class', 'loading_ hide');
// });
router.beforeEach(async (to, from, next) => {
    flag = 1;
    next();
    const d = document.getElementById('_loading_');
    d?.setAttribute('class', 'loading_ hide');
});
const APP_TITLE = '车家互联平台';

router.afterEach((to) => {
    checkVersion();
    const pageTitle = typeof to.meta?.title === 'string' ? to.meta.title : '';
    document.title = pageTitle ? `${pageTitle} - ${APP_TITLE}` : APP_TITLE;
    delay(() => {
        flag = 0;
    }, 3000);
});

const dialog = ref(false);
const onSwitch = () => {
    if (localStorage.getItem('frosted') === '1') {
        mainStore.settings.cardStyle = 'shadow';
        mainStore.settings.cursor = 'default';
        mainStore.settings.drawer = false;
        location.reload();
        return;
    }
    localStorage.setItem('frosted', '1');
    dialog.value = false;
    mainStore.onCardStyleChange('liquid-glass');
};
(function () {
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 60; // 初始值
    let alerted = false;
    function calculateFPS(currentTime: any) {
        frameCount++;
        const elapsed = currentTime - lastTime;

        if (elapsed >= 1000) {
            // 每秒更新一次 FPS
            fps = Math.round((frameCount * 1000) / elapsed);
            frameCount = 0;
            lastTime = currentTime;
            if (fps < 20 && !alerted && !flag && mainStore.settings.cardStyle === 'liquid-glass') {
                dialog.value = true;
                alerted = true;
            }
        }

        requestAnimationFrame(calculateFPS);
    }

    requestAnimationFrame(calculateFPS);
})();
</script>
<style scoped lang="scss"></style>
