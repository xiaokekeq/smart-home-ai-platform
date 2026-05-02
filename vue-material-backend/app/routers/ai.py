"""
AI 聊天 / 指令解析路由 (`routers/ai.py`)

这是最核心的 AI 模块！整体思路：
1. 前端给我们发一条自然语言（比如"打开客厅空调"）
2. 我们把这条消息 + 当前家庭/车辆的状态，一起包装进一个详细的 Prompt，发给大模型
3. 大模型思考后，用我们规定好的 JSON 格式回复（这个叫"结构化输出"）
4. 我们解析这个 JSON，然后直接调用对应的控制函数，完成真正的设备控制闭环
5. 最后把结果返回给前端

为什么要用"结构化输出"而不是让大模型"随便说"？
因为大模型默认返回的是自由文字，比如"好的，我已经为您打开了客厅的空调，它现在是开启状态！"。
这我们代码根本没法解析！我们需要的是干净的：{"action": "turn_on", "target": "living_room_ac"}
解决办法就是在 Prompt 里严格告诉大模型："你只能返回 JSON，不许说废话！"
"""

import asyncio
import json
import os
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

# dotenv 让我们可以从 .env 文件里读取 API Key 等配置，而不需要把密钥硬编码在代码里
from dotenv import load_dotenv

from app import state
from app.schemas import (
    AiChatRequest,
    AiChatResponse,
    AiCommand,
    AiCommandResult,
    AiSuggestionResponse,
    ApiResponse,
    ChatMessage,
    LivingRoomState,
    VehicleState,
    WeatherState,
)

load_dotenv()

router = APIRouter(prefix="/api/ai", tags=["AI 助手"])

DEFAULT_AI_MODEL = "deepseek-chat"
EXECUTABLE_INTENTS = {"device_control", "scene_mode"}
MARKDOWN_REPLY_TEMPERATURE = 0.4
COMMAND_EXTRACTION_TEMPERATURE = 0.0
STREAM_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}
ROLLBACK_MESSAGE = "本次设备变更已回滚"
SESSION_ROLLBACK_MESSAGE = "本次会话未成功完成，设备状态已回滚"
SKIPPED_COMMAND_MESSAGE = "未执行：前序指令失败"


@dataclass
class _StateSnapshot:
    weather: WeatherState
    living_room: LivingRoomState
    vehicle: VehicleState


@dataclass
class _CommandExecutionOutcome:
    commands: list[AiCommand]
    command_results: list[AiCommandResult]
    snapshot: _StateSnapshot | None = None
    rolled_back: bool = False

# ── 初始化大模型客户端 ───────────────────────────
# 从 .env 文件中读取 API Key 和接口地址（DeepSeek 的地址和 OpenAI 完全兼容）
def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=os.getenv("AI_API_KEY", ""),
        base_url=os.getenv("AI_BASE_URL", "https://api.deepseek.com"),
    )


# ── 构建设备状态快照（Context 上下文） ─────────────────
def _build_context_snapshot() -> str:
    """
    把当前内存里的设备状态转化成一段给大模型读的"现场情报文字"。
    这样大模型在回答"客厅开了哪些灯"时才能基于真实状态，而不是瞎说。
    """
    lr = state.living_room
    v = state.vehicle
    return f"""
【当前家庭状态】
- 客厅室温：{lr.indoorTemp}°C，室外：{state.weather.outdoorTemp}°C
- 客厅灯光：{'开启' if lr.light.on else '关闭'}，亮度 {lr.light.brightness}%，模式 {lr.light.mode}
- 客厅空调：{'开启' if lr.airConditioner.on else '关闭'}，设定温度 {lr.airConditioner.temp}°C
- 客厅窗帘：开合 {lr.curtain.openPercent}%
- 摄像头：{'在线' if lr.camera.on else '离线'}
- 加湿器：{'开启' if lr.humidifier.on else '关闭'}

【当前车辆状态】
- 车辆：{'在线' if v.vehicleOnline else '离线'}，电量 {v.batteryPercent}%，续航 {v.remainingRangeKm}km
- 充电：{'正在充电' if v.charging else '未充电'}
- 车内空调：{'开启' if v.cabinAc.on else '关闭'}，设定温度 {v.cabinAc.temp}°C
- 车门：{'全部关闭' if all([v.doorStatus.frontLeftClosed, v.doorStatus.frontRightClosed, v.doorStatus.rearLeftClosed, v.doorStatus.rearRightClosed, v.doorStatus.trunkClosed]) else '有车门未关'}
""".strip()


# ── 设备控制映射（为了让代码更通用） ──────────────────
# 这样我们就不用写一堆 if target == 'xxx' 了
# 注意：这里的 value 是一个 getter（lambda），需要调用一次才会拿到设备对象：`dev = device_getter()`
DEVICE_MAP = {
    "living_room_light": lambda: state.living_room.light,  # 客厅灯对象（getter）
    "living_room_ac": lambda: state.living_room.airConditioner,
    "living_room_curtain": lambda: state.living_room.curtain,
    "living_room_camera": lambda: state.living_room.camera,
    "living_room_humidifier": lambda: state.living_room.humidifier,
    "car_cabin_ac": lambda: state.vehicle.cabinAc,
    "music_player": lambda: state.living_room.music,
}

# ── 预设音乐库（让 AI 有歌可点） ─────────────────
MUSIC_LIBRARY = [
    {
        "name": "沉浸 Lo-fi", 
        "artist": "AI Composer", 
        "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        "cover": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=200&h=200&fit=crop"
    },
    {
        "name": "治愈爵士", 
        "artist": "Cloud Notes", 
        "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
        "cover": "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=200&h=200&fit=crop"
    },
    {
        "name": "活力流行", 
        "artist": "Digital Rhythm", 
        "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        "cover": "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=200&h=200&fit=crop"
    },
]

# ── 场景配置表（真正的工程化：加场景只需改这里，不用改逻辑！） ──
# 模式：场景名: [ {action, target, params}, ... ]
SCENE_CONFIG = {
    "sleep_mode": [
        {"action": "turn_off", "target": "living_room_light"},
        {"action": "set_curtain", "target": "living_room_curtain", "params": {"openPercent": 0}},
        {"action": "turn_on", "target": "living_room_ac", "params": {"temp": 26}},
    ],
    "movie_mode": [
        {"action": "set_brightness", "target": "living_room_light", "params": {"brightness": 20}},
        {"action": "set_mode", "target": "living_room_light", "params": {"mode": "movie"}},
        {"action": "set_curtain", "target": "living_room_curtain", "params": {"openPercent": 0}},
    ],
    "home_mode": [
        {"action": "turn_on", "target": "living_room_light", "params": {"brightness": 80}},
        {"action": "turn_on", "target": "living_room_ac", "params": {"temp": 24}},
    ],
    "away_mode": [
        {"action": "turn_off", "target": "living_room_light"},
        {"action": "turn_off", "target": "living_room_ac"},
        {"action": "turn_on", "target": "living_room_camera"},
    ],
    "nap_mode": [ # 这是你刚才提到的午睡场景，配置一下就支持了！
        {"action": "turn_off", "target": "living_room_light"},
        {"action": "set_curtain", "target": "living_room_curtain", "params": {"openPercent": 0}},
        {"action": "set_temp", "target": "living_room_ac", "params": {"temp": 25}},
        {"action": "play_music", "target": "music_player", "params": {"trackName": "治愈爵士"}},
    ]
}


# ── 执行动作：根据大模型的结构化 JSON 去真正控制设备 ─────
def _capture_state_snapshot() -> _StateSnapshot:
    """
    在执行一整轮 AI 设备控制前，先把当前全局状态做一份深拷贝。
    后面如果命令失败，或者整轮会话中途异常，就可以恢复到这一刻的状态。
    """
    return _StateSnapshot(
        weather=state.weather.model_copy(deep=True),
        living_room=state.living_room.model_copy(deep=True),
        vehicle=state.vehicle.model_copy(deep=True),
    )


def _restore_state_snapshot(snapshot: _StateSnapshot) -> None:
    """
    把全局内存状态恢复成快照里的值。
    这里用重新赋值而不是逐字段回写，能更直接地把嵌套对象一起还原。
    """
    state.weather = snapshot.weather.model_copy(deep=True)
    state.living_room = snapshot.living_room.model_copy(deep=True)
    state.vehicle = snapshot.vehicle.model_copy(deep=True)


def _build_command_result(command: AiCommand, *, success: bool, message: str) -> AiCommandResult:
    return AiCommandResult(
        intent=command.intent,
        target=command.target,
        action=command.action,
        params=command.params,
        success=success,
        message=message,
    )


def _build_skipped_command_results(commands: list[AiCommand]) -> list[AiCommandResult]:
    return [
        _build_command_result(command, success=False, message=SKIPPED_COMMAND_MESSAGE)
        for command in commands
    ]


def _rollback_command_outcome(outcome: _CommandExecutionOutcome, *, reason: str) -> bool:
    """
    如果这一轮命令已经改动过状态，就把状态恢复，并把已有成功结果改写成“已回滚”。
    返回值表示这次是否真的执行了回滚。
    """
    if outcome.snapshot is None or outcome.rolled_back:
        return False

    _restore_state_snapshot(outcome.snapshot)

    adjusted_results: list[AiCommandResult] = []
    for result in outcome.command_results:
        message = result.message
        if result.success:
            message = f"{message}；但{reason}"
        elif reason not in message:
            message = f"{message}；{reason}"

        adjusted_results.append(
            result.model_copy(
                update={
                    "success": False,
                    "message": message,
                }
            )
        )

    outcome.command_results = adjusted_results
    outcome.rolled_back = True
    return True


def _build_failed_command_outcome(
    commands: list[AiCommand],
    executed_results: list[AiCommandResult],
    *,
    failed_command: AiCommand,
    failed_index: int,
    failed_message: str,
    message: str | None = None,
    snapshot: _StateSnapshot,
) -> _CommandExecutionOutcome:
    effective_message = message or failed_message
    outcome = _CommandExecutionOutcome(
        commands=commands,
        command_results=[
            *executed_results,
            _build_command_result(failed_command, success=False, message=effective_message),
            *_build_skipped_command_results(commands[failed_index + 1 :]),
        ],
        snapshot=snapshot,
    )
    _rollback_command_outcome(outcome, reason=ROLLBACK_MESSAGE)
    return outcome


def _execute_action(action: str, target: str, params: dict[str, Any]) -> tuple[bool, str]:
    """
    重构后的通用执行器：
    1. 优先检查是否是场景激活
    2. 否则按设备映射表执行具体操作
    """
    safe_params = params if isinstance(params, dict) else {}

    # 处理场景激活
    if action == "activate_scene":
        scene_actions = SCENE_CONFIG.get(target)
        if not scene_actions:
            return False, f"未找到场景 {target}"

        failures: list[str] = []
        for scene_action in scene_actions:
            success, message = _execute_action(
                scene_action["action"],
                scene_action["target"],
                scene_action.get("params", {}),
            )
            if not success:
                failures.append(message)

        if failures:
            return False, f"场景 {target} 执行失败：{failures[0]}"

        return True, f"场景 {target} 已执行，共 {len(scene_actions)} 个动作"

    # 处理具体设备控制
    device_getter = DEVICE_MAP.get(target)
    if not device_getter:
        return False, f"未找到目标设备 {target}"
    
    dev = device_getter()
    
    if action == "turn_on":
        dev.on = True
        if "temp" in safe_params and hasattr(dev, "temp"):
            dev.temp = safe_params["temp"]
        return True, f"{target} 已开启"
    elif action == "turn_off":
        dev.on = False
        return True, f"{target} 已关闭"
    elif action == "set_brightness" and hasattr(dev, "brightness"):
        dev.brightness = safe_params.get("brightness", 80)
        return True, f"{target} 亮度已设置为 {dev.brightness}%"
    elif action == "set_mode" and hasattr(dev, "mode"):
        dev.mode = safe_params.get("mode", "normal")
        return True, f"{target} 模式已切换为 {dev.mode}"
    elif action == "set_curtain" and hasattr(dev, "openPercent"):
        dev.openPercent = safe_params.get("openPercent", 50)
        return True, f"{target} 开合已设置为 {dev.openPercent}%"
    elif action == "set_temp" and hasattr(dev, "temp"):
        dev.temp = safe_params.get("temp", 24)
        return True, f"{target} 温度已设置为 {dev.temp}°C"
    elif action == "play_music" and target == "music_player":
        # 如果 params 中带了 trackName，我们从曲库里找，否则随机
        track_name = safe_params.get("trackName")
        selected = next((m for m in MUSIC_LIBRARY if m["name"] == track_name), MUSIC_LIBRARY[0])
        dev.playing = True
        dev.trackName = selected["name"]
        dev.artist = selected["artist"]
        dev.url = selected["url"]
        dev.cover = selected["cover"]
        return True, f"已开始播放 {selected['name']} - {selected['artist']}"
    elif action == "set_volume" and hasattr(dev, "volume"):
        dev.volume = safe_params.get("volume", 50)
        return True, f"{target} 音量已设置为 {dev.volume}"

    return False, f"{target} 不支持动作 {action}"



# ── AI 回复 Prompt（给用户看的 markdown 文本） ─────────────────
REPLY_SYSTEM_PROMPT = """
你是一个智能家居与车辆控制助手。

你的目标：
1. 理解用户意图，并结合当前设备状态回答。
2. 返回可以直接展示给用户的 Markdown 文本。
3. 当用户询问状态、总结信息或请求说明时，优先使用清晰的层级结构展示内容。

输出要求：
1. 只输出给用户看的正文，不要输出 JSON、XML、解释器提示词或额外前缀。
2. 使用明确的 Markdown 结构，不要只写成连续纯文本。
3. 优先使用以下结构：
   - 二级标题：`##`
   - 三级标题：`###`
   - 列表项：`-`
   - 重点内容可使用 `**加粗**`
4. 除非用户明确要求，否则不要输出代码块，不要输出三反引号 ```。
5. 当内容是“当前状态总结”时，尽量整理成下面这种结构：
   - `## 当前设备状态`
   - `### 家庭状态`
   - 若干 `-` 列表项
   - `### 车辆状态`
   - 若干 `-` 列表项
6. 回答保持简洁、自然、可读，避免空泛客套。
"""

COMMAND_SYSTEM_PROMPT = """
你是一个智能家居与车辆控制指令解析器。你的职责是理解用户的自然语言指令，结合当前设备状态，返回严格规范的 JSON。

【操作限制 —— 你必须遵守！】
1. 你只能操作以下设备 (Targets):
   - living_room_light, living_room_ac, living_room_curtain, living_room_camera, living_room_humidifier, car_cabin_ac, music_player
2. 你只能执行以下动作 (Actions):
   - turn_on, turn_off, set_brightness, set_mode, set_curtain, activate_scene, set_temp, play_music, set_volume
3. 【重要】激活场景时，target 也就是 Scene ID 必须是以下之一，不允许自定义场景名:
   - sleep_mode, movie_mode, home_mode, away_mode, nap_mode

【用户偏好与曲库】
当用户要求播放音乐时（play_music），请根据用户的喜好或当前氛围（如天气、场景）从以下预设曲库中选择 trackName：
- 沉浸 Lo-fi (适合学习、安静)
- 治愈爵士 (适合午睡、晚间、放松)
- 活力流行 (适合打扫、运动、开心)

【参数说明 (params)】
根据 action 的不同，你可以在 params 中携带以下字段：
- temp: 温度数字 (16-30)，适用于 set_temp 或空调/车辆控温。
- brightness: 亮度数字 (0-100)，适用于 set_brightness。
- mode: 灯光模式 (normal/reading/movie/night)，适用于 set_mode。
- openPercent: 窗帘开合比例 (0-100)，适用于 set_curtain。
- trackName: str
- volume: int

【关键规则】
- 如果用户只是咨询、追问状态、闲聊，返回空命令数组。
- 不要编造设备，不要编造动作。
- 只返回 JSON，不允许任何解释性文字。

【回复格式】
{
  "commands": [
    {
      "intent": "device_control 或 scene_mode",
      "target": "上述 Target 或 Scene ID",
      "action": "上述 Action",
      "params": {}
    }
  ]
}
"""

# ── 建议 Prompt（让 AI 主动观察并提出建议） ──────────
SUGGESTION_PROMPT = """
你是一个谨慎、严格遵循当前状态的智能家居建议助手。你的职责是根据【设备实时状态】返回一条当前最合理、最值得执行的建议卡片。

你必须遵守下面这些规则：
1. 建议必须严格基于当前状态，不能重复建议已经完成的动作。
2. 你只能返回以下 actionType 之一：
   - openHomeAc
   - closeCurtain
   - openCarAc
   - chargeCar
   - none
3. 在选择 actionType 之前，必须先检查对应前置条件：
   - openHomeAc：仅当室温 > 28°C 且客厅空调当前为关闭时才可以返回。
     如果客厅空调已经开启，绝对不能返回 openHomeAc。
   - closeCurtain：仅当室外温度较高，且窗帘当前不是关闭状态时才可以返回。
     窗帘 openPercent=0 表示已关闭，openPercent=100 表示全开。
     如果窗帘 openPercent <= 0，绝对不能返回 closeCurtain。
   - openCarAc：仅当车辆在线且车内空调当前为关闭时才可以返回。
     如果车内空调已经开启，绝对不能返回 openCarAc。
   - chargeCar：仅当电量 < 20% 且当前未充电时才可以返回。
     如果车辆已经在充电，绝对不能返回 chargeCar。
4. 不要假设不存在的状态，不要编造“天快黑了”“室内太暗了”这类当前上下文里没有提供的信息。
5. 如果当前没有明确、合理、可执行的建议，必须返回 actionType="none"。
6. 当 actionType="none" 时：
   - title 要明确表达“无需额外操作”
   - desc 要直接说明当前状态已经基本合适
   - actionText 留空字符串 ""

你只能回复 JSON，格式如下：
{
  "title": "简短标题，例如：开启客厅空调",
  "desc": "给出和当前状态严格一致的原因说明",
  "actionText": "按钮文案，例如：立即开启",
  "actionType": "必须是以下之一: openHomeAc / closeCurtain / openCarAc / chargeCar / none"
}

只返回 JSON，不要任何 markdown 包裹，不要解释，不要补充额外文本。
"""

def _get_model_name() -> str:
    return os.getenv("AI_MODEL", DEFAULT_AI_MODEL)


def _parse_json_content(raw_content: str | None) -> dict[str, Any]:
    """
    尽量稳妥地把大模型文本解析成 JSON 对象。
    即使模型偶尔包了一层 ```json 代码块，这里也能兜住。
    """
    content = (raw_content or "").strip()

    if content.startswith("```"):
        lines = content.splitlines()
        # `lines[1:]`：去掉第一行（``` 或 ```json）
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            # `lines[:-1]`：去掉最后一行（```）
            lines = lines[:-1]
        content = "\n".join(lines).strip()

    if not content:
        raise ValueError("大模型返回为空")

    data = json.loads(content)
    if not isinstance(data, dict):
        raise ValueError("大模型返回的 JSON 顶层不是对象")

    return data


def _build_contextual_messages(system_prompt: str, history: list[ChatMessage]) -> list[dict[str, str]]:
    context = _build_context_snapshot()
    messages = [
        {
            "role": "system",
            "content": f"{system_prompt}\n\n【当前设备实时状态】\n{context}",
        }
    ]

    messages.extend(
        {
            "role": msg.role,
            "content": msg.content,
        }
        for msg in history
    )
    return messages


def _build_reply_messages(history: list[ChatMessage]) -> list[dict[str, str]]:
    return _build_contextual_messages(REPLY_SYSTEM_PROMPT, history)


def _build_command_messages(history: list[ChatMessage]) -> list[dict[str, str]]:
    return _build_contextual_messages(COMMAND_SYSTEM_PROMPT, history)


def _build_suggestion_messages() -> list[dict[str, str]]:
    context = _build_context_snapshot()
    print(context)
    return [
        {"role": "system", "content": SUGGESTION_PROMPT},
        {"role": "user", "content": f"请结合以下实时状态给出一条建议：\n{context}"},
    ]


async def _request_json_completion(
    messages: list[dict[str, str]],
    *,
    temperature: float,
) -> dict[str, Any]:
    content = await _request_completion_content(messages, temperature=temperature)
    return _parse_json_content(content)


async def _request_text_completion(
    messages: list[dict[str, str]],
    *,
    temperature: float,
) -> str:
    content = await _request_completion_content(messages, temperature=temperature)
    return content.strip()


async def _request_completion_content(
    messages: list[dict[str, str]],
    *,
    temperature: float,
) -> str:
    """
    统一负责“向模型发请求并拿回原始文本内容”。
    上层再决定把这段文本当成 JSON 解析，还是直接当普通 markdown 文本使用。
    """
    client = _get_client()
    response = await client.chat.completions.create(
        model=_get_model_name(),
        temperature=temperature,
        messages=messages,
    )

    if not response.choices:
        raise ValueError("大模型未返回任何候选结果")

    return response.choices[0].message.content or ""


def _extract_stream_text_delta(chunk: Any) -> str:
    """
    从模型的“流式 chunk 对象”里，尽量提取出本次新增的文本片段。

    为什么要单独封装这个函数：
    - 流式接口返回的不是完整 message，而是一小块一小块的增量数据。
    - 不同模型 / SDK 版本里，delta.content 可能是字符串，也可能是分段列表。
    - 所以这里统一做兼容处理，最后只返回“当前这一小段纯文本”。
    """
    # OpenAI 流式返回里，最外层通常会有 choices 数组；
    # 我们当前只关心第一条候选结果，所以先安全取出 choices[0]。
    choices = (
        getattr(chunk, "choices", None) or []
    )  # getattr 是 Python 里“安全地取对象属性”的函数。
    if not choices:
        # 没有 choices 说明这一帧里没有可用内容，直接返回空字符串跳过。
        return ""

    # 在流式模式下，真正的增量内容通常挂在 choice.delta 下面。
    delta = getattr(choices[0], "delta", None)
    if delta is None:
        # 有些 chunk 可能只带结束标记或元信息，没有正文 delta。
        return ""

    # delta.content 是最核心的文本载体。
    # 常见情况 1：content 直接就是一个字符串，例如 "你好"。
    content = getattr(delta, "content", None)
    if isinstance(content, str):
        return content

    # 常见情况 2：content 是一个列表，里面每一项再包一层 text。
    # 这里把这些碎片逐个提取出来，再拼成一段完整文本返回。
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            # 有的 SDK 会把每一项包装成对象，text 挂在属性上。
            text = getattr(item, "text", None)
            if isinstance(text, str):
                parts.append(text)
                continue

            # 也兼容“每一项本身就是 dict”的情况，例如 {"text": "..."}。
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])

        return "".join(parts)

    # 其他未知结构统一降级为空字符串，避免因为单个 chunk 格式变化把整条流打断。
    return ""


async def _stream_text_completion(
    messages: list[dict[str, str]],
    *,
    temperature: float,
) -> AsyncIterator[str]:
    client = _get_client()
    stream = await client.chat.completions.create(
        model=_get_model_name(),
        temperature=temperature,
        messages=messages,
        stream=True,
    )

    try:
        async for chunk in stream:
            delta = _extract_stream_text_delta(chunk)
            if delta:
                yield delta
    finally:
        await stream.close()


def _extract_commands(payload: dict[str, Any]) -> list[AiCommand]:
    raw_commands = payload.get("commands", [])
    if not isinstance(raw_commands, list):
        return []

    commands: list[AiCommand] = []

    for command in raw_commands:
        if not isinstance(command, dict):
            continue

        params = command.get("params", {})
        commands.append(
            AiCommand(
                intent=str(command.get("intent", "")),
                target=str(command.get("target", "")),
                action=str(command.get("action", "")),
                params=params if isinstance(params, dict) else {},
            )
        )

    return commands


def _execute_commands(commands: list[AiCommand]) -> _CommandExecutionOutcome:
    if not commands:
        return _CommandExecutionOutcome(commands=[], command_results=[])

    snapshot = _capture_state_snapshot()
    command_results: list[AiCommandResult] = []

    for index, command in enumerate(commands):
        intent = command.intent
        target = command.target
        action = command.action
        safe_params = command.params

        if intent not in EXECUTABLE_INTENTS:
            return _build_failed_command_outcome(
                commands,
                command_results,
                failed_command=command,
                failed_index=index,
                failed_message=f"鏈墽琛岋細涓嶆敮鎸佺殑鎸囦护鎰忓浘 {intent or 'unknown'}",
                snapshot=snapshot,
                    message=f"未执行：不支持的指令意图 {intent or 'unknown'}",
            )

        try:
            success, message = _execute_action(
                action=action,
                target=target,
                params=safe_params,
            )
        except Exception:
            _restore_state_snapshot(snapshot)
            raise

        if not success:
            return _build_failed_command_outcome(
                commands,
                command_results,
                failed_command=command,
                failed_index=index,
                failed_message=message,
                snapshot=snapshot,
            )

        command_results.append(_build_command_result(command, success=True, message=message))

    return _CommandExecutionOutcome(
        commands=commands,
        command_results=command_results,
        snapshot=snapshot,
    )


def _build_ai_chat_response(
    message: str,
    commands: list[AiCommand],
    command_results: list[AiCommandResult],
) -> AiChatResponse:
    return AiChatResponse(
        message=message.strip() if isinstance(message, str) and message.strip() else "操作已执行",
        commands=commands,
        commandResults=command_results,
    )


def _build_stream_done_payload(result: AiChatResponse) -> dict[str, Any]:
    # AiChatResponse 是 Pydantic 模型对象；
    # 这里直接 model_dump()，把它整体导出成普通 dict，方便后面编码成 SSE 的 JSON 负载。
    return result.model_dump()


async def _resolve_commands(history: list[ChatMessage]) -> _CommandExecutionOutcome:
    payload = await _request_json_completion(
        _build_command_messages(history),
        temperature=COMMAND_EXTRACTION_TEMPERATURE,
    )
    commands = _extract_commands(payload)
    return _execute_commands(commands)


async def _cleanup_command_task(
    command_task: asyncio.Task[_CommandExecutionOutcome],
    *,
    rollback_reason: str,
) -> None:
    """
    回收 command_task，并在它已经成功执行过设备改动时主动回滚。
    这一步是对 `task.cancel()` 的补充，因为 cancel 只能请求停止任务，
    不能自动撤销任务之前已经改过的全局状态。
    """
    # 先准备一个空壳变量，后面不管任务是“刚结束”还是“早就结束了”，
    # 最终都尽量把它的执行结果统一放进 outcome 里处理。
    outcome: _CommandExecutionOutcome | None = None

    if not command_task.done():
        # 任务还没结束时，先发出取消请求。
        # 注意：cancel() 只是告诉任务“后面别跑了”，不会自动回滚已经改过的设备状态。
        command_task.cancel()
        try:
            # 这里 await 一次，是为了把任务等它真的停下来
            outcome = await command_task
        except asyncio.CancelledError:
            # 如果任务在真正执行命令前就被取消了，就不会有需要回滚的结果对象。
            return
        except Exception:
            # 如果任务本身是因为别的异常结束，这里不再重复处理，
            # 让上层错误流继续走自己的异常分支。
            return
    elif command_task.cancelled():
        # 任务已经是“已取消”状态时，说明没有可取的结果对象，直接结束清理即可。
        return
    else:
        try:
            # 任务已经执行完时，不需要再 await，直接同步拿结果。
            # 这里拿到的 outcome 里可能已经包含“成功执行过设备动作”的信息。
            outcome = command_task.result()
        except Exception:
            # 如果 result() 取结果时抛异常，说明任务是异常结束的，
            # 这种情况也交给外层异常处理，不在这里额外兜底。
            return

    if outcome is not None:
        # 真正的回滚在这里发生：
        # 只要任务里已经拍过快照并产生了执行结果，就尝试把设备状态恢复回去。
        _rollback_command_outcome(outcome, reason=rollback_reason)


async def _generate_markdown_reply(history: list[ChatMessage]) -> str:
    return await _request_text_completion(
        _build_reply_messages(history),
        temperature=MARKDOWN_REPLY_TEMPERATURE,
    )


async def _call_llm(history: list[ChatMessage]) -> AiChatResponse:
    """
    AI 聊天主流程：
    1. 一条链路生成给用户看的 markdown 回复
    2. 另一条链路提取结构化 commands 并执行
    3. 最后合并成统一响应对象
    """
    # 给用户展示的 markdown 回复，和“提取命令并执行设备动作”彼此独立，
    # 所以这里并发创建两个任务，减少总等待时间。
    reply_task = asyncio.create_task(_generate_markdown_reply(history))
    command_task = asyncio.create_task(_resolve_commands(history))

    try:
        # asyncio.gather(...) 会同时等待两个任务都结束，
        # 并按传入顺序把结果组装成一个元组返回。
        message, command_payload = await asyncio.gather(reply_task, command_task)
    except Exception:
        # 只要其中一个任务报错，就主动取消另一个还没结束的任务，
        # 避免留下“后台还在跑、但结果已经不会再被使用”的悬挂任务。
        if not reply_task.done():
            reply_task.cancel()
        await asyncio.gather(reply_task, return_exceptions=True)
        # return_exceptions=True 的作用是：
        # 即使任务是在“取消”过程中结束的，也先把它们安全回收掉，
        # 不要让清理动作本身再抛出新的异常，覆盖原始错误。
        # command_task 可能已经改过设备状态，所以这里不能只 cancel，
        # 还要在任务已成功执行过命令时主动恢复到执行前快照。
        await _cleanup_command_task(
            command_task,
            rollback_reason=SESSION_ROLLBACK_MESSAGE,
        )
        # 清理完成后，把最初的异常继续往外抛，
        # 交给上层路由统一转成 HTTP 响应。
        raise

    return _build_ai_chat_response(
        message,
        command_payload.commands,
        command_payload.command_results,
    )


def _fallback_response(error_msg: str) -> ApiResponse:
    """当大模型调用失败时，返回一个兜底响应（避免前端白屏报错）"""
    return ApiResponse.fail(code=503, message=error_msg)


def _encode_sse(event: str, data: dict) -> str:
    # 按 SSE 协议把事件名和 JSON 负载拼成文本块。
    #
    # 产物大致长这样：
    # event: chunk
    # data: {"delta":"你好"}
    #
    # 两个事件块之间必须用空行分隔，也就是最后这个 \n\n。
    # 前端正是靠这个空行判断“上一条事件已经完整结束了”。
    # 这里先把 Python 的 dict/list 等对象序列化成 JSON 字符串，
    # 同时关闭 ASCII 转义，这样中文会直接保留为“你好”，而不是 "\u4f60\u597d"。
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


async def _stream_chat_events(history: list[ChatMessage]) -> AsyncIterator[str]:
    """
    流式接口走模型原生 token 流。
    - 前台：直接把 markdown token 转成 SSE chunk 推给前端
    - 后台：并行提取 commands，流结束后再一并回传
    """
    # 流式正文和命令提取也是两条独立链路：
    # 一边向前端持续推送 token，一边在后台解析并执行设备指令。
    command_task = asyncio.create_task(_resolve_commands(history))
    message_parts: list[str] = []

    try:
        # 先主动发一个 start 事件，让前端立刻知道“本次 SSE 会话已经开始”，
        # 可以提前进入 loading / streaming 状态，而不用等第一个正文 token 到来。
        yield _encode_sse("start", {"message": ""})

        async for delta in _stream_text_completion(
            _build_reply_messages(history),
            temperature=MARKDOWN_REPLY_TEMPERATURE,
        ):
            message_parts.append(delta)
            yield _encode_sse("chunk", {"delta": delta})

        command_payload = await command_task
        result = _build_ai_chat_response(
            "".join(message_parts),
            command_payload.commands,
            command_payload.command_results,
        )
        yield _encode_sse("done", _build_stream_done_payload(result))
    except json.JSONDecodeError as exc:
        # 如果命令提取阶段返回了非法 JSON，要先停止后台任务，
        # 再通过 SSE error 事件把错误明确发给前端。
        await _cleanup_command_task(
            command_task,
            rollback_reason=SESSION_ROLLBACK_MESSAGE,
        )
        yield _encode_sse("error", {"message": f"大模型返回格式错误: {str(exc)}"})
    except Exception as exc:
        # 这里兜底处理所有非 JSON 格式错误，例如网络失败、模型异常等。
        # 同样先把后台命令任务收尾，避免流式响应结束后它还继续运行。
        await _cleanup_command_task(
            command_task,
            rollback_reason=SESSION_ROLLBACK_MESSAGE,
        )
            # 如果任务其实已经结束了，也统一 await 一次，
            # 确保它内部潜在的异常被正常取出，不留“未处理任务异常”警告。

        yield _encode_sse("error", {"message": str(exc)})


async def _call_suggestion() -> AiSuggestionResponse:
    payload = await _request_json_completion(_build_suggestion_messages(), temperature=0.7)
    return AiSuggestionResponse(**payload)


@router.post("/chat", response_model=ApiResponse[AiChatResponse])
async def ai_chat(body: AiChatRequest):
    """
    接收前端发来的自然语言消息，并行生成：
    1. 给用户展示的 markdown 回复
    2. 后端可执行的结构化指令
    支持：设备控制 / 场景模式 / 状态查询 / 异常摘要
    """
    try:
        result = await _call_llm(body.messages)
        return ApiResponse.ok(data=result)
    except json.JSONDecodeError as e:
        # 模型明明应该返回结构化 JSON，却返回了不可解析的内容，
        # 这里统一转换成更容易定位的问题描述。
        return _fallback_response(f"大模型返回格式错误: {str(e)}")
    except Exception as e:
        # 其他异常统一走兜底响应，避免前端拿到未处理的 500 栈信息。
        return _fallback_response(str(e))


@router.post("/chat/stream")
async def ai_chat_stream(body: AiChatRequest):
    #StreamingResponse 发现你传进去的是一个异步迭代器，就会不断向它“要下一段数据”。
    return StreamingResponse(
        _stream_chat_events(body.messages),
        media_type="text/event-stream",
        headers=STREAM_HEADERS,
    )


@router.get("/suggestion", response_model=ApiResponse[AiSuggestionResponse])
async def get_ai_suggestion():
    """
    让 AI 根据当前全屋状态，主动生成一个建议。
    """
    try:
        print(await _call_suggestion())
        return ApiResponse.ok(data=await _call_suggestion())
    except Exception as e:
        # 如果 AI 挂了或者胡言乱语，返回一个默认稳妥的建议
        return ApiResponse.ok(data=AiSuggestionResponse(
            title="欢迎回来",
            desc="当前系统运行平稳，暂无特别建议。",
            actionText="查看详情",
            actionType="none"
        ))
