// -------------------------------------------------------------
// DEE J PRODUCTIONS - SOOTHING AMBIENT SOUNDSCAPE & UI SYNTH
// -------------------------------------------------------------

class SoundManager {
    constructor() {
        // Separate adjustable volumes
        this.ambientVolume = 0.0; // Default off until user turns it up or expands panel
        this.sfxVolume = 0.7;     // Default 70% level for UI responses

        // HTML5 Audio elements pointing to local, high-fidelity pleasant soundscapes
        this.rainAudio = new Audio('rain.mp3');
        this.rainAudio.loop = true;
        this.rainAudio.volume = this.ambientVolume;

        this.thunderAudio = new Audio('thunder.mp3');
        this.thunderAudio.volume = this.ambientVolume * 0.55; // Calibrate thunder to rain level

        // Web Audio Context for responsive UI feedback sounds
        this.ctx = null;
        this.panel = null;

        this.initAudioPanel();
        this.initGestureResumer();
        
        window.addEventListener('DOMContentLoaded', () => {
            this.bindUISounds();
        });
    }

    // Initialize or resume AudioContext safely matching browser gesture policies
    initAudioContext(isGesture = false) {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.warn("Web Audio API is not supported in this browser environment.");
                return;
            }
            this.ctx = new AudioContextClass();
            this.setupThunderLoop();
        }

        // Resume AudioContext only when triggered inside a direct user gesture
        if (isGesture && this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
                console.log("AudioContext successfully resumed via user gesture.");
            }).catch(err => {
                console.warn("Failed to resume AudioContext:", err);
            });
        }
    }

    // Setup a one-time global click listener to unlock Web Audio API constraints on first load
    initGestureResumer() {
        const resumeOnGesture = () => {
            this.initAudioContext(true);
            document.removeEventListener('click', resumeOnGesture);
            document.removeEventListener('touchstart', resumeOnGesture);
        };
        document.addEventListener('click', resumeOnGesture, { passive: true });
        document.addEventListener('touchstart', resumeOnGesture, { passive: true });
    }

    setupThunderLoop() {
        const triggerThunder = () => {
            if (this.ambientVolume === 0) {
                // If muted, wait and check back later
                setTimeout(triggerThunder, 5000);
                return;
            }

            // Reset and trigger a cozy thunder rumble scaled to ambient levels
            this.thunderAudio.currentTime = 0;
            this.thunderAudio.volume = (Math.random() * 0.08 + 0.08) * this.ambientVolume;
            
            const playPromise = this.thunderAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => console.log("Thunder playback prevented."));
            }

            // Schedule the next thunder strike in 25 to 45 seconds
            setTimeout(triggerThunder, Math.random() * 20000 + 25000);
        };

        // Queue initial thunder roll after a brief introductory rain interval
        setTimeout(triggerThunder, 12000);
    }

    // Play a cinematic pitch-sweeping hum on hover (deep sub-bass, extremely cozy)
    playHoverHum() {
        if (this.sfxVolume === 0) return;
        this.initAudioContext(false); // Try to get context, but don't force resume (since mouseenter is not a gesture)
        if (!this.ctx || this.ctx.state === 'suspended') return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        // Sub-bass sine sweep (feels premium, no metallic buzz!)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, now); // Low A drone pitch
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.1);

        // Scale by sfxVolume variable
        gain.gain.setValueAtTime(0.06 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.11);
    }

    // Play a smooth droplet pop on click (tactile edit click)
    playClickTick() {
        if (this.sfxVolume === 0) return;
        this.initAudioContext(true); // Direct click is a gesture, force resume
        if (!this.ctx || this.ctx.state === 'suspended') return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        // Water-pop click envelope (soft sine curve)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);

        // Scale by sfxVolume variable
        gain.gain.setValueAtTime(0.08 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    initAudioPanel() {
        const panel = document.createElement('div');
        panel.className = 'audio-panel-wrapper';
        panel.innerHTML = `
            <button id="audio-panel-trigger" aria-label="Toggle audio settings">
                <span class="audio-icon">🔇</span>
                <span class="audio-text">SOUND EFFECT</span>
            </button>
            <div id="audio-settings-menu">
                <div class="audio-settings-header">
                    <span>AUDIO CONTROLS</span>
                    <button class="audio-menu-close" aria-label="Close audio controls">✕</button>
                </div>
                <div class="audio-settings-body">
                    <div class="audio-control-row">
                        <div class="audio-control-label-row">
                            <span class="audio-control-label">AMBIENT STORM</span>
                            <span class="audio-volume-value" id="val-ambient">0%</span>
                        </div>
                        <input type="range" id="slider-ambient" min="0" max="100" value="0" class="audio-volume-slider">
                    </div>
                    <div class="audio-control-row">
                        <div class="audio-control-label-row">
                            <span class="audio-control-label">UI SOUNDS</span>
                            <span class="audio-volume-value" id="val-sfx">70%</span>
                        </div>
                        <input type="range" id="slider-sfx" min="0" max="100" value="70" class="audio-volume-slider">
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        this.panel = panel;

        const trigger = panel.querySelector('#audio-panel-trigger');
        const closeBtn = panel.querySelector('.audio-menu-close');
        const sliderAmbient = panel.querySelector('#slider-ambient');
        const sliderSFX = panel.querySelector('#slider-sfx');
        const valAmbient = panel.querySelector('#val-ambient');
        const valSFX = panel.querySelector('#val-sfx');

        // Toggle panel expansion drawer
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.initAudioContext(true); // Click is a direct user gesture, force resume AudioContext

            panel.classList.toggle('expanded');
            
            // Auto-trigger default activation of storm sound loop if user expands the panel and ambient is at 0
            if (panel.classList.contains('expanded') && this.ambientVolume === 0) {
                this.ambientVolume = 0.25;
                sliderAmbient.value = 25;
                valAmbient.textContent = '25%';
                
                this.rainAudio.volume = this.ambientVolume;
                this.thunderAudio.volume = this.ambientVolume * 0.55;
                
                trigger.classList.add('active');
                trigger.querySelector('.audio-icon').textContent = '🔊';
                
                const playPromise = this.rainAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => console.log("Rain playback prevented."));
                }
            }
        });

        // Close button
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.remove('expanded');
        });

        // Ambient volume slider
        sliderAmbient.addEventListener('input', () => {
            const val = parseInt(sliderAmbient.value);
            this.ambientVolume = val / 100;
            valAmbient.textContent = `${val}%`;

            this.rainAudio.volume = this.ambientVolume;
            this.thunderAudio.volume = this.ambientVolume * 0.55;

            if (val > 0) {
                trigger.classList.add('active');
                trigger.querySelector('.audio-icon').textContent = '🔊';
                const playPromise = this.rainAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => console.log("Rain playback prevented."));
                }
            } else {
                trigger.classList.remove('active');
                trigger.querySelector('.audio-icon').textContent = '🔇';
                this.rainAudio.pause();
                this.thunderAudio.pause();
            }
        });

        // UI sfx volume slider
        sliderSFX.addEventListener('input', () => {
            const val = parseInt(sliderSFX.value);
            this.sfxVolume = val / 100;
            valSFX.textContent = `${val}%`;
        });

        // Soft click confirmation preview after dragging the SFX slider
        sliderSFX.addEventListener('change', () => {
            this.playClickTick();
        });

        // Click outside to collapse the controls panel
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target)) {
                panel.classList.remove('expanded');
            }
        });
    }

    bindUISounds() {
        // Bind hover and click responses to interactive elements without selector overlapping duplicates
        const elements = document.querySelectorAll('a, button, .video-card, .phone-mockup, .review-card');
        
        elements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                this.playHoverHum();
            });
            el.addEventListener('click', () => {
                this.playClickTick();
            });
        });
    }
}

// Instantiate Sound Manager globally
window.soundManager = new SoundManager();
