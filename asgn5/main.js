// main.js
import * as THREE from 'three';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

let scene, camera, renderer, controls;
const animatedObjects = [];
const clock = new THREE.Clock();
let sceneContainer;

// Globals for Raycasting and interactive switch (Wow Point)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let interactiveSwitch; // Will be assigned in init()
const stageSpotLights = []; 

// --- Configuration for your OBJ models ---
const beerPongTablePath = './models/beerpong/';
const beerPongTableOBJ = 'beerpong_table.obj';
const beerPongTableMTL = 'beerpong_table.mtl';

const djSetupPath = './models/dj_setup/';
const djSetupOBJ = 'dj_booth.obj';
const djSetupMTL = 'dj_booth.mtl';


function init() {
    sceneContainer = document.getElementById('scene-container');
    if (!sceneContainer) {
        console.error("CRITICAL ERROR: Scene container div not found!");
        sceneContainer = document.body; 
        alert("Error: Scene container not found. Renderer will append to body.");
    }

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050010);

    // REQUIREMENT: A textured skybox
    const skyboxImagePaths = [
        './skybox/px.png', './skybox/nx.png',
        './skybox/py.png', './skybox/ny.png',
        './skybox/pz.png', './skybox/nz.png'
    ];
    const skyboxLoader = new THREE.CubeTextureLoader();
    skyboxLoader.load(skyboxImagePaths, (texture) => {
        scene.background = texture; console.log("Skybox loaded.");
    }, undefined, (err) => {
        console.error("Skybox load failed:", err);
        scene.background = new THREE.Color(0x110011); 
    });

    // REQUIREMENT: A camera with perspective projection
    // 2. Camera
    camera = new THREE.PerspectiveCamera(75, sceneContainer.clientWidth / sceneContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 10);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    renderer.setPixelRatio(1); 
    renderer.shadowMap.enabled = false; 
    sceneContainer.appendChild(renderer.domElement); 
    renderer.domElement.setAttribute('tabindex', '0');

    // REQUIREMENT: Controls to navigate the scene with the mouse
    // 4. Controls - FirstPersonControls
    controls = new FirstPersonControls(camera, renderer.domElement);
    controls.movementSpeed = 10;
    controls.lookSpeed = 0.2; 
    controls.activeLook = true; 
    controls.noFly = true;
    controls.lookVertical = true;
    controls.constrainVertical = true;
    controls.verticalMin = 0.1;
    controls.verticalMax = Math.PI - 0.1;

    // REQUIREMENT: At least three different light sources
    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0x505050, 1.1);        
    scene.add(ambientLight);
    const hemisphereLight = new THREE.HemisphereLight(0x607080, 0x151520, 1.3); 
    scene.add(hemisphereLight);
    const moonLight = new THREE.DirectionalLight(0x8090ff, 1.5);      
    moonLight.position.set(10, 20, 7);
    scene.add(moonLight);

    const shapes = [];
    // Spotlight Cones and Lights - Mounted on Stage
    const stageEdgeZ = -4.5 + 3/2 - 0.1; 
    const stageSurfaceY = 0.2 + 0.4/2 + 0.1; 
    const spotLightPositionsNew = [ {x: -1.5, y: stageSurfaceY, z: stageEdgeZ}, {x: 1.5, y: stageSurfaceY, z: stageEdgeZ} ];
    const stageLightColors = [0xff00ff, 0x00ffff]; 

    spotLightPositionsNew.forEach((pos, index) => {
        const spotLightConeGeo = new THREE.CylinderGeometry(0.15, 0.05, 0.4, 8);
        const spotLightConeMat = new THREE.MeshStandardMaterial({emissive: stageLightColors[index], emissiveIntensity: 1});
        const spotLightCone = new THREE.Mesh(spotLightConeGeo, spotLightConeMat);
        spotLightCone.position.set(pos.x, pos.y, pos.z);
        spotLightCone.rotation.x = Math.PI / 2.5;
        scene.add(spotLightCone); shapes.push(spotLightCone);

        const lightSourceOffset = new THREE.Vector3(0, -0.2, 0.1).applyEuler(spotLightCone.rotation);
        const lightSourcePos = spotLightCone.position.clone().add(lightSourceOffset);
        const spotLight = new THREE.SpotLight(stageLightColors[index], 8, 22, Math.PI / 6, 0.35, 1.5); 
        spotLight.position.copy(lightSourcePos);
        spotLight.target.position.set(pos.x, 0, -1);
        scene.add(spotLight); scene.add(spotLight.target);
        
        stageSpotLights.push({ light: spotLight, cone: spotLightCone, target: spotLight.target });

        animatedObjects.push({ mesh: spotLight, targetObj: spotLight.target, action: (time) => {
            if (spotLight.visible) { 
                spotLight.target.position.x = Math.sin(time*0.4+index*Math.PI)*5;
                spotLight.target.position.z = -1 + Math.cos(time*0.25+index*Math.PI*0.5)*3;
            }
        }});
    });

    // 6. Primary Shapes & Scene Elements
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x202025, side: THREE.DoubleSide });
    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    scene.add(groundPlane); shapes.push(groundPlane);

    const stageGeo = new THREE.BoxGeometry(6, 0.4, 3);
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x333338 });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    const stageYPos = 0.2;
    stage.position.set(0, stageYPos, -4.5);
    scene.add(stage); shapes.push(stage);

    const djTableGeo = new THREE.BoxGeometry(2, 0.7, 1);
    const djTableMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e });
    const djTable = new THREE.Mesh(djTableGeo, djTableMat);
    const djTableYPos = stageYPos + stageGeo.parameters.height / 2 + djTableGeo.parameters.height / 2;
    djTable.position.set(0, djTableYPos, stage.position.z + 0.3);
    scene.add(djTable); shapes.push(djTable);

    const djSetupModelYOffset = 0.05;
    const djSetupScale = new THREE.Vector3(0.8, 0.8, 0.8);
    loadAndPlaceOBJModel(djSetupPath, djSetupOBJ, djSetupMTL, new THREE.Vector3(djTable.position.x, djTable.position.y + djTableGeo.parameters.height / 2 + djSetupModelYOffset, djTable.position.z), djSetupScale, "DJ Setup");

    const beerPongTableScale = new THREE.Vector3(10, 10, 10);
    const beerPongTableBaseY = 0.02;
    loadAndPlaceOBJModel(beerPongTablePath, beerPongTableOBJ, beerPongTableMTL, new THREE.Vector3(-5, beerPongTableBaseY, 4), beerPongTableScale, "Beer Pong Table");
        
    const speakerGeo = new THREE.BoxGeometry(0.8, 1.5, 0.6);
    const speakerMat = new THREE.MeshStandardMaterial({ color: 0x181818 });
    const speaker1 = new THREE.Mesh(speakerGeo, speakerMat);
    speaker1.position.set(-3, 0.75, -4); scene.add(speaker1); shapes.push(speaker1);
    const speaker2 = new THREE.Mesh(speakerGeo, speakerMat);
    speaker2.position.set(3, 0.75, -4); scene.add(speaker2); shapes.push(speaker2);

    const blanketGeo=new THREE.PlaneGeometry(2,2); 
    const width=2,height=2;const size=width*height;const data=new Uint8Array(3*size); const tColors=[new THREE.Color(0x440000),new THREE.Color(0x111111)];
    for(let i=0;i<size;i++){const s=i*3;const x=i%width;const y=Math.floor(i/width);const c=tColors[(x+y)%2];data[s]=Math.floor(c.r*255);data[s+1]=Math.floor(c.g*255);data[s+2]=Math.floor(c.b*255);}
    const procTexture=new THREE.DataTexture(data,width,height,THREE.RGBFormat); procTexture.needsUpdate=true;procTexture.magFilter=THREE.NearestFilter;
    const texturedBlanketMat=new THREE.MeshStandardMaterial({map:procTexture});
    const blanket1=new THREE.Mesh(blanketGeo,texturedBlanketMat); blanket1.rotation.x=-Math.PI/2;blanket1.position.set(4,0.01,4);
    scene.add(blanket1);shapes.push(blanket1);

    const balloonGeo=new THREE.SphereGeometry(0.4,8,4);
    const balloonMat=new THREE.MeshPhongMaterial({color:0xaa0000,shininess:30});
    const balloon=new THREE.Mesh(balloonGeo,balloonMat);
    balloon.position.set(-6,3.5,7); 
    scene.add(balloon);shapes.push(balloon); 
    const stringGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 5); 
    const stringMat = new THREE.MeshBasicMaterial({color: 0x222222});
    const balloonString = new THREE.Mesh(stringGeo, stringMat);
    balloonString.position.y = - (balloonGeo.parameters.radius + stringGeo.parameters.height / 2) + 0.05; 
    balloon.add(balloonString); shapes.push(balloonString); 
    balloon.userData.initialY=balloon.position.y;
    animatedObjects.push({mesh:balloon,action:(t)=>{balloon.position.y=balloon.userData.initialY+Math.sin(t*1.5)*0.2;balloon.rotation.y+=0.005;}});
    
    const decorativeConeGeo = new THREE.ConeGeometry(0.3,0.7,6);
    const decorativeConeMat = new THREE.MeshStandardMaterial({color:0x008080});
    const cone1 = new THREE.Mesh(decorativeConeGeo,decorativeConeMat); cone1.position.set(5,0.35,-2);scene.add(cone1);shapes.push(cone1);
    const cone2 = new THREE.Mesh(decorativeConeGeo,decorativeConeMat); cone2.position.set(-5,0.35,-2);scene.add(cone2);shapes.push(cone2);

    // Attached String Lights (Visual Bulbs + Few Actual Point Lights)
    const wireMat = new THREE.MeshBasicMaterial({color: 0x222222});
    const bulbEmissiveMat = new THREE.MeshBasicMaterial({color: 0xffff88}); 
    const bulbRadius = 0.08; const wireRadius = 0.01;
    const lightStrandsDef = [
        { start: speaker1.position.clone().setY(2.0), end: djTable.position.clone().setY(2.2), bulbs: 7, addLightsAt: [2,5] },
        { start: speaker2.position.clone().setY(2.0), end: djTable.position.clone().setY(2.2), bulbs: 7, addLightsAt: [2,5] },
        { start: new THREE.Vector3(-2, 2.8, -3.0), end: new THREE.Vector3(2, 2.8, -3.0), bulbs: 9, addLightsAt: [1,4,7] }
    ];
    lightStrandsDef.forEach(def => {
        const distance = def.start.distanceTo(def.end);
        const wireGeo = new THREE.CylinderGeometry(wireRadius, wireRadius, distance, 6);
        const wire = new THREE.Mesh(wireGeo, wireMat);
        wire.position.lerpVectors(def.start, def.end, 0.5);
        wire.lookAt(def.end); wire.rotateX(Math.PI / 2);
        scene.add(wire); shapes.push(wire);
        for (let i = 0; i <= def.bulbs; i++) {
            const t = i / def.bulbs;
            const bulbPos = new THREE.Vector3().lerpVectors(def.start, def.end, t);
            bulbPos.y -= Math.sin(t * Math.PI) * (distance * 0.05);
            const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(bulbRadius, 6, 3), bulbEmissiveMat);
            bulbMesh.position.copy(bulbPos);
            scene.add(bulbMesh); shapes.push(bulbMesh);
            if (def.addLightsAt && def.addLightsAt.includes(i)) {
                const pointLight = new THREE.PointLight(0xffddaa, 0.9, 7, 1.8);
                pointLight.position.copy(bulbPos);
                scene.add(pointLight);
            }
        }
    });
    
    // Pizza Boxes with Texture
    const pizzaBoxGeo = new THREE.BoxGeometry(0.5, 0.04, 0.5); 
    const pizzaBoxMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./textures/pizzabox.png',
        function (loadedTexture) {
            pizzaBoxMat.map = loadedTexture;
            pizzaBoxMat.roughness = 0.9; pizzaBoxMat.metalness = 0.05;
            pizzaBoxMat.needsUpdate = true; console.log("Pizza box texture ('pizzabox.png') loaded and applied.");
        }, undefined, function (err) {
            console.error("Error loading 'pizzabox.png'. Using fallback color. CHECK PATH: './textures/pizzabox.png'", err);
            pizzaBoxMat.color.set(0xccaa88); pizzaBoxMat.needsUpdate = true;
        }
    );
    for (let i = 0; i < 4; i++) {
        const pizzaBox = new THREE.Mesh(pizzaBoxGeo, pizzaBoxMat);
        pizzaBox.position.set((Math.random()-0.5)*7,0.02,((Math.random()-0.5)*7)+1);
        pizzaBox.rotation.y = Math.random()*Math.PI; pizzaBox.rotation.z = (Math.random()-0.5)*0.3;
        scene.add(pizzaBox); shapes.push(pizzaBox);
    }

    const kegGeo = new THREE.CylinderGeometry(0.3,0.3,0.6,10); const kegTopGeo = new THREE.CylinderGeometry(0.22,0.22,0.05,10);
    const kegMat = new THREE.MeshStandardMaterial({color:0xb0c4de,metalness:0.9,roughness:0.2});
    const kegPositions = [[3.5,0.3,-7], [-3.5,0.3,-7], [5,0.3,5]];
    kegPositions.forEach(pos => {const keg=new THREE.Mesh(kegGeo,kegMat); const kegTop=new THREE.Mesh(kegTopGeo,kegMat);
    keg.position.fromArray(pos);kegTop.position.set(keg.position.x,keg.position.y+0.3+0.025,keg.position.z);
    scene.add(keg);shapes.push(keg);scene.add(kegTop);shapes.push(kegTop);});

    const pyramidCupGeo = new THREE.CylinderGeometry(0.05,0.04,0.12,6); const pyramidCupMat = new THREE.MeshStandardMaterial({color:0xDD0000});
    const basePyramidY = djTableYPos + djTableGeo.parameters.height/2 + pyramidCupGeo.parameters.height/2;
    let cupPyramidPositions = [[0,0],[1,0],[-1,0],[0.5,1],[-0.5,1],[0,2]];
    cupPyramidPositions.forEach(pos=>{const cup=new THREE.Mesh(pyramidCupGeo,pyramidCupMat);
    cup.position.set(djTable.position.x+pos[0]*(pyramidCupGeo.parameters.topRadius*1.8),basePyramidY+pos[1]*(pyramidCupGeo.parameters.height*0.85),djTable.position.z+0.3);
    scene.add(cup);shapes.push(cup);});

    const wallGeo = new THREE.BoxGeometry(5,3,0.2); const wallMat = new THREE.MeshStandardMaterial({color:0x303035});
    const backWall = new THREE.Mesh(wallGeo,wallMat); backWall.position.set(0,1.5,-9); scene.add(backWall);shapes.push(backWall);
    const neonSignGeo = new THREE.PlaneGeometry(2,0.5); const neonSignMat = new THREE.MeshBasicMaterial({color:0xff00ff,emissive:0xff00ff,emissiveIntensity:2,transparent:true,opacity:0.8});
    const neonSign = new THREE.Mesh(neonSignGeo,neonSignMat); neonSign.position.set(0,2,-8.88); scene.add(neonSign);shapes.push(neonSign);
    
    const bottleGeo = new THREE.CylinderGeometry(0.03,0.025,0.2,6); const bottleColors = [0x228B22,0x8B4513,0x708090];
    for(let i=0;i<5;i++){const mat=new THREE.MeshStandardMaterial({color:bottleColors[i%bottleColors.length],roughness:0.3,metalness:0.1});
    const bottle=new THREE.Mesh(bottleGeo,mat);bottle.position.set((Math.random()-0.5)*10,0.1,(Math.random()-0.5)*6+3);
    bottle.rotation.z=(Math.random()-0.5)*0.5;bottle.rotation.x=(Math.random()-0.5)*0.2;scene.add(bottle);shapes.push(bottle);}

    const coolerGeo = new THREE.BoxGeometry(0.8,0.5,0.4); const lidGeo = new THREE.BoxGeometry(0.82,0.1,0.42);
    const coolerMat = new THREE.MeshStandardMaterial({color:0x0047AB});
    const cooler=new THREE.Mesh(coolerGeo,coolerMat);cooler.position.set(5,0.25,6);scene.add(cooler);shapes.push(cooler);
    const lid=new THREE.Mesh(lidGeo,coolerMat);lid.position.set(5,0.5+0.05,6);lid.rotation.x=-0.2;scene.add(lid);shapes.push(lid);

    const tcGeo = new THREE.CylinderGeometry(0.3,0.25,0.8,10); const tcMat = new THREE.MeshStandardMaterial({color:0x333333});
    for(let i=0;i<2;i++){const tc=new THREE.Mesh(tcGeo,tcMat);tc.position.set(i===0?7:-7,0.4,0);scene.add(tc);shapes.push(tc);
    for(let j=0;j<3;j++){const trGeo=Math.random()>0.5?new THREE.SphereGeometry(0.1,5,3):new THREE.BoxGeometry(0.15,0.2,0.15);
    const trMat=new THREE.MeshStandardMaterial({color:Math.random()*0xffffff,roughness:0.8});const tr=new THREE.Mesh(trGeo,trMat);
    tr.position.set(tc.position.x+(Math.random()-0.5)*0.2,tc.position.y+0.2+(Math.random()-0.5)*0.2,tc.position.z+(Math.random()-0.5)*0.2);
    tr.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);scene.add(tr);shapes.push(tr);}}
    
    console.log("Total distinct primitive meshes counted in 'shapes' array:", shapes.length);

    // REQUIREMENT: Wow Point - Interactive Light Switch for Stage Spotlights
    const switchGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const switchMatOn = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00cc00, emissiveIntensity: 0.6 });
    const switchMatOff = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xcc0000, emissiveIntensity: 0.6 });

    interactiveSwitch = new THREE.Mesh(switchGeo, switchMatOn); // Assign to global, start with 'on' material
    interactiveSwitch.position.set(
        djTable.position.x + djTableGeo.parameters.width / 2 - 0.15,
        djTable.position.y + djTableGeo.parameters.height / 2 + 0.05,
        djTable.position.z + djTableGeo.parameters.depth / 2 - 0.1
    );
    interactiveSwitch.name = "stageLightSwitch";
    scene.add(interactiveSwitch);
    shapes.push(interactiveSwitch);

    interactiveSwitch.userData.matOn = switchMatOn;
    interactiveSwitch.userData.matOff = switchMatOff;

    // Set initial switch material based on actual light visibility
    if (stageSpotLights.length > 0 && stageSpotLights[0].light.visible) {
        interactiveSwitch.material = interactiveSwitch.userData.matOn;
    } else {
        interactiveSwitch.material = interactiveSwitch.userData.matOff;
        // Ensure lights are actually off if switch material is off
        stageSpotLights.forEach(sl => {
            sl.light.visible = false;
            sl.cone.visible = false;
        });
    }
    
    window.addEventListener('resize', onWindowResize, false);
    renderer.domElement.addEventListener('click', onMouseClickWowPoint, false);
    animate();
}

function onMouseClickWowPoint(event) {
    if (!interactiveSwitch) return; // Guard if switch not initialized

    const rect = sceneContainer.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / sceneContainer.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / sceneContainer.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(interactiveSwitch, false);

    if (intersects.length > 0) {
        console.log("Stage light switch clicked!");
        const currentlyVisible = stageSpotLights.length > 0 && stageSpotLights[0].light.visible;
        stageSpotLights.forEach(sl => {
            sl.light.visible = !currentlyVisible;
            sl.cone.visible = !currentlyVisible;
        });

        if (!currentlyVisible) {
            interactiveSwitch.material = interactiveSwitch.userData.matOn;
        } else {
            interactiveSwitch.material = interactiveSwitch.userData.matOff;
        }
       
    }
}


function loadAndPlaceOBJModel(path, objFile, mtlFile, position, scale, name) {
    console.log(`Attempting to load ${name}: ${path}${objFile} with scale ${scale.x},${scale.y},${scale.z}`);
    const placeholderMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, wireframe: false });
    const placeholderGeo = new THREE.BoxGeometry(1,1,1);
    const placeholderGroup = new THREE.Group();
    placeholderGroup.name = `PlaceholderGroup for ${name}`;
    const placeholderMesh = new THREE.Mesh(placeholderGeo, placeholderMat);
    placeholderMesh.name = `PlaceholderMesh for ${name}`;
    placeholderGroup.add(placeholderMesh);
    placeholderGroup.position.copy(position);
    placeholderGroup.scale.copy(scale);
    scene.add(placeholderGroup);

    const mtlLoader = new MTLLoader();
    mtlLoader.setPath(path);
    mtlLoader.load(mtlFile, (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath(path);
        objLoader.load(objFile, (object) => {
            scene.remove(placeholderGroup);
            object.scale.copy(scale);
            object.position.copy(position);
            object.name = name;
            scene.add(object);
            console.log(`${name} OBJ model loaded successfully!`);
        }, undefined, (e) => console.error(`[${name}] Error loading OBJ:`,e));
    }, undefined, (e) => {
        console.warn(`[${name}] MTL failed. Loading OBJ with default. Error:`,e);
        const objLoader = new OBJLoader();
        objLoader.setPath(path);
        objLoader.load(objFile, (object) => {
            scene.remove(placeholderGroup);
            object.scale.copy(scale);
            object.position.copy(position);
            object.name = name;
            object.traverse(c => {if (c instanceof THREE.Mesh){
                if(!c.material||(Array.isArray(c.material)&&!c.material.length)){c.material=new THREE.MeshStandardMaterial({color:0xaaaaaa});}
            }});
            scene.add(object);
        }, undefined, (eObj) => console.error(`[${name}] OBJ (no MTL) failed:`,eObj));
    });
}

function onWindowResize() {
    if (sceneContainer) { 
        camera.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    controls.update(delta); 
    animatedObjects.forEach(obj => obj.action(clock.getElapsedTime()));
    renderer.render(scene, camera);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}