// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the achievement badges
    initializeAchievements();
    
    // Check for achievements notification when page loads
    checkForAchievements();
    
    // Add event listeners for the leaderboard tabs
    const leaderboardTabs = document.querySelectorAll('[data-bs-toggle="pill"][data-leaderboard]');
    leaderboardTabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            const leaderboardType = event.target.getAttribute('data-leaderboard');
            loadLeaderboard(leaderboardType);
        });
    });
    
    // Initialize tippy.js tooltips if available
    if (typeof tippy !== 'undefined') {
        tippy('[data-tippy-content]');
    }
});

// Initialize achievement badges with animations and tooltips
function initializeAchievements() {
    const achievementBadges = document.querySelectorAll('.achievement-badge');
    
    achievementBadges.forEach((badge, index) => {
        // Add a staggered animation delay
        badge.style.animationDelay = `${index * 0.1}s`;
        
        // Add hover effect
        badge.addEventListener('mouseenter', function() {
            this.classList.add('achievement-hover');
        });
        
        badge.addEventListener('mouseleave', function() {
            this.classList.remove('achievement-hover');
        });
        
        // For locked achievements, add a different style
        if (badge.classList.contains('locked')) {
            badge.style.filter = 'grayscale(1) opacity(0.6)';
        }
    });
}

// Check if the user has earned new achievements since last visit
function checkForAchievements() {
    // Check if there's a new achievement notification in session storage
    const newAchievements = sessionStorage.getItem('newAchievements');
    
    if (newAchievements) {
        // Parse the achievements
        const achievements = JSON.parse(newAchievements);
        
        // Display a congratulatory modal
        showAchievementModal(achievements);
        
        // Clear the session storage
        sessionStorage.removeItem('newAchievements');
    }
}

// Show modal for new achievements
function showAchievementModal(achievements) {
    // Create modal content for each achievement
    let achievementsHTML = '';
    
    achievements.forEach(achievement => {
        achievementsHTML += `
            <div class="achievement-item my-3 d-flex align-items-center">
                <div class="achievement-badge me-3">
                    <i class="fas ${achievement.icon || 'fa-award'} fa-2x"></i>
                </div>
                <div>
                    <h5 class="mb-1">${achievement.name}</h5>
                    <p class="mb-0 text-muted">${achievement.description}</p>
                </div>
            </div>
        `;
    });
    
    // Create the modal
    const modalHTML = `
        <div class="modal fade" id="achievementModal" tabindex="-1" aria-labelledby="achievementModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title" id="achievementModalLabel">
                            <i class="fas fa-trophy"></i> Achievement Unlocked!
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-4">
                            <div class="achievement-animation">
                                <i class="fas fa-award fa-4x text-warning"></i>
                            </div>
                            <h4 class="mt-3">Congratulations!</h4>
                            <p>You've earned ${achievements.length > 1 ? 'new achievements' : 'a new achievement'}!</p>
                        </div>
                        
                        <div class="achievements-list">
                            ${achievementsHTML}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Awesome!</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add the modal to the document
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal
    const achievementModal = new bootstrap.Modal(document.getElementById('achievementModal'));
    achievementModal.show();
    
    // Remove the modal from DOM when hidden
    document.getElementById('achievementModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Load different types of leaderboards
function loadLeaderboard(leaderboardType) {
    const leaderboardContainer = document.getElementById('leaderboard-content');
    
    if (!leaderboardContainer) return;
    
    // Show loading indicator
    leaderboardContainer.innerHTML = `
        <div class="text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading leaderboard...</p>
        </div>
    `;
    
    // Fetch the appropriate leaderboard data
    // In a real app, this would be an API call
    // For demo purposes, we'll simulate different leaderboards
    setTimeout(() => {
        let leaderboardHTML = '';
        
        switch (leaderboardType) {
            case 'points':
                leaderboardHTML = generatePointsLeaderboard();
                break;
            case 'carbon':
                leaderboardHTML = generateCarbonLeaderboard();
                break;
            case 'recycling':
                leaderboardHTML = generateRecyclingLeaderboard();
                break;
            default:
                leaderboardHTML = generatePointsLeaderboard();
        }
        
        leaderboardContainer.innerHTML = leaderboardHTML;
    }, 800); // Simulate network delay
}

// Generate points leaderboard HTML
function generatePointsLeaderboard() {
    // In a real app, this data would come from an API
    // For demo purposes, we'll use hardcoded data
    const leaderboardItems = document.querySelectorAll('.leaderboard-item');
    let leaderboardData = [];
    
    leaderboardItems.forEach(item => {
        leaderboardData.push({
            username: item.dataset.username,
            points: parseInt(item.dataset.points),
            avatar: item.dataset.avatar || getRandomAvatar()
        });
    });
    
    // If no data from DOM, use sample data
    if (leaderboardData.length === 0) {
        leaderboardData = getSampleLeaderboardData();
    }
    
    // Sort by points (highest first)
    leaderboardData.sort((a, b) => b.points - a.points);
    
    // Generate the HTML
    return generateLeaderboardHTML(leaderboardData, 'Points', 'trophy');
}

// Generate carbon savings leaderboard HTML
function generateCarbonLeaderboard() {
    // In a real app, this data would come from an API
    // For demo purposes, we'll use simulated data
    const sampleData = getSampleLeaderboardData();
    
    // Modify the data to show carbon savings instead of points
    const leaderboardData = sampleData.map(user => {
        return {
            ...user,
            // Simulate carbon savings as roughly proportional to points
            points: Math.round(user.points * 0.8) / 10
        };
    });
    
    // Sort by carbon savings (highest first)
    leaderboardData.sort((a, b) => b.points - a.points);
    
    // Generate the HTML
    return generateLeaderboardHTML(leaderboardData, 'kg CO2 Saved', 'leaf');
}

// Generate recycling count leaderboard HTML
function generateRecyclingLeaderboard() {
    // In a real app, this data would come from an API
    // For demo purposes, we'll use simulated data
    const sampleData = getSampleLeaderboardData();
    
    // Modify the data to show recycling count instead of points
    const leaderboardData = sampleData.map(user => {
        return {
            ...user,
            // Simulate recycling count as roughly proportional to points
            points: Math.round(user.points / 15)
        };
    });
    
    // Sort by recycling count (highest first)
    leaderboardData.sort((a, b) => b.points - a.points);
    
    // Generate the HTML
    return generateLeaderboardHTML(leaderboardData, 'Items Recycled', 'recycle');
}

// Generate generic leaderboard HTML
function generateLeaderboardHTML(data, pointsLabel, icon) {
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th scope="col">Rank</th>
                        <th scope="col">User</th>
                        <th scope="col">${pointsLabel}</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Add rows for each user
    data.forEach((user, index) => {
        // Determine if this is the current user
        const isCurrentUser = user.isCurrentUser || false;
        
        // Generate row with appropriate highlighting
        html += `
            <tr class="${isCurrentUser ? 'table-primary' : ''}">
                <td class="text-center">
                    ${getPositionHTML(index + 1)}
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar me-3">
                            ${user.avatar || getInitialsAvatar(user.username)}
                        </div>
                        <span>${user.username}</span>
                        ${isCurrentUser ? '<span class="badge bg-primary ms-2">You</span>' : ''}
                    </div>
                </td>
                <td>
                    <span class="badge bg-success rounded-pill">
                        <i class="fas fa-${icon}"></i> ${user.points}
                    </span>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}

// Get HTML for position indicators (gold, silver, bronze medals)
function getPositionHTML(position) {
    switch (position) {
        case 1:
            return '<div class="position-medal gold"><i class="fas fa-medal"></i><span>1</span></div>';
        case 2:
            return '<div class="position-medal silver"><i class="fas fa-medal"></i><span>2</span></div>';
        case 3:
            return '<div class="position-medal bronze"><i class="fas fa-medal"></i><span>3</span></div>';
        default:
            return `<div class="position-number">${position}</div>`;
    }
}

// Get initials avatar HTML
function getInitialsAvatar(username) {
    // Get the first letter of the username
    const initial = username.charAt(0).toUpperCase();
    
    // Generate a consistent color based on the username
    const hue = getHashValue(username) % 360;
    const color = `hsl(${hue}, 70%, 60%)`;
    
    return `
        <div class="initials-avatar" style="background-color: ${color};">
            ${initial}
        </div>
    `;
}

// Get a random avatar SVG
function getRandomAvatar() {
    // Create a simple SVG avatar with random colors
    const hue = Math.floor(Math.random() * 360);
    const color = `hsl(${hue}, 70%, 60%)`;
    
    return `
        <div class="initials-avatar" style="background-color: ${color};">
            <i class="fas fa-user"></i>
        </div>
    `;
}

// Get a hash value from a string
function getHashValue(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// Get sample leaderboard data for demo purposes
function getSampleLeaderboardData() {
    return [
        { username: "EcoWarrior", points: 1250, isCurrentUser: true },
        { username: "GreenThumb", points: 1420 },
        { username: "RecyclePro", points: 980 },
        { username: "EarthSaver", points: 1560 },
        { username: "WasteReducer", points: 850 },
        { username: "EcoChampion", points: 1320 },
        { username: "PlanetFriend", points: 760 },
        { username: "ClimateGuardian", points: 1100 },
        { username: "ZeroWaster", points: 1480 },
        { username: "GreenLiving", points: 920 }
    ];
}

// Function to handle points animation when user earns points
function animatePointsEarned(points) {
    // Create the floating points element
    const pointsElement = document.createElement('div');
    pointsElement.className = 'floating-points';
    pointsElement.innerHTML = `+${points} <i class="fas fa-star"></i>`;
    
    // Add to the document
    document.body.appendChild(pointsElement);
    
    // Start the animation
    setTimeout(() => {
        pointsElement.classList.add('animate');
        
        // Remove the element after animation completes
        setTimeout(() => {
            pointsElement.remove();
        }, 2000);
    }, 100);
    
    // Also update points counter if it exists
    const pointsCounter = document.getElementById('points-counter');
    if (pointsCounter) {
        const currentPoints = parseInt(pointsCounter.textContent);
        const newPoints = currentPoints + points;
        
        // Animate counting up
        animateCounterUp(pointsCounter, currentPoints, newPoints);
    }
}

// Function to animate a counter increasing
function animateCounterUp(element, start, end) {
    let current = start;
    const increment = Math.max(1, Math.floor((end - start) / 50));
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = current;
    }, 20);
}

// Store new achievements in session storage for notification
function storeNewAchievements(achievements) {
    sessionStorage.setItem('newAchievements', JSON.stringify(achievements));
}
