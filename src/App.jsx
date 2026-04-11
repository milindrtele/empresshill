import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
// import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { VRButton } from "three/addons/webxr/VRButton.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import VRControl from "./utils/VRControl copy.js";
import ThreeMeshUI from "three-mesh-ui";
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import Loader from "./components/Loader";
import "./App.css";

import SnakeImage from "/images/spiny_bush_viper.jpg";
import FontJSON from "/fonts/Roboto-msdf.json?url";
import FontImage from "/fonts/Roboto-msdf.png";

import hotspotData from "./assets/json/hotspots.json";
import panoData from "./assets/json/pano_data.json";

import Character from "./utils/Character.js";
import HandMap from "./utils/Hand_map.js";
import { positionPointer, rotatePointer } from "./utils/Hand_map.js";
import setupInfoUI from "./utils/InfoUI.js";
import { closeButton, updateInfoUI, hideInfoUI, showInfoUI } from "./utils/InfoUI.js";

import Floor_Plan from "/images/Empress_Hill_Floor_Plans_-_Wing_B-10_cropped.jpg";
// import { userData } from "three/tsl";

const pano_base_path = "https://metavian-asset-pull-zone.b-cdn.net/empress_hill_vr/pano_images/stereo"; //"/textures/stereo"; 

const TILES_X = 30;
const TILES_Y = 15;
const RADIUS = 500;

export default function StereoTiledPanorama() {
    const containerRef = useRef(null);
    const ktx2LoaderRef = useRef(null);
    const vrControlRef = useRef();
    const raycaster = new THREE.Raycaster();
    const objsToTestRef = useRef([]);
    // let vrControl = null;
    const mouse = new THREE.Vector2();
    mouse.x = mouse.y = null;
    let selectState = false;
    const rendererRef = useRef();
    const cameraRef = useRef();
    const sceneRef = useRef();
    let meshes = null;
    let currentMesh = 0;
    let currentPanorama = 1; // Track current panorama index
    const leftGroupRef = useRef(null); // Store reference to left group
    const rightGroupRef = useRef(null); // Store reference to right group
    const [isLoading, setIsLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState(0);
    const textureCache = new Map();

    const groundPlaneRef = useRef(null);
    const indicatorRef = useRef(null);
    let activePosHotspotNo = null; // Track currently active hotspot
    let activeInfoHotspotName = null; // Track currently active info hotspot
    let activePosHotspot = null;

    const hotspotParentObjectRef = useRef(null); // Parent object to hold hotspots
    let pos_hotspots = [];
    let info_hotspots = [];

    const humanModelParentRef = useRef(null);
    const humanModelRef = useRef(null);
    const characterParentRef = useRef(null);

    const floatingUIAnchorRef = useRef(null);

    const interactiveElementsRef = useRef([]);

    const infoParentRef = useRef(null);

    // const MAX_CONCURRENT_TEXTURE_LOADS = 6;
    // let activeTextureLoads = 0;
    // const textureLoadQueue = [];

    // function processTextureQueue() {
    //     if (activeTextureLoads >= MAX_CONCURRENT_TEXTURE_LOADS || textureLoadQueue.length === 0) return;
    //     activeTextureLoads++;
    //     const next = textureLoadQueue.shift();
    //     next().finally(() => {
    //         activeTextureLoads--;
    //         processTextureQueue();
    //     });
    // }

    // function enqueueTextureLoad(fn) {
    //     textureLoadQueue.push(fn);
    //     processTextureQueue();
    // }

    // function loadTextureWithRetry(path, ktx2Loader, retries = 3, delayMs = 250) {
    //     return new Promise((resolve, reject) => {
    //         function attempt(attemptNum) {
    //             ktx2Loader.load(
    //                 path,
    //                 (texture) => resolve(texture),
    //                 undefined,
    //                 (err) => {
    //                     if (attemptNum < retries) {
    //                         setTimeout(() => attempt(attemptNum + 1), delayMs * attemptNum);
    //                     } else {
    //                         reject(err);
    //                     }
    //                 },
    //             );
    //         }
    //         attempt(1);
    //     });
    // }

    // function updateTileTexture(mesh, eye, index, quality, ktx2Loader) {
    //     const currentQuality = mesh.userData.currentQuality;
    //     if (currentQuality === "high" && quality === "low") return;
    //     if (currentQuality === quality) return;

    //     const uv = mesh.geometry.attributes.uv;
    //     const newUVs = quality === "low" ? mesh.userData.lowQualityUVs : mesh.userData.highQualityUVs;

    //     let path;
    //     if (quality === "low") {
    //         path = `${pano_base_path}/pano_${currentPanorama}/low/low.ktx2`;
    //     } else {
    //         const indexShift = eye === "right" ? 450 : 0;
    //         const tileID = (index + indexShift).toString().padStart(2, "0");
    //         path = `${pano_base_path}/pano_${currentPanorama}/high/${eye}/tile_${tileID}_${tileID}.ktx2`;
    //     }

    //     const apply = (texture) => {
    //         texture.wrapS = THREE.ClampToEdgeWrapping;
    //         texture.wrapT = THREE.ClampToEdgeWrapping;
    //         texture.minFilter = THREE.LinearFilter;
    //         texture.colorSpace = THREE.SRGBColorSpace;
    //         mesh.material.map = texture;
    //         mesh.userData.currentQuality = quality;
    //         if (newUVs) { uv.array = newUVs; uv.needsUpdate = true; }
    //         mesh.material.needsUpdate = true;
    //     };

    //     if (textureCache.has(path)) {
    //         apply(textureCache.get(path));
    //         return;
    //     }

    //     enqueueTextureLoad(() => {
    //         return loadTextureWithRetry(path, ktx2Loader, 3, 200)
    //             .then((texture) => {
    //                 textureCache.set(path, texture);
    //                 apply(texture);
    //             })
    //             .catch((err) => {
    //                 console.warn("Texture load failed for", path, err);
    //                 if (quality === "high") {
    //                     // fallback to low quality if high tile fails
    //                     updateTileTexture(mesh, eye, index, "low", ktx2Loader);
    //                 }
    //             });
    //     });
    // }

    // const gui = new GUI();

    // let params = {
    //     pano_rotation: 0,
    // };

    // gui.add(params, 'pano_rotation', 0, 360).onChange(function () {
    //     if (params.pano_rotation) {
    //         if (leftGroupRef.current && rightGroupRef.current) {
    //             leftGroupRef.current.rotation.y = THREE.MathUtils.degToRad(params.pano_rotation);
    //             rightGroupRef.current.rotation.y = THREE.MathUtils.degToRad(params.pano_rotation);

    //             leftGroupRef.current.children.forEach((leftMesh) => {
    //                 leftMesh, userData.direction = null;
    //                 leftMesh.userData.direction.applyAxisAngle(new THREE.Vector3(0, 0, 0), -THREE.MathUtils.degToRad(params.pano_rotation));
    //             });
    //         }
    //     }
    // });
    // gui.open();
    // gui.domElement.style.position = 'absolute';
    // gui.domElement.style.zIndex = '100000';

    // console.log(gui);

    // const testMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const rotatePanorama = () => {
        console.log("calling rotatePanorama with currentPanorama:", currentPanorama);
        if (currentPanorama) {
            const pano_data = panoData.find(
                (pano) => pano.id === currentPanorama,
            );
            console.log(`Rotating panorama to match orientation for panorama ${currentPanorama}`, pano_data.rot);
            if (pano_data) {
                if (leftGroupRef.current && rightGroupRef.current) {
                    // Apply rotation along Y axis
                    const yAxis = new THREE.Vector3(0, 1, 0);
                    const rotationAngle = pano_data.rot[1]; // Convert degrees to radians

                    // console.log(adjustedX);

                    leftGroupRef.current.children.forEach((leftMesh, i) => {
                        leftGroupRef.current.rotation.y = THREE.MathUtils.degToRad(rotationAngle);
                        hotspotParentObjectRef.current.rotation.y = THREE.MathUtils.degToRad(rotationAngle);
                        // Calculate the center point of the tile

                        const midPhi = leftMesh.userData.phiStart + (leftMesh.userData.phiLength / 2) + THREE.MathUtils.degToRad(-rotationAngle);
                        const midTheta = leftMesh.userData.thetaStart + (leftMesh.userData.thetaLength / 2); // + THREE.MathUtils.degToRad(rotationAngle);

                        const newdir = new THREE.Vector3(
                            Math.sin(midTheta) * Math.cos(midPhi),
                            Math.cos(midTheta),
                            Math.sin(midPhi) * Math.sin(midTheta),
                        ).normalize();

                        leftMesh.userData.direction = newdir; // Store for fast lookup


                        // console.log("changed:", i, leftMesh.userData.direction);
                        leftMesh.children.forEach((child) => {
                            leftMesh.remove(child);

                            // child.geometry.dispose();
                            // child.material.dispose();
                            sceneRef.current.remove(child);
                        });

                    });

                    rightGroupRef.current.children.forEach((rightMesh) => {
                        rightGroupRef.current.rotation.y = THREE.MathUtils.degToRad(rotationAngle);
                        // rightMesh.userData.direction.applyAxisAngle(yAxis, -THREE.MathUtils.degToRad(rotationAngle));
                        // Calculate the center point of the tile
                        const midPhi = rightMesh.userData.phiStart + (rightMesh.userData.phiLength / 2) + THREE.MathUtils.degToRad(-rotationAngle);
                        const midTheta = rightMesh.userData.thetaStart + (rightMesh.userData.thetaLength / 2); // + THREE.MathUtils.degToRad(rotationAngle);

                        const newdir = new THREE.Vector3(
                            Math.sin(midTheta) * Math.cos(midPhi),
                            Math.cos(midTheta),
                            Math.sin(midPhi) * Math.sin(midTheta),
                        ).normalize();

                        rightMesh.userData.direction = newdir; // Store for fast lookup
                    });
                }
                if (characterParentRef.current) {
                    // characterParentRef.current.rotateY(pano_data.rot[1]);
                }
            }
        }
    }

    const createHotspots = () => {
        // if (hotspotParentObjectRef.current) {
        //     console.log(hotspotParentObjectRef.current)
        //     hotspotParentObjectRef.current.children.forEach((child) => {
        //         hotspotParentObjectRef.current.remove(child);

        //         child.geometry.dispose();
        //         child.material.dispose();
        //         sceneRef.current.remove(child);
        //     });
        // }
        if (hotspotParentObjectRef.current) {
            // Create a copy of the children array to avoid re-indexing issues
            [...hotspotParentObjectRef.current.children].forEach((child) => {
                // Dispose resources
                child.geometry.dispose();
                child.material.dispose();

                // Remove from the parent group
                hotspotParentObjectRef.current.remove(child);
            });
        }
        pos_hotspots = []; //clear previous hotspots if any
        info_hotspots = []; //clear previous hotspots if any

        const pano_data = hotspotData.find(
            (pano) => pano.id === `pano_${currentPanorama}`,
        );
        // console.log(`Creating hotspots for panorama ${currentPanorama}`, pano_data);
        if (!pano_data) {
            console.warn(`No hotspot data found for panorama ${currentPanorama}`);
            return;
        }

        // Create position hotspots
        pano_data.pos_hotspots.forEach((hotspot) => {
            const ringGeometry = new THREE.RingGeometry(0.1, 0.08, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8,
            });
            const hotspotRing = new THREE.Mesh(ringGeometry, ringMaterial);

            hotspotRing.position.set(
                hotspot.position[0],
                0,//hotspot.position[1],
                hotspot.position[2],
            );
            //const worldTarget = new THREE.Vector3(hotspot.position[0], hotspot.position[1], hotspot.position[2]);
            hotspotRing.rotation.x = (Math.PI / 180) * 90;
            hotspotRing.renderOrder = 10;

            hotspotRing.userData.name = hotspot.target;
            hotspotRing.userData.type = hotspot.type;

            // console.log(`Created hotspot for target panorama ${hotspot.target} at position`, hotspotRing.position);

            hotspotParentObjectRef.current.add(hotspotRing);
        });

        // Create info hotspots
        pano_data.info_hotspots.forEach((hotspot) => {
            // const planeGeo = new THREE.PlaneGeometry(0.2, 0.2);
            // const planeMaterial = new THREE.MeshBasicMaterial({
            //     color: 0xff0000,
            //     side: THREE.DoubleSide,
            //     transparent: true,
            //     opacity: 0.8,
            // });
            // const infospotPlane = new THREE.Mesh(planeGeo, planeMaterial);

            // infospotPlane.position.set(
            //     hotspot.position[0],
            //     1.5,//hotspot.position[1],
            //     hotspot.position[2],
            // );
            // //const worldTarget = new THREE.Vector3(hotspot.position[0], hotspot.position[1], hotspot.position[2]);
            // infospotPlane.rotation.x = (Math.PI / 180) * 0;
            // infospotPlane.renderOrder = 10;

            // infospotPlane.lookAt(0, 0, 0);

            // infospotPlane.userData.name = hotspot.target;
            // infospotPlane.userData.type = hotspot.type;

            // console.log(`Created hotspot for target panorama ${hotspot.target} at position`, infospotPlane.position);

            if (infoParentRef.current) {
                sceneRef.current.remove(infoParentRef.current);
                infoParentRef.current = null;
            }

            infoParentRef.current = new THREE.Object3D();
            sceneRef.current.add(infoParentRef.current);
            infoParentRef.current.position.set(
                hotspot.position[0],
                1.5,//hotspot.position[1],
                hotspot.position[2],
            );
            infoParentRef.current.userData.name = hotspot.target;
            infoParentRef.current.userData.type = hotspot.type;

            const index = interactiveElementsRef.current.indexOf(infoParentRef.current);
            if (index > -1) {
                interactiveElementsRef.current.splice(index, 1);
            }

            createInfoPanelButton(infoParentRef.current);

            // hotspotParentObjectRef.current.add(infoParentRef.current);
            if (infoParentRef.current) {
                console.log(infoParentRef.current);
                interactiveElementsRef.current.push(infoParentRef.current.children[0]); // Assuming the button is the first child of the info parent object
                objsToTestRef.current.push(infoParentRef.current.children[0]);
            }
        });

        rotatePanorama();
        positionPointer(currentPanorama);
        updateInfoUI(currentPanorama);
    };

    const preloadLowQualityImages = (ktx2Loader) => {
        return new Promise((resolve) => {
            const totalPanoramas = 23;
            let loadedPanoramas = 0;
            const MAX_CONCURRENT_LOADS = 10; // Limit concurrent requests for single images
            let activeLoads = 0;
            let panoramaQueue = [];

            // Build queue of all panoramas to load (single combined image per panorama)
            for (let pano = 1; pano <= totalPanoramas; pano++) {
                const path = `${pano_base_path}/pano_${pano}/low/low.ktx2`;
                panoramaQueue.push(path);
            }

            // Process panoramas with concurrency limit
            const loadPanorama = (path) => {
                activeLoads++;

                ktx2Loader.load(
                    path,
                    (texture) => {
                        texture.wrapS = THREE.ClampToEdgeWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        texture.minFilter = THREE.LinearFilter;
                        texture.colorSpace = THREE.SRGBColorSpace;
                        textureCache.set(path, texture);

                        loadedPanoramas++;
                        const progress = loadedPanoramas / totalPanoramas;
                        setLoadProgress(progress);

                        activeLoads--;
                        processNextPanorama();

                        if (loadedPanoramas === totalPanoramas) {
                            setIsLoading(false);
                            resolve();
                        }
                    },
                    undefined,
                    (error) => {
                        console.warn(`Failed to load: ${path}`, error);
                        loadedPanoramas++;
                        const progress = loadedPanoramas / totalPanoramas;
                        setLoadProgress(progress);

                        activeLoads--;
                        processNextPanorama();

                        if (loadedPanoramas === totalPanoramas) {
                            setIsLoading(false);
                            resolve();
                        }
                    },
                );
            };

            const processNextPanorama = () => {
                if (panoramaQueue.length > 0 && activeLoads < MAX_CONCURRENT_LOADS) {
                    const path = panoramaQueue.shift();
                    loadPanorama(path);
                }
            };

            // Start initial batch
            for (
                let i = 0;
                i < Math.min(MAX_CONCURRENT_LOADS, panoramaQueue.length);
                i++
            ) {
                const path = panoramaQueue.shift();
                loadPanorama(path);
            }
        });
    };

    function reloadPanoramaTiles(group, otherGroup, ktx2Loader) {
        // Clear textures from current panorama
        group.children.forEach((mesh) => {
            mesh.material.map = null;
            mesh.userData.currentQuality = null;
            mesh.material.needsUpdate = true;
        });
        otherGroup.children.forEach((mesh) => {
            mesh.material.map = null;
            mesh.userData.currentQuality = null;
            mesh.material.needsUpdate = true;
        });

        // Reload with low quality tiles for the new panorama
        group.children.forEach((mesh, i) => {
            updateTileTexture(
                mesh,
                group === leftGroupRef.current ? "left" : "right",
                i,
                "low",
                ktx2Loader,
            );
        });
        otherGroup.children.forEach((mesh, i) => {
            updateTileTexture(
                mesh,
                group === leftGroupRef.current ? "left" : "right",
                i,
                "low",
                ktx2Loader,
            );
        });
    }

    function updateTileTexture(mesh, eye, index, quality, ktx2Loader) {
        // quality: 'low' or 'high'
        const currentQuality = mesh.userData.currentQuality;
        if (currentQuality === "high" && quality === "low") return; // Don't downgrade
        if (currentQuality === quality) return; // Already there

        const uv = mesh.geometry.attributes.uv;
        // Prepare new UVs but don't mark as updated yet
        let newUVs = null;
        if (quality !== currentQuality) {
            if (quality === "low") {
                newUVs = mesh.userData.lowQualityUVs;
            } else {
                newUVs = mesh.userData.highQualityUVs;
            }
        }

        const applyUVAndTexture = () => {
            // Apply UV update only when texture is ready
            if (newUVs) {
                uv.array = newUVs;
                uv.needsUpdate = true;
            }
            mesh.material.needsUpdate = true;
        };

        if (quality === "low") {
            // For low quality, use single combined image (top-bottom stereo)
            const path = `${pano_base_path}/pano_${currentPanorama}/low/low.ktx2`;

            // Check Cache
            if (textureCache.has(path)) {
                const texture = textureCache.get(path);
                mesh.material.map = texture;
                mesh.userData.currentQuality = quality;
                applyUVAndTexture();

                // console.log(`Loaded from cache: ${path}`);
            } else {
                ktx2Loader.load(path, (texture) => {
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.minFilter = THREE.LinearFilter;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    textureCache.set(path, texture);
                    mesh.material.map = texture;
                    mesh.userData.currentQuality = quality;
                    applyUVAndTexture();
                });

                // console.log(`Loaded from network: ${path}`);
            }
        } else {
            // For high quality, use individual eye tiles
            let indexShift = 0;
            if (eye === "right") {
                indexShift = 450;
            }
            const tileID = index + indexShift;
            const paddedID = tileID.toString().padStart(2, "0");
            const path = `${pano_base_path}/pano_${currentPanorama}/high/${eye}/tile_${paddedID}_${paddedID}.ktx2`;

            // Check Cache
            if (textureCache.has(path)) {
                const texture = textureCache.get(path);
                mesh.material.map = texture;
                mesh.userData.currentQuality = quality;
                applyUVAndTexture();

                // console.log(`Loaded from cache: ${path}`);
            } else {
                ktx2Loader.load(path, (texture) => {
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.minFilter = THREE.LinearFilter;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    textureCache.set(path, texture);
                    mesh.material.map = texture;
                    mesh.userData.currentQuality = quality;
                    applyUVAndTexture();
                });

                // console.log(`Loaded from network: ${path}`);
            }
        }
    }

    function createTiledSphere({ eye }) {
        const group = new THREE.Group();
        const layerToSet = eye === "left" ? 1 : 2;
        const isLeftEye = eye === "left";

        for (let y = 0; y < TILES_Y; y++) {
            for (let x = 0; x < TILES_X; x++) {
                const phiStart = (x / TILES_X) * Math.PI * 2;
                const phiLength = (1 / TILES_X) * Math.PI * 2;

                const thetaStart = (y / TILES_Y) * Math.PI;
                const thetaLength = (1 / TILES_Y) * Math.PI;

                const geometry = new THREE.SphereGeometry(
                    RADIUS,
                    32,
                    32,
                    phiStart,
                    phiLength,
                    thetaStart,
                    thetaLength,
                );

                geometry.scale(-1, 1, 1);

                const uv = geometry.attributes.uv;
                const originalUVs = new Float32Array(uv.array); // Store original UVs

                // Create two sets of UVs
                const lowQualityUVs = new Float32Array(uv.count * 2);
                const highQualityUVs = new Float32Array(uv.count * 2);

                for (let i = 0; i < uv.count; i++) {
                    let u = uv.getX(i);
                    let v = uv.getY(i);

                    // Flip V
                    v = 1 - v;

                    // HIGH QUALITY UV: Full texture space (0-1)
                    highQualityUVs[i * 2] = u;
                    highQualityUVs[i * 2 + 1] = v;

                    // LOW QUALITY UV: Map each tile to its position in the combined texture
                    const tileU = (x + u) / TILES_X;
                    const tileV = (y + v) / TILES_Y;

                    // Offset V by eye: left eye uses top half (0.5-1.0), right eye uses bottom half (0-0.5)
                    const stereoV = isLeftEye ? 0.5 + tileV * 0.5 : tileV * 0.5;

                    lowQualityUVs[i * 2] = tileU;
                    lowQualityUVs[i * 2 + 1] = stereoV;
                }

                // Set initial UVs to low quality (since we start with low quality)
                uv.array = lowQualityUVs;
                uv.needsUpdate = true;

                // Create shader material that can handle both low and high quality
                const material = new THREE.MeshBasicMaterial({
                    side: THREE.FrontSide,
                    map: null,
                });

                const mesh = new THREE.Mesh(geometry, material);

                // Store both UV sets and geometry reference for switching
                mesh.userData.lowQualityUVs = lowQualityUVs;
                mesh.userData.highQualityUVs = highQualityUVs;
                mesh.userData.geometryRef = geometry;

                mesh.userData.phiStart = phiStart;
                mesh.userData.phiLength = phiLength;
                mesh.userData.thetaStart = thetaStart;
                mesh.userData.thetaLength = thetaLength;

                // Calculate the center point of the tile
                const midPhi = phiStart + phiLength / 2;
                const midTheta = thetaStart + thetaLength / 2;

                const dir = new THREE.Vector3(
                    Math.sin(midTheta) * Math.cos(midPhi),
                    Math.cos(midTheta),
                    Math.sin(midPhi) * Math.sin(midTheta),
                ).normalize();

                mesh.userData.direction = dir; // Store for fast lookup
                mesh.userData.isLoaded = false;
                mesh.userData.eye = eye; // Store which eye this is for

                //add a line to represent the direction of the tile normal for debugging
                // const normalHelper = new THREE.ArrowHelper(
                //     dir,
                //     new THREE.Vector3(0, 0, 0),
                //     0.5,
                //     0x00ff00,
                // );
                // mesh.add(normalHelper);

                mesh.layers.set(layerToSet);

                group.add(mesh);
            }
        }

        return group;
    }

    function showMesh(id) {
        meshes.forEach((mesh, i) => {
            mesh.visible = i === id ? true : false;
        });
    }

    function createInfoPanelButton(parent) {
        const infoPanelButton = new ThreeMeshUI.Block({
            justifyContent: "center",
            contentDirection: "row-reverse",
            fontFamily: FontJSON,
            fontTexture: FontImage,
            fontSize: 0.035,
            padding: 0.02,
            height: 0.5,
            width: 0.5,
            margin: 0.025,
            rightMargin: 0.5,
            backgroundOpacity: 1,
            color: new THREE.Color(0xffffff),
            borderRadius: 0.1,
        });

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

        const selectedAttributes = {
            offset: 0.02,
            backgroundColor: new THREE.Color(0x777777),
            fontColor: new THREE.Color(0x222222),
        };

        infoPanelButton.setupState({
            state: "selected",
            attributes: selectedAttributes,
            onSet: () => {
                showInfoUI(currentPanorama);
            },
        });

        infoPanelButton.setupState(hoveredStateAttributes);
        infoPanelButton.setupState(idleStateAttributes);

        new THREE.TextureLoader().load(Floor_Plan, (texture) => {
            infoPanelButton.set({
                backgroundTexture: texture,
            });
        });

        parent.add(infoPanelButton);
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
            fontSize: 0.035,
            padding: 0.02,
            borderRadius: 0.075,
        });

        cpanelContainer.position.set(0.1, 0.1, -0.1);
        cpanelContainer.rotation.x = -0.55;
        parentObject.add(cpanelContainer);

        // BUTTONS

        // We start by creating objects containing options that we will use with the two buttons,
        // in order to write less code.

        const buttonOptions = {
            width: 0.2,
            height: 0.075,
            justifyContent: "center",
            offset: 0.05,
            margin: 0.02,
            borderRadius: 0.035,
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
        // indicatorRef.current = new ThreeMeshUI.Block(buttonOptions);

        // Add text to buttons

        buttonNext.add(new ThreeMeshUI.Text({ content: "next" }));

        buttonPrevious.add(new ThreeMeshUI.Text({ content: "previous" }));

        // indicatorRef.current.add(new ThreeMeshUI.Text({ content: "none" }));

        // console.log(indicatorRef.current);

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
                currentPanorama = (currentPanorama % 23) + 1; // Cycle through pano_1 to pano_23
                reloadPanoramaTiles(
                    leftGroupRef.current,
                    rightGroupRef.current,
                    ktx2LoaderRef.current,
                );

                createHotspots();
            },
        });
        buttonNext.setupState(hoveredStateAttributes);
        buttonNext.setupState(idleStateAttributes);

        //

        buttonPrevious.setupState({
            state: "selected",
            attributes: selectedAttributes,
            onSet: () => {
                currentPanorama = currentPanorama === 1 ? 23 : currentPanorama - 1; // Cycle backwards through pano_23 to pano_1
                reloadPanoramaTiles(
                    leftGroupRef.current,
                    rightGroupRef.current,
                    ktx2LoaderRef.current,
                );
                createHotspots();
            },
        });
        buttonPrevious.setupState(hoveredStateAttributes);
        buttonPrevious.setupState(idleStateAttributes);

        //

        cpanelContainer.add(buttonNext, buttonPrevious);//, indicatorRef.current);
        console.log(...interactiveElementsRef.current);
        objsToTestRef.current.push(buttonNext, buttonPrevious, ...interactiveElementsRef.current);//, indicatorRef.current);

        console.log(objsToTestRef.current);
    }

    function hotspotStatus(pointerPos) {
        if (hotspotParentObjectRef.current && hotspotParentObjectRef.current.children.length > 0) {
            // Determine active hotspot without resetting on every non-matching hotspot.
            let found = null;

            hotspotParentObjectRef.current.children.forEach((hotspot) => {
                const hotspotWorldPos = new THREE.Vector3();
                hotspot.getWorldPosition(hotspotWorldPos);
                if (hotspotWorldPos.distanceTo(pointerPos) < 1.2) {
                    hotspot.material.color = new THREE.Color(0, 0, 1);
                    if (hotspot.userData.type == "position") {
                        if (found === null) {
                            found = parseInt(hotspot.userData.name.split("_")[1]);
                            activePosHotspot = hotspot; // Store reference to the active hotspot

                            // Show human model at this hotspot
                            if (humanModelRef.current != null) {
                                // humanModelRef.current.position.copy(hotspotWorldPos);
                                // humanModelRef.current.position.y -= 1.6; // Adjust height
                                // humanModelRef.current.visible = true;
                                // console.log(`Human model shown at hotspot ${found}, position:`, humanModelRef.current.position);
                            } else {
                                console.warn("Human model not yet loaded");
                            }
                        }
                    } else if (hotspot.userData.type == "info") {
                        // Show info UI for this hotspot
                        activePosHotspotNo = hotspot.userData.name;
                        // updateInfoUI(infoPlaneName);
                    }
                } else {
                    hotspot.material.color = new THREE.Color(1, 0, 0);
                    // found = null; // Reset found if pointer is not within range of this hotspot
                    // activePosHotspotNo = null; // Reset active hotspot number
                }
            });

            // Hide model if no hotspot is active
            if (found === null && humanModelRef.current != null) {
                humanModelRef.current.visible = false;
            }

            activePosHotspotNo = found;

            // if (indicatorRef.current && indicatorRef.current.children[1]) {
            //     indicatorRef.current.children[1].set({ content: activePosHotspotNo ? activePosHotspotNo.toString() : "none" });
            // }
        }
    }

    function updateButtons() {
        // Find closest intersecting object

        if (rendererRef.current == null) return;

        let intersect;

        if (rendererRef.current.xr.isPresenting) {
            vrControlRef.current.setFromController(1, raycaster.ray);

            intersect = raycast();

            // Position the little white dot at the end of the controller pointing ray
            if (intersect) vrControlRef.current.setPointerAt(intersect);

            if (intersect) {
                // console.log("Intersection found with object:", intersect);
                vrControlRef.current.showRightControllerCurve();
                vrControlRef.current.updateRightControllerCurve(intersect.point);

                hotspotStatus(intersect.point);

                // console.log(intersect.point);

                // console.log("Left group rotation (degrees):", (leftGroupRef.current.rotation.y * 180 / Math.PI).toFixed(2));
                //indicatorRef.current.children[1].set({ content: (leftGroupRef.current.rotation.y * 180 / Math.PI).toFixed(2).toString() }); // Update indicator text with intersected object's name
            } else {
                vrControlRef.current.hideRightControllerCurve();
                //indicatorRef.current.children[1].set({ content: "none" }); // Update indicator text with intersected object's name
            }
        } else if (mouse.x !== null && mouse.y !== null) {
            raycaster.setFromCamera(mouse, cameraRef.current);

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
        console.log(objsToTestRef.current);
        return objsToTestRef.current.reduce((closestIntersection, obj) => {

            const intersection = raycaster.intersectObject(obj, true);

            if (!intersection[0]) return closestIntersection;

            if (
                !closestIntersection ||
                intersection[0].distance < closestIntersection.distance
            ) {
                intersection[0].object = obj;
                // console.log("Intersection found with object:", obj);
                return intersection[0];
            }

            return closestIntersection;
        }, null);
    }

    useEffect(() => {
        /* ================= Renderer ================= */
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        rendererRef.current = renderer;
        containerRef.current.appendChild(renderer.domElement);
        containerRef.current.appendChild(VRButton.createButton(renderer));

        // Create custom VR button with 3 DOF constraints
        // const vrButton = VRButton.createButton(renderer);
        // containerRef.current.appendChild(vrButton);

        // // Override session creation to use 'viewer' reference space (3 DOF)
        // vrButton.addEventListener('click', async () => {
        //     try {
        //         const session = await navigator.xr.requestSession('immersive-vr', {
        //             requiredFeatures: ['layers'],
        //             optionalFeatures: ['hand-tracking', 'dom-overlay'],
        //             domOverlay: { root: gui.domElement } // Use the GUI as the DOM overlay root
        //         });
        //         // Use 'viewer' reference space for 3 DOF (rotation only, no position tracking)
        //         const refSpace = await session.requestReferenceSpace('viewer');
        //         renderer.xr.setSession(session, { referenceSpace: refSpace });
        //     } catch (error) {
        //         console.error('XR session request failed:', error);
        //     }
        // });

        /* ================= Scene ================= */
        const scene = new THREE.Scene();

        sceneRef.current = scene;

        floatingUIAnchorRef.current = new THREE.Object3D();
        scene.add(floatingUIAnchorRef.current);

        setupInfoUI(floatingUIAnchorRef.current);
        interactiveElementsRef.current.push(closeButton);

        /* ================= env map ================= */
        const hdrLoader = new HDRLoader();
        const envMap = hdrLoader.load('/images/citrus_orchard_road_puresky_1k.hdr');
        envMap.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = envMap;


        /* ================= Camera ================= */
        cameraRef.current = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            2000,
        );

        /* VR Control */
        vrControlRef.current = VRControl(renderer, cameraRef.current, scene);

        scene.add(
            vrControlRef.current.controllerGrips[0],
            vrControlRef.current.controllers[0],
        );

        HandMap(vrControlRef.current.controllers[0]);

        function setCharacterVisibilityForPanorama() {
            //set character visibility
            console.log(character.model, currentPanorama);
            if (character.model && currentPanorama == 2) { // Show character only in panorama 2 for demo purposes
                character.showModel();

            } else {

                character.hideModel();
            }
        }

        vrControlRef.current.controllers[0].addEventListener("selectstart", () => {
            // console.log("Controller 0 selectstart fired!");
            selectState = true;
            if (activePosHotspotNo) {
                console.log(`Selected hotspot for panorama ${activePosHotspotNo}`);
                currentPanorama = activePosHotspotNo;
                reloadPanoramaTiles(
                    leftGroupRef.current,
                    rightGroupRef.current,
                    ktx2LoaderRef.current,
                );
                console.log("Reloaded panorama tiles for panorama", currentPanorama);
                createHotspots();
                // updateInfoUI(currentPanorama); // Update info UI if an info hotspot was active
                showInfoUI(currentPanorama);
                setCharacterVisibilityForPanorama(); // Update character visibility based on new panorama
            } else {
                console.log("active hotspot to select", activePosHotspotNo);
            }
            if (activeInfoHotspotName) { showInfoUI(currentPanorama); }
        });
        vrControlRef.current.controllers[0].addEventListener("selectend", () => {
            selectState = false;
        });

        scene.add(
            vrControlRef.current.controllerGrips[1],
            vrControlRef.current.controllers[1],
        );

        vrControlRef.current.controllers[1].addEventListener("selectstart", () => {
            // console.log("Controller 1 selectstart fired!");
            selectState = true;
            if (activePosHotspotNo) {
                console.log(`Selected hotspot for panorama ${activePosHotspotNo}`);
                currentPanorama = activePosHotspotNo;
                reloadPanoramaTiles(
                    leftGroupRef.current,
                    rightGroupRef.current,
                    ktx2LoaderRef.current,
                );
                createHotspots();

                setCharacterVisibilityForPanorama(); // Update character visibility based on new panorama
            } else {
                console.log("active hotspot to select", activePosHotspotNo);
            }
            if (activeInfoHotspotName) { showInfoUI(currentPanorama); }
        });
        vrControlRef.current.controllers[1].addEventListener("selectend", () => {
            selectState = false;
        });

        /* ================= Hotspot Parent Object ================= */
        hotspotParentObjectRef.current = new THREE.Group();
        hotspotParentObjectRef.current.position.set(0, 0.1, 0);
        scene.add(hotspotParentObjectRef.current);

        /* ================= UI Panel ================= */
        makePanel(vrControlRef.current.controllers[0]);

        /* ================= hemiLight ================= */
        // const light = new THREE.HemisphereLight(0xffffff, 0x444444, 5);
        // light.position.set(0, 200, 0);
        // scene.add(light);

        /* ================= KTX2 Loader ================= */
        ktx2LoaderRef.current = new KTX2Loader()
            .setTranscoderPath("/basis/")
            .detectSupport(renderer);

        // Preload all low quality images
        preloadLowQualityImages(ktx2LoaderRef.current);

        /* ================= Stereo Groups ================= */
        const leftGroup = createTiledSphere({
            eye: "left",
        });
        leftGroupRef.current = leftGroup;
        leftGroup.layers.set(1);
        leftGroup.layers.enable(1);
        leftGroup.layers.disable(2);
        scene.add(leftGroup);

        const rightGroup = createTiledSphere({
            eye: "right",
        });
        rightGroupRef.current = rightGroup;
        rightGroup.layers.set(2);
        rightGroup.layers.enable(2);
        rightGroup.layers.disable(1);
        scene.add(rightGroup);

        leftGroup.children.forEach((mesh, i) => {
            updateTileTexture(mesh, "left", i, "low", ktx2LoaderRef.current);
            updateTileTexture(
                rightGroup.children[i],
                "right",
                i,
                "low",
                ktx2LoaderRef.current,
            );
        });

        rotatePanorama();
        positionPointer(panoData, 1);

        /* ================= Human Model ================= */
        const loader = new GLTFLoader();
        loader.load("/models/tesla_bot_no_texture1_tall.glb", (gltf) => {
            humanModelRef.current = gltf.scene;

            humanModelRef.current.rotation.x = Math.PI / 180 * 0; // Adjust scale as needed
            // humanModelRef.current.position.y = 0; // Adjust scale as needed

            humanModelParentRef.current = new THREE.Object3D();
            humanModelParentRef.current.add(humanModelRef.current);
            humanModelParentRef.current.position.set(0, 0, 0);
            scene.add(humanModelParentRef.current);

            humanModelRef.current.visible = false; // Start hidden, show when needed
            console.log("Human model loaded successfully");
        }, undefined, (error) => {
            console.error("Error loading human model:", error);
        });

        /* ================= Ground plane ================= */
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        // const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
        const groundMaterial = new THREE.MeshBasicMaterial({
            color: 0x222222,
            side: THREE.FrontSide,
            opacity: 0,
            transparent: true,
        });
        groundPlaneRef.current = new THREE.Mesh(groundGeometry, groundMaterial);

        groundPlaneRef.current.position.y = -0.5;
        groundPlaneRef.current.rotation.x = -Math.PI / 2;
        groundPlaneRef.current.receiveShadow = true;
        groundPlaneRef.current.name = "GroundPlane";
        scene.add(groundPlaneRef.current);

        objsToTestRef.current.push(groundPlaneRef.current);

        createHotspots();

        /* ================= Character ================= */
        characterParentRef.current = new THREE.Object3D();
        scene.add(characterParentRef.current);
        const character = new Character(characterParentRef.current);

        characterParentRef.current.rotation.y = THREE.MathUtils.degToRad(20);

        /* ================= Ray Helper Line ================= */
        const rayHelperGeometry = new THREE.BufferGeometry();
        const rayHelperPositions = new Float32Array([
            0,
            0,
            0, // Ray origin
            0,
            0,
            -100, // Ray direction (extends 100 units forward)
        ]);
        rayHelperGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(rayHelperPositions, 3),
        );
        const rayHelperMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            linewidth: 3,
        });
        const rayHelperLine = new THREE.Line(rayHelperGeometry, rayHelperMaterial);
        rayHelperLine.name = "RayHelper";
        // scene.add(rayHelperLine);

        /* ================= Resize ================= */
        // const onResize = () => {
        //     camera.aspect = window.innerWidth / window.innerHeight;
        //     camera.updateProjectionMatrix();
        //     renderer.setSize(window.innerWidth, window.innerHeight);
        // };
        // window.addEventListener("resize", onResize);

        const cameraRotationSpeed = 0.01;
        let lastFrameTime = performance.now();

        // Track previous joystick state to detect movement
        const joystickState = {
            prevXAxis: 0,
            prevYAxis: 0,
            deadZone: 0.1,
        };

        const handleJoystickInput = (deltaTime) => {
            const session = renderer.xr.getSession();
            if (!session) return;

            const inputSources = session.inputSources;

            inputSources.forEach((source) => {
                if (source.gamepad && source.gamepad.axes.length >= 4) {
                    const xAxis = source.gamepad.axes[2] || 0;
                    const yAxis = source.gamepad.axes[3] || 0;

                    // Apply deadzone
                    const adjustedX =
                        Math.abs(xAxis) > joystickState.deadZone ? xAxis : 0;
                    const adjustedY =
                        Math.abs(yAxis) > joystickState.deadZone ? yAxis : 0;

                    // Only process if values changed significantly
                    const moveThreshold = 0.01;
                    const xChanged =
                        Math.abs(adjustedX - joystickState.prevXAxis) > moveThreshold;
                    const yChanged =
                        Math.abs(adjustedY - joystickState.prevYAxis) > moveThreshold;

                    if (xChanged || yChanged) {
                        // Update previous state
                        joystickState.prevXAxis = adjustedX;
                        joystickState.prevYAxis = adjustedY;

                        // Apply rotation along Y axis
                        const yAxis = new THREE.Vector3(0, 1, 0);
                        const rotationAngle = adjustedX * cameraRotationSpeed;

                        // console.log(adjustedX);

                        leftGroup.children.forEach((leftMesh) => {
                            leftMesh.rotateOnWorldAxis(yAxis, rotationAngle);
                            hotspotParentObjectRef.current.rotateOnWorldAxis(yAxis, THREE.MathUtils.degToRad(rotationAngle) / (Math.PI * 2.5));
                            characterParentRef.current.rotateOnWorldAxis(yAxis, THREE.MathUtils.degToRad(rotationAngle + 90) / (Math.PI * 2.5));
                            // hotspotParentObjectRef.current.rotation.y += THREE.MathUtils.degToRad(rotationAngle) / 9;
                            // Rotate the cached direction vector by the same amount
                            leftMesh.userData.direction.applyAxisAngle(yAxis, rotationAngle);
                        });
                        rightGroup.children.forEach((rightMesh) => {
                            rightMesh.rotateOnWorldAxis(yAxis, rotationAngle);
                            // Rotate the cached direction vector by the same amount
                            rightMesh.userData.direction.applyAxisAngle(yAxis, rotationAngle);
                        });
                    }
                }
            });
        };

        function positionEverythingRelativeToCamera(xrCamera) {
            //pano spheres
            if (leftGroup && rightGroup) {
                leftGroup.position.copy(xrCamera.cameras[0].position);
                rightGroup.position.copy(xrCamera.cameras[1].position);
            }

            //ground plane
            if (groundPlaneRef.current) {
                groundPlaneRef.current.position.set(
                    groundPlaneRef.current.position.x,
                    xrCamera.cameras[0].position.y - 1.61,
                    groundPlaneRef.current.position.z,
                );
            }

            //hotspots parent
            if (hotspotParentObjectRef.current) {
                hotspotParentObjectRef.current.position.set(xrCamera.cameras[0].position.x,
                    xrCamera.cameras[0].position.y - 1.6,
                    xrCamera.cameras[0].position.z,);
            }

            //human model parent
            // if (humanModelParentRef.current) {
            //     humanModelParentRef.current.position.copy(xrCamera.cameras[0].position);
            // }

            //character parent
            if (character) {
                character.parent.position.copy(xrCamera.cameras[0].position);
            }

            if (floatingUIAnchorRef.current) {
                floatingUIAnchorRef.current.position.copy(xrCamera.cameras[0].position);
            }
        }

        // const testMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        /* ================= Render Loop ================= */
        let cameraVector = new THREE.Vector3();
        let lastCheckTime = 0;
        let time = 0;
        renderer.setAnimationLoop(() => {
            time = performance.now();
            const deltaTime = (time - lastFrameTime) / 1000;
            lastFrameTime = time;
            const xrCamera = renderer.xr.getCamera(cameraRef.current);
            // handleJoystickInput(deltaTime);
            updateButtons();
            ThreeMeshUI.update();

            if (character.videoTexture) {
                // console.log("Updating video texture", character.video.currentTime);
                character.videoTexture.needsUpdate = true;
            }

            if (xrCamera.isArrayCamera) {
                // LEFT EYE
                xrCamera.cameras[0].layers.enable(1);
                xrCamera.cameras[0].layers.disable(2);

                // RIGHT EYE
                xrCamera.cameras[1].layers.enable(2);
                xrCamera.cameras[1].layers.disable(1);

                // xrCamera.cameras[1].position.set(0, 0, 0);
                // xrCamera.cameras[0].position.set(0, 0, 0);
            }

            leftGroupRef.current.children.forEach((mesh, i) => {
                if (i === 250) {
                    cameraRef.current.getWorldDirection(cameraVector);
                    const dot = cameraVector.dot(mesh.userData.direction);
                    // console.log(`Tile ${i} dot product:`, dot);
                }
            });

            // Throttled check (every 250ms is enough for head movement)
            if (time - lastCheckTime > 250) {
                cameraRef.current.getWorldDirection(cameraVector);

                // console.log(leftGroupRef.current.children[0].userData.direction); // Just to ensure the direction vectors are loaded
                leftGroupRef.current.children.forEach((leftMesh, i) => {
                    const dot = cameraVector.dot(leftMesh.userData.direction);


                    if (i === 250) {
                        // console.log(`Tile ${i} dot product:`, dot);
                        // leftMesh.material = testMat; // Temporarily set to red for debugging
                        // //helper line to visualize tile normal
                        // const newdir = leftMesh.userData.direction.clone().multiplyScalar(0.5);
                        // const normalHelper = new THREE.ArrowHelper(
                        //     newdir,
                        //     new THREE.Vector3(0, 0, 0),
                        //     0.5,
                        //     0x00ff00,
                        // );
                        // leftMesh.add(normalHelper);

                        // console.log("mesh direction:", leftMesh.userData.direction);
                        // console.log(`Tile ${i} dot product:`, dot);
                    }

                    // If in FOV, upgrade to High-Res
                    if (dot > 0.6) {
                        const rightMesh = rightGroupRef.current.children[i];

                        //Sync point: We trigger both eyes at the same time
                        updateTileTexture(
                            leftMesh,
                            "left",
                            i,
                            "high",
                            ktx2LoaderRef.current,
                        );
                        updateTileTexture(
                            rightMesh,
                            "right",
                            i,
                            "high",
                            ktx2LoaderRef.current,
                        );
                    }
                });
                lastCheckTime = time;
            }
            const camQuat = xrCamera.cameras[0].quaternion;
            rotatePointer(camQuat, currentPanorama);

            positionEverythingRelativeToCamera(xrCamera);

            renderer.render(scene, cameraRef.current);
        });

        /* ================= Cleanup ================= */
        return () => {
            renderer.setAnimationLoop(null);
            // window.removeEventListener("resize", onResize);
            renderer.dispose();
            if (containerRef.current) containerRef.current.innerHTML = "";
        };
    }, []);

    // return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
    return (
        <>
            <Loader isVisible={isLoading} progress={loadProgress} />
            <div
                className="background"
                style={{ display: isLoading ? "none" : "block" }}
            ></div>
            <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
            <video
                id="host_video"
                autoPlay
                muted
                loop
                // style={{ "display": "none" }}
                playsInline
                src="/video/ZCAM0039_green.mp4"></video >
        </>
    );
}
