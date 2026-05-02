import { createPrefixedAiRequest } from './axios';
import type { RootInterface } from './axios';
import type {
    EnvironmentState,
    LightState,
    CurtainState,
    AirConditionerState,
    CameraState,
    HumidifierState,
    MusicState,
} from '@/stores/useEnvironmentStore';

// 🌟 锦囊：在这里定义模块公共前缀
const aiRequest = createPrefixedAiRequest('/environment');
// 环境相关接口：环境设备接口
export const ApiEnvironment = {
    // 获取环境设备列表
    getEnvironmentList: (): Promise<RootInterface<EnvironmentState>> => {
        return aiRequest({
            url: `/overview`,
        });
    },
    getLivingRoomLight: (): Promise<RootInterface<LightState>> => {
        return aiRequest({
            url: `/light`,
        });
    },
    patchLivingRoomLight: (data: LightState): Promise<void> => {
        return aiRequest({
            url: `/light`,
            method: 'patch',
            data,
        });
    },

    getLivingRoomCurtain: (): Promise<RootInterface<CurtainState>> => {
        return aiRequest({
            url: `/curtain`,
        });
    },
    patchLivingRoomCurtain: (data: CurtainState): Promise<void> => {
        return aiRequest({
            url: '/curtain',
            method: 'patch',
            data,
        });
    },

    getLivingRoomAirConditioner: (): Promise<RootInterface<AirConditionerState>> => {
        return aiRequest({
            url: `}/air-conditioner`,
        });
    },
    patchLivingRoomAirConditioner: (data: AirConditionerState): Promise<void> => {
        return aiRequest({
            url: `/air-conditioner`,
            method: 'patch',
            data,
        });
    },

    getLivingRoomCamera: (): Promise<RootInterface<CameraState>> => {
        return aiRequest({
            url: `/camera`,
        });
    },
    patchLivingRoomCamera: (data: CameraState): Promise<void> => {
        return aiRequest({
            url: `/camera`,
            method: 'patch',
            data,
        });
    },

    getLivingRoomHumidifier: (): Promise<RootInterface<HumidifierState>> => {
        return aiRequest({
            url: `/humidifier`,
        });
    },
    patchLivingRoomHumidifier: (data: HumidifierState): Promise<void> => {
        return aiRequest({
            url: `/humidifier`,
            method: 'patch',
            data,
        });
    },
    getLivingRoomMusic: (): Promise<RootInterface<MusicState>> => {
        return aiRequest({
            url: `/music`,
        });
    },
    patchLivingRoomMusic: (data: any): Promise<void> => {
        return aiRequest({
            url: `/music`,
            method: 'patch',
            data,
        });
    },
};
