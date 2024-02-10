<template>
	<div ref="container" class="spinningGlobeContainer">
		<!-- <div class="globeIndent"></div> -->
		<canvas ref="canvas" class="canvas" :style="{ 'width': '100%' }"></canvas>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import { stores } from '../../Objects/Stores';
import ThreeGlobe from "three-globe";
import { WebGLRenderer, Scene } from "three";
import
{
	PerspectiveCamera,
	AmbientLight,
	DirectionalLight,
	Color,
	Fog,
	// AxesHelper,
	// DirectionalLightHelper,
	// CameraHelper,
	PointLight,
	SphereGeometry,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createGlowMesh } from "three-glow-mesh";
import countries from "../../assets/Files/globe-data-min.json";
// import travelHistory from "./files/my-flights.json";
// import airportHistory from "./files/my-airports.json";
import * as TWEEN from '@tweenjs/tween.js'
import { RGBColor } from '@renderer/Types/Colors';
import { hexToRgb, mixHexes } from '@renderer/Helpers/ColorHelper';
import GlobalAuthenticationPopup from '../Authentication/GlobalAuthenticationPopup.vue';


var renderer, camera, scene, controls;
let mouseX = 0;
let mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
var Globe;

export default defineComponent({
	name: "SpinningGlobe",
	setup()
	{
		const container: Ref<HTMLElement | null> = ref(null);
		const canvas: Ref<HTMLElement | null> = ref(null);
		const currentColor: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);

		// SECTION Initializing core ThreeJS elements
		function init()
		{
			// Initialize renderer
			renderer = new WebGLRenderer({
				antialias: true,
				canvas: canvas.value,
				alpha: true
			});
			renderer.setPixelRatio(window.devicePixelRatio);
			//renderer.setSize(container.value.getBoundingClientRect().width, container.value.getBoundingClientRect().height);
			// renderer.outputEncoding = THREE.sRGBEncoding;
			// container.value.appendChild(renderer.domElement);

			// Initialize scene, light
			scene = new Scene();
			scene.add(new AmbientLight(0xbbbbbb, 0.3));
			// scene.background = new Color(0x0f111d);

			// Initialize camera, light
			camera = new PerspectiveCamera();
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();

			var dLight = new DirectionalLight(0xffffff, 0.8);
			dLight.position.set(-800, 2000, 400);
			camera.add(dLight);

			var dLight1 = new DirectionalLight(0x7982f6, 1);
			dLight1.position.set(-200, 500, 200);
			camera.add(dLight1);

			var dLight2 = new PointLight(0x8566cc, 0.5);
			dLight2.position.set(-200, 500, 200);
			camera.add(dLight2);

			camera.position.z = 300;
			camera.position.x = 0;
			camera.position.y = 0;

			scene.add(camera);

			// Additional effects
			scene.fog = new Fog(0x535ef3, 400, 2000);

			// Helpers
			// const axesHelper = new AxesHelper(800);
			// scene.add(axesHelper);
			// var helper = new DirectionalLightHelper(dLight);
			// scene.add(helper);
			// var helperCamera = new CameraHelper(dLight.shadow.camera);
			// scene.add(helperCamera);

			// Initialize controls
			controls = new OrbitControls(camera, renderer.domElement);
			controls.enableDamping = true;
			controls.dynamicDampingFactor = 0.01;
			controls.enablePan = false;
			controls.minDistance = 200;
			controls.maxDistance = 500;
			controls.rotateSpeed = 0.4;
			controls.zoomSpeed = 1;
			controls.autoRotate = true;
			controls.autoRotateSpeed = 1;
			controls.enableZoom = false;

			// controls.minPolarAngle = Math.PI / 3.5;
			// controls.maxPolarAngle = Math.PI - Math.PI / 3;

			window.addEventListener("resize", onWindowResize, false);
			document.addEventListener("mousemove", onMouseMove);
		}

		// SECTION Globe
		function initGlobe()
		{
			const N_PATHS = 10;
			const MAX_POINTS_PER_LINE = 10000;
			const MAX_STEP_DEG = 1;
			const MAX_STEP_ALT = 0.015;
			const gData = [...Array(N_PATHS).keys()].map(() =>
			{
				let lat = (Math.random() - 0.5) * 90;
				let lng = (Math.random() - 0.5) * 360;
				let alt = 0;

				return [[lat, lng, alt], ...[...Array(Math.round(Math.random() * MAX_POINTS_PER_LINE)).keys()].map(() =>
				{
					lat += (Math.random() * 2 - 1) * MAX_STEP_DEG;
					lng += (Math.random() * 2 - 1) * MAX_STEP_DEG;
					alt += (Math.random() * 2 - 1) * MAX_STEP_ALT;
					alt = Math.max(0, alt);

					return [lat, lng, alt];
				})];
			});

			const N = 20;
			const arcsData = [...Array(N).keys()].map(() => ({
				startLat: (Math.random() - 0.5) * 180,
				startLng: (Math.random() - 0.5) * 360,
				endLat: (Math.random() - 0.5) * 180,
				endLng: (Math.random() - 0.5) * 360,
				color: [currentColor.value, mixHexes(currentColor.value, "FFFFFF")]
			}));

			// Initialize the Globe
			Globe = new ThreeGlobe({
				waitForGlobeReady: true,
				animateIn: true,
			})
				.hexPolygonsData(countries.features)
				.hexPolygonResolution(3)
				.hexPolygonMargin(0.1)
				.showAtmosphere(true)
				.atmosphereColor(mixHexes(currentColor.value, "FFFFFF"))
				.atmosphereAltitude(0.3)
				.hexPolygonColor((e) =>
				{
					return currentColor.value;
				})
				.hexPolygonAltitude(0.1)
				// .pathsData(gData)
				// .pathColor(() => ['rgba(0,0,255,0.6)', 'rgba(255,0,0,0.6)'])
				// .pathDashLength(0.01)
				// .pathDashGap(0.004)
				// .pathDashAnimateTime(100000);
				.arcsData(arcsData)
				.arcColor('color')
				.arcDashLength(() => Math.random())
				.arcDashGap(() => Math.random())
				.arcDashAnimateTime(() => Math.random() * 4000 + 500)
			// .polygonCapColor(feat => 'rgba(200, 0, 0, 0.6)')
			// .polygonSideColor(() => 'rgba(0, 100, 0, 0.05)')
			// .polygonsData(countries.features)
			// .polygonsTransitionDuration(4000)

			// NOTE Arc animations are followed after the globe enters the scene
			// setTimeout(() =>
			// {
			// 	Globe.arcsData(travelHistory.flights)
			// 		.arcColor((e) =>
			// 		{
			// 			return e.status ? "#9cff00" : "#FF4000";
			// 		})
			// 		.arcAltitude((e) =>
			// 		{
			// 			return e.arcAlt;
			// 		})
			// 		.arcStroke((e) =>
			// 		{
			// 			return e.status ? 0.5 : 0.3;
			// 		})
			// 		.arcDashLength(0.9)
			// 		.arcDashGap(4)
			// 		.arcDashAnimateTime(1000)
			// 		.arcsTransitionDuration(1000)
			// 		.arcDashInitialGap((e) => e.order * 1)
			// 		.labelsData(airportHistory.airports)
			// 		.labelColor(() => "#ffcb21")
			// 		.labelDotOrientation((e) =>
			// 		{
			// 			return e.text === "ALA" ? "top" : "right";
			// 		})
			// 		.labelDotRadius(0.3)
			// 		.labelSize((e) => e.size)
			// 		.labelText("city")
			// 		.labelResolution(6)
			// 		.labelAltitude(0.01)
			// 		.pointsData(airportHistory.airports)
			// 		.pointColor(() => "#ffffff")
			// 		.pointsMerge(true)
			// 		.pointAltitude(0.07)
			// 		.pointRadius(0.05);
			// }, 1000);

			// Globe.rotateY(-Math.PI * (5 / 9));
			// Globe.rotateZ(-Math.PI / 6);
			const globeMaterial = Globe.globeMaterial();
			globeMaterial.color = new Color('#0b0b0b');
			// globeMaterial.transparent = true;
			// globeMaterial.opacity = 0;
			globeMaterial.emissive = new Color(0x220038);
			globeMaterial.emissiveIntensity = 0;
			globeMaterial.shininess = 1;

			// NOTE Cool stuff
			// globeMaterial.wireframe = true;

			scene.add(Globe);
		}

		function onMouseMove(event)
		{
			mouseX = event.clientX - windowHalfX;
			mouseY = event.clientY - windowHalfY;
			// console.log("x: " + mouseX + " y: " + mouseY);
		}

		function onWindowResize()
		{
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			windowHalfX = window.innerWidth / 1.5;
			windowHalfY = window.innerHeight / 1.5;
			//renderer.setSize(window.innerWidth, window.innerHeight);
		}

		function animate()
		{
			// camera.position.x +=
			// 	Math.abs(mouseX) <= windowHalfX / 2
			// 		? (mouseX / 2 - camera.position.x) * 0.005
			// 		: 0;
			// camera.position.y += (-mouseY / 2 - camera.position.y) * 0.005;
			camera.lookAt(scene.position);
			controls.update();
			renderer.render(scene, camera);
			requestAnimationFrame(animate);
		}

		onMounted(() =>
		{
			init();
			initGlobe();
			onWindowResize();
			animate();
		});

		let tween: any;
		let colorObject: RGBColor | null = hexToRgb(currentColor.value);
		watch(() => stores.settingsStore.currentPrimaryColor.value, (newValue) =>
		{
			if (!colorObject)
			{
				return;
			}

			const newRGB: RGBColor | null = hexToRgb(newValue);
			if (!newRGB)
			{
				return;
			}

			tween = new TWEEN.Tween(colorObject).to(newRGB, 1000).onUpdate((object) =>
			{
				Globe.hexPolygonColor(() => `rgb(${Math.round(object.r)}, ${Math.round(object.g)}, ${Math.round(object.b)})`);
			});

			tween.start();
			TWEEN.update();

			colorObject = hexToRgb(newValue);
			Globe.atmosphereColor(mixHexes(newValue, "FFFFFF"))
		});

		return {
			container,
			canvas
		}
	}
})
</script>
<style>
.spinningGlobeContainer {
	position: relative;
	width: 100%;
	height: 100%;
	z-index: 1;
}

.spinningGlobeContainer .globeIndent {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 60%;
	height: 100%;
	z-index: 1;
	transform: translate(-50%, -50%);
	border-radius: 50%;
	background: #11181e;
	box-shadow: inset 5px 5px 10px #070a0c,
		inset -5px -5px 10px #1b2630;
}

.spinningGlobeContainer .canvas {
	position: relative;
	z-index: 2;
}
</style>
