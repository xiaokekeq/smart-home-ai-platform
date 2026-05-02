"""
数据验证模型类 (`schemas.py`)
主要存放使用 Pydantic 定义的数据模型。

什么是 Pydantic？
FastAPI 基于 Pydantic 进行数据验证。它的作用跟你前端写的 TypeScript interface 非常相似！
前端用 TypeScript 保证前端不要传错数据格式，
后端用 Pydantic 保证后端不要接收错、不要返回错数据格式。
如果前端少传了必需的字段，或者传了错误的类型(比如需要 int 但传了 string)，FastAPI 就会在底层自动报错拦截，不需要咱们手动写 if 判断。
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Generic, Literal, Optional, TypeVar

# 所有的模型类都需要继承自 BaseModel
from pydantic import BaseModel, Field
from datetime import datetime, timezone
# ────────────────────────────────────────────
# 通用响应结构（对标前端 axios.ts 里的 RootInterface<T>）
# 所有接口返回值都用 ApiResponse[具体数据类型] 包装
# ────────────────────────────────────────────
T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    """
    统一响应结构
    - code:    业务状态码，200 表示成功，其余表示各类错误
    - message: 人类可读的描述，成功时可以是 'ok'，失败时是错误原因
    - data:    真正的业务数据，类型由泛型 T 决定
    对应前端 axios.ts 里的：RootInterface<T> { code, message, data }
    """
    code: int = 200
    message: str = "ok"
    data: Optional[T] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def ok(cls, data: T, message: str = "ok") -> "ApiResponse[T]":
        """快捷构造成功响应"""
        return cls(code=200, message=message, data=data)

    @classmethod
    def fail(cls, code: int = 500, message: str = "Internal Server Error") -> "ApiResponse[None]":
        """快捷构造失败响应"""
        return cls(code=code, message=message, data=None)


# ────────────────────────────────────────────
# 基础结构 (通用)
# ────────────────────────────────────────────
class ConnectivityState(BaseModel):
    # Python 的类型注解 (bool) 决定了数据类型。
    # 赋值 (= True) 代表这个字段的默认值，也就是说前端就算不穿这个值，也会有个默认值 True。
    wifiConnected: bool = True
    powerConnected: bool = True


# ────────────────────────────────────────────
# 天气相关模型
# ────────────────────────────────────────────
class WeatherIconKey(str, Enum):
    # 枚举类型，跟 TypeScript 里的 enum 或联合类型类似。只能是这三个字符串之一。
    cloudy = "cloudy"
    sunny = "sunny"
    rainy = "rainy"


class WeatherState(BaseModel):
    city: str = "Shenzhen"
    condition: str = "Cloudy To Clear"
    iconKey: WeatherIconKey = WeatherIconKey.cloudy
    outdoorTemp: int = 31
    humidity: int = 68


# ────────────────────────────────────────────
# 家机设备模型 (客厅设备等)
# ────────────────────────────────────────────
class LightMode(str, Enum):
    normal = "normal"
    reading = "reading"
    movie = "movie"
    night = "night"


class LightState(BaseModel):
    on: bool = True
    # Field 函数可以加更多约束：ge 表示大于等于(greater or equal)，le 表示小于等于(less or equal)
    # 这确保了亮度的数值只会是 0 - 100
    brightness: int = Field(default=80, ge=0, le=100)
    mode: LightMode = LightMode.normal
    # 嵌套模型：模型里面还可以套模型
    connectivity: ConnectivityState = ConnectivityState()


class LightPatch(BaseModel):
    # 修改状态（PATCH 请求）时，一般允许部分修改。
    # Optional[bool] 代表这个字段前端可以传布尔值，也可以不传（None）。
    on: Optional[bool] = None
    brightness: Optional[int] = Field(default=None, ge=0, le=100)
    mode: Optional[LightMode] = None


class AirConditionerState(BaseModel):
    on: bool = False
    temp: int = Field(default=24, ge=16, le=30)  # 空调温度只能在 16~30 度之间
    connectivity: ConnectivityState = ConnectivityState()


class AirConditionerPatch(BaseModel):
    on: Optional[bool] = None
    temp: Optional[int] = Field(default=None, ge=16, le=30)


class CurtainState(BaseModel):
    openPercent: int = Field(default=100, ge=0, le=100)
    connectivity: ConnectivityState = ConnectivityState()


class CurtainPatch(BaseModel):
    openPercent: Optional[int] = Field(default=None, ge=0, le=100)


class CameraState(BaseModel):
    on: bool = True
    connectivity: ConnectivityState = ConnectivityState()


class CameraPatch(BaseModel):
    on: Optional[bool] = None


class HumidifierState(BaseModel):
    on: bool = False
    connectivity: ConnectivityState = ConnectivityState()


class HumidifierPatch(BaseModel):
    on: Optional[bool] = None


class MusicState(BaseModel):
    """音乐播放器状态"""
    playing: bool = False
    trackName: str = "未在播放"
    artist: str = ""
    url: str = ""
    volume: int = Field(default=50, ge=0, le=100)
    cover: str = ""  # 封面图片链接
    duration: float =Field(default=0, ge=0, le=20)


class MusicPatch(BaseModel):
    playing: Optional[bool] = None
    trackName: Optional[str] = None
    artist: Optional[str] = None
    url: Optional[str] = None
    volume: Optional[int] = Field(default=None, ge=0, le=100)
    duration: float =Field(default=0, ge=0, le=20)

class LivingRoomState(BaseModel):
    indoorTemp: int = 30
    wifiOn: bool = True
    # 嵌套之前的 Pydantic 模型
    light: LightState = LightState()
    airConditioner: AirConditionerState = AirConditionerState()
    curtain: CurtainState = CurtainState()
    camera: CameraState = CameraState()
    humidifier: HumidifierState = HumidifierState()
    music: MusicState = MusicState()  # 新增音乐组件



class EnvironmentOverview(BaseModel):
    # 总览接口的返回值
    weather: WeatherState = WeatherState()
    livingRoom: LivingRoomState = LivingRoomState()


# ────────────────────────────────────────────
# 车辆相关模型
# ────────────────────────────────────────────
class DoorStatus(BaseModel):
    frontLeftClosed: bool = True
    frontRightClosed: bool = True
    rearLeftClosed: bool = True
    rearRightClosed: bool = True
    trunkClosed: bool = True


class DoorPatch(BaseModel):
    frontLeftClosed: Optional[bool] = None
    frontRightClosed: Optional[bool] = None
    rearLeftClosed: Optional[bool] = None
    rearRightClosed: Optional[bool] = None
    trunkClosed: Optional[bool] = None


class CabinAcState(BaseModel):
    on: bool = False
    temp: int = Field(default=22, ge=16, le=30)


class CabinAcPatch(BaseModel):
    on: Optional[bool] = None
    temp: Optional[int] = Field(default=None, ge=16, le=30)


class VehicleState(BaseModel):
    batteryPercent: int = 78
    remainingRangeKm: int = 420
    vehicleOnline: bool = True
    charging: bool = False
    cabinAc: CabinAcState = CabinAcState()
    doorStatus: DoorStatus = DoorStatus()


class VehicleOverview(BaseModel):
    vehicle: VehicleState = VehicleState()


class ChargingPatch(BaseModel):
    charging: Optional[bool] = None


# ────────────────────────────────────────────
# AI 助手相关模型
# ────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal['user', 'assistant']  # 只允许 OpenAI 规范的两个角色值，传别的直接 422
    content: str

class AiChatRequest(BaseModel):
    """前端发送给后端的 AI 输入，就是一个list[message] (数组)"""
    messages: list[ChatMessage]

class AiCommand(BaseModel): 
    intent: str      # 意图分类：比如 'device_control' (设备控制), 'scene_mode' (场景模式)
    target: str      # 目标设备：比如 'living_room_ac'
    action: str      # 操作动作：比如 'turn_on'
    params: dict[str, Any] = Field(default_factory=dict) # 其他参数：比如温度 {'temp': 24}


class AiCommandResult(AiCommand):
    # 继承原始指令字段，再补充“执行结果”信息，避免重复定义 intent/target/action/params。
    success: bool
    message: str

class AiChatResponse(BaseModel):
    message: str     # 给用户看的口语化回复："已为您打开客厅空调"
    commands: list[AiCommand] = Field(default_factory=list)
    commandResults: list[AiCommandResult] = Field(default_factory=list)


class AiSuggestionResponse(BaseModel):
    """首页展示的 AI 建议卡片数据结构"""
    title: str
    desc: str
    actionText: str # 按钮上显示的文字，如 "开启空调"
    actionType: str # 前端点击按钮后识别的动作类型


class DashboardOverview(BaseModel):
    """首页dashboard数据结构"""
    vehicle: VehicleState
    environment: EnvironmentOverview
