/* The only place that knows where three.js comes from.
   jsDelivr's +esm build rewrites the add-ons' bare "three" import to the same
   URL as below, so everything shares one copy and no import map is needed —
   important because Barba can bring this page in without a fresh <head>. */
export * from 'https://cdn.jsdelivr.net/npm/three@0.169.0/+esm';
export { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js/+esm';
export { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js/+esm';
export { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/environments/RoomEnvironment.js/+esm';
export { Sky } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/objects/Sky.js/+esm';
export { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/utils/BufferGeometryUtils.js/+esm';
