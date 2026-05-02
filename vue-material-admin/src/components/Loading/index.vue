<template>
    <div class="loading loading-3">
        <!-- 
            在 Vue 中尽量不要使用 ref 取到 DOM 然后再手动写 innerHTML。
            直接使用 v-for 渲染字符串不仅更符合 Vue 的思维，而且完全没有生命周期 (onMounted) 和 Scoped CSS 失效的问题！ 
        -->
        <span v-for="(char, index) in text.split('')" :key="index" :style="{ '--index': index }">
            {{ char }}
        </span>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 如果你想让外部也能传字进来，可以使用 defineProps 替代这里的 ref
const text = ref('loading...');
</script>

<style scoped lang="scss">
.loading {
    margin: 10px;
    height: 14px;
    line-height: 14px;
}

.loading > span {
    display: inline-block;
    text-transform: uppercase;
    letter-spacing: 2px;
    animation: loadingWord 800ms ease-in infinite alternate;
    /* 注意：这里的动画延迟必须用 var() 因为我们在行内绑定了 --index */
    animation-delay: calc(var(--index) * 100ms + 200ms);
}

@keyframes loadingWord {
    0% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(0);
    }
    100% {
        transform: translateY(-8px);
    }
}
</style>
