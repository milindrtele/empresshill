/*
	Job: creating the VR controllers and their pointers
*/

import * as THREE from "three";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";

export default function VRControl(renderer, camera, scene) {
  const controllers = [];
  const controllerGrips = [];

  const controllerModelFactory = new XRControllerModelFactory();

  const _origin = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _control = new THREE.Vector3();
  const _end = new THREE.Vector3();
  const _mat = new THREE.Matrix4();

  let pointerRing = null;

  let normalPointerLine = null;

  // Define CURVE_SEGMENTS before it's used in updateRightControllerCurve
  const CURVE_SEGMENTS = 30;

  function updateRightControllerCurve(endWorldPosition) {
    const controller = controllers[1]; // Assuming the right controller is at index 1

    if (!controller || !controller.curvedRay) return;

    const endPos = controller.worldToLocal(endWorldPosition.clone());

    // Origin
    _origin.setFromMatrixPosition(controller.matrixWorld);

    const distance = _origin.distanceTo(endPos);

    // Forward direction
    _mat.identity().extractRotation(controller.matrixWorld);
    _dir
      .set(0, Math.min(distance / 10, 0.5), -1)
      .applyMatrix4(_mat)
      .normalize();

    // Control point (defines initial angle)
    _control.copy(_origin).add(_dir.multiplyScalar(distance * 0.5));

    // console.log(_control);

    // Build curve
    const curve = new THREE.QuadraticBezierCurve3(
      controller.worldToLocal(_origin.clone()),
      controller.worldToLocal(_control.clone()),
      endPos,
      //controller.worldToLocal(endWorldPosition.clone()),
    );

    const points = curve.getPoints(CURVE_SEGMENTS);
    controller.curvedRay.geometry.setFromPoints(points);
  }

  function showRightControllerCurve() {
    const controller = controllers[1]; // Assuming the right controller is at index 1

    if (controller && controller.curvedRay) {
      controller.curvedRay.visible = true;
    }
  }

  function hideRightControllerCurve() {
    const controller = controllers[1]; // Assuming the right controller is at index 1

    if (controller && controller.curvedRay) {
      controller.curvedRay.visible = false;
    }
  }

  const fallback = _origin.clone().add(_dir.multiplyScalar(5));
  updateRightControllerCurve(fallback);

  //////////////////
  // Lines helpers
  //////////////////

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    alphaMap: new THREE.CanvasTexture(generateRayTexture()),
    transparent: true,
  });

  const geometry = new THREE.BoxGeometry(0.004, 0.004, 0.35);

  geometry.translate(0, 0, -0.15);

  const uvAttribute = geometry.attributes.uv;

  for (let i = 0; i < uvAttribute.count; i++) {
    let u = uvAttribute.getX(i);
    let v = uvAttribute.getY(i);

    [u, v] = (() => {
      switch (i) {
        case 0:
          return [1, 1];
        case 1:
          return [0, 0];
        case 2:
          return [1, 1];
        case 3:
          return [0, 0];
        case 4:
          return [0, 0];
        case 5:
          return [1, 1];
        case 6:
          return [0, 0];
        case 7:
          return [1, 1];
        case 8:
          return [0, 0];
        case 9:
          return [0, 0];
        case 10:
          return [1, 1];
        case 11:
          return [1, 1];
        case 12:
          return [1, 1];
        case 13:
          return [1, 1];
        case 14:
          return [0, 0];
        case 15:
          return [0, 0];
        default:
          return [0, 0];
      }
    })();

    uvAttribute.setXY(i, u, v);
  }

  const linesHelper = new THREE.Mesh(geometry, material);
  linesHelper.renderOrder = Infinity;

  /////////////////
  // Point helper
  /////////////////

  const ringGeometry = new THREE.RingGeometry(0.1, 0.08, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
  });

  pointerRing = new THREE.Mesh(ringGeometry, ringMaterial);
  pointerRing.renderOrder = Infinity;
  scene.add(pointerRing);

  ////////////////////////
  // Curved ray (RIGHT)
  ////////////////////////

  const curveGeometry = new THREE.BufferGeometry();
  const curveMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
  });

  const curvedRay = new THREE.Line(curveGeometry, curveMaterial);
  curvedRay.renderOrder = Infinity;

  ////////////////
  // Controllers
  ////////////////

  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);

  controller1.name = "controller-left";
  controller2.name = "controller-right";

  const controllerGrip1 = renderer.xr.getControllerGrip(0);
  const controllerGrip2 = renderer.xr.getControllerGrip(1);

  if (controller1) controllers.push(controller1);
  if (controller2) controllers.push(controller2);

  if (controllerGrip1) controllerGrips.push(controllerGrip1);
  if (controllerGrip2) controllerGrips.push(controllerGrip2);

  controllers.forEach((controller) => {
    // console.log(controller.name);

    // LEFT controller → keep straight ray
    if (controller.name === "controller-left") {
      const ray = linesHelper.clone();
      controller.add(ray);
      controller.ray = ray;
    }

    // RIGHT controller → curved ray
    if (controller.name === "controller-right") {
      const ray = linesHelper.clone();
      // controller.add(curvedRay);
      controller.add(ray);
      controller.ray = ray;
      // controller.curvedRay = curvedRay;
    }
  });

  controllerGrips.forEach((controllerGrip) => {
    controllerGrip.add(
      controllerModelFactory.createControllerModel(controllerGrip),
    );
  });

  //////////////
  // Functions
  ////////////////

  const dummyMatrix = new THREE.Matrix4();

  // Set the passed ray to match the given controller pointing direction

  function setFromController(controllerID, ray) {
    const controller = controllers[controllerID];

    // Position the intersection ray

    dummyMatrix.identity().extractRotation(controller.matrixWorld);

    ray.origin.setFromMatrixPosition(controller.matrixWorld);
    ray.direction.set(0, 0, -1).applyMatrix4(dummyMatrix);
  }

  // Position the chosen controller's pointer at the given point in space.
  // Should be called after raycaster.intersectObject() found an intersection point.

  function setPointerAt(hit) {
    const worldPoint = hit.point.clone();

    // compute surface normal in world space
    let normal = new THREE.Vector3(0, 0, -1);
    if (hit.face && hit.object) {
      const n = hit.face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(
        hit.object.matrixWorld,
      );
      n.applyMatrix3(normalMatrix).normalize();
      normal.copy(n);
    } else {
      // fallback: use ray direction (pointing out from controller)
      normal.copy(this.raycaster.ray.direction).negate();
    }

    // orient ring so its +Z matches the surface normal
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal,
    );

    // position ring slightly above the surface to avoid z-fighting
    const offset = normal.clone().multiplyScalar(0.001);
    const finalPosition = worldPoint.clone().add(offset);

    pointerRing.position.copy(finalPosition);
    pointerRing.quaternion.copy(quat);
    pointerRing.visible = true;

    pointerRing.matrixAutoUpdate = true;

    // console.log("Pointer set at:", finalPosition);
  }

  //

  return {
    controllers,
    controllerGrips,
    setFromController,
    setPointerAt,
    updateRightControllerCurve,
    hideRightControllerCurve,
    showRightControllerCurve,
  };
}

//////////////////////////////
// CANVAS TEXTURE GENERATION
//////////////////////////////

// Generate the texture needed to make the intersection ray fade away

function generateRayTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 64, 0);
  gradient.addColorStop(0, "black");
  gradient.addColorStop(1, "white");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  return canvas;
}

// Generate the texture of the point helper sprite

function generatePointerTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext("2d");

  ctx.beginPath();
  ctx.arc(32, 32, 29, 0, 2 * Math.PI);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "white";
  ctx.fill();

  return canvas;
}
