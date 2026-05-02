<template>
    <v-navigation-drawer
        class="my-4 layout_navigation"
        :class="{ showSettings: showSettings }"
        :rail="rail"
        :mobile="mobile"
        expand-on-hover
        rail-width="77"
        v-model="val"
        style="position: fixed"
    >
        <div v-liquidGlass>
            <v-list class="py-4 mx-2 logo" nav>
                <v-list-item rounded :prepend-avatar="logo" class="mx-1" to="/overview">
                    <v-list-item-title class="title">车家互联平台</v-list-item-title>
                    <v-list-item-subtitle>智能控制中心</v-list-item-subtitle>
                </v-list-item>
            </v-list>
            <v-divider class="mx-5"></v-divider>
            <v-list nav class="mx-2" color="primary">
                <MenuNodeTree :data="routes" />
            </v-list>
        </div>
    </v-navigation-drawer>
</template>
<script lang="ts" setup>
import logo from '@/assets/admin-logo.png';
import { computed } from 'vue';
import MenuNodeTree from './MenuNodeTree.vue';
import { useAuthStore } from '@/stores/useAuthStore';
import localRoutes from '@/router/loca';

const emit = defineEmits(['update:value']);

const props = withDefaults(
    defineProps<{
        rail: boolean;
        value?: boolean;
        mobile?: boolean;
        showSettings?: boolean;
    }>(),
    {}
);

const menuEvent = useAuthStore();

const val = computed({
    get() {
        return props.value;
    },
    set(val: boolean) {
        emit('update:value', val);
    },
});

// const routes = computed(() => {
//     return menuEvent.menus;
// });
const routes = computed(() => {
    const root = localRoutes.find((item) => item.path === '/');
    return root?.children ?? [];
});
</script>
