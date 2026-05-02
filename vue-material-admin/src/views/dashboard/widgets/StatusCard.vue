<template>
    <div class="snapshot-tile">
        <div class="snapshot-head">
            <div class="snapshot-label mb-0">{{ props.card.label }}</div>
            <v-switch v-if="props.card.switchable" v-model="switchValue" color="primary" density="compact" hide-details
                inset />
            <div v-else-if="props.card.badgeText" :class="['snapshot-badge', badgeClass]">
                {{ props.card.badgeText }}
            </div>
        </div>

        <div class="snapshot-value" :class="toneClass">
            {{ props.card.value }}
        </div>

        <div class="snapshot-meta">
            {{ props.card.meta }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StatusCardData } from '../types/dashboard';

const props = defineProps<{
    card: StatusCardData;
    modelValue?: boolean;
}>();
const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

// v-model 代理层：
// 1. 读取父组件传入的 modelValue
// 2. 修改时通过 emit 通知父组件更新
const switchValue = computed({
    get() {
        return Boolean(props.modelValue);
    },
    set(value: boolean) {
        console.log(value);
        emit('update:modelValue', value);
    },
});

const toneClass = computed(() => {
    if (!props.card.tone || props.card.tone === 'default') return '';
    return `is-${props.card.tone}`;
});

const badgeClass = computed(() => {
    if (!props.card.badgeTone) return '';
    return `is-${props.card.badgeTone}`;
});
</script>

<style scoped lang="scss">
.snapshot-tile {
    padding: 18px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.04);
}

.snapshot-head {
    display: flex;
    height: 40px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
}

.snapshot-label {
    color: #909090;
    font-size: 13px;
    margin-bottom: 10px;
}

.snapshot-value {
    font-size: 26px;
    font-weight: 700;
    margin-bottom: 8px;
}

.snapshot-value.is-primary {
    color: rgba(var(--v-theme-primary), 1);
}

.snapshot-value.is-success {
    color: #3fb950;
}

.snapshot-value.is-warning {
    color: #f4b400;
}

.snapshot-value.is-danger {
    color: #ff6b6b;
}

.snapshot-meta {
    color: #909090;
    font-size: 13px;
    line-height: 1.5;
}

.snapshot-badge {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    color: #b0b0b0;
    background: rgba(255, 255, 255, 0.06);
}

.snapshot-badge.is-primary {
    color: rgba(var(--v-theme-primary), 1);
    background: rgba(var(--v-theme-primary), 0.12);
}

.snapshot-badge.is-success {
    color: #3fb950;
    background: rgba(63, 185, 80, 0.12);
}

.snapshot-badge.is-warning {
    color: #f4b400;
    background: rgba(244, 180, 0, 0.12);
}

.snapshot-badge.is-danger {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.12);
}
</style>
