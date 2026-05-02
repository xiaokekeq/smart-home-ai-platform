<template>
    <v-card v-liquidGlass class="smart-device-card">
        <div class="smart-device-card__top">
            <div class="smart-device-card__image-box">
                <img :src="card.imageSrc" class="smart-device-card__image" />
            </div>

            <v-switch v-if="card.switchable" v-model="switchValue" class="smart-device-card__switch" color="primary"
                hide-details inset />
        </div>

        <div class="smart-device-card__body">
            <div class="smart-device-card-mainbody">
                <div class="smart-device-card__title">{{ card.title }}</div>
                <div :class="['smart-device-card__primary', toneClass]">
                    {{ card.metaText }}
                </div>
                <div class="smart-device-card__model">{{ card.model }}</div>

                <div v-if="card.statusText" class="smart-device-card__status">
                    <span class="smart-device-card__status-text">{{ card.statusText }}</span>
                </div>
            </div>
            <div class="smart-device-card__footbody">
                <div>
                    <v-btn v-if="card.settingable" icon="mdi-cog-outline" size="small" variant="text"
                        @click="emit('setting')" />
                </div>

                <div class="dv_tool">
                    <div class="item" :class="{ pbg: card.toolw }">
                        <v-icon icon="mdi-wifi" :color="card.toolw ? 'primary' : '#999'" size="12" />
                    </div>

                    <div class="item bg">
                        <v-icon icon="mdi-power-plug" color="success" size="12" />
                    </div>
                </div>
            </div>
        </div>
    </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SmartDeviceCardData } from '../types/dashboard';

const props = withDefaults(
    defineProps<{
        card: SmartDeviceCardData;
        modelValue?: boolean;
    }>(),
    {
        modelValue: false,
    }
);

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'setting'): void;
}>();

const switchValue = computed({
    get: () => props.modelValue,
    set: (value: boolean) => {
        emit('update:modelValue', value);
    },
});

const toneClass = computed(() => {
    return props.card.tone === 'primary' ? 'is-primary' : '';
});
</script>

<style scoped lang="scss">
.smart-device-card {
    // 卡片本体做成纵向 flex，
    // 这样顶部图片区和下面正文区可以自然上下堆叠。
    padding: 12px 12px 10px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
}

.smart-device-card__top {
    // 顶部区域是“图片在左、开关在右”的典型横向布局，
    // 所以这里用 flex 比 grid 更直接。
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
}

.smart-device-card__image-box {
    width: clamp(60px, 14vw, 68px);
    height: clamp(60px, 14vw, 68px);
    overflow: hidden;
    border-radius: 10px;
    flex: 0 0 clamp(60px, 14vw, 68px);
}

.smart-device-card__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
}

.smart-device-card__switch {
    align-self: flex-start;
    margin-top: -4px;
    margin-right: -6px;
}

.smart-device-card__body {
    // 正文区再次用 flex，是为了把“左侧文案”和“右侧工具列”分开。
    // 左边负责承载标题和状态，右边负责承载设置/WiFi/电源图标。
    margin-top: 8px;
    display: flex;
    justify-content: space-between;

    .smart-device-card-mainbody {
        // 文案列允许收缩，不然长标题会把右侧工具列顶出去。
        min-width: 0;
    }

    .smart-device-card__footbody {
        // 右侧工具区做成纵向 flex，
        // 这样设置按钮在上，状态图标列在下，结构更像一列工具条。
        display: flex;
        flex-direction: column;
        align-self: flex-end;

        .dv_tool {
            // 工具图标本身再做一层列布局，
            // 让 WiFi / 电源状态垂直排布并保持固定间距。
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            .item {
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
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
}

.smart-device-card__title {
    font-size: clamp(14px, 2vw, 15px);
    line-height: 1.15;
    font-weight: 700;
}

.smart-device-card__primary {
    margin-top: 6px;
    font-size: clamp(16px, 2.6vw, 18px);
    line-height: 1.05;
    font-weight: 700;
    color: #a0a0a0;
}

.smart-device-card__primary.is-primary {
    color: rgba(var(--v-theme-primary), 1);
}

.smart-device-card__model {
    margin-top: 4px;
    color: #999;
    font-size: clamp(11px, 1.8vw, 12px);
    line-height: 1.35;
}

.smart-device-card__status {
    margin-top: 4px;
}

.smart-device-card__status-text {
    color: #7f7f7f;
    font-size: clamp(10px, 1.7vw, 11px);
    line-height: 1.4;
}
</style>
