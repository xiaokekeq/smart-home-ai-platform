import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import { ApiVehicle } from '@/api/vehicle';
export interface DoorState {
    frontLeftClosed: boolean;
    frontRightClosed: boolean;
    rearLeftClosed: boolean;
    rearRightClosed: boolean;
    trunkClosed: boolean;
}
export interface VehicleAcState {
    on: boolean;
    temp: number;
}
export interface VehicleState {
    batteryPercent: number;
    remainingRangeKm: number;
    doorStatus: DoorState;
    vehicleOnline: boolean;
    cabinAc: VehicleAcState;
    charging: boolean;
}

export const useVehicleStore = defineStore('vehicle', () => {
    const vehicle = reactive<VehicleState>({
        batteryPercent: 78,
        remainingRangeKm: 420,
        doorStatus: {
            frontLeftClosed: true,
            frontRightClosed: true,
            rearLeftClosed: true,
            rearRightClosed: true,
            trunkClosed: true,
        },
        vehicleOnline: true,
        cabinAc: {
            on: false,
            temp: 22,
        },
        charging: false,
    });

    const getVehicle = async (): Promise<void> => {
        try {
            const vehicleResult = await ApiVehicle.getVehicleState();
            setVehicleStatus(vehicleResult.data.vehicle);
        } catch (error) {
            return Promise.reject(error);
        }
    };

    const updateDoorStatus = async (door: keyof DoorState, closed: boolean) => {
        const previousState = { ...vehicle.doorStatus };
        vehicle.doorStatus[door] = closed;
        try {
            await ApiVehicle.patchDoors(vehicle.doorStatus);
        } catch (error) {
            Object.assign(vehicle.doorStatus, previousState);
            return Promise.reject(error);
        }
    };

    const setVehicleStatus = (payload: Partial<VehicleState>) => {
        Object.assign(vehicle, payload);
    };

    const allDoorsClosed = computed(() => {
        return Object.values(vehicle.doorStatus).every(Boolean);
    });

    const updateCabinAc = async (payload: Partial<VehicleAcState>) => {
        const previousState = { ...vehicle.cabinAc };
        Object.assign(vehicle.cabinAc, payload);
        try {
            await ApiVehicle.patchCabinAc(vehicle.cabinAc);
        } catch (error) {
            Object.assign(vehicle.cabinAc, previousState);
            return Promise.reject(error);
        }
    };

    const updateCharging = async (charging: boolean) => {
        const previousState = vehicle.charging;
        vehicle.charging = charging;
        try {
            const result = await ApiVehicle.patchCharging(charging);
            setVehicleStatus(result.data);
        } catch (error) {
            vehicle.charging = previousState;
            return Promise.reject(error);
        }
    };

    return {
        vehicle,
        getVehicle,
        updateDoorStatus,
        setVehicleStatus,
        updateCabinAc,
        updateCharging,
        allDoorsClosed,
    };
});
