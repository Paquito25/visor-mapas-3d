import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controls;
let currentModel = null;
let currentTargetY = 12;
let currentViewDistance = 160;

const viewer = document.getElementById("viewer");
const areaSelect = document.getElementById("areaSelect");
const gasSelect = document.getElementById("gasSelect");
const legendImage = document.getElementById("legendImage");

const resetBtn = document.getElementById("resetBtn");
const isoBtn = document.getElementById("isoBtn");
const topBtn = document.getElementById("topBtn");
const frontBtn = document.getElementById("frontBtn");
const saveBtn = document.getElementById("saveBtn");

const loader = new GLTFLoader();

init();
loadModel();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111214);

    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        10000
    );
    camera.position.set(95, 70, 160);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    viewer.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.target.set(0, currentTargetY, 0);
    controls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.45);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.15);
    dirLight1.position.set(220, 300, 220);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.75);
    dirLight2.position.set(-220, 160, -180);
    scene.add(dirLight2);

    areaSelect.addEventListener("change", loadModel);
    gasSelect.addEventListener("change", loadModel);
    resetBtn.addEventListener("click", resetView);
    isoBtn.addEventListener("click", setIsometricView);
    topBtn.addEventListener("click", setTopView);
    frontBtn.addEventListener("click", setFrontView);
    saveBtn.addEventListener("click", saveScreenshot);
    window.addEventListener("resize", onWindowResize);

    animate();
}

function getModelPath() {
    const area = areaSelect.value;
    const gas = gasSelect.value;
    return `assets/models/${area}/${gas}_2025_textured.glb`;
}

function getLegendPath() {
    const area = areaSelect.value;
    const gas = gasSelect.value;
    return `assets/legends/${area}/${gas}_2025_legend.png`;
}

function clearCurrentModel() {
    if (!currentModel) return;

    scene.remove(currentModel);

    currentModel.traverse((child) => {
        if (child.isMesh) {
            if (child.geometry) {
                child.geometry.dispose();
            }

            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(disposeMaterial);
                } else {
                    disposeMaterial(child.material);
                }
            }
        }
    });

    currentModel = null;
}

function disposeMaterial(material) {
    if (!material) return;

    for (const key in material) {
        const value = material[key];
        if (value && value.isTexture) {
            value.dispose();
        }
    }

    material.dispose();
}

function loadModel() {
    const modelPath = getModelPath();
    const legendPath = getLegendPath();

    clearCurrentModel();
    legendImage.src = legendPath;

    console.log("Loading model:", modelPath);
    console.log("Loading legend:", legendPath);

    loader.load(
        modelPath,
        (gltf) => {
            currentModel = gltf.scene;

            const box = new THREE.Box3().setFromObject(currentModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            currentModel.position.x -= center.x;
            currentModel.position.y -= center.y;
            currentModel.position.z -= center.z;

            currentModel.position.y += 10;

            const maxDim = Math.max(size.x, size.y, size.z);
            const targetSize = 260;
            const scale = maxDim > 0 ? targetSize / maxDim : 1.0;
            currentModel.scale.setScalar(scale);

            scene.add(currentModel);

            const scaledSize = size.clone().multiplyScalar(scale);
            const maxScaledDim = Math.max(
                scaledSize.x,
                scaledSize.y,
                scaledSize.z
            );

            currentViewDistance = maxScaledDim;
            currentTargetY = 12;

            setIsometricView();
        },
        undefined,
        (error) => {
            console.error("Error loading model:", modelPath, error);
            alert(`Could not load model:\n${modelPath}`);
        }
    );
}

function resetView() {
    setIsometricView();
}

function setIsometricView() {
    const d = currentViewDistance;

    camera.position.set(
        d * 0.55,
        d * 0.42,
        d * 0.95
    );
    controls.target.set(0, currentTargetY, 0);
    controls.update();
}

function setTopView() {
    const d = currentViewDistance;

    camera.position.set(0, d * 1.35, 0.01);
    controls.target.set(0, currentTargetY, 0);
    controls.update();
}

function setFrontView() {
    const d = currentViewDistance;

    camera.position.set(0, d * 0.18, d * 1.25);
    controls.target.set(0, currentTargetY, 0);
    controls.update();
}

function saveScreenshot() {
    renderer.render(scene, camera);

    const link = document.createElement("a");
    link.download = `map_${areaSelect.value}_${gasSelect.value}.png`;
    link.href = renderer.domElement.toDataURL("image/png");
    link.click();
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}