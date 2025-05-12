/* -------- Raindrops ---------- */
function initializeRaindrops() {
    raindrops = [];
    // Use HSB for easy color variation IF creating colors here.
    // If p5.Color objects are stored, mode at creation matters.
    let originalColorMode = { mode: RGB, p1: 255, p2: 255, p3: 255, p4: 255 };
    originalColorMode.mode = p5.prototype._colorMode; // Store current mode
    // Accessing p5.js internal _colorMaxes might be needed for full restoration
    // For simplicity, we'll assume RGB/HSB with standard ranges if mode changes.

    colorMode(HSB, 360, 100, 100);
    for (let i = 0; i < NUM_RAINDROPS; i++) {
        raindrops.push({
            x: random(width),
            y: random(-height, 0),
            length: random(10, 30),
            speed: random(4, 10),
            color: color(random(360), 80, 90) // Store p5.Color object
        });
    }
    colorMode(originalColorMode.mode); // Reset to original mode
}

/* -------- Stars ---------- */
function initializeStars() {
    stars = [];
    for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
            x: random(width),
            y: random(height),
            size: random(1, 4),
            speed: random(0.2, 1.5) * (random(1) < 0.3 ? 0.5 : 1)
        });
    }
}

/* -------- Confetti ---------- */
function createConfetti(count, canvasWidth, canvasHeight, winnerIdx) {
    confettiParticles = [];
    // Origin is center of the canvas
    const originX = canvasWidth / 2;
    const originY = canvasHeight / 2;

    // Target is near the winning score's typical position
    const targetX = winnerIdx === 0 ? canvasWidth / 4 : (3 * canvasWidth) / 4;
    const targetY = canvasHeight / 2; // Explode horizontally towards score

    for (let i = 0; i < count; i++) {
        let angle = atan2(targetY - originY, targetX - originX) + random(-PI / 4, PI / 4); // Wider spread
        let speed = random(5, 15);
        let col = color(random(150, 255), random(150, 255), random(150, 255), 255); // Start fully opaque
        confettiParticles.push({
            x: originX, y: originY, // Absolute canvas coordinates
            vx: cos(angle) * speed, vy: sin(angle) * speed - random(3, 7), // Add some upward thrust
            angle: random(TWO_PI), rotationSpeed: random(-0.1, 0.1),
            size: random(8, 15), color: col,
            drag: random(0.92, 0.98), gravity: 0.15
        });
    }
}


function drawConfetti(pct, cW, cH) {
    rectMode(CENTER); // Ensure confetti rectangles are drawn from their center
    noStroke();

    const overallEffectAlpha = 255 * (1 - pct); // Linear fade for the whole effect

    for (let i = confettiParticles.length - 1; i >= 0; i--) {
        let p = confettiParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity;
        p.angle += p.rotationSpeed;

        if (overallEffectAlpha <= 0) continue; // Skip drawing if effect has faded

        push();
        translate(p.x, p.y); // Translate to particle's absolute canvas position
        rotate(p.angle);
        // Use particle's base color and apply the overall effect alpha
        fill(red(p.color), green(p.color), blue(p.color), overallEffectAlpha);
        rect(0, 0, p.size, p.size * 0.6); // Draw particle at new (0,0)
        pop();
    }
}