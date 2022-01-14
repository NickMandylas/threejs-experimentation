import { KeyDisplay } from "./utils";
import { CharacterControls } from "./characterControls";
import * as THREE from "three";
import { CameraHelper } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { io } from "socket.io-client";
import MouseMeshInteraction from "./three_mmi";

const socket = io("localhost:1989");

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.y = 5;
camera.position.z = 5;
camera.position.x = 0;

// INTERACTIVE MESH HANDLER
const mmi = new MouseMeshInteraction(scene, camera);

// RAYCASTING
const raycaster = new THREE.Raycaster();
const sceneMeshes: THREE.Mesh[] = [];
let intersects: THREE.Intersection[] = [];
const dir = new THREE.Vector3();

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.minDistance = 3;
orbitControls.maxDistance = 15;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle = Math.PI / 2 + 0.2;

// OBJECT DETECTION
orbitControls.addEventListener("change", function () {
  raycaster.set(
    orbitControls.target,
    dir.subVectors(camera.position, orbitControls.target).normalize()
  );

  intersects = raycaster.intersectObjects(sceneMeshes, false);
  if (intersects.length > 0) {
    if (
      intersects[0].distance < orbitControls.target.distanceTo(camera.position)
    ) {
      camera.position.copy(intersects[0].point);
    }
  }
});

orbitControls.update();

// LIGHTS
light();

// FLOOR
// generateFloor();

// MODEL WITH ANIMATIONS
var characterControls: CharacterControls;
new GLTFLoader().load("models/Soldier.glb", function (gltf) {
  const model = gltf.scene;
  model.traverse(function (object: any) {
    if (object.isMesh) object.castShadow = true;
  });
  scene.add(model);
  model.position.z -= 10;

  const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
  const mixer = new THREE.AnimationMixer(model);
  const animationsMap: Map<string, THREE.AnimationAction> = new Map();
  gltfAnimations
    .filter((a) => a.name != "TPose")
    .forEach((a: THREE.AnimationClip) => {
      animationsMap.set(a.name, mixer.clipAction(a));
    });

  characterControls = new CharacterControls(
    model,
    mixer,
    animationsMap,
    orbitControls,
    camera,
    "Idle"
  );
});

// GALLERY
new GLTFLoader().load("models/FloatingGallery.glb", function (gltf) {
  const model = gltf.scene;
  model.scale.set(40, 40, 40);
  model.position.y += 2.8;
  model.traverse(function (child) {
    sceneMeshes.push(child as THREE.Mesh);
  });
  scene.add(model);
});

// CONTROL KEYS
const keysPressed = {};
const keyDisplayQueue = new KeyDisplay();
document.addEventListener(
  "keydown",
  (event) => {
    keyDisplayQueue.down(event.key);
    if (event.shiftKey && characterControls) {
      characterControls.switchRunToggle();
    } else {
      (keysPressed as any)[event.key.toLowerCase()] = true;
    }
  },
  false
);
document.addEventListener(
  "keyup",
  (event) => {
    keyDisplayQueue.up(event.key);
    (keysPressed as any)[event.key.toLowerCase()] = false;
  },
  false
);

const clock = new THREE.Clock();
// ANIMATE
function animate() {
  let mixerUpdateDelta = clock.getDelta();
  if (characterControls) {
    characterControls.update(mixerUpdateDelta, keysPressed);
  }
  orbitControls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
document.body.appendChild(renderer.domElement);
animate();

// RESIZE HANDLER
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  keyDisplayQueue.updatePosition();
}
window.addEventListener("resize", onWindowResize);

function generateApe() {
  const textureLoader = new THREE.TextureLoader();
  const placeholder = textureLoader.load("./textures/BAYC.jpg");

  const width = 2;
  const length = 2;

  const geometry = new THREE.PlaneGeometry(width, length, 512, 512);
  const material = new THREE.MeshPhongMaterial({ map: placeholder });

  const ape = new THREE.Mesh(geometry, material);
  ape.position.y += 2.5;
  ape.position.x += 7.5;
  ape.position.z -= 2.85;
  ape.scale.set(0.6, 0.6, 0.6);
  ape.rotateY(-Math.PI / 2);
  ape.name = "APE_TEST";

  scene.add(ape);
}

mmi.addHandler("APE_TEST", "click", function (mesh) {
  console.log("interactable mesh has been clicked!");
  console.log(mesh);
  alert("HELLO");
});

function generateApe2() {
  const textureLoader = new THREE.TextureLoader();
  const placeholder = textureLoader.load("./textures/BAYC2.png");

  const width = 2;
  const length = 2;

  const geometry = new THREE.PlaneGeometry(width, length, 512, 512);
  const material = new THREE.MeshPhongMaterial({ map: placeholder });

  const ape = new THREE.Mesh(geometry, material);
  ape.position.y += 2.5;
  ape.position.x += 7.5;
  ape.position.z += 4.85;
  ape.scale.set(0.6, 0.6, 0.6);
  ape.rotateY(-Math.PI / 2);

  scene.add(ape);
}

generateApe();
generateApe2();

let id;
let clients = new Object();

//On connection server sends the client his ID
socket.on("introduction", (_id, _clientNum, _ids) => {
  for (let i = 0; i < _ids.length; i++) {
    if (_ids[i] != _id) {
      clients[_ids[i]] = {
        mesh: new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshNormalMaterial()
        ),
      };

      //Add initial users to the scene
      scene.add(clients[_ids[i]].mesh);
    }
  }

  console.log(clients);

  id = _id;
  console.log("My ID is: " + id);
});

socket.on("newUserConnected", (clientCount, _id, _ids) => {
  console.log(clientCount + " clients connected");
  let alreadyHasUser = false;
  for (let i = 0; i < Object.keys(clients).length; i++) {
    if (Object.keys(clients)[i] == _id) {
      alreadyHasUser = true;
      break;
    }
  }
  if (_id != id && !alreadyHasUser) {
    console.log("A new user connected with the id: " + _id);
    clients[_id] = {
      mesh: new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshNormalMaterial()
      ),
    };

    //Add initial users to the scene
    scene.add(clients[_id].mesh);
  }
});

socket.on("userDisconnected", (clientCount, _id, _ids) => {
  //Update the data from the server
  document.getElementById("numUsers").textContent = clientCount;

  if (_id != id) {
    console.log("A user disconnected with the id: " + _id);
    scene.remove(clients[_id].mesh);
    delete clients[_id];
  }
});

socket.on("connect", () => {});

//Update when one of the users moves in space
socket.on("userPositions", (_clientProps) => {
  // console.log('Positions of all users are ', _clientProps, id);
  // console.log(Object.keys(_clientProps)[0] == id);
  for (let i = 0; i < Object.keys(_clientProps).length; i++) {
    if (Object.keys(_clientProps)[i] != id) {
      //Store the values
      let oldPos = clients[Object.keys(_clientProps)[i]].mesh.position;
      let newPos = _clientProps[Object.keys(_clientProps)[i]].position;

      //Create a vector 3 and lerp the new values with the old values
      let lerpedPos = new THREE.Vector3();
      lerpedPos.x = THREE.MathUtils.lerp(oldPos.x, newPos[0], 0.3);
      lerpedPos.y = THREE.MathUtils.lerp(oldPos.y, newPos[1], 0.3);
      lerpedPos.z = THREE.MathUtils.lerp(oldPos.z, newPos[2], 0.3);

      //Set the position
      clients[Object.keys(_clientProps)[i]].mesh.position.set(
        lerpedPos.x,
        lerpedPos.y,
        lerpedPos.z
      );
    }
  }
});

// function generateFloor() {
//   // TEXTURES
//   const textureLoader = new THREE.TextureLoader();
//   const placeholder = textureLoader.load(
//     "./textures/placeholder/placeholder.png"
//   );
//   const sandBaseColor = textureLoader.load(
//     "./textures/sand/Sand 002_COLOR.jpg"
//   );
//   const sandNormalMap = textureLoader.load("./textures/sand/Sand 002_NRM.jpg");
//   const sandHeightMap = textureLoader.load("./textures/sand/Sand 002_DISP.jpg");
//   const sandAmbientOcclusion = textureLoader.load(
//     "./textures/sand/Sand 002_OCC.jpg"
//   );

//   const WIDTH = 4;
//   const LENGTH = 4;
//   const NUM_X = 15;
//   const NUM_Z = 15;

//   const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
//   const material = new THREE.MeshStandardMaterial({
//     map: sandBaseColor,
//     normalMap: sandNormalMap,
//     displacementMap: sandHeightMap,
//     displacementScale: 0.1,
//     aoMap: sandAmbientOcclusion,
//   });
//   // const material = new THREE.MeshPhongMaterial({ map: placeholder})
// }

function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(-60, 400, -10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  scene.add(dirLight);
  // scene.add( new THREE.CameraHelper(dirLight.shadow.camera))
}
