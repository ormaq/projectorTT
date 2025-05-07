// Global variables
let socket;
let gameState = {
  scores: [0, 0],
  serverIdx: 0,
  alignMode: false,
  showEffects: true // Let's make use of this flag
};

// Animation bookkeeping
let lastScoreTime = 0;
let scoreFlashDuration = 3000; // Reduced duration for snappier feel (3 seconds)
let effectType = 0;
const NUM_EFFECTS = 4; // Number of defined effects

// Confetti particles array (only used for effect 0)
let confettiParticles = [];

// Simple Easing function (Quadratic Out)
function easeOutQuad(t) {
  return t * (2 - t);
}

// Simple Easing function (Exponential Out - for more impact)
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}


function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Arial", 32);
  textAlign(CENTER, CENTER);
  rectMode(CENTER);

  socket = io();

  // Listen for state updates from the server
  socket.on("state", newState => { // Use 'newState' to avoid confusion with global 'gameState'

    // Determine if score changed by comparing old gameState to newState
    const scoreChanged = gameState.scores[0] !== newState.scores[0] || gameState.scores[1] !== newState.scores[1];
    // Check if this is the very first state update (scores are 0-0)
    const isFirstState = lastScoreTime === 0 && (gameState.scores[0] === 0 && gameState.scores[1] === 0);

    // --- Calculate the NEW Server Index based on incoming newState ---
    let calculatedServerIdx;
    const s0 = newState.scores[0];
    const s1 = newState.scores[1];
    const totalPoints = s0 + s1;

    // Check for deuce condition (score >= 10-10, assuming game to 11)
    // Use totalPoints >= 20 as the threshold for 10-10
    if (totalPoints >= 20) {
      // Deuce rule: Switch server every point
      calculatedServerIdx = totalPoints % 2;
    } else {
      // Standard rule: Switch server every 2 points
      calculatedServerIdx = Math.floor(totalPoints / 2) % 2;
    }
    // --- End Server Index Calculation ---


    // --- Handle Score Change Effects & Timings ---
    if (scoreChanged || isFirstState) {
      lastScoreTime = millis(); // Reset animation timer
      effectType = int(random(NUM_EFFECTS)); // Choose a new random effect

      // If score changed (and not just the first state), trigger confetti if chosen
      if (effectType === 0 && scoreChanged) {
        // Determine the winner of the point by comparing newState score to old gameState score
        const winnerIdx = newState.scores[0] > gameState.scores[0] ? 0 : 1;
        createConfetti(100, width, height, winnerIdx); // Use current canvas dimensions
      }
    }

    gameState = newState;

    gameState.serverIdx = calculatedServerIdx;

  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Recreate confetti if window resized during effect? Optional.
  // if (effectType === 0 && millis() - lastScoreTime < scoreFlashDuration) {
  //     createConfetti(100, width, height);
  // }
}

function draw() {
  background(0);

  // Maintain 9×5 drawing area
  const targetRatio = 9 / 5;
  let w = width;
  let h = height;
  if (w / h > targetRatio) {
    w = h * targetRatio;
  } else {
    h = w / targetRatio;
  }
  const offsetX = (width - w) / 2;
  const offsetY = (height - h) / 2;

  push(); // Start transformed drawing context
  translate(offsetX, offsetY);

  // ---------- ALIGNMENT MODE ----------
  if (gameState.alignMode) {
    noFill();
    stroke(255);
    strokeWeight(4);
    rect(w / 2, h / 2, w, h); // Use rectMode(CENTER)
    stroke("red");
    line(w / 2, 0, w / 2, h);
    pop(); // End transformed context
    return; // Skip rest of drawing
  }

  // ---------- TABLE GRAPHICS ----------
  // Background is already black from background(0)
  // Net (simple white line)
  stroke(255);
  strokeWeight(2);
  line(w / 2, 0, w / 2, h);
  noStroke(); // Reset stroke

  // ---------- SCORE & EFFECTS ----------
  const now = millis();
  const timeSinceScore = now - lastScoreTime;
  const showEffect = gameState.showEffects && timeSinceScore < scoreFlashDuration && lastScoreTime !== 0;

  // Always draw the base scores (unless an effect overrides it)
  // Use a default alpha, or slightly dimmed if effect is playing
  let baseAlpha = 255;
  if (showEffect) {
    // Don't dim for Scale Pop or Slide In as they draw the score themselves
    if (effectType !== 1 && effectType !== 2) {
      baseAlpha = 180; // Slightly dimmed base score during other effects
    } else {
      baseAlpha = 0; // Hide base score if effect draws it
    }
  }
  // Ensure base score is drawn if effects are off or expired
  if (baseAlpha > 0) {
    // Call drawScores with the scaleFactor parameter (defaulting to 1 here)
    drawScores(w, h, 1, color(255, baseAlpha));
  }


  // Draw effects if active
  if (showEffect) {
    const pct = timeSinceScore / scoreFlashDuration; // Progress: 0 to 1

    push(); // Isolate effect transformations
    switch (effectType) {

      case 0: // Confetti Burst
        // Pass w and h of the drawing area
        drawConfetti(pct, w, h);
        // Base score is drawn underneath with baseAlpha
        break;

      case 1: // Scale Pop
        // Starts big, shrinks to normal. Uses easeOutExpo for more impact.
        const scaleProgress = easeOutExpo(pct);
        // Scale goes from eg. 2.5 down to 1.0
        const currentScaleFactor = 1.0 + 1.5 * (1 - scaleProgress); // Renamed variable
        // Fade out an additional glow effect quickly
        const glowAlpha = 255 * (1 - pct) * (1 - pct);

        // Draw glow behind scaled scores
        push();
        // Apply filter in screen space before drawing scores which are in translated space
        drawingContext.filter = `blur(${15 * (1 - pct)}px) brightness(1.5)`;
        // Call drawScores with currentScaleFactor
        drawScores(w, h, currentScaleFactor, color(255, glowAlpha * 0.8));
        pop();

        // Draw the scores themselves, scaling down
        // Call drawScores with currentScaleFactor
        drawScores(w, h, currentScaleFactor, color(255)); // White scores
        break;

      case 2: // Slide In
        // Scores slide from outside towards center. Uses easeOutQuad.
        const slideProgress = easeOutQuad(pct);
        // Calculate positions relative to the center (0,0) after translate(w/2, h/2)
        const targetLeftX = -w / 4;
        const targetRightX = w / 4;
        const startLeftX = -w / 2 - w / 8; // Start off-screen left
        const startRightX = w / 2 + w / 8; // Start off-screen right

        const currentLeftX = lerp(startLeftX, targetLeftX, slideProgress);
        const currentRightX = lerp(startRightX, targetRightX, slideProgress);

        // Draw scores at their sliding positions using the modified drawScores
        // Pass 1 for scaleFactor, color white, and calculated X positions
        drawScores(w, h, 1, color(255), currentLeftX, currentRightX);
        break;

      case 3: // Shockwave Pulse
        // Expanding ring(s) from the center. Uses easeOutQuad for radius, linear fade for alpha/stroke.
        const waveProgress = easeOutQuad(pct);
        const radius = waveProgress * (w * 0.6); // Max radius slightly larger than half width
        const alpha = 255 * (1 - pct);
        const weight = max(1, 15 * (1 - pct)); // Stroke weight decreases

        noFill();
        strokeWeight(weight);
        // Draw 2 rings for a nicer effect
        stroke(255, alpha * 0.8); // Slightly fainter outer ring
        ellipse(w / 2, h / 2, radius * 2, radius * 2);
        if (pct < 0.8) { // Start inner ring slightly later/smaller
          stroke(255, alpha); // Brighter inner ring
          ellipse(w / 2, h / 2, radius * 1.6, radius * 1.6);
        }
        // Base score is drawn underneath with baseAlpha
        break;
    }
    pop(); // End effect transformations
  }

  // ---------- SERVER ARROW ----------
  // Show arrow always, not just during effect flash
  drawServeArrow(w, h, gameState.serverIdx);


  pop(); // End transformed drawing context
}

// Modified drawScores to accept color and optional separate L/R pos
// Renamed 'scale' parameter to 'scaleFactor' to avoid conflict with p5.js scale()
// Modified drawScores to rotate each score toward its wall
function drawScores(w, h, scaleFactor = 1, clr = color(255), leftX = -w / 4, rightX = w / 4) {
  const fontSize = h / 4; // Base font size relative to height

  push();
  // Move origin to center of drawing area and apply scaling
  translate(w / 2, h / 2);
  scale(scaleFactor, scaleFactor);

  noStroke();
  fill(clr);
  textSize(fontSize);
  textAlign(CENTER, CENTER);

  // Compute unscaled X positions
  const posLeftX = leftX / scaleFactor;
  const posRightX = rightX / scaleFactor;

  // Draw left player’s score, rotated to face the left wall
  push();
  translate(posLeftX, 0);
  rotate(90);      // -90° so the top of the digits points left
  text(gameState.scores[0], 0, 0);
  pop();

  // Draw right player’s score, rotated to face the right wall
  push();
  translate(posRightX, 0);
  rotate(-90);       // +90° so the top of the digits points right
  text(gameState.scores[1], 0, 0);
  pop();

  pop();
}


function drawServeArrow(w, h, idx) {
  push();
  const arrowSize = h / 10; // Slightly smaller arrow
  const yPos = h * 0.9; // Position arrow near the bottom edge
  const xMargin = w * 0.1; // Distance from side edge

  noStroke();
  fill(255, 180); // Semi-transparent white

  if (idx === 0) {
    // Left player serves – arrow near bottom-left pointing right
    translate(xMargin, yPos);
    triangle(0, -arrowSize / 2, 0, arrowSize / 2, arrowSize, 0);
  } else {
    // Right player serves – arrow near bottom-right pointing left
    translate(w - xMargin, yPos);
    triangle(0, -arrowSize / 2, 0, arrowSize / 2, -arrowSize, 0);
  }
  pop();
}

// --- Confetti Effect Functions ---

// Pass full canvasWidth/Height to calculate offsets correctly
function createConfetti(count, canvasWidth, canvasHeight, winnerIdx) {
  confettiParticles = [];

  // Calculate the center of the 9x5 drawing area in screen coordinates
  const targetRatio = 9 / 5;
  let w = canvasWidth;
  let h = canvasHeight;
  if (w / h > targetRatio) w = h * targetRatio; else h = w / targetRatio;
  const offsetX = (canvasWidth - w) / 2;
  const offsetY = (canvasHeight - h) / 2;
  const originX = offsetX + w / 2;
  const originY = offsetY + h / 2;

  // Determine the target position based on the winner
  const targetX = winnerIdx === 0 ? offsetX + w / 4 : offsetX + (3 * w) / 4;
  const targetY = originY; // Confetti moves horizontally toward the winner

  for (let i = 0; i < count; i++) {
    let angle = atan2(targetY - originY, targetX - originX) + random(-PI / 8, PI / 8); // Add some spread
    let speed = random(5, 15); // Increased speed range
    let col = color(random(150, 255), random(150, 255), random(150, 255)); // Brighter colors
    confettiParticles.push({
      // Store initial position in screen coordinates
      x: originX,
      y: originY,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed - 5, // Add initial upward velocity
      angle: random(TWO_PI),
      rotationSpeed: random(-0.1, 0.1),
      size: random(8, 15),
      color: col,
      alpha: 255,
      drag: random(0.92, 0.98), // Air resistance
      gravity: 0.15 // Gravity effect
    });
  }
}

// drawConfetti draws within the transformed context (offsetX, offsetY applied)
function drawConfetti(pct, w, h) { // w, h are the dimensions of the transformed area
  const effectAlpha = 255 * (1 - pct); // Fade out effect over time

  rectMode(CENTER);
  noStroke();

  // Calculate offsets again to translate particle screen coords -> transformed coords
  const canvasWidth = windowWidth; // Use current window dimensions
  const canvasHeight = windowHeight;
  const targetRatio = 9 / 5;
  let currentW = canvasWidth;
  let currentH = canvasHeight;
  if (currentW / currentH > targetRatio) currentW = currentH * targetRatio; else currentH = currentW / targetRatio;
  const offsetX = (canvasWidth - currentW) / 2;
  const offsetY = (canvasHeight - currentH) / 2;

  for (let i = confettiParticles.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
    let p = confettiParticles[i];
    // Update physics (in screen coordinates)
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= p.drag; // Apply drag
    p.vy *= p.drag;
    p.vy += p.gravity; // Apply gravity
    p.angle += p.rotationSpeed;

    // Update alpha based on overall effect fade
    let currentAlpha = effectAlpha * (1 - pct); // Double down on fade

    // Check if particle is still visible or within bounds
    // (Optional: remove particles that go way off screen for performance)
    if (currentAlpha <= 0 /* || p.y > canvasHeight + 50 */) {
      // confettiParticles.splice(i, 1); // Optional removal
      continue; // Skip drawing faded/off-screen particles
    }

    push();
    // Translate the particle's screen coordinate (p.x, p.y)
    // into the current transformed coordinate system (relative to offsetX, offsetY)
    translate(p.x - offsetX, p.y - offsetY);
    rotate(p.angle);
    fill(red(p.color), green(p.color), blue(p.color), currentAlpha);
    rect(0, 0, p.size, p.size * 0.6); // Draw rectangle confetti
    pop();

  }
  rectMode(CENTER); // Reset just in case
}