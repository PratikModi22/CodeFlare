// Carbon Footprint Tracker functionality

document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const carbonTrackerContainer = document.getElementById('carbon-tracker');
  const carbonChartContainer = document.getElementById('carbon-chart');
  const impactVisualizationContainer = document.getElementById('impact-visualization');
  
  // Initialize carbon tracker
  if (carbonTrackerContainer) {
    initCarbonTracker();
  }
  
  // Initialize carbon impact chart
  if (carbonChartContainer) {
    initCarbonChart();
  }
  
  // Initialize impact visualization
  if (impactVisualizationContainer) {
    initImpactVisualization();
  }
  
  // Initialize carbon tracker
  function initCarbonTracker() {
    // Get carbon data if present
    const carbonData = carbonTrackerContainer.getAttribute('data-carbon');
    
    if (!carbonData) {
      // Fetch carbon data if not provided in data attribute
      fetchCarbonData();
    } else {
      // Display carbon data from data attribute
      displayCarbonTracker(JSON.parse(carbonData));
    }
  }
  
  // Fetch carbon data from API
  async function fetchCarbonData() {
    try {
      const response = await fetch('/api/carbon-data');
      
      // If this endpoint doesn't exist yet, show placeholder
      if (response.status === 404) {
        displayCarbonTrackerPlaceholder();
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch carbon data');
      }
      
      displayCarbonTracker(data.carbon_data);
      
    } catch (error) {
      console.error('Error fetching carbon data:', error);
      displayCarbonTrackerPlaceholder();
    }
  }
  
  // Display carbon tracker
  function displayCarbonTracker(data) {
    if (!data) {
      displayCarbonTrackerPlaceholder();
      return;
    }
    
    // Calculate total carbon saved
    const carbonSaved = data.total_savings || 0;
    
    // Equivalent metrics
    const treesEquivalent = Math.round(carbonSaved / 21); // One tree absorbs ~21kg CO2 per year
    const carKmEquivalent = Math.round(carbonSaved / 0.2); // ~0.2kg CO2 per km driven
    const lightBulbHours = Math.round(carbonSaved * 10); // ~0.1kg CO2 per hour of lightbulb
    
    carbonTrackerContainer.innerHTML = `
      <div class="row g-4">
        <div class="col-md-6">
          <div class="card bg-success text-white h-100">
            <div class="card-body text-center py-4">
              <i class="fas fa-leaf fa-4x mb-3"></i>
              <h4 class="card-title">Carbon Footprint Reduced</h4>
              <p class="carbon-tracker-value">${carbonSaved.toFixed(1)} kg CO2</p>
              <p class="carbon-tracker-label">Through your sustainable waste management</p>
            </div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0">Environmental Impact</h5>
            </div>
            <div class="card-body">
              <div class="impact-item d-flex align-items-center mb-3">
                <div class="impact-icon me-3 bg-success text-white rounded-circle p-2">
                  <i class="fas fa-tree"></i>
                </div>
                <div class="impact-text">
                  <p class="mb-0">Equivalent to <strong>${treesEquivalent}</strong> trees absorbing CO2 for a year</p>
                </div>
              </div>
              
              <div class="impact-item d-flex align-items-center mb-3">
                <div class="impact-icon me-3 bg-info text-white rounded-circle p-2">
                  <i class="fas fa-car"></i>
                </div>
                <div class="impact-text">
                  <p class="mb-0">Saves emissions from <strong>${carKmEquivalent}</strong> km of driving</p>
                </div>
              </div>
              
              <div class="impact-item d-flex align-items-center">
                <div class="impact-icon me-3 bg-warning text-white rounded-circle p-2">
                  <i class="fas fa-lightbulb"></i>
                </div>
                <div class="impact-text">
                  <p class="mb-0">Equal to turning off a lightbulb for <strong>${lightBulbHours}</strong> hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Display placeholder for carbon tracker
  function displayCarbonTrackerPlaceholder() {
    carbonTrackerContainer.innerHTML = `
      <div class="card bg-success text-white">
        <div class="card-body text-center py-4">
          <i class="fas fa-leaf fa-4x mb-3"></i>
          <h4 class="card-title">Start Tracking Your Carbon Impact</h4>
          <p class="carbon-tracker-label">Classify waste to see how much carbon you're saving!</p>
          <a href="/classify" class="btn btn-light mt-3">
            <i class="fas fa-camera me-2"></i>Classify Waste
          </a>
        </div>
      </div>
    `;
  }
  
  // Initialize carbon chart
  function initCarbonChart() {
    // Get carbon history data if present
    const carbonHistoryData = carbonChartContainer.getAttribute('data-history');
    
    if (!carbonHistoryData) {
      // Show placeholder if no data
      carbonChartContainer.innerHTML = '<div class="alert alert-info">No carbon history data available yet.</div>';
      return;
    }
    
    try {
      const historyData = JSON.parse(carbonHistoryData);
      
      if (!historyData || historyData.length === 0) {
        carbonChartContainer.innerHTML = '<div class="alert alert-info">No carbon history data available yet.</div>';
        return;
      }
      
      // Process data for chart
      const dates = [];
      const emissions = [];
      const savings = [];
      const netImpact = [];
      
      historyData.forEach(item => {
        dates.push(item.date);
        emissions.push(item.emissions);
        savings.push(item.savings);
        netImpact.push(item.net_impact);
      });
      
      // Create chart
      const ctx = document.createElement('canvas');
      carbonChartContainer.appendChild(ctx);
      
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: dates,
          datasets: [
            {
              label: 'Emissions (kg CO2)',
              data: emissions,
              backgroundColor: 'rgba(231, 76, 60, 0.7)',
              borderColor: 'rgba(231, 76, 60, 1)',
              borderWidth: 1
            },
            {
              label: 'Savings (kg CO2)',
              data: savings.map(val => -val), // Negative to show below axis
              backgroundColor: 'rgba(46, 204, 113, 0.7)',
              borderColor: 'rgba(46, 204, 113, 1)',
              borderWidth: 1
            },
            {
              label: 'Net Impact (kg CO2)',
              data: netImpact,
              type: 'line',
              fill: false,
              backgroundColor: 'rgba(52, 152, 219, 0.2)',
              borderColor: 'rgba(52, 152, 219, 1)',
              borderWidth: 2,
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
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
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  let value = context.raw;
                  if (context.datasetIndex === 1) {
                    // Convert negative savings back to positive for display
                    value = Math.abs(value);
                    return `${label}: ${value.toFixed(2)} kg CO2`;
                  }
                  return `${label}: ${value.toFixed(2)} kg CO2`;
                }
              }
            }
          }
        }
      });
      
    } catch (error) {
      console.error('Error initializing carbon chart:', error);
      carbonChartContainer.innerHTML = '<div class="alert alert-danger">Error loading carbon history chart.</div>';
    }
  }
  
  // Initialize impact visualization
  function initImpactVisualization() {
    // Get carbon saved value
    const carbonSaved = parseFloat(impactVisualizationContainer.getAttribute('data-carbon')) || 0;
    
    if (carbonSaved <= 0) {
      impactVisualizationContainer.innerHTML = '<div class="alert alert-info">Start classifying waste to see your environmental impact!</div>';
      return;
    }
    
    // Calculate equivalents
    const treesEquivalent = Math.round(carbonSaved / 21);
    const treesToShow = Math.min(treesEquivalent, 20); // Cap at 20 trees for display
    
    // Create tree visualization
    let treesHTML = '';
    for (let i = 0; i < treesToShow; i++) {
      treesHTML += '<i class="fas fa-tree fa-2x m-1 text-success"></i>';
    }
    
    // If more trees than we can show
    let extraTreesText = '';
    if (treesEquivalent > treesToShow) {
      extraTreesText = `<p class="mt-2">+ ${treesEquivalent - treesToShow} more trees</p>`;
    }
    
    impactVisualizationContainer.innerHTML = `
      <div class="card">
        <div class="card-header bg-success text-white">
          <h5 class="mb-0">Your Impact Visualized</h5>
        </div>
        <div class="card-body text-center">
          <h6 class="mb-3">Your carbon savings (${carbonSaved.toFixed(1)} kg CO2) is equivalent to:</h6>
          
          <div class="trees-visualization mb-3">
            ${treesHTML}
            ${extraTreesText}
          </div>
          
          <p class="mb-4">${treesEquivalent} trees absorbing CO2 for a year</p>
          
          <div class="impact-progress mb-4">
            <h6>Progress toward 1 ton of CO2 saved:</h6>
            <div class="progress" style="height: 25px;">
              <div class="progress-bar bg-success" role="progressbar" 
                   style="width: ${Math.min(carbonSaved / 1000 * 100, 100)}%;" 
                   aria-valuenow="${carbonSaved}" aria-valuemin="0" aria-valuemax="1000">
                ${(carbonSaved / 1000 * 100).toFixed(1)}%
              </div>
            </div>
            <small class="text-muted">${carbonSaved.toFixed(1)} kg of 1,000 kg</small>
          </div>
          
          <div class="row mt-4">
            <div class="col-md-4">
              <div class="card mb-3">
                <div class="card-body text-center">
                  <i class="fas fa-car fa-2x mb-2 text-primary"></i>
                  <h6>Car Travel</h6>
                  <p class="mb-0">${Math.round(carbonSaved / 0.2)} km not driven</p>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card mb-3">
                <div class="card-body text-center">
                  <i class="fas fa-lightbulb fa-2x mb-2 text-warning"></i>
                  <h6>Energy</h6>
                  <p class="mb-0">${Math.round(carbonSaved * 10)} hours of light</p>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card mb-3">
                <div class="card-body text-center">
                  <i class="fas fa-plane fa-2x mb-2 text-danger"></i>
                  <h6>Air Travel</h6>
                  <p class="mb-0">${Math.round(carbonSaved / 0.25)} km not flown</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
});
