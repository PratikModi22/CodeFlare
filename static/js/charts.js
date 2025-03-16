// Charts for the Analytics Dashboard

// Initialize charts when document is ready
document.addEventListener('DOMContentLoaded', function() {
    fetchUserStats();
    initWasteDistributionChart();
    initCarbonSavingsChart();
});

// Fetch user statistics from the API
function fetchUserStats() {
    fetch('/api/user/stats')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            updateWasteTimeChart(data);
            updateCarbonTimeChart(data);
        })
        .catch(error => {
            console.error('Error fetching user stats:', error);
            document.getElementById('waste-time-chart').innerHTML = 
                '<div class="alert alert-warning">Could not load waste statistics. Please try again later.</div>';
            document.getElementById('carbon-time-chart').innerHTML = 
                '<div class="alert alert-warning">Could not load carbon statistics. Please try again later.</div>';
        });
}

// Initialize waste distribution pie chart
function initWasteDistributionChart() {
    const ctx = document.getElementById('waste-distribution-chart');
    
    // Check if the element exists on the page
    if (!ctx) return;
    
    // Get data from the dataset attribute
    const wasteData = JSON.parse(ctx.dataset.distribution || '{}');
    
    // Prepare data for the chart
    const labels = Object.keys(wasteData);
    const values = Object.values(wasteData);
    
    // Default data if none is available
    if (labels.length === 0) {
        labels.push('No data available');
        values.push(100);
    }
    
    // Colors for different waste types
    const colors = {
        'recyclable': '#4CAF50',
        'organic': '#8BC34A',
        'hazardous': '#F44336',
        'non-recyclable': '#9E9E9E'
    };
    
    const backgroundColors = labels.map(label => colors[label] || '#9E9E9E');
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: backgroundColors,
                borderWidth: 0
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
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update waste over time line chart
function updateWasteTimeChart(data) {
    const ctx = document.getElementById('waste-time-chart');
    
    // Check if the element exists on the page
    if (!ctx) return;
    
    // If no data is available
    if (!data.labels || data.labels.length === 0) {
        ctx.innerHTML = '<div class="alert alert-info">No waste data available yet. Start recycling to see your progress!</div>';
        return;
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Waste Recycled (kg)',
                data: data.weights,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#fff'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#aaa'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#aaa'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// Update carbon savings over time line chart
function updateCarbonTimeChart(data) {
    const ctx = document.getElementById('carbon-time-chart');
    
    // Check if the element exists on the page
    if (!ctx) return;
    
    // If no data is available
    if (!data.labels || data.labels.length === 0) {
        ctx.innerHTML = '<div class="alert alert-info">No carbon data available yet. Start recycling to see your impact!</div>';
        return;
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Carbon Saved (kg CO₂e)',
                data: data.carbon_saved,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#fff'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#aaa'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#aaa'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// Initialize carbon savings comparison chart
function initCarbonSavingsChart() {
    const ctx = document.getElementById('carbon-savings-chart');
    
    // Check if the element exists on the page
    if (!ctx) return;
    
    // Get carbon savings from the dataset attribute
    const carbonSaved = parseFloat(ctx.dataset.carbon || '0');
    
    // Carbon equivalents
    const drivingKm = carbonSaved / 0.2;
    const treeDays = carbonSaved / 0.022;
    const phoneCharges = carbonSaved / 0.005;
    const lightBulbHours = carbonSaved / 0.01;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Driving (km)', 'Tree Days', 'Phone Charges', 'LED Bulb (hours)'],
            datasets: [{
                label: 'Carbon Equivalent',
                data: [drivingKm, treeDays, phoneCharges, lightBulbHours],
                backgroundColor: [
                    '#FF5722', // Orange for driving
                    '#4CAF50', // Green for trees
                    '#2196F3', // Blue for phone
                    '#FFC107'  // Yellow for light bulb
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const label = context.label || '';
                            let unit = '';
                            
                            if (label.includes('Driving')) {
                                unit = 'km not driven';
                            } else if (label.includes('Tree')) {
                                unit = 'days of tree CO₂ absorption';
                            } else if (label.includes('Phone')) {
                                unit = 'smartphone charges';
                            } else if (label.includes('LED')) {
                                unit = 'hours of LED light';
                            }
                            
                            return `${label}: ${Math.round(value)} ${unit}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#aaa'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#aaa'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}
