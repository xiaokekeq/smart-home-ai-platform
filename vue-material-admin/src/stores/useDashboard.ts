import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { EnvironmentState } from './useEnvironmentStore';
import type { VehicleState } from './useVehicleStore';
import { ApiDashboard } from '@/api/dashboard';
import { useEnvironmentStore } from './useEnvironmentStore';
import { useVehicleStore } from './useVehicleStore';
import { ApiAi } from '@/api/ai';
import type { AiSuggestionResponseData } from '@/api/ai';
export interface DashboardState {
    environment: EnvironmentState;
    vehicle: VehicleState;
}

const loading = ref(false);
const loaded = ref(false);

export const useDashboardStore = defineStore('dashboard', () => {
    const environmentStore = useEnvironmentStore();
    const vehicleStore = useVehicleStore();

    const vehicle = vehicleStore.vehicle;
    const aiSuggestion = ref<AiSuggestionResponseData | null>(null);

    const dashboard = computed<DashboardState>(() => ({
        environment: {
            weather: environmentStore.weather,
            livingRoom: environmentStore.livingRoom,
        },
        vehicle: vehicleStore.vehicle,
    }));

    const getDashboard = async () => {
        loading.value = true;
        try {
            const dashboardResult = await ApiDashboard.getDashboard();
            // 关键修正 2：不要用 dashboard.value = result.data 覆盖！这会彻底弄断引用关联！
            // 必须把后端拉回来的最新数据，直接“深入灌注”到底层的 store 中去。
            environmentStore.setWeather(dashboardResult.data.environment.weather);
            environmentStore.setLivingRoom(dashboardResult.data.environment.livingRoom);
            vehicleStore.setVehicleStatus(dashboardResult.data.vehicle);

            // 同时拉取 AI 智能建议
            try {
                const suggestionResult = await ApiAi.getAiSuggestion();
                aiSuggestion.value = suggestionResult.data;
            } catch (error) {
                console.error('Failed to fetch AI suggestion:', error);
            }

            loaded.value = true;
        } catch {
            return Promise.reject('Failed to fetch dashboard data');
        } finally {
            loading.value = false;
        }
    };

    return {
        environmentStore,
        vehicleStore,
        dashboard,
        aiSuggestion,
        loading,
        loaded,
        getDashboard,
    };
});
