<template>
    <div class="thermostat" :class="{ disabled: props.disabled }">
        <!-- svg：整张矢量画布，圆弧和手柄都画在这里 -->
        <!-- 温控器的圆弧、手柄都由 SVG 绘制 -->
        <svg
            ref="svgRef"
            shape-rendering="crispEdges"
            class="thermostat-svg"
            :viewBox="`0 0 ${viewBoxSize} ${viewBoxSize}`"
        >
            <!-- defs：定义区，里面的内容先声明，后面再引用；这里主要定义渐变色 -->
            <defs>
                <!-- linearGradient：线性渐变，从左到右过渡，供高亮弧线使用 -->
                <!-- 高亮弧线使用的渐变色 -->
                <linearGradient id="active-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color: #4dd0e1; stop-opacity: 1" />
                    <stop offset="100%" style="stop-color: #4db6ac; stop-opacity: 1" />
                </linearGradient>
            </defs>

            <!-- path：路径标签。这里只用来画弧线，不是画实心图形 -->
            <!-- 整段背景弧线 -->
            <path
                :d="backgroundArcPath"
                :stroke="inactiveArcStroke"
                :stroke-width="style.strokeWidth"
                stroke-linecap="round"
                fill="none"
                style="pointer-events: none"
            />

            <!-- 第二条 path：画内层细弧线，增强层次感 -->
            <!-- 主弧线内侧的辅助细线 -->
            <path
                :d="backgroundInnerArcPath"
                :stroke="innerArcStroke"
                stroke-width="1"
                stroke-linecap="round"
                fill="none"
                style="pointer-events: none"
            />

            <!-- 第三条 path：画当前温度对应的高亮弧线 -->
            <!-- 当前温度对应的高亮弧线 -->
            <path
                :d="activeArcPath"
                :stroke="activeArcStroke"
                :stroke-width="style.strokeWidth"
                stroke-linecap="round"
                fill="none"
                style="pointer-events: none"
            />

            <!-- 手柄外层高光描边 -->
            <circle
                :cx="handlePosition.x"
                :cy="handlePosition.y"
                :r="style.handleRadius"
                :fill="handleFillColor"
                :stroke="handleOuterStroke"
                :stroke-width="style.handleStrokeWidth + 4"
                style="cursor: pointer; pointer-events: all"
            />

            <!-- 真正接收拖拽事件的手柄 -->
            <circle
                :cx="handlePosition.x"
                :cy="handlePosition.y"
                :r="style.handleRadius"
                :fill="handleFillColor"
                :stroke="handleStrokeColor"
                :stroke-width="style.handleStrokeWidth"
                style="cursor: pointer; pointer-events: all"
                @mousedown.prevent="startDrag"
                @touchstart.prevent="startDrag"
            />
        </svg>

        <!-- 文字层覆盖在 SVG 上方 -->
        <div class="thermostat-ui">
            <div class="label-min">{{ min }}&deg;</div>
            <div class="label-max">{{ max }}&deg;</div>
            <div class="temperature-display">{{ Math.round(modelValue) }}&deg;</div>
            <!-- <div class="control-button minus" @click="decrement">
                <span>-</span>
            </div>
            <div class="control-button plus" @click="increment">
                <span>+</span>
            </div> -->
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';

// 通过 v-model 接收温度值，同时允许外部传最小值、最大值和禁用状态
const props = withDefaults(
    defineProps<{
        // 当前温度值。
        // 因为这个组件支持 v-model，所以这里固定用 modelValue 接收父组件传值。
        modelValue: number;
        // 最小温度，决定圆弧左下角显示多少，也决定拖拽最小边界。
        min?: number;
        // 最大温度，决定圆弧右下角显示多少，也决定拖拽最大边界。
        max?: number;
        // 是否禁用温控器。
        // 为 true 时：
        // 1. 圆环和手柄变灰
        // 2. 不允许拖拽修改温度
        disabled?: boolean;
    }>(),
    {
        // 默认最小温度 15 度
        min: 15,
        // 默认最大温度 32 度
        max: 32,
        // 默认不禁用
        disabled: false,
    }
);

// 子组件不能直接改 props，所以通过 update:modelValue 把新温度回传给父组件
const emit = defineEmits<{
    'update:modelValue': [value: number];
}>();

// SVG 内部坐标系大小
const viewBoxSize = 200;
// 圆心坐标
const center = viewBoxSize / 2;
// 圆弧半径
const radius = 75;
// 温控器可拖动的起止角度
const startAngleDeg = -135;
const endAngleDeg = 135;
const totalAngleDeg = endAngleDeg - startAngleDeg;

// 圆弧和手柄的基础样式配置
const style = {
    strokeWidth: 8,
    inactiveStroke: '#e0e0e0',
    handleRadius: 8,
    handleFill: '#ffffff',
    handleStroke: '#e0e0e0',
    handleStrokeWidth: 1,
};

// 根据 disabled 状态切换成正常色或灰态
const inactiveArcStroke = computed(() => (props.disabled ? '#5f5f5f' : style.inactiveStroke));
const innerArcStroke = computed(() => (props.disabled ? '#6f6f6f' : '#dcdcdc'));
const activeArcStroke = computed(() => (props.disabled ? '#7c7c7c' : 'url(#active-gradient)'));
const handleFillColor = computed(() => (props.disabled ? '#b5b5b5' : style.handleFill));
const handleOuterStroke = computed(() => (props.disabled ? '#707070' : '#e0e0e0'));
const handleStrokeColor = computed(() => (props.disabled ? '#7e7e7e' : style.handleStroke));

// 拿到 SVG 实际 DOM，拖拽时要把屏幕坐标换算成 SVG 坐标
const svgRef = ref<SVGElement | null>(null);
// 当前是否处于拖拽状态
const isDragging = ref(false);

// 角度转弧度，供三角函数使用
const degreesToRadians = (deg: number) => deg * (Math.PI / 180);

// 把“半径 + 角度”换算成圆上的 x/y 坐标
const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = degreesToRadians(angleInDegrees - 90);
    return {
        x: centerX + r * Math.cos(angleInRadians),
        y: centerY + r * Math.sin(angleInRadians),
    };
};

// 把当前温度映射成圆弧上的角度
const valueToAngle = computed(() => {
    const percentage = (props.modelValue - props.min) / (props.max - props.min);
    const clampedPercentage = Math.max(0, Math.min(1, percentage));
    return startAngleDeg + clampedPercentage * totalAngleDeg;
});

// 根据起止角度生成 SVG path 的 d 字符串
const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

// 当前温度对应的高亮弧线
const activeArcPath = computed(() =>
    describeArc(center, center, radius, startAngleDeg, valueToAngle.value)
);

// 完整背景弧线
const backgroundArcPath = computed(() =>
    describeArc(center, center, radius, startAngleDeg, endAngleDeg)
);

// 内层细弧线
const backgroundInnerArcPath = computed(() =>
    describeArc(center, center, radius - 8, startAngleDeg, endAngleDeg)
);

// 手柄当前位置
const handlePosition = computed(() => polarToCartesian(center, center, radius, valueToAngle.value));

// 根据鼠标或手指位置换算新的温度值
const updateValueFromCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.value) return;

    const { left, top, width, height } = svgRef.value.getBoundingClientRect();
    const svgX = clientX - left;
    const svgY = clientY - top;
    const viewBoxX = (svgX / width) * viewBoxSize;
    const viewBoxY = (svgY / height) * viewBoxSize;

    const deltaX = viewBoxX - center;
    const deltaY = viewBoxY - center;

    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (angle > 180) {
        angle -= 360;
    }

    const clampedAngle = Math.max(startAngleDeg, Math.min(endAngleDeg, angle));
    const percent = (clampedAngle - startAngleDeg) / totalAngleDeg;
    const newValue = Math.round(props.min + percent * (props.max - props.min));

    if (newValue !== props.modelValue) {
        emit('update:modelValue', newValue);
    }
};

// 预留的按钮式增减逻辑，目前模板里没启用
const increment = () => emit('update:modelValue', Math.min(props.max, props.modelValue + 1));
const decrement = () => emit('update:modelValue', Math.max(props.min, props.modelValue - 1));

// 拖拽过程中统一兼容鼠标和触摸事件
const onDrag = (event: MouseEvent | TouchEvent) => {
    const touch = (event as TouchEvent).touches?.[0];
    const clientX = touch ? touch.clientX : (event as MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (event as MouseEvent).clientY;
    updateValueFromCoordinates(clientX, clientY);
};

// 结束拖拽时，把挂在 window 上的事件全部清掉
const stopDrag = () => {
    isDragging.value = false;
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', stopDrag);
    window.removeEventListener('touchmove', onDrag);
    window.removeEventListener('touchend', stopDrag);
};

// 开始拖拽手柄：
// 1. 如果当前是禁用状态，直接不允许拖动
// 2. 把 move / end 事件挂到 window，避免鼠标拖出手柄后失效
const startDrag = () => {
    if (props.disabled) return;
    isDragging.value = true;
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', onDrag, { passive: true });
    window.addEventListener('touchend', stopDrag);
};

// 组件销毁时兜底清理全局监听器，避免内存泄漏
onUnmounted(() => {
    stopDrag();
});
</script>

<style lang="scss" scoped>
.thermostat {
    // 整个温控器的定位基准
    position: relative;
    width: 300px;
    height: 280px;
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
    touch-action: none;
    margin: 20px auto 0 auto;

    .thermostat-svg {
        // SVG 图形层
        position: absolute;
        top: 0;
        left: 0;
        width: 300px;
        height: 276px;
        z-index: 1;
    }

    .thermostat-ui {
        // 文字层压在 SVG 上方
        position: relative;
        width: 100%;
        height: 100%;
        z-index: 2;
        pointer-events: none;

        .temperature-display {
            // 中间温度文字
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 70px;
            font-weight: bold;
        }

        .control-button {
            // 预留给加减按钮的样式
            position: absolute;
            width: 40px;
            height: 40px;
            backdrop-filter: blur(3px);
            background: linear-gradient(rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.1));
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 18px;
            cursor: pointer;
            pointer-events: all;
            transition: background-color 0.2s;
        }

        .minus {
            bottom: 0;
            left: 20%;
        }

        .plus {
            bottom: 0;
            right: 20%;
        }

        .label-min,
        .label-max {
            // 最小值和最大值固定在圆弧左右下方
            position: absolute;
            font-size: 16px;
        }

        .label-min {
            bottom: 20%;
            left: 10%;
        }

        .label-max {
            bottom: 20%;
            right: 10%;
        }
    }

    &.disabled {
        // 禁用时让文字也一起变灰
        .thermostat-ui {
            .temperature-display,
            .label-min,
            .label-max {
                color: #8a8a8a;
            }
        }
    }
}
</style>
