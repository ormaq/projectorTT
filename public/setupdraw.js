function setup() {
    createCanvas(windowWidth, windowHeight);
    textFont("Arial", 32);
    textAlign(CENTER, CENTER);
    rectMode(CENTER); // Default rectMode for the sketch

    // Initialize particles for animated backgrounds
    initializeRaindrops();
    initializeStars();

    socket = io();

    socket.on("state", newState => {
        const scoreChanged = gameState.scores[0] !== newState.scores[0] || gameState.scores[1] !== newState.scores[1];
        const isFirstState = lastScoreTime === 0 && (gameState.scores[0] === 0 && gameState.scores[1] === 0);

        if (scoreChanged || isFirstState) {
            lastScoreTime = millis();
            effectType = int(random(NUM_EFFECTS));

            if (effectType === 0 && scoreChanged) {
                const winnerIdx = newState.scores[0] > gameState.scores[0] ? 0 : 1;
                createConfetti(100, width, height, winnerIdx);
            }
        }

        // If background mode changes, re-initialize relevant particles if needed
        if (gameState.backgroundMode !== newState.backgroundMode) {
            if (newState.backgroundMode === "colorRaindrops") initializeRaindrops();
            if (newState.backgroundMode === "starfield") initializeStars();
        }

        gameState = newState;
    });
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    if (gameState.backgroundMode === "colorRaindrops") initializeRaindrops();
    if (gameState.backgroundMode === "starfield") initializeStars();
}


function draw() {
    // ---------- BACKGROUND SELECTION ----------
    // Some backgrounds might use rect(), default to CORNER for them unless specified
    drawBackground();

    // IMPORTANT: Reset to common modes for foreground elements
    colorMode(RGB);
    rectMode(CENTER); // Common default for foreground elements

    if (gameState.alignMode) {
        noFill();
        stroke(255);
        strokeWeight(4);
        // rectMode is CENTER
        rect(width / 2, height / 2, width, height); // Full canvas rect
        stroke("red");
        line(width / 2, 0, width / 2, height); // Vertical center line
        return; // Return early for align mode
    }

    stroke(255);
    strokeWeight(2);
    line(width / 2, 0, width / 2, height); // Center dividing line
    noStroke();

    const now = millis();
    const timeSinceScore = now - lastScoreTime;
    const showEffect = gameState.showEffects && timeSinceScore < scoreFlashDuration && lastScoreTime !== 0;

    let baseAlpha = 255;
    if (showEffect) {
        if (effectType !== 1 && effectType !== 2) { // Not scale/glow or slide
            baseAlpha = 180; // Dim base scores for confetti/wave
        } else {
            baseAlpha = 0; // Hide base scores for scale/glow and slide
        }
    }
    if (baseAlpha > 0 && !gameState.freeplay) {
        // Draw scores using full canvas width and height
        drawScores(width, height, 1, color(255, baseAlpha));
    }

    if (showEffect && !gameState.freeplay) {
        const pct = timeSinceScore / scoreFlashDuration;
        push(); // Isolate effect drawing styles
        switch (effectType) {
            case 0: // Confetti
                drawConfetti(pct, width, height);
                break;
            case 1: // Scale and Glow
                const scaleProgress = easeOutExpo(pct);
                const currentScaleFactor = 1.0 + 1.5 * (1 - scaleProgress);
                const glowAlpha = 255 * (1 - pct) * (1 - pct);
                push();
                drawingContext.filter = `blur(${15 * (1 - pct)}px) brightness(1.5)`;
                drawScores(width, height, currentScaleFactor, color(255, glowAlpha * 0.8));
                pop();
                drawScores(width, height, currentScaleFactor, color(255));
                break;
            case 2: // Slide In
                const slideProgress = easeOutQuad(pct);
                // Positions are relative to canvas center (0,0 in drawScores after translate)
                const targetLeftX = -width / 4; // Final position for left score
                const targetRightX = width / 4;  // Final position for right score
                const startLeftX = -width / 2 - width / 8; // Start off-screen left
                const startRightX = width / 2 + width / 8; // Start off-screen right
                const currentLeftX = lerp(startLeftX, targetLeftX, slideProgress);
                const currentRightX = lerp(startRightX, targetRightX, slideProgress);
                drawScores(width, height, 1, color(255), currentLeftX, currentRightX);
                break;
            case 3: // Expanding Wave
                const waveProgress = easeOutQuad(pct);
                const radius = waveProgress * (width * 0.6); // Radius based on canvas width
                const alpha = 255 * (1 - pct);
                const weight = max(1, 15 * (1 - pct));
                noFill();
                strokeWeight(weight);
                stroke(255, alpha * 0.8);
                ellipse(width / 2, height / 2, radius * 2, radius * 2);
                if (pct < 0.8) { // Inner, brighter wave
                    stroke(255, alpha);
                    ellipse(width / 2, height / 2, radius * 1.6, radius * 1.6);
                }
                break;
        }
        pop(); // Restore styles after effect drawing
    }

    if (!gameState.freeplay)
        drawServeArrow(width, height, gameState.serverIdx);

    if (gameState.showBorder) {
        stroke(255);
        strokeWeight(16);
        noFill();
        rect(width / 2, height / 2, width, height); // Full canvas border
    }
}

function drawBackground() {
    switch (gameState.backgroundMode) {
        case "defaultBlack":
            colorMode(RGB);
            background(0);
            break;
        case "deepBlue":
            colorMode(RGB);
            background(10, 20, 225);
            break;
        case "forestGreen":
            colorMode(RGB);
            background(20, 230, 20);
            break;
        case "slateGray":
            colorMode(RGB);
            background(40, 40, 50);
            break;
        case "rainbowCycle":
            colorMode(HSB, 360, 100, 100);
            rainbowHue = (rainbowHue + 0.5) % 360;
            background(rainbowHue, 80, 160);
            break;
        case "gentleFade":
            colorMode(HSB, 360, 100, 100);
            gentleFadeHue = (gentleFadeHue + 0.1) % 360;
            background(gentleFadeHue, 60, 140);
            break;
        case "colorRaindrops":
            colorMode(RGB); // Base background color
            background(10, 10, 20);
            noStroke();
            push();
            rectMode(CORNER); // Raindrops are drawn from top-left
            for (let drop of raindrops) {
                fill(drop.color); // p5.Color object
                rect(drop.x, drop.y, 2, drop.length);
                drop.y += drop.speed;
                if (drop.y > height) {
                    drop.y = random(-100, -drop.length);
                    drop.x = random(width);
                    drop.speed = random(4, 10);
                }
            }
            pop();
            break;
        case "horizontalWave":
            colorMode(HSB, 360, 100, 100);
            waveOffset = (waveOffset + 0.2) % 360;
            for (let x = 0; x < width; x += 4) {
                let currentHue = ((x / width) * 120 + waveOffset) % 360;
                stroke(currentHue, 70, 65);
                strokeWeight(4);
                line(x, 0, x, height);
            }
            noStroke();
            break;
        case "starfield":
            colorMode(RGB);
            background(0, 0, 10);
            noStroke();
            for (let star of stars) {
                let starBrightness = star.size > 2 ? random(150, 255) : random(100, 200);
                fill(220, 220, 255, starBrightness);
                ellipse(star.x, star.y, star.size, star.size);
                star.x -= star.speed;
                if (star.x < -star.size) {
                    star.x = width + star.size;
                    star.y = random(height);
                    star.size = random(1, 4);
                    star.speed = random(0.2, 1.5) * (star.size < 2 ? 0.5 : 1);
                }
            }
            break;
        default:
            colorMode(RGB);
            background(0);
    }

}


function drawScores(canvasW, canvasH, scaleFactor = 1, clr = color(255), leftX = -canvasW / 4, rightX = canvasW / 4) {
    const fontSize = canvasH / 4; // Font size relative to canvas height
    push();
    translate(canvasW / 2, canvasH / 2); // Center of canvas
    scale(scaleFactor, scaleFactor);
    noStroke();
    fill(clr);
    textSize(fontSize);
    textAlign(CENTER, CENTER);

    const posLeftX = leftX / scaleFactor;
    const posRightX = rightX / scaleFactor;

    push();
    translate(posLeftX, 0);
    rotate(90); // Must use (90 not pi/2) for 90 degrees clockwise
    text(gameState.scores[0], 0, 0);
    pop();

    push();
    translate(posRightX, 0);
    rotate(-90);  // Must use (-90 not -pi/2) for 90 degrees counter-clockwise
    text(gameState.scores[1], 0, 0);
    pop();

    pop();
}

function drawServeArrow(canvasW, canvasH, idx) {

    let calculatedServerIdx;
    const s0 = gameState.scores[0];
    const s1 = gameState.scores[1];
    const totalPoints = s0 + s1;

    if (totalPoints >= 20) {
        calculatedServerIdx = totalPoints % 2;
    } else {
        calculatedServerIdx = Math.floor(totalPoints / 2) % 2;
    }
    // Calculated serve always starts from player 0
    // so if player 0 is the server, we need to adjust the index
    if (idx === 0) {
        idx = calculatedServerIdx;
    } else {
        idx = 1 - calculatedServerIdx; // Flip the index for player 1
    }

    push();
    const arrowSize = canvasH / 10; // Arrow size relative to canvas height
    const yPos = canvasH * 0.9;     // Vertical position
    const xMargin = canvasW * 0.1;  // Horizontal margin

    noStroke();
    fill(255, 180); // Semi-transparent white

    if (idx === 0) { // Server is player 0 (left)
        translate(xMargin, yPos);
        triangle(0, -arrowSize / 2, 0, arrowSize / 2, arrowSize, 0); // Pointing right
    } else { // Server is player 1 (right)
        translate(canvasW - xMargin, yPos);
        triangle(0, -arrowSize / 2, 0, arrowSize / 2, -arrowSize, 0); // Pointing left
    }
    pop();
}
