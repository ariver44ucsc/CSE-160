// map.js - Maze with Gold Blocks

const MAP_SIZE = 32;
const MAZE_WALL_HEIGHT = 3; // Height of the maze walls
const PATH_HEIGHT = 0;      // Height of the paths (0 means ground level)
const PERIMETER_HEIGHT = 4; // Height of the outer boundary wall

// Initialize HEIGHT_MAP with all walls for the maze area
export const HEIGHT_MAP = Array(MAP_SIZE).fill(null).map(() => Array(MAP_SIZE).fill(MAZE_WALL_HEIGHT));

// --- Maze Generation (Simple Randomized Prim's like approach) ---
function isInMazeBounds(x, z) {
    // Check against actual map grid, excluding the very edge used for perimeter
    return x >= 1 && x < MAP_SIZE - 1 && z >= 1 && z < MAP_SIZE - 1;
}
function isWall(x,z) {
    return isInMazeBounds(x,z) && HEIGHT_MAP[z][x] === MAZE_WALL_HEIGHT;
}


// Set outer perimeter walls first
for (let i = 0; i < MAP_SIZE; i++) {
    HEIGHT_MAP[0][i] = PERIMETER_HEIGHT;
    HEIGHT_MAP[MAP_SIZE - 1][i] = PERIMETER_HEIGHT;
    HEIGHT_MAP[i][0] = PERIMETER_HEIGHT;
    HEIGHT_MAP[i][MAP_SIZE - 1] = PERIMETER_HEIGHT;
}

// Maze generation starts from an odd coordinate
let startX = 1;
let startZ = 1;
if (startX % 2 === 0) startX++; // Ensure odd
if (startZ % 2 === 0) startZ++;
if (startX >= MAP_SIZE -1) startX = MAP_SIZE - 3;
if (startZ >= MAP_SIZE -1) startZ = MAP_SIZE - 3;


HEIGHT_MAP[startZ][startX] = PATH_HEIGHT; // Start cell is a path

const frontier = [];

// Add initial frontiers around the start cell
const initialDirs = [[0, 2], [0, -2], [2, 0], [-2, 0]]; // [dz, dx]
for(const [dz, dx] of initialDirs) {
    const cellZ = startZ + dz;
    const cellX = startX + dx;
    const wallZ = startZ + dz/2;
    const wallX = startX + dx/2;
    if (isWall(cellX, cellZ)) {
        frontier.push({ x: cellX, z: cellZ, prevX: wallX, prevZ: wallZ });
    }
}


while (frontier.length > 0) {
    const randomIndex = Math.floor(Math.random() * frontier.length);
    const { x, z, prevX, prevZ } = frontier.splice(randomIndex, 1)[0];

    if (isWall(x,z)) { // If it's still a wall (important check)
        HEIGHT_MAP[z][x] = PATH_HEIGHT;         // Carve path to the cell
        HEIGHT_MAP[prevZ][prevX] = PATH_HEIGHT; // Carve path for the wall between

        for(const [dz, dx] of initialDirs) {
            const nextCellZ = z + dz;
            const nextCellX = x + dx;
            const nextWallZ = z + dz/2;
            const nextWallX = x + dx/2;
            if (isWall(nextCellX, nextCellZ)) {
                 frontier.push({ x: nextCellX, z: nextCellZ, prevX: nextWallX, prevZ: nextWallZ });
            }
        }
    }
}

// Ensure entry and exit points
HEIGHT_MAP[1][0] = PATH_HEIGHT; // Entry at (0,1) on the actual map array index
if (HEIGHT_MAP[1][1] !== PATH_HEIGHT) HEIGHT_MAP[1][1] = PATH_HEIGHT; // Connect entry

HEIGHT_MAP[MAP_SIZE - 2][MAP_SIZE - 1] = PATH_HEIGHT; // Exit
if (HEIGHT_MAP[MAP_SIZE - 2][MAP_SIZE - 2] !== PATH_HEIGHT) HEIGHT_MAP[MAP_SIZE - 2][MAP_SIZE - 2] = PATH_HEIGHT; // Connect exit



export const ITEM_LOCATIONS = [];
const numGoldBlocks = 3; // Your original world had 3 items
let goldPlaced = 0;
let attempts = 0;

while (goldPlaced < numGoldBlocks && attempts < MAP_SIZE * MAP_SIZE) {
    const randX = Math.floor(Math.random() * (MAP_SIZE - 2)) + 1; // Avoid perimeter
    const randZ = Math.floor(Math.random() * (MAP_SIZE - 2)) + 1;

    if (HEIGHT_MAP[randZ][randX] === PATH_HEIGHT) {
        let alreadyExists = false;
        for (const loc of ITEM_LOCATIONS) {
            if (loc.x === randX && loc.z === randZ) {
                alreadyExists = true;
                break;
            }
        }
        if (!alreadyExists) {
            ITEM_LOCATIONS.push({ x: randX, y: HEIGHT_MAP[randZ][randX], z: randZ });
            goldPlaced++;
        }
    }
    attempts++;
}

if (ITEM_LOCATIONS.length < numGoldBlocks) {
    const defaultSpots = [
        {x:1, z:1}, {x:MAP_SIZE-2, z:MAP_SIZE-2},
        {x:Math.floor(MAP_SIZE/2), z:Math.floor(MAP_SIZE/2)}
    ];
    for(const spot of defaultSpots){
        if(ITEM_LOCATIONS.length >= numGoldBlocks) break;
        if(HEIGHT_MAP[spot.z]?.[spot.x] === PATH_HEIGHT){ // Check if spot is valid path
            let alreadyExists = false;
            for (const loc of ITEM_LOCATIONS) {
                if (loc.x === spot.x && loc.z === spot.z) {
                    alreadyExists = true;
                    break;
                }
            }
            if(!alreadyExists) ITEM_LOCATIONS.push({x: spot.x, y: HEIGHT_MAP[spot.z][spot.x], z: spot.z});
        }
    }
}
// Ensure we always have at least one item if possible, for the HUD counter.
if (ITEM_LOCATIONS.length === 0 && HEIGHT_MAP[1]?.[1] === PATH_HEIGHT) {
    ITEM_LOCATIONS.push({ x: 1, y: HEIGHT_MAP[1][1], z: 1 });
}
if (ITEM_LOCATIONS.length === 0) { // Absolute fallback
    ITEM_LOCATIONS.push({x:1,y:0,z:1});
}

