// Carbon Footprint Tracker functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize carbon footprint chart
    initCarbonFootprintChart();
    
    // Initialize interactive footprint calculator
    setupFootprintCalculator();
});

// Initialize the carbon footprint chart
function initCarbonFootprintChart() {
    const carbonChartElement = document.getElementById('carbon-footprint-chart');
    
    if (!carbonChartElement) return;
    
    // Get the chart data from the data attribute
    const carbonData = JSON.parse(carbonChartElement.dataset.carbon || '{}');
    
    const dates = Object.keys(carbonData).sort();
    const values = dates.map(date => carbonData[date]);
    
    // Calculate cumulative values
    const cumulativeValues = [];
    let sum = 0;
    values.forEach(value => {
        sum += value;
        cumulativeValues.push(sum);
    });
    
    new Chart(carbonChartElement, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Daily Carbon Saved (kg CO2e)',
                    data: values,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Cumulative Carbon Saved (kg CO2e)',
                    data: cumulativeValues,
                    type: 'line',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(153, 102, 255, 1)',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Carbon Saved (kg CO2e)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
    
    // Update the impact metrics
    updateImpactMetrics(sum);
}

// Update impact metrics based on total carbon saved
function updateImpactMetrics(totalCarbonSaved) {
    // Trees equivalent: 21.77 kg CO2 per tree per year
    const treesEquivalent = (totalCarbonSaved / 21.77).toFixed(1);
    document.getElementById('trees-equivalent').textContent = treesEquivalent;
    
    // Car miles equivalent: 0.404 kg CO2 per mile
    const carMilesEquivalent = (totalCarbonSaved / 0.404).toFixed(1);
    document.getElementById('car-miles-equivalent').textContent = carMilesEquivalent;
    
    // Home energy equivalent: 0.417 kg CO2 per kWh
    const homeEnergyEquivalent = (totalCarbonSaved / 0.417).toFixed(1);
    document.getElementById('energy-equivalent').textContent = homeEnergyEquivalent;
}

// Setup the interactive footprint calculator
function setupFootprintCalculator() {
    const calculatorForm = document.getElementById('footprint-calculator-form');
    if (!calculatorForm) return;
    
    calculatorForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get the waste type and weight
        const wasteType = document.getElementById('waste-type').value;
        const wasteWeight = parseFloat(document.getElementById('waste-weight').value);
        
        if (isNaN(wasteWeight) || wasteWeight <= 0) {
            alert('Please enter a valid weight.');
            return;
        }
        
        // Calculate carbon savings based on waste type and weight
        const carbonSavings = calculateCarbonSavings(wasteType, wasteWeight);
        
        // Update the result
        document.getElementById('carbon-result').textContent = carbonSavings.toFixed(2);
        document.getElementById('carbon-result-container').classList.remove('d-none');
        
        // Update equivalencies
        document.getElementById('calc-trees-equivalent').textContent = 
            (carbonSavings / 21.77).toFixed(2);
        document.getElementById('calc-car-miles-equivalent').textContent = 
            (carbonSavings / 0.404).toFixed(2);
        document.getElementById('calc-energy-equivalent').textContent = 
            (carbonSavings / 0.417).toFixed(2);
            
        // Show the equivalencies
        document.getElementById('calculator-equivalencies').classList.remove('d-none');
    });
}

// Calculate carbon savings based on waste type and weight
function calculateCarbonSavings(wasteType, weight) {
    // Carbon emission factors (kg CO2e per kg of waste)
    const carbonFactors = {
        'recyclable': 1.2,
        'organic': 0.4,
        'hazardous': 5.0,
        'landfill': 0.0,
        'electronic': 18.0
    };
    
    // Get the appropriate factor, default to 0 if waste type not found
    const factor = carbonFactors[wasteType] || 0;
    
    // Calculate savings
    return factor * weight;
}

// Add a custom waste entry to the tracker
function addCustomWasteEntry() {
    const wasteType = document.getElementById('custom-waste-type').value;
    const wasteWeight = parseFloat(document.getElementById('custom-waste-weight').value);
    
    if (!wasteType || isNaN(wasteWeight) || wasteWeight <= 0) {
        alert('Please enter a valid waste type and weight.');
        return;
    }
    
    // This would typically make an AJAX request to the server
    // to save the entry, but for demonstration we'll show a success message
    
    const toast = document.createElement('div');
    toast.className = 'toast position-fixed bottom-0 end-0 m-3';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="toast-header bg-success text-white">
            <strong class="me-auto">Entry Added</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            Your ${wasteWeight}kg of ${wasteType} waste has been added to your tracker.
        </div>
    `;
    
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Clear the form
    document.getElementById('custom-waste-type').value = '';
    document.getElementById('custom-waste-weight').value = '';
    
    // Remove toast from DOM after it's hidden
    toast.addEventListener('hidden.bs.toast', function () {
        document.body.removeChild(toast);
    });
}

// Set carbon reduction goal
function setCarbonGoal() {
    const goalAmount = document.getElementById('carbon-goal-amount').value;
    if (!goalAmount || isNaN(goalAmount) || goalAmount <= 0) {
        alert('Please enter a valid goal amount.');
        return;
    }
    
    // Update the goal display
    document.getElementById('current-goal').textContent = goalAmount;
    
    // Calculate progress based on current carbon savings
    const currentSavings = parseFloat(document.getElementById('total-carbon-saved').dataset.carbon || 0);
    const progressPercentage = Math.min(100, (currentSavings / goalAmount) * 100).toFixed(0);
    
    // Update progress bar
    const progressBar = document.getElementById('goal-progress');
    progressBar.style.width = `${progressPercentage}%`;
    progressBar.setAttribute('aria-valuenow', progressPercentage);
    progressBar.textContent = `${progressPercentage}%`;
    
    // Show the goal section if hidden
    document.getElementById('carbon-goal-section').classList.remove('d-none');
    
    // Close the modal
    const goalModal = document.getElementById('carbon-goal-modal');
    const modal = bootstrap.Modal.getInstance(goalModal);
    if (modal) {
        modal.hide();
    }
    
    // Show success message
    alert('Your carbon reduction goal has been set!');
}
