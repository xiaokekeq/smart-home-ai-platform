<template>
    <v-card class="dv_widget">
        <template v-if="imgSrc">
            <div class="d-flex justify-space-between px-4 align-start">
                <div class="pt-4">
                    <div class="device-image-wrap">
                        <img :src="imgSrc" class="device-image" />
                    </div>
                </div>

                <div>
                    <v-switch v-model="value" color="primary" hide-details inset />
                </div>
            </div>

            <div class="pa-4 d-flex justify-space-between align-end">
                <div class="device-copy">
                    <div class="dv_name">{{ title }}</div>
                    <div class="is">{{ devModel }}</div>
                </div>

                <div class="dv_tool">
                    <div class="item" :class="{ pbg: value }">
                        <v-icon icon="mdi-wifi" :color="toolw ? 'primary' : '#999'" size="12" />
                    </div>
                    <div class="item mt-2 bg">
                        <v-icon icon="mdi-power-plug" color="success" size="12" />
                    </div>
                </div>
            </div>
        </template>

        <template v-else>
            <div class="d-flex justify-space-between px-4">
                <div class="text">{{ value ? 'ON' : 'OFF' }}</div>
                <div>
                    <v-switch v-model="value" color="primary" hide-details inset />
                </div>
            </div>

            <div class="d-flex justify-space-between px-4 t_row">
                <div>
                    <v-btn variant="tonal" icon="" :color="value ? 'primary' : ''">
                        <v-icon :icon="icon" />
                    </v-btn>
                    <div class="dv_name my-4">{{ title }}</div>
                </div>

                <div class="dv_tool mb-4">
                    <div v-if="toolw" class="item" :class="{ pbg: value }">
                        <v-icon icon="mdi-wifi" :color="wifiOn ? 'primary' : '#999'" size="12" />
                    </div>
                    <div v-if="toolp" class="item mt-2 bg">
                        <v-icon icon="mdi-power-plug" color="success" size="12" />
                    </div>
                </div>
            </div>
        </template>
    </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
    defineProps<{
        title?: string;
        icon?: string;
        imgSrc?: string;
        modelValue: boolean;
        devModel?: string;
        toolw?: boolean;
        toolp?: boolean;
        theme?: string;
        wifiOn: boolean;
    }>(),
    {
        title: 'title',
        icon: 'mdi-snowflake',
        toolw: true,
        toolp: true,
        theme: 'light',
    }
);

const emit = defineEmits(['update:modelValue']);

const value = computed({
    get() {
        return props.modelValue;
    },
    set(val: boolean) {
        emit('update:modelValue', val);
    },
});
</script>

<style scoped lang="scss">
.dv_widget {
    .device-image-wrap {
        // 图片盒子这里用 flex 居中，
        // 是为了兼容不同长宽比的设备图，避免图片总往某个角落偏。
        width: clamp(72px, 16vw, 90px);
        height: clamp(72px, 16vw, 90px);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .device-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
        display: block;
    }

    .device-copy {
        min-width: 0;
    }

    .dv_name {
        font-weight: 700;
        font-size: clamp(14px, 2vw, 16px);
        line-height: 1.2;
    }

    .is {
        color: #999;
        font-size: clamp(11px, 1.8vw, 12px);
        line-height: 1.35;
    }

    .t_row {
        // 无图版内容区用 flex 横排时，顶部对齐能保证左侧主信息和右侧状态列起点一致。
        align-items: flex-start;
        margin-top: -2px;
    }

    .dv_tool {
        // 右侧状态区挂在内容块底部，
        // 这样主信息区高低变化时，小图标会稳定留在右下角附近。
        align-self: flex-end;

        .item {
            width: 18px;
            height: 18px;
            text-align: center;
            border-radius: 9px;
            background-color: rgba(0, 0, 0, 0.1);
        }

        .pbg {
            background-color: rgba(var(--v-theme-primary), 0.2);
        }

        .bg {
            background-color: rgba(var(--v-theme-success), 0.2);
        }
    }
}
</style>
