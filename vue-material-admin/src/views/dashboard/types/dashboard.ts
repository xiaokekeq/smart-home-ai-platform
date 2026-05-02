import type { LightMode } from '@/types/smartHome';

// export type SmartDeviceTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';
export type SmartDeviceTone = 'default' | 'primary';

export type StatusCardTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export interface StatusCardData {
    label: string;
    value: string;
    meta: string;
    tone?: StatusCardTone;
    switchable?: boolean;
    badgeText?: string;
    badgeTone?: Exclude<StatusCardTone, 'default'>;
}

export interface SmartDeviceCardData {
    type: string;
    title: string;
    model: string;
    imageSrc: string;
    statusText?: string;
    metaText: string;
    tone?: SmartDeviceTone;
    switchable?: boolean;
    settingable?: boolean;
    toolw: boolean;
    toolp: boolean;
}

export interface LightSettingData {
    brightness: number;
    mode: LightMode;
}
