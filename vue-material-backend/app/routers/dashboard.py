from fastapi import APIRouter
from app import state
from app.schemas import (
    ApiResponse,
    DashboardOverview,
    EnvironmentOverview,
    AiSuggestionResponse,
)

router = APIRouter(prefix="/api/dashboard", tags=["首页总览"])


@router.get("/overview", response_model=ApiResponse[DashboardOverview])
async def get_dashboard_overview():
    """返回首页总览（合并家居 + 车辆）"""
    return ApiResponse.ok(
        data=DashboardOverview(
            environment=EnvironmentOverview(
                weather=state.weather,
                livingRoom=state.living_room,
            ),
            vehicle=state.vehicle,
        )
    )


@router.post("/ai-suggestion", response_model=ApiResponse[AiSuggestionResponse])
async def get_ai_suggestion():
    """基于当前状态的规则引擎 AI 建议"""

    if state.living_room.indoorTemp >= 28 and not state.living_room.airConditioner.on:
        return ApiResponse.ok(data=AiSuggestionResponse(
            title="建议开启节能制冷",
            desc=f"当前室温 {state.living_room.indoorTemp}°C，可先将空调设为 {state.living_room.airConditioner.temp}°C。",
            actionText="开启空调", actionType="openHomeAc",
        ))

    if state.living_room.curtain.openPercent > 80 and state.weather.outdoorTemp >= 30:
        return ApiResponse.ok(data=AiSuggestionResponse(
            title="建议关闭窗帘",
            desc=f"室外温度 {state.weather.outdoorTemp}°C，关闭窗帘可降低室内温度。",
            actionText="关闭窗帘", actionType="closeCurtain",
        ))

    if state.vehicle.vehicleOnline and not state.vehicle.cabinAc.on:
        return ApiResponse.ok(data=AiSuggestionResponse(
            title="建议预热车内空调",
            desc=f"车辆在线，出发前可先将车内空调调至 {state.vehicle.cabinAc.temp}°C。",
            actionText="开启车内空调", actionType="openCarAc",
        ))

    if state.vehicle.batteryPercent < 30 and not state.vehicle.charging:
        return ApiResponse.ok(data=AiSuggestionResponse(
            title="车辆电量偏低",
            desc=f"当前电量 {state.vehicle.batteryPercent}%，续航 {state.vehicle.remainingRangeKm}km，建议尽快充电。",
            actionText="开始充电", actionType="startCharging",
        ))

    return ApiResponse.ok(data=AiSuggestionResponse(
        title="一切正常",
        desc="当前家庭与车辆状态良好，暂无特别建议。",
        actionText="", actionType="none",
    ))
