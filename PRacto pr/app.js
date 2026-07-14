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
        revealTimeline.from('.reveal-text', {
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

        // 2. Pin horizontal track scroll with dynamic velocity skews (Speed Blur) - Desktop Only
        const track = document.querySelector('.horizontal-scroll-track');
        let longformTween;
        const isDesktop = window.innerWidth > 1024;
        
        if (track && isDesktop) {
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
        }

        // 3. Pin horizontal track scroll for Viral Shorts (10 phone mockups) - Desktop Only
        const shortsTrack = document.querySelector('.shorts-slider-track');
        let shortsTween;
        if (shortsTrack && isDesktop) {
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
        }

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

            const wrapperRect = logoWrapper.getBoundingClientRect();
            const dockRect = logoDock.getBoundingClientRect();

            // Target scale (relative to starting dynamic layout dimensions)
            const targetScaleX = dockRect.width / initialWidth;
            const targetScaleY = dockRect.height / initialHeight;

            // Start coordinates (centered inside hero-logo-wrapper)
            const startX = wrapperRect.left + (wrapperRect.width - initialWidth) / 2;
            const startY = wrapperRect.top + (wrapperRect.height - initialHeight) / 2;

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

            this.cursor.style.left = `${this.cursorPos.x}px`;
            this.cursor.style.top = `${this.cursorPos.y}px`;

            // Lerp follower ring
            const dx = this.mouse.x - this.followerPos.x;
            const dy = this.mouse.y - this.followerPos.y;

            this.followerPos.x += dx * 0.08;
            this.followerPos.y += dy * 0.08;

            this.follower.style.left = `${this.followerPos.x}px`;
            this.follower.style.top = `${this.followerPos.y}px`;

            // Elastic stretch effect
            const dist = Math.sqrt(dx * dx + dy * dy);
            const scaleX = 1 + Math.min(dist * 0.015, 0.85);
            const scaleY = 1 - Math.min(dist * 0.01, 0.45);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;

            if (dist > 3) {
                this.cursor.style.transform = `translate(-50%, -50%) rotate(${angle}deg) scale(${scaleX}, ${scaleY})`;
            } else {
                this.cursor.style.transform = `translate(-50%, -50%) scale(1)`;
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

            submitText.textContent = "SENDING BRIEF...";
            submitBtn.style.backgroundColor = 'var(--color-border-focus)';
            submitBtn.style.color = '#fff';

            setTimeout(() => {
                submitText.textContent = "BRIEF RECEIVED! ⚡";
                submitIcon.textContent = "✓";
                submitBtn.style.backgroundColor = 'var(--color-white)';
                submitBtn.style.color = '#000';

                setTimeout(() => {
                    form.reset();
                    submitText.textContent = "SUBMIT BRIEF";
                    submitIcon.textContent = "◢";
                    submitBtn.style.backgroundColor = 'var(--color-white)';
                    submitBtn.style.color = '#000';
                }, 2500);
            }, 1200);
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
        const text = element.textContent.trim();
        const words = text.split(' ');

        element.innerHTML = words.map(word => {
            const chars = word.split('').map(char => {
                return `<span class="char-span">${char}</span>`;
            }).join('');
            return `<span class="word-span" style="display: inline-block; white-space: nowrap;">${chars}</span>`;
        }).join(' ');
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
