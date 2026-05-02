<template>
    <div ref="containerRef" class="vehicle-model-viewer">
        <canvas ref="canvasRef" class="vehicle-model-viewer__canvas" />
        <div v-if="loading" class="vehicle-model-viewer__overlay">
            <span>Loading model...</span>
        </div>
        <div v-else-if="errorMessage" class="vehicle-model-viewer__overlay vehicle-model-viewer__overlay--error">
            <span>{{ errorMessage }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';

type WeatherPreset = 'sunny' | 'cloudy' | 'rainy' | 'snowy';

interface Props {
    // glb / gltf 模型路径。
    modelUrl: string;
    // 模型整体缩放倍率，方便外层页面按不同车型微调尺寸。
    modelScale?: number;
    // 是否允许模型自动旋转。
    autoRotate?: boolean;
    // 自动旋转速度。
    autoRotateSpeed?: number;
    // 相机自动构图时的额外留白系数。值越大，镜头越远。
    framePadding?: number;
    // HDR 天空 / 环境贴图路径。
    hdrSkyUrl?: string;
    // 地面颜色贴图。
    groundTextureUrl?: string;
    // 地面法线贴图。
    groundNormalUrl?: string;
    // 地面粗糙度贴图。
    groundRoughnessUrl?: string;
    // 地面 AO 贴图。
    groundAoUrl?: string;
    // 地面位移贴图。
    groundDisplacementUrl?: string;
    // 位移强度，数值越大，地面起伏越明显。
    groundDisplacementScale?: number;
    weatherPreset?: WeatherPreset;
}

const props = withDefaults(defineProps<Props>(), {
    modelScale: 1,
    autoRotate: true,
    autoRotateSpeed: 1.4,
    framePadding: 1.18,
    hdrSkyUrl: '',
    groundTextureUrl: '',
    groundNormalUrl: '',
    groundRoughnessUrl: '',
    groundAoUrl: '',
    groundDisplacementUrl: '',
    groundDisplacementScale: 0.035,
    weatherPreset: 'cloudy',
});

// 组件 DOM 和基础 UI 状态。
const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const loading = ref(true);
const errorMessage = ref('');

// Three.js 运行时核心对象。
const clock = new THREE.Clock();
const scene = new THREE.Scene();
const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

// 这些对象都是大型类实例，只需要保存引用，不适合让 Vue 深层代理。
const camera = shallowRef<THREE.PerspectiveCamera | null>(null);
const renderer = shallowRef<THREE.WebGLRenderer | null>(null);
const controls = shallowRef<OrbitControls | null>(null);
const resizeObserver = shallowRef<ResizeObserver | null>(null);
const currentModel = shallowRef<THREE.Object3D | null>(null);
const mixer = shallowRef<THREE.AnimationMixer | null>(null);
const pmremGenerator = shallowRef<THREE.PMREMGenerator | null>(null);
const rgbeLoader = new RGBELoader();
const hdrTexture = shallowRef<THREE.DataTexture | null>(null);
const environmentTarget = shallowRef<THREE.WebGLRenderTarget | null>(null);
const groundPlane = shallowRef<THREE.Mesh | null>(null);
const weatherParticles = shallowRef<THREE.Points | null>(null);
const weatherParticleSpeeds = shallowRef<Float32Array | null>(null);
const weatherParticleDrift = shallowRef<Float32Array | null>(null);
const vehicleWetness = ref(props.weatherPreset === 'rainy' ? 0.18 : 0);

// requestAnimationFrame 的句柄，组件销毁时需要手动取消。
let animationFrameId = 0;

type WeatherMaterialBase = {
    roughness: number;
    metalness: number;
    color: number;
    clearcoat?: number;
    clearcoatRoughness?: number;
    envMapIntensity?: number;
};

const wetSurfaceTint = new THREE.Color('#dbe4ea');

const rememberMaterialState = (material: THREE.MeshStandardMaterial) => {
    if (material.userData.__weatherBase) return;

    material.userData.__weatherBase = {
        roughness: material.roughness,
        metalness: material.metalness,
        color: material.color.getHex(),
        clearcoat: (material as THREE.MeshPhysicalMaterial).clearcoat ?? 0,
        clearcoatRoughness: (material as THREE.MeshPhysicalMaterial).clearcoatRoughness ?? 0,
        envMapIntensity: material.envMapIntensity ?? 1,
    };
};

const resetMaterialToBase = (material: THREE.MeshPhysicalMaterial, base: WeatherMaterialBase) => {
    material.roughness = base.roughness;
    material.metalness = base.metalness;
    material.color.setHex(base.color);
    material.clearcoat = base.clearcoat ?? 0;
    material.clearcoatRoughness = base.clearcoatRoughness ?? 0;
    material.envMapIntensity = base.envMapIntensity ?? 1;
};

const applyWetnessToMaterial = (material: THREE.MeshPhysicalMaterial, base: WeatherMaterialBase, wetness: number) => {
    if (wetness <= 0.001) return;

    material.roughness = THREE.MathUtils.lerp(base.roughness, Math.max(0.05, base.roughness * 0.18), wetness);
    material.metalness = THREE.MathUtils.lerp(base.metalness, Math.min(1, base.metalness + 0.08), wetness);
    material.clearcoat = THREE.MathUtils.lerp(base.clearcoat ?? 0, 1, wetness);
    material.clearcoatRoughness = THREE.MathUtils.lerp(base.clearcoatRoughness ?? 0, 0.045, wetness);
    material.envMapIntensity = THREE.MathUtils.lerp(base.envMapIntensity ?? 1, 1.85, wetness);
    material.color.lerp(wetSurfaceTint, wetness * 0.05);
};

const updateVehicleWetness = (delta: number) => {
    const targetWetness = props.weatherPreset === 'rainy' ? 1 : 0;
    const transitionSpeed = targetWetness > vehicleWetness.value ? 2.4 : 0.85;
    const blendFactor = 1 - Math.exp(-transitionSpeed * delta);
    const nextWetness = THREE.MathUtils.clamp(
        vehicleWetness.value + ((targetWetness - vehicleWetness.value) * blendFactor),
        0,
        1
    );

    if (Math.abs(nextWetness - vehicleWetness.value) < 0.0005) {
        if (targetWetness === 0 && vehicleWetness.value < 0.001) {
            vehicleWetness.value = 0;
        }
        return false;
    }

    vehicleWetness.value = nextWetness;
    return true;
};

// 释放材质内部挂着的各种贴图，再释放材质本身。
// Three.js 的纹理、材质、几何体都占用 GPU 资源，切换模型或销毁组件时必须清理。
const disposeMaterial = (material: THREE.Material) => {
    Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) {
            value.dispose();
        }
    });
    material.dispose();
};

// 销毁旧模型：
// 1. 遍历所有 mesh
// 2. 释放 geometry / material / texture
// 3. 从场景移除
const disposeModel = (object: THREE.Object3D | null) => {
    if (!object) return;

    object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;

        mesh.geometry.dispose();

        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(disposeMaterial);
        } else if (mesh.material) {
            disposeMaterial(mesh.material);
        }
    });

    scene.remove(object);
};

// 当容器尺寸变化时，让 renderer 和 camera 一起更新。
// 否则画布会被拉伸，3D 画面比例会失真。
const resizeRenderer = () => {
    if (!containerRef.value || !renderer.value || !camera.value) return;

    const { clientWidth, clientHeight } = containerRef.value;
    if (!clientWidth || !clientHeight) return;

    renderer.value.setSize(clientWidth, clientHeight, false);
    camera.value.aspect = clientWidth / clientHeight;
    camera.value.updateProjectionMatrix();
};

// 清理当前环境贴图相关资源。
// background 和 environment 都可能持有 GPU 纹理句柄，切换环境时要先释放旧资源。
const disposeEnvironment = () => {
    if (scene.background instanceof THREE.Texture) {
        scene.background = null;
    }
    if (scene.environment instanceof THREE.Texture) {
        scene.environment = null;
    }
    hdrTexture.value?.dispose();
    environmentTarget.value?.dispose();
    hdrTexture.value = null;
    environmentTarget.value = null;
};

// 清理地面平面和它绑定的材质资源。
const disposeGround = () => {
    if (!groundPlane.value) return;

    const material = groundPlane.value.material as THREE.MeshStandardMaterial;
    material.map?.dispose();
    material.dispose();
    groundPlane.value.geometry.dispose();
    scene.remove(groundPlane.value);
    groundPlane.value = null;
};

const disposeWeatherParticles = () => {
    if (!weatherParticles.value) return;

    const material = weatherParticles.value.material as THREE.PointsMaterial;
    material.map?.dispose();
    material.dispose();
    weatherParticles.value.geometry.dispose();
    scene.remove(weatherParticles.value);
    weatherParticles.value = null;
    weatherParticleSpeeds.value = null;
    weatherParticleDrift.value = null;
};

// 根据模型包围盒自动摆镜头和控制器目标点。
// 目标是“任意车型进来都能得到一个稳定可用的默认构图”。
const fitCameraToModel = (model: THREE.Object3D) => {
    if (!camera.value || !controls.value) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;

    // 把模型中心点挪回场景原点附近。
    // 后面的相机位置和 controls.target 都基于这个统一参考点计算。
    model.position.sub(center);

    camera.value.position.set(
        maxDimension * props.framePadding,
        // 相机高度故意压低一些，让车更像平视展示，不会有强烈俯视感。
        maxDimension * 0.2,
        maxDimension * 1.72
    );

    // near / far 按模型整体大小动态决定，避免近裁剪或远裁剪把模型切掉。
    camera.value.near = Math.max(0.1, maxDimension / 100);
    camera.value.far = maxDimension * 30;
    camera.value.updateProjectionMatrix();

    // 观察目标点略微下移，让旋转中心落在车身中下部，视觉上更稳。
    controls.value.target.set(0, -size.y * 0.18, 0);
    // 缩放范围按模型尺寸约束，避免用户把镜头拖得太远或穿进模型里。
    controls.value.minDistance = maxDimension * 0.95;
    controls.value.maxDistance = maxDimension * 4.2;
    controls.value.update();
    // 禁止相机翻到底部，车模场景一般不需要从地板下面往上看。
    controls.value.maxPolarAngle = Math.PI / 2;
};

// 构建地面平面，并根据模型大小自动决定平面尺寸和落点高度。
// 这里支持一整套 PBR 贴图：颜色 / 法线 / 粗糙度 / AO / 位移。
const buildGroundPlane = (model: THREE.Object3D) => {
    disposeGround();

    if (!props.groundTextureUrl || !renderer.value) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const floorY = box.min.y;
    const planeSize = Math.max(size.x, size.z) * 10;

    // 并行加载整套地面贴图，缺省贴图允许为空。
    Promise.all([
        textureLoader.loadAsync(props.groundTextureUrl),
        props.groundNormalUrl ? textureLoader.loadAsync(props.groundNormalUrl) : Promise.resolve(null),
        props.groundRoughnessUrl ? textureLoader.loadAsync(props.groundRoughnessUrl) : Promise.resolve(null),
        props.groundAoUrl ? textureLoader.loadAsync(props.groundAoUrl) : Promise.resolve(null),
        props.groundDisplacementUrl ? textureLoader.loadAsync(props.groundDisplacementUrl) : Promise.resolve(null),
    ])
        .then(([colorMap, normalMap, roughnessMap, aoMap, displacementMap]) => {
            const textureList = [colorMap, normalMap, roughnessMap, aoMap, displacementMap].filter(Boolean) as THREE.Texture[];

            textureList.forEach((texture) => {
                // 允许贴图在 S/T 两个方向平铺循环。
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                // 控制纹理平铺密度。
                texture.repeat.set(6, 6);
                // 让斜视角下的地面纹理尽量保持清晰。
                texture.anisotropy = renderer.value?.capabilities.getMaxAnisotropy() ?? 1;
            });

            // 只有颜色贴图属于颜色数据，需要按 sRGB 解释。
            colorMap.colorSpace = THREE.SRGBColorSpace;

            // 位移贴图要真正推顶点，所以地面需要足够高的细分密度。
            const geometry = new THREE.PlaneGeometry(planeSize, planeSize, 160, 160);
            // aoMap 需要 uv2；这里直接把 uv 复制一份给 uv2。
            const uvAttribute = geometry.getAttribute('uv');
            geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(Array.from(uvAttribute.array), 2));

            const material = new THREE.MeshStandardMaterial({
                map: colorMap,
                normalMap,
                roughnessMap,
                aoMap,
                displacementMap,
                displacementScale: displacementMap ? props.groundDisplacementScale : 0,
                roughness: 0.92,
                metalness: 0.02,
            });

            const ground = new THREE.Mesh(geometry, material);
            ground.rotation.x = -Math.PI / 2;
            // 略微下压一点，避免地面和模型底部完全共面导致闪烁。
            ground.position.set(0, floorY - 0.015, 0);
            ground.receiveShadow = true;
            ground.renderOrder = -1;

            scene.add(ground);
            groundPlane.value = ground;
            applyWeatherToGround(props.weatherPreset);
        })
        .catch(() => {
            disposeGround();
        });
};

const buildWeatherParticles = (preset: WeatherPreset) => {
    disposeWeatherParticles();

    if (preset !== 'rainy' && preset !== 'snowy') return;

    const particleCount = preset === 'rainy' ? 520 : 380;
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    const drift = new Float32Array(particleCount);
    const spreadX = 16;
    const spreadZ = 16;
    const maxHeight = preset === 'rainy' ? 12 : 10;

    for (let index = 0; index < particleCount; index += 1) {
        const pointer = index * 3;
        positions[pointer] = (Math.random() - 0.5) * spreadX;
        positions[pointer + 1] = Math.random() * maxHeight + 1;
        positions[pointer + 2] = (Math.random() - 0.5) * spreadZ;
        speeds[index] = preset === 'rainy' ? 8 + Math.random() * 6 : 1.4 + Math.random() * 1.4;
        drift[index] = preset === 'rainy' ? -0.08 + Math.random() * 0.16 : -0.18 + Math.random() * 0.36;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
        color: preset === 'rainy' ? '#a8d5ff' : '#ffffff',
        size: preset === 'rainy' ? 0.08 : 0.16,
        transparent: true,
        opacity: preset === 'rainy' ? 0.65 : 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, particleMaterial);
    points.position.y = preset === 'rainy' ? 1.2 : 0.8;

    weatherParticles.value = points;
    weatherParticleSpeeds.value = speeds;
    weatherParticleDrift.value = drift;
    scene.add(points);
};

const ensureWettableMaterial = (mesh: THREE.Mesh) => {
    if (Array.isArray(mesh.material)) return null;
    if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return null;

    if (!(mesh.material instanceof THREE.MeshPhysicalMaterial)) {
        const source = mesh.material;
        const upgraded = new THREE.MeshPhysicalMaterial();
        THREE.MeshStandardMaterial.prototype.copy.call(upgraded, source);
        source.dispose();
        mesh.material = upgraded;
    }

    return mesh.material as THREE.MeshPhysicalMaterial;
};

const applyWeatherMaterialsToModel = (preset: WeatherPreset) => {
    if (!currentModel.value) return;

    currentModel.value.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh || Array.isArray(mesh.material)) return;
        if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;

        const material = ensureWettableMaterial(mesh);
        if (!material) return;

        rememberMaterialState(material);
        const base = material.userData.__weatherBase as WeatherMaterialBase;

        resetMaterialToBase(material, base);

        if (preset === 'snowy') {
            material.roughness = Math.min(1, base.roughness + 0.18);
            material.color.lerp(new THREE.Color('#eaf2ff'), 0.16);
        } else if (preset === 'sunny') {
            material.roughness = Math.max(0.18, base.roughness * 0.9);
            material.metalness = Math.min(1, base.metalness + 0.06);
        }

        const shouldApplyWetness = preset !== 'snowy' && vehicleWetness.value > 0.001;
        if (shouldApplyWetness) {
            applyWetnessToMaterial(material, base, vehicleWetness.value);
        }
    });
};

const applyWeatherToGround = (preset: WeatherPreset) => {
    if (!groundPlane.value) return;

    const material = groundPlane.value.material as THREE.MeshStandardMaterial;
    const baseColor = material.map ? '#ffffff' : '#414850';

    material.color.set(baseColor);
    material.roughness = 0.92;
    material.metalness = 0.02;
    groundPlane.value.position.z = 0;

    if (preset === 'rainy') {
        material.color.set('#b6c7d6');
        material.roughness = 0.46;
        material.metalness = 0.08;
    } else if (preset === 'snowy') {
        material.color.set('#f2f6fb');
        material.roughness = 0.98;
        material.metalness = 0;
    } else if (preset === 'sunny') {
        material.color.set('#ffffff');
        material.roughness = 0.82;
    }

    material.needsUpdate = true;
};

const applyWeatherState = () => {
    applyWeatherMaterialsToModel(props.weatherPreset);
    applyWeatherToGround(props.weatherPreset);
    buildWeatherParticles(props.weatherPreset);
};

// 初始化真实阴影光源。
// 这里用 DirectionalLight 来模拟太阳光，因为它天然适合“车 + 地面”的投影关系。
const initShadowLighting = () => {
    const shadowLight = new THREE.DirectionalLight('#fff7ea', 2.2);
    // 灯光位置决定阴影朝向。
    shadowLight.position.set(7.5, 10, 5.5);
    shadowLight.castShadow = true;
    // 阴影贴图分辨率，越大越清晰，但开销也越高。
    shadowLight.shadow.mapSize.set(2048, 2048);
    // bias / normalBias 用来抑制阴影痤疮、悬浮等常见瑕疵。
    shadowLight.shadow.bias = -0.00008;
    shadowLight.shadow.normalBias = 0.02;
    // 下面这组参数决定“哪一块空间会被用于计算阴影”。
    shadowLight.shadow.camera.near = 1;
    shadowLight.shadow.camera.far = 36;
    shadowLight.shadow.camera.left = -12;
    shadowLight.shadow.camera.right = 12;
    shadowLight.shadow.camera.top = 12;
    shadowLight.shadow.camera.bottom = -12;
    // 目标点决定方向光具体朝哪里照。
    shadowLight.target.position.set(0, 0, 0);

    scene.add(shadowLight);
    scene.add(shadowLight.target);
};

// 应用环境贴图。
// 有 HDR 时优先使用 HDR；没有 HDR 时退回内置 RoomEnvironment，保证 PBR 材质仍然有基础环境反射。
const applyEnvironment = () => {
    if (!renderer.value || !pmremGenerator.value) return;

    disposeEnvironment();

    if (!props.hdrSkyUrl) {
        // RoomEnvironment 这里只是 fallback，不是“室外主环境”。
        environmentTarget.value = pmremGenerator.value.fromScene(new RoomEnvironment(), 0.04);
        scene.environment = environmentTarget.value.texture;
        scene.background = null;
        return;
    }

    rgbeLoader.load(
        props.hdrSkyUrl,
        (texture) => {
            disposeEnvironment();

            // HDR 是等距柱状全景图，需要声明其映射方式。
            texture.mapping = THREE.EquirectangularReflectionMapping;
            hdrTexture.value = texture;
            // 把 HDR 预处理成适合 PBR 材质使用的环境贴图结果。
            environmentTarget.value = pmremGenerator.value?.fromEquirectangular(texture) ?? null;
            // 背景显示用原 HDR，全局环境反射用 PMREM 结果。
            scene.background = texture;
            scene.environment = environmentTarget.value?.texture ?? null;
        },
        undefined,
        () => {
            // HDR 加载失败时退回 fallback，避免场景完全没有环境反射。
            environmentTarget.value = pmremGenerator.value?.fromScene(new RoomEnvironment(), 0.04) ?? null;
            scene.environment = environmentTarget.value?.texture ?? null;
            scene.background = null;
        }
    );
};

// 加载 glb 模型，并在模型进场后完成镜头适配、地面构建和动画启动。
const loadModel = () => {
    loading.value = true;
    errorMessage.value = '';

    loader.load(
        props.modelUrl,
        (gltf) => {
            disposeModel(currentModel.value);

            const model = gltf.scene;
            // 模型整体缩放由外层页面决定。
            model.scale.setScalar(props.modelScale);
            // 经验值旋转，让车型朝向更符合页面构图。
            model.rotation.y = -Math.PI / 5.5;

            model.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;
                // 真实阴影依赖投射和接收标记。
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            });

            currentModel.value = model;
            scene.add(model);
            fitCameraToModel(model);
            buildGroundPlane(model);
            applyWeatherMaterialsToModel(props.weatherPreset);
            buildWeatherParticles(props.weatherPreset);

            if (gltf.animations.length > 0) {
                // 如果模型自带动画，就统一交给 AnimationMixer 播放。
                mixer.value = new THREE.AnimationMixer(model);
                gltf.animations.forEach((clip) => {
                    mixer.value?.clipAction(clip).play();
                });
            } else {
                mixer.value = null;
            }

            loading.value = false;
        },
        undefined,
        () => {
            loading.value = false;
            errorMessage.value = 'Model load failed';
        }
    );
};

// Three.js 主循环：
// 1. 请求下一帧
// 2. 推进动画时间
// 3. 更新 OrbitControls 阻尼
// 4. 渲染当前场景
const animate = () => {
    animationFrameId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    mixer.value?.update(delta);
    if (updateVehicleWetness(delta)) {
        applyWeatherMaterialsToModel(props.weatherPreset);
    }
    if (weatherParticles.value && weatherParticleSpeeds.value && weatherParticleDrift.value) {
        const positions = weatherParticles.value.geometry.getAttribute('position') as THREE.BufferAttribute;
        const maxHeight = props.weatherPreset === 'rainy' ? 13 : 11;
        const resetHeight = props.weatherPreset === 'rainy' ? -0.6 : -0.2;

        for (let index = 0; index < positions.count; index += 1) {
            const nextY = positions.getY(index) - weatherParticleSpeeds.value[index] * delta;
            const nextX = positions.getX(index) + weatherParticleDrift.value[index] * delta;
            let nextZ = positions.getZ(index);

            if (props.weatherPreset === 'snowy') {
                nextZ += Math.sin((performance.now() * 0.001) + index) * 0.02;
            }

            positions.setX(index, nextX > 8 ? -8 : nextX < -8 ? 8 : nextX);
            positions.setZ(index, nextZ > 8 ? -8 : nextZ < -8 ? 8 : nextZ);

            if (nextY <= resetHeight) {
                positions.setY(index, Math.random() * maxHeight + 1.5);
            } else {
                positions.setY(index, nextY);
            }
        }

        positions.needsUpdate = true;
    }
    controls.value?.update();
    renderer.value?.render(scene, camera.value as THREE.Camera);
};

// 初始化整个 Three 场景运行时。
// 这里集中创建 renderer / camera / controls / PMREM / 光照 / 环境贴图。
const initScene = () => {
    if (!canvasRef.value) return;

    const nextRenderer = new THREE.WebGLRenderer({
        canvas: canvasRef.value,
        antialias: true,
        // 允许 canvas 背景透明，这样 scene.background = null 时可以透出外层容器背景。
        alpha: true,
    });
    // 高 DPI 屏幕适当限制像素比，避免移动端和高分屏开销过大。
    nextRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // 输出到屏幕时按 sRGB 处理，避免颜色发灰。
    nextRenderer.outputEncoding = THREE.sRGBEncoding;
    // HDR + PBR 场景常用 ACES 色调映射，整体观感更自然。
    nextRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    nextRenderer.toneMappingExposure = 1.42;
    // 开启阴影系统，并使用软阴影算法。
    nextRenderer.shadowMap.enabled = true;
    nextRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.value = nextRenderer;

    // 透视相机用于车辆展示。
    const nextCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    camera.value = nextCamera;

    // OrbitControls 负责拖拽旋转、滚轮缩放和自动旋转。
    const nextControls = new OrbitControls(nextCamera, nextRenderer.domElement);
    nextControls.enableDamping = true;
    // 车辆展示不需要平移，否则很容易把模型拖偏。
    nextControls.enablePan = false;
    nextControls.autoRotate = props.autoRotate;
    nextControls.autoRotateSpeed = props.autoRotateSpeed;
    controls.value = nextControls;

    // PMREM 工具负责把 HDR / RoomEnvironment 转成 PBR 可用的环境贴图结果。
    pmremGenerator.value = new THREE.PMREMGenerator(nextRenderer);

    initShadowLighting();
    applyEnvironment();

    resizeRenderer();
    loadModel();
    animate();
};

watch(
    () => props.weatherPreset,
    () => {
        applyWeatherState();
    }
);

onMounted(() => {
    initScene();

    // 监听外层容器尺寸变化，保证 renderer 和 camera 能跟着自适应。
    resizeObserver.value = new ResizeObserver(() => {
        resizeRenderer();
    });

    if (containerRef.value) {
        resizeObserver.value.observe(containerRef.value);
    }
});

onBeforeUnmount(() => {
    // 组件销毁时按“动画循环 -> 监听器 -> 控件 -> 场景资源”的顺序清理。
    cancelAnimationFrame(animationFrameId);
    resizeObserver.value?.disconnect();
    controls.value?.dispose();
    disposeModel(currentModel.value);
    disposeGround();
    disposeWeatherParticles();
    mixer.value?.stopAllAction();
    disposeEnvironment();

    scene.clear();
    pmremGenerator.value?.dispose();
    renderer.value?.dispose();
});
</script>

<style scoped lang="scss">
.vehicle-model-viewer {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 320px;
    border-radius: inherit;
    overflow: hidden;
    background:
        radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.2), transparent 24%),
        radial-gradient(circle at 18% 24%, rgba(95, 219, 255, 0.18), transparent 34%),
        radial-gradient(circle at 80% 30%, rgba(255, 214, 153, 0.12), transparent 28%),
        linear-gradient(180deg, rgba(7, 15, 24, 0.9), rgba(12, 20, 30, 0.62));
}

.vehicle-model-viewer__canvas {
    display: block;
    width: 100%;
    height: 100%;
}

.vehicle-model-viewer__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.88);
    font-size: 13px;
    letter-spacing: 0.04em;
    background: rgba(6, 12, 20, 0.38);
    backdrop-filter: blur(6px);
}

.vehicle-model-viewer__overlay--error {
    color: #ffb4b4;
}
</style>
