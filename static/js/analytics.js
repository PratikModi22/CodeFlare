// Analytics dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
  // Charts containers
  const wasteChartContainer = document.getElementById('waste-category-chart');
  const carbonChartContainer = document.getElementById('carbon-impact-chart');
  const pointsChartContainer = document.getElementById('points-chart');
  
  // Initialize charts if containers exist
  if (wasteChartContainer) {
    initWasteCategoryChart();
  }
  
  if (carbonChartContainer) {
    initCarbonImpactChart();
  }
  
  if (pointsChartContainer) {
    initPointsChart();
  }
  
  // Fetch user stats for the dashboard
  fetchUserStats();
  
  // Initialize waste category chart
  function initWasteCategoryChart() {
    // Get data from element's data attribute
    const wasteData = JSON.parse(wasteChartContainer.getAttribute('data-waste'));
    
    if (!wasteData || Object.keys(wasteData).length === 0) {
      wasteChartContainer.innerHTML = '<div class="alert alert-info">No waste data available yet.</div>';
      return;
    }
    
    // Prepare data for chart
    const categories = Object.keys(wasteData);
    const quantities = Object.values(wasteData);
    
    // Category colors
    const categoryColors = {
      'Plastic': '#3498db',
      'Paper': '#f1c40f',
      'Glass': '#1abc9c',
      'Metal': '#7f8c8d',
      'Organic': '#2ecc71',
      'Electronic': '#9b59b6',
      'Hazardous': '#e74c3c',
      'Non-recyclable': '#34495e'
    };
    
    // Get colors for categories
    const colors = categories.map(category => categoryColors[category] || '#777');
    
    // Create chart
    const ctx = document.createElement('canvas');
    wasteChartContainer.appendChild(ctx);
    
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [{
          data: quantities,
          backgroundColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#fff'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                return `${label}: ${value.toFixed(2)} kg`;
              }
            }
          }
        }
      }
    });
  }
  
  // Initialize carbon impact chart
  function initCarbonImpactChart() {
    // Get data from element's data attribute
    const carbonData = JSON.parse(carbonChartContainer.getAttribute('data-carbon'));
    
    if (!carbonData || carbonData.length === 0) {
      carbonChartContainer.innerHTML = '<div class="alert alert-info">No carbon impact data available yet.</div>';
      return;
    }
    
    // Process data - group by date and sum impacts
    const impactByDate = {};
    
    carbonData.forEach(item => {
      if (impactByDate[item.date]) {
        impactByDate[item.date] += item.impact;
      } else {
        impactByDate[item.date] = item.impact;
      }
    });
    
    // Sort dates
    const sortedDates = Object.keys(impactByDate).sort();
    
    // Prepare data for chart
    const chartData = {
      labels: sortedDates,
      datasets: [{
        label: 'Carbon Impact (kg CO2)',
        data: sortedDates.map(date => impactByDate[date]),
        fill: true,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(75, 192, 192, 1)',
        tension: 0.4
      }]
    };
    
    // Create chart
    const ctx = document.createElement('canvas');
    carbonChartContainer.appendChild(ctx);
    
    new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#fff'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          x: {
            ticks: {
              color: '#fff'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#fff'
            }
          }
        }
      }
    });
  }
  
  // Initialize points chart
  function initPointsChart() {
    // Get data from element's data attribute
    const pointsData = JSON.parse(pointsChartContainer.getAttribute('data-points'));
    
    if (!pointsData || pointsData.length === 0) {
      pointsChartContainer.innerHTML = '<div class="alert alert-info">No points data available yet.</div>';
      return;
    }
    
    // Process data - group by date and sum points
    const pointsByDate = {};
    
    pointsData.forEach(item => {
      if (pointsByDate[item.date]) {
        pointsByDate[item.date] += item.points;
      } else {
        pointsByDate[item.date] = item.points;
      }
    });
    
    // Sort dates
    const sortedDates = Object.keys(pointsByDate).sort();
    
    // Calculate cumulative points
    let cumulativePoints = 0;
    const cumulativeData = sortedDates.map(date => {
      cumulativePoints += pointsByDate[date];
      return cumulativePoints;
    });
    
    // Prepare data for chart
    const chartData = {
      labels: sortedDates,
      datasets: [
        {
          label: 'Points Earned per Day',
          data: sortedDates.map(date => pointsByDate[date]),
          backgroundColor: 'rgba(255, 159, 64, 0.7)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
          type: 'bar'
        },
        {
          label: 'Total Points',
          data: cumulativeData,
          fill: false,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          type: 'line',
          yAxisID: 'y1'
        }
      ]
    };
    
    // Create chart
    const ctx = document.createElement('canvas');
    pointsChartContainer.appendChild(ctx);
    
    new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Daily Points',
              color: '#fff'
            },
            ticks: {
              color: '#fff'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            title: {
              display: true,
              text: 'Total Points',
              color: '#fff'
            },
            ticks: {
              color: '#fff'
            },
            grid: {
              display: false
            }
          },
          x: {
            ticks: {
              color: '#fff'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#fff'
            }
          }
        }
      }
    });
  }
  
  // Fetch user statistics
  async function fetchUserStats() {
    const statsContainer = document.getElementById('user-stats');
    if (!statsContainer) return;
    
    try {
      const response = await fetch('/api/user-stats');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user statistics');
      }
      
      // Update stats on page
      updateUserStats(data.stats);
      
    } catch (error) {
      console.error('Error fetching user stats:', error);
      statsContainer.innerHTML = `<div class="alert alert-danger">Error loading statistics: ${error.message}</div>`;
    }
  }
  
  // Update user statistics on page
  function updateUserStats(stats) {
    const statsContainer = document.getElementById('user-stats');
    if (!statsContainer) return;
    
    // Calculate recycling rate
    const recyclingRate = stats.total_waste > 0 ? 
      (stats.recyclable_waste / stats.total_waste * 100).toFixed(1) : 0;
    
    // Update stats
    statsContainer.innerHTML = `
      <div class="row g-4">
        <div class="col-md-4">
          <div class="card bg-primary text-white h-100">
            <div class="card-body text-center">
              <i class="fas fa-recycle fa-3x mb-3"></i>
              <h5 class="card-title">Total Waste Managed</h5>
              <p class="card-text display-5">${stats.total_waste.toFixed(2)} kg</p>
              <p class="text-light">Recycling Rate: ${recyclingRate}%</p>
            </div>
          </div>
        </div>
        
        <div class="col-md-4">
          <div class="card bg-success text-white h-100">
            <div class="card-body text-center">
              <i class="fas fa-leaf fa-3x mb-3"></i>
              <h5 class="card-title">Carbon Footprint Reduced</h5>
              <p class="card-text display-5">${stats.carbon_saved.toFixed(2)} kg</p>
              <p class="text-light">Equivalent to planting ${(stats.carbon_saved / 21).toFixed(1)} trees</p>
            </div>
          </div>
        </div>
        
        <div class="col-md-4">
          <div class="card bg-info text-white h-100">
            <div class="card-body text-center">
              <i class="fas fa-trophy fa-3x mb-3"></i>
              <h5 class="card-title">Achievement Score</h5>
              <p class="card-text display-5">${stats.total_points}</p>
              <p class="text-light">Badges: ${stats.badge_count} | Records: ${stats.record_count}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
});
