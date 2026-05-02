<template>
    <v-card v-liquidGlass class="smart-house__weather-card">
        <div class="d-flex justify-space-between">
            <v-avatar size="120" rounded="0" class="ma-4">
                <img :src="iconSrc" height="120" />
            </v-avatar>

            <div class="weather_block">
                <v-card-title class="text-h5">
                    {{ city }}
                    <v-icon icon="mdi-map-marker-outline" size="24" />
                </v-card-title>

                <v-card-subtitle>{{ condition }}</v-card-subtitle>

                <div class="py-0 mr-4">
                    <span class="text-h3">{{ temperature }}&deg;</span>
                    <span class="text-h6">C</span>
                </div>
            </div>
        </div>
    </v-card>
</template>

<script setup lang="ts">
interface Props {
    city: string;
    condition: string;
    temperature: number;
    iconSrc: string;
}

defineProps<Props>();
</script>

<style scoped lang="scss">
.smart-house__weather-card {
    // 让天气卡撑满所在列高度，主要是为了和同一行右侧卡片更容易对齐。
    height: 100%;
    .weather_block {
        // 让右侧天气文案吃掉头像之外的剩余空间，
        // 这样卡片缩小时文字区不会被左边图片直接挤没。
        flex: 1;
        text-align: right;
    }
}
</style>
