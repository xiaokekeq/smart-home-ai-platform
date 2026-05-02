<template>
    <div class="vr360" id="PhotoDome">
        <canvas id="vr360" height="365" ref="canvasDom"></canvas>
        <div class="tips">
            <v-icon icon="mdi-panorama-variant-outline" />
            <span> Mobile device supports gyroscope</span>
            <v-btn
                variant="text"
                icon="mdi-fullscreen"
                color="rgba(255, 255, 255, 0.8)"
                @click="onFullscreen"
            ></v-btn>
        </div>
        <div v-if="loading" class="photo_loading">
            <!-- loading 为 true 时显示加载提示，说明 360 场景资源还没准备好 -->
            <v-card color="primary">
                <v-card-text>
                    <!-- v-progress-linear：Vuetify 的线性进度条 -->
                    <!-- indeterminate：不显示具体百分比，只表示“正在加载中” -->
                    Loading...
                    <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
                </v-card-text>
            </v-card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import * as BABYLON from '@babylonjs/core';
import { useAppStore } from '@/stores/useAppStore';

// shallowRef：这里只是保存 canvas 的 DOM 引用，不需要深层响应式追踪
const canvasDom = shallowRef<HTMLCanvasElement>();
const isFullscreen = ref(false);
const loading = ref(true);
const mainStore = useAppStore();

// onMounted：组件挂载完成后再初始化 Babylon 场景。
// 因为这里要拿到真实的 canvas DOM，所以不能太早执行。
onMounted(() => {
    // Babylon 引擎和场景，相当于 Three.js 里的 renderer + scene 这套运行基础
    // canvasDom.value! 里的 ! 是非空断言，表示这里确定已经拿到 canvas DOM
    const engine = new BABYLON.Engine(canvasDom.value!, true);
    const scene = new BABYLON.Scene(engine);

    // 移动端和桌面端使用不同相机：
    // 1. 移动端：DeviceOrientationCamera，适合陀螺仪控制
    // 2. 桌面端：ArcRotateCamera，适合鼠标拖拽查看全景
    let camera: BABYLON.DeviceOrientationCamera | BABYLON.ArcRotateCamera;
    if (mainStore.isMobile) {
        camera = new BABYLON.DeviceOrientationCamera(
            'DevOr_camera',
            new BABYLON.Vector3(0, -2, 0),
            scene
        );
    } else {
        // ArcRotateCamera：Babylon 内置的一种相机类型。
        // 它本身就是“相机”，不是单独的控制器。
        // 这种相机适合围绕某个目标点旋转观察场景。
        // 如果类比 Three.js，可以近似理解成：
        // PerspectiveCamera + OrbitControls 的那种交互体验。
        // ArcRotateCamera 不是“固定放在原点向前看”的普通相机，
        // 它更像围绕某个目标点旋转观察的轨道相机。
        // 这里的三个核心参数分别是：
        // alpha：水平旋转角度
        // beta：垂直旋转角度
        // radius：相机离目标点的距离
        camera = new BABYLON.ArcRotateCamera(
            'arcCamera1',
            -2.79,
            -1.62,
            1.82,
            new BABYLON.Vector3(0, -2, 0),
            scene
        );

        // Babylon 桌面端默认更像“我在旋转相机”。
        // 是否反转拖拽方向，要看你想要哪种手感：
        // 1. 默认：更像在转相机
        // 2. 反转后：更像在拖动画面
        // 这里当前保留原项目逻辑，不做反转。
        camera.invertRotation = true;
    }

    // 这里移动端和桌面端设置方式不同，是因为相机类型不同：
    // 1. DeviceOrientationCamera 更适合 setTarget，表示“朝哪里看”
    // 2. ArcRotateCamera 更常直接设置位置或角度参数
    // 所以 Babylon 里相机并不是都必须放在原点。
    if (mainStore.isMobile) {
        // 移动端：设置相机朝向某个目标点
        camera.setTarget(new BABYLON.Vector3(-2.98, -2.84, 3.32));
    } else {
        // 桌面端：直接把相机放到一个更合适的初始观察位置
        // 这里不是“必须放原点”，而是作者选了一个更舒服的观察点
        camera.position = new BABYLON.Vector3(667, 98, -301);
    }

    // attachControl：把鼠标/触摸控制绑定到 canvas 上。
    // 不绑定的话，相机虽然存在，但用户没法拖动交互。
    camera.attachControl(canvasDom.value!, true);

    // import.meta.env.BASE_URL：Vite 提供的基础路径
    // 这样资源路径不会写死成 /textures/full.jpg，
    // 项目部署在子路径下时也能正确找到图片。
    //Babylon 里专门用来做“360 全景照片场景”的现成封装
    const dome = new BABYLON.PhotoDome(
        'testdome',
        import.meta.env.BASE_URL + 'textures/full.jpg',
        {
            resolution: 32,
            size: 600, //可以理解成包围相机的这个“球形空间”有多大
        },
        scene
    );

    // MODE_SIDEBYSIDE：表示这张全景图是左右并排格式
    dome.imageMode = BABYLON.PhotoDome.MODE_SIDEBYSIDE;

    // runRenderLoop：Babylon 的持续渲染循环
    // 相当于 Three.js 里常见的：
    // requestAnimationFrame(() => renderer.render(scene, camera))
    engine.runRenderLoop(() => {
        scene.render();
    });

    dome.onReady = () => {
        // 全景图资源加载完成后，关闭 loading 提示
        loading.value = false;
        if (!mainStore.isMobile) {
            // cameraPositionAnimation 虽然参数名叫 mesh，
            // 但类型本来就允许 ArcRotateCamera，所以传 camera 没问题。
            // 这里是让桌面端相机平滑移动到目标观察位置，而不是瞬间跳过去。
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            cameraPositionAnimation(new BABYLON.Vector3(63, 10, -61), camera, 'position', scene);
        }
    };

    // 每一帧渲染完成后追加一次逻辑
    //还是不太懂！！！！
    scene.onAfterRenderObservable.add(() => {
        // 自转逻辑：只在桌面端、并且资源加载完成后执行
        if (!mainStore.isMobile && loading.value === false) {
            // getDeltaTime() 拿到上一帧到这一帧经历了多少毫秒
            // 用它参与速度计算，可以让不同帧率设备下转速尽量一致
            // 这和 Three.js 里用 deltaTime 做帧率无关动画是同一个思路
            // 例如：
            // 1. 如果当前是 60fps，一帧大约 16.7ms
            // 2. 如果当前是 120fps，一帧大约 8.3ms
            // 如果每一帧都固定减同一个角度，高帧率设备就会转得更快。
            // 所以这里先拿到“这一帧实际过去了多少时间”，再按时间来算本帧该转多少。
            const deltaTime = parseFloat(engine.getDeltaTime().toFixed(3));
            // 0.1 / 1000 可以理解成“每 1 毫秒转 0.0001”
            // 再乘以 deltaTime，就得到“这一帧应该转多少”。
            // 这样：
            // 16ms 的一帧会转得多一点
            // 8ms 的一帧会转得少一点
            // 最终不同帧率设备上一整秒转过的总角度会更接近。
            const speed = (0.1 / 1000) * deltaTime;

            // ArcRotateCamera 的 alpha 表示绕目标点的水平旋转角度
            // 每帧减一点 alpha，就能形成自动环绕观察的效果
            // @ts-ignore
            camera.alpha -= speed;
        }
    });

    window.addEventListener('resize', () => {
        engine.resize();
    });

    document.addEventListener('fullscreenchange', () => {
        if (isFullscreen.value) {
            isFullscreen.value = false;
        }
    });
});

// 让相机或物体的某个 Vector3 属性做平滑过渡动画
// 这里主要用来让相机位置从初始点缓慢移动到目标点
function cameraPositionAnimation(
    value: BABYLON.Vector3,
    mesh: BABYLON.AbstractMesh | BABYLON.ArcRotateCamera,
    targetProperty = 'position',
    scene: BABYLON.Scene,
    frame = 120
) {
    return new Promise<void>((resolve) => {
        const animation = new BABYLON.Animation(
            'cameraAnimation',
            targetProperty,
            60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            true
        );
        const keys = [];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        keys.push({ frame: 0, value: mesh[targetProperty] });
        keys.push({ frame: frame, value: value });

        animation.setKeys(keys);
        mesh.animations.push(animation);
        scene.beginAnimation(mesh, 0, frame, false, 1, () => {
            resolve();
        });
    });
}

const onFullscreen = () => {
    const element = document.getElementById('vr360')!;
    if (element.requestFullscreen) {
        element.requestFullscreen();
        // 全屏切换不是同步立即完成的
        // 这里稍微延迟一下再改状态，避免界面状态和浏览器真实全屏状态短暂不同步
        setTimeout(() => {
            isFullscreen.value = true;
        }, 200);
    }
};
</script>

<style lang="scss">
.vr360 {
    position: relative;
    width: 100%;
    height: 365px;

    .fullscreen_btn {
        position: absolute;
        right: 6px;
        bottom: 6px;
        z-index: 2;
    }

    .photo_loading {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }
}

.vr360 {
    position: relative;
    width: 100%;
    height: 365px;

    .fullscreen {
        position: fixed;
        left: 0;
        top: 0;
        width: 100vw;
        height: 100vh;
    }

    .fullscreen_btn {
        position: absolute;
        right: 6px;
        bottom: 6px;
        z-index: 2;
    }

    .tips {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 100%;
        line-height: 40px;
        text-align: right;
        color: rgba(255, 255, 255, 0.8);
        padding: 0 0px;
    }
}

#vr360 {
    position: absolute;
    width: 100%;
    height: 100%;
}
</style>
