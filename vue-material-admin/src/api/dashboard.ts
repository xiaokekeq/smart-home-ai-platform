import { aiRequest } from './axios';
import type { RootInterface } from './axios';
import type { DashboardState } from '@/stores/useDashboard';

const PREFIX = '/dashboard';
//总览相关接口：环境设备接口
export const ApiDashboard = {
    getDashboard: (): Promise<RootInterface<DashboardState>> => {
        return aiRequest({
            url: `${PREFIX}/overview`,
        });
    },
};
