// Advanced GSAP Animations for Gamification/Streaks Page
class GamificationAnimations {
    constructor() {
        this.tl = gsap.timeline();
        this.streakCounters = {};
        this.init();
    }

    init() {
        // Register GSAP plugins
        gsap.registerPlugin(ScrollTrigger, TextPlugin, MorphSVGPlugin);
        
        // Initialize animations when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initAnimations());
        } else {
            this.initAnimations();
        }
    }

    initAnimations() {
        this.setupPageLoad();
        this.setupScrollAnimations();
        this.setupInteractiveAnimations();
        this.setupStreakAnimations();
        this.setupLevelAnimations();
        this.setupParticleEffects();
        this.setupAchievementAnimations();
    }

    setupPageLoad() {
        // Page load sequence with staggered animations
        const tl = gsap.timeline();

        // Animate page header with trophy effect
        tl.from('.page-header h1', {
            duration: 1.5,
            y: -100,
            opacity: 0,
            ease: 'bounce.out',
            onComplete: () => {
                // Continuous trophy float
                gsap.to('.page-header h1::after', {
                    duration: 2,
                    y: -10,
                    ease: 'power2.inOut',
                    repeat: -1,
                    yoyo: true
                });
            }
        })
        .from('.page-header p', {
            duration: 0.8,
            y: 30,
            opacity: 0,
            ease: 'power2.out'
        }, '-=0.8')

        // Level display with golden glow
        .from('.level-display', {
            duration: 1.2,
            scale: 0.5,
            opacity: 0,
            ease: 'back.out(1.7)',
            onComplete: () => {
                this.animateLevelGlow();
            }
        }, '-=0.6')

        // Navigation pills with bounce
        .from('.nav-pills .nav-link', {
            duration: 0.8,
            scale: 0,
            opacity: 0,
            stagger: 0.1,
            ease: 'back.out(2)',
            transformOrigin: 'center center'
        }, '-=0.4')

        // Main content cards with wave effect
        .from('.glass-card', {
            duration: 1,
            y: 100,
            opacity: 0,
            stagger: 0.15,
            ease: 'power3.out'
        }, '-=0.3');

        // Background animation
        this.animateBackground();
    }

    setupScrollAnimations() {
        // Streak cards scroll animations
        gsap.utils.toArray('.streak-card').forEach((card, index) => {
            gsap.fromTo(card, {
                y: 80,
                opacity: 0,
                scale: 0.8,
                rotationY: 45
            }, {
                y: 0,
                opacity: 1,
                scale: 1,
                rotationY: 0,
                duration: 1,
                ease: 'back.out(1.7)',
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    end: 'bottom 15%',
                    toggleActions: 'play none none reverse',
                    onEnter: () => this.animateStreakCard(card)
                }
            });
        });

        // Achievement cards with 3D flip effect
        gsap.utils.toArray('.achievement-card').forEach((card, index) => {
            gsap.fromTo(card, {
                rotationY: 180,
                opacity: 0,
                scale: 0.5
            }, {
                rotationY: 0,
                opacity: 1,
                scale: 1,
                duration: 1.2,
                ease: 'back.out(1.7)',
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    end: 'bottom 15%',
                    toggleActions: 'play none none reverse'
                }
            });
        });

        // Milestone cards with slide and glow
        gsap.utils.toArray('.milestone-card').forEach((card, index) => {
            gsap.fromTo(card, {
                x: index % 2 === 0 ? -100 : 100,
                opacity: 0,
                scale: 0.9
            }, {
                x: 0,
                opacity: 1,
                scale: 1,
                duration: 0.8,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    end: 'bottom 15%',
                    toggleActions: 'play none none reverse'
                }
            });
        });
    }

    setupInteractiveAnimations() {
        // Tab switching with morphing effect
        document.querySelectorAll('[data-bs-toggle="pill"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const targetPane = document.querySelector(e.target.getAttribute('href'));
                
                // Animate tab content
                gsap.fromTo(targetPane.children, {
                    y: 50,
                    opacity: 0,
                    scale: 0.95
                }, {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.8,
                    stagger: 0.1,
                    ease: 'power3.out'
                });

                // Special animations for specific tabs
                if (e.target.getAttribute('href') === '#streaks') {
                    this.animateStreakNumbers();
                } else if (e.target.getAttribute('href') === '#character') {
                    this.animateCharacterStats();
                }
            });
        });

        // Button hover effects with ripple
        gsap.utils.toArray('.btn').forEach(btn => {
            btn.addEventListener('mouseenter', (e) => {
                this.createRippleEffect(e.target, e);
                
                gsap.to(btn, {
                    duration: 0.3,
                    scale: 1.05,
                    y: -3,
                    ease: 'power2.out'
                });
            });

            btn.addEventListener('mouseleave', () => {
                gsap.to(btn, {
                    duration: 0.3,
                    scale: 1,
                    y: 0,
                    ease: 'power2.out'
                });
            });
        });

        // Card hover effects
        gsap.utils.toArray('.glass-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                gsap.to(card, {
                    duration: 0.4,
                    y: -15,
                    scale: 1.03,
                    ease: 'power2.out'
                });
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    duration: 0.4,
                    y: 0,
                    scale: 1,
                    ease: 'power2.out'
                });
            });
        });
    }

    setupStreakAnimations() {
        // Animate streak numbers with counting effect
        this.animateStreakNumbers();

        // Fire effect for high streaks
        gsap.utils.toArray('.streak-card').forEach(card => {
            const streakNumber = parseInt(card.querySelector('.streak-number')?.textContent || '0');
            
            if (streakNumber >= 7) {
                card.classList.add('on-fire');
                this.createFireEffect(card);
            }
        });

        // Streak milestone celebrations
        this.setupStreakMilestones();
    }

    setupLevelAnimations() {
        // Level number animation
        const levelElement = document.getElementById('userLevel');
        if (levelElement) {
            const targetLevel = parseInt(levelElement.textContent);
            
            gsap.fromTo(levelElement, {
                textContent: 0
            }, {
                textContent: targetLevel,
                duration: 2,
                ease: 'power2.out',
                snap: { textContent: 1 },
                onUpdate: function() {
                    levelElement.textContent = Math.round(this.targets()[0].textContent);
                }
            });
        }

        // XP progress bar animation
        const xpBar = document.getElementById('xpProgressBar');
        if (xpBar) {
            const targetWidth = xpBar.style.width;
            
            gsap.fromTo(xpBar, {
                width: '0%'
            }, {
                width: targetWidth,
                duration: 2,
                ease: 'power2.out',
                delay: 0.5
            });
        }

        // Level glow effect
        this.animateLevelGlow();
    }

    setupParticleEffects() {
        // Create floating particles
        this.createFloatingParticles();
        
        // Achievement unlock particles
        this.setupAchievementParticles();
        
        // Streak fire particles
        this.setupStreakParticles();
    }

    setupAchievementAnimations() {
        // Achievement unlock animation
        gsap.utils.toArray('.achievement-card:not(.achievement-locked)').forEach(card => {
            // Add shine effect
            this.addShineEffect(card);
            
            // Hover animation
            card.addEventListener('mouseenter', () => {
                gsap.to(card, {
                    duration: 0.3,
                    scale: 1.1,
                    rotationY: 5,
                    ease: 'power2.out'
                });
                
                this.createAchievementGlow(card);
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    duration: 0.3,
                    scale: 1,
                    rotationY: 0,
                    ease: 'power2.out'
                });
            });
        });
    }

    // Helper animation methods
    animateStreakNumbers() {
        gsap.utils.toArray('.streak-number').forEach(element => {
            const targetValue = parseInt(element.textContent);
            
            gsap.fromTo(element, {
                textContent: 0
            }, {
                textContent: targetValue,
                duration: 1.5,
                ease: 'power2.out',
                snap: { textContent: 1 },
                onUpdate: function() {
                    element.textContent = Math.round(this.targets()[0].textContent);
                }
            });
        });
    }

    animateCharacterStats() {
        gsap.utils.toArray('.stat-fill').forEach((bar, index) => {
            const targetWidth = bar.style.width;
            
            gsap.fromTo(bar, {
                width: '0%'
            }, {
                width: targetWidth,
                duration: 1.5,
                ease: 'power2.out',
                delay: index * 0.2
            });
        });
    }

    animateLevelGlow() {
        const levelDisplay = document.querySelector('.level-display');
        if (levelDisplay) {
            gsap.to(levelDisplay, {
                duration: 2,
                boxShadow: '0 20px 60px rgba(247, 151, 30, 0.6)',
                ease: 'power2.inOut',
                repeat: -1,
                yoyo: true
            });
        }
    }

    animateBackground() {
        gsap.to('body::before', {
            duration: 15,
            backgroundPosition: '100% 100%',
            ease: 'none',
            repeat: -1
        });
    }

    animateStreakCard(card) {
        // Add floating animation
        gsap.to(card, {
            duration: 4,
            y: -5,
            ease: 'power2.inOut',
            repeat: -1,
            yoyo: true
        });

        // Icon animation
        const icon = card.querySelector('i');
        if (icon) {
            gsap.to(icon, {
                duration: 2,
                rotation: 360,
                ease: 'power2.inOut',
                repeat: -1
            });
        }
    }

    createFireEffect(card) {
        const fireParticles = [];
        
        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 8px;
                background: linear-gradient(to top, #ff6b6b, #ffa500);
                border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
                pointer-events: none;
                z-index: 10;
            `;
            
            card.appendChild(particle);
            fireParticles.push(particle);
            
            gsap.set(particle, {
                x: Math.random() * card.offsetWidth,
                y: card.offsetHeight
            });
            
            gsap.to(particle, {
                duration: Math.random() * 2 + 1,
                y: -20,
                x: `+=${Math.random() * 20 - 10}`,
                opacity: 0,
                scale: 0,
                ease: 'power2.out',
                repeat: -1,
                delay: Math.random() * 2
            });
        }
    }

    createRippleEffect(element, event) {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            pointer-events: none;
            left: ${x - 10}px;
            top: ${y - 10}px;
            z-index: 1;
        `;
        
        element.appendChild(ripple);
        
        gsap.to(ripple, {
            duration: 0.6,
            scale: 10,
            opacity: 0,
            ease: 'power2.out',
            onComplete: () => ripple.remove()
        });
    }

    createFloatingParticles() {
        const particleCount = 20;
        const container = document.body;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'floating-particle';
            particle.style.cssText = `
                position: fixed;
                width: ${Math.random() * 6 + 2}px;
                height: ${Math.random() * 6 + 2}px;
                background: ${this.getRandomColor()};
                border-radius: 50%;
                pointer-events: none;
                z-index: -1;
                opacity: ${Math.random() * 0.7 + 0.3};
            `;
            
            container.appendChild(particle);

            gsap.set(particle, {
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 50
            });

            gsap.to(particle, {
                duration: Math.random() * 15 + 10,
                y: -50,
                x: `+=${Math.random() * 300 - 150}`,
                rotation: Math.random() * 720,
                ease: 'none',
                repeat: -1,
                delay: Math.random() * 10
            });
        }
    }

    setupStreakMilestones() {
        // Check for milestone achievements
        gsap.utils.toArray('.streak-number').forEach(element => {
            const streakValue = parseInt(element.textContent);
            const milestones = [7, 14, 30, 50, 100];
            
            milestones.forEach(milestone => {
                if (streakValue === milestone) {
                    this.celebrateMilestone(element, milestone);
                }
            });
        });
    }

    celebrateMilestone(element, milestone) {
        // Create celebration effect
        const celebration = document.createElement('div');
        celebration.innerHTML = `🎉 ${milestone} Day Milestone! 🎉`;
        celebration.style.cssText = `
            position: absolute;
            top: -50px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--gold-gradient);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-weight: bold;
            z-index: 1000;
            white-space: nowrap;
        `;
        
        element.parentElement.appendChild(celebration);
        
        gsap.fromTo(celebration, {
            y: -20,
            opacity: 0,
            scale: 0.5
        }, {
            y: -50,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: 'back.out(1.7)'
        });
        
        setTimeout(() => {
            gsap.to(celebration, {
                y: -80,
                opacity: 0,
                duration: 1,
                ease: 'power2.out',
                onComplete: () => celebration.remove()
            });
        }, 3000);
    }

    setupAchievementParticles() {
        gsap.utils.toArray('.achievement-card:not(.achievement-locked)').forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.createAchievementBurst(card);
            });
        });
    }

    createAchievementBurst(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 8px;
                height: 8px;
                background: ${this.getRandomColor()};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                left: ${centerX}px;
                top: ${centerY}px;
            `;
            
            document.body.appendChild(particle);

            const angle = (i / 12) * Math.PI * 2;
            const distance = 80;
            const endX = centerX + Math.cos(angle) * distance;
            const endY = centerY + Math.sin(angle) * distance;

            gsap.to(particle, {
                duration: 1,
                x: endX - centerX,
                y: endY - centerY,
                scale: 0,
                opacity: 0,
                ease: 'power2.out',
                onComplete: () => particle.remove()
            });
        }
    }

    addShineEffect(element) {
        const shine = document.createElement('div');
        shine.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
            pointer-events: none;
            z-index: 1;
        `;
        
        element.appendChild(shine);
        
        gsap.to(shine, {
            duration: 2,
            left: '100%',
            ease: 'power2.inOut',
            repeat: -1,
            repeatDelay: 3
        });
    }

    createAchievementGlow(element) {
        gsap.to(element, {
            duration: 0.5,
            boxShadow: '0 0 30px rgba(102, 126, 234, 0.6)',
            ease: 'power2.out'
        });
    }

    setupStreakParticles() {
        gsap.utils.toArray('.streak-card.on-fire').forEach(card => {
            setInterval(() => {
                this.createStreakParticle(card);
            }, 500);
        });
    }

    createStreakParticle(card) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 3px;
            height: 3px;
            background: #ff6b6b;
            border-radius: 50%;
            pointer-events: none;
            z-index: 5;
        `;
        
        card.appendChild(particle);
        
        gsap.set(particle, {
            x: Math.random() * card.offsetWidth,
            y: card.offsetHeight
        });
        
        gsap.to(particle, {
            duration: 2,
            y: -30,
            x: `+=${Math.random() * 20 - 10}`,
            opacity: 0,
            ease: 'power2.out',
            onComplete: () => particle.remove()
        });
    }

    getRandomColor() {
        const colors = [
            'rgba(102, 126, 234, 0.7)',
            'rgba(240, 147, 251, 0.7)',
            'rgba(79, 172, 254, 0.7)',
            'rgba(67, 233, 123, 0.7)',
            'rgba(255, 230, 109, 0.7)'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Public methods for external use
    animateNewAchievement(achievementData) {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="achievement-modal">
                <div class="achievement-content">
                    <div class="achievement-icon">${achievementData.icon}</div>
                    <h3>Achievement Unlocked!</h3>
                    <h4>${achievementData.name}</h4>
                    <p>${achievementData.description}</p>
                    <div class="xp-reward">+${achievementData.xpReward} XP</div>
                </div>
            </div>
        `;
        
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        document.body.appendChild(modal);
        
        const content = modal.querySelector('.achievement-content');
        gsap.fromTo(content, {
            scale: 0,
            rotation: 180,
            opacity: 0
        }, {
            scale: 1,
            rotation: 0,
            opacity: 1,
            duration: 1,
            ease: 'back.out(1.7)'
        });
        
        // Auto close after 4 seconds
        setTimeout(() => {
            gsap.to(modal, {
                opacity: 0,
                duration: 0.5,
                onComplete: () => modal.remove()
            });
        }, 4000);
    }

    animateStreakIncrease(streakType, newValue) {
        const streakElement = document.getElementById(`${streakType}Streak`);
        if (streakElement) {
            // Pulse effect
            gsap.to(streakElement, {
                duration: 0.3,
                scale: 1.3,
                ease: 'power2.out',
                onComplete: () => {
                    gsap.to(streakElement, {
                        duration: 0.3,
                        scale: 1,
                        ease: 'back.out(1.7)'
                    });
                }
            });
            
            // Update number with counting animation
            gsap.to(streakElement, {
                duration: 1,
                textContent: newValue,
                ease: 'power2.out',
                snap: { textContent: 1 }
            });
        }
    }
}

// Initialize animations when GSAP is loaded
if (typeof gsap !== 'undefined') {
    window.gamificationAnimations = new GamificationAnimations();
} else {
    // Wait for GSAP to load
    const checkGSAP = setInterval(() => {
        if (typeof gsap !== 'undefined') {
            clearInterval(checkGSAP);
            window.gamificationAnimations = new GamificationAnimations();
        }
    }, 100);
}