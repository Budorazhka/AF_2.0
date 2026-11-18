// Coordinates are in the GLB's local metres. Face gives the direction into the room.
export const FINISH_LAYOUTS = {
  '26-1': {
    panel: ['North party wall', 'z+', 0.4, 3.1],
    kitchens: [['Kitchen countertop', 'z-', 3.14, 4.35]],
    view: [[3.19, 4.2], [1.6, 3.3]],
  },
  '28-3': {
    panel: ['East wall south', 'x-', 3.0, 5.34],
    kitchens: [['Kitchen countertop', 'z+', 3.53, 5.05]],
    view: [[4.02, 5.43], [5.18, 4.02]],
  },
  '40-5': {
    panel: ['West exterior', 'x+', 3.27, 5.97],
    kitchens: [
      ['Kitchen countertop', 'z-', 4.846, 6.474],
      ['Kitchen return countertop', 'x-', 1.36, 2.18, false],
    ],
    view: [[2, 3], [0.85, 4.0]],
  },
  '48-5': {
    panel: ['Divider north', 'x+', 0.21, 2.75],
    kitchens: [
      ['Kitchen countertop', 'x-', 3.98, 5.27],
      ['Kitchen return top', 'x-', 5.29, 5.9, false],
    ],
    view: [[5.97, 2.72], [4.22, 1.4]],
  },
  '66': {
    panel: ['Bedroom divider wall', 'x+', 5.07, 6.91],
    kitchens: [
      ['Kitchen countertop south', 'x-', 2.23, 3.74],
      ['Kitchen countertop north', 'x-', 1.07, 1.78, false],
    ],
    view: [[6.93, 5.45], [5.25, 6.65]],
  },
  '81-8': {
    panel: ['Bedroom 2 south wall', 'z+', 4.49, 6.93],
    kitchens: [
      ['Kitchen north top', 'z+', 0.27, 2.65],
      ['Kitchen west top', 'x+', 6.36, 7.53, false],
    ],
    view: [[6.84, 6.86], [4.57, 8.56]],
  },
  '107-1': {
    panel: ['Bedroom 2 east wall', 'x+', 5.64, 7.77],
    kitchens: [['Kitchen countertop', 'z+', 7.63, 10.1]],
    view: [[8.5, 5.12], [6.45, 6.88]],
  },
  '113-7': {
    panel: ['East exterior south', 'x-', 4.85, 7.22],
    kitchens: [['Kitchen countertop', 'z+', 4.64, 7.64]],
    view: [[5.74, 4.72], [7.9, 6.03]],
  },
};
