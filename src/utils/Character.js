import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import vertexShader from "./shaders/greenScreenRemover/vertexShader.glsl?raw";
import fragmentShader from "./shaders/greenScreenRemover/fragmantShader.glsl?raw";

export default class Character {
  constructor(parent) {
    this.parent = parent;
    this.model = null;
    this.loader = new GLTFLoader();

    this.modelUrl = "/models/character_sphere.glb";

    this.loadModel(this.modelUrl);

    this.video = document.getElementById("host_video");
    this.videoTexture = new THREE.VideoTexture(this.video);
  }

  showModel() {
    if (this.model) {
      this.model.visible = true;
      this.video.play();
    }
  }

  hideModel() {
    if (this.model) {
      this.model.visible = false;
      this.video.pause();
    }
  }

  async loadModel(modelUrl) {
    try {
      const gltf = await this.loader.loadAsync(modelUrl);
      this.model = gltf.scene;

      this.hostCharacterParent = this.model.getObjectByName(
        "hostCharacterParent",
      );
      this.semiSphereLeft = this.model.getObjectByName("semiSphereLeft");
      this.semiSphereRight = this.model.getObjectByName("semiSphereRight");

      this.video.addEventListener("canplay", () => {
        this.videoTexture = new THREE.VideoTexture(this.video);
        this.video.play();
      });

      if (this.semiSphereLeft && this.semiSphereRight && this.videoTexture) {
        // this.hostCharacterParent.rotation.y = Math.PI / 2; // Rotate the parent to flip the character
        this.parent.add(this.model);
        this.semiSphereLeft.layers.set(1);

        this.semiSphereRight.layers.set(2);

        let chromakeyMaterial1 = new THREE.ShaderMaterial({
          transparent: true,
          uniforms: {
            map: { value: this.videoTexture },
            keyColor: { value: [0.0, 1.0, 0.0] },
            similarity: { value: 0.5 }, //0.74
            smoothness: { value: 0.0 },
          },
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
        });
        chromakeyMaterial1.side = THREE.DoubleSide; //show both sides of the material
        chromakeyMaterial1.transparent = true;
        let chromakeyMaterial2 = chromakeyMaterial1.clone();

        this.semiSphereLeft.material = chromakeyMaterial1;
        this.semiSphereRight.material = chromakeyMaterial2;

        // console.log("Model loaded and materials applied.");
        // console.log(this.semiSphereLeft.material);
      }

      this.hideModel(); // Hide the model initially
    } catch (error) {
      console.error("Error loading model:", error);
    }
  }
}
