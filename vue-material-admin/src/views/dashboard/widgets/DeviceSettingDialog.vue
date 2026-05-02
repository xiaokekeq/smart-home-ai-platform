<template>
    <v-dialog
        :model-value="modelValue"
        :fullscreen="smAndDown"
        max-width="440"
        @update:modelValue="emit('update:modelValue', $event)"
    >
        <v-card :class="['device-setting-dialog', { 'device-setting-dialog--mobile': smAndDown }]">
            <div class="device-setting-dialog__header">
                <div class="device-setting-dialog__title">{{ title }}</div>

                <v-btn
                    icon="mdi-close"
                    variant="text"
                    size="small"
                    @click="emit('update:modelValue', false)"
                />
            </div>

            <div class="device-setting-dialog__content">
                <slot />
            </div>

            <div class="device-setting-dialog__actions">
                <v-btn
                    variant="text"
                    class="device-setting-dialog__action"
                    @click="emit('update:modelValue', false)"
                >
                    {{ cancelText }}
                </v-btn>

                <v-btn
                    color="primary"
                    variant="flat"
                    class="device-setting-dialog__action"
                    @click="emit('confirm')"
                >
                    {{ confirmText }}
                </v-btn>
            </div>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify';

withDefaults(
    defineProps<{
        modelValue: boolean;
        title: string;
        confirmText?: string;
        cancelText?: string;
    }>(),
    {
        confirmText: '完成',
        cancelText: '取消',
    }
);

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'confirm'): void;
}>();

const { smAndDown } = useDisplay();
</script>

<style scoped lang="scss">
.device-setting-dialog {
    // 弹窗主体做成纵向 flex：
    // 顶部标题、 中间可滚动内容、底部操作栏三段更容易稳定排布。
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: min(82vh, 720px);
    border-radius: 24px;
    overflow: hidden;
    background: #1f1f1f;
}

.device-setting-dialog--mobile {
    height: 100dvh;
    max-height: none;
    border-radius: 0;
}

.device-setting-dialog__header {
    // 标题栏是“标题在左、关闭按钮在右”的典型横向布局。
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 20px 12px;
}

.device-setting-dialog__title {
    font-size: 16px;
    font-weight: 700;
    line-height: 1.4;
}

.device-setting-dialog__content {
    // 内容区占据剩余空间并允许滚动，
    // 这样手机全屏时内容再长也不会把底部按钮顶出视口。
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 8px 20px 20px;
}

.device-setting-dialog__actions {
    // 底部按钮区用 flex 横向排布，
    // 桌面端靠右收口，手机端在 media 里再改成更容易点击的等宽按钮。
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
}

.device-setting-dialog__action {
    min-width: 96px;
}

@media (max-width: 600px) {
    .device-setting-dialog__header {
        padding: 16px 16px 10px;
    }

    .device-setting-dialog__content {
        padding: 8px 16px 16px;
    }

    .device-setting-dialog__actions {
        padding: 12px 16px 16px;
    }

    .device-setting-dialog__action {
        // 手机上让两个按钮平分一行，点击面积更稳。
        flex: 1 1 0;
        min-width: 0;
    }
}
</style>
