import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import lightImg from '@/assets/light.jpg';
import curtainImg from '@/assets/curtain.png';
import cameraImg from '@/assets/device/cctv.png';
import humidifierImg from '@/assets/device/humidifier.png';

// 复用 environmentStore 的类型定义
export interface ConnectivityState {
    wifiConnected: boolean;
    powerConnected: boolean;
}

export interface LightState {
    on: boolean;
    brightness: number;
    connectivity: ConnectivityState;
}

export interface CurtainState {
    openPercent: number;
    connectivity: ConnectivityState;
}

export interface AirConditionerState {
    on: boolean;
    temp: number;
    connectivity: ConnectivityState;
}

export interface CameraState {
    on: boolean;
    connectivity: ConnectivityState;
}

export interface DoorLockState {
    locked: boolean;
    connectivity: ConnectivityState;
}

// 通用房间状态接口
export interface RoomState {
    name: string;
    displayName: string;
    indoorTemp: number;
    wifiOn: boolean;
    light: LightState;
    airConditioner: AirConditionerState;
    curtain: CurtainState;
    camera: CameraState;
    doorLock?: DoorLockState; // 可选，某些房间有门锁
}

export type SpaceType = 'bedroom' | 'kitchen' | 'garage';

export const useSpaceStore = defineStore('space', () => {
    // 当前选中的空间
    const currentSpace = ref<SpaceType>('bedroom');

    // 卧室状态
    const bedroom = reactive<RoomState>({
        name: 'bedroom',
        displayName: '卧室',
        indoorTemp: 26,
        wifiOn: true,
        light: {
            on: false,
            brightness: 30,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        airConditioner: {
            on: false,
            temp: 24,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        curtain: {
            openPercent: 0,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        camera: {
            on: true,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        doorLock: {
            locked: true,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
    });

    // 厨房状态
    const kitchen = reactive<RoomState>({
        name: 'kitchen',
        displayName: '厨房',
        indoorTemp: 28,
        wifiOn: true,
        light: {
            on: true,
            brightness: 100,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        airConditioner: {
            on: false,
            temp: 24,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        curtain: {
            openPercent: 100,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        camera: {
            on: true,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
    });

    // 车库状态
    const garage = reactive<RoomState>({
        name: 'garage',
        displayName: '车库',
        indoorTemp: 32,
        wifiOn: true,
        light: {
            on: false,
            brightness: 80,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        airConditioner: {
            on: false,
            temp: 24,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        curtain: {
            openPercent: 0,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        camera: {
            on: true,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        doorLock: {
            locked: true,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
    });

    // 获取当前空间的状态
    const getCurrentRoom = () => {
        switch (currentSpace.value) {
            case 'bedroom':
                return bedroom;
            case 'kitchen':
                return kitchen;
            case 'garage':
                return garage;
            default:
                return bedroom;
        }
    };

    // 切换空间
    const switchSpace = (space: SpaceType) => {
        currentSpace.value = space;
    };

    // 更新灯光状态（通用方法）
    const updateLight = (space: SpaceType, payload: Partial<LightState>) => {
        const room = space === 'bedroom' ? bedroom : space === 'kitchen' ? kitchen : garage;
        const previousState = { ...room.light };
        Object.assign(room.light, payload);

        // 这里可以调用 API，失败时回滚
        // try {
        //     await ApiSpace.updateLight(space, room.light);
        // } catch (error) {
        //     Object.assign(room.light, previousState);
        //     return Promise.reject(error);
        // }
    };

    // 更新空调状态（通用方法）
    const updateAirConditioner = (space: SpaceType, payload: Partial<AirConditionerState>) => {
        const room = space === 'bedroom' ? bedroom : space === 'kitchen' ? kitchen : garage;
        const previousState = { ...room.airConditioner };
        Object.assign(room.airConditioner, payload);
    };

    // 更新窗帘状态（通用方法）
    const updateCurtain = (space: SpaceType, payload: Partial<CurtainState>) => {
        const room = space === 'bedroom' ? bedroom : space === 'kitchen' ? kitchen : garage;
        const previousState = { ...room.curtain };
        Object.assign(room.curtain, payload);
    };

    // 更新摄像头状态（通用方法）
    const updateCamera = (space: SpaceType, payload: Partial<CameraState>) => {
        const room = space === 'bedroom' ? bedroom : space === 'kitchen' ? kitchen : garage;
        const previousState = { ...room.camera };
        Object.assign(room.camera, payload);
    };

    // 更新门锁状态（通用方法）
    const updateDoorLock = (space: SpaceType, payload: Partial<DoorLockState>) => {
        const room = space === 'bedroom' ? bedroom : space === 'kitchen' ? kitchen : garage;
        if (room.doorLock) {
            const previousState = { ...room.doorLock };
            Object.assign(room.doorLock, payload);
        }
    };

    // 更新 WiFi 状态（通用方法）
    const updateWifi = (space: SpaceType, wifiOn: boolean) => {
        const room = space === 'bedroom' ? bedroom : space === 'kitchen' ? kitchen : garage;
        room.wifiOn = wifiOn;
    };

    const deviceIconMap = {
        light: lightImg,
        curtain: curtainImg,
        camera: cameraImg,
        humidifier: humidifierImg,
    } as const;

    return {
        currentSpace,
        bedroom,
        kitchen,
        garage,
        deviceIconMap,
        getCurrentRoom,
        switchSpace,
        updateLight,
        updateAirConditioner,
        updateCurtain,
        updateCamera,
        updateDoorLock,
        updateWifi,
    };
});
