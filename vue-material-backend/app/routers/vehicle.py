from fastapi import APIRouter
from app import state
from app.schemas import (
    ApiResponse,
    VehicleOverview,
    CabinAcPatch, CabinAcState,
    DoorPatch, DoorStatus,
    ChargingPatch, VehicleState,
)

router = APIRouter(prefix="/api/vehicle", tags=["车辆控制"])


@router.get("/overview", response_model=ApiResponse[VehicleOverview])
async def get_vehicle_overview():
    return ApiResponse.ok(data=VehicleOverview(vehicle=state.vehicle))


@router.patch("/cabin-ac", response_model=ApiResponse[CabinAcState])
async def patch_cabin_ac(body: CabinAcPatch):
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(state.vehicle.cabinAc, key, value)
    return ApiResponse.ok(data=state.vehicle.cabinAc)


@router.patch("/doors", response_model=ApiResponse[DoorStatus])
async def patch_doors(body: DoorPatch):
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(state.vehicle.doorStatus, key, value)
    return ApiResponse.ok(data=state.vehicle.doorStatus)


@router.patch("/charging", response_model=ApiResponse[VehicleState])
async def patch_charging(body: ChargingPatch):
    if body.charging is not None:
        state.vehicle.charging = body.charging
    return ApiResponse.ok(data=state.vehicle)
