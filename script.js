
/* ============================================================
   FOUR-CYLINDER ENGINE SIMULATOR — UPGRADED SCRIPT
   Three.js r128
   Complete replacement for script.js
   ============================================================ */

(() => {
  "use strict";

  // ------------------------------------------------------------
  // DOM ELEMENTS
  // ------------------------------------------------------------

  const $ = (id) => document.getElementById(id);

  const view = $("view");
  const tip = $("tip");
  const partsPanel = $("parts");
  const detailPanel = $("detail");

  const startButton = $("start");
  const throttleInput = $("throttle");
  const throttleOutput = $("tOut");
  const slowInput = $("slow");
  const autoInput = $("auto");

  const engineModeButton = $("mEngine");
  const driveModeButton = $("mDrive");

  const gearsElement = $("gears");
  const gearText = $("gt");

  const rpmElement = $("rpm");
  const speedElement = $("kph");
  const powerBar = $("bar");

  const chipsElement = $("chips");
  const strokesElement = $("strokes");

  if (!view || !window.THREE) {
    console.error("Engine Simulator: Three.js or #view was not found.");
    if (tip) tip.textContent = "Unable to initialize 3D engine. Check Three.js.";
    return;
  }

  // ------------------------------------------------------------
  // PART INFORMATION
  // ------------------------------------------------------------

  const PARTS = {
    block: [
      "Cylinder Block",
      "The main body of the engine. It contains four cylinders where the pistons move up and down."
    ],
    head: [
      "Cylinder Head",
      "The top section of the engine. It contains the valves, spark plugs, and combustion chambers."
    ],
    chamber: [
      "Combustion Chamber",
      "The space above each piston. Air and fuel are compressed here before ignition."
    ],
    piston: [
      "Piston",
      "Moves up and down inside the cylinder. Combustion pushes it downward, creating mechanical power."
    ],
    rod: [
      "Connecting Rod",
      "Connects the piston to the crankshaft and transfers the piston's movement."
    ],
    crank: [
      "Crankshaft",
      "Converts the pistons' up-and-down movement into rotational movement."
    ],
    valve: [
      "Intake and Exhaust Valves",
      "Intake valves allow air and fuel into the cylinder. Exhaust valves let burned gases escape."
    ],
    cam: [
      "Camshaft",
      "Controls when the intake and exhaust valves open and close."
    ],
    spark: [
      "Spark Plug",
      "Creates an electrical spark that ignites the compressed air-fuel mixture."
    ],
    flywheel: [
      "Flywheel",
      "Stores rotational energy and helps keep the crankshaft spinning smoothly."
    ],
    clutch: [
      "Clutch",
      "Connects and disconnects engine power from the transmission."
    ],
    transmission: [
      "Transmission",
      "Uses different gear ratios to control the relationship between engine RPM and wheel speed."
    ],
    intake: [
      "Intake Manifold",
      "Distributes incoming air to the four cylinders."
    ],
    exhaust: [
      "Exhaust Manifold",
      "Collects exhaust gases from the cylinders and directs them away from the engine."
    ],
    radiator: [
      "Radiator",
      "Transfers heat from the engine coolant into the surrounding air."
    ],
    wheel: [
      "Drive Wheels",
      "Receive rotational power through the transmission and drivetrain."
    ]
  };

  // ------------------------------------------------------------
  // THREE.JS SETUP
  // ------------------------------------------------------------

  let scene;
  let camera;
  let renderer;
  let world;
  let engineGroup;
  let carGroup;
  let engineParts = [];
  let clickableParts = [];
  let animationFrame = null;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const clock = new THREE.Clock();

  const COLORS = {
    metal: 0x8997a7,
    darkMetal: 0x354354,
    aluminum: 0xb9c6d2,
    orange: 0xff7838,
    blue: 0x2589ff,
    red: 0xff3434,
    yellow: 0xffcc45,
    black: 0x151b24,
    rubber: 0x101319,
    white: 0xeaf3ff,
    green: 0x39e68b
  };

  const state = {
    running: false,
    driveMode: false,
    automatic: true,
    throttle: 0.25,
    rpm: 850,
    speed: 0,
    gear: 1,
    clutch: 1,
    engineAngle: 0,
    camAngle: 0,
    elapsed: 0,
    slowMotion: 1,
    selected: null,
    mouseDown: false,
    dragging: false,
    lastX: 0,
    lastY: 0,
    cameraAngle: -0.7,
    cameraElevation: 0.55,
    cameraDistance: 11,
    steering: 0,
    keys: {}
  };

  const CYLINDERS = 4;

  // Firing order: 1 - 3 - 4 - 2
  const FIRING_ORDER = [0, 2, 3, 1];

  // Crankshaft firing offsets in degrees.
  const FIRING_OFFSETS = [0, 540, 180, 360];

  const clamp = (v, min, max) =>
    Math.max(min, Math.min(max, v));

  const lerp = (a, b, t) =>
    a + (b - a) * t;

  const smooth = (a, b, t) =>
    a + (b - a) * clamp(t, 0, 1);

  // ------------------------------------------------------------
  // INITIALIZATION
  // ------------------------------------------------------------

  function init() {
    try {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x080e19);
      scene.fog = new THREE.Fog(0x080e19, 17, 42);

      camera = new THREE.PerspectiveCamera(
        42,
        view.clientWidth / Math.max(view.clientHeight, 1),
        0.1,
        100
      );

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
      });

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(view.clientWidth, view.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      view.innerHTML = "";
      view.appendChild(renderer.domElement);

      createLighting();
      createEnvironment();
      createEngine();
      createCar();
      createControls();
      createPartsList();
      updateCamera();

      if (tip) {
        tip.textContent = "Drag to rotate • Scroll to zoom • Click components to inspect";
      }

      window.addEventListener("resize", resize);

      if (window.ResizeObserver) {
        const observer = new ResizeObserver(resize);
        observer.observe(view);
      }

      animate();

    } catch (error) {
      console.error("Engine initialization failed:", error);
      if (tip) tip.textContent = "3D engine failed to initialize. Check the console.";
    }
  }

  // ------------------------------------------------------------
  // LIGHTING
  // ------------------------------------------------------------

  function createLighting() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(5, 10, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const blueLight = new THREE.PointLight(0x2589ff, 30, 20);
    blueLight.position.set(-5, 3, -3);
    scene.add(blueLight);

    const orangeLight = new THREE.PointLight(0xff7838, 18, 15);
    orangeLight.position.set(2, 2, 5);
    scene.add(orangeLight);
  }

  // ------------------------------------------------------------
  // MATERIALS AND GEOMETRY HELPERS
  // ------------------------------------------------------------

  function material(color, metalness = 0.3, roughness = 0.45) {
    return new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness
    });
  }

  const mats = {
    aluminum: material(COLORS.aluminum, 0.85, 0.25),
    metal: material(COLORS.metal, 0.8, 0.3),
    dark: material(COLORS.darkMetal, 0.75, 0.35),
    black: material(COLORS.black, 0.25, 0.55),
    orange: material(COLORS.orange, 0.5, 0.3),
    blue: material(COLORS.blue, 0.45, 0.25),
    rubber: material(COLORS.rubber, 0.05, 0.9),
    gold: material(0xd5a52c, 0.8, 0.25),
    red: material(COLORS.red, 0.35, 0.3),
    white: material(COLORS.white, 0.3, 0.35)
  };

  function addMesh(parent, geometry, mat, position, name) {
    const mesh = new THREE.Mesh(geometry, mat);

    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (name) mesh.userData.part = name;

    parent.add(mesh);

    if (name) {
      engineParts.push(mesh);
      clickableParts.push(mesh);
    }

    return mesh;
  }

  function box(parent, w, h, d, mat, x, y, z, name) {
    return addMesh(
      parent,
      new THREE.BoxGeometry(w, h, d),
      mat,
      [x, y, z],
      name
    );
  }

  function cylinder(parent, radiusTop, radiusBottom, height, mat, x, y, z, name, segments = 24) {
    return addMesh(
      parent,
      new THREE.CylinderGeometry(
        radiusTop,
        radiusBottom,
        height,
        segments
      ),
      mat,
      [x, y, z],
      name
    );
  }

  function sphere(parent, radius, mat, x, y, z, name) {
    return addMesh(
      parent,
      new THREE.SphereGeometry(radius, 20, 14),
      mat,
      [x, y, z],
      name
    );
  }

  function rod(parent, start, end, radius, mat, name) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = new THREE.Vector3().subVectors(b, a);

    const mesh = addMesh(
      parent,
      new THREE.CylinderGeometry(
        radius,
        radius,
        direction.length(),
        12
      ),
      mat,
      [
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        (a.z + b.z) / 2
      ],
      name
    );

    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );

    return mesh;
  }

  function ring(parent, radius, tube, mat, x, y, z, name) {
    return addMesh(
      parent,
      new THREE.TorusGeometry(radius, tube, 8, 48),
      mat,
      [x, y, z],
      name
    );
  }

  // ------------------------------------------------------------
  // ENVIRONMENT
  // ------------------------------------------------------------

  function createEnvironment() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      material(0x111b2a, 0.25, 0.85)
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.8;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(100, 100, 0x244365, 0x172b43);
    grid.position.y = -1.79;
    scene.add(grid);

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.18, 6),
      material(0x1c2a3c, 0.65, 0.4)
    );

    platform.position.set(0, -1.7, 0);
    platform.receiveShadow = true;
    scene.add(platform);

    const edgeMat = material(0x2589ff, 0.6, 0.3);

    for (let x of [-4.4, 4.4]) {
      const edge = box(
        scene,
        0.045,
        0.035,
        5.8,
        edgeMat,
        x,
        -1.57,
        0
      );
    }
  }

  // ------------------------------------------------------------
  // ENGINE MODEL
  // ------------------------------------------------------------

  const moving = {
    crank: null,
    flywheel: null,
    cams: [],
    pistons: [],
    rods: [],
    intakeValves: [],
    exhaustValves: [],
    sparks: [],
    wheels: [],
    fans: [],
    exhaustParticles: [],
    intakeParticles: []
  };

  function createEngine() {
    engineGroup = new THREE.Group();
    scene.add(engineGroup);

    const base = box(
      engineGroup,
      3.5,
      0.45,
      2.15,
      mats.dark,
      0,
      -1.1,
      0,
      "block"
    );

    // Engine mounting rails.
    for (const z of [-0.95, 0.95]) {
      box(engineGroup, 3.7, 0.12, 0.15, mats.metal, 0, -1.34, z);
    }

    // Main cylinder block.
    box(engineGroup, 3.15, 2.0, 1.75, mats.aluminum, 0, 0, 0, "block");

    // Cylinder banks.
    for (let i = 0; i < CYLINDERS; i++) {
      const x = -1.15 + i * 0.77;

      const bore = cylinder(
        engineGroup,
        0.33,
        0.33,
        1.65,
        mats.dark,
        x,
        0.05,
        0,
        "chamber",
        32
      );

      bore.material = material(0x344355, 0.75, 0.25);

      // Cylinder liner.
      ring(engineGroup, 0.31, 0.035, mats.aluminum, x, 0.88, 0, "block");

      // Spark plugs.
      cylinder(
        engineGroup,
        0.075,
        0.075,
        0.5,
        mats.white,
        x,
        1.27,
        0,
        "spark",
        12
      );

      sphere(engineGroup, 0.09, mats.gold, x, 1.03, 0, "spark");

      const spark = sphere(
        engineGroup,
        0.13,
        material(0x54c9ff, 0.1, 0.2),
        x,
        0.94,
        0,
        "spark"
      );

      spark.material.emissive = new THREE.Color(0x168bff);
      spark.material.emissiveIntensity = 0;
      moving.sparks.push(spark);

      // Pistons.
      const piston = cylinder(
        engineGroup,
        0.28,
        0.28,
        0.26,
        mats.metal,
        x,
        0,
        0,
        "piston",
        32
      );

      ring(engineGroup, 0.275, 0.018, mats.white, x, 0, 0, "piston");

      // Piston rings.
      const rings = [];
      for (let r = 0; r < 3; r++) {
        const pr = ring(
          engineGroup,
          0.285,
          0.014,
          mats.dark,
          x,
          0,
          0,
          "piston"
        );
        rings.push(pr);
      }

      // Connecting rod.
      const connectingRod = rod(
        engineGroup,
        [x, -0.15, 0],
        [x, -0.85, 0],
        0.085,
        mats.gold,
        "rod"
      );

      const rodTop = sphere(engineGroup, 0.13, mats.dark, x, -0.15, 0, "rod");

      const rodBottom = sphere(engineGroup, 0.14, mats.gold, x, -0.85, 0, "rod");

      moving.pistons.push({
        mesh: piston,
        rings,
        x,
        offset: FIRING_OFFSETS[i] * Math.PI / 180
      });

      moving.rods.push({
        mesh: connectingRod,
        top: rodTop,
        bottom: rodBottom,
        x,
        offset: FIRING_OFFSETS[i] * Math.PI / 180
      });

      // Intake and exhaust valves.
      const intakeValve = cylinder(
        engineGroup,
        0.055,
        0.055,
        0.55,
        mats.blue,
        x - 0.15,
        1.08,
        0.22,
        "valve",
        12
      );

      const exhaustValve = cylinder(
        engineGroup,
        0.055,
        0.055,
        0.55,
        mats.orange,
        x + 0.15,
        1.08,
        0.22,
        "valve",
        12
      );

      moving.intakeValves.push(intakeValve);
      moving.exhaustValves.push(exhaustValve);

      // Valve springs.
      for (let v of [intakeValve, exhaustValve]) {
        ring(
          engineGroup,
          0.09,
          0.018,
          mats.metal,
          v.position.x,
          1.38,
          0.22,
          "valve"
        );
      }

      // Intake ports.
      rod(
        engineGroup,
        [x - 0.15, 1.0, 0.2],
        [x - 0.15, 1.0, 0.85],
        0.11,
        mats.blue,
        "intake"
      );

      // Exhaust ports.
      rod(
        engineGroup,
        [x + 0.15, 1.0, -0.2],
        [x + 0.15, 1.0, -0.85],
        0.11,
        mats.orange,
        "exhaust"
      );
    }

    // Cylinder head.
    box(engineGroup, 3.5, 0.4, 1.95, mats.metal, 0, 1.4, 0, "head");

    // Head bolts.
    for (let i = 0; i < 8; i++) {
      const x = -1.45 + i * 0.415;
      cylinder(
        engineGroup,
        0.065,
        0.065,
        0.1,
        mats.gold,
        x,
        1.64,
        0.83,
        "head",
        8
      );
    }

    // Valve cover.
    const cover = box(
      engineGroup,
      3.35,
      0.38,
      1.45,
      mats.dark,
      0,
      1.85,
      0,
      "head"
    );

    box(engineGroup, 2.8, 0.05, 0.08, mats.orange, 0, 2.05, 0, "head");

    // Camshafts.
    for (const z of [-0.42, 0.42]) {
      const cam = cylinder(
        engineGroup,
        0.11,
        0.11,
        3.4,
        mats.gold,
        0,
        1.85,
        z,
        "cam",
        20
      );

      cam.rotation.z = Math.PI / 2;
      moving.cams.push(cam);

      for (let i = 0; i < CYLINDERS; i++) {
        const x = -1.15 + i * 0.77;
        const lobe = sphere(
          engineGroup,
          0.17,
          mats.orange,
          x,
          1.85,
          z,
          "cam"
        );
        lobe.userData.camOffset = i * Math.PI / 2;
        moving.cams.push(lobe);
      }
    }

    // Crankshaft.
    moving.crank = cylinder(
      engineGroup,
      0.15,
      0.15,
      3.9,
      mats.gold,
      0,
      -1.0,
      0,
      "crank",
      20
    );

    moving.crank.rotation.z = Math.PI / 2;

    // Crank throws.
    for (let i = 0; i < CYLINDERS; i++) {
      const x = -1.15 + i * 0.77;

      cylinder(
        engineGroup,
        0.2,
        0.2,
        0.12,
        mats.gold,
        x,
        -1.0,
        0,
        "crank",
        20
      );
    }

    // Flywheel.
    moving.flywheel = cylinder(
      engineGroup,
      0.9,
      0.9,
      0.18,
      mats.dark,
      1.95,
      -1.0,
      0,
      "flywheel",
      48
    );

    moving.flywheel.rotation.z = Math.PI / 2;

    ring(engineGroup, 0.78, 0.07, mats.gold, 1.95, -1.0, 0, "flywheel");

    // Starter motor.
    const starter = cylinder(
      engineGroup,
      0.18,
      0.18,
      0.9,
      mats.black,
      1.6,
      -0.5,
      0.9,
      "flywheel",
      20
    );

    starter.rotation.x = Math.PI / 2;

    // Oil pan.
    box(engineGroup, 2.9, 0.45, 1.6, mats.dark, 0, -1.55, 0, "block");

    // Oil drain plug.
    cylinder(
      engineGroup,
      0.08,
      0.08,
      0.18,
      mats.gold,
      0,
      -1.8,
      0.75,
      "block",
      12
    );

    // Intake manifold.
    box(engineGroup, 3.0, 0.25, 0.4, mats.blue, 0, 1.1, 1.15, "intake");

    // Exhaust manifold.
    box(engineGroup, 3.0, 0.25, 0.4, mats.orange, 0, 1.1, -1.15, "exhaust");

    // Throttle body.
    cylinder(
      engineGroup,
      0.3,
      0.3,
      0.55,
      mats.dark,
      -1.65,
      1.1,
      1.15,
      "intake"
    ).rotation.x = Math.PI / 2;

    // Transmission.
    const transmission = sphere(
      engineGroup,
      1,
      mats.dark,
      2.85,
      -0.9,
      0,
      "transmission"
    );

    transmission.scale.set(1.1, 0.9, 1.0);

    // Transmission housing.
    box(
      engineGroup,
      1.6,
      1.3,
      1.6,
      mats.dark,
      2.75,
      -1.0,
      0,
      "transmission"
    );

    // Transmission output shaft.
    cylinder(
      engineGroup,
      0.12,
      0.12,
      1.6,
      mats.gold,
      3.5,
      -1.0,
      0,
      "transmission"
    ).rotation.z = Math.PI / 2;

    // Radiator.
    box(engineGroup, 0.35, 1.7, 1.8, mats.dark, -2.1, 0.3, 0, "radiator");

    // Radiator fins.
    for (let i = 0; i < 13; i++) {
      box(
        engineGroup,
        0.04,
        1.5,
        1.65,
        mats.aluminum,
        -2.3,
        0.3,
        -0.75 + i * 0.125,
        "radiator"
      );
    }

    // Cooling fan.
    const fanGroup = new THREE.Group();
    fanGroup.position.set(-2.45, 0.3, 0);
    engineGroup.add(fanGroup);

    cylinder(
      fanGroup,
      0.18,
      0.18,
      0.2,
      mats.gold,
      0,
      0,
      0,
      "radiator"
    );

    for (let i = 0; i < 6; i++) {
      const blade = box(
        fanGroup,
        0.75,
        0.07,
        0.22,
        mats.blue,
        0.35,
        0,
        0,
        "radiator"
      );

      blade.rotation.x = i * Math.PI / 3;
    }

    moving.fans.push(fanGroup);

    // Engine accessory belts.
    const belt = ring(
      engineGroup,
      0.52,
      0.055,
      mats.black,
      -1.65,
      -0.55,
      0.9,
      "crank"
    );

    belt.rotation.x = Math.PI / 2;
  }

  // ------------------------------------------------------------
  // CAR / DRIVETRAIN
  // ------------------------------------------------------------

  function createCar() {
    carGroup = new THREE.Group();
    scene.add(carGroup);

    // Chassis.
    box(carGroup, 6.7, 0.35, 2.5, mats.dark, 0, -1.2, 0);

    // Body.
    box(carGroup, 6.3, 0.65, 2.8, material(0x192d49, 0.6, 0.25), 0, -0.85, 0);

    // Cabin.
    const cabin = box(
      carGroup,
      3.1,
      1.2,
      2.3,
      material(0x183e62, 0.5, 0.2),
      -0.4,
      -0.1,
      0
    );

    // Windows.
    const glass = new THREE.MeshStandardMaterial({
      color: 0x5bbcff,
      metalness: 0.3,
      roughness: 0.1,
      transparent: true,
      opacity: 0.35
    });

    box(carGroup, 2.8, 0.8, 0.04, glass, -0.4, -0.05, 1.17);
    box(carGroup, 2.8, 0.8, 0.04, glass, -0.4, -0.05, -1.17);

    // Wheels.
    for (const x of [-2.25, 2.25]) {
      for (const z of [-1.55, 1.55]) {
        const wheelGroup = new THREE.Group();
        wheelGroup.position.set(x, -1.45, z);
        carGroup.add(wheelGroup);

        const tire = cylinder(
          wheelGroup,
          0.58,
          0.58,
          0.28,
          mats.rubber,
          0,
          0,
          0,
          "wheel",
          32
        );

        tire.rotation.x = Math.PI / 2;

        const rim = cylinder(
          wheelGroup,
          0.31,
          0.31,
          0.3,
          mats.aluminum,
          0,
          0,
          0,
          "wheel",
          24
        );

        rim.rotation.x = Math.PI / 2;

        for (let i = 0; i < 8; i++) {
          const spoke = box(
            wheelGroup,
            0.08,
            0.5,
            0.08,
            mats.gold,
            0,
            0.18,
            0
          );

          spoke.rotation.z = i * Math.PI / 4;
        }

        moving.wheels.push(wheelGroup);
      }
    }

    // Headlights.
    for (const z of [-0.85, 0.85]) {
      const light = sphere(
        carGroup,
        0.17,
        material(0xc9edff, 0.2, 0.15),
        3.05,
        -0.85,
        z
      );

      light.material.emissive = new THREE.Color(0x8acfff);
      light.material.emissiveIntensity = 1.5;
    }

    // Rear lights.
    for (const z of [-0.85, 0.85]) {
      const light = sphere(
        carGroup,
        0.14,
        mats.red,
        -3.05,
        -0.85,
        z
      );
    }

    // Driveshaft.
    rod(
      carGroup,
      [0.5, -1.25, 0],
      [-1.8, -1.25, 0],
      0.1,
      mats.gold
    );
  }

  // ------------------------------------------------------------
  // CONTROLS
  // ------------------------------------------------------------

  function createControls() {
    if (startButton) {
      startButton.addEventListener("click", () => {
        state.running = !state.running;

        if (state.running) {
          startButton.textContent = "STOP ENGINE";
          state.rpm = Math.max(state.rpm, 850);
        } else {
          startButton.textContent = "START ENGINE";
          state.rpm = 0;
          state.speed = 0;
        }
      });
    }

    if (throttleInput) {
      throttleInput.addEventListener("input", () => {
        state.throttle = Number(throttleInput.value) / 100;
        if (throttleOutput) {
          throttleOutput.textContent = Math.round(state.throttle * 100) + "%";
        }
      });

      state.throttle = Number(throttleInput.value) / 100 || 0.25;
    }

    if (slowInput) {
      slowInput.addEventListener("input", () => {
        state.slowMotion = Number(slowInput.value) / 100;
      });

      state.slowMotion = Number(slowInput.value) / 100 || 1;
    }

    if (autoInput) {
      autoInput.addEventListener("change", () => {
        state.automatic = autoInput.checked;
      });

      state.automatic = autoInput.checked;
    }

    if (engineModeButton) {
      engineModeButton.addEventListener("click", () => setMode(false));
    }

    if (driveModeButton) {
      driveModeButton.addEventListener("click", () => setMode(true));
    }

    if (gearsElement) {
      gearsElement.addEventListener("click", (event) => {
        const button = event.target.closest("[data-gear]");
        if (!button) return;
        setGear(Number(button.dataset.gear));
      });
    }

    // Keyboard controls.
    window.addEventListener("keydown", (event) => {
      state.keys[event.code] = true;

      if (event.code === "Space") {
        event.preventDefault();
        state.running = !state.running;
        if (startButton) {
          startButton.textContent = state.running ? "STOP ENGINE" : "START ENGINE";
        }
      }

      if (event.code === "ArrowUp") {
        state.throttle = clamp(state.throttle + 0.05, 0, 1);
      }

      if (event.code === "ArrowDown") {
        state.throttle = clamp(state.throttle - 0.05, 0, 1);
      }

      if (event.code === "KeyN") {
        setGear(0);
      }

      if (event.code.startsWith("Digit")) {
        const number = Number(event.code.slice(5));
        if (number >= 1 && number <= 5) setGear(number);
      }
    });

    window.addEventListener("keyup", (event) => {
      state.keys[event.code] = false;
    });

    // Mouse orbit controls.
    const canvas = renderer.domElement;

    canvas.addEventListener("pointerdown", (event) => {
      state.mouseDown = true;
      state.dragging = false;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!state.mouseDown) return;

      const dx = event.clientX - state.lastX;
      const dy = event.clientY - state.lastY;

      if (Math.abs(dx) + Math.abs(dy) > 3) {
        state.dragging = true;
      }

      state.cameraAngle -= dx * 0.006;
      state.cameraElevation = clamp(
        state.cameraElevation + dy * 0.004,
        -0.15,
        1.35
      );

      state.lastX = event.clientX;
      state.lastY = event.clientY;

      updateCamera();
    });

    canvas.addEventListener("pointerup", (event) => {
      if (!state.dragging) {
        inspectObject(event);
      }

      state.mouseDown = false;
    });

    canvas.addEventListener("wheel", (event) => {
      state.cameraDistance = clamp(
        state.cameraDistance + event.deltaY * 0.008,
        5,
        22
      );

      updateCamera();
    }, { passive: true });

    canvas.addEventListener("dblclick", () => {
      state.cameraAngle = -0.7;
      state.cameraElevation = 0.55;
      state.cameraDistance = 11;
      updateCamera();
    });
  }

  // ------------------------------------------------------------
  // MODE AND GEAR MANAGEMENT
  // ------------------------------------------------------------

  function setMode(drive) {
    state.driveMode = drive;

    if (engineModeButton) {
      engineModeButton.classList.toggle("active", !drive);
    }

    if (driveModeButton) {
      driveModeButton.classList.toggle("active", drive);
    }

    if (carGroup) {
      carGroup.visible = drive;
    }

    if (engineGroup) {
      engineGroup.visible = true;
    }

    if (tip) {
      tip.textContent = drive
        ? "DRIVING MODE • Use throttle and gears to drive"
        : "ENGINE MODE • Click engine components to inspect";
    }
  }

  function setGear(gear) {
    state.gear = clamp(gear, 0, 5);

    if (gearText) {
      gearText.textContent = state.gear === 0 ? "N" : state.gear;
    }

    if (gearsElement) {
      gearsElement.querySelectorAll("[data-gear]").forEach((button) => {
        button.classList.toggle(
          "active",
          Number(button.dataset.gear) === state.gear
        );
      });
    }
  }

  // ------------------------------------------------------------
  // PART INSPECTION
  // ------------------------------------------------------------

  function createPartsList() {
    if (!partsPanel) return;

    partsPanel.innerHTML = "";

    Object.entries(PARTS).forEach(([key, info]) => {
      const button = document.createElement("button");
      button.className = "part-button";
      button.textContent = info[0];
      button.addEventListener("click", () => selectPart(key));
      partsPanel.appendChild(button);
    });
  }

  function selectPart(key) {
    const info = PARTS[key];
    if (!info) return;

    state.selected = key;

    if (detailPanel) {
      detailPanel.innerHTML = `
        <h3>${info[0]}</h3>
        <p>${info[1]}</p>
      `;
    }

    if (partsPanel) {
      partsPanel.querySelectorAll("button").forEach((button) => {
        button.classList.toggle(
          "active",
          button.textContent === info[0]
        );
      });
    }

    // Highlight selected component.
    engineParts.forEach((mesh) => {
      if (!mesh.material) return;

      if (!mesh.userData.originalColor) {
        mesh.userData.originalColor = mesh.material.color.clone();
      }

      if (mesh.userData.part === key) {
        mesh.material.emissive = new THREE.Color(0x167bff);
        mesh.material.emissiveIntensity = 0.45;
      } else if (mesh.material.emissive) {
        mesh.material.emissiveIntensity = 0;
      }
    });
  }

  function inspectObject(event) {
    const rect = renderer.domElement.getBoundingClientRect();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(clickableParts, false);

    if (hits.length) {
      const key = hits[0].object.userData.part;
      if (key) selectPart(key);
    }
  }

  // ------------------------------------------------------------
  // CAMERA
  // ------------------------------------------------------------

  function updateCamera() {
    if (!camera) return;

    const horizontal = Math.cos(state.cameraElevation) * state.cameraDistance;

    camera.position.set(
      Math.sin(state.cameraAngle) * horizontal,
      Math.sin(state.cameraElevation) * state.cameraDistance + 0.2,
      Math.cos(state.cameraAngle) * horizontal
    );

    camera.lookAt(0.1, 0, 0);
  }

  function resize() {
    if (!renderer || !camera) return;

    const width = view.clientWidth;
    const height = view.clientHeight;

    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  // ------------------------------------------------------------
  // ENGINE ANIMATION
  // ------------------------------------------------------------

  function updateEngine(delta) {
    const idleRPM = 850;
    const maxRPM = 7000;

    if (state.running) {
      const targetRPM = idleRPM + state.throttle * (maxRPM - idleRPM);

      state.rpm = lerp(
        state.rpm,
        targetRPM,
        Math.min(delta * 3.5, 1)
      );
    } else {
      state.rpm = lerp(state.rpm, 0, Math.min(delta * 4, 1));
    }

    const rotationSpeed = (state.rpm / 60) * Math.PI * 2;

    state.engineAngle += rotationSpeed * delta * state.slowMotion;
    state.camAngle += rotationSpeed * 0.5 * delta * state.slowMotion;

    if (moving.crank) {
      moving.crank.rotation.x = state.engineAngle;
    }

    if (moving.flywheel) {
      moving.flywheel.rotation.x = state.engineAngle;
    }

    moving.cams.forEach((cam) => {
      if (cam.geometry.type === "CylinderGeometry") {
        cam.rotation.x = state.camAngle;
      }
    });

    // Piston movement.
    moving.pistons.forEach((piston, i) => {
      const angle = state.engineAngle + piston.offset;
      const position = Math.cos(angle);

      const y = -0.05 + position * 0.48;

      piston.mesh.position.y = y;

      piston.rings.forEach((r, index) => {
        r.position.y = y + (index - 1) * 0.065;
      });

      const rodData = moving.rods[i];

      if (rodData) {
        const crankX = piston.x + Math.sin(angle) * 0.25;
        const crankY = -0.85 - Math.cos(angle) * 0.25;

        const start = new THREE.Vector3(piston.x, y - 0.1, 0);
        const end = new THREE.Vector3(crankX, crankY, 0);

        const direction = new THREE.Vector3().subVectors(end, start);

        rodData.mesh.position.copy(start).add(end).multiplyScalar(0.5);
        rodData.mesh.scale.y = direction.length() / 1;
        rodData.mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.normalize()
        );

        rodData.top.position.copy(start);
        rodData.bottom.position.copy(end);
      }

      // Valve movement.
      const intake = moving.intakeValves[i];
      const exhaust = moving.exhaustValves[i];

      if (intake && exhaust) {
        const cycle = (angle % (Math.PI * 4) + Math.PI * 4) % (Math.PI * 4);

        const intakeOpen = cycle > Math.PI * 1.4 && cycle < Math.PI * 2.2;
        const exhaustOpen = cycle > Math.PI * 3.2 && cycle < Math.PI * 3.9;

        intake.position.y = 1.08 - (intakeOpen ? 0.13 : 0);
        exhaust.position.y = 1.08 - (exhaustOpen ? 0.13 : 0);
      }

      // Spark animation.
      const spark = moving.sparks[i];

      if (spark) {
        const cycle = (angle % (Math.PI * 4) + Math.PI * 4) % (Math.PI * 4);
        const ignition = cycle > Math.PI * 2 && cycle < Math.PI * 2.13;

        spark.material.emissiveIntensity =
          ignition && state.running ? 5 : 0;
      }
    });

    // Cooling fan.
    moving.fans.forEach((fan) => {
      fan.rotation.x += rotationSpeed * delta * 0.12;
    });

    // RPM display.
    if (rpmElement) {
      rpmElement.textContent = Math.round(state.rpm).toLocaleString();
    }

    if (powerBar) {
      powerBar.style.width =
        clamp((state.rpm / maxRPM) * 100, 0, 100) + "%";
    }
  }

  // ------------------------------------------------------------
  // DRIVING PHYSICS
  // ------------------------------------------------------------

  function updateDriving(delta) {
    if (!state.driveMode) {
      state.speed = lerp(state.speed, 0, delta * 2);
      return;
    }

    const gearRatios = [0, 3.2, 2.1, 1.5, 1.1, 0.85];
    const ratio = gearRatios[state.gear] || 0;

    const gas = state.running ? state.throttle : 0;

    const braking = state.keys["ArrowDown"] ? 1 : 0;
    const acceleration =
      gas * ratio * 2.1 * (state.clutch > 0.5 ? 0 : 1);

    state.speed += acceleration * delta;
    state.speed -= braking * delta * 8;
    state.speed -= delta * 0.2;

    state.speed = clamp(state.speed, 0, 240);

    if (state.automatic && state.running) {
      if (state.rpm > 6200 && state.gear < 5) {
        setGear(state.gear + 1);
      }

      if (state.rpm < 1700 && state.gear > 1) {
        setGear(state.gear - 1);
      }
    }

    // Wheel rotation.
    moving.wheels.forEach((wheel) => {
      wheel.rotation.x -= state.speed * delta * 0.1;
    });

    // Steering.
    const steerInput =
      (state.keys["ArrowLeft"] ? 1 : 0) -
      (state.keys["ArrowRight"] ? 1 : 0);

    state.steering = lerp(
      state.steering,
      steerInput * 0.45,
      delta * 5
    );

    if (speedElement) {
      speedElement.textContent = Math.round(state.speed);
    }

    if (gearText) {
      gearText.textContent = state.gear === 0 ? "N" : state.gear;
    }
  }

  // ------------------------------------------------------------
  // FOUR-STROKE CYCLE DISPLAY
  // ------------------------------------------------------------

  function updateStrokeDisplay() {
    if (!strokesElement) return;

    const cycle = (
      (state.engineAngle / (Math.PI * 4)) % 1 + 1
    ) % 1;

    const stage = Math.floor(cycle * 4);

    const labels = [
      "INTAKE",
      "COMPRESSION",
      "POWER",
      "EXHAUST"
    ];

    const label = labels[stage];

    strokesElement.textContent = label;

    if (chipsElement) {
      chipsElement.textContent = "FIRING ORDER: 1 - 3 - 4 - 2";
    }
  }

  // ------------------------------------------------------------
  // ANIMATION LOOP
  // ------------------------------------------------------------

  function animate() {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
    }

    const frame = () => {
      animationFrame = requestAnimationFrame(frame);

      if (document.hidden) return;

      const delta = Math.min(clock.getDelta(), 0.05) * state.slowMotion;

      state.elapsed += delta;

      updateEngine(delta);
      updateDriving(delta);
      updateStrokeDisplay();

      if (throttleOutput && throttleInput) {
        throttleOutput.textContent =
          Math.round(Number(throttleInput.value)) + "%";
      }

      renderer.render(scene, camera);
    };

    frame();
  }

  // ------------------------------------------------------------
  // VISIBILITY AND CLEANUP
  // ------------------------------------------------------------

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && renderer) {
      clock.getDelta();
      renderer.render(scene, camera);
    }
  });

  window.addEventListener("beforeunload", () => {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
    }

    if (renderer) {
      renderer.dispose();
    }
  });

  // ------------------------------------------------------------
  // START
  // ------------------------------------------------------------

  init();

})();
