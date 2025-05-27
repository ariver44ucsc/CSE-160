// map.js - Barebones: Perimeter and Ground (8x8)

const MAP_SIZE = 8;
export const PERIMETER_HEIGHT = 4; 
const PATH_HEIGHT = 0;

export const HEIGHT_MAP = Array(MAP_SIZE).fill(null).map(() => Array(MAP_SIZE).fill(PATH_HEIGHT));

// Set outer perimeter walls
for (let i = 0; i < MAP_SIZE; i++) {
    HEIGHT_MAP[0][i] = PERIMETER_HEIGHT;
    HEIGHT_MAP[MAP_SIZE - 1][i] = PERIMETER_HEIGHT;
    HEIGHT_MAP[i][0] = PERIMETER_HEIGHT;
    HEIGHT_MAP[i][MAP_SIZE - 1] = PERIMETER_HEIGHT;
}

export const ITEM_LOCATIONS = [];