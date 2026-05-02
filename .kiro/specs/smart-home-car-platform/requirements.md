# 需求文档

## 简介

智能家居与智能汽车联动管理平台是一个基于 Vue3 的企业级后台管理系统,旨在为用户提供统一的智能家居设备控制、智能汽车管理、场景模式联动和 AI 智能助手功能。该平台将现有的 smartHouse.vue 和 teslaModelS.vue 页面进行业务化改造,实现真实的设备控制、状态联动、场景自动化和智能问答能力。

## 术语表

- **Platform**: 智能家居与智能汽车联动管理平台
- **Device**: 智能设备,包括家居设备和汽车设备
- **Space**: 家居空间,如客厅、卧室、厨房、车库
- **Scene**: 场景模式,如回家模式、离家模式、睡眠模式
- **Alert**: 告警,设备异常或安全事件的通知
- **AI_Assistant**: AI 助手,提供自然语言控制和问答能力
- **Home_Device**: 家居设备,如灯光、空调、窗帘、摄像头、门锁
- **Vehicle**: 智能汽车
- **WiFi_Status**: WiFi 网络连接状态
- **Device_Status**: 设备在线/离线状态
- **Environment_Data**: 环境数据,如温度、湿度、空气质量
- **Energy_Data**: 能耗数据
- **Command**: 用户通过 AI 助手发出的自然语言指令
- **Backend_API**: 后端 API 服务,基于 FastAPI 实现

## 需求

### 需求 1: 智能家居设备管理

**用户故事:** 作为用户,我想按空间管理智能家居设备,以便清晰地查看和控制不同区域的设备。

#### 验收标准

1. THE Platform SHALL 支持客厅、卧室、厨房、车库四个空间的设备管理
2. WHEN 用户选择某个空间时, THE Platform SHALL 显示该空间内的所有设备列表
3. FOR 每个空间, THE Platform SHALL 支持灯光、空调、窗帘、摄像头、门锁、环境传感器六类设备
4. WHEN 用户点击设备控制按钮时, THE Platform SHALL 在 200 毫秒内响应并更新设备状态
5. THE Platform SHALL 实时显示每个设备的在线/离线状态
6. WHEN WiFi_Status 为离线时, THE Platform SHALL 将依赖 WiFi 的设备标记为离线状态

### 需求 2: 设备状态联动

**用户故事:** 作为用户,我想让设备状态能够真实联动,以便系统行为符合实际物理规律。

#### 验收标准

1. WHEN WiFi_Status 变为离线时, THE Platform SHALL 将所有依赖网络的 Home_Device 状态更新为离线
2. WHEN WiFi_Status 恢复在线时, THE Platform SHALL 恢复之前在线设备的连接状态
3. WHEN 空调设备关闭时, THE Platform SHALL 禁用温度、风速、模式等控制选项
4. WHEN 空调设备开启时, THE Platform SHALL 启用所有空调控制选项
5. WHEN 门锁状态变为异常时, THE Platform SHALL 生成告警并通知用户
6. WHEN 摄像头离线超过 5 分钟时, THE Platform SHALL 生成告警

### 需求 3: 智能汽车控制

**用户故事:** 作为用户,我想控制和监控智能汽车状态,以便远程管理车辆。

#### 验收标准

1. THE Platform SHALL 显示车辆电量百分比和预估续航里程
2. THE Platform SHALL 显示车辆当前位置的经纬度坐标
3. THE Platform SHALL 显示车辆在线/离线状态
4. THE Platform SHALL 支持车门、车窗、车灯、空调、座椅加热的远程控制
5. WHEN 用户发送控制指令时, THE Platform SHALL 在 500 毫秒内返回执行结果
6. WHEN 车门未锁且车辆离线超过 10 分钟时, THE Platform SHALL 生成安全告警
7. THE Platform SHALL 基于现有 teslaModelS.vue 页面进行改造和功能增强

### 需求 4: 场景模式管理

**用户故事:** 作为用户,我想使用预设场景模式,以便一键触发多个设备的联动操作。

#### 验收标准

1. THE Platform SHALL 支持回家模式、离家模式、睡眠模式、观影模式、出行模式五种预设场景
2. WHEN 用户触发回家模式时, THE Platform SHALL 打开客厅灯光、关闭窗帘、启动空调至舒适温度
3. WHEN 用户触发离家模式时, THE Platform SHALL 关闭所有灯光、锁定门锁、关闭空调、启动摄像头监控
4. WHEN 用户触发睡眠模式时, THE Platform SHALL 关闭客厅灯光、锁定门锁、调低卧室灯光亮度、设置空调为睡眠模式
5. WHEN 用户触发观影模式时, THE Platform SHALL 关闭客厅灯光、关闭窗帘、调整空调至舒适温度
6. WHEN 用户触发出行模式时, THE Platform SHALL 执行离家模式并解锁车库门、预热车辆空调
7. WHEN 场景执行失败时, THE Platform SHALL 记录失败原因并通知用户

### 需求 5: 告警中心

**用户故事:** 作为用户,我想查看系统告警信息,以便及时了解设备异常和安全事件。

#### 验收标准

1. THE Platform SHALL 支持门锁异常、摄像头离线、空调长时间运行、车门未锁、车辆离线五种告警类型
2. WHEN 门锁被异常开启时, THE Platform SHALL 生成高优先级告警
3. WHEN 摄像头离线超过 5 分钟时, THE Platform SHALL 生成中优先级告警
4. WHEN 空调连续运行超过 12 小时时, THE Platform SHALL 生成低优先级告警
5. WHEN 车门未锁且车辆离线超过 10 分钟时, THE Platform SHALL 生成高优先级告警
6. THE Platform SHALL 在告警列表中显示告警时间、类型、优先级、描述信息
7. THE Platform SHALL 在首页显示今日告警总数和未处理告警数

### 需求 6: AI 自然语言控制

**用户故事:** 作为用户,我想通过自然语言控制设备,以便更便捷地操作系统。

#### 验收标准

1. WHEN 用户输入"打开客厅灯"时, THE AI_Assistant SHALL 解析指令并执行打开客厅灯光的操作
2. WHEN 用户输入"关闭所有灯"时, THE AI_Assistant SHALL 解析指令并关闭所有空间的灯光设备
3. WHEN 用户输入"设置卧室空调为 26 度"时, THE AI_Assistant SHALL 解析指令并设置卧室空调温度为 26 摄氏度
4. WHEN 用户输入"锁定所有门"时, THE AI_Assistant SHALL 解析指令并锁定所有门锁设备
5. WHEN 用户输入"启动回家模式"时, THE AI_Assistant SHALL 解析指令并触发回家场景模式
6. WHEN 指令解析失败时, THE AI_Assistant SHALL 返回友好的错误提示并建议正确的指令格式
7. THE AI_Assistant SHALL 在 1 秒内完成指令解析和执行

### 需求 7: AI 设备状态问答

**用户故事:** 作为用户,我想询问设备状态,以便快速了解当前系统情况。

#### 验收标准

1. WHEN 用户询问"客厅现在开了哪些设备"时, THE AI_Assistant SHALL 返回客厅所有开启设备的列表
2. WHEN 用户询问"卧室温度是多少"时, THE AI_Assistant SHALL 返回卧室当前温度数值
3. WHEN 用户询问"车辆电量还有多少"时, THE AI_Assistant SHALL 返回车辆当前电量百分比和续航里程
4. WHEN 用户询问"哪些设备离线了"时, THE AI_Assistant SHALL 返回所有离线设备的列表
5. WHEN 用户询问"门锁状态"时, THE AI_Assistant SHALL 返回所有门锁的锁定/解锁状态
6. THE AI_Assistant SHALL 以自然语言格式返回查询结果
7. THE AI_Assistant SHALL 在 800 毫秒内返回查询结果

### 需求 8: AI 异常摘要

**用户故事:** 作为用户,我想让 AI 总结系统异常,以便快速了解需要关注的问题。

#### 验收标准

1. WHEN 用户询问"今天有什么异常"时, THE AI_Assistant SHALL 返回当日所有告警的摘要信息
2. WHEN 用户询问"最近有什么需要注意的"时, THE AI_Assistant SHALL 返回最近 24 小时内的重要告警和设备异常
3. THE AI_Assistant SHALL 按优先级排序告警信息
4. THE AI_Assistant SHALL 对相同类型的告警进行聚合统计
5. WHEN 没有异常时, THE AI_Assistant SHALL 返回"系统运行正常,暂无异常"
6. THE AI_Assistant SHALL 在摘要中包含告警数量、类型分布、最严重的问题
7. THE AI_Assistant SHALL 在 1 秒内生成异常摘要

### 需求 9: AI 场景推荐

**用户故事:** 作为用户,我想获得场景模式推荐,以便系统能够智能化地适应我的需求。

#### 验收标准

1. WHEN 时间为 18:00 至 20:00 且用户位置接近家时, THE AI_Assistant SHALL 推荐回家模式
2. WHEN 时间为 08:00 至 09:00 且所有设备开启时, THE AI_Assistant SHALL 推荐离家模式
3. WHEN 时间为 22:00 至 23:00 时, THE AI_Assistant SHALL 推荐睡眠模式
4. WHEN 客厅温度高于 28 摄氏度时, THE AI_Assistant SHALL 推荐开启空调制冷
5. WHEN 客厅温度低于 18 摄氏度时, THE AI_Assistant SHALL 推荐开启空调制热
6. THE AI_Assistant SHALL 在首页显示当前推荐的场景模式
7. WHEN 用户拒绝推荐 3 次后, THE AI_Assistant SHALL 在当天停止该类型推荐

### 需求 10: 首页总览

**用户故事:** 作为用户,我想在首页查看系统整体状态,以便快速了解家居和车辆情况。

#### 验收标准

1. THE Platform SHALL 在首页显示家居设备总数、在线设备数、异常设备数
2. THE Platform SHALL 在首页显示当前激活的家庭场景模式
3. THE Platform SHALL 在首页显示车辆电量、续航、在线状态的摘要卡片
4. THE Platform SHALL 在首页显示今日告警总数和未处理告警数
5. THE Platform SHALL 在首页显示今日能耗数据卡片
6. THE Platform SHALL 在首页显示当前环境数据卡片(温度、湿度、空气质量)
7. WHEN 用户点击任意摘要卡片时, THE Platform SHALL 跳转到对应的详细页面
8. THE Platform SHALL 每 30 秒自动刷新首页数据

### 需求 11: 后端 API 服务

**用户故事:** 作为开发者,我想使用 FastAPI 构建后端服务,以便支持前端的所有功能需求。

#### 验收标准

1. THE Backend_API SHALL 使用 FastAPI 框架实现
2. THE Backend_API SHALL 提供设备状态查询接口,返回时间不超过 100 毫秒
3. THE Backend_API SHALL 提供设备控制接口,支持单设备和批量设备控制
4. THE Backend_API SHALL 提供场景模式触发接口
5. THE Backend_API SHALL 提供告警查询和管理接口
6. THE Backend_API SHALL 提供 AI 指令解析接口
7. THE Backend_API SHALL 提供 AI 问答接口
8. THE Backend_API SHALL 使用 JWT 进行身份认证
9. THE Backend_API SHALL 记录所有 API 调用日志
10. WHEN API 请求失败时, THE Backend_API SHALL 返回标准化的错误响应格式

### 需求 12: AI 指令解析服务

**用户故事:** 作为开发者,我想实现 AI 指令解析功能,以便将用户的自然语言转换为系统操作。

#### 验收标准

1. THE AI_Assistant SHALL 识别设备控制类指令(开、关、设置)
2. THE AI_Assistant SHALL 识别场景触发类指令(启动、执行、切换)
3. THE AI_Assistant SHALL 识别查询类指令(查询、询问、显示)
4. THE AI_Assistant SHALL 从指令中提取设备名称、空间位置、操作类型、参数值
5. WHEN 指令包含多个操作时, THE AI_Assistant SHALL 按顺序执行所有操作
6. WHEN 指令模糊不清时, THE AI_Assistant SHALL 请求用户澄清
7. THE AI_Assistant SHALL 支持中文自然语言指令
8. THE AI_Assistant SHALL 在第一版使用基于规则的指令解析,后续版本可扩展为 RAG 或 LLM 方案

### 需求 13: 响应式界面适配

**用户故事:** 作为用户,我想在不同屏幕尺寸下都能正常使用系统,以便在桌面和移动设备上访问。

#### 验收标准

1. THE Platform SHALL 支持 1920x1080、1366x768、768x1024 三种主流分辨率
2. WHEN 浏览器窗口宽度小于 768 像素时, THE Platform SHALL 切换为移动端布局
3. WHEN 浏览器窗口宽度在 768 至 1366 像素之间时, THE Platform SHALL 使用平板布局
4. WHEN 浏览器窗口宽度大于 1366 像素时, THE Platform SHALL 使用桌面布局
5. THE Platform SHALL 使用 Vuetify 的响应式网格系统实现布局适配
6. THE Platform SHALL 确保所有交互元素在移动端的点击区域不小于 44x44 像素
7. WHEN 窗口尺寸改变时, THE Platform SHALL 在 300 毫秒内完成布局调整

### 需求 14: 设备图标语义化

**用户故事:** 作为用户,我想看到准确的设备图标,以便快速识别设备类型和状态。

#### 验收标准

1. THE Platform SHALL 为空调设备使用 mdi-air-conditioner 图标
2. WHEN 空调处于制冷模式时, THE Platform SHALL 在图标上叠加雪花标识
3. WHEN 空调处于制热模式时, THE Platform SHALL 在图标上叠加火焰标识
4. THE Platform SHALL 为灯光设备使用 mdi-lightbulb 图标
5. THE Platform SHALL 为门锁设备使用 mdi-lock 或 mdi-lock-open 图标
6. THE Platform SHALL 为摄像头设备使用 mdi-cctv 图标
7. THE Platform SHALL 为窗帘设备使用 mdi-blinds 图标
8. WHEN 设备离线时, THE Platform SHALL 将图标显示为灰色并添加离线标识
9. WHEN 设备异常时, THE Platform SHALL 在图标上显示警告标识

### 需求 15: 数据持久化

**用户故事:** 作为系统,我需要持久化存储数据,以便保存设备状态、告警记录和用户配置。

#### 验收标准

1. THE Platform SHALL 将设备状态变更记录存储到数据库
2. THE Platform SHALL 将告警记录存储到数据库并保留 90 天
3. THE Platform SHALL 将场景模式配置存储到数据库
4. THE Platform SHALL 将用户偏好设置存储到数据库
5. THE Platform SHALL 每小时记录一次环境数据和能耗数据
6. WHEN 系统重启时, THE Platform SHALL 从数据库恢复最后的设备状态
7. THE Platform SHALL 使用关系型数据库(如 PostgreSQL 或 MySQL)存储结构化数据
