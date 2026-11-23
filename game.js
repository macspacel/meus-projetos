// ==========================================
// ZOMBIE HORDE: SURVIVAL
// Motor 3D: Three.js
// Código principal organizado
// ==========================================


// ==========================================
// 1. VARIÁVEIS E CONFIGURAÇÕES
// ==========================================

const container = document.getElementById("game-container");

let scene, camera, renderer, clock;

let weapon, muzzleFlash;
let energyPistol, pistolMuzzleFlash;
let machineGun, machineGunFlash;

let currentWeapon = "machinegun";

let running = false;
let mouseFiring = false;

let zombies = [];
let obstacles = [];
let effects = [];
let keys = {};

let wave = 1;
let kills = 0;
let health = 100;

let fov = 100;
let sound = true;

let yaw = 0;
let pitch = 0;

const NAV_SIZE = 32;
const NAV_ORIGIN = -15.5;

let navigationGrid = [];

let shotCooldown = 0;
let waveDelay = 0;
let messageTimer = 0;

let weaponRecoil = 0;
let flashTimer = 0;
let damageFlash = 0;

let audioContext = null;

const raycaster = new THREE.Raycaster();

const PLAYER_SPEED = 5;
const MAP_SIZE = 32;


// ==========================================
// 2. MATERIAIS
// ==========================================

function material(color, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness
  });
}

const materials = {
  wall: material(0x50565b),
  darkWall: material(0x252d33),
  floor: material(0x343b38),
  metal: material(0x343e48),
  wood: material(0x62462f),
  concrete: material(0x555b59),
  zombie: material(0x526d43),
  zombieDark: material(0x34472e),
  red: material(0xb52e26)
};


// ==========================================
// 3. INICIALIZAÇÃO
// ==========================================

function init() {
  try {
    if (!window.THREE) {
      throw new Error(
        "Não foi possível carregar a biblioteca Three.js. Verifique sua internet."
      );
    }

    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x101820);
    scene.fog = new THREE.Fog(0x101820, 12, 38);

    camera = new THREE.PerspectiveCamera(
      fov,
      innerWidth / innerHeight,
      0.1,
      100
    );

    camera.position.set(0, 1.7, 10);
    camera.rotation.order = "YXZ";

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "low-power"
    });

    renderer.setPixelRatio(
      Math.min(devicePixelRatio, 1.5)
    );

    renderer.setSize(innerWidth, innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    createLighting();
    createMap();
    buildNavigationGrid();

    createWeapon();
    createMachineGun();

    switchWeapon("machinegun");

    addEventListener("resize", resize);

  } catch (error) {
    showError(error.message);
  }
}


// ==========================================
// 4. ILUMINAÇÃO
// ==========================================

function createLighting() {

  const ambient = new THREE.HemisphereLight(
    0x9bb7ca,
    0x25201a,
    1.1
  );

  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(
    0xffffff,
    1.5
  );

  mainLight.position.set(-8, 15, 8);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(512, 512);

  scene.add(mainLight);

  const redLight = new THREE.PointLight(
    0xff3322,
    35,
    12
  );

  redLight.position.set(7, 3, -7);
  scene.add(redLight);

  const blueLight = new THREE.PointLight(
    0x4488ff,
    20,
    10
  );

  blueLight.position.set(-9, 3, 7);
  scene.add(blueLight);
}


// ==========================================
// 5. CRIAÇÃO DE OBJETOS
// ==========================================

function addBox(
  x, y, z,
  sx, sy, sz,
  mat,
  collision = true
) {

  const geometry = new THREE.BoxGeometry(
    sx, sy, sz
  );

  const mesh = new THREE.Mesh(
    geometry,
    mat
  );

  mesh.position.set(x, y, z);

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  scene.add(mesh);

  if (collision) {
    obstacles.push({
      x,
      z,
      sx,
      sz
    });
  }

  return mesh;
}


// ==========================================
// 6. MAPA 3D
// ==========================================

function createMap() {

  // Chão

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(
      MAP_SIZE,
      MAP_SIZE
    ),
    materials.floor
  );

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;

  scene.add(floor);


  // Grade decorativa

  const grid = new THREE.GridHelper(
    MAP_SIZE,
    MAP_SIZE,
    0x555b57,
    0x414743
  );

  grid.position.y = 0.015;

  scene.add(grid);


  // Paredes externas

  const size = MAP_SIZE / 2;
  const wallHeight = 4;

  addBox(
    0, wallHeight / 2, -size,
    MAP_SIZE, wallHeight, 0.6,
    materials.wall
  );

  addBox(
    0, wallHeight / 2, size,
    MAP_SIZE, wallHeight, 0.6,
    materials.wall
  );

  addBox(
    -size, wallHeight / 2, 0,
    0.6, wallHeight, MAP_SIZE,
    materials.wall
  );

  addBox(
    size, wallHeight / 2, 0,
    0.6, wallHeight, MAP_SIZE,
    materials.wall
  );


  // Divisórias internas

  addBox(
    -5, 1.5, -5,
    0.5, 3, 7,
    materials.darkWall
  );

  addBox(
    5, 1.5, -5,
    0.5, 3, 7,
    materials.darkWall
  );

  addBox(
    0, 1.5, -9,
    9, 3, 0.5,
    materials.wall
  );

  addBox(
    -9, 1.5, 4,
    5, 3, 0.5,
    materials.wall
  );

  addBox(
    8, 1.5, 5,
    5, 3, 0.5,
    materials.wall
  );


  // Caixas espalhadas

  addBox(
    -9, 0.8, -9,
    2, 1.6, 2,
    materials.wood
  );

  addBox(
    9, 0.8, -10,
    2, 1.6, 2,
    materials.wood
  );

  addBox(
    -10, 0.8, 10,
    2, 1.6, 2,
    materials.wood
  );

  addBox(
    10, 0.8, 10,
    2, 1.6, 2,
    materials.wood
  );


  // Objetos metálicos

  addBox(
    -7, 0.5, 0,
    2, 1, 1.5,
    materials.metal
  );

  addBox(
    7, 0.5, -1,
    2, 1, 1.5,
    materials.metal
  );


  // Pilares

  for (const x of [-12, 12]) {

    for (const z of [-12, 0, 12]) {

      addBox(
        x, 1.8, z,
        1, 3.6, 1,
        materials.concrete
      );

    }

  }


  // Lâmpadas

  createLamp(-7, 3, -7);
  createLamp(7, 3, 7);
  createLamp(0, 3, -13);


  // Tubulações decorativas

  addBox(
    -3, 3.3, 0,
    5, 0.18, 0.18,
    materials.metal,
    false
  );

  addBox(
    3, 3.3, 0,
    5, 0.18, 0.18,
    materials.metal,
    false
  );


  // Manchas decorativas

  const stainMaterial = new THREE.MeshStandardMaterial({
    color: 0x292d2b,
    roughness: 1
  });

  for (let i = 0; i < 18; i++) {

    const stain = new THREE.Mesh(
      new THREE.CircleGeometry(
        0.2 + Math.random() * 0.5,
        12
      ),
      stainMaterial
    );

    stain.rotation.x = -Math.PI / 2;

    stain.position.set(
      Math.random() * 25 - 12.5,
      0.025,
      Math.random() * 25 - 12.5
    );

    scene.add(stain);
  }

}


// ==========================================
// 7. LÂMPADAS
// ==========================================

function createLamp(x, y, z) {

  const lampMaterial = new THREE.MeshStandardMaterial({
    color: 0xff5544,
    emissive: 0xff2200,
    emissiveIntensity: 2
  });

  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.15, 0.5),
    lampMaterial
  );

  lamp.position.set(x, y, z);

  scene.add(lamp);

  const light = new THREE.PointLight(
    0xff4433,
    25,
    9
  );

  light.position.set(x, y - 0.3, z);

  scene.add(light);
}


// ==========================================
// 8. ARMAS 3D
// ==========================================

// ------------------------------------------
// PISTOLA DE ENERGIA
// ------------------------------------------

function createWeapon() {

  weapon = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x263642,
    metalness: 0.7,
    roughness: 0.35
  });

  const energyMaterial = new THREE.MeshStandardMaterial({
    color: 0x35caff,
    emissive: 0x0877bb,
    emissiveIntensity: 2
  });


  // Corpo principal

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.22, 0.65),
    bodyMaterial
  );

  body.position.set(0, 0, 0);

  weapon.add(body);


  // Núcleo de energia

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 12),
    energyMaterial
  );

  core.position.set(0, 0.12, -0.08);

  weapon.add(core);


  // Cano energético

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.065, 0.09, 0.42, 12
    ),
    bodyMaterial
  );

  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.42;

  weapon.add(barrel);


  // Empunhadura

  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.32, 0.16),
    bodyMaterial
  );

  grip.position.set(0, -0.22, 0.12);
  grip.rotation.x = -0.15;

  weapon.add(grip);


  // Flash da pistola

  muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0x55ddff
    })
  );

  muzzleFlash.position.set(0, 0, -0.72);
  muzzleFlash.visible = false;

  weapon.add(muzzleFlash);


  // Posição

  weapon.position.set(0.38, -0.32, -0.65);

  camera.add(weapon);
  scene.add(camera);


  // Guarda referências originais

  energyPistol = weapon;
  pistolMuzzleFlash = muzzleFlash;
}


// ------------------------------------------
// METRALHADORA
// ------------------------------------------

function createMachineGun() {

  machineGun = new THREE.Group();

  const gunMetal = new THREE.MeshStandardMaterial({
    color: 0x252b30,
    metalness: 0.8,
    roughness: 0.35
  });

  const gunDark = new THREE.MeshStandardMaterial({
    color: 0x11171b,
    metalness: 0.6,
    roughness: 0.5
  });

  const gunDetail = new THREE.MeshStandardMaterial({
    color: 0x52616a,
    metalness: 0.85,
    roughness: 0.3
  });

  const gunLight = new THREE.MeshStandardMaterial({
    color: 0xff9b35,
    emissive: 0xff5500,
    emissiveIntensity: 0.8
  });


  // Corpo

  const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.23, 0.72),
    gunMetal
  );

  machineGun.add(gunBody);


  // Cano

  const gunBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.045, 0.055, 0.55, 10
    ),
    gunDark
  );

  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0.015, -0.58);

  machineGun.add(gunBarrel);


  // Ponta do cano

  const gunMuzzle = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.075, 0.075, 0.12, 10
    ),
    gunDetail
  );

  gunMuzzle.rotation.x = Math.PI / 2;
  gunMuzzle.position.set(0, 0.015, -0.9);

  machineGun.add(gunMuzzle);


  // Carregador

  const gunMagazine = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.32, 0.2),
    gunDark
  );

  gunMagazine.position.set(0, -0.25, -0.05);
  gunMagazine.rotation.x = -0.12;

  machineGun.add(gunMagazine);


  // Empunhadura

  const gunGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.3, 0.18),
    gunDark
  );

  gunGrip.position.set(0, -0.23, 0.22);
  gunGrip.rotation.x = -0.2;

  machineGun.add(gunGrip);


  // Mira

  const gunSight = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.09, 0.22),
    gunDetail
  );

  gunSight.position.set(0, 0.15, -0.18);

  machineGun.add(gunSight);


  // Indicador luminoso

  const gunIndicator = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.055, 0.15),
    gunLight
  );

  gunIndicator.position.set(0.135, 0.025, -0.1);

  machineGun.add(gunIndicator);


  // Flash da metralhadora

  machineGunFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 10),
    new THREE.MeshBasicMaterial({
      color: 0xffb347
    })
  );

  machineGunFlash.position.set(0, 0.015, -1);
  machineGunFlash.visible = false;

  machineGun.add(machineGunFlash);


  // Posição

  machineGun.position.set(0.38, -0.32, -0.65);

  camera.add(machineGun);
}


// ------------------------------------------
// TROCA DE ARMAS
// ------------------------------------------

function switchWeapon(type) {

  if (
    type !== "machinegun" &&
    type !== "pistol"
  ) {
    return;
  }

  currentWeapon = type;

  if (type === "machinegun") {

    weapon = machineGun;
    muzzleFlash = machineGunFlash;

    machineGun.visible = true;
    energyPistol.visible = false;

  } else {

    weapon = energyPistol;
    muzzleFlash = pistolMuzzleFlash;

    machineGun.visible = false;
    energyPistol.visible = true;

  }

  weaponRecoil = 0;
  flashTimer = 0;

  muzzleFlash.visible = false;
}


// ==========================================
// 9. MODELOS 3D DOS ZUMBIS
// ==========================================

function createZombie(x, z) {

  const group = new THREE.Group();


  // Materiais

  const skin = new THREE.MeshStandardMaterial({
    color: 0x607c4d,
    roughness: 1
  });

  const darkSkin = new THREE.MeshStandardMaterial({
    color: 0x354a32,
    roughness: 1
  });

  const shirt = new THREE.MeshStandardMaterial({
    color: 0x493c38,
    roughness: 1
  });

  const eyes = new THREE.MeshBasicMaterial({
    color: 0xff2525
  });


  // Tronco

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.27, 0.34, 0.85, 10
    ),
    shirt
  );

  torso.position.y = 1.15;

  group.add(torso);


  // Cabeça

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 12, 12),
    skin
  );

  head.position.set(0, 1.85, 0);

  group.add(head);


  // Olhos

  for (const xEye of [-0.09, 0.09]) {

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      eyes
    );

    eye.position.set(
      xEye,
      1.89,
      -0.215
    );

    group.add(eye);
  }


  // Braços

  const arms = [];

  for (const side of [-1, 1]) {

    const arm = new THREE.Group();

    arm.position.set(
      side * 0.34,
      1.45,
      0
    );


    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.09, 0.12, 0.55, 8
      ),
      skin
    );

    upper.position.y = -0.25;

    arm.add(upper);


    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.07, 0.09, 0.42, 8
      ),
      darkSkin
    );

    forearm.position.set(
      0,
      -0.65,
      -0.03
    );

    arm.add(forearm);

    group.add(arm);
    arms.push(arm);
  }


  // Pernas
    const legs = [];

  for (const side of [-1, 1]) {

    const leg = new THREE.Group();

    leg.position.set(
      side * 0.14,
      0.75,
      0
    );


    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.12, 0.10, 0.48, 8
      ),
      darkSkin
    );

    upper.position.y = -0.23;

    leg.add(upper);


    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.18, 0.13, 0.28
      ),
      shirt
    );

    foot.position.set(
      0,
      -0.48,
      -0.06
    );

    leg.add(foot);

    group.add(leg);
    legs.push(leg);
  }


  // Posição e escala

  group.position.set(x, 0, z);

  group.scale.setScalar(
    0.9 + Math.random() * 0.15
  );

  scene.add(group);


  // Vida e inteligência artificial

  const healthOptions = [100, 120, 140, 160, 180, 200];

  const zombie = {

    group,
    arms,
    legs,

    // Cada zumbi recebe uma vida aleatória da lista acima.
    health: healthOptions[
      Math.floor(Math.random() * healthOptions.length)
    ],

    speed: 0.75 + Math.random() * 0.9 + wave * 0.05,

    attackCooldown: 0,

    phase: Math.random() * Math.PI * 2,

    dead: false,

    path: [],
    pathIndex: 0,
    pathTimer: Math.random() * 0.5,

    lastTargetX: -999,
    lastTargetZ: -999

  };


  // Identificação das zonas de impacto

  group.traverse(object => {

    if (!object.isMesh) return;

    object.castShadow = true;

    object.userData.zombie = zombie;

    if (object.position.y >= 1.8) {
      object.userData.hitZone = "head";
    }

  });

  return zombie;
}


// ==========================================
// 10. COLISÕES
// ==========================================

function blocked(x, z, radius = 0.35) {

  const limit = MAP_SIZE / 2 - 0.5;

  if (
    x < -limit || x > limit ||
    z < -limit || z > limit
  ) {
    return true;
  }

  for (const obstacle of obstacles) {

    const dx = Math.max(
      Math.abs(x - obstacle.x) - obstacle.sx / 2,
      0
    );

    const dz = Math.max(
      Math.abs(z - obstacle.z) - obstacle.sz / 2,
      0
    );

    if (
      dx * dx + dz * dz <
      radius * radius
    ) {
      return true;
    }

  }

  return false;
}


function moveEntity(entity, dx, dz, radius = 0.35) {

  if (!blocked(entity.x + dx, entity.z, radius)) {
    entity.x += dx;
  }

  if (!blocked(entity.x, entity.z + dz, radius)) {
    entity.z += dz;
  }

}


// ==========================================
// 11. NAVEGAÇÃO INTELIGENTE DOS ZUMBIS
// A* PATHFINDING
// ==========================================

function buildNavigationGrid() {

  navigationGrid = [];

  for (let x = 0; x < NAV_SIZE; x++) {

    navigationGrid[x] = [];

    for (let z = 0; z < NAV_SIZE; z++) {

      const worldX = NAV_ORIGIN + x;
      const worldZ = NAV_ORIGIN + z;

      navigationGrid[x][z] = !blocked(
        worldX,
        worldZ,
        0.4
      );

    }

  }

}


// ------------------------------------------
// CONVERSÃO DE COORDENADAS
// ------------------------------------------

function worldToGrid(x, z) {

  return {

    x: Math.max(
      0,
      Math.min(
        NAV_SIZE - 1,
        Math.round(x - NAV_ORIGIN)
      )
    ),

    z: Math.max(
      0,
      Math.min(
        NAV_SIZE - 1,
        Math.round(z - NAV_ORIGIN)
      )
    )

  };

}


// ------------------------------------------
// CÉLULA LIVRE MAIS PRÓXIMA
// ------------------------------------------

function findNearestWalkable(x, z) {

  const start = worldToGrid(x, z);

  if (navigationGrid[start.x][start.z]) {
    return start;
  }

  for (
    let radius = 1;
    radius < NAV_SIZE;
    radius++
  ) {

    for (
      let dx = -radius;
      dx <= radius;
      dx++
    ) {

      for (
        let dz = -radius;
        dz <= radius;
        dz++
      ) {

        const nx = start.x + dx;
        const nz = start.z + dz;

        if (
          nx >= 0 && nx < NAV_SIZE &&
          nz >= 0 && nz < NAV_SIZE &&
          navigationGrid[nx][nz]
        ) {

          return {
            x: nx,
            z: nz
          };

        }

      }

    }

  }

  return null;
}


// ------------------------------------------
// BUSCA DE CAMINHO A*
// ------------------------------------------

function findZombiePath(
  startX,
  startZ,
  targetX,
  targetZ
) {

  const start = findNearestWalkable(
    startX,
    startZ
  );

  const goal = findNearestWalkable(
    targetX,
    targetZ
  );

  if (!start || !goal) return [];


  const id = (x, z) =>
    x * NAV_SIZE + z;

  const total = NAV_SIZE * NAV_SIZE;

  const gScore = new Float32Array(total);
  const parent = new Int32Array(total);
  const closed = new Uint8Array(total);

  gScore.fill(Infinity);
  parent.fill(-1);


  const startId = id(start.x, start.z);
  const goalId = id(goal.x, goal.z);

  gScore[startId] = 0;

  const open = [];


  // Heurística

  function heuristic(x, z) {

    const dx = Math.abs(x - goal.x);
    const dz = Math.abs(z - goal.z);

    return Math.max(dx, dz) +
      (Math.SQRT2 - 1) * Math.min(dx, dz);

  }


  // Fila de prioridade

  function push(node, priority) {

    let i = open.length;

    open.push({
      node,
      priority
    });

    while (i > 0) {

      const parentIndex = Math.floor(
        (i - 1) / 2
      );

      if (
        open[parentIndex].priority <= priority
      ) {
        break;
      }

      open[i] = open[parentIndex];

      i = parentIndex;
    }

    open[i] = {
      node,
      priority
    };

  }


  function pop() {

    const first = open[0];
    const last = open.pop();

    if (open.length > 0) {

      let i = 0;

      while (true) {

        let child = i * 2 + 1;

        if (child >= open.length) break;

        if (
          child + 1 < open.length &&
          open[child + 1].priority <
          open[child].priority
        ) {
          child++;
        }

        if (
          last.priority <=
          open[child].priority
        ) {
          break;
        }

        open[i] = open[child];

        i = child;
      }

      open[i] = last;
    }

    return first;
  }


  push(
    startId,
    heuristic(start.x, start.z)
  );


  // Direções possíveis

  const directions = [

    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],

    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]

  ];


  let found = false;
  let attempts = 0;


  while (
    open.length > 0 &&
    attempts < 1500
  ) {

    attempts++;

    const current = pop().node;
        if (closed[current]) continue;

    if (current === goalId) {
      found = true;
      break;
    }

    closed[current] = 1;


    const cx = Math.floor(
      current / NAV_SIZE
    );

    const cz = current % NAV_SIZE;


    for (const [dx, dz] of directions) {

      const nx = cx + dx;
      const nz = cz + dz;

      if (
        nx < 0 || nx >= NAV_SIZE ||
        nz < 0 || nz >= NAV_SIZE ||
        !navigationGrid[nx][nz]
      ) {
        continue;
      }


      // Impede cortar cantos

      if (dx !== 0 && dz !== 0) {

        if (
          !navigationGrid[cx + dx][cz] ||
          !navigationGrid[cx][cz + dz]
        ) {
          continue;
        }

      }


      const next = id(nx, nz);

      if (closed[next]) continue;


      const cost =
        dx !== 0 && dz !== 0
          ? Math.SQRT2
          : 1;


      const tentative =
        gScore[current] + cost;


      if (tentative < gScore[next]) {

        gScore[next] = tentative;
        parent[next] = current;

        push(
          next,
          tentative + heuristic(nx, nz)
        );

      }

    }

  }


  if (!found) return [];


  // Reconstrução do caminho

  const path = [];

  let current = goalId;

  while (
    current !== startId &&
    current !== -1
  ) {

    const x = Math.floor(
      current / NAV_SIZE
    );

    const z = current % NAV_SIZE;

    path.unshift({

      x: NAV_ORIGIN + x,
      z: NAV_ORIGIN + z

    });

    current = parent[current];
  }

  return path;
}


// ==========================================
// 12. SISTEMA DE ONDAS
// ==========================================

function spawnWave() {

  zombies.forEach(z => {
    scene.remove(z.group);
  });

  zombies = [];

  const amount = 3 + wave * 2;


  for (let i = 0; i < amount; i++) {

    let x, z;
    let valid = false;


    for (let tries = 0; tries < 200; tries++) {

      x = Math.random() * 25 - 12.5;
      z = Math.random() * 25 - 12.5;

      const distance = Math.hypot(
        x - camera.position.x,
        z - camera.position.z
      );


      if (
        distance > 6 &&
        !blocked(x, z, 0.45)
      ) {

        valid = true;
        break;

      }

    }


    if (valid) {
      zombies.push(createZombie(x, z));
    }

  }

  updateHUD();
}


// ==========================================
// 13. SISTEMA DE DISPARO
// ==========================================

function shoot() {

  if (!running || shotCooldown > 0) return;


  // Cadência das armas

  if (currentWeapon === "machinegun") {

    shotCooldown = 0.105;

  } else {

    shotCooldown = 0.32;

  }


  // Recuo

  weaponRecoil =
    currentWeapon === "machinegun"
      ? 0.075
      : 0.16;


  // Flash

  flashTimer =
    currentWeapon === "machinegun"
      ? 0.055
      : 0.09;

  muzzleFlash.visible = true;


  // Som do disparo

  playSound(
    currentWeapon === "machinegun"
      ? 115
      : 180
  );


  // Raycast

  raycaster.setFromCamera(
    new THREE.Vector2(0, 0),
    camera
  );


  const targets = [];

  zombies.forEach(zombie => {

    zombie.group.traverse(object => {

      if (object.isMesh) {
        targets.push(object);
      }

    });

  });


  const hits = raycaster.intersectObjects(
    targets,
    false
  );


  if (
    hits.length === 0 ||
    hits[0].distance >= 18
  ) {
    return;
  }


  const hit = hits[0];

  const target = hit.object.userData.zombie;

  if (!target || target.dead) return;


  // Headshot elimina o zumbi imediatamente.

  const headshot =
    hit.object.userData.hitZone === "head";


  if (headshot) {

    createImpact(hit.point);
    playSound(500);

    eliminateZombie(target);

    return;
  }


  // Dano no corpo: as armas compartilham a mesma barra de vida.
  // Metralhadora: 20 de dano. Pistola de energia: 100 de dano.

  const damage =
    currentWeapon === "machinegun"
      ? 20
      : 100;

  target.health = Math.max(0, target.health - damage);


  createImpact(hit.point);
  playSound(260);


  if (target.health <= 0) {
    eliminateZombie(target);
  }

}

// ------------------------------------------
// ELIMINAÇÃO DE ZUMBI
// ------------------------------------------

function eliminateZombie(target) {

  target.dead = true;

  scene.remove(target.group);

  zombies = zombies.filter(
    z => z !== target
  );

  kills++;

  updateHUD();
}


// ------------------------------------------
// EFEITO DE IMPACTO
// ------------------------------------------

function createImpact(position) {

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0x55ddff,
      transparent: true
    })
  );

  sphere.position.copy(position);

  scene.add(sphere);

  effects.push({

    mesh: sphere,

    life: 0.22,
    maxLife: 0.22

  });

}


// ==========================================
// 14. SISTEMA DE SOM
// ==========================================

function playSound(frequency) {

  if (!sound) return;

  try {

    if (!audioContext) {

      audioContext = new (
        window.AudioContext ||
        window.webkitAudioContext
      )();

    }


    if (audioContext.state === "suspended") {
      audioContext.resume();
    }


    const oscillator =
      audioContext.createOscillator();

    const gain =
      audioContext.createGain();


    oscillator.frequency.value = frequency;


    gain.gain.setValueAtTime(
      0.055,
      audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.13
    );


    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime + 0.13
    );


  } catch (error) {

    console.warn(
      "Áudio indisponível:",
      error
    );

  }

}


// ==========================================
// 15. CONFIGURAÇÕES
// ==========================================

function toggleSound() {

  sound = !sound;

  document.getElementById("soundText").textContent =
    sound ? "Ligado" : "Desligado";

}


function changeFov(value) {

  fov = Number(value);

  document.getElementById("fovText").textContent =
    fov + "°";


  if (camera) {

    camera.fov = fov;

    camera.updateProjectionMatrix();

  }

}


function showSettings() {

  document.getElementById("menu").style.display =
    "none";

  document.getElementById("settings").style.display =
    "flex";

}


function backMenu() {

  document.getElementById("settings").style.display =
    "none";

  document.getElementById("menu").style.display =
    "flex";

}


function exitGame() {

  running = false;
  mouseFiring = false;

  document.getElementById("hud").style.display =
    "none";


  document.getElementById("menu").innerHTML = `

    <div class="menu-content">

      <h1>ATÉ A PRÓXIMA</h1>

      <p>Você saiu do Zombie Horde.</p>

      <button onclick="location.reload()">
        VOLTAR AO INÍCIO
      </button>

    </div>

  `;


  document.getElementById("menu").style.display =
    "flex";

}


function backToMain() {

  running = false;
  mouseFiring = false;

  document.getElementById("hud").style.display =
    "none";

  document.getElementById("menu").style.display =
    "flex";

  keys = {};

}


// ==========================================
// 16. INICIAR PARTIDA
// ==========================================

function startGame() {

  if (!renderer) return;


  document.getElementById("menu").style.display =
    "none";

  document.getElementById("settings").style.display =
    "none";

  document.getElementById("hud").style.display =
    "block";


  camera.position.set(0, 1.7, 10);

  yaw = 0;

  camera.rotation.set(0, 0, 0);


  // Estado inicial

  health = 100;
  kills = 0;
  wave = 1;

  waveDelay = 0;
  shotCooldown = 0;

  weaponRecoil = 0;
  flashTimer = 0;
  messageTimer = 0;
  damageFlash = 0;

  keys = {};

  mouseFiring = false;


  // Arma inicial

  switchWeapon("machinegun");


  document.getElementById("message").textContent =
    "";


  // Primeira onda

  spawnWave();


  running = true;

  clock.getDelta();

  requestAnimationFrame(loop);

}


// ==========================================
// 17. ATUALIZAÇÃO DOS ZUMBIS
// ==========================================

function updateZombies(dt, elapsed) {

  for (const zombie of zombies) {

    const group = zombie.group;


    // Distância do jogador

    const dx =
      camera.position.x - group.position.x;

    const dz =
      camera.position.z - group.position.z;

    const distance = Math.hypot(dx, dz);


    zombie.phase += dt * 7;


    // --------------------------------------
    // ANIMAÇÃO DAS PERNAS
    // --------------------------------------

    zombie.legs[0].rotation.x =
      Math.sin(zombie.phase) * 0.45;

    zombie.legs[1].rotation.x =
      Math.sin(zombie.phase + Math.PI) * 0.45;


    // --------------------------------------
    // ANIMAÇÃO DOS BRAÇOS
    // --------------------------------------

    zombie.arms[0].rotation.x =
      Math.sin(zombie.phase + Math.PI) * 0.35 - 0.5;

    zombie.arms[1].rotation.x =
      Math.sin(zombie.phase) * 0.35 - 0.5;


    // --------------------------------------
    // PERSEGUIÇÃO
    // ------------------------------------

    if (distance > 1.15) {

      zombie.pathTimer -= dt;


      const targetCell = worldToGrid(
        camera.position.x,
        camera.position.z
      );


      const targetChanged =
        targetCell.x !== zombie.lastTargetX ||
        targetCell.z !== zombie.lastTargetZ;


      if (
        zombie.pathTimer <= 0 ||
        targetChanged
      ) {

        zombie.path = findZombiePath(

          group.position.x,
          group.position.z,

          camera.position.x,
          camera.position.z

        );

        zombie.pathIndex = 0;
        zombie.pathTimer = 0.6;

        zombie.lastTargetX = targetCell.x;
        zombie.lastTargetZ = targetCell.z;

      }


      // Segue o caminho

      if (
        zombie.pathIndex <
        zombie.path.length
      ) {

        const point =
          zombie.path[zombie.pathIndex];


        const px =
          point.x - group.position.x;

        const pz =
          point.z - group.position.z;


        const pointDistance =
          Math.hypot(px, pz);


        if (pointDistance < 0.35) {

          zombie.pathIndex++;

        } else {

          const moveSpeed =
            zombie.speed * dt;


          const mx =
            (px / pointDistance) * moveSpeed;

          const mz =
            (pz / pointDistance) * moveSpeed;


          moveEntity(
            group.position,
            mx,
            mz,
            0.35
          );


          group.rotation.y =
            Math.atan2(px, pz);

        }

      }


    } else {

      // ------------------------------------
      // ATAQUE AO JOGADOR
      // ------------------------------------

      zombie.attackCooldown -= dt;


      if (zombie.attackCooldown <= 0) {

        health -= 8;

        zombie.attackCooldown = 1.1;

        damageFlash = 0.2;


        playSound(65);

        updateHUD();


        if (health <= 0) {

          health = 0;

          running = false;

          mouseFiring = false;

          updateHUD();

          showEnd("FIM DE JOGO");

          return;

        }

      }

    }

  }

}


// ==========================================
// 18. MOVIMENTAÇÃO DO JOGADOR
// ==========================================

function updatePlayer(dt) {

  // Rotação horizontal

  if (keys["arrowleft"]) {
    yaw += 1.8 * dt;
  }

  if (keys["arrowright"]) {
    yaw -= 1.8 * dt;
  }


  // Olhar para cima e para baixo

  if (keys["arrowup"]) {
    pitch += 1.5 * dt;
  }

  if (keys["arrowdown"]) {
    pitch -= 1.5 * dt;
  }


  pitch = THREE.MathUtils.clamp(
    pitch,
    -1.15,
    1.15
  );


  camera.rotation.set(
    pitch,
    yaw,
    0
  );


  // Movimento WASD

  let forward = 0;
  let side = 0;


  if (keys["w"]) forward += 1;
  if (keys["s"]) forward -= 1;

  if (keys["d"]) side += 1;
  if (keys["a"]) side -= 1;


  const length = Math.hypot(
    forward,
    side
  );


  if (length > 0) {

    forward /= length;
    side /= length;

  }


  const speed = PLAYER_SPEED * dt;


  // Direção alinhada à câmera

  const dx =

    -Math.sin(yaw) * forward * speed +

    Math.cos(yaw) * side * speed;


  const dz =

    -Math.cos(yaw) * forward * speed -

    Math.sin(yaw) * side * speed;


  const playerPosition = {

    x: camera.position.x,
    z: camera.position.z

  };


  moveEntity(
    playerPosition,
    dx,
    dz,
    0.4
  );


  camera.position.x = playerPosition.x;
  camera.position.z = playerPosition.z;


  // Movimento suave da câmera

  const moving = length > 0;


  const bob = moving

    ? Math.sin(performance.now() * 0.012) * 0.035

    : 0;


  camera.position.y +=

    (
      1.7 + bob - camera.position.y
    ) *

    Math.min(1, dt * 12);

}


// ==========================================
// 19. ANIMAÇÃO DAS ARMAS
// ==========================================

function updateWeapon(dt) {

  shotCooldown = Math.max(
    0,
    shotCooldown - dt
  );


  // Recuo

  weaponRecoil = THREE.MathUtils.lerp(
    weaponRecoil,
    0,
    Math.min(1, dt * 13)
  );


  weapon.position.z =
    -0.65 + weaponRecoil;

  weapon.rotation.x =
    -weaponRecoil * 0.8;


  // Flash do disparo

  flashTimer -= dt;

  if (flashTimer <= 0) {
    muzzleFlash.visible = false;
  }


  // Movimento da arma

  const moving =

    keys["w"] ||
    keys["a"] ||
    keys["s"] ||
    keys["d"];


  const bob = moving

    ? Math.sin(performance.now() * 0.012) * 0.012

    : 0;


  weapon.position.y = -0.32 + bob;

}


// ==========================================
// 20. EFEITOS VISUAIS
// ==========================================

function updateEffects(dt) {

  for (
    let i = effects.length - 1;
    i >= 0;
    i--
  ) {

    const effect = effects[i];

    effect.life -= dt;


    const scale =

      1 +

      (
        1 - effect.life / effect.maxLife
      ) * 2;


    effect.mesh.scale.setScalar(scale);


    effect.mesh.material.opacity = Math.max(
      0,
      effect.life / effect.maxLife
    );


    if (effect.life <= 0) {

      scene.remove(effect.mesh);

      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();

      effects.splice(i, 1);

    }

  }


  damageFlash = Math.max(
    0,
    damageFlash - dt
  );

}


// ==========================================
// 21. HUD
// ==========================================

function updateHUD() {

  document.getElementById("wave").textContent =
    wave + "/10";


  document.getElementById("enemies").textContent =
    zombies.length;


  document.getElementById("health").textContent =
    Math.ceil(health);


  document.getElementById("kills").textContent =
    kills;


  document.getElementById("health-fill").style.width =
    Math.max(0, health) + "%";

}


// ==========================================
// 22. FIM DE JOGO
// ==========================================

function showEnd(title) {

  document.getElementById("hud").style.display =
    "none";


  const menu = document.getElementById("menu");


  menu.innerHTML = `

    <div class="menu-content">

      <div class="eyebrow">
        RESULTADO DA MISSÃO
      </div>

      <h1>${title}</h1>

      <p class="subtitle">
        ONDAS: ${wave}/10
      </p>

      <p>
        Eliminações: ${kills}
      </p>

      <button onclick="startGame()">
        JOGAR NOVAMENTE
      </button>

      <button onclick="location.reload()">
        MENU PRINCIPAL
      </button>

    </div>

  `;


  menu.style.display = "flex";

}


// ==========================================
// 23. CONTROLES
// ==========================================

// ------------------------------------------
// TECLADO
// ------------------------------------------

addEventListener("keydown", event => {

  keys[event.key.toLowerCase()] = true;


  // Impede rolagem da página

  if (

    [
      " ",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight"
    ].includes(event.key)

  ) {

    event.preventDefault();

  }


  // Disparo

  if (event.code === "Space" && running) {
    shoot();
  }


  // Troca de armas

  if (running) {

    if (event.key === "1") {
      switchWeapon("machinegun");
    }

    if (event.key === "2") {
      switchWeapon("pistol");
    }

  }


  // Sair da partida

  if (
    event.key === "Escape" &&
    running
  ) {

    backToMain();

  }

});


// ------------------------------------------
// SOLTAR TECLAS
// ------------------------------------------

addEventListener("keyup", event => {

  keys[event.key.toLowerCase()] = false;

});


// ------------------------------------------
// PERDA DE FOCO
// ------------------------------------------

addEventListener("blur", () => {

  keys = {};

  mouseFiring = false;

});


// ------------------------------------------
// MOUSE
// ------------------------------------------

addEventListener("pointerdown", event => {

  if (
    running &&
    renderer &&
    event.target === renderer.domElement
  ) {

    shoot();

    mouseFiring = true;

  }

});


addEventListener("pointerup", () => {

  mouseFiring = false;

});


addEventListener("pointercancel", () => {

  mouseFiring = false;

});


// ==========================================
// 24. LOOP PRINCIPAL
// ==========================================

function loop() {

  if (!running) return;


  requestAnimationFrame(loop);


  const dt = Math.min(
    clock.getDelta(),
    0.05
  );


  // Atualizações

  updatePlayer(dt);

  updateZombies(
    dt,
    clock.elapsedTime
  );

  updateWeapon(dt);

  updateEffects(dt);


  // Disparo automático

  if (
    keys[" "] ||
    mouseFiring
  ) {

    shoot();

  }


  // ----------------------------------------
  // PROGRESSÃO DAS ONDAS
  // ----------------------------------------

  if (zombies.length === 0) {

    waveDelay += dt;


    if (waveDelay >= 3) {

      if (wave >= 10) {

        running = false;
        mouseFiring = false;

        showEnd("VOCÊ SOBREVIVEU!");

        return;

      }


      wave++;

      waveDelay = 0;

      spawnWave();


      document.getElementById("message").textContent =
        "ONDA " + wave;

      messageTimer = 2;

    }

  }


  // ----------------------------------------
  // MENSAGEM DAS ONDAS
  // ----------------------------------------

  if (messageTimer > 0) {

    messageTimer -= dt;


    if (messageTimer <= 0) {

      document.getElementById("message").textContent =
        "";

    }

  }


  // Renderização

  renderer.render(scene, camera);

}


// ==========================================
// 25. REDIMENSIONAMENTO
// ==========================================

function resize() {

  if (!renderer || !camera) return;


  camera.aspect =
    innerWidth / innerHeight;

  camera.updateProjectionMatrix();


  renderer.setSize(
    innerWidth,
    innerHeight
  );

}


// ==========================================
// 26. TRATAMENTO DE ERROS
// ==========================================

function showError(message) {

  document.getElementById("error-screen").style.display =
    "flex";

  document.getElementById("error-text").textContent =
    message;

}


// ==========================================
// INICIAR O MOTOR
// ==========================================

init();


// ==========================================
// FIM DO GAME.JS
// ZOMBIE HORDE: SURVIVAL
// ==========================================