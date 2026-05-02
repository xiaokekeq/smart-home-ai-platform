"""
FastAPI 后端入口文件 (`main.py`)
这是整个后端服务器的 "大脑" 或 "总开关"，程序从这里启动。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 引入我们在 routers 文件夹下写好的路由模块（类似于 Vue 里的路由模块，把不同的接口分门别类）
from app.routers import environment, vehicle, dashboard, ai

# 1. 创建 FastAPI 应用实例（相当于 Vue 里的 createApp）
app = FastAPI(
    title="车家互联智能控制平台 API",
    description="基于 FastAPI 的智能家居与车辆控制后端服务",
    version="0.1.0",
)

# 2. CORS (跨域资源共享) 中间件
# 为什么需要这个？因为前端 Vue 跑在 localhost:5173，而后端 FastAPI 跑在 localhost:8000
# 浏览器为了安全，默认不允许跨端口请求。配置了 CORS，后端告诉浏览器："我允许来自 5173 端口的请求跨域访问我"。
app.add_middleware(
    CORSMiddleware,
    # 允许的来源列表，加上前端本地开发服务器的地址
    allow_origins=[
        "http://localhost:5173",   # Vite 默认本地开发服务器
        "http://localhost:8088",   # 你的项目实际跑的端口（vite.config.ts 里配的）
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8088",
        "http://127.0.0.1:3000",
    ],
    # 是否允许携带 cookie（针对登录会话等）
    allow_credentials=True,
    # 允许的方法（GET, POST, PATCH 等等），"*" 代表允许所有
    allow_methods=["*"],
    # 允许的请求头，"*" 代表允许所有
    allow_headers=["*"],
)

# 3. 挂载路由 (Include Routers)
# 这很像在总路由里注册子路由。把不同文件里写的接口汇总到这里，统一对外暴露。
app.include_router(environment.router)
app.include_router(vehicle.router)
app.include_router(dashboard.router)
app.include_router(ai.router)


# 4. 根目录 / 健康检查接口
# 使用 @app.get 装饰器，表示当客户端以 GET 方法请求 "/api/health" 路径时，执行下面的函数。
@app.get("/api/health", tags=["系统"])
async def health_check():
    from app.schemas import ApiResponse
    return ApiResponse.ok(data={"service": "smart-home-backend"})
