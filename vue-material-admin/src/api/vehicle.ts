import { createPrefixedAiRequest } from './axios';
import type { RootInterface } from './axios';
import type { VehicleState, DoorState, VehicleAcState } from '@/stores/useVehicleStore';

const aiRequest = createPrefixedAiRequest('/vehicle');

export interface VehicleOverview {
    vehicle: VehicleState;
}

export const ApiVehicle = {
    getVehicleState: (): Promise<RootInterface<VehicleOverview>> => {
        return aiRequest({
            url: `/overview`,
        });
    },
    patchCabinAc: (data: Partial<VehicleAcState>): Promise<RootInterface<VehicleAcState>> => {
        return aiRequest({
            url: `/cabin-ac`,
            method: 'patch',
            data,
        });
    },
    patchDoors: (data: Partial<DoorState>): Promise<RootInterface<DoorState>> => {
        return aiRequest({
            url: `/doors`,
            method: 'patch',
            data,
        });
    },
    patchCharging: (charging: boolean): Promise<RootInterface<VehicleState>> => {
        return aiRequest({
            url: `/charging`,
            method: 'patch',
            data: { charging },
        });
    },
};
