from fastapi import APIRouter
from app import state
from app.schemas import (
    ApiResponse,
    EnvironmentOverview,
    LightState, LightPatch,
    AirConditionerState, AirConditionerPatch,
    CurtainState, CurtainPatch,
    CameraState, CameraPatch,
    HumidifierState, HumidifierPatch,
    MusicState, MusicPatch,
)

router = APIRouter(prefix="/api/environment", tags=["环境设备"])


@router.get("/overview", response_model=ApiResponse[EnvironmentOverview])
async def get_environment_overview():
    """返回天气 + 客厅全部设备状态汇总"""
    return ApiResponse.ok(
        data=EnvironmentOverview(weather=state.weather, livingRoom=state.living_room)
    )


# ── 灯光 ──

@router.get("/light", response_model=ApiResponse[LightState])
async def get_light():
    return ApiResponse.ok(data=state.living_room.light)

@router.patch("/light", response_model=ApiResponse[LightState])
async def patch_light(body: LightPatch):
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(state.living_room.light, key, value)
    return ApiResponse.ok(data=state.living_room.light)


# ── 空调 ──

@router.get("/air-conditioner", response_model=ApiResponse[AirConditionerState])
async def get_air_conditioner():
    return ApiResponse.ok(data=state.living_room.airConditioner)

@router.patch("/air-conditioner", response_model=ApiResponse[AirConditionerState])
async def patch_air_conditioner(body: AirConditionerPatch):
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(state.living_room.airConditioner, key, value)
    return ApiResponse.ok(data=state.living_room.airConditioner)


# ── 窗帘 ──

@router.get("/curtain", response_model=ApiResponse[CurtainState])
async def get_curtain():
    return ApiResponse.ok(data=state.living_room.curtain)

@router.patch("/curtain", response_model=ApiResponse[CurtainState])
async def patch_curtain(body: CurtainPatch):
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(state.living_room.curtain, key, value)
    return ApiResponse.ok(data=state.living_room.curtain)


# ── 摄像头 ──

@router.get("/camera", response_model=ApiResponse[CameraState])
async def get_camera():
    return ApiResponse.ok(data=state.living_room.camera)

@router.patch("/camera", response_model=ApiResponse[CameraState])
async def patch_camera(body: CameraPatch):
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(state.living_room.camera, key, value)
    return ApiResponse.ok(data=state.living_room.camera)


# ── 加湿器 ──

@router.get("/humidifier", response_model=ApiResponse[HumidifierState])
async def get_humidifier():
    return ApiResponse.ok(data=state.living_room.humidifier)

@router.patch("/humidifier", response_model=ApiResponse[HumidifierState])
async def patch_humidifier(body: HumidifierPatch):
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(state.living_room.humidifier, key, value)
    return ApiResponse.ok(data=state.living_room.humidifier)


# ── 音乐播放器 ──
@router.get("/music", response_model=ApiResponse[MusicState])
async def get_music():
    """获取当前播放器状态"""
    return ApiResponse.ok(data=state.living_room.music)

@router.patch("/music", response_model=ApiResponse[MusicState])
async def patch_music(body: MusicPatch):
    """手动同步播放状态（如用户在前端点击了暂停或调整了音量）"""
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(state.living_room.music, key, value)
    return ApiResponse.ok(data=state.living_room.music)
