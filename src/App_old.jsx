import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import VRControl from "./utils/VRControl.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import ThreeMeshUI from "three-mesh-ui";

import { VRButton } from "three/addons/webxr/VRButton.js";
import "./App.css";

import SnakeImage from "/images/spiny_bush_viper.jpg";
import FontJSON from "/fonts/Roboto-msdf.json?url";
import FontImage from "/fonts/Roboto-msdf.png";

const PANOS = [
  "/textures/equirectangular/1.jpg",
  "/textures/equirectangular/2.jpg",
  "/textures/equirectangular/3.jpg",
  "/textures/equirectangular/4.jpg",
  "/textures/equirectangular/5.jpg",
  "/textures/equirectangular/6.jpg",
  "/textures/equirectangular/7.jpg",
  "/textures/equirectangular/8.jpg",
  "/textures/equirectangular/9.jpg",
  "/textures/equirectangular/10.jpg",
  "/textures/equirectangular/11.jpg",
  "/textures/equirectangular/12.jpg",
  "/textures/equirectangular/13.jpg",
  "/textures/equirectangular/14.jpg",
  "/textures/equirectangular/15.jpg",
  "/textures/equirectangular/16.jpg",
  "/textures/equirectangular/17.jpg",
  "/textures/equirectangular/18.jpg",
  "/textures/equirectangular/19.jpg",
  "/textures/equirectangular/20.jpg",
  "/textures/equirectangular/21.jpg",
  "/textures/equirectangular/22.jpg",
];

export default function VREquirectangularPanorama() {
  const containerRef = useRef(null);

  const rendererRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const sphereRef = useRef();

  const [panoIndex, setPanoIndex] = useState(0);

  const sphereARef = useRef();
  const sphereBRef = useRef();
  const activeSphereRef = useRef("A");

  const vrControlRef = useRef();

  const fadeRef = useRef({
    isFading: false,
    progress: 0,
    duration: 0.6, // seconds
    fromSphere: null,
    toSphere: null,
  });

  const loadingRef = useRef({
    isLoading: false,
    loaders: [], // array of loading indicator objects
  });

  const controllerGripsRef = useRef([]);

  let scene, camera, renderer, controls, vrControl;
  let meshContainer, meshes, currentMesh;
  const objsToTestRef = useRef([]);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  mouse.x = mouse.y = null;
  let selectState = false;

  function showMesh(id) {
    meshes.forEach((mesh, i) => {
      mesh.visible = i === id ? true : false;
    });
  }

  function makePanel(parentObject) {
    // Container block, in which we put the two buttons.
    // We don't define width and height, it will be set automatically from the children's dimensions
    // Note that we set contentDirection: "row-reverse", in order to orient the buttons horizontally

    const cpanelContainer = new ThreeMeshUI.Block({
      justifyContent: "center",
      contentDirection: "row-reverse",
      fontFamily: FontJSON,
      fontTexture: FontImage,
      fontSize: 0.07,
      padding: 0.02,
      borderRadius: 0.11,
    });

    cpanelContainer.position.set(0.1, 0.2, -0.5);
    cpanelContainer.rotation.x = -0.55;
    parentObject.add(cpanelContainer);

    // BUTTONS

    // We start by creating objects containing options that we will use with the two buttons,
    // in order to write less code.

    const buttonOptions = {
      width: 0.4,
      height: 0.15,
      justifyContent: "center",
      offset: 0.05,
      margin: 0.02,
      borderRadius: 0.075,
    };

    // Options for component.setupState().
    // It must contain a 'state' parameter, which you will refer to with component.setState( 'name-of-the-state' ).

    const hoveredStateAttributes = {
      state: "hovered",
      attributes: {
        offset: 0.035,
        backgroundColor: new THREE.Color(0x999999),
        backgroundOpacity: 1,
        fontColor: new THREE.Color(0xffffff),
      },
    };

    const idleStateAttributes = {
      state: "idle",
      attributes: {
        offset: 0.035,
        backgroundColor: new THREE.Color(0x666666),
        backgroundOpacity: 0.3,
        fontColor: new THREE.Color(0xffffff),
      },
    };

    // Buttons creation, with the options objects passed in parameters.

    const buttonNext = new ThreeMeshUI.Block(buttonOptions);
    const buttonPrevious = new ThreeMeshUI.Block(buttonOptions);

    // Add text to buttons

    buttonNext.add(new ThreeMeshUI.Text({ content: "next" }));

    buttonPrevious.add(new ThreeMeshUI.Text({ content: "previous" }));

    // Create states for the buttons.
    // In the loop, we will call component.setState( 'state-name' ) when mouse hover or click

    const selectedAttributes = {
      offset: 0.02,
      backgroundColor: new THREE.Color(0x777777),
      fontColor: new THREE.Color(0x222222),
    };

    buttonNext.setupState({
      state: "selected",
      attributes: selectedAttributes,
      onSet: () => {
        currentMesh = (currentMesh + 1) % 3;
        showMesh(currentMesh);
      },
    });
    buttonNext.setupState(hoveredStateAttributes);
    buttonNext.setupState(idleStateAttributes);

    //

    buttonPrevious.setupState({
      state: "selected",
      attributes: selectedAttributes,
      onSet: () => {
        currentMesh -= 1;
        if (currentMesh < 0) currentMesh = 2;
        showMesh(currentMesh);
      },
    });
    buttonPrevious.setupState(hoveredStateAttributes);
    buttonPrevious.setupState(idleStateAttributes);

    //

    cpanelContainer.add(buttonNext, buttonPrevious);
    objsToTestRef.current.push(buttonNext, buttonPrevious);
  }

  function updateButtons() {
    // Find closest intersecting object

    let intersect;

    if (rendererRef.current.xr.isPresenting) {
      vrControlRef.current.setFromController(0, raycaster.ray);

      intersect = raycast();

      // Position the little white dot at the end of the controller pointing ray
      if (intersect) vrControlRef.current.setPointerAt(0, intersect.point);
    } else if (mouse.x !== null && mouse.y !== null) {
      raycaster.setFromCamera(mouse, camera);

      intersect = raycast();
    }

    // Update targeted button state (if any)

    if (intersect && intersect.object.isUI) {
      if (selectState) {
        // Component.setState internally call component.set with the options you defined in component.setupState
        intersect.object.setState("selected");
      } else {
        // Component.setState internally call component.set with the options you defined in component.setupState
        intersect.object.setState("hovered");
      }
    }

    // Update non-targeted buttons state

    objsToTestRef.current.forEach((obj) => {
      if ((!intersect || obj !== intersect.object) && obj.isUI) {
        // Component.setState internally call component.set with the options you defined in component.setupState
        obj.setState("idle");
      }
    });
  }

  function raycast() {
    return objsToTestRef.current.reduce((closestIntersection, obj) => {
      const intersection = raycaster.intersectObject(obj, true);

      if (!intersection[0]) return closestIntersection;

      if (
        !closestIntersection ||
        intersection[0].distance < closestIntersection.distance
      ) {
        intersection[0].object = obj;

        return intersection[0];
      }

      return closestIntersection;
    }, null);
  }

  /* ---------------- Init ---------------- */
  useEffect(() => {
    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local");
    containerRef.current.appendChild(renderer.domElement);
    containerRef.current.appendChild(VRButton.createButton(renderer));
    rendererRef.current = renderer;

    /* Scene */
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    /* Camera */
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      2000,
    );
    cameraRef.current = camera;

    /* VR Control */
    vrControlRef.current = VRControl(renderer, camera, scene);

    /* light */
    const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 3);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    /* Sphere */
    const geometry = new THREE.SphereGeometry(500, 64, 64);
    geometry.scale(-1, 1, 1);

    // Sphere A (visible)
    const matA = createPanoMaterial(PANOS[panoIndex], 1);
    const sphereA = new THREE.Mesh(geometry, matA);
    sphereA.rotateY((-90 * Math.PI) / 180);
    scene.add(sphereA);
    sphereARef.current = sphereA;

    // Sphere B (hidden)
    const matB = createPanoMaterial(PANOS[panoIndex], 0);
    const sphereB = new THREE.Mesh(geometry, matB);
    sphereB.rotateY((-90 * Math.PI) / 180);
    scene.add(sphereB);
    sphereBRef.current = sphereB;

    /* Controllers */
    /* Controllers */
    const controllerModelFactory = new XRControllerModelFactory();

    const onSelectStart = (event) => {
      const controller = event.target;
      const handedness = controller.userData.handedness;

      if (handedness === "right") {
        setPanoIndex((i) => (i + 1) % PANOS.length);
      }

      if (handedness === "left") {
        setPanoIndex((i) => (i - 1 + PANOS.length) % PANOS.length);
      }
    };

    /* --- Controller 0 --- */
    const controller1 = renderer.xr.getController(0);
    controller1.addEventListener("selectstart", onSelectStart);
    scene.add(controller1);

    const controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(
      controllerModelFactory.createControllerModel(controllerGrip1),
    );
    const loader1 = createLoadingIndicator();
    controllerGrip1.add(loader1);
    scene.add(controllerGrip1);
    controllerGripsRef.current.push(controllerGrip1);
    loadingRef.current.loaders.push(loader1);

    /* --- Controller 1 --- */
    const controller2 = renderer.xr.getController(1);
    controller2.addEventListener("selectstart", onSelectStart);
    scene.add(controller2);

    const controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(
      controllerModelFactory.createControllerModel(controllerGrip2),
    );
    const loader2 = createLoadingIndicator();
    controllerGrip2.add(loader2);
    scene.add(controllerGrip2);
    controllerGripsRef.current.push(controllerGrip2);
    loadingRef.current.loaders.push(loader2);

    makePanel(controller2);

    /* Handedness */
    const onConnected = (event) => {
      event.target.userData.handedness = event.data.handedness;
    };

    controller1.addEventListener("connected", onConnected);
    controller2.addEventListener("connected", onConnected);

    // makeTextPanel();

    /* Resize */
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    /* Loop */
    let lastTime = 0;

    renderer.setAnimationLoop((time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      ThreeMeshUI.update();
      // controls.update();
      updateButtons();

      if (fadeRef.current.isFading) {
        const fade = fadeRef.current;
        fade.progress += delta;

        const t = Math.min(fade.progress / fade.duration, 1);

        fade.fromSphere.material.opacity = 1 - t;
        fade.toSphere.material.opacity = t;

        if (t === 1) fade.isFading = false;
      }

      // Rotate loading indicators
      if (loadingRef.current.isLoading) {
        loadingRef.current.loaders.forEach((loader) => {
          loader.rotation.x += delta * 3; // Rotate at 3 rad/s
        });
      }

      renderer.render(scene, camera);
    });

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.setAnimationLoop(null);
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, []);

  /* ---------------- Switch pano ---------------- */
  useEffect(() => {
    if (!sphereARef.current || !sphereBRef.current) return;

    const fromSphere =
      activeSphereRef.current === "A" ? sphereARef.current : sphereBRef.current;

    const toSphere =
      activeSphereRef.current === "A" ? sphereBRef.current : sphereARef.current;

    // Dispose old material immediately
    const oldMat = toSphere.material;
    if (oldMat?.map) oldMat.map.dispose();
    oldMat?.dispose();

    // Show loading on controllers
    loadingRef.current.isLoading = true;
    loadingRef.current.loaders.forEach((loader) => {
      loader.visible = true;
    });

    // Load next texture with callback when ready
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(PANOS[panoIndex], (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.mapping = THREE.EquirectangularReflectionMapping;

      const newMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });

      toSphere.material = newMat;

      // Capture sphere references for fade (before swapping activeSphere)
      fadeRef.current.fromSphere = fromSphere;
      fadeRef.current.toSphere = toSphere;

      // Start fade only after image is loaded
      fadeRef.current.isFading = true;
      fadeRef.current.progress = 0;

      // Swap active sphere
      activeSphereRef.current = activeSphereRef.current === "A" ? "B" : "A";

      // Hide loading on controllers
      loadingRef.current.isLoading = false;
      loadingRef.current.loaders.forEach((loader) => {
        loader.visible = false;
      });
    });
  }, [panoIndex]);

  return (
    <>
      <div className="background"></div>
      <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
    </>
  );
}

/* ================================================================= */

function createLoadingIndicator() {
  const group = new THREE.Group();
  group.visible = false;
  group.position.z = -0.1; // In front of controller

  // Create a spinning torus
  const torusGeometry = new THREE.TorusGeometry(0.02, 0.008, 16, 32);
  const torusMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  group.add(torus);

  // Add a center dot
  const dotGeometry = new THREE.SphereGeometry(0.004, 8, 8);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
  const dot = new THREE.Mesh(dotGeometry, dotMaterial);
  group.add(dot);

  return group;
}

function createPanoMaterial(url, opacity = 1) {
  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;

  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide,
  });
}
