<template>
    <v-card title="Air Conditioner" class="air_conditioner">
        <ThermostatController v-model="acTemp" :disabled="!powerOn" />

        <div class="air_mode" :class="{ disabled: !powerOn }">
            <p>Temp: {{ acTemp }}&deg;C</p>
            <p>Mode: {{ currentMode.label }}</p>
            <p>Fan: {{ currentFanSpeed.label }}</p>
            <p v-if="timerHours > 0">Timer: {{ timerHours }}h</p>
        </div>

        <div class="d-flex jsb btn_tool">
            <div class="item" :class="{ disabled: !powerOn }" @click="handleToggleMode">
                <v-btn variant="tonal" :color="modeButtonColor" icon="" :disabled="!powerOn">
                    <v-icon :icon="currentMode.icon" />
                </v-btn>
                <div class="btnname mt-2">{{ currentMode.label }}</div>
                <div class="btnnv">{{ powerText }}</div>
            </div>
            <div class="item" :class="{ disabled: !powerOn }" @click="handleFanSpeed">
                <v-btn variant="tonal" icon="" :color="fanButtonColor" :disabled="!powerOn">
                    <v-icon icon="mdi-weather-dust" />
                </v-btn>
                <div class="btnname mt-2">Fan Speed</div>
                <div class="btnnv">{{ currentFanSpeed.label }}</div>
            </div>
            <div class="item" :class="{ disabled: !powerOn }" @click="handleTimer">
                <v-btn variant="tonal" icon="" :color="timeButtonColor" :disabled="!powerOn">
                    <v-icon icon="mdi-clock-outline" />
                </v-btn>
                <div class="btnname mt-2">Timer</div>
                <div class="btnnv">{{ timerHours > 0 ? `${timerHours}h` : 'Off' }}</div>
            </div>
        </div>
    </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import ThermostatController from './ThermostatController.vue';
import { useEnvironmentStore } from '@/stores/useEnvironmentStore';

const environmentStore = useEnvironmentStore();
const props = withDefaults(
    defineProps<{
        powerOn?: boolean;
    }>(),
    {
        powerOn: true,
    }
);

const acTemp = computed({
    get: () => environmentStore.livingRoom.airConditioner.temp,
    set: (value: number) => environmentStore.updateLivingRoomAirConditioner({ temp: value }),
});

const modes = [
    { key: 'cool', label: 'Cool', icon: 'mdi-snowflake' },
    { key: 'heat', label: 'Heat', icon: 'mdi-fire' },
    { key: 'dry', label: 'Dry', icon: 'mdi-water-percent' },
    { key: 'auto', label: 'Auto', icon: 'mdi-fan-auto' },
] as const;

const fanSpeeds = [
    { key: 'low', label: '低' },
    { key: 'medium', label: '中' },
    { key: 'high', label: '高' },
    { key: 'auto', label: '自动' },
] as const;

const timerOptions = [0, 1, 2, 4] as const;

const modeIndex = ref(3);
const fanSpeedIndex = ref(0);
const timerIndex = ref(0);

const currentMode = computed(() => modes[modeIndex.value]);
const currentFanSpeed = computed(() => fanSpeeds[fanSpeedIndex.value]);
const timerHours = computed(() => timerOptions[timerIndex.value]);
const powerText = computed(() => (props.powerOn ? 'Power On' : 'Power Off'));
const modeButtonColor = computed(() =>
    props.powerOn ? 'primary' : 'grey-darken-1'
);
const fanButtonColor = computed(() => (props.powerOn ? 'primary' : 'grey-darken-1'));
const timeButtonColor = computed(() =>
    !props.powerOn || timerIndex.value === 0 ? 'grey-darken-1' : 'primary'
);

const onToggleMode = () => {
    modeIndex.value = (modeIndex.value + 1) % modes.length;
};

const onAdd = () => {
    fanSpeedIndex.value = (fanSpeedIndex.value + 1) % fanSpeeds.length;
};

const onSub = () => {
    timerIndex.value = (timerIndex.value + 1) % timerOptions.length;
};

const handleToggleMode = () => {
    if (!props.powerOn) return;
    onToggleMode();
};

const handleFanSpeed = () => {
    if (!props.powerOn) return;
    onAdd();
};

const handleTimer = () => {
    if (!props.powerOn) return;
    onSub();
};
</script>

<style scoped lang="scss">
.air_conditioner {
    .air_mode {
        display: flex;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 2px;
        color: #999;
        white-space: nowrap;

        p {
            margin: 0;
            font-size: 12px;
            line-height: 1.2;
        }

        &.disabled {
            color: #777;
        }
    }

    .btn_tool {
        width: 350px;
        margin: 14px auto 8px auto;
        padding-bottom: 10px;

        .item {
            text-align: center;
            cursor: pointer;

            .btnname {
                font-weight: 700;
            }

            .btnnv {
                color: #999;
                font-size: 12px;
            }

            &.disabled {
                cursor: not-allowed;

                .btnname,
                .btnnv {
                    color: #777;
                }
            }
        }
    }
}
</style>
