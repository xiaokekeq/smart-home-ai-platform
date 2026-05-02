import { reactive } from 'vue';
import { defineStore } from 'pinia';
import cloudImg from '@/assets/cloud.png';
import lightImg from '@/assets/light.jpg';
import curtainImg from '@/assets/curtain.png';
import cameraImg from '@/assets/device/cctv.png';
import humidifierImg from '@/assets/device/humidifier.png';
import { ApiEnvironment } from '@/api/environment';
import type { LightMode } from '@/types/smartHome';

type WeatherIconKey = 'cloudy' | 'sunny' | 'rainy';

export interface ConnectivityState {
    wifiConnected: boolean;
    powerConnected: boolean;
}

export interface WeatherState {
    city: string;
    condition: string;
    iconKey?: WeatherIconKey;
    outdoorTemp: number;
    humidity: number;
}

export interface LightState {
    on: boolean;
    brightness: number;
    mode: LightMode;
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

export interface HumidifierState {
    on: boolean;
    connectivity: ConnectivityState;
}

export interface MusicState {
    playing: boolean;
    trackName: string;
    artist: string;
    url: string;
    volume: number;
    cover: string;
    duration: number;
}

export interface LivingRoomState {
    indoorTemp: number;
    light: LightState;
    airConditioner: AirConditionerState;
    curtain: CurtainState;
    wifiOn: boolean;
    camera: CameraState;
    humidifier: HumidifierState;
    music: MusicState;
}

export interface EnvironmentState {
    weather: WeatherState;
    livingRoom: LivingRoomState;
}

export const useEnvironmentStore = defineStore('environment', () => {
    const weather = reactive<WeatherState>({
        city: 'Shenzhen',
        condition: 'Cloudy To Clear',
        iconKey: 'cloudy',
        outdoorTemp: 31,
        humidity: 68,
    });

    const livingRoom = reactive<LivingRoomState>({
        indoorTemp: 30,
        light: {
            on: true,
            brightness: 80,
            mode: 'normal',
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
        wifiOn: true,
        camera: {
            on: true,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        humidifier: {
            on: false,
            connectivity: {
                wifiConnected: true,
                powerConnected: true,
            },
        },
        music: {
            playing: false,
            trackName: '暂无歌曲',
            artist: '暂无',
            volume: 50,
            cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
            duration: 0,
            url: '',
        },
    });

    const getEnvironment = async (): Promise<void> => {
        try {
            const resultEnvironment = await ApiEnvironment.getEnvironmentList();
            console.log(resultEnvironment);
            setWeather(resultEnvironment.data.weather);
            setLivingRoom(resultEnvironment.data.livingRoom);
        } catch (error) {
            return Promise.reject(error);
        }
    };

    const setWeather = (payload: Partial<WeatherState>) => {
        Object.assign(weather, payload);
    };

    const setLivingRoom = (payload: Partial<LivingRoomState>) => {
        Object.assign(livingRoom, payload);
    };

    const updateLivingRoomLight = async (payload: Partial<LightState>) => {
        // 1. 记下“撤回用”的快照
        const previousState = { ...livingRoom.light };
        // 2. 瞬间帮 UI 把效果打出来
        Object.assign(livingRoom.light, payload);
        try {
            // 3. 把最新的灯光完整数据发送给由于后端（因为你刚才把所有活着的属性都拷贝上去了，这就是最新形态）
            // 💡注意：前提是你已经在 api/environment.ts 里写好了 patchLivingRoomLight 这个发送补丁的接口！
            await ApiEnvironment.patchLivingRoomLight(livingRoom.light);
        } catch (error) {
            //Error 或者是网络断了 赶紧把灯悄悄从假装打开的状态按回去！
            Object.assign(livingRoom.light, previousState);
            return Promise.reject(error);
        }
    };

    const updateLivingRoomAirConditioner = async (payload: Partial<AirConditionerState>) => {
        const previousState = { ...livingRoom.airConditioner };

        Object.assign(livingRoom.airConditioner, payload);
        try {
            await ApiEnvironment.patchLivingRoomAirConditioner(livingRoom.airConditioner);
        } catch (error) {
            Object.assign(livingRoom.airConditioner, previousState);
            return Promise.reject(error);
        }
    };

    const updateLivingRoomCurtain = async (payload: Partial<CurtainState>) => {
        const previousState = { ...livingRoom.curtain };
        Object.assign(livingRoom.curtain, payload);
        try {
            await ApiEnvironment.patchLivingRoomCurtain(livingRoom.curtain);
        } catch (error) {
            Object.assign(livingRoom.curtain, previousState);
            return Promise.reject(error);
        }
    };

    const updateLivingRoomCamera = async (payload: Partial<CameraState>) => {
        const previousState = { ...livingRoom.camera };
        Object.assign(livingRoom.camera, payload);
        try {
            await ApiEnvironment.patchLivingRoomCamera(livingRoom.camera);
        } catch (error) {
            Object.assign(livingRoom.camera, previousState);
            return Promise.reject(error);
        }
    };

    const updateLivingRoomHumidifier = async (payload: Partial<HumidifierState>) => {
        const previousState = { ...livingRoom.humidifier };
        Object.assign(livingRoom.humidifier, payload);
        try {
            await ApiEnvironment.patchLivingRoomHumidifier(livingRoom.humidifier);
        } catch (error) {
            Object.assign(livingRoom.humidifier, previousState);
            return Promise.reject(error);
        }
    };

    const updateLivingRoomWifi = (payload: boolean) => {
        livingRoom.wifiOn = payload;
    };

    const updateMusic = async (payload: Partial<MusicState>) => {
        const previousState = { ...livingRoom.music };
        Object.assign(livingRoom.music, payload);
        try {
            await ApiEnvironment.patchLivingRoomMusic(payload);
        } catch (error) {
            Object.assign(livingRoom.music, previousState);
            return Promise.reject(error);
        }
    };

    const getMusic = async () => {
        try {
            const result = await ApiEnvironment.getLivingRoomMusic();
            Object.assign(livingRoom.music, result.data);
        } catch (error) {
            return Promise.reject(error);
        }
    };

    const weatherIconMap = {
        cloudy: cloudImg,
        sunny: cloudImg,
        rainy: cloudImg,
    } as const;

    const livingRoomIconMap = {
        light: lightImg,
        curtain: curtainImg,
        camera: cameraImg,
        humidifier: humidifierImg,
    } as const;

    return {
        weather,
        livingRoom,
        weatherIconMap,
        livingRoomIconMap,
        getEnvironment,
        getMusic,
        setWeather,
        setLivingRoom,
        updateLivingRoomLight,
        updateLivingRoomAirConditioner,
        updateLivingRoomCurtain,
        updateLivingRoomCamera,
        updateLivingRoomHumidifier,
        updateLivingRoomWifi,
        updateMusic,
    };
});
