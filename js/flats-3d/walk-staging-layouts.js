// Half-width and half-depth used by walking collisions and placement checks.
export const PATIO_FOOTPRINTS = {
  chair: [0.315, 0.315], pouf: [0.238, 0.238], lounger: [0.33, 0.90], table: [0.196, 0.196], planter: [0.155, 0.155],
};

// Coordinates in model metres. Indoor props use named surfaces where practical.
export const STAGING_LAYOUTS = {
  '26-1': {
    lamp: { at: [3.05, 2.49], on: 'Nightstand right' },
    throw: { on: 'Duvet', edge: 'z+' },
    tray: { at: [2.04, 4.83], on: 'Dining table top', tea: true },
    patio: { chair: [-0.86, 2.61, -0.52], table: [-0.85, 3.40] },
  },
  '28-3': {
    lamp: { at: [2.03, 3.15], on: 'Bedside cabinet' },
    throw: { on: 'Duvet', edge: 'x+' },
    tray: { at: [4.53, 3.90], on: 'Side table top', tea: true },
    patio: { pouf: [5.49, 7.20] },
  },
  '40-5': {
    lamp: { at: [0.38, 3.50] },
    throw: { on: 'Sofa seat', index: 2, edge: 'x+' },
    tray: { at: [1.47, 4.67], on: 'Coffee table' },
    patio: { chair: [0.64, 6.84, 0.75], table: [1.36, 6.76] },
  },
  '48-5': {
    lamp: { at: [4.29, 0.21] },
    throw: { on: 'Sofa cushion', index: 1, edge: 'x+' },
    tray: { at: [5.30, 1.59], on: 'Coffee table top' },
    patio: { chair: [7.79, 1.20, -0.75], table: [7.79, 1.96] },
  },
  '66': {
    lamp: { at: [0.75, 5.08], on: 'Nightstand left' },
    throw: { on: 'Sofa cushion', index: 1, edge: 'x+' },
    tray: { at: [5.71, 6.39], on: 'Coffee table top' },
    patio: { chair: [9.02, 8.71, 0.80], table: [8.43, 9.28] },
  },
  '81-8': {
    lamp: { at: [5.55, 9.46] },
    throw: { on: 'Sofa cushion', index: 1, edge: 'z-' },
    tray: { at: [4.27, 7.60], on: 'Coffee table top' },
    patio: { lounger: [8.63, 9.81], table: [8.04, 10.65] },
  },
  '107-1': {
    lamp: { at: [6.44, 7.78] },
    throw: { on: 'Sofa cushion', index: 1, edge: 'x+' },
    tray: { at: [7.53, 6.84], on: 'Coffee table top' },
    patio: { lounger: [12.30, 7.40], table: [13.13, 7.20] },
  },
  '113-7': {
    lamp: { at: [8.09, 7.27] },
    throw: { on: 'Sofa cushion', index: 1, edge: 'x-' },
    tray: { at: [6.81, 5.88], on: 'Coffee table top' },
    patio: { planter: [12.08, 0.74] },
  },
};
