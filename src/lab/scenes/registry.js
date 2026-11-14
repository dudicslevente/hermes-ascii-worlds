// The single list of scenes. Order here is the order of the gallery rail.
import mantaRays from "./manta-rays.js";
import seaTurtles from "./sea-turtles.js";
import seahorses from "./seahorses.js";
import tinyFishSchool from "./tiny-fish-school.js";
import solitaryWhale from "./solitary-whale.js";
import octopus from "./octopus.js";
import hammerhead from "./hammerhead.js";
import anglerfish from "./anglerfish.js";
import axolotl from "./axolotl.js";
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
import pipes from "./pipes.js";
import platypusCreek from "./platypus-creek.js";
import capybaraOnsen from "./capybara-onsen.js";
import penguinSlide from "./penguin-slide.js";
import rubberDucks from "./rubber-ducks.js";
import nyanCat from "./nyan-cat.js";
import dinoRunner from "./dino-runner.js";
import dragonHoard from "./dragon-hoard.js";
import beehive from "./beehive.js";
import wizardTower from "./wizard-tower.js";
import retroArcade from "./retro-arcade.js";
import snakeGame from "./snake-game.js";
import pirateShip from "./pirate-ship.js";
import rooftopNinja from "./rooftop-ninja.js";

export const GROUPS = Object.freeze([
  { id: "ocean", name: "Ocean", note: "Open water" },
  { id: "wings", name: "Wings", note: "On the air" },
  { id: "drift", name: "Falling and drifting", note: "Carried by wind" },
  { id: "quiet", name: "Quiet company", note: "Still and calm" },
  { id: "creatures", name: "Characters", note: "Familiar company" },
  { id: "lairs", name: "Little worlds", note: "A hoard, a hive and a spell" },
  { id: "play", name: "Arcade", note: "Pixels at play" },
  { id: "adventure", name: "Adventure", note: "Ships and rooftops" },
]);
export const SCENES = Object.freeze([
  mantaRays,
  seaTurtles,
  seahorses,
  tinyFishSchool,
  solitaryWhale,
  octopus,
  hammerhead,
  anglerfish,
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
  axolotl,
  owl,
  nightSky,
  pipes,
  platypusCreek,
  capybaraOnsen,
  penguinSlide,
  rubberDucks,
  nyanCat,
  dinoRunner,
  dragonHoard,
  beehive,
  wizardTower,
  retroArcade,
  snakeGame,
  pirateShip,
  rooftopNinja,
]);
export const SCENE_IDS = Object.freeze(SCENES.map((s) => s.id));
export const sceneById = (id) => SCENES.find((s) => s.id === id) || null;
