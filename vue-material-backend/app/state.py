"""
全局内存状态管理 (`state.py`)
因为对于我们最初始版本，我们不想搞数据库（比如 MySQL）这么麻烦。
所以我们直接用 Python 的变量来存放我们的数据。
它的劣势是：一旦你关掉并重启 FastAPI 后端（终端杀掉 uvicorn 进程），所有修改的数据会立马还原成这里的默认值。
但是它非常适合我们做第一版演示和前后端联调跑通逻辑！！！
"""

from app.schemas import (
    WeatherState,
    LivingRoomState,
    LightState,
    AirConditionerState,
    CurtainState,
    CameraState,
    HumidifierState,
    VehicleState,
    DoorStatus,
    CabinAcState,
    ConnectivityState,
    LightMode,
    WeatherIconKey,
    MusicState,
)

# ── 家居环境初始状态 ─────────────────────────────
# 这些变量被存在内存里，当前端调用 PATCH 路由修改时，就会改这里的变量

weather = WeatherState(
    city="Shenzhen",
    condition="Cloudy To Clear",
    iconKey=WeatherIconKey.cloudy,
    outdoorTemp=31,
    humidity=68,
)

living_room = LivingRoomState(
    indoorTemp=30,
    wifiOn=True,
    light=LightState(
        on=True,
        brightness=80,
        mode=LightMode.normal,
        connectivity=ConnectivityState(wifiConnected=True, powerConnected=True),
    ),
    airConditioner=AirConditionerState(
        on=False,
        temp=24,
        connectivity=ConnectivityState(wifiConnected=True, powerConnected=True),
    ),
    curtain=CurtainState(
        openPercent=100,
        connectivity=ConnectivityState(wifiConnected=True, powerConnected=True),
    ),
    camera=CameraState(
        on=True,
        connectivity=ConnectivityState(wifiConnected=True, powerConnected=True),
    ),
    humidifier=HumidifierState(
        on=False,
        connectivity=ConnectivityState(wifiConnected=True, powerConnected=True),
    ),
    music=MusicState(
        playing=False,
        trackName="沉浸 Lo-fi",
        artist="AI Composer",
        volume=50,
        cover="https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=200&h=200&fit=crop",
        duration= 0,
        url='https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    ),
)

# ── 车辆初始状态 ─────────────────────────────────

vehicle = VehicleState(
    batteryPercent=78,
    remainingRangeKm=420,
    vehicleOnline=True,
    charging=False,
    cabinAc=CabinAcState(on=False, temp=22),
    doorStatus=DoorStatus(
        frontLeftClosed=True,
        frontRightClosed=True,
        rearLeftClosed=True,
        rearRightClosed=True,
        trunkClosed=True,
    ),
)
