<template>
    <template v-for="(item, key) in props.data" :key="key">
        <!-- <v-list-subheader v-if="item.name === 'Dashboard'">Dashboard</v-list-subheader>
        <v-list-subheader v-if="item.name === 'componets'">Examples</v-list-subheader>
        <v-list-subheader v-if="item.name === 'RBAC'">Access Control</v-list-subheader> -->
        <!-- 如果是没有二级的菜单 -->
        <v-list-item
            v-if="item.meta?.visible && !item.children"
            :prepend-icon="item.meta?.icon as any"
            :title="item.meta?.title as any"
            :to="getMenuRoute(item)"
            class="mx-1"
            active-class="nav_active"
            rounded="lg"
            @click="onMenuClick(item)"
        ></v-list-item>
        <!-- 有二级的菜单 -->
        <v-list-group v-if="item.meta?.visible && item.children && item.children.length > 0">
            <template v-slot:activator="{ props }">
                <v-list-item
                    v-bind="props"
                    :prepend-icon="item.meta.icon ? item.meta.icon : 'mdi-x?xx'"
                    :title="item.meta.title as any"
                    active-class="nav_active"
                    class="mx-1"
                    rounded="lg"
                />
            </template>
            <MenuNodeTree :data="item.children" />
        </v-list-group>
    </template>
</template>

<script lang="ts" setup>
import { useAiAssistant } from '@/stores/useAiAssistant';

interface Props {
    data: any[];
}

const props = withDefaults(defineProps<Props>(), {});
const aiAssistantStore = useAiAssistant();

const getMenuRoute = (item: any) => {
    if (item.meta?.menuAction === 'openAiDrawer') {
        return undefined;
    }

    return { name: item.name };
};

const onMenuClick = (item: any) => {
    if (item.meta?.menuAction === 'openAiDrawer') {
        aiAssistantStore.openDrawer();
    }
};
</script>
