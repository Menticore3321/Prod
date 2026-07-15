// -------------------------------------------------------------
// DEE J PRODUCTIONS - BACKGROUND VIDEO ENGINE (SPOTLIGHT TRACKER)
// -------------------------------------------------------------

class WebGLBackground {
    constructor() {
        this.video = document.getElementById('bg-video');
        if (!this.video) return;

        // Ensure video is playing continuously
        const playPromise = this.video.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Autoplay blocked, waiting for user interaction fallback.");
                const forcePlay = () => {
                    this.video.play();
                    window.removeEventListener('click', forcePlay);
                    window.removeEventListener('touchstart', forcePlay);
                };
                window.addEventListener('click', forcePlay);
                window.addEventListener('touchstart', forcePlay);
            });
        }

        // Initialize target and current positions for lerping spotlight coordinates
        this.targetMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.currentMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

        this.bindEvents();
        
        // Cache function reference to avoid memory allocations inside render loop
        this.animate = this.animate.bind(this);
        this.animate();
    }

    bindEvents() {
        // Track desktop mouse coordinates
        window.addEventListener('mousemove', (e) => {
            this.targetMouse.x = e.clientX;
            this.targetMouse.y = e.clientY;
        });

        const updateTouch = (e) => {
            if (e.touches && e.touches[0]) {
                this.targetMouse.x = e.touches[0].clientX;
                this.targetMouse.y = e.touches[0].clientY;
            }
        };

        // Track touch coordinates for mobile compatibility
        window.addEventListener('touchstart', updateTouch);
        window.addEventListener('touchmove', updateTouch);
    }

    updateScroll(progress, velocity) {
        if (this.video) {
            // Apply parallax scroll offsets to simulate wind carrying the clouds
            const xShift = progress * 35;   // shift up to 35px horizontally
            const yShift = progress * -60;  // shift up to -60px vertically (upwards)
            this.video.style.transform = `translate(${xShift}px, ${yShift}px) scale(1.08)`;
        }
    }

    animate() {
        requestAnimationFrame(this.animate);

        // Smoothly interpolate spotlight position (adds soft cinematic weight to cursor tracking)
        this.currentMouse.x += (this.targetMouse.x - this.currentMouse.x) * 0.09;
        this.currentMouse.y += (this.targetMouse.y - this.currentMouse.y) * 0.09;

        // Inject current spotlight coordinates as CSS variables on the video element
        this.video.style.setProperty('--mouse-x', `${this.currentMouse.x}px`);
        this.video.style.setProperty('--mouse-y', `${this.currentMouse.y}px`);
    }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
    window.webGLBackground = new WebGLBackground();
});
