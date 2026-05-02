<template>
    <div class="tesla">
        <div class="car">
            <div class="tesla_model">
                <VehicleModelViewer model-url="/models/su7-xiaomini.glb" :model-scale="1.08" :frame-padding="1.06"
                    :auto-rotate-speed="0.18" hdr-sky-url="/sky/goegap_road_1k.hdr"
                    ground-texture-url="/textures/rocks006/color.jpg"
                    ground-normal-url="/textures/rocks006/normal-gl.jpg"
                    ground-roughness-url="/textures/rocks006/roughness.jpg" ground-ao-url="/textures/rocks006/ao.jpg"
                    ground-displacement-url="/textures/rocks006/displacement.jpg"
                    :weather-preset="vehicleWeatherPreset" />
            </div>
            <Weather :city="`${weather.city} Today`" :condition="weather.condition" :temperature="weather.outdoorTemp"
                :icon-src="weatherIconSrc" />
            <div class="row2">
                <v-card class="battery" :theme="theme" v-liquidGlass>
                    <div class="pa-4">
                        <div class="d-flex">
                            <v-btn color="rgba(0,0,0,0.8)" icon="mdi-battery-90" theme="dark"
                                class="elevation-0 innericon"></v-btn>
                            <v-card-title class="text-h6"> Battery Health</v-card-title>
                        </div>
                        <v-card-text class="py-0 mt-4 px-0">
                            <v-row align="center" no-gutters>
                                <v-col cols="6" style="border-right: 1px solid rgba(0, 0, 0, 0.3)">
                                    <v-card-subtitle class="ml-0 pl-0">Remaining Battery</v-card-subtitle>
                                    <div class="text-h3">
                                        {{ vehicle.batteryPercent }}<span class="text-h6">%</span>
                                    </div>
                                </v-col>
                                <v-col cols="6">
                                    <div class="pl-4">
                                        <v-card-subtitle class="ml-0 pl-0">Distance</v-card-subtitle>
                                        <div class="text-h3">
                                            {{ vehicle.remainingRangeKm }}<span class="text-h6">Km</span>
                                        </div>
                                    </div>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </div>
                </v-card>
                <v-card class="Trip" :theme="theme" v-liquidGlass>
                    <div class="pa-4">
                        <div class="d-flex">
                            <v-btn color="rgba(0,0,0,0.8)" icon="mdi-speedometer" theme="dark"
                                class="elevation-0 innericon"></v-btn>
                            <v-card-title class="text-h6"> Today's Trip</v-card-title>
                        </div>
                        <v-card-text class="py-0 mt-4 px-0">
                            <v-row align="center" no-gutters>
                                <v-col cols="6" style="border-right: 1px solid rgba(0, 0, 0, 0.3)">
                                    <v-card-subtitle class="ml-0 pl-0">Average Speed</v-card-subtitle>
                                    <div class="text-h3">52<span class="text-h6">Km</span></div>
                                </v-col>
                                <v-col cols="6">
                                    <div class="pl-4">
                                        <v-card-subtitle class="ml-0 pl-0">Distance</v-card-subtitle>
                                        <div class="text-h3">98<span class="text-h6">Km</span></div>
                                    </div>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </div>
                </v-card>
            </div>
            <div class="row3">
                <v-card class="door_panel" :theme="theme" v-liquidGlass>
                    <div class="pa-4">
                        <div class="panel_head">
                            <div class="d-flex align-center">
                                <v-btn color="rgba(0,0,0,0.8)" icon="mdi-car-door" theme="dark"
                                    class="elevation-0 innericon"></v-btn>
                                <div>
                                    <v-card-title class="text-h6 py-0">Door Control</v-card-title>
                                    <v-card-subtitle class="px-0">
                                        {{ vehicleStore.allDoorsClosed ? 'All doors secured' : 'Check open doors before driving' }}
                                    </v-card-subtitle>
                                </div>
                            </div>
                            <div class="status_chip" :class="{ warning: !vehicleStore.allDoorsClosed }">
                                {{ vehicleStore.allDoorsClosed ? 'Ready' : 'Attention' }}
                            </div>
                        </div>

                        <div class="door_grid">
                            <button v-for="door in doorControls" :key="door.key" type="button" class="door_item"
                                :class="{ open: !door.closed }" :disabled="doorPending[door.key]"
                                @click="toggleDoor(door.key)">
                                <div class="door_item_top">
                                    <v-icon :icon="door.icon" size="18" />
                                    <span>{{ door.label }}</span>
                                </div>
                                <div class="door_item_state">
                                    {{ doorPending[door.key] ? 'Updating...' : door.closed ? 'Closed' : 'Open' }}
                                </div>
                            </button>
                        </div>
                    </div>
                </v-card>

                <v-card class="charge_panel" :theme="theme" v-liquidGlass>
                    <div class="pa-4">
                        <div class="panel_head">
                            <div class="d-flex align-center">
                                <v-btn color="rgba(0,0,0,0.8)" icon="mdi-ev-station" theme="dark"
                                    class="elevation-0 innericon"></v-btn>
                                <div>
                                    <v-card-title class="text-h6 py-0">Energy & Status</v-card-title>
                                    <v-card-subtitle class="px-0">Charging, network and departure
                                        summary</v-card-subtitle>
                                </div>
                            </div>
                            <div class="status_chip"
                                :class="{ online: vehicle.vehicleOnline, warning: !vehicle.vehicleOnline }">
                                {{ vehicle.vehicleOnline ? 'Online' : 'Offline' }}
                            </div>
                        </div>

                        <div class="charge_metrics">
                            <div class="metric_card">
                                <div class="metric_label">Charging</div>
                                <div class="metric_value">{{ vehicle.charging ? 'In Progress' : 'Idle' }}</div>
                            </div>
                            <div class="metric_card">
                                <div class="metric_label">Range</div>
                                <div class="metric_value">{{ vehicle.remainingRangeKm }} km</div>
                            </div>
                            <div class="metric_card">
                                <div class="metric_label">Battery</div>
                                <div class="metric_value">{{ vehicle.batteryPercent }}%</div>
                            </div>
                            <div class="metric_card">
                                <div class="metric_label">Cabin</div>
                                <div class="metric_value">{{ vehicle.cabinAc.on ? `A/C ${vehicle.cabinAc.temp}°C` : 'Off' }}</div>
                            </div>
                        </div>

                        <div class="charge_footer">
                            <div class="charge_copy">
                                {{ chargeSummary }}
                            </div>
                            <v-btn color="primary" variant="tonal" :loading="chargingPending"
                                :disabled="chargingPending" @click="toggleCharging">
                                {{ vehicle.charging ? 'Stop Charging' : 'Start Charging' }}
                            </v-btn>
                        </div>
                    </div>
                </v-card>
            </div>
        </div>
        <div class="car_sys mt-4" v-liquidGlass>
            <v-system-bar theme="dark" style="position: relative; left: 0; top: 0; width: auto; background: none">
                <v-icon icon="mdi-wifi-strength-4" size="x-small"></v-icon>
                <v-icon icon="mdi-signal" class="ml-2" size="x-small"></v-icon>
                <v-icon icon="mdi-battery" class="ml-2" size="x-small"></v-icon>
                <span class="ml-2">3:13PM</span>
            </v-system-bar>
            <div id="amap">
                <div class="a_t"></div>
                <div class="a_l"></div>
                <div class="a_r"></div>
                <v-btn class="search_toggle" icon size="small" color="rgba(255,255,255,0.92)" variant="tonal"
                    @click.stop="searchBarVisible = !searchBarVisible">
                    <v-icon :icon="searchBarVisible ? 'mdi-close' : 'mdi-magnify'" />
                </v-btn>
                <div v-show="searchBarVisible" class="search_bar">
                    <div class="search_bar__top">
                        <div class="search_bar__header">Navigation Search</div>
                        <v-text-field theme="dark" density="compact" variant="solo" class="search_bar__field"
                            label="Search destination" prepend-inner-icon="mdi-magnify" single-line
                            hide-details></v-text-field>
                        <v-row align="center" class="search_bar__quick-row">
                            <v-col cols="6">
                                <v-card class="elevation-0 cur search_bar__quick-card" theme="dark">
                                    <div class="search_bar__quick-title">Location</div>
                                    <div class="search_bar__quick-text">Tian City</div>
                                </v-card>
                            </v-col>
                            <v-col cols="6">
                                <v-card class="elevation-0 de search_bar__quick-card" theme="dark">
                                    <div class="search_bar__quick-title">Dest</div>
                                    <div class="search_bar__quick-text">Vienna Hotels</div>
                                </v-card>
                            </v-col>
                        </v-row>
                    </div>
                    <v-list theme="dark" class="search_bar__list">
                        <v-btn variant="text" class="search_bar__result">
                            <div class="search_bar__result-content">
                                <div class="search_bar__result-main">
                                    <div class="search_bar__result-title">Vienna Hotels</div>
                                    <div class="search_bar__result-meta">3.1 Km</div>
                                    <div class="search_bar__result-subtitle">Longgang Central City</div>
                                </div>
                                <v-icon icon="mdi-map-marker-radius" size="20" />
                            </div>
                        </v-btn>
                        <v-btn variant="text" class="search_bar__result">
                            <div class="search_bar__result-content">
                                <div class="search_bar__result-main">
                                    <div class="search_bar__result-title">Vienna Hotels</div>
                                    <div class="search_bar__result-meta">3.1 Km</div>
                                    <div class="search_bar__result-subtitle">Longgang Central City</div>
                                </div>
                                <v-icon icon="mdi-map-marker-radius" size="20" />
                            </div>
                        </v-btn>
                        <v-btn variant="text" class="search_bar__result">
                            <div class="search_bar__result-content">
                                <div class="search_bar__result-main">
                                    <div class="search_bar__result-title">Vienna Hotels</div>
                                    <div class="search_bar__result-meta">3.1 Km</div>
                                    <div class="search_bar__result-subtitle">Longgang Central City</div>
                                </div>
                                <v-icon icon="mdi-map-marker-radius" size="20" />
                            </div>
                        </v-btn>
                    </v-list>
                </div>
                <div class="bottom_bar" @click="onStart">
                    <div class="bb_inner elevation-10">
                        <div class="bbi_wrap d-flex">
                            <v-btn variant="text" icon="mdi-car-parking-lights" color="#ffffff" class="hide"></v-btn>
                            <v-btn variant="text" icon="mdi-car-brake-parking" color="#ffffff" class="hide"></v-btn>
                            <v-btn variant="text" icon="mdi-car-traction-control" color="#ffffff" class="hide"></v-btn>
                            <v-btn variant="text" icon="mdi-car-defrost-rear" color="#ffffff"></v-btn>
                            <div class="igroup">
                                <div class="ig_inner d-flex">
                                    <div class="wd">
                                        <div class="text-h6">{{ vehicle.cabinAc.temp }}&deg;C</div>
                                        <div class="label">{{ vehicle.cabinAc.on ? "A/C" : "OFF" }}</div>
                                    </div>
                                    <v-btn variant="text" class="icon_fan" :class="{ 'is-off': !vehicle.cabinAc.on }"
                                        :loading="cabinAcPending" :disabled="cabinAcPending"
                                        @click.stop="toggleCabinAc">
                                        <div class="icon_fan_in">
                                            <v-icon icon="mdi-fan" :class="{ 'mdi-spin': vehicle.cabinAc.on }" />
                                        </div>
                                    </v-btn>
                                    <div class="wd">
                                        <div class="text-h6">{{ weather.outdoorTemp }}&deg;C</div>
                                        <div class="label">Outdoor</div>
                                    </div>
                                </div>
                            </div>
                            <v-btn variant="text" icon="mdi-phone-dial" color="#ffffff"></v-btn>
                            <v-btn variant="text" icon="mdi-music-note-bluetooth" color="#ffffff" class="hide"></v-btn>
                            <v-btn variant="text" icon="mdi-gauge" color="#ffffff" class="hide"></v-btn>
                            <v-btn variant="text" icon="mdi-view-comfy" color="#ffffff" class="hide"></v-btn>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, shallowRef } from 'vue';
import AMapLoader from '@amap/amap-jsapi-loader';
import { useAppStore } from '@/stores/useAppStore';
import { useVehicleStore, type DoorState } from '@/stores/useVehicleStore';
import VehicleModelViewer from '@/components/VehicleModelViewer/index.vue';
import Weather from './widgets/Weather.vue';
import { useEnvironmentStore } from '@/stores/useEnvironmentStore';

const appStore = useAppStore();
const vehicleStore = useVehicleStore();
const vehicle = vehicleStore.vehicle;
const environment = useEnvironmentStore();
const weather = computed(() => {
    return environment.weather;
});
const weatherIconSrc = computed(() => {
    return environment.weatherIconMap[environment.weather.iconKey ?? 'cloudy'];
});
const vehicleWeatherPreset = computed<'sunny' | 'cloudy' | 'rainy' | 'snowy'>(() => {
    const condition = 'rain';
    const iconKey = `${weather.value.iconKey ?? ''}`.toLowerCase();

    if (condition.includes('snow') || condition.includes('雪') || iconKey.includes('snow')) {
        return 'snowy';
    }

    if (condition.includes('rain') || condition.includes('storm') || condition.includes('雨') || iconKey.includes('rain')) {
        return 'rainy';
    }

    if (condition.includes('sun') || condition.includes('clear') || condition.includes('晴') || iconKey.includes('sun')) {
        return 'sunny';
    }

    return 'cloudy';
});
const theme = computed(() => {
    if (appStore.theme === 'dark' && appStore.settings.cardStyle === 'liquid-glass') {
        return 'dark';
    }

    return 'light';
});

onMounted(() => {
    vehicleStore.getVehicle();
    environment.getEnvironment();
});

const map_ = shallowRef<any>(null);
let AMap: any;
let marker: any;
const searchBarVisible = shallowRef(false);
const cabinAcPending = shallowRef(false);
const chargingPending = shallowRef(false);
const doorPending = reactive<Record<keyof DoorState, boolean>>({
    frontLeftClosed: false,
    frontRightClosed: false,
    rearLeftClosed: false,
    rearRightClosed: false,
    trunkClosed: false,
});

const doorMeta: Array<{ key: keyof DoorState; label: string; icon: string }> = [
    { key: 'frontLeftClosed', label: 'Front Left', icon: 'mdi-car-door' },
    { key: 'frontRightClosed', label: 'Front Right', icon: 'mdi-car-door' },
    { key: 'rearLeftClosed', label: 'Rear Left', icon: 'mdi-car-door-lock' },
    { key: 'rearRightClosed', label: 'Rear Right', icon: 'mdi-car-door-lock' },
    { key: 'trunkClosed', label: 'Trunk', icon: 'mdi-car-back' },
];

const doorControls = computed(() => {
    return doorMeta.map((item) => ({
        ...item,
        closed: vehicle.doorStatus[item.key],
    }));
});

const chargeSummary = computed(() => {
    if (!vehicle.vehicleOnline) {
        return 'Vehicle is offline. Remote charging and pre-conditioning may be delayed.';
    }

    if (vehicle.charging) {
        return `Charging started. Current battery is ${vehicle.batteryPercent}% and estimated range is ${vehicle.remainingRangeKm} km.`;
    }

    if (!vehicleStore.allDoorsClosed) {
        return 'A door is still open. Secure the vehicle before departure or charging.';
    }

    return 'Vehicle is ready. You can start charging now or keep current standby state.';
});

// Toggle cabin A/C on the service side and let the store drive the UI state.
const toggleCabinAc = async () => {
    if (cabinAcPending.value) {
        return;
    }

    cabinAcPending.value = true;
    try {
        await vehicleStore.updateCabinAc({
            on: !vehicle.cabinAc.on,
        });
    } finally {
        cabinAcPending.value = false;
    }
};

const toggleDoor = async (door: keyof DoorState) => {
    if (doorPending[door]) {
        return;
    }

    doorPending[door] = true;
    try {
        await vehicleStore.updateDoorStatus(door, !vehicle.doorStatus[door]);
    } finally {
        doorPending[door] = false;
    }
};

const toggleCharging = async () => {
    if (chargingPending.value) {
        return;
    }

    chargingPending.value = true;
    try {
        await vehicleStore.updateCharging(!vehicle.charging);
    } finally {
        chargingPending.value = false;
    }
};

// Demo route points used by moveAlong.
const lineArr = [
    [116.478935, 39.997761],
    [116.478939, 39.997825],
    [116.478912, 39.998549],
    [116.478912, 39.998549],
    [116.478998, 39.998555],
    [116.478998, 39.998555],
    [116.479282, 39.99856],
    [116.479658, 39.998528],
    [116.480151, 39.998453],
    [116.480784, 39.998302],
    [116.480784, 39.998302],
    [116.481149, 39.998184],
    [116.481573, 39.997997],
    [116.481863, 39.997846],
    [116.482072, 39.997718],
    [116.482362, 39.997718],
    [116.483633, 39.998935],
    [116.48367, 39.998968],
    [116.484648, 39.999861],
];

// Load the AMap SDK before building the map scene.
const initMap = async () => {
    const amap_ = await AMapLoader.load({
        key: '527a03c5d37f26c924d83b3c68f9ac5c',
        version: '2.0',
        Loca: {
            version: '2.0',
        },
    });

    AMap = amap_;
    initDrivingScene();
};

// Build the map, marker and polylines for the driving demo.
const initDrivingScene = () => {
    AMap.plugin('AMap.MoveAnimation', function () {
        const map = new AMap.Map('amap', {
            resizeEnable: true,
            // Toggle map text labels.
            showLabel: true,
            center: [116.478935, 39.997761],
            pitch: 55,
            zoom: 16.8,
            viewMode: '3D',
            skyColor: '#1a1a1a',
            mapStyle: 'amap://styles/dark',
            buildingAnimation: true,
        });

        map_.value = map;

        // Marker used as the moving car.
        marker = new AMap.Marker({
            map,
            position: [116.478935, 39.997761],
            icon: 'https://a.amap.com/jsapi_demos/static/demo-center-v2/car.png',
            offset: new AMap.Pixel(-13, -26),
        });

        // Full route shown as the base path.
        new AMap.Polyline({
            map,
            path: lineArr,
            showDir: true,
            strokeColor: '#5D95E6',
            strokeWeight: 6,
            strokeStyle: 'solid',
        });

        // Passed route uses a second color so progress is visible.
        const passedPolyline = new AMap.Polyline({
            map,
            strokeColor: '#AF5',
            strokeWeight: 6,
        });

        // Keep route progress, center and rotation in sync while moving.
        marker.on('moving', function (e: any) {
            passedPolyline.setPath(e.passedPath);
            map.setCenter(e.target.getPosition());
            map.setRotation(-e.target.getOrientation());
        });
    });
};

// Start the car animation from the bottom control bar.
const onStart = () => {
    marker?.moveAlong(lineArr, {
        // Duration for each route segment.
        duration: 1000,
        // Match the marker direction to the route.
        autoRotation: true,
    });
};

initMap();

onBeforeUnmount(() => {
    map_.value?.destroy();
    marker?.stopMove();
});
</script>

<style scoped lang="scss">
#amap {
    height: 500px;
    position: relative;
}

.tesla {
    .car {
        position: relative;

        .row2 {
            display: flex;
            align-items: center;
            width: 50%;

            .v-card {
                margin-top: 16px;
            }
        }

        .v-card {
            width: 50%;
            border-radius: 12px;
        }

        .battery {
            background-image: linear-gradient(to right, #4eebe4, #69fee1);
            margin-right: 8px;

            .innericon {
                color: #ffffff;
            }
        }

        .Trip {
            background-image: linear-gradient(to right, #6b38fb, #bc78f2);
            margin-left: 8px;

            .innericon {
                color: #ffffff;
            }
        }

        .row3 {
            display: flex;
            width: 50%;
            margin-top: 16px;
            gap: 16px;

            .v-card {
                width: calc(50% - 8px);
                border-radius: 18px;
            }
        }

        .tesla_model {
            width: 48%;
            position: absolute;
            right: 0;
            height: 100%;
            border-radius: 24px;
        }

        .panel_head {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
            margin-bottom: 16px;
        }

        .status_chip {
            flex-shrink: 0;
            border-radius: 999px;
            padding: 6px 10px;
            background: rgba(255, 255, 255, 0.12);
            font-size: 12px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.88);

            &.online {
                background: rgba(55, 174, 210, 0.18);
                color: #37aed2;
            }

            &.warning {
                background: rgba(255, 193, 7, 0.16);
                color: #ffc107;
            }
        }

        .door_panel {
            background: linear-gradient(160deg, rgba(18, 23, 33, 0.96), rgba(37, 43, 56, 0.94));
            color: #ffffff;
        }

        .door_grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }

        .door_item {
            border: 0;
            border-radius: 14px;
            padding: 12px;
            text-align: left;
            color: #ffffff;
            cursor: pointer;
            background: rgba(255, 255, 255, 0.06);
            transition: transform 0.2s ease, background 0.2s ease;

            &:hover:not(:disabled) {
                transform: translateY(-2px);
                background: rgba(255, 255, 255, 0.1);
            }

            &:disabled {
                cursor: progress;
                opacity: 0.7;
            }

            &.open {
                background: rgba(255, 193, 7, 0.14);

                .door_item_state {
                    color: #ffc107;
                }
            }
        }

        .door_item_top {
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 13px;
            font-weight: 600;
        }

        .door_item_state {
            margin-top: 10px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.72);
        }

        .charge_panel {
            background: linear-gradient(160deg, rgba(14, 30, 44, 0.96), rgba(32, 53, 70, 0.95));
            color: #ffffff;
        }

        .charge_metrics {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }

        .metric_card {
            border-radius: 14px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.06);
        }

        .metric_label {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.66);
        }

        .metric_value {
            margin-top: 8px;
            font-size: 18px;
            font-weight: 700;
        }

        .charge_footer {
            margin-top: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
        }

        .charge_copy {
            flex: 1;
            font-size: 12px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.72);
        }
    }

    .car_sys {
        overflow: hidden;
        background: #212121;
        border-radius: 12px;
        margin-bottom: 16px;

        .a_t {
            z-index: 1;
            pointer-events: none;
            position: absolute;
            width: 100%;
            height: 50px;
            background-image: linear-gradient(to bottom, #1a1a1a, #1a1a1a, transparent);
        }

        .a_l,
        .a_r {
            z-index: 1;
            pointer-events: none;
            position: absolute;
            width: 100px;
            height: 100%;
        }

        .a_l {
            left: 0;
            background-image: linear-gradient(to right, #1a1a1a, #1a1a1a, transparent);
        }

        .a_r {
            right: 0;
            background-image: linear-gradient(to left, #1a1a1a, #1a1a1a, transparent);
        }

        .v-system-bar {
            .v-icon {
                color: #ffffff;
                opacity: 1;
            }
        }

        .bottom_bar {
            height: 76px;
            position: absolute;
            left: 20%;
            bottom: 10px;
            width: 60%;
            z-index: 3;

            .bb_inner {
                border-radius: 30px;

                .bbi_wrap {
                    height: 76px;
                    border-radius: 20px;
                    align-items: center;
                    background: #1a1a1a;
                    justify-content: space-around;
                }

                .igroup {
                    width: 320px;
                    color: rgba(255, 255, 255, 0.8);
                    text-align: center;
                    align-self: flex-start;

                    .ig_inner {
                        height: 70px;
                        display: flex;
                        align-items: center;
                        justify-content: space-around;
                        position: relative;
                        z-index: 3;
                        background: #282828;
                        border-radius: 0 0 33px 33px;
                        padding: 0 20px;
                    }

                    .wd {
                        position: relative;
                        z-index: 1;
                    }

                    .label {
                        font-size: 12px;
                    }

                    .icon_fan {
                        width: 52px;
                        height: 52px;
                        min-width: 52px;
                        padding: 2px;
                        border-radius: 50%;
                        position: relative;
                        overflow: hidden;
                        background-image: linear-gradient(to bottom, #37aed2, #282828);
                        transition: 0.2s ease;

                        &.is-off {
                            background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0.28), #282828);
                        }

                        .icon_fan_in {
                            padding: 6px;
                            background: #282828;
                            border-radius: 50%;
                        }
                    }

                    .mdi-fan {
                        font-size: 38px;
                        color: #37aed2;
                        z-index: 1;
                    }

                    .icon_fan.is-off .mdi-fan {
                        color: rgba(255, 255, 255, 0.42);
                    }
                }
            }
        }

        .search_bar {
            position: absolute;
            left: 50px;
            top: 30px;
            width: 284px;
            height: 350px;
            padding: 12px 12px 10px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: rgba(10, 16, 24, 0.86);
            z-index: 3;
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            box-shadow: 0 20px 48px rgba(0, 0, 0, 0.36);
            backdrop-filter: blur(18px);
            color: rgba(255, 255, 255, 0.96);

            &__top {
                flex-shrink: 0;
                display: grid;
                gap: 8px;
            }

            &__header {
                padding: 0 2px;
                font-size: 12px;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.68);
            }

            &__field {
                margin: 0;
            }

            &__quick-card {
                min-height: 54px;
                padding: 8px 10px;
                border-radius: 10px;
                color: #ffffff;
                box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
            }

            &__quick-row {
                margin: 0 -4px;
            }

            &__quick-title {
                font-size: 12px;
                font-weight: 600;
                line-height: 1.2;
                color: rgba(255, 255, 255, 0.9);
            }

            &__quick-text {
                margin-top: 4px;
                font-size: 11px;
                line-height: 1.2;
                color: rgba(255, 255, 255, 0.78);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            &__list {
                flex: 1;
                min-height: 0;
                background: transparent;
                color: rgba(255, 255, 255, 0.94);
                overflow-y: auto;
                margin: 10px 0 0;
                padding-right: 4px;
                scrollbar-width: thin;
                scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
            }

            &__result {
                width: 100%;
                height: auto;
                min-height: 0;
                padding: 0;
                justify-content: stretch;
                text-transform: none;
                letter-spacing: normal;
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.045);
                margin: 0 0 6px;
            }

            :deep(.search_bar__field .v-field) {
                min-height: 42px;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.1);
                box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
            }

            :deep(.search_bar__field .v-field__input) {
                min-height: 42px;
                padding-top: 0;
                padding-bottom: 0;
            }

            :deep(.search_bar__field .v-label),
            :deep(.search_bar__field .v-field__prepend-inner .v-icon),
            :deep(.search_bar__field input) {
                color: rgba(255, 255, 255, 0.92);
                opacity: 1;
            }

            :deep(.search_bar__result .v-btn__content) {
                width: 100%;
                display: block;
            }

            &__result-content {
                width: 100%;
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
                padding: 10px 12px;
            }

            &__result-main {
                min-width: 0;
                text-align: left;
                display: grid;
                gap: 2px;
            }

            &__result-title {
                color: #ffffff;
                font-size: 14px;
                font-weight: 600;
            }

            &__result-meta {
                color: rgba(255, 255, 255, 0.72);
                font-size: 12px;
                margin-top: 2px;
            }

            &__result-subtitle {
                color: rgba(255, 255, 255, 0.72);
                font-size: 12px;
                margin-top: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            :deep(.search_bar__result .v-icon) {
                color: rgba(255, 255, 255, 0.78);
                flex-shrink: 0;
                align-self: center;
            }

            :deep(.search_bar__result:hover) {
                background: rgba(255, 255, 255, 0.08);
            }

            :deep(.search_bar__result .v-ripple__container) {
                border-radius: 10px;
            }

            :deep(.search_bar__result .v-btn__overlay) {
                opacity: 1;
                background: transparent;
            }

            &__list::-webkit-scrollbar {
                width: 6px;
            }

            &__list::-webkit-scrollbar-track {
                background: transparent;
            }

            &__list::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.24);
                border-radius: 999px;
            }

            &__list::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.36);
            }

            .cur {
                background-image: linear-gradient(135deg, #25c9d7, #4eebe4);
            }

            .de {
                background-image: linear-gradient(135deg, #8a62ff, #c77fff);
            }
        }

        .search_toggle {
            position: absolute;
            top: 18px;
            right: 18px;
            z-index: 4;
            backdrop-filter: blur(10px);
        }
    }
}

.mobile {
    .tesla {
        .car {
            .tesla_model {
                width: 86%;
                height: 300px;
                display: block;
                margin: 0 auto;
            }

            .row2 {
                width: auto;
                display: block !important;
            }

            .row3 {
                width: auto;
                display: block !important;

                .v-card {
                    width: auto;
                    margin-bottom: 16px;
                }
            }

            .v-card {
                width: auto;
            }

            .battery {
                margin-right: 0;
            }

            .Trip {
                margin-left: 0;
            }
        }

        .car_sys {
            .search_bar {
                display: none;
                visibility: hidden;
            }
        }

        .bottom_bar {
            width: 92%;
            left: 4%;
        }

        .hide {
            display: none;
        }
    }
}
</style>
