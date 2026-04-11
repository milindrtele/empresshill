import * as THREE from "three";
import ThreeMeshUI from "three-mesh-ui";
import SnakeImage from "/images/spiny_bush_viper.jpg";
import LivingMenu from "/images/LivingMenu.png";
import KitchenMenu from "/images/KitchenMenu.png";
import BalconyMenu from "/images/BalconyMenu.png";
import BathroomMenu from "/images/BathroomMenu.png";
import Bed01Menu from "/images/Bed01Menu.png";
import Bed02Menu from "/images/Bed02Menu.png";
import Floor_Plan from "/images/Empress_Hill_Floor_Plans_-_Wing_B-10_cropped.jpg";
import CloseButton from "/images/close.png";

import FontJSON from "/fonts/Roboto-msdf.json?url";
import FontImage from "/fonts/Roboto-msdf.png";

import pano_data from "../assets/json/pano_data.json";

let closeButton;
let container;
let imageBlock;
let leftSubBlock;

const roomMenuMap = {
  Living: { main: LivingMenu, sub: Floor_Plan },
  Kitchen: { main: KitchenMenu, sub: Floor_Plan },
  Balcony: { main: BalconyMenu, sub: Floor_Plan },
  Bathroom: { main: BathroomMenu, sub: Floor_Plan },
  Bed01: { main: Bed01Menu, sub: Floor_Plan },
  Bed02: { main: Bed02Menu, sub: Floor_Plan },
};

function makeTextPanel(parent) {
  container = new ThreeMeshUI.Block({
    ref: "container",
    padding: 0.025,
    fontFamily: FontJSON,
    fontTexture: FontImage,
    fontColor: new THREE.Color(0xffffff),
    backgroundOpacity: 0,
    contentDirection: "row",
  });

  container.position.set(0, 0, -1.8);
  container.rotation.x = 0;
  parent.add(container);

  //

  //   const title = new ThreeMeshUI.Block({
  //     height: 0.2,
  //     width: 1.5,
  //     margin: 0.025,
  //     justifyContent: "center",
  //     fontSize: 0.09,
  //   });

  //   title.add(
  //     new ThreeMeshUI.Text({
  //       content: "spiny bush viper",
  //     }),
  //   );

  //   container.add(title);

  //

  leftSubBlock = new ThreeMeshUI.Block({
    height: 1,
    width: 1.76,
    margin: 0.025,
    padding: 0.025,
    textAlign: "left",
    justifyContent: "end",
    alignItems: "end",
  });

  imageBlock = new ThreeMeshUI.Block({
    height: 0.5,
    width: 0.5,
    margin: 0.025,
    rightMargin: 0.5,
    backgroundOpacity: 1,
    color: new THREE.Color(0xffffff),
    borderRadius: 0.1,
  });

  imageBlock.position.copy(container.position);
  imageBlock.position.x += 0.4;
  imageBlock.position.y -= 0.2;
  imageBlock.position.z += 0.1;

  parent.add(imageBlock);

  //   const caption = new ThreeMeshUI.Block({
  //     height: 0.07,
  //     width: 0.37,
  //     textAlign: "center",
  //     justifyContent: "center",
  //   });

  //   caption.add(
  //     new ThreeMeshUI.Text({
  //       content: "Mind your fingers",
  //       fontSize: 0.04,
  //     }),
  //   );

  //   leftSubBlock.add(caption);

  //

  //   const rightSubBlock = new ThreeMeshUI.Block({
  //     margin: 0.025,
  //   });

  //   const subSubBlock1 = new ThreeMeshUI.Block({
  //     height: 0.35,
  //     width: 0.5,
  //     margin: 0.025,
  //     padding: 0.02,
  //     fontSize: 0.04,
  //     justifyContent: "center",
  //     backgroundOpacity: 0,
  //   }).add(
  //     new ThreeMeshUI.Text({
  //       content: "Known for its extremely keeled dorsal scales that give it a ",
  //     }),

  //     new ThreeMeshUI.Text({
  //       content: "bristly",
  //       fontColor: new THREE.Color(0x92e66c),
  //     }),

  //     new ThreeMeshUI.Text({
  //       content: " appearance.",
  //     }),
  //   );

  //   const subSubBlock2 = new ThreeMeshUI.Block({
  //     height: 0.53,
  //     width: 0.5,
  //     margin: 0.01,
  //     padding: 0.02,
  //     fontSize: 0.025,
  //     alignItems: "start",
  //     textAlign: "justify",
  //     backgroundOpacity: 0,
  //   }).add(
  //     new ThreeMeshUI.Text({
  //       content:
  //         "The males of this species grow to maximum total length of 73 cm (29 in): body 58 cm (23 in), tail 15 cm (5.9 in). Females grow to a maximum total length of 58 cm (23 in). The males are surprisingly long and slender compared to the females.\nThe head has a short snout, more so in males than in females.\nThe eyes are large and surrounded by 9–16 circumorbital scales. The orbits (eyes) are separated by 7–9 scales.",
  //     }),
  //   );

  //   rightSubBlock.add(subSubBlock1, subSubBlock2);

  //

  const contentContainer = new ThreeMeshUI.Block({
    contentDirection: "row",
    padding: 0.02,
    margin: 0.025,
    backgroundOpacity: 0,
  });

  contentContainer.add(leftSubBlock);
  container.add(contentContainer);

  //

  new THREE.TextureLoader().load(LivingMenu, (texture) => {
    leftSubBlock.set({
      backgroundTexture: texture,
    });
  });

  new THREE.TextureLoader().load(Floor_Plan, (texture) => {
    imageBlock.set({
      backgroundTexture: texture,
    });
  });

  closeButton = new ThreeMeshUI.Block({
    height: 0.2,
    width: 0.2,
    margin: 0.025,
    padding: 0.025,
  });

  closeButton.name = "closeButton";

  closeButton.position.copy(container.position);
  closeButton.position.x += 1.1;
  closeButton.position.y += 0.35;

  parent.add(closeButton);

  new THREE.TextureLoader().load(CloseButton, (texture) => {
    closeButton.set({
      backgroundTexture: texture,
    });
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

  closeButton.setupState({
    state: "selected",
    attributes: selectedAttributes,
    onSet: () => {
      hideInfoUI();
    },
  });

  closeButton.setupState(hoveredStateAttributes);
  closeButton.setupState(idleStateAttributes);

  hideInfoUI();
}

function updateInfoUI(currentPanoID) {
  const roomName = pano_data[currentPanoID].loc_tag;
  if (roomName && roomMenuMap[roomName]) {
    new THREE.TextureLoader().load(roomMenuMap[roomName].main, (texture) => {
      leftSubBlock.set({
        backgroundTexture: texture,
      });
    });
  }

  new THREE.TextureLoader().load(
    roomMenuMap[roomName]?.sub || Floor_Plan,
    (texture) => {
      imageBlock.set({
        backgroundTexture: texture,
      });
    },
  );
}

function hideInfoUI() {
  container.visible = false;
  imageBlock.visible = false;
  closeButton.visible = false;
}

function showInfoUI(currentPanoID) {
  updateInfoUI(currentPanoID);
  container.visible = true;
  imageBlock.visible = true;
  closeButton.visible = true;
}

export default function setupInfoUI(parent) {
  makeTextPanel(parent);
}

export { closeButton, updateInfoUI, hideInfoUI, showInfoUI };
