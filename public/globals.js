/* ---------- Global state & constants ---------- */
let socket;
let gameState = {
    scores: [0, 0],
    serverIdx: 0,
    alignMode: false,
    showEffects: true,
    backgroundMode: "defaultBlack",
    showBorder: false,
    freeplay: false,
};

// animation bookkeeping
let lastScoreTime = 0;
const scoreFlashDuration = 3000;
let effectType = 0;
const NUM_EFFECTS = 4;
let priorserverIdx = 0;

/* ---------- Particles & background helpers ---------- */
let confettiParticles = [];

let rainbowHue = 0;
let gentleFadeHue = 0;
let waveOffset = 0;

/* Raindrops */
let raindrops = [];
const NUM_RAINDROPS = 150;

/* Stars */
let stars = [];
const NUM_STARS = 200;

// Simple Quadratic‐out easing
function easeOutQuad(t) {
    return t * (2 - t);
}
// Simple Exponential‐out easing
function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}
