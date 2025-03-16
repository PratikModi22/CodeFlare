// Gamification and reward system functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeGameElements();
    checkForLevelUp();
    setupAchievementTracking();
});

// Initialize game elements
function initializeGameElements() {
    updateProgressBar();
    initializeTooltips();
}

// Update level progress bar
function updateProgressBar() {
    const progressBar = document.getElementById('level-progress');
    if (!progressBar) return;
    
    const progressValue = progressBar.getAttribute('data-progress') || 0;
    
    // Animate the progress bar
    let width = 0;
    const interval = setInterval(function() {
        if (width >= progressValue) {
            clearInterval(interval);
        } else {
            width++;
            progressBar.style.width = width + '%';
            progressBar.setAttribute('aria-valuenow', width);
        }
    }, 10);
}

// Initialize tooltips
function initializeTooltips() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Check for level up
function checkForLevelUp() {
    const levelUpElement = document.getElementById('level-up-notification');
    if (!levelUpElement) return;
    
    const hasLeveledUp = levelUpElement.getAttribute('data-level-up') === 'true';
    
    if (hasLeveledUp) {
        showLevelUpNotification();
    }
}

// Show level up notification
function showLevelUpNotification() {
    const level = document.getElementById('user-level') ? 
                 document.getElementById('user-level').textContent : '?';
    
    // Create the notification element
    const notification = document.createElement('div');
    notification.className = 'level-up-notification';
    notification.innerHTML = `
        <div class="level-up-content">
            <div class="level-up-icon">
                <i class="fas fa-award"></i>
            </div>
            <h3>Level Up!</h3>
            <p>Congratulations! You've reached Level ${level}</p>
            <p>Keep up the great work in reducing waste!</p>
            <button class="btn btn-primary mt-3" onclick="dismissLevelUp(this.parentNode.parentNode)">
                Awesome!
            </button>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Add animation classes after a small delay
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Play sound effect if available
    playSound('level-up');
}

// Dismiss level up notification
function dismissLevelUp(element) {
    if (!element) return;
    
    element.classList.remove('show');
    
    // Remove from DOM after animation
    setTimeout(() => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }, 500);
}

// Setup achievement tracking
function setupAchievementTracking() {
    const achievements = document.querySelectorAll('.badge-item');
    
    achievements.forEach(achievement => {
        const earned = achievement.getAttribute('data-earned') === 'true';
        
        if (earned) {
            achievement.classList.add('badge-earned');
            achievement.classList.remove('badge-unearned');
        } else {
            achievement.classList.add('badge-unearned');
            achievement.classList.remove('badge-earned');
        }
    });
}

// Award new badge
function awardBadge(badgeId) {
    const badge = document.querySelector(`.badge-item[data-badge-id="${badgeId}"]`);
    if (!badge || badge.getAttribute('data-earned') === 'true') return;
    
    // Mark as earned
    badge.setAttribute('data-earned', 'true');
    badge.classList.add('badge-earned');
    badge.classList.remove('badge-unearned');
    
    // Show notification
    const badgeName = badge.getAttribute('data-badge-name') || 'New Badge';
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'badge-notification';
    notification.innerHTML = `
        <div class="badge-notification-content">
            <div class="badge-icon">
                <i class="${badge.querySelector('i').className}"></i>
            </div>
            <h4>New Badge Earned!</h4>
            <p>${badgeName}</p>
            <button class="btn btn-sm btn-primary mt-2" onclick="dismissNotification(this.parentNode.parentNode)">
                Nice!
            </button>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Add animation classes after a small delay
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Play sound effect if available
    playSound('badge-earned');
}

// Dismiss notification
function dismissNotification(element) {
    if (!element) return;
    
    element.classList.remove('show');
    
    // Remove from DOM after animation
    setTimeout(() => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }, 500);
}

// Play sound effect
function playSound(soundName) {
    // Check if sound is enabled in user preferences
    const soundEnabled = localStorage.getItem('sound_enabled') !== 'false';
    if (!soundEnabled) return;
    
    // Sound effect URLs (could be replaced with actual audio files)
    const soundEffects = {
        'level-up': 'https://freesound.org/data/previews/270/270404_5123851-lq.mp3',
        'badge-earned': 'https://freesound.org/data/previews/270/270402_5123851-lq.mp3',
        'points-earned': 'https://freesound.org/data/previews/270/270342_5123851-lq.mp3'
    };
    
    // If sound exists, play it
    if (soundEffects[soundName]) {
        try {
            const audio = new Audio(soundEffects[soundName]);
            audio.volume = 0.5;  // 50% volume
            audio.play().catch(e => console.log('Sound play error:', e));
        } catch (e) {
            console.log('Sound error:', e);
        }
    }
}

// Toggle sound effects
function toggleSoundEffects() {
    const soundEnabled = localStorage.getItem('sound_enabled') !== 'false';
    
    // Toggle the setting
    localStorage.setItem('sound_enabled', !soundEnabled);
    
    // Update button if it exists
    const soundButton = document.getElementById('sound-toggle');
    if (soundButton) {
        if (!soundEnabled) {
            soundButton.innerHTML = '<i class="fas fa-volume-up"></i>';
            soundButton.setAttribute('title', 'Sound On');
            playSound('points-earned');  // Play a test sound
        } else {
            soundButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
            soundButton.setAttribute('title', 'Sound Off');
        }
        
        // Refresh tooltip if using Bootstrap tooltips
        const tooltip = bootstrap.Tooltip.getInstance(soundButton);
        if (tooltip) {
            tooltip.dispose();
            new bootstrap.Tooltip(soundButton);
        }
    }
}

// Add points animation
function animatePointsEarned(points) {
    if (!points || points <= 0) return;
    
    // Create points animation element
    const pointsAnimation = document.createElement('div');
    pointsAnimation.className = 'points-animation';
    pointsAnimation.innerHTML = `+${points} points`;
    
    // Add to document
    document.body.appendChild(pointsAnimation);
    
    // Position randomly on the top half of the screen
    const randomX = Math.floor(Math.random() * (window.innerWidth - 200)) + 100;
    const randomY = Math.floor(Math.random() * (window.innerHeight / 2)) + 100;
    
    pointsAnimation.style.left = `${randomX}px`;
    pointsAnimation.style.top = `${randomY}px`;
    
    // Add animation class
    setTimeout(() => {
        pointsAnimation.classList.add('show');
    }, 10);
    
    // Remove after animation completes
    setTimeout(() => {
        pointsAnimation.classList.remove('show');
        setTimeout(() => {
            if (pointsAnimation.parentNode) {
                pointsAnimation.parentNode.removeChild(pointsAnimation);
            }
        }, 1000);
    }, 2000);
    
    // Play sound effect
    playSound('points-earned');
}
