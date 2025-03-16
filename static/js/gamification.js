// Gamification functionality

document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const badgesContainer = document.getElementById('badges-container');
  const leaderboardContainer = document.getElementById('leaderboard-container');
  
  // Initialize badges
  if (badgesContainer) {
    initBadges();
  }
  
  // Initialize leaderboard
  if (leaderboardContainer) {
    initLeaderboard();
  }
  
  // Initialize badges section
  function initBadges() {
    // Get badges data if present
    const badgesData = badgesContainer.getAttribute('data-badges');
    
    if (!badgesData) {
      // Fetch badges if not provided in data attribute
      fetchBadges();
    } else {
      // Display badges from data attribute
      displayBadges(JSON.parse(badgesData));
    }
  }
  
  // Fetch user badges from API
  async function fetchBadges() {
    try {
      const response = await fetch('/api/user-badges');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch badges');
      }
      
      displayBadges(data.badges);
      
    } catch (error) {
      console.error('Error fetching badges:', error);
      badgesContainer.innerHTML = `<div class="alert alert-danger">Error loading badges: ${error.message}</div>`;
    }
  }
  
  // Display badges in container
  function displayBadges(badges) {
    if (!badges || badges.length === 0) {
      badgesContainer.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          You haven't earned any badges yet. Start classifying waste to earn your first badge!
        </div>
      `;
      return;
    }
    
    // Badge icons mapping
    const badgeIcons = {
      'Beginner Recycler': 'seedling',
      'Waste Warrior': 'shield-alt',
      'Eco Champion': 'award',
      'Sustainability Expert': 'star',
      'Planet Protector': 'globe-americas'
    };
    
    // Badge colors mapping
    const badgeColors = {
      'Beginner Recycler': 'success',
      'Waste Warrior': 'primary',
      'Eco Champion': 'warning',
      'Sustainability Expert': 'info',
      'Planet Protector': 'danger'
    };
    
    // Create badges HTML
    const badgesHTML = badges.map(badge => {
      const icon = badgeIcons[badge.name] || 'medal';
      const color = badgeColors[badge.name] || 'secondary';
      
      return `
        <div class="col-md-4 col-lg-3 mb-4">
          <div class="card badge-card h-100">
            <div class="badge-icon bg-${color} text-white mx-auto">
              <i class="fas fa-${icon}"></i>
            </div>
            <div class="card-body text-center">
              <h5 class="card-title">${badge.name}</h5>
              <p class="card-text small">${badge.description}</p>
              ${badge.earned_date ? 
                `<small class="text-muted">Earned on ${new Date(badge.earned_date).toLocaleDateString()}</small>` : 
                `<small class="text-muted">Required: ${badge.points_required} points</small>`
              }
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    badgesContainer.innerHTML = `
      <div class="row">
        ${badgesHTML}
      </div>
    `;
  }
  
  // Initialize leaderboard
  function initLeaderboard() {
    fetchLeaderboard();
  }
  
  // Fetch leaderboard data
  async function fetchLeaderboard() {
    try {
      const response = await fetch('/api/leaderboard');
      
      // If this endpoint doesn't exist yet, show placeholder
      if (response.status === 404) {
        displayLeaderboardPlaceholder();
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }
      
      displayLeaderboard(data.leaderboard);
      
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      displayLeaderboardPlaceholder();
    }
  }
  
  // Display leaderboard
  function displayLeaderboard(leaderboard) {
    if (!leaderboard || leaderboard.length === 0) {
      displayLeaderboardPlaceholder();
      return;
    }
    
    // Create leaderboard rows
    const rows = leaderboard.map((user, index) => {
      // Highlight current user
      const isCurrentUser = user.is_current_user;
      const rowClass = isCurrentUser ? 'table-primary' : '';
      
      // Medal for top 3
      let medal = '';
      if (index === 0) medal = '<i class="fas fa-medal text-warning"></i>';
      else if (index === 1) medal = '<i class="fas fa-medal text-secondary"></i>';
      else if (index === 2) medal = '<i class="fas fa-medal text-danger"></i>';
      
      return `
        <tr class="${rowClass}">
          <td class="text-center">${index + 1} ${medal}</td>
          <td>
            <div class="d-flex align-items-center">
              <span class="me-2">${user.username}</span>
              ${isCurrentUser ? '<span class="badge bg-info ms-auto">You</span>' : ''}
            </div>
          </td>
          <td class="text-end">${user.points}</td>
          <td class="text-end">${user.carbon_saved.toFixed(1)} kg</td>
          <td class="text-center">${user.badge_count}</td>
        </tr>
      `;
    }).join('');
    
    leaderboardContainer.innerHTML = `
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">Community Leaderboard</h5>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-dark">
                <tr>
                  <th class="text-center">Rank</th>
                  <th>Username</th>
                  <th class="text-end">Points</th>
                  <th class="text-end">Carbon Saved</th>
                  <th class="text-center">Badges</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
  
  // Display placeholder for leaderboard when not available
  function displayLeaderboardPlaceholder() {
    leaderboardContainer.innerHTML = `
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">Community Leaderboard</h5>
        </div>
        <div class="card-body">
          <div class="text-center py-4">
            <i class="fas fa-trophy fa-3x mb-3 text-muted"></i>
            <h5>Leaderboard Coming Soon</h5>
            <p class="text-muted">
              Start classifying waste to earn points and compete with other users!
            </p>
          </div>
        </div>
      </div>
    `;
  }
  
  // Check for badge notification
  function checkNewBadge() {
    const newBadgeData = localStorage.getItem('newBadge');
    if (newBadgeData) {
      try {
        const badge = JSON.parse(newBadgeData);
        showBadgeNotification(badge);
        localStorage.removeItem('newBadge');
      } catch (error) {
        console.error('Error parsing badge data:', error);
        localStorage.removeItem('newBadge');
      }
    }
  }
  
  // Show badge notification
  function showBadgeNotification(badge) {
    // Badge icons mapping
    const badgeIcons = {
      'Beginner Recycler': 'seedling',
      'Waste Warrior': 'shield-alt',
      'Eco Champion': 'award',
      'Sustainability Expert': 'star',
      'Planet Protector': 'globe-americas'
    };
    
    // Badge colors mapping
    const badgeColors = {
      'Beginner Recycler': 'success',
      'Waste Warrior': 'primary',
      'Eco Champion': 'warning',
      'Sustainability Expert': 'info',
      'Planet Protector': 'danger'
    };
    
    const icon = badgeIcons[badge.name] || 'medal';
    const color = badgeColors[badge.name] || 'secondary';
    
    // Create modal dynamically
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'badgeModal';
    modal.tabIndex = '-1';
    modal.setAttribute('aria-labelledby', 'badgeModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-${color} text-white">
            <h5 class="modal-title" id="badgeModalLabel">New Badge Earned!</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center py-4">
            <div class="badge-icon bg-${color} text-white mx-auto mb-3" style="width: 100px; height: 100px; font-size: 3rem;">
              <i class="fas fa-${icon}"></i>
            </div>
            <h4>${badge.name}</h4>
            <p>${badge.description}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <a href="/profile" class="btn btn-primary">View All Badges</a>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show the modal
    const badgeModal = new bootstrap.Modal(document.getElementById('badgeModal'));
    badgeModal.show();
    
    // Remove modal from DOM after hiding
    document.getElementById('badgeModal').addEventListener('hidden.bs.modal', function() {
      document.body.removeChild(modal);
    });
  }
  
  // Check for new badges on page load
  checkNewBadge();
});
