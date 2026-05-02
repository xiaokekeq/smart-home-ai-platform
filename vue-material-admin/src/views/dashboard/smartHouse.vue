<template>
    <div class="smart_house pb-5">
        <v-row>
            <v-col cols="12" md="6">
                <v-card title="Camera" v-liquidGlass>
                    <v-tabs v-model="tab" align-tabs="end" class="mx-4" color="primary">
                        <v-tab :value="1">Living Room</v-tab>
                        <v-tab :value="2">Bed Room</v-tab>
                    </v-tabs>

                    <v-window v-model="tab">
                        <v-window-item :value="1">
                            <div class="camera_wrap ma-4">
                                <Vr360 />
                                <div class="label"><span /> Live</div>
                                <div class="label lk">4K 360&deg; Panoramic</div>
                            </div>
                        </v-window-item>

                        <v-window-item :value="2">
                            <div class="camera_wrap ma-4">
                                <v-img :aspect-ratio="16 / 9" height="365" cover
                                    src="https://demos.creative-tim.com/vuetify-material-dashboard-pro/img/bg-smart-home-2.975d8868.jpg" />
                                <div class="label"><span /> Live</div>
                                <div class="label lk">4K Resolution</div>
                            </div>
                        </v-window-item>
                    </v-window>
                </v-card>
            </v-col>

            <v-col cols="12" md="3" lg="2" class="px-sm-1 px-3 py-1 py-sm-3">
                <Device v-liquidGlass v-model="wifiOn" title="5G WI-FI" icon="mdi-wifi" :toolw="false"/>
                <Device v-liquidGlass v-model="widgets.tv" class="my-4" title="Apple TV" icon="mdi-television" :wifiOn="wifiOn" />
                <Device v-liquidGlass v-model="powerOn" title="Air Conditioner" icon="mdi-air-conditioner" :wifiOn="wifiOn"/>
            </v-col>

            <v-col cols="12" md="3" lg="4">
                <AirConditioner v-liquidGlass :power-on="powerOn" />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" lg="8" class="py-1">
                <v-row>
                    <v-col cols="12" md="5">
                        <Weather
                            :city="environmentStore.weather.city"
                            :condition="environmentStore.weather.condition"
                            :temperature="environmentStore.weather.outdoorTemp"
                            :icon-src="weatherIconSrc"
                        />
                    </v-col>

                    <v-col cols="12" md="7" class="px-1 sm_item_ sm_pt_1">
                        <MusicCard v-liquidGlass />
                    </v-col>
                </v-row>

                <div class="smart-house__device-grid">
                    <div class="smart-house__device-item">
                        <SmartDeviceCard :card="curtainCard" v-model="curtainOpen" @setting="openCurtainDialog"
                            v-liquidGlass />
                    </div>

                    <div class="smart-house__device-item">
                        <SmartDeviceCard :card="lightCard" v-model="lightOn" @setting="openLightDialog" v-liquidGlass />
                    </div>

                    <div class="smart-house__device-item">
                        <SmartDeviceCard :card="cameraCard" v-model="cameraOn" @setting="openCurtainDialog"
                            v-liquidGlass />
                    </div>

                    <div class="smart-house__device-item">
                        <SmartDeviceCard :card="humidifierCard" v-model="humidifierOn"
                            v-liquidGlass />
                    </div>
                </div>
            </v-col>

            <v-col cols="12" lg="4" class="py-1 py1_no">
                <EnergyUsed v-liquidGlass />
            </v-col>
        </v-row>

        <DeviceSettingDialog v-model="lightDialog" title="客厅灯光设置" @confirm="confirmLightDialog">
            <div class="setting-panel__summary">
                <div>
                    <div class="setting-panel__summary-title">{{ lightDraftOn ? '灯光已开启' : '灯光已关闭' }}</div>
                    <div class="setting-panel__summary-meta">
                        {{ lightDraftOn ? `当前亮度 ${lightDraftBrightness}%` : '开启后可调节亮度和模式' }}
                    </div>
                </div>

                <v-btn size="small" variant="tonal" @click="lightDraftOn = !lightDraftOn">
                    {{ lightDraftOn ? '关闭灯光' : '开启灯光' }}
                </v-btn>
            </div>

            <div class="setting-panel__block">
                <div class="d-flex justify-space-between align-center mb-2">
                    <div class="setting-panel__label">亮度</div>
                    <div class="setting-panel__value">{{ lightDraftBrightness }}%</div>
                </div>
                <v-slider v-model="lightDraftBrightness" :min="0" :max="100" :step="5" :disabled="!lightDraftOn"
                    color="primary" hide-details />
            </div>

            <div class="setting-panel__block">
                <div class="setting-panel__label mb-2">快捷亮度</div>
                <div class="setting-panel__presets">
                    <v-btn size="small" variant="tonal" :disabled="!lightDraftOn" @click="setLightBrightness(30)">
                        柔光
                    </v-btn>
                    <v-btn size="small" variant="tonal" :disabled="!lightDraftOn" @click="setLightBrightness(60)">
                        日常
                    </v-btn>
                    <v-btn size="small" variant="tonal" :disabled="!lightDraftOn" @click="setLightBrightness(100)">
                        全亮
                    </v-btn>
                </div>
            </div>
        </DeviceSettingDialog>

        <DeviceSettingDialog v-model="curtainDialog" title="客厅窗帘设置" @confirm="confirmCurtainDialog">
            <div class="setting-panel__summary">
                <div>
                    <div class="setting-panel__summary-title">当前开合 {{ curtainDraftPercent }}%</div>
                    <div class="setting-panel__summary-meta">可调节开合范围与场景预设</div>
                </div>
            </div>

            <div class="setting-panel__block">
                <div class="d-flex justify-space-between align-center mb-2">
                    <div class="setting-panel__label">开合范围</div>
                    <div class="setting-panel__value">{{ curtainDraftPercent }}%</div>
                </div>
                <v-slider v-model="curtainDraftPercent" :min="0" :max="100" :step="5" color="primary" hide-details />
            </div>

            <div class="setting-panel__block">
                <div class="setting-panel__label mb-2">快捷开合</div>
                <div class="setting-panel__presets">
                    <v-btn size="small" variant="tonal" @click="setCurtainPercent(0)">全关</v-btn>
                    <v-btn size="small" variant="tonal" @click="setCurtainPercent(50)">半开</v-btn>
                    <v-btn size="small" variant="tonal" @click="setCurtainPercent(100)">全开</v-btn>
                </div>
            </div>
        </DeviceSettingDialog>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Vr360 from './widgets/Vr360.vue';
import Device from './widgets/Device.vue';
import MusicCard from './widgets/MusicCard.vue';
import AirConditioner from './widgets/AirConditioner.vue';
import EnergyUsed from './widgets/EnergyUsed.vue';
import SmartDeviceCard from './widgets/SmartDeviceCard.vue';
import DeviceSettingDialog from './widgets/DeviceSettingDialog.vue';
import { useEnvironmentStore } from '../../stores/useEnvironmentStore';
import type { SmartDeviceCardData } from './types/dashboard';
import Weather from './widgets/Weather.vue';

const environmentStore = useEnvironmentStore();

const tab = ref(1);

const lightDialog = ref(false);
const lightDraftOn = ref(false);
const lightDraftBrightness = ref(0);

const curtainDialog = ref(false);
const curtainDraftPercent = ref(0);

const widgets = reactive({
    tv: false,
    humidifier: false,
});

const powerOn = computed({
    get: () => environmentStore.livingRoom.airConditioner.on,
    set: (value: boolean) => environmentStore.updateLivingRoomAirConditioner({ on: value }),
});

const wifiOn = computed({
    get: () => environmentStore.livingRoom.wifiOn,
    set: (value: boolean) => environmentStore.updateLivingRoomWifi(value),
});

const lightOn = computed({
    get: () => environmentStore.livingRoom.light.on,
    set: (value: boolean) => environmentStore.updateLivingRoomLight({ on: value }),
});

const lightBrightness = computed({
    get: () => environmentStore.livingRoom.light.brightness,
    set: (value: number) => environmentStore.updateLivingRoomLight({ brightness: value }),
});

const curtainOpen = computed({
    get: () => environmentStore.livingRoom.curtain.openPercent > 0,
    set: (value: boolean) => environmentStore.updateLivingRoomCurtain({ openPercent: value ? 100 : 0 }),
});

const curtainOpenPercent = computed({
    get: () => environmentStore.livingRoom.curtain.openPercent,
    set: (value: number) => environmentStore.updateLivingRoomCurtain({ openPercent: value }),
});

const cameraOn = computed({
    get: () => environmentStore.livingRoom.camera.on,
    set: (value: boolean) => environmentStore.updateLivingRoomCamera({ on: value }),
});

const humidifierOn = computed({
    get: () => environmentStore.livingRoom.humidifier.on,
    set: (value: boolean) => environmentStore.updateLivingRoomHumidifier({ on: value }),
});

const weatherIconSrc = computed(() => {
    return environmentStore.weatherIconMap[environmentStore.weather.iconKey ?? 'cloudy'];
});

const setLightBrightness = (value: number) => {
    lightDraftBrightness.value = value;
};

const setCurtainPercent = (value: number) => {
    curtainDraftPercent.value = value;
};

const openLightDialog = () => {
    lightDraftOn.value = lightOn.value;
    lightDraftBrightness.value = lightBrightness.value;
    lightDialog.value = true;
};

const openCurtainDialog = () => {
    curtainDraftPercent.value = curtainOpenPercent.value;
    curtainDialog.value = true;
};

const confirmLightDialog = () => {
    lightOn.value = lightDraftOn.value;
    lightBrightness.value = lightDraftBrightness.value;
    lightDialog.value = false;
};

const confirmCurtainDialog = () => {
    curtainOpenPercent.value = curtainDraftPercent.value;
    curtainDialog.value = false;
};

const lightCard = computed<SmartDeviceCardData>(() => ({
    type: 'light',
    title: 'Living Room Light',
    model: 'Baimi Light V2',
    imageSrc: environmentStore.livingRoomIconMap.light,
    metaText: lightOn.value ? `亮度 ${lightBrightness.value}%` : '已关闭',
    statusText: lightOn.value ? '支持亮度与模式调节' : '开启后可调节亮度',
    tone: lightOn.value ? 'primary' : 'default',
    switchable: true,
    settingable: true,
    toolw: environmentStore.livingRoom.wifiOn,
    toolp: environmentStore.livingRoom.light.connectivity.powerConnected,
}));

const curtainCard = computed<SmartDeviceCardData>(() => ({
    type: 'curtain',
    title: 'Living Room Curtain',
    model: 'Baimi Curtain Pro',
    imageSrc: environmentStore.livingRoomIconMap.curtain,
    metaText: `开合 ${curtainOpenPercent.value}%`,
    statusText: '支持一键全关、半开和全开',
    tone: curtainOpen.value ? 'primary' : 'default',
    switchable: true,
    settingable: true,
    toolw: environmentStore.livingRoom.wifiOn,
    toolp: environmentStore.livingRoom.curtain.connectivity.powerConnected,
}));

const cameraCard = computed<SmartDeviceCardData>(() => ({
    type: 'camera',
    title: 'Camera CCTV',
    model: 'Google Camera - X2',
    imageSrc: environmentStore.livingRoomIconMap.camera,
    metaText: cameraOn.value ? '正在监控' : '已关闭',
    statusText: '支持实时视频监控和录像',
    tone: cameraOn.value ? 'primary' : 'default',
    switchable: true,
    settingable: false,
    toolw: environmentStore.livingRoom.wifiOn,
    toolp: environmentStore.livingRoom.camera.connectivity.powerConnected, // 这里简单用是否开启监控来表示摄像头的“连接状态”，实际应用中可能需要更复杂的逻辑。
}));

const humidifierCard = computed<SmartDeviceCardData>(() => ({
    type: 'humidifier',
    title: 'Humidifier',
    model: 'Xiaomi Mi - X500',
    imageSrc: environmentStore.livingRoomIconMap.humidifier,
    metaText: humidifierOn.value ? '正在加湿' : '已关闭',
    statusText: '支持定时和湿度调节',
    tone: humidifierOn.value ? 'primary' : 'default',
    switchable: true,
    settingable: false,
    toolw: environmentStore.livingRoom.wifiOn,
    toolp: environmentStore.livingRoom.humidifier.connectivity.powerConnected, // 这里简单用是否开启来表示加湿器的“连接状态”，实际应用中可能需要更复杂的逻辑。
}));
</script>

<style lang="scss">
.smart_house {
    .v-card {
        border-radius: 6px;
    }

    .camera_wrap {
        position: relative;
        border-radius: 6px;
        overflow: hidden;
        height: 365px;

        .label {
            line-height: 25px;
            padding: 0 6px;
            background: rgba(0, 0, 0, 0.2);
            position: absolute;
            left: 16px;
            top: 16px;
            color: rgba(255, 255, 255, 0.8);
            border-radius: 2px;

            span {
                display: inline-block;
                width: 10px;
                height: 10px;
                background: red;
                border-radius: 5px;
            }
        }

        .label.lk {
            left: auto;
            right: 16px;
        }
    }

    .smart-house__device-grid {
        // 设备区使用 grid 是因为这里更适合“规则卡片墙”布局：
        // 一次定义列数和间距，后面每张卡自动落进网格单元。
        display: grid;

        // auto-fit + minmax 的组合表示：
        // 1. 每张卡最小 180px
        // 2. 容器还有空间时，卡片平均分配剩余宽度
        // 这样屏幕缩放时列数会自动变化，不用手动给每张卡写宽度。
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));

        // gap 同时控制列间距和行间距。
        gap: 12px;
        margin-top: 12px;
    }

    .smart-house__device-item {
        // 防止长标题或较宽内容把 grid 单元硬撑开。
        min-width: 0;
    }

    .smart-house__device-item > * {
        // 让网格项里的卡片组件吃满父单元高度，
        // 不然同一行内容多少不同，卡片会看起来高低不齐。
        height: 100%;
    }

    .setting-panel__summary-title {
        font-size: 18px;
        font-weight: 700;
    }

    .setting-panel__summary-meta {
        margin-top: 6px;
        color: #9a9a9a;
        font-size: 13px;
        line-height: 1.5;
    }

    .setting-panel__label {
        font-size: 14px;
        font-weight: 600;
    }

    .setting-panel__value {
        font-size: 15px;
        font-weight: 700;
        color: rgba(var(--v-theme-primary), 1);
    }

    .setting-panel__presets {
        // 快捷按钮这里用 flex 而不是 grid，
        // 因为它更像“可换行的按钮行”，需要横向排布并在窄屏自动换行。
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
}

.mobile {
    .px-sm-3 {
        padding-right: 12px !important;
        padding-left: 12px !important;
    }

    .py-sm-1 {
        padding-top: 4px !important;
        padding-bottom: 4px !important;
    }

    .py1_no {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
    }

    .sm_item_ {
        padding: 16px 12px 0 12px !important;
    }

    .sm_pt_1 {
        padding-top: 4px !important;
    }

    .music_card {
        .music_wrap {
            // 手机下改成纵向流，避免封面和播放控制继续横向挤压。
            display: block;

            .zjbg {
                width: 180px;
            }

            .slider {
                margin-left: 0;
            }
        }
    }

    .setting-panel__summary {
        // 手机下摘要区改成竖排，按钮会掉到下面，
        // 避免标题文案和操作按钮在一行里互相挤压。
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
