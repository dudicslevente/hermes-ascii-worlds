// The single list of scenes. Order here is the order of the gallery rail.
import mantaRays from "./manta-rays.js";
import seaTurtles from "./sea-turtles.js";
import seahorses from "./seahorses.js";
import tinyFishSchool from "./tiny-fish-school.js";
import solitaryWhale from "./solitary-whale.js";
import octopus from "./octopus.js";
import bubbles from "./bubbles.js";
import butterflies from "./butterflies.js";
import lunaMoths from "./luna-moths.js";
import dragonflies from "./dragonflies.js";
import swallows from "./swallows.js";
import ginkgoLeaves from "./ginkgo-leaves.js";
import cherryBlossomPetals from "./cherry-blossom-petals.js";
import dandelionSeeds from "./dandelion-seeds.js";
import fireflies from "./fireflies.js";
import sleepingCat from "./sleeping-cat.js";
import owl from "./owl.js";
import nightSky from "./night-sky.js";

export const GROUPS = Object.freeze([
  { id: "ocean", name: "Ocean", note: "Open water" },
  { id: "wings", name: "Wings", note: "On the air" },
  { id: "drift", name: "Falling and drifting", note: "Carried by wind" },
  { id: "quiet", name: "Quiet company", note: "Still and calm" },
]);
export const SCENES = Object.freeze([
  mantaRays,
  seaTurtles,
  seahorses,
  tinyFishSchool,
  solitaryWhale,
  octopus,
  bubbles,
  butterflies,
  lunaMoths,
  dragonflies,
  swallows,
  ginkgoLeaves,
  cherryBlossomPetals,
  dandelionSeeds,
  fireflies,
  sleepingCat,
  owl,
  nightSky,
]);
export const SCENE_IDS = Object.freeze(SCENES.map((s) => s.id));
export const sceneById = (id) => SCENES.find((s) => s.id === id) || null;
