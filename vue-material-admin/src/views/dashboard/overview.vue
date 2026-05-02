<template>
    <div class="overview-page pb-5">
        <v-row>
            <v-col cols="12" lg="8">
                <!--
                    首页主卡：
                    这块不是普通统计卡，而是“现在整体怎么样 + 你接下来能做什么”。
                    用户打开首页先看这一块。
                -->
                <v-card class="hero-card" v-liquidGlass>
                    <div class="hero-shell">
                        <div class="hero-main">
                            <div class="eyebrow">SMART CONTROL CENTER</div>
                            <h1 class="hero-title">车家互联平台总览</h1>
                            <p class="hero-subtitle">
                                {{ `当前更适合先处理 ${allWarningItems.length} 条告警，并根据回家/出行场景快速切换设备状态。` }}
                            </p>

                            <div class="hero-status">
                                <div class="status-pill safe">家庭安全</div>
                                <div class="status-pill online">车辆在线</div>
                                <div class="status-pill warning">{{ allWarningItems.length }} 条待处理告警</div>
                            </div>
                        </div>
                        <div class="hero-side-panel">
                            <div class="hero-side-head">
                                <div>
                                    <div class="section-title">高频场景</div>
                                    <div class="section-subtitle">首页直接执行，不必先进入详情页</div>
                                </div>
                                <v-btn color="primary" prepend-icon="mdi-robot-outline" variant="tonal"
                                    @click="aiAssistantStore.openDrawer">
                                    AI 助手
                                </v-btn>
                            </div>

                            <div class="scene-shortcuts">
                                <button type="button" class="shortcut-card" @click="goHome">
                                    <div class="shortcut-icon">
                                        <v-icon icon="mdi-home-import-outline" />
                                    </div>
                                    <div class="shortcut-body">
                                        <div class="shortcut-title">回家模式</div>
                                        <div class="shortcut-desc">打开灯光、空调与窗帘</div>
                                    </div>
                                </button>

                                <button type="button" class="shortcut-card" @click="goOut">
                                    <div class="shortcut-icon">
                                        <v-icon icon="mdi-car-electric-outline" />
                                    </div>
                                    <div class="shortcut-body">
                                        <div class="shortcut-title">出行模式</div>
                                        <div class="shortcut-desc">锁定家庭设备并检查车辆</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </v-card>
            </v-col>

            <v-col cols="12" lg="4">
                <!--
                    右侧这块是“今日重点”，不是普通统计。
                    这里强调的是：
                    1. 今天要关注什么
                    2. 用户最适合先点哪里
                -->
                <v-card class="focus-card" v-liquidGlass>
                    <div class="focus-shell">
                        <div class="section-head">
                            <div class="section-title">今日重点</div>
                            <div class="section-subtitle">高优先级事项</div>
                        </div>

                        <div class="focus-number">{{ allFocusItems.length.toString() }}</div>
                        <div class="focus-copy">{{ focusSummary }}</div>

                        <div class="focus-links">
                            <v-btn v-for="item in visibleFocusItems" :key="item.id" block
                                :color="item.tone === 'warning' ? 'warning' : 'primary'" variant="tonal"
                                @click="runOverviewAction(item.actionType)">
                                {{ item.actionText }}
                            </v-btn>
                            <v-btn v-if="allFocusItems.length === 0" block variant="text">当前无需额外处理</v-btn>
                        </div>
                    </div>
                </v-card>
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" lg="6">
                <!--
                    家庭状态快照：
                    首页里不要做成长列表，而要做成小状态块。
                    这样更像“摘要”，不像“详情页”。
                -->
                <v-card class="panel-card" v-liquidGlass>
                    <div class="section-head">
                        <div class="section-title">家庭状态快照</div>
                        <div class="section-subtitle">高频设备与环境信息</div>
                    </div>

                    <div class="snapshot-grid">
                        <StatusCard :card="livingLightCard" v-model="livingLightOn" />
                        <StatusCard :card="indoorTempCard" v-model="airConditionerOn" />
                        <StatusCard :card="livingCurtainCard" v-model="livingCurtainOn" />
                        <StatusCard :card="livingCameraCard" />
                    </div>
                </v-card>
            </v-col>

            <v-col cols="12" lg="6">
                <v-card class="panel-card" v-liquidGlass>
                    <div class="section-head">
                        <div class="section-title">车辆状态快照</div>
                        <div class="section-subtitle">车辆联机与出行准备情况</div>
                    </div>

                    <div class="snapshot-grid">
                        <StatusCard :card="carOnlineCard" />
                        <StatusCard :card="carDoorCard" />
                        <StatusCard :card="carBatteryCard" />
                        <StatusCard :card="carACCard" v-model="carACOn" />
                    </div>
                </v-card>
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" lg="6">
                <!--
                    告警区：
                    首页不要铺很多条，只放最重要的 1 到 2 条。
                    每条最好能引导用户去处理。
                -->
                <v-card class="panel-card" v-liquidGlass>
                    <div class="section-head">
                        <div class="section-title">待处理告警</div>
                        <div class="section-subtitle">优先处理最重要的问题</div>
                    </div>

                    <div class="task-list">
                        <div v-for="item in visibleWarningItems" :key="item.id" class="task-item">
                            <div>
                                <div class="task-title">{{ item.title }}</div>
                                <div class="task-desc">{{ item.desc }}</div>
                            </div>
                            <v-btn size="small" color="warning" variant="tonal" icon>
                                <v-icon :icon="item.icon" />
                            </v-btn>
                        </div>

                        <div v-if="allWarningItems.length === 0" class="task-item">
                            <div>
                                <div class="task-title">当前无紧急告警</div>
                                <div class="task-desc">家庭与车辆状态基本正常，可以保持当前配置。</div>
                            </div>
                            <v-btn size="small" color="success" variant="tonal">
                                <v-icon icon='mdi-check-circle' />
                            </v-btn>
                        </div>
                    </div>
                </v-card>
            </v-col>

            <v-col cols="12" lg="6">
                <!--
                    AI 建议区：
                    不要只写一行文本，最好带动作按钮。
                    这样首页才有“我点一下就能做事”的感觉。
                -->
                <v-card class="panel-card" v-liquidGlass>
                    <div class="section-head">
                        <div class="section-title">AI 建议</div>
                        <div class="section-subtitle">根据当前状态给出的推荐动作</div>
                    </div>

                    <div class="task-list">
                        <div class="task-item ai-task">
                            <div>
                                <div class="task-title">{{ aiSuggestion.title }}</div>
                                <div class="task-desc">
                                    {{ aiSuggestion.desc }}
                                </div>
                            </div>
                            <v-btn size="small" color="primary" variant="tonal" :disabled="!canRunAiSuggestion"
                                @click="runAiSuggestion">
                                {{ aiSuggestionButtonText }}
                            </v-btn>
                        </div>
                    </div>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
// 这一版先不写复杂数据结构。
// 首页先把布局与重复块的“壳”搭稳，后面再接 store 和接口。
import { computed, ref, onMounted } from 'vue';
import StatusCard from './widgets/StatusCard.vue';
import type { StatusCardData } from './types/dashboard';
import { useDashboardStore } from '@/stores/useDashboard';
import { useAiAssistant } from '@/stores/useAiAssistant';

const dashboardStore = useDashboardStore();
const environmentStore = dashboardStore.environmentStore;
const vehicleStore = dashboardStore.vehicleStore;
const aiAssistantStore = useAiAssistant();

//在页面加载时请求
onMounted(() => {
    dashboardStore.getDashboard();
    dashboardStore.environmentStore.getEnvironment();
    dashboardStore.vehicleStore.getVehicle();
});
// 这里只做一个“家庭快照里的可交互样例”。
// 后面你写车辆快照时，就照着这个模式：
// 1. 先有一个布尔状态
// 2. 用 v-model 绑定开关
// 3. 再让文案跟着状态变化

const dashboard = computed(() => dashboardStore.dashboard);
const weather = computed(() => dashboard.value?.environment?.weather);
const livingRoom = computed(() => dashboard.value?.environment?.livingRoom);
const vehicle = computed(() => dashboard.value?.vehicle);

type OverviewActionType =
    | 'openHomeAc'
    | 'closeCurtain'
    | 'checkCamera'
    | 'checkDoors'
    | 'chargeCar'
    | 'openCarAc'
    | 'none';

interface OverviewTaskItem {
    id: string;
    title: string;
    desc: string;
    actionText: string;
    actionType: OverviewActionType;
    tone: 'primary' | 'warning' | 'danger';
    icon?: string;
}

//ai返回数据类型
interface AiSuggestionResult {
    title: string;
    desc: string;
    actionText: string;
    actionType: 'openHomeAc' | 'closeCurtain' | 'openCarAc' | 'chargeCar' | 'none';
}

// 这里把首页的灯光开关直接绑定到 store。
// 好处是：smartHouse 和 overview 以后都能共享同一份状态。
const livingLightOn = computed({
    get() {
        return livingRoom.value.light.on;
    },
    set(value: boolean) {
        environmentStore.updateLivingRoomLight({ on: value });
    },
});

const airConditionerOn = computed({
    get() {
        return livingRoom.value.airConditioner.on;
    },
    set(value: boolean) {
        environmentStore.updateLivingRoomAirConditioner({ on: value });
    },
});

const livingCurtainOn = computed({
    get() {
        return livingRoom.value.curtain.openPercent > 0;
    },
    set(value: boolean) {
        environmentStore.updateLivingRoomCurtain({ openPercent: value ? 100 : 0 });
    },
});

const cameraOn = computed(() => livingRoom.value.camera.on);

const carACOn = computed({
    get() {
        return vehicle.value.cabinAc.on;
    },
    set(value: boolean) {
        vehicleStore.updateCabinAc({ on: value });
    },
});

// 交互卡：value 和 meta 跟着开关状态变化。
const livingLightCard = computed<StatusCardData>(() => ({
    label: '客厅灯光',
    value: livingLightOn.value ? '已开启' : '已关闭',
    meta: livingLightOn.value ? '主灯与氛围灯均在线' : '当前仅保留设备待机状态',
    tone: livingLightOn.value ? 'primary' : 'default',
    switchable: true,
}));

const indoorTempCard = computed<StatusCardData>(() => ({
    label: '室内温度',
    value: `${livingRoom.value.indoorTemp}°C`,
    meta: livingRoom.value.airConditioner.on
        ? `空调运行中，当前设定 ${livingRoom.value.airConditioner.temp}°C`
        : livingRoom.value.indoorTemp >= 26
            ? `室外 ${weather.value.outdoorTemp}°C，建议开启 ${livingRoom.value.airConditioner.temp}°C 节能制冷`
            : '当前室温舒适，可保持空调关闭',
    tone: livingRoom.value.airConditioner.on
        ? 'primary'
        : livingRoom.value.indoorTemp >= 26
            ? 'warning'
            : 'default',
    switchable: true,
}));

const livingCurtainCard = computed<StatusCardData>(() => ({
    label: '客厅窗帘',
    value: livingCurtainOn.value ? '已打开' : '已关闭',
    meta: livingCurtainOn.value ? '当前窗帘打开，室内采光充足' : '当前窗帘关闭，适合观影与隐私保护',
    tone: livingCurtainOn.value ? 'primary' : 'default',
    switchable: true,
}));

const livingCameraCard = computed<StatusCardData>(() => ({
    label: '客厅摄像头',
    value: cameraOn.value ? '在线' : '离线',
    meta: cameraOn.value ? '摄像头在线，正在监控中' : '摄像头离线，建议检查网络连接',
    tone: cameraOn.value ? 'primary' : 'warning',
    badgeText: cameraOn.value ? '监控中' : '待检查',
    badgeTone: cameraOn.value ? 'success' : 'warning',
}));

const carACCard = computed<StatusCardData>(() => ({
    label: '车内空调',
    value: vehicle.value.cabinAc.on ? '已开启' : '已关闭',
    meta: vehicle.value.cabinAc.on ? `当前设定 ${vehicle.value.cabinAc.temp}°C` : '当前空调关闭，适合短时间停车',
    tone: vehicle.value.cabinAc.on ? 'primary' : 'default',
    switchable: true,
}));
const carBatteryCard = computed<StatusCardData>(() => ({
    label: '车辆电量',
    value: `${vehicle.value.batteryPercent} %`,
    meta: `剩余续航 ${vehicle.value.remainingRangeKm} km，建议续航低于 20% 前充电`,
    tone: 'default',
}));

const carDoorCard = computed<StatusCardData>(() => ({
    label: '车门状态',
    value: vehicleStore.allDoorsClosed ? '门全关' : '车门未完全关闭',
    meta: vehicleStore.allDoorsClosed ? '所有车门与后备箱均已关闭' : '检测到至少一处车门或后备箱未关好',
    tone: vehicleStore.allDoorsClosed ? 'primary' : 'warning',
}));

const carOnlineCard = computed<StatusCardData>(() => ({
    label: '车辆在线',
    value: vehicle.value.vehicleOnline ? '在线' : '离线',
    meta: vehicle.value.vehicleOnline ? '车辆在线，随时可远程控制' : '车辆离线，建议检查网络连接',
    tone: vehicle.value.vehicleOnline ? 'primary' : 'warning',
    badgeText: vehicle.value.vehicleOnline ? '在线' : '离线',
    badgeTone: vehicle.value.vehicleOnline ? 'success' : 'danger',
}));

const allFocusItems = computed<OverviewTaskItem[]>(() => {
    const items: OverviewTaskItem[] = [];

    if (!livingRoom.value.airConditioner.on && livingRoom.value.indoorTemp >= 26) {
        items.push({
            id: 'focus-home-ac',
            title: '室内温度偏高',
            desc: `当前室温 ${livingRoom.value.indoorTemp}°C，建议开启 ${livingRoom.value.airConditioner.temp}°C 空调。`,
            actionText: '开启空调',
            actionType: 'openHomeAc',
            tone: 'warning',
        });
    }

    if (livingRoom.value.curtain.openPercent > 0 && weather.value.outdoorTemp >= 30) {
        items.push({
            id: 'focus-curtain',
            title: '窗帘可先关闭降温',
            desc: `室外 ${weather.value.outdoorTemp}°C，关闭窗帘可减少直晒与升温。`,
            actionText: '关闭窗帘',
            actionType: 'closeCurtain',
            tone: 'warning',
        });
    }

    if (!vehicle.value.cabinAc.on && vehicle.value.vehicleOnline) {
        items.push({
            id: 'focus-car-ac',
            title: '上车前可预冷车内',
            desc: `车辆当前在线，可先将车内空调设为 ${vehicle.value.cabinAc.temp}°C。`,
            actionText: '开启车内空调',
            actionType: 'openCarAc',
            tone: 'primary',
        });
    }

    return items;
});

const visibleFocusItems = computed(() => allFocusItems.value.slice(0, 3));

const allWarningItems = computed<OverviewTaskItem[]>(() => {
    const items: OverviewTaskItem[] = [];

    if (!cameraOn.value) {
        items.push({
            id: 'warning-camera',
            title: '客厅摄像头离线',
            desc: '安防设备当前离线，建议优先检查网络与供电状态。',
            actionText: '检查摄像头',
            actionType: 'checkCamera',
            icon: 'mdi-alert-circle',
            tone: 'danger',
        });
    }

    if (!vehicleStore.allDoorsClosed) {
        items.push({
            id: 'warning-doors',
            title: '车辆车门未完全关闭',
            desc: '检测到至少一处车门或后备箱未关好，建议尽快确认。',
            actionText: '检查车门',
            actionType: 'checkDoors',
            icon: 'mdi-alert-circle',
            tone: 'danger',
        });
    }

    if (vehicle.value.batteryPercent <= 20 && !vehicle.value.charging) {
        items.push({
            id: 'warning-battery',
            title: '车辆电量较低',
            desc: `当前电量 ${vehicle.value.batteryPercent}%，建议尽快安排充电。`,
            actionText: '开始充电',
            actionType: 'chargeCar',
            icon: 'mdi-alert-circle',
            tone: 'danger',
        });
    }

    return items;
});

const visibleWarningItems = computed(() => allWarningItems.value.slice(0, 2));

const focusSummary = computed(() => {
    if (allFocusItems.value.length === 0) {
        return '当前家庭与车辆状态较稳定，暂时无需额外处理。';
    }

    return `系统已筛出 ${allFocusItems.value.length} 条今日重点，可从下方快速执行。`;
});

const aiSuggestion = computed(() => {
    // 如果后端数据还没回来，显示一个加载状态
    if (!dashboardStore.aiSuggestion) {
        return {
            title: '智控管家正在思考...',
            desc: '正在根据当前环境和车辆状态为您生成最佳建议。',
            actionText: '请稍候',
            actionType: 'none' as const,
        };
    }
    return dashboardStore.aiSuggestion;
});

const canRunAiSuggestion = computed(() => {
    return aiSuggestion.value.actionType !== 'none';
});

const aiSuggestionButtonText = computed(() => {
    if (!canRunAiSuggestion.value) {
        return '当前无需操作';
    }

    return aiSuggestion.value.actionText || '立即执行';
});

const executeOverviewAction = async (actionType: OverviewActionType) => {
    switch (actionType) {
        case 'openHomeAc':
            await environmentStore.updateLivingRoomAirConditioner({ on: true });
            return true;
        case 'closeCurtain':
            await environmentStore.updateLivingRoomCurtain({ openPercent: 0 });
            return true;
        case 'openCarAc':
            await vehicleStore.updateCabinAc({ on: true });
            return true;
        case 'chargeCar':
            // 充电需要走真正的后端更新接口，不能只改本地状态。
            await vehicleStore.updateCharging(true);
            return true;
        case 'checkCamera':
        case 'checkDoors':
        case 'none':
        default:
            return false;
    }
};

const runAiSuggestion = async () => {
    if (!canRunAiSuggestion.value) {
        return;
    }

    try {
        const executed = await executeOverviewAction(aiSuggestion.value.actionType);
        if (executed) {
            await dashboardStore.getDashboard();
        }
    } catch (error) {
        console.error('Failed to run AI suggestion action:', error);
    }
};

const runOverviewAction = async (actionType: OverviewActionType) => {
    try {
        const executed = await executeOverviewAction(actionType);
        if (executed) {
            await dashboardStore.getDashboard();
        }
    } catch (error) {
        console.error('Failed to run overview action:', error);
    }
};

const goHome = async () => {
    try {
        await environmentStore.updateLivingRoomLight({ on: true });
        await environmentStore.updateLivingRoomAirConditioner({ on: true });
        await environmentStore.updateLivingRoomCurtain({ openPercent: 100 });
        await dashboardStore.getDashboard();
    } catch (error) {
        console.error('Failed to switch to go-home mode:', error);
    }
};

const goOut = async () => {
    try {
        await environmentStore.updateLivingRoomLight({ on: false });
        await environmentStore.updateLivingRoomAirConditioner({ on: false });
        await environmentStore.updateLivingRoomCurtain({ openPercent: 0 });
        await dashboardStore.getDashboard();
    } catch (error) {
        console.error('Failed to switch to go-out mode:', error);
    }
};
</script>

<style scoped lang="scss">
.overview-page {
    .hero-card {
        box-sizing: border-box;
        height: 100%;
    }

    .hero-card,
    .focus-card,
    .panel-card {
        border-radius: 18px;
        height: 100%;
    }

    .hero-card,
    .panel-card {
        padding: 24px;
    }

    .focus-card {
        padding: 24px;
        height: 100%;
    }

    .focus-shell {
        box-sizing: border-box;
    }

    .eyebrow {
        margin-bottom: 10px;
        font-size: 12px;
        letter-spacing: 0.18em;
        color: rgba(var(--v-theme-primary), 1);
    }

    .hero-shell {
        box-sizing: border-box;
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) 360px;
        align-items: stretch;
        gap: 28px;
    }

    .hero-main {
        min-width: 0;
        display: flex;
        height: 100%;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        row-gap: 16px;
    }

    .hero-side-panel {
        height: 100%;
        padding: 22px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.04);
    }

    .hero-side-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 22px;
    }

    .hero-title {
        margin: 0;
        font-size: 38px;
        line-height: 1.05;
    }

    .hero-subtitle {
        margin: 12px 0 0;
        max-width: 620px;
        color: #909090;
        line-height: 1.6;
    }

    .hero-status {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-bottom: 14px;
    }

    .status-pill {
        padding: 8px 12px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
    }

    .status-pill.safe,
    .snapshot-value.safe {
        color: #3fb950;
        background: rgba(63, 185, 80, 0.12);
    }

    .status-pill.online {
        color: rgba(var(--v-theme-primary), 1);
        background: rgba(var(--v-theme-primary), 0.12);
    }

    .status-pill.warning {
        color: #f4b400;
        background: rgba(244, 180, 0, 0.12);
    }

    // 右侧高频场景快捷入口：你后面补剩下的两项时继续复用。
    .scene-shortcuts {
        display: grid;
        gap: 18px;
    }

    .shortcut-card {
        border: 0;
        width: 100%;
        display: flex;
        align-items: center;
        gap: 14px;
        text-align: left;
        padding: 16px;
        border-radius: 16px;
        color: inherit;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.04);
        transition: transform 0.2s ease, background 0.2s ease;
    }

    .shortcut-card:hover {
        transform: translateY(-2px);
        background: rgba(var(--v-theme-primary), 0.08);
    }

    .shortcut-icon {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
        background: rgba(var(--v-theme-primary), 0.12);
    }

    .shortcut-body {
        min-width: 0;
    }

    .shortcut-title {
        font-weight: 700;
        margin-bottom: 6px;
    }

    .shortcut-desc {
        color: #909090;
        font-size: 13px;
        line-height: 1.5;
    }

    .section-head {
        margin-bottom: 18px;
    }

    .section-title {
        font-size: 20px;
        font-weight: 700;
    }

    .section-subtitle {
        margin-top: 6px;
        color: #909090;
        font-size: 13px;
    }

    .focus-number {
        font-size: 64px;
        line-height: 1;
        font-weight: 800;
        margin: 16px 0 10px;
    }

    .focus-copy {
        color: #909090;
        line-height: 1.7;
    }

    .focus-links {
        display: grid;
        gap: 10px;
        margin-top: 22px;
    }

    // 快照状态块：家庭快照和车辆快照都复用。
    .snapshot-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
    }

    .snapshot-tile {
        padding: 18px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.04);
    }

    .snapshot-head {
        display: flex;
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

    .snapshot-value.on {
        color: rgba(var(--v-theme-primary), 1);
    }

    .snapshot-meta {
        color: #909090;
        font-size: 13px;
        line-height: 1.5;
    }

    // 任务列表：告警和 AI 建议共用。
    .task-list {
        display: grid;
        gap: 12px;
    }

    .task-item {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        padding: 16px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.04);
    }

    .task-title {
        font-weight: 700;
        margin-bottom: 6px;
    }

    .task-desc {
        color: #909090;
        font-size: 13px;
        line-height: 1.6;
    }

    .ai-task {
        border: 1px solid rgba(var(--v-theme-primary), 0.18);
    }
}

.mobile {
    .overview-page {

        .hero-shell {
            grid-template-columns: 1fr;
        }

        .hero-side-head {
            flex-direction: column;
        }

        .hero-side-panel {
            width: 100%;
        }

        .snapshot-grid {
            grid-template-columns: 1fr;
        }

        .task-item {
            flex-direction: column;
            align-items: stretch;
        }
    }
}
</style>
