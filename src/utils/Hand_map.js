import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import pano_data from "../assets/json/pano_data.json";

const handMapModel = "/models/cutout_map1.glb";
let map = null;
let pano_loco_anchor_parent = null;
let pointer = null;

function loadMap(url) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        map = gltf.scene.getObjectByName("model_anchor");
        map.rotation.y = THREE.MathUtils.degToRad(180);
        map.rotation.x = THREE.MathUtils.degToRad(90);

        pano_loco_anchor_parent = map.getObjectByName(
          "pano_loco_anchor_parent",
        );

        console.log("Loaded GLTF model:", gltf);
        pointer = map.getObjectByName("pointer");

        console.log("Pointer object:", pointer);

        pointer.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0xff0000,
              metalness: 1,
              roughness: 0.5,
            });
          }
        });

        resolve(map);
      },
      undefined,
      (error) => {
        reject(error);
      },
    );
  });
}

function positionPointer(panoID) {
  const indi_pano_data = pano_data.find((pano) => pano.id === panoID);
  console.log(
    "Positioning pointer for pano ID:",
    panoID,
    "with data:",
    indi_pano_data,
  );
  if (indi_pano_data) {
    console.log("Found pano_loco_anchor_parent:", pano_loco_anchor_parent);
    if (pano_loco_anchor_parent) {
      const currentAnchor = pano_loco_anchor_parent.children.find(
        (child) => child.name === indi_pano_data.loc_tag,
      );

      console.log("Current anchor for pano ID:", panoID, currentAnchor);

      if (currentAnchor && pointer) {
        // pointer.position.copy(
        //   currentAnchor.localToWorld(currentAnchor.position),
        // );
        pointer.position.copy(currentAnchor.position);
      }
    }
  }
}

function rotatePointer(camQuat, currentPanorama) {
  if (pointer) {
    const indi_pano_data = pano_data.find(
      (pano) => pano.id === currentPanorama,
    );
    // console.log(indi_pano_data);

    const euler = new THREE.Euler();
    euler.setFromQuaternion(camQuat, "YXZ");

    const yaw = euler.y;
    pointer.rotation.set(0, THREE.MathUtils.degToRad(220) + yaw, 0);
    // map.rotation.y = (angle + THREE.MathUtils.degToRad(180)) * -1; //indi_pano_data.rot[1];
    // pointer.rotation.y = -angle; //-indi_pano_data.rot[1];
  }
}

export default function HandMap(parent) {
  loadMap(handMapModel).then((model) => {
    // model.rotateX(Math.PI / 2);
    model.scale.set(1.25, 1.25, 1.25);
    model.position.set(0.1, 0.4, -0.2);
    // model.rotation.set(Math.PI / 2, 0, 0);
    parent.add(model);

    positionPointer(1);
  });
}

export { positionPointer, rotatePointer };
