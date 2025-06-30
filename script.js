class ChaoticBallAnimation {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Game state
        this.isPaused = false;
        this.startTime = Date.now();
        this.lastTime = 0;
        this.frameCount = 0;
        this.fps = 60;
        
        // Settings
        this.settings = {
            questionText: "Are you dumb? (respectfully)",
            answer1Label: "Yes",
            answer1Color: "#00ff00",
            answer2Label: "No", 
            answer2Color: "#ff0000",
            ringCount: 15,
            gapSize: 8, // degrees
            ballSpeed: 3
        };
        
        // Scores
        this.scores = {
            left: 0,
            right: 0
        };
        
        // MIDI
        this.midiNotes = [];
        this.currentNoteIndex = 0;
        this.audioContext = null;
        this.initAudio();
        
        // Animation properties
        this.rings = [];
        this.balls = [];
        this.zoomFactor = 1;
        this.centerX = 0;
        this.centerY = 0;
        
        this.initializeGame();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn("Web Audio API not supported");
        }
    }
    
    async loadMidiFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const midi = MidiParser.parse(e.target.result);
                    this.midiNotes = [];
                    
                    if (midi.track) {
                        midi.track.forEach(track => {
                            track.event.forEach(event => {
                                if (event.type === 9 && event.data && event.data.length >= 2) { // Note on
                                    this.midiNotes.push({
                                        note: event.data[0],
                                        velocity: event.data[1],
                                        frequency: this.midiNoteToFrequency(event.data[0])
                                    });
                                }
                            });
                        });
                    }
                    
                    if (this.midiNotes.length === 0) {
                        // Fallback: create some default notes
                        const defaultNotes = [60, 62, 64, 65, 67, 69, 71, 72]; // C major scale
                        defaultNotes.forEach(note => {
                            this.midiNotes.push({
                                note: note,
                                velocity: 80,
                                frequency: this.midiNoteToFrequency(note)
                            });
                        });
                    }
                    
                    this.currentNoteIndex = 0;
                    console.log(`Loaded ${this.midiNotes.length} MIDI notes`);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    midiNoteToFrequency(noteNumber) {
        return 440 * Math.pow(2, (noteNumber - 69) / 12);
    }
    
    playNote(frequency, duration = 0.3) {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.warn("Error playing note:", e);
        }
    }
    
    initializeGame() {
        this.rings = [];
        this.balls = [];
        this.scores = { left: 0, right: 0 };
        this.currentNoteIndex = 0;
        this.zoomFactor = 1;
        this.startTime = Date.now();
        
        // Create rings - innermost to outermost
        const baseRadius = 50;
        for (let i = 0; i < this.settings.ringCount; i++) {
            this.rings.push({
                radius: baseRadius + (i * 30),
                active: true,
                gapAngle: 0 // Gap at 3 o'clock (0 degrees)
            });
        }
        
        // Create balls inside innermost ring
        const innerRadius = this.rings[0].radius - 15;
        this.balls = [
            {
                x: innerRadius / 2,
                y: 0,
                vx: this.settings.ballSpeed * (Math.random() - 0.5),
                vy: this.settings.ballSpeed * (Math.random() - 0.5),
                radius: 8,
                color: this.settings.answer1Color,
                label: this.settings.answer1Label,
                type: 'left',
                currentRing: 0
            },
            {
                x: -innerRadius / 2,
                y: 0,
                vx: this.settings.ballSpeed * (Math.random() - 0.5),
                vy: this.settings.ballSpeed * (Math.random() - 0.5),
                radius: 8,
                color: this.settings.answer2Color,
                label: this.settings.answer2Label,
                type: 'right',
                currentRing: 0
            }
        ];
        
        this.updateUI();
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePause();
            }
        });
        
        // MIDI file input
        document.getElementById('midiFile').addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                try {
                    await this.loadMidiFile(e.target.files[0]);
                } catch (error) {
                    console.error("Error loading MIDI file:", error);
                }
            }
        });
    }
    
    updatePhysics(deltaTime) {
        if (this.isPaused) return;
        
        const dt = deltaTime / 16.67; // Normalize to ~60fps
        
        this.balls.forEach((ball, ballIndex) => {
            // Update position
            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;
            
            // Find current ring (smallest ring that contains the ball)
            const distanceFromCenter = Math.sqrt(ball.x * ball.x + ball.y * ball.y);
            let newCurrentRing = ball.currentRing;
            
            for (let i = 0; i < this.rings.length; i++) {
                if (this.rings[i].active && distanceFromCenter <= this.rings[i].radius - ball.radius) {
                    newCurrentRing = i;
                    break;
                }
            }
            
            // Check for ring collision and bouncing
            for (let i = ball.currentRing; i < this.rings.length; i++) {
                if (!this.rings[i].active) continue;
                
                const ringRadius = this.rings[i].radius;
                const ballDistance = Math.sqrt(ball.x * ball.x + ball.y * ball.y);
                
                if (ballDistance + ball.radius >= ringRadius) {
                    // Check if ball is in gap
                    const angle = Math.atan2(ball.y, ball.x);
                    let normalizedAngle = (angle * 180 / Math.PI + 360) % 360;
                    
                    const gapStart = this.rings[i].gapAngle - this.settings.gapSize / 2;
                    const gapEnd = this.rings[i].gapAngle + this.settings.gapSize / 2;
                    
                    let inGap = false;
                    if (gapStart < 0) {
                        inGap = normalizedAngle >= (360 + gapStart) || normalizedAngle <= gapEnd;
                    } else if (gapEnd > 360) {
                        inGap = normalizedAngle >= gapStart || normalizedAngle <= (gapEnd - 360);
                    } else {
                        inGap = normalizedAngle >= gapStart && normalizedAngle <= gapEnd;
                    }
                    
                    if (inGap) {
                        // Ball exits through gap - destroy ring
                        this.rings[i].active = false;
                        this.scores[ball.type]++;
                        ball.currentRing = Math.min(i + 1, this.rings.length - 1);
                        
                        // Play MIDI note
                        if (this.midiNotes.length > 0) {
                            const note = this.midiNotes[this.currentNoteIndex % this.midiNotes.length];
                            this.playNote(note.frequency);
                            this.currentNoteIndex++;
                        }
                        
                        // Adjust zoom to keep outermost ring visible
                        this.adjustZoom();
                        
                    } else {
                        // Bounce off ring
                        const nx = ball.x / ballDistance;
                        const ny = ball.y / ballDistance;
                        
                        // Move ball away from ring
                        const overlap = (ballDistance + ball.radius) - ringRadius;
                        ball.x -= nx * overlap;
                        ball.y -= ny * overlap;
                        
                        // Reflect velocity
                        const dotProduct = ball.vx * nx + ball.vy * ny;
                        ball.vx -= 2 * dotProduct * nx;
                        ball.vy -= 2 * dotProduct * ny;
                        
                        // Add some energy dissipation and randomness
                        ball.vx *= 0.98;
                        ball.vy *= 0.98;
                    }
                    break;
                }
            }
            
            ball.currentRing = newCurrentRing;
        });
        
        // Ball-to-ball collision
        if (this.balls.length === 2) {
            const ball1 = this.balls[0];
            const ball2 = this.balls[1];
            const dx = ball2.x - ball1.x;
            const dy = ball2.y - ball1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ball1.radius + ball2.radius) {
                // Elastic collision
                const nx = dx / distance;
                const ny = dy / distance;
                
                // Separate balls
                const overlap = (ball1.radius + ball2.radius) - distance;
                ball1.x -= nx * overlap * 0.5;
                ball1.y -= ny * overlap * 0.5;
                ball2.x += nx * overlap * 0.5;
                ball2.y += ny * overlap * 0.5;
                
                // Exchange velocities along collision normal
                const v1n = ball1.vx * nx + ball1.vy * ny;
                const v2n = ball2.vx * nx + ball2.vy * ny;
                
                ball1.vx += (v2n - v1n) * nx;
                ball1.vy += (v2n - v1n) * ny;
                ball2.vx += (v1n - v2n) * nx;
                ball2.vy += (v1n - v2n) * ny;
                
                // Add slight energy boost to maintain chaos
                const energyBoost = 1.02;
                ball1.vx *= energyBoost;
                ball1.vy *= energyBoost;
                ball2.vx *= energyBoost;
                ball2.vy *= energyBoost;
            }
        }
        
        // Ensure minimum speed to prevent balls from getting stuck
        this.balls.forEach(ball => {
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (speed < this.settings.ballSpeed * 0.5) {
                const angle = Math.random() * Math.PI * 2;
                ball.vx = Math.cos(angle) * this.settings.ballSpeed;
                ball.vy = Math.sin(angle) * this.settings.ballSpeed;
            }
        });
    }
    
    adjustZoom() {
        // Find outermost active ring
        let outermostRadius = 0;
        for (let i = this.rings.length - 1; i >= 0; i--) {
            if (this.rings[i].active) {
                outermostRadius = this.rings[i].radius;
                break;
            }
        }
        
        if (outermostRadius > 0) {
            // Calculate zoom to keep outermost ring visible with some padding
            const padding = 50;
            const maxDimension = Math.min(this.canvas.width, this.canvas.height);
            this.zoomFactor = (maxDimension / 2 - padding) / outermostRadius;
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        
        // Apply zoom and center
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.scale(this.zoomFactor, this.zoomFactor);
        
        // Draw rings
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2 / this.zoomFactor;
        
        this.rings.forEach((ring, index) => {
            if (!ring.active) return;
            
            this.ctx.beginPath();
            
            // Draw ring with gap
            const gapRadians = this.settings.gapSize * Math.PI / 180;
            const gapStart = ring.gapAngle * Math.PI / 180 - gapRadians / 2;
            const gapEnd = ring.gapAngle * Math.PI / 180 + gapRadians / 2;
            
            // Draw first arc (before gap)
            this.ctx.arc(0, 0, ring.radius, gapEnd, gapStart + Math.PI * 2);
            this.ctx.stroke();
        });
        
        // Draw balls
        this.balls.forEach(ball => {
            this.ctx.fillStyle = ball.color;
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add glow effect
            this.ctx.shadowColor = ball.color;
            this.ctx.shadowBlur = 10 / this.zoomFactor;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
        
        this.ctx.restore();
    }
    
    updateUI() {
        document.getElementById('questionText').textContent = this.settings.questionText;
        document.getElementById('leftLabel').textContent = this.settings.answer1Label;
        document.getElementById('rightLabel').textContent = this.settings.answer2Label;
        document.getElementById('leftCounter').textContent = this.scores.left;
        document.getElementById('rightCounter').textContent = this.scores.right;
        
        // Update colors
        document.getElementById('scoreLeft').style.color = this.settings.answer1Color;
        document.getElementById('scoreLeft').style.backgroundColor = this.settings.answer1Color + '40';
        document.getElementById('scoreRight').style.color = this.settings.answer2Color;
        document.getElementById('scoreRight').style.backgroundColor = this.settings.answer2Color + '40';
        
        // Update timer
        const elapsed = (Date.now() - this.startTime) / 1000;
        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Calculate FPS
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            this.fps = Math.round(1000 / deltaTime);
            document.getElementById('fps').textContent = `FPS: ${this.fps}`;
        }
        
        this.updatePhysics(deltaTime);
        this.render();
        this.updateUI();
        
        // Check game end condition
        const activeRings = this.rings.filter(ring => ring.active).length;
        if (activeRings === 0) {
            // Game over - all rings destroyed
            setTimeout(() => {
                alert(`Game Over!\n${this.settings.answer1Label}: ${this.scores.left}\n${this.settings.answer2Label}: ${this.scores.right}`);
                this.initializeGame();
            }, 1000);
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.startTime += Date.now() - this.pauseTime;
        } else {
            this.pauseTime = Date.now();
        }
    }
}

// Global functions for HTML events
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('hidden');
}

function applySettings() {
    const questionInput = document.getElementById('questionInput').value;
    const answer1Label = document.getElementById('answer1Label').value;
    const answer1Color = document.getElementById('answer1Color').value;
    const answer2Label = document.getElementById('answer2Label').value;
    const answer2Color = document.getElementById('answer2Color').value;
    const ringCount = parseInt(document.getElementById('ringCount').value);
    const gapSize = parseInt(document.getElementById('gapSize').value);
    const ballSpeed = parseFloat(document.getElementById('ballSpeed').value);
    
    game.settings = {
        questionText: questionInput,
        answer1Label: answer1Label,
        answer1Color: answer1Color,
        answer2Label: answer2Label,
        answer2Color: answer2Color,
        ringCount: ringCount,
        gapSize: gapSize,
        ballSpeed: ballSpeed
    };
    
    game.initializeGame();
    toggleSettings();
}

function togglePause() {
    game.togglePause();
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new ChaoticBallAnimation();
});

// Handle audio context resume (required for modern browsers)
document.addEventListener('click', () => {
    if (game && game.audioContext && game.audioContext.state === 'suspended') {
        game.audioContext.resume();
    }
}, { once: true });