// -------------------------------------------------------------
// DEE J PRODUCTIONS - CORE INTERACTION ENGINE
// -------------------------------------------------------------

class App {
    constructor() {
        this.cursor = document.querySelector('.custom-cursor');
        this.follower = document.querySelector('.custom-cursor-follower');
        this.modal = document.getElementById('video-modal');
        this.modalContainer = document.getElementById('modal-player-container');
        this.modalClose = document.getElementById('modal-close');

        // Mouse positions
        this.mouse = { x: 0, y: 0 };
        this.cursorPos = { x: 0, y: 0 };
        this.followerPos = { x: 0, y: 0 };

        this.wrapVideoCards();
        this.initLenis();
        this.initGSAP();
        this.initLogoDocking();
        this.initCursor();
        this.initVideos();
        this.initContactForm();
        this.initReviewsSlider();
        this.initAdminLogin();
    }

    initLenis() {
        // Initialize smooth scroll
        this.lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1.0,
            touchMultiplier: 2.0,
            infinite: false,
        });

        // Sync GSAP ScrollTrigger with Lenis
        this.lenis.on('scroll', (e) => {
            ScrollTrigger.update();

            // Send scroll metrics to WebGL background shader
            if (window.webGLBackground) {
                const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                const progress = maxScroll > 0 ? e.scroll / maxScroll : 0;
                window.webGLBackground.updateScroll(progress, e.velocity);
            }
        });

        gsap.ticker.add((time) => {
            this.lenis.raf(time * 1000);
        });

        // Intercept anchor link clicks for smooth Lenis scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    this.lenis.scrollTo(targetElement, {
                        offset: -20,
                        duration: 1.2
                    });
                }
            });
        });

        gsap.ticker.lagSmoothing(0);
    }

    initGSAP() {
        gsap.registerPlugin(ScrollTrigger);

        // 1. Hero text reveal animations
        const revealTimeline = gsap.timeline();
        revealTimeline.from('.hero-title .reveal-text', {
            y: '100%',
            opacity: 0,
            duration: 1.2,
            stagger: 0.15,
            ease: 'power4.out',
            delay: 0.3
        }).from('.hero-tagline', {
            width: 0,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
        }, "-=0.8").from('.hero-desc', {
            y: 30,
            opacity: 0,
            duration: 1.0,
            ease: 'power3.out'
        }, "-=0.6").from('.scroll-indicator', {
            y: 20,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
        }, "-=0.6");

        // 2. Pin horizontal track scroll with dynamic velocity skews (Speed Blur) - Responsive
        const mm = gsap.matchMedia();
        const track = document.querySelector('.horizontal-scroll-track');
        const shortsTrack = document.querySelector('.shorts-slider-track');

        mm.add("(min-width: 1025px)", () => {
            let longformTween;
            if (track) {
                // Check if horizontal scrolling is actually needed based on track size
                if (track.scrollWidth > window.innerWidth) {
                    longformTween = gsap.to(track, {
                        x: () => -(track.scrollWidth - window.innerWidth + window.innerWidth * 0.1),
                        ease: 'none',
                        scrollTrigger: {
                            trigger: '.longform-section',
                            pin: true,
                            scrub: 1.2,
                            start: 'top top',
                            end: () => `+=${track.scrollWidth - window.innerWidth + 300}`,
                            invalidateOnRefresh: true,
                            onUpdate: (self) => {
                                // Calculate scroll velocity
                                const velocity = self.getVelocity();
                                // Clamp horizontal skew warp between -10 and 10 degrees
                                const skew = gsap.utils.clamp(-10, 10, velocity * 0.005);
                                // Slightly scale height down to simulate vertical speed compression
                                const scaleY = 1 - Math.min(Math.abs(velocity) * 0.0001, 0.04);

                                gsap.to(track.querySelectorAll('.video-card'), {
                                    skewX: skew,
                                    scaleY: scaleY,
                                    duration: 0.4,
                                    ease: 'power1.out',
                                    overwrite: 'auto'
                                });
                            },
                            onToggle: (self) => {
                                // Cleanly settle back to flat when leaving section bounds
                                if (!self.isActive) {
                                    gsap.to(track.querySelectorAll('.video-card'), {
                                        skewX: 0,
                                        scaleY: 1,
                                        duration: 0.5,
                                        ease: 'power2.out',
                                        overwrite: 'auto'
                                    });
                                }
                            }
                        }
                    });

                    // Emerging plant animation for longform cards
                    const longCards = track.querySelectorAll('.video-card-wrapper');
                    longCards.forEach(card => {
                        gsap.fromTo(card,
                            {
                                y: 120,
                                scaleY: 0.2,
                                scaleX: 0.9,
                                rotation: -3,
                                opacity: 0,
                                transformOrigin: "bottom center"
                            },
                            {
                                y: 0,
                                scaleY: 1,
                                scaleX: 1,
                                rotation: 0,
                                opacity: 1,
                                ease: "power2.out",
                                scrollTrigger: {
                                    trigger: card,
                                    containerAnimation: longformTween,
                                    start: "left 100%",
                                    end: "left 75%",
                                    scrub: 1.2
                                }
                            }
                        );
                    });
                } else {
                    // If items fit on the desktop viewport, center them and use standard vertical reveals
                    track.style.justifyContent = 'center';
                    const longCards = track.querySelectorAll('.video-card-wrapper');
                    longCards.forEach(card => {
                        gsap.fromTo(card,
                            {
                                y: 80,
                                scaleY: 0.5,
                                scaleX: 0.95,
                                rotation: -2,
                                opacity: 0,
                                transformOrigin: "bottom center"
                            },
                            {
                                y: 0,
                                scaleY: 1,
                                scaleX: 1,
                                rotation: 0,
                                opacity: 1,
                                ease: "power2.out",
                                scrollTrigger: {
                                    trigger: card,
                                    start: "top 95%",
                                    end: "top 75%",
                                    scrub: 1.2
                                }
                            }
                        );
                    });
                }
            }

            // 3. Pin horizontal track scroll for Viral Shorts (phone mockups)
            let shortsTween;
            if (shortsTrack) {
                // Check if horizontal scrolling is actually needed based on track size
                if (shortsTrack.scrollWidth > window.innerWidth) {
                    shortsTween = gsap.to(shortsTrack, {
                        x: () => -(shortsTrack.scrollWidth - window.innerWidth + window.innerWidth * 0.1),
                        ease: 'none',
                        scrollTrigger: {
                            trigger: '.shorts-section',
                            pin: true,
                            scrub: 1.2,
                            start: 'top top',
                            end: () => `+=${shortsTrack.scrollWidth - window.innerWidth + 300}`,
                            invalidateOnRefresh: true,
                            onUpdate: (self) => {
                                // Apply dynamic speed-blur skew to shorts cards on scroll
                                const velocity = self.getVelocity();
                                const skew = gsap.utils.clamp(-8, 8, velocity * 0.004);
                                const scaleY = 1 - Math.min(Math.abs(velocity) * 0.0001, 0.03);

                                gsap.to(shortsTrack.querySelectorAll('.phone-mockup'), {
                                    skewX: skew,
                                    scaleY: scaleY,
                                    duration: 0.4,
                                    ease: 'power1.out',
                                    overwrite: 'auto'
                                });
                            },
                            onToggle: (self) => {
                                // Cleanly reset coordinates when scrolling out of bounds
                                if (!self.isActive) {
                                    gsap.to(shortsTrack.querySelectorAll('.phone-mockup'), {
                                        skewX: 0,
                                        scaleY: 1,
                                        duration: 0.5,
                                        ease: 'power2.out',
                                        overwrite: 'auto'
                                    });
                                }
                            }
                        }
                    });

                    // Emerging plant animation for short cards
                    const shortCards = shortsTrack.querySelectorAll('.video-card-wrapper');
                    shortCards.forEach(card => {
                        gsap.fromTo(card,
                            {
                                y: 120,
                                scaleY: 0.2,
                                scaleX: 0.9,
                                rotation: 3,
                                opacity: 0,
                                transformOrigin: "bottom center"
                            },
                            {
                                y: 0,
                                scaleY: 1,
                                scaleX: 1,
                                rotation: 0,
                                opacity: 1,
                                ease: "power2.out",
                                scrollTrigger: {
                                    trigger: card,
                                    containerAnimation: shortsTween,
                                    start: "left 100%",
                                    end: "left 75%",
                                    scrub: 1.2
                                }
                            }
                        );
                    });
                } else {
                    // If items fit on the desktop viewport, center them and use standard vertical reveals
                    shortsTrack.style.justifyContent = 'center';
                    const shortCards = shortsTrack.querySelectorAll('.video-card-wrapper');
                    shortCards.forEach(card => {
                        gsap.fromTo(card,
                            {
                                y: 80,
                                scaleY: 0.5,
                                scaleX: 0.95,
                                rotation: 2,
                                opacity: 0,
                                transformOrigin: "bottom center"
                            },
                            {
                                y: 0,
                                scaleY: 1,
                                scaleX: 1,
                                rotation: 0,
                                opacity: 1,
                                ease: "power2.out",
                                scrollTrigger: {
                                    trigger: card,
                                    start: "top 95%",
                                    end: "top 75%",
                                    scrub: 1.2
                                }
                            }
                        );
                    });
                }
            }
        });

        mm.add("(max-width: 1024px)", () => {
            // Clean up desktop layout styles when sizing down
            if (track) track.style.justifyContent = '';
            if (shortsTrack) shortsTrack.style.justifyContent = '';
        });

        // 4. Emerging plant animation for Showreel (vertical scroll)
        const showreelWrapper = document.querySelector('.showreel-wrapper');
        if (showreelWrapper) {
            gsap.fromTo(showreelWrapper,
                {
                    y: 120,
                    scaleY: 0.2,
                    scaleX: 0.9,
                    rotation: -3,
                    opacity: 0,
                    transformOrigin: "bottom center"
                },
                {
                    y: 0,
                    scaleY: 1,
                    scaleX: 1,
                    rotation: 0,
                    opacity: 1,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: showreelWrapper,
                        start: "top 100%",
                        end: "top 72%",
                        scrub: 1.2
                    }
                }
            );
        }

        // 5. Hero Left Panel Scroll Parallax / Skew / Fade Out
        const heroLeft = document.querySelector('.hero-left');
        if (heroLeft) {
            gsap.to(heroLeft, {
                y: -120,
                opacity: 0,
                scale: 0.94,
                skewX: -6,
                ease: 'none',
                scrollTrigger: {
                    trigger: '#hero',
                    start: 'top top',
                    end: 'bottom 40%',
                    scrub: true
                }
            });
        }

        // 6. Section Titles Stagger Character Reveal
        document.querySelectorAll('.section-title, .reviews-title').forEach(title => {
            this.splitTextToSpans(title);
            const chars = title.querySelectorAll('.char-span');
            gsap.fromTo(chars,
                {
                    y: 50,
                    opacity: 0,
                    rotation: 8
                },
                {
                    y: 0,
                    opacity: 1,
                    rotation: 0,
                    duration: 0.8,
                    stagger: 0.02,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: title,
                        start: "top 85%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        });

        const contactHeading = document.querySelector('.contact-heading');
        if (contactHeading) {
            this.splitTextToSpans(contactHeading);
            const chars = contactHeading.querySelectorAll('.char-span');
            gsap.fromTo(chars,
                {
                    y: 50,
                    opacity: 0,
                    rotation: 8
                },
                {
                    y: 0,
                    opacity: 1,
                    rotation: 0,
                    duration: 0.8,
                    stagger: 0.02,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: contactHeading,
                        start: "top 85%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        }

        // 7. Section Numbers Reveal
        document.querySelectorAll('.section-num, .contact-label').forEach(num => {
            gsap.fromTo(num,
                {
                    letterSpacing: "12px",
                    opacity: 0
                },
                {
                    letterSpacing: "2px",
                    opacity: 0.85,
                    duration: 0.9,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: num,
                        start: "top 90%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        });

        // 8. Description Texts Reveal
        document.querySelectorAll('.section-subtitle, .contact-sub').forEach(desc => {
            gsap.fromTo(desc,
                {
                    y: 30,
                    opacity: 0
                },
                {
                    y: 0,
                    opacity: 1,
                    duration: 1.0,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: desc,
                        start: "top 90%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        });
    }

    initLogoDocking() {
        const logoContainer = document.getElementById('hero-logo-container');
        const logoDock = document.getElementById('logo-dock');
        const logoWrapper = document.getElementById('hero-logo-wrapper');
        const logoText = document.querySelector('.logo-text');

        if (!logoContainer || !logoDock || !logoWrapper) return;

        // Set starting state
        logoContainer.style.position = 'absolute';
        logoContainer.style.left = '50%';
        logoContainer.style.top = '50%';
        logoContainer.style.transform = 'translate(-50%, -50%)';

        // Get initial rendered dimensions for responsive coordinate math
        const initialRect = logoContainer.getBoundingClientRect();
        const initialWidth = initialRect.width || 320;
        const initialHeight = initialRect.height || 350;

        // Cache layout dimensions to prevent thrashed reflow calculations on scroll
        let wrapperRectAt0 = null;
        let dockRect = null;

        const cacheBounds = () => {
            const wRect = logoWrapper.getBoundingClientRect();
            const dRect = logoDock.getBoundingClientRect();
            const currentScroll = window.scrollY;
            
            wrapperRectAt0 = {
                left: wRect.left,
                top: wRect.top + currentScroll,
                width: wRect.width,
                height: wRect.height
            };
            
            dockRect = {
                left: dRect.left,
                top: dRect.top,
                width: dRect.width,
                height: dRect.height
            };
        };

        cacheBounds();

        const updateLogoPosition = (progress) => {
            // Restore static absolute position when scroll is at zero to allow hover glitching in place
            if (progress < 0.005 && window.scrollY < 10) {
                logoContainer.style.position = 'absolute';
                logoContainer.style.left = '50%';
                logoContainer.style.top = '50%';
                logoContainer.style.transform = 'translate(-50%, -50%)';
                logoContainer.style.margin = '0';
                logoText.classList.remove('visible');
                return;
            }

            // Target scale (relative to starting dynamic layout dimensions)
            const targetScaleX = dockRect.width / initialWidth;
            const targetScaleY = dockRect.height / initialHeight;

            // Start coordinates (centered inside hero-logo-wrapper, offset by current viewport scroll)
            const currentScroll = window.scrollY;
            const startX = wrapperRectAt0.left + (wrapperRectAt0.width - initialWidth) / 2;
            const startY = (wrapperRectAt0.top - currentScroll) + (wrapperRectAt0.height - initialHeight) / 2;

            // Target coordinates (inside header logo-dock)
            const endX = dockRect.left;
            const endY = dockRect.top;

            // Linear interpolation based on scroll progress
            const curX = startX + (endX - startX) * progress;
            const curY = startY + (endY - startY) * progress;
            const curScaleX = 1 + (targetScaleX - 1) * progress;
            const curScaleY = 1 + (targetScaleY - 1) * progress;

            // Lock to fixed viewport positions during scroll
            logoContainer.style.position = 'fixed';
            logoContainer.style.left = `${curX}px`;
            logoContainer.style.top = `${curY}px`;
            logoContainer.style.margin = '0';

            // Modern Futuristic 3D Scroll Rotation (720 degree Y coin-spin, 360 degree Z spin)
            const rotY = progress * 720;
            const rotZ = progress * 360;
            logoContainer.style.transform = `scale(${curScaleX}, ${curScaleY}) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;

            // Show logo branding text once docked
            if (progress > 0.85) {
                logoText.classList.add('visible');
                logoContainer.classList.add('docked');
            } else {
                logoText.classList.remove('visible');
                logoContainer.classList.remove('docked');
            }
        };

        // ScrollTrigger sequence
        ScrollTrigger.create({
            trigger: "#hero",
            start: "top top",
            end: "bottom 30%",
            scrub: true,
            onUpdate: (self) => {
                updateLogoPosition(self.progress);
            },
            onLeave: () => {
                updateLogoPosition(1);
            },
            onEnterBack: () => {
                updateLogoPosition(0);
            }
        });

        // Initialize state on load
        updateLogoPosition(0);

        // Responsive re-alignment
        window.addEventListener('resize', () => {
            cacheBounds();
            updateLogoPosition(window.scrollY > window.innerHeight * 0.4 ? 1 : 0);
        });

        ScrollTrigger.addEventListener('refresh', () => {
            cacheBounds();
            updateLogoPosition(window.scrollY > window.innerHeight * 0.4 ? 1 : 0);
        });
    }

    initCursor() {
        window.cursorFollower = this.follower;

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        const updateTick = () => {
            // Lerp main dot
            this.cursorPos.x += (this.mouse.x - this.cursorPos.x) * 0.22;
            this.cursorPos.y += (this.mouse.y - this.cursorPos.y) * 0.22;

            // Lerp follower ring
            const dx = this.mouse.x - this.followerPos.x;
            const dy = this.mouse.y - this.followerPos.y;

            this.followerPos.x += dx * 0.08;
            this.followerPos.y += dy * 0.08;

            this.follower.style.transform = `translate3d(${this.followerPos.x}px, ${this.followerPos.y}px, 0) translate(-50%, -50%)`;

            // Elastic stretch effect
            const dist = Math.sqrt(dx * dx + dy * dy);
            const scaleX = 1 + Math.min(dist * 0.015, 0.85);
            const scaleY = 1 - Math.min(dist * 0.01, 0.45);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;

            if (dist > 3) {
                this.cursor.style.transform = `translate3d(${this.cursorPos.x}px, ${this.cursorPos.y}px, 0) translate(-50%, -50%) rotate(${angle}deg) scale(${scaleX}, ${scaleY})`;
            } else {
                this.cursor.style.transform = `translate3d(${this.cursorPos.x}px, ${this.cursorPos.y}px, 0) translate(-50%, -50%) scale(1)`;
            }

            requestAnimationFrame(updateTick);
        };
        requestAnimationFrame(updateTick);

        // Event triggers for hoverable assets
        document.querySelectorAll('a, button, select, textarea, .video-card, .showreel-wrapper, .review-card').forEach(el => {
            el.addEventListener('mouseenter', () => {
                this.follower.classList.add('hover-link');
                if (el.classList.contains('video-card') || el.classList.contains('showreel-wrapper')) {
                    this.cursor.classList.add('play-mode');
                    this.cursor.querySelector('.cursor-text').textContent = 'PLAY';
                }
            });

            el.addEventListener('mouseleave', () => {
                this.follower.classList.remove('hover-link');
                this.cursor.classList.remove('play-mode');
            });
        });
    }

    initVideos() {
        const playVideo = (videoId, isShort = false) => {
            let iframeUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0&modestbranding=1&enablejsapi=1`;

            if (isShort) {
                this.modal.classList.add('short-modal');
                iframeUrl += `&loop=1&playlist=${videoId}`;
            } else {
                this.modal.classList.remove('short-modal');
            }

            this.modalContainer.innerHTML = `
                <iframe 
                    src="${iframeUrl}" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowfullscreen>
                </iframe>
            `;

            this.modal.classList.add('active');
            this.lenis.stop();
        };

        const closeVideo = () => {
            this.modal.classList.remove('active');
            this.modalContainer.innerHTML = '';
            this.lenis.start();
        };

        // Modal click bindings
        document.querySelectorAll('[data-video-id]').forEach(card => {
            card.addEventListener('click', () => {
                const videoId = card.getAttribute('data-video-id');
                const isShort = card.classList.contains('phone-mockup') || card.classList.contains('short-card');
                if (videoId) playVideo(videoId, isShort);
            });
        });

        this.modalClose.addEventListener('click', closeVideo);
        this.modal.querySelector('.modal-backdrop').addEventListener('click', closeVideo);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                closeVideo();
            }
        });
    }

    initContactForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('.submit-btn');
            const submitText = form.querySelector('.submit-btn-text');
            const submitIcon = form.querySelector('.submit-btn-icon');

            // Collect form input elements
            const nameInput = document.getElementById('booking-name');
            const emailInput = document.getElementById('booking-email');
            const formatInput = document.getElementById('booking-format');
            const visionInput = document.getElementById('booking-vision');

            if (!nameInput || !emailInput || !formatInput || !visionInput) return;

            const payload = {
                name: nameInput.value,
                email: emailInput.value,
                format: formatInput.value,
                vision: visionInput.value
            };

            // Update UI to sending state
            submitText.textContent = "SENDING BRIEF...";
            submitBtn.style.backgroundColor = 'var(--color-border-focus)';
            submitBtn.style.color = '#fff';
            submitBtn.disabled = true;

            // Construct absolute URL if page is loaded via file:/// protocol, otherwise use relative path
            const targetUrl = window.location.protocol === 'file:' 
                ? 'http://localhost:8000/api/booking' 
                : '/api/booking';

            // Perform booking HTTP API POST request
            fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Server responded with an error status: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                // Success feedback UI update
                submitText.textContent = "BRIEF RECEIVED! ⚡";
                submitIcon.textContent = "✓";
                submitBtn.style.backgroundColor = 'var(--color-white)';
                submitBtn.style.color = '#000';

                setTimeout(() => {
                    form.reset();
                    submitText.textContent = "SUBMIT BRIEF";
                    submitIcon.textContent = "◢";
                    submitBtn.disabled = false;
                }, 2500);
            })
            .catch(err => {
                console.error("Booking submission error:", err);
                
                // Error feedback UI update
                submitText.textContent = "ERROR. TRY AGAIN! ✕";
                submitIcon.textContent = "✕";
                submitBtn.style.backgroundColor = '#ff3333';
                submitBtn.style.color = '#fff';

                setTimeout(() => {
                    submitText.textContent = "SUBMIT BRIEF";
                    submitIcon.textContent = "◢";
                    submitBtn.style.backgroundColor = 'var(--color-white)';
                    submitBtn.style.color = '#000';
                    submitBtn.disabled = false;
                }, 3000);
            });
        });
    }

    wrapVideoCards() {
        // Wrap longform cards
        document.querySelectorAll('.horizontal-scroll-track .video-card').forEach(card => {
            const wrapper = document.createElement('div');
            wrapper.className = 'video-card-wrapper long-card-wrapper';
            card.parentNode.insertBefore(wrapper, card);
            wrapper.appendChild(card);
        });

        // Wrap short cards
        document.querySelectorAll('.shorts-slider-track .phone-mockup').forEach(card => {
            const wrapper = document.createElement('div');
            wrapper.className = 'video-card-wrapper short-card-wrapper';
            card.parentNode.insertBefore(wrapper, card);
            wrapper.appendChild(card);
        });
    }

    splitTextToSpans(element) {
        if (!element) return;
        
        const recurse = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (!text.trim()) return;
                
                const parent = node.parentNode;
                const words = text.split(/(\s+)/);
                const fragment = document.createDocumentFragment();
                
                words.forEach(word => {
                    if (/\s+/.test(word)) {
                        fragment.appendChild(document.createTextNode(word));
                    } else if (word) {
                        const wordSpan = document.createElement('span');
                        wordSpan.className = 'word-span';
                        wordSpan.style.display = 'inline-block';
                        wordSpan.style.whiteSpace = 'nowrap';
                        
                        const chars = word.split('');
                        chars.forEach(char => {
                            const charSpan = document.createElement('span');
                            charSpan.className = 'char-span';
                            charSpan.textContent = char;
                            charSpan.style.display = 'inline-block';
                            charSpan.style.willChange = 'transform, opacity';
                            wordSpan.appendChild(charSpan);
                        });
                        fragment.appendChild(wordSpan);
                    }
                });
                
                parent.replaceChild(fragment, node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const children = Array.from(node.childNodes);
                children.forEach(child => recurse(child));
            }
        };
        
        recurse(element);
    }

    initReviewsSlider() {
        const cards = document.querySelectorAll('.review-card');
        const prevBtn = document.querySelector('.reviews-control-btn.prev-btn');
        const nextBtn = document.querySelector('.reviews-control-btn.next-btn');
        const indicator = document.querySelector('.active-index-label');

        if (!cards.length || !prevBtn || !nextBtn) return;

        let currentIndex = 0;

        const showReview = (index) => {
            cards.forEach((card, idx) => {
                if (idx === index) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });

            if (indicator) {
                indicator.textContent = `0${index + 1} / 0${cards.length}`;
            }

            currentIndex = index;
        };

        prevBtn.addEventListener('click', () => {
            let index = currentIndex - 1;
            if (index < 0) index = cards.length - 1;
            showReview(index);
        });

        nextBtn.addEventListener('click', () => {
            let index = currentIndex + 1;
            if (index >= cards.length) index = 0;
            showReview(index);
        });

        // Initialize first review display
        showReview(0);
    }

    initAdminLogin() {
        const trigger = document.getElementById('admin-trigger');
        const modal = document.getElementById('admin-modal');
        if (!trigger || !modal) return;

        const closeBtn = document.getElementById('admin-modal-close');
        const backdrop = document.getElementById('admin-modal-backdrop');
        const loginForm = document.getElementById('admin-login-form');
        const usernameInput = document.getElementById('admin-username-input');
        const passwordInput = document.getElementById('admin-password-input');
        const errorMsg = document.getElementById('admin-login-error');

        const openModal = () => {
            modal.classList.add('active');
            errorMsg.style.display = 'none';
            loginForm.reset();
            setTimeout(() => usernameInput.focus(), 100);
            if (this.lenis) this.lenis.stop(); // Stop scroll when modal is open
        };

        const closeModal = () => {
            modal.classList.remove('active');
            if (this.lenis) this.lenis.start(); // Resume scroll
        };

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });

        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (username === "Deepak" && password === "3321") {
                sessionStorage.setItem("admin_auth", "true");
                closeModal();
                window.location.href = "bookings.html";
            } else {
                errorMsg.style.display = 'block';
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
    }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Refresh ScrollTrigger positions once all resources (images/styles) are fully loaded
window.addEventListener('load', () => {
    setTimeout(() => {
        ScrollTrigger.refresh();
    }, 100);
});
