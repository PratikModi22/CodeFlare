// Initialize variables
let monthlyChart = null;
let impactCards = [];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the carbon impact chart
    initializeCarbonImpactChart();
    
    // Initialize the equivalence cards
    initializeImpactCards();
    
    // Add event listener for date range selector
    const dateRange = document.getElementById('date-range');
    if (dateRange) {
        dateRange.addEventListener('change', function() {
            updateCarbonData(this.value);
        });
    }
    
    // Initialize the carbon goal setter
    initializeCarbonGoalSetter();
    
    // Add event listener for tab changes to redraw charts
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            // When switching tabs, resize charts to fit new container
            window.dispatchEvent(new Event('resize'));
        });
    });
});

// Initialize the carbon impact chart
function initializeCarbonImpactChart() {
    const chartContainer = document.getElementById('carbon-impact-chart');
    
    if (!chartContainer) return;
    
    // Get carbon data from HTML
    const carbonDataItems = document.querySelectorAll('.monthly-carbon-data');
    
    // Extract data
    const months = [];
    const carbonValues = [];
    
    carbonDataItems.forEach(item => {
        months.push(item.dataset.month);
        carbonValues.push(parseFloat(item.dataset.value));
    });
    
    // Reverse arrays to show chronological order
    months.reverse();
    carbonValues.reverse();
    
    // Create chart
    const ctx = chartContainer.getContext('2d');
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Carbon Saved (kg CO2)',
                data: carbonValues,
                backgroundColor: 'rgba(40, 167, 69, 0.6)',
                borderColor: '#28a745',
                borderWidth: 1
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
                    text: 'Monthly Carbon Savings',
                    color: '#f8f9fa',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Carbon Saved: ${context.raw.toFixed(2)} kg CO2`;
                        }
                    }
                }
            }
        }
    });
}

// Initialize the carbon equivalence cards
function initializeImpactCards() {
    // Get the carbon impact data
    const totalCarbonSaved = parseFloat(document.getElementById('total-carbon-saved').dataset.value || 0);
    const treesSaved = parseFloat(document.getElementById('trees-saved').dataset.value || 0);
    const carKmSaved = parseFloat(document.getElementById('car-km-saved').dataset.value || 0);
    
    // Set up the impact cards
    impactCards = [
        {
            id: 'trees-saved',
            value: treesSaved.toFixed(2),
            icon: 'fa-tree',
            title: 'Trees',
            description: 'Equivalent to the annual CO2 absorption of this many trees',
            color: '#28a745'
        },
        {
            id: 'car-km-saved',
            value: carKmSaved.toFixed(2),
            icon: 'fa-car',
            title: 'Car Kilometers',
            description: 'Equivalent to not driving a car for this many kilometers',
            color: '#17a2b8'
        },
        {
            id: 'smartphone-charges',
            value: Math.round(totalCarbonSaved * 100),
            icon: 'fa-mobile-alt',
            title: 'Smartphone Charges',
            description: 'Equivalent to the carbon footprint of this many full phone charges',
            color: '#6f42c1'
        }
    ];
    
    // Update the DOM with the cards
    updateImpactCards();
    
    // Add hover effects to cards
    document.querySelectorAll('.impact-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.classList.add('shadow-lg');
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.classList.remove('shadow-lg');
            this.style.transform = 'translateY(0)';
        });
    });
}

// Update the impact cards in the DOM
function updateImpactCards() {
    impactCards.forEach(card => {
        const cardElement = document.getElementById(card.id);
        if (cardElement) {
            const valueElement = cardElement.querySelector('.impact-value');
            if (valueElement) {
                // Animate the value change
                animateCountUp(valueElement, 0, parseFloat(card.value));
            }
        }
    });
}

// Animate counting up for impact values
function animateCountUp(element, start, end) {
    let current = start;
    const duration = 1500; // ms
    const frameDuration = 1000 / 60; // 60fps
    const totalFrames = Math.round(duration / frameDuration);
    const increment = (end - start) / totalFrames;
    
    // Use requestAnimationFrame for smooth animation
    function animate(currentFrame) {
        current += increment;
        if (current > end) current = end;
        
        // Format the number with commas
        element.textContent = formatNumber(current);
        
        if (currentFrame < totalFrames && current < end) {
            requestAnimationFrame(() => animate(currentFrame + 1));
        }
    }
    
    animate(0);
}

// Format a number with commas for thousands
function formatNumber(num) {
    if (num < 10) {
        return num.toFixed(2);
    } else {
        return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
}

// Update carbon data based on date range
function updateCarbonData(range) {
    if (!monthlyChart) return;
    
    // Show loading state
    document.getElementById('carbon-impact-chart-container').innerHTML = `
        <div class="text-center my-5">
            <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading carbon data...</p>
        </div>
    `;
    
    // In a real app, this would be an API call to get data for the selected range
    // For demo purposes, we'll simulate with random data
    setTimeout(() => {
        // Recreate the canvas
        document.getElementById('carbon-impact-chart-container').innerHTML = '<canvas id="carbon-impact-chart"></canvas>';
        
        // Generate data based on selected range
        let months = [];
        let values = [];
        
        switch (range) {
            case '3m':
                months = ['January', 'February', 'March'];
                break;
            case '6m':
                months = ['October', 'November', 'December', 'January', 'February', 'March'];
                break;
            case '1y':
                months = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                break;
        }
        
        // Generate random values that show an increasing trend
        let baseValue = 5;
        values = months.map((_, index) => {
            baseValue += Math.random() * 2;
            return baseValue;
        });
        
        // Reinitialize chart with new data
        const ctx = document.getElementById('carbon-impact-chart').getContext('2d');
        monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Carbon Saved (kg CO2)',
                    data: values,
                    backgroundColor: 'rgba(40, 167, 69, 0.6)',
                    borderColor: '#28a745',
                    borderWidth: 1
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
                        text: `Carbon Savings (${range === '3m' ? '3 Months' : range === '6m' ? '6 Months' : '1 Year'})`,
                        color: '#f8f9fa',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });
        
        // Update total values based on new data
        const totalCarbonSaved = values.reduce((a, b) => a + b, 0);
        impactCards[0].value = (totalCarbonSaved / 21).toFixed(2); // Trees
        impactCards[1].value = (totalCarbonSaved / 0.12).toFixed(2); // Car km
        impactCards[2].value = Math.round(totalCarbonSaved * 100); // Smartphone charges
        
        // Update impact cards
        updateImpactCards();
        
    }, 1000); // Simulate network delay
}

// Initialize the carbon goal setter
function initializeCarbonGoalSetter() {
    const goalForm = document.getElementById('carbon-goal-form');
    if (!goalForm) return;
    
    goalForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const goalAmount = parseFloat(document.getElementById('goal-amount').value);
        const goalTimeframe = document.getElementById('goal-timeframe').value;
        
        if (isNaN(goalAmount) || goalAmount <= 0) {
            alert('Please enter a valid goal amount.');
            return;
        }
        
        // In a real app, this would save the goal to the user's profile via API
        // For demo purposes, we'll just update the UI
        
        // Calculate the end date based on timeframe
        const now = new Date();
        let endDate;
        
        switch (goalTimeframe) {
            case 'week':
                endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
                break;
            case 'year':
                endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
                break;
        }
        
        // Format the date
        const formattedEndDate = endDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Get current carbon saved
        const currentCarbonSaved = parseFloat(document.getElementById('total-carbon-saved').dataset.value || 0);
        
        // Calculate percentage of goal achieved
        const percentComplete = Math.min(100, Math.round((currentCarbonSaved / goalAmount) * 100));
        
        // Update the UI
        document.getElementById('carbon-goal-display').innerHTML = `
            <div class="card border-success">
                <div class="card-header bg-success text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-bullseye"></i> Your Carbon Saving Goal
                    </h5>
                </div>
                <div class="card-body">
                    <h4 class="text-center mb-3">${goalAmount} kg CO2 by ${formattedEndDate}</h4>
                    
                    <div class="progress mb-3" style="height: 25px;">
                        <div class="progress-bar bg-success progress-bar-striped progress-bar-animated" 
                             role="progressbar" style="width: ${percentComplete}%;" 
                             aria-valuenow="${percentComplete}" aria-valuemin="0" aria-valuemax="100">
                            ${percentComplete}%
                        </div>
                    </div>
                    
                    <div class="d-flex justify-content-between">
                        <span>Current: ${currentCarbonSaved.toFixed(2)} kg CO2</span>
                        <span>Goal: ${goalAmount} kg CO2</span>
                    </div>
                    
                    <div class="alert alert-info mt-3">
                        <i class="fas fa-info-circle"></i> 
                        ${
                            percentComplete < 25 ? 
                            "You're just getting started! Keep up the good work recycling and reducing waste." :
                            percentComplete < 50 ?
                            "You're making progress! Continue your sustainable habits to reach your goal." :
                            percentComplete < 75 ?
                            "You're more than halfway there! Your efforts are making a real difference." :
                            percentComplete < 100 ?
                            "Almost there! Just a little more recycling to reach your goal." :
                            "Congratulations! You've reached your carbon saving goal!"
                        }
                    </div>
                    
                    <div class="text-end mt-3">
                        <button class="btn btn-sm btn-outline-danger" onclick="resetCarbonGoal()">
                            <i class="fas fa-trash-alt"></i> Reset Goal
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Hide the goal form
        goalForm.classList.add('d-none');
        document.getElementById('carbon-goal-display').classList.remove('d-none');
        
        // Show success message
        const alertsContainer = document.getElementById('carbon-alerts');
        alertsContainer.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="fas fa-check-circle"></i> Carbon saving goal set successfully!
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    });
}

// Reset carbon goal
function resetCarbonGoal() {
    // In a real app, this would delete the goal from the user's profile via API
    // For demo purposes, we'll just update the UI
    
    // Hide the goal display
    document.getElementById('carbon-goal-display').classList.add('d-none');
    
    // Show the goal form
    document.getElementById('carbon-goal-form').classList.remove('d-none');
    
    // Reset form values
    document.getElementById('goal-amount').value = '';
    document.getElementById('goal-timeframe').value = 'month';
    
    // Show message
    const alertsContainer = document.getElementById('carbon-alerts');
    alertsContainer.innerHTML = `
        <div class="alert alert-info alert-dismissible fade show" role="alert">
            <i class="fas fa-info-circle"></i> Goal has been reset. You can set a new carbon saving goal.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

// Calculate the user's carbon footprint
function calculateCarbonFootprint() {
    const modal = new bootstrap.Modal(document.getElementById('carbon-footprint-modal'));
    modal.show();
}

// Process the carbon footprint calculation
function processCarbonFootprintCalculation() {
    // Get form values
    const transportation = parseFloat(document.getElementById('transportation').value) || 0;
    const diet = document.getElementById('diet').value;
    const homeEnergy = parseFloat(document.getElementById('home-energy').value) || 0;
    const shopping = parseFloat(document.getElementById('shopping').value) || 0;
    
    // Calculate footprint
    let carbonFootprint = 0;
    
    // Transportation (daily commute in km * 0.12 kg CO2 per km)
    carbonFootprint += transportation * 0.12 * 365;
    
    // Diet (yearly impact)
    switch (diet) {
        case 'meat-heavy':
            carbonFootprint += 2000;
            break;
        case 'average':
            carbonFootprint += 1500;
            break;
        case 'vegetarian':
            carbonFootprint += 1000;
            break;
        case 'vegan':
            carbonFootprint += 800;
            break;
    }
    
    // Home energy (monthly kWh * 0.5 kg CO2 per kWh * 12 months)
    carbonFootprint += homeEnergy * 0.5 * 12;
    
    // Shopping (monthly spending * 0.1 kg CO2 per dollar * 12 months)
    carbonFootprint += shopping * 0.1 * 12;
    
    // Display results
    document.getElementById('footprint-result').innerHTML = `
        <div class="alert alert-info">
            <h5 class="alert-heading">Your Estimated Carbon Footprint</h5>
            <p>Based on your inputs, your estimated annual carbon footprint is:</p>
            <h3 class="text-center">${Math.round(carbonFootprint)} kg CO2</h3>
            <hr>
            <p class="mb-0">
                This is ${carbonFootprint < 5000 ? 'lower' : carbonFootprint < 10000 ? 'about average' : 'higher'} 
                than the average person. 
                ${carbonFootprint > 5000 ? 'Here are some tips to reduce your carbon footprint:' : 'Keep up the good work!'}
            </p>
            ${carbonFootprint > 5000 ? 
                `<ul class="mt-2">
                    ${transportation > 20 ? '<li>Consider carpooling, public transport, or cycling for your commute</li>' : ''}
                    ${diet === 'meat-heavy' ? '<li>Try reducing meat consumption with meat-free days</li>' : ''}
                    ${homeEnergy > 500 ? '<li>Reduce energy usage by using energy-efficient appliances</li>' : ''}
                    ${shopping > 300 ? '<li>Consider buying second-hand or repairing items instead of buying new</li>' : ''}
                </ul>` : 
                ''
            }
        </div>
        <div class="d-grid gap-2">
            <button type="button" class="btn btn-success" data-bs-dismiss="modal">
                <i class="fas fa-check"></i> Got It
            </button>
        </div>
    `;
    
    // Show the result
    document.getElementById('footprint-form').classList.add('d-none');
    document.getElementById('footprint-result').classList.remove('d-none');
}

// Reset the carbon footprint calculator
function resetCarbonFootprintCalculator() {
    document.getElementById('footprint-form').classList.remove('d-none');
    document.getElementById('footprint-result').classList.add('d-none');
    
    // Reset form values
    document.getElementById('transportation').value = '';
    document.getElementById('diet').value = 'average';
    document.getElementById('home-energy').value = '';
    document.getElementById('shopping').value = '';
}
