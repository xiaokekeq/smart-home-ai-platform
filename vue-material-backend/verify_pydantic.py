import sys
import os

# 将项目根目录加入到 Python 路径，确保能 import app
sys.path.insert(0, os.getcwd())

from app.schemas import AiChatResponse, AiCommand

# 1. 模拟大模型返回的原始数据字典 (对应的就是你 ai.py 里的 data 变量)
mock_data = {
    "message": "好的，这就播放音乐",
    "commands": [
        {
            "intent": "device_control",
            "target": "music_player",
            "action": "play_music",
            "params": {"trackName": "沉浸 Lo-fi"}
        }
    ]
}

print("--- 实验 A: 打印原始字典 (mock_data) ---")
print(mock_data)

# 2. 模拟你目前的构造逻辑（只传了 message）
# 注意：这里我们故意不传 commands
print("\n--- 实验 B: 打印生成的对象 (result) ---")
result = AiChatResponse(message=mock_data.get("message", "操作已执行"))

# 重点看这里！！
print(f"生成的对象内容: {result}")
print(f"提取字段 commands 的值: {result.commands}")

# 3. 验证 JSON 序列化结果
print("\n--- 实验 C: 验证序列化成 JSON 后的样子 (最终发回前端的) ---")
print(result.model_dump_json())
