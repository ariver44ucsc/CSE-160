// main.js
import * as THREE from 'three';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

let scene, camera, renderer, controls;
const animatedObjects = [];
const clock = new THREE.Clock();

// --- Configuration for your OBJ models ---
const beerPongTablePath = './models/beerpong/';
const beerPongTableOBJ = 'beerpong_table.obj';
const beerPongTableMTL = 'beerpong_table.mtl';
const BEER_PONG_TABLE_ORIGINAL_SURFACE_HEIGHT = 0.75; // Adjust this!

const djSetupPath = './models/dj_setup/';
const djSetupOBJ = 'dj_booth.obj';
const djSetupMTL = 'dj_booth.mtl';


function init() {
    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050010); // Fallback, skybox preferred

    // REQUIREMENT: A textured skybox
    const skyboxImagePaths = [ /* ... your 6 skybox image paths ... */ ];
    const skyboxLoader = new THREE.CubeTextureLoader();
    skyboxLoader.load(skyboxImagePaths, (texture) => {
        scene.background = texture; console.log("Skybox loaded.");
    }, undefined, (err) => {
        console.error("Skybox failed to load: ", err);
    });

    // REQUIREMENT: A camera with perspective projection
    // 2. Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 10);

    // 3. Renderer (Performance Optimized)
    renderer = new THREE.WebGLRenderer({ antialias: false }); // PERFORMANCE: antialias off
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1); // PERFORMANCE: Render at 1:1 pixel ratio
    
    // PERFORMANCE: Shadows completely disabled
    renderer.shadowMap.enabled = false; 
    // renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Not needed if shadows are off

    document.body.appendChild(renderer.domElement);

    // REQUIREMENT: Controls to navigate the scene with the mouse
    // 4. Controls - FirstPersonControls
    controls = new FirstPersonControls(camera, renderer.domElement);
    controls.movementSpeed = 10;
    controls.lookSpeed = 0.075;
    controls.activeLook = true;
    controls.noFly = true;
    controls.lookVertical = true;
    controls.constrainVertical = true;
    controls.verticalMin = 0.1;
    controls.verticalMax = Math.PI - 0.1;

    // REQUIREMENT: At least three different light sources
    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0x707080, 1.2); // Slightly brighter ambient
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x8090a0, 0x202025, 1.5);
    scene.add(hemisphereLight);

    // Only one directional light, not casting shadows now
    const moonLight = new THREE.DirectionalLight(0xaaaaff, 1.8);
    moonLight.position.set(10, 20, 7);
    moonLight.castShadow = false; // PERFORMANCE: No shadows from this light
    scene.add(moonLight);

    // String Lights - Now with Poles and Instanced Bulbs
    const shapes = []; // For counting non-instanced primary shapes
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.5, 6); // PERFORMANCE: Low segments
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const polePositions = [
        new THREE.Vector3(-8, 3.5/2, -2), new THREE.Vector3(0, 3.5/2, -8), new THREE.Vector3(8, 3.5/2, -2),
    ];
    polePositions.forEach(pos => {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.copy(pos);
        // pole.castShadow = false; // No shadows in scene
        scene.add(pole); shapes.push(pole);
    });

    const bulbGeo = new THREE.SphereGeometry(0.15, 8, 4); // PERFORMANCE: Low segments
    const stringLightMaterial = new THREE.MeshStandardMaterial({ emissive: 0xffff00, emissiveIntensity: 1 });
    const lightStrings = [
        { start: polePositions[0].clone().setY(3.2), end: new THREE.Vector3(-2, 3.2, -4.5), bulbs: 5 },
        { start: polePositions[1].clone().setY(3.4), end: new THREE.Vector3(0, 3.4, -4.5), bulbs: 6 },
        { start: polePositions[2].clone().setY(3.2), end: new THREE.Vector3(2, 3.2, -4.5), bulbs: 5 },
        { start: polePositions[0].clone().setY(3.3), end: polePositions[1].clone().setY(3.3), bulbs: 7},
        { start: polePositions[1].clone().setY(3.3), end: polePositions[2].clone().setY(3.3), bulbs: 7},
    ];

    const allBulbPositions = [];
    lightStrings.forEach(str => {
        for (let i = 0; i <= str.bulbs; i++) {
            const t = i / str.bulbs;
            const bulbPos = new THREE.Vector3().lerpVectors(str.start, str.end, t);
            bulbPos.y -= Math.sin(t * Math.PI) * 0.3;
            allBulbPositions.push(bulbPos);

            // PointLights for illumination (no shadows)
            const pointLight = new THREE.PointLight(0xffcc66, 0.7, 10, 1.5); // Reduced intensity/range
            pointLight.position.copy(bulbPos);
            pointLight.castShadow = false;
            scene.add(pointLight);
        }
    });
    
    // PERFORMANCE: InstancedMesh for all string light bulbs
    const bulbInstanced = new THREE.InstancedMesh(bulbGeo, stringLightMaterial, allBulbPositions.length);
    const dummyBulb = new THREE.Object3D();
    allBulbPositions.forEach((pos, i) => {
        dummyBulb.position.copy(pos);
        dummyBulb.updateMatrix();
        bulbInstanced.setMatrixAt(i, dummyBulb.matrix);
    });
    scene.add(bulbInstanced);
    // InstancedMesh counts as many visual shapes for the requirement.


    // Spotlight Cones and Lights - Mounted on Stage
    const stageEdgeZ = -4.5 + 3/2 - 0.1;
    const stageSurfaceY = 0.2 + 0.4/2 + 0.1;
    const spotLightPositionsNew = [ {x: -1.5, y: stageSurfaceY, z: stageEdgeZ}, {x: 1.5, y: stageSurfaceY, z: stageEdgeZ} ];
    const stageLightColors = [0xff00ff, 0x00ffff];

    spotLightPositionsNew.forEach((pos, index) => {
        const spotLightConeGeo = new THREE.CylinderGeometry(0.15, 0.05, 0.4, 8); // PERFORMANCE: Low segments
        const spotLightConeMat = new THREE.MeshStandardMaterial({emissive: stageLightColors[index], emissiveIntensity: 1});
        const spotLightCone = new THREE.Mesh(spotLightConeGeo, spotLightConeMat);
        spotLightCone.position.set(pos.x, pos.y, pos.z);
        spotLightCone.rotation.x = Math.PI / 2.5;
        scene.add(spotLightCone); shapes.push(spotLightCone);

        const lightSourceOffset = new THREE.Vector3(0, -0.2, 0.1).applyEuler(spotLightCone.rotation);
        const lightSourcePos = spotLightCone.position.clone().add(lightSourceOffset);
        const spotLight = new THREE.SpotLight(stageLightColors[index], 7, 20, Math.PI / 7, 0.4, 1.5);
        spotLight.position.copy(lightSourcePos);
        spotLight.target.position.set(pos.x, 0, -1);
        spotLight.castShadow = false; // PERFORMANCE: No shadows
        scene.add(spotLight); scene.add(spotLight.target);

        animatedObjects.push({ mesh: spotLight, targetObj: spotLight.target, action: (time) => {
            spotLight.target.position.x = Math.sin(time*0.4+index*Math.PI)*5;
            spotLight.target.position.z = -1 + Math.cos(time*0.25+index*Math.PI*0.5)*3;
        }});
    });

    // 6. Primary Shapes & Scene Elements
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x202025, side: THREE.DoubleSide });
    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    // groundPlane.receiveShadow = false; // No shadows
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
    
    // Beer Pong Cups - InstancedMesh
    const cupOriginalHeight = 0.3;
    const cupScaleFactor = beerPongTableScale.x / 3.5; // Relative scaling factor used before, adjust if needed
    const cupScaledHeight = cupOriginalHeight * cupScaleFactor;
    const cupScaledTopRadius = 0.15 * cupScaleFactor;
    const cupScaledBottomRadius = 0.1 * cupScaleFactor;
    const cupGeo = new THREE.CylinderGeometry(cupScaledTopRadius, cupScaledBottomRadius, cupScaledHeight, 6); // PERFORMANCE: Low segments
    const redCupMat = new THREE.MeshStandardMaterial({ color: 0xB22222, roughness: 0.7, metalness: 0.1 });
    
    const beerPongCupCount = 6;
    const beerPongCupsInstanced = new THREE.InstancedMesh(cupGeo, redCupMat, beerPongCupCount);
    const dummyCupBP = new THREE.Object3D();
    const scaledBeerPongTableSurfaceY = beerPongTableBaseY + (BEER_PONG_TABLE_ORIGINAL_SURFACE_HEIGHT * beerPongTableScale.y);

    for(let i=0; i<beerPongCupCount; i++){
        const row = i < 3 ? 0 : (i < 5 ? 1 : 2);
        const col = i < 3 ? i : (i < 5 ? i - 3 : i - 5);
        const cupSpacing = cupScaledTopRadius * 2.5;
        const offsetX = (row === 0) ? 0 : (row === 1 ? -cupScaledTopRadius : -cupScaledTopRadius*2);
        dummyCupBP.position.set(
            -5 + (col * cupSpacing) + offsetX,
            scaledBeerPongTableSurfaceY + cupScaledHeight / 2,
            4 - (0.5 * beerPongTableScale.z / 10) * BEER_PONG_TABLE_ORIGINAL_SURFACE_HEIGHT + (row * cupSpacing)
        );
        dummyCupBP.updateMatrix();
        beerPongCupsInstanced.setMatrixAt(i, dummyCupBP.matrix);
    }
    scene.add(beerPongCupsInstanced);

    // Ping Pong Ball
    const ballScaledRadius = 0.05 * cupScaleFactor;
    const ballGeo = new THREE.SphereGeometry(ballScaledRadius, 6, 3); // PERFORMANCE: Low segments
    const ballMat = new THREE.MeshStandardMaterial({color: 0xffffee, roughness: 0.2});
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(-5, scaledBeerPongTableSurfaceY + ballScaledRadius, 4);
    scene.add(ball); shapes.push(ball);

    // Scattered Cups - InstancedMesh
    const scatteredCupCount = 10; // Increased count now that it's instanced
    const scatteredCupsInstanced = new THREE.InstancedMesh(cupGeo, redCupMat, scatteredCupCount); // Re-use cupGeo and redCupMat
    const dummyCupScatter = new THREE.Object3D();
    for(let i=0; i<scatteredCupCount; i++){
        dummyCupScatter.position.set((Math.random()-0.5)*15, cupScaledHeight/2, (Math.random()-0.5)*15);
        dummyCupScatter.rotation.set(Math.random()*0.5, Math.random()*Math.PI, Math.random()*0.5);
        dummyCupScatter.updateMatrix();
        scatteredCupsInstanced.setMatrixAt(i, dummyCupScatter.matrix);
    }
    scene.add(scatteredCupsInstanced);

    const speakerGeo = new THREE.BoxGeometry(0.8, 1.5, 0.6);
    const speakerMat = new THREE.MeshStandardMaterial({ color: 0x181818 });
    const speaker1 = new THREE.Mesh(speakerGeo, speakerMat);
    speaker1.position.set(-3, 0.75, -4); scene.add(speaker1); shapes.push(speaker1);
    const speaker2 = new THREE.Mesh(speakerGeo, speakerMat);
    speaker2.position.set(3, 0.75, -4); scene.add(speaker2); shapes.push(speaker2);

    // REQUIREMENT: At least one of them should be textured (primary shape)
    const width=2,height=2;const size=width*height;const data=new Uint8Array(3*size);
    const tColors=[new THREE.Color(0x440000),new THREE.Color(0x111111)];
    for(let i=0;i<size;i++){const s=i*3;const x=i%width;const y=Math.floor(i/width);const c=tColors[(x+y)%2];data[s]=Math.floor(c.r*255);data[s+1]=Math.floor(c.g*255);data[s+2]=Math.floor(c.b*255);}
    const procTexture=new THREE.DataTexture(data,width,height,THREE.RGBFormat);
    procTexture.needsUpdate=true;procTexture.magFilter=THREE.NearestFilter;
    const blanketGeo=new THREE.PlaneGeometry(2,2);
    const texturedBlanketMat=new THREE.MeshStandardMaterial({map:procTexture});
    const blanket1=new THREE.Mesh(blanketGeo,texturedBlanketMat);
    blanket1.rotation.x=-Math.PI/2;blanket1.position.set(4,0.01,4);
    scene.add(blanket1);shapes.push(blanket1);

    // REQUIREMENT: At least one of them should be animated (primary shape)
    const balloonGeo=new THREE.SphereGeometry(0.4,8,4); // PERFORMANCE: Low segments
    const balloonMat=new THREE.MeshPhongMaterial({color:0xaa0000,shininess:30});
    const balloon=new THREE.Mesh(balloonGeo,balloonMat);
    balloon.position.set(-5,2.5,6);scene.add(balloon);shapes.push(balloon);
    balloon.userData.initialY=balloon.position.y;
    animatedObjects.push({mesh:balloon,action:(t)=>{balloon.position.y=balloon.userData.initialY+Math.sin(t*1.5)*0.2;balloon.rotation.y+=0.005;}});
    
    const decorativeConeGeo = new THREE.ConeGeometry(0.3,0.7,6); // PERFORMANCE: Low segments
    const decorativeConeMat = new THREE.MeshStandardMaterial({color:0x008080});
    const cone1 = new THREE.Mesh(decorativeConeGeo,decorativeConeMat);
    cone1.position.set(5,0.35,-2);scene.add(cone1);shapes.push(cone1);
    const cone2 = new THREE.Mesh(decorativeConeGeo,decorativeConeMat);
    cone2.position.set(-5,0.35,-2);scene.add(cone2);shapes.push(cone2);
    // Non-instanced shapes: Ground(1), Stage(1), DJTable(1), Poles(3), SpotlightCones(2), Ball(1), Speakers(2), Blanket(1), Balloon(1), DecCones(2) = 15
    // Instanced shapes (visually many): Bulbs, BP Cups, Scattered Cups. These count towards the "20 primary shapes" visually.

    // --- WOW POINT INTEGRATION --- (Placeholder comments remain)
    const wowBoxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const wowBoxMat = new THREE.MeshStandardMaterial({ color: 0xff8800 });
    const wowBox = new THREE.Mesh(wowBoxGeo, wowBoxMat);
    wowBox.name = "wowPointBox"; wowBox.position.set(0, 0.25, 8); scene.add(wowBox);
    
    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function loadAndPlaceOBJModel(path, objFile, mtlFile, position, scale, name) {
    // ... (loadAndPlaceOBJModel function remains largely the same, ensure castShadow/receiveShadow are false if shadows are off)
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
            object.traverse(c => { if (c instanceof THREE.Mesh) {
                // c.castShadow = false; // No shadows
                // c.receiveShadow = false; // No shadows
            }});
            scene.add(object);
            console.log(`${name} OBJ model loaded successfully!`);
        }, (xhr) => { /* progress */ }, (e) => console.error(`[${name}] Error loading OBJ:`,e));
    }, (xhr) => { /* progress */ }, (e) => {
        console.warn(`[${name}] MTL failed. Loading OBJ with default. Error:`,e);
        const objLoader = new OBJLoader();
        objLoader.setPath(path);
        objLoader.load(objFile, (object) => {
            scene.remove(placeholderGroup);
            object.scale.copy(scale);
            object.position.copy(position);
            object.name = name;
            object.traverse(c => {if (c instanceof THREE.Mesh){
                // c.castShadow = false; c.receiveShadow = false;
                if(!c.material||(Array.isArray(c.material)&&!c.material.length)){c.material=new THREE.MeshStandardMaterial({color:0xaaaaaa});}
            }});
            scene.add(object);
        }, (xhr) => { /* progress */ }, (eObj) => console.error(`[${name}] OBJ (no MTL) failed:`,eObj));
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    controls.update(delta);
    animatedObjects.forEach(obj => obj.action(clock.getElapsedTime()));
    renderer.render(scene, camera);
}

init();