// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function() {
    // Initialize charts
    initializeWasteDistributionChart();
    initializeCarbonSavingsChart();
    initializeLeaderboardChart();
    
    // Add event listeners for tabs
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            // When switching tabs, resize charts to fit new container
            window.dispatchEvent(new Event('resize'));
        });
    });
});

// Initialize waste distribution chart
function initializeWasteDistributionChart() {
    // Get chart data from the data attribute
    const chartContainer = document.getElementById('waste-distribution-chart');
    
    if (!chartContainer) return;
    
    // Parse waste data from HTML
    const wasteTypeElements = document.querySelectorAll('.waste-type-item');
    
    // Extract data
    const labels = [];
    const data = [];
    const colors = [
        '#4CAF50', // Green
        '#2196F3', // Blue
        '#FFC107', // Yellow
        '#9C27B0', // Purple
        '#FF5722', // Deep Orange
        '#795548', // Brown
        '#607D8B', // Blue Grey
        '#F44336'  // Red
    ];
    
    wasteTypeElements.forEach((element, index) => {
        const type = element.dataset.type;
        const count = parseInt(element.dataset.count);
        
        labels.push(type);
        data.push(count);
    });
    
    // If no data, show a message
    if (data.length === 0) {
        chartContainer.innerHTML = `
            <div class="alert alert-info">
                No waste data available yet. Start classifying waste to see your distribution.
            </div>
        `;
        return;
    }
    
    // Create chart
    const ctx = chartContainer.getContext('2d');
    const wasteChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 1,
                borderColor: '#212529'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#f8f9fa',
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Waste Type Distribution',
                    color: '#f8f9fa',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} items (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Initialize carbon savings chart
function initializeCarbonSavingsChart() {
    const chartContainer = document.getElementById('carbon-savings-chart');
    
    if (!chartContainer) return;
    
    // Parse carbon data from HTML
    const carbonDataElements = document.querySelectorAll('.carbon-data-item');
    
    // Extract data
    const dates = [];
    const carbonValues = [];
    
    carbonDataElements.forEach(element => {
        const date = element.dataset.date;
        const carbon = parseFloat(element.dataset.carbon);
        
        dates.push(date);
        carbonValues.push(carbon);
    });
    
    // If no data, show a message
    if (carbonValues.length === 0) {
        chartContainer.innerHTML = `
            <div class="alert alert-info">
                No carbon savings data available yet. Start recycling to track your impact.
            </div>
        `;
        return;
    }
    
    // Reverse arrays to show chronological order
    dates.reverse();
    carbonValues.reverse();
    
    // Create chart
    const ctx = chartContainer.getContext('2d');
    const carbonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Carbon Saved (kg CO2)',
                data: carbonValues,
                fill: true,
                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                borderColor: '#28a745',
                tension: 0.4,
                pointBackgroundColor: '#28a745',
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#f8f9fa'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#f8f9fa'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#f8f9fa'
                    }
                },
                title: {
                    display: true,
                    text: 'Daily Carbon Savings (Last 7 Days)',
                    color: '#f8f9fa',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Initialize leaderboard chart
function initializeLeaderboardChart() {
    const chartContainer = document.getElementById('leaderboard-chart');
    
    if (!chartContainer) return;
    
    // Parse leaderboard data from HTML
    const leaderboardItems = document.querySelectorAll('.leaderboard-item');
    
    // Extract data
    const usernames = [];
    const points = [];
    
    leaderboardItems.forEach(item => {
        const username = item.dataset.username;
        const pointsValue = parseInt(item.dataset.points);
        
        usernames.push(username);
        points.push(pointsValue);
    });
    
    // If no data, show a message
    if (points.length === 0) {
        chartContainer.innerHTML = `
            <div class="alert alert-info">
                No leaderboard data available yet.
            </div>
        `;
        return;
    }
    
    // Limit to top 10 users
    if (usernames.length > 10) {
        usernames.length = 10;
        points.length = 10;
    }
    
    // Create chart
    const ctx = chartContainer.getContext('2d');
    const leaderboardChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: usernames,
            datasets: [{
                label: 'Points',
                data: points,
                backgroundColor: '#17a2b8',
                borderColor: '#138496',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#f8f9fa'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#f8f9fa'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Top Recyclers Leaderboard',
                    color: '#f8f9fa',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Function to update analytics data via AJAX
function refreshAnalyticsData() {
    // Show loading spinner
    document.getElementById('refresh-btn').innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refreshing...';
    
    // Make AJAX request to get updated data
    fetch('/analytics')
        .then(response => response.text())
        .then(html => {
            // Create a temporary DOM element to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Update each section with new data
            const sections = [
                'waste-distribution-container',
                'carbon-savings-container',
                'leaderboard-container',
                'analytics-summary'
            ];
            
            sections.forEach(sectionId => {
                const newContent = tempDiv.querySelector(`#${sectionId}`);
                const currentSection = document.getElementById(sectionId);
                
                if (newContent && currentSection) {
                    currentSection.innerHTML = newContent.innerHTML;
                }
            });
            
            // Reinitialize charts
            initializeWasteDistributionChart();
            initializeCarbonSavingsChart();
            initializeLeaderboardChart();
            
            // Reset refresh button
            document.getElementById('refresh-btn').innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
            
            // Show success message
            const alertsContainer = document.getElementById('analytics-alerts');
            alertsContainer.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    Data refreshed successfully!
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error refreshing analytics:', error);
            
            // Reset refresh button
            document.getElementById('refresh-btn').innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
            
            // Show error message
            const alertsContainer = document.getElementById('analytics-alerts');
            alertsContainer.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    Failed to refresh data. Please try again.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
        });
}

// Add event listener for refresh button
document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshAnalyticsData);
    }
});
