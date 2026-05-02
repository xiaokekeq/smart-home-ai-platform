# 多空间管理功能使用说明

## 功能概述

多空间管理功能允许你在卧室、厨房、车库三个不同空间之间切换，并独立控制每个空间的智能设备。

## 已实现的功能

### 1. 空间切换
- 卧室 (Bedroom)
- 厨房 (Kitchen)  
- 车库 (Garage)

### 2. 每个空间支持的设备
- **WiFi 开关** - 控制该空间的网络连接
- **空调** - 开关和温度控制
- **灯光** - 开关、亮度调节（0-100%）、快捷模式（柔光30%、日常60%、全亮100%）
- **窗帘** - 开合控制（0-100%）、快捷开合（全关、半开、全开）
- **摄像头** - 开关监控
- **门锁** - 锁定/解锁（仅卧室和车库有门锁）

### 3. 设备联动
- WiFi 关闭时，所有设备的 WiFi 图标会变灰
- 每个设备都有电源和 WiFi 连接状态指示

## 如何使用

### 访问多空间管理页面

启动项目后，在左侧导航栏点击 **"多空间管理"** 菜单项。

```bash
# 启动开发服务器
cd vue-material-admin
pnpm install  # 首次运行需要安装依赖
pnpm dev
```

### 切换空间

在页面顶部的标签栏中点击不同的空间：
- 🛏️ 卧室
- 🍴 厨房
- 🚗 车库

### 控制设备

1. **快速开关** - 直接点击设备卡片上的开关按钮
2. **详细设置** - 点击设备卡片右下角的齿轮图标打开设置对话框

## 代码结构

### Store (状态管理)
```
vue-material-admin/src/stores/useSpaceStore.ts
```

核心方法：
- `switchSpace(space)` - 切换当前空间
- `getCurrentRoom()` - 获取当前空间的状态
- `updateLight(space, payload)` - 更新灯光状态
- `updateAirConditioner(space, payload)` - 更新空调状态
- `updateCurtain(space, payload)` - 更新窗帘状态
- `updateCamera(space, payload)` - 更新摄像头状态
- `updateDoorLock(space, payload)` - 更新门锁状态
- `updateWifi(space, wifiOn)` - 更新 WiFi 状态

### 页面组件
```
vue-material-admin/src/views/dashboard/spaceManagement.vue
```

### 路由配置
```
vue-material-admin/src/router/loca.ts
```

路由路径: `/space-management`

## 扩展示例

### 如何添加新的空间

1. 在 `useSpaceStore.ts` 中添加新空间的状态：

```typescript
// 添加新的空间类型
export type SpaceType = 'bedroom' | 'kitchen' | 'garage' | 'study';

// 添加新空间的状态
const study = reactive<RoomState>({
    name: 'study',
    displayName: '书房',
    indoorTemp: 25,
    wifiOn: true,
    light: { /* ... */ },
    airConditioner: { /* ... */ },
    // ...
});

// 更新 getCurrentRoom 方法
const getCurrentRoom = () => {
    switch (currentSpace.value) {
        case 'bedroom': return bedroom;
        case 'kitchen': return kitchen;
        case 'garage': return garage;
        case 'study': return study;  // 新增
        default: return bedroom;
    }
};
```

2. 在 `spaceManagement.vue` 中添加新的标签页：

```vue
<v-tab value="study">
    <v-icon icon="mdi-book-open-page-variant" class="mr-2" />
    书房
</v-tab>
```

### 如何添加新的设备类型

1. 在 `useSpaceStore.ts` 中定义设备状态接口：

```typescript
export interface NewDeviceState {
    on: boolean;
    // 其他属性...
    connectivity: ConnectivityState;
}

// 添加到 RoomState 接口
export interface RoomState {
    // ...
    newDevice?: NewDeviceState;
}
```

2. 添加更新方法：

```typescript
const updateNewDevice = (space: SpaceType, payload: Partial<NewDeviceState>) => {
    const room = space === 'bedroom' ? bedroom : space === 'kitchen' ? kitchen : garage;
    if (room.newDevice) {
        Object.assign(room.newDevice, payload);
    }
};
```

3. 在页面中使用 `SmartDeviceCard` 组件展示新设备。

## 技术特点

1. **响应式状态管理** - 使用 Pinia + reactive/ref 实现实时状态同步
2. **乐观更新** - 设备状态立即更新，提供流畅的用户体验
3. **组件复用** - 复用现有的 `SmartDeviceCard`、`Device`、`DeviceSettingDialog` 组件
4. **类型安全** - 完整的 TypeScript 类型定义
5. **响应式布局** - 使用 CSS Grid 自适应不同屏幕尺寸

## 下一步优化建议

1. **场景联动** - 实现"回家模式"、"离家模式"等跨空间场景
2. **能耗统计** - 为每个空间添加能耗监控
3. **设备分组** - 支持自定义设备分组和批量控制
4. **历史记录** - 记录设备操作历史和状态变化
5. **语音控制** - 集成语音助手控制多空间设备
