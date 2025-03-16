// Analytics Dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize waste distribution chart
    const wasteDistributionCtx = document.getElementById('waste-distribution-chart');
    if (wasteDistributionCtx) {
        const wasteDistributionData = JSON.parse(wasteDistributionCtx.dataset.distribution || '{}');
        
        const labels = Object.keys(wasteDistributionData);
        const data = Object.values(wasteDistributionData);
        
        // Define colors for waste types
        const colors = {
            'recyclable': 'rgba(54, 162, 235, 0.8)',
            'organic': 'rgba(75, 192, 192, 0.8)',
            'hazardous': 'rgba(255, 99, 132, 0.8)',
            'landfill': 'rgba(169, 169, 169, 0.8)',
            'electronic': 'rgba(153, 102, 255, 0.8)'
        };
        
        // Map waste types to colors, default to gray if not found
        const backgroundColors = labels.map(label => colors[label.toLowerCase()] || 'rgba(169, 169, 169, 0.8)');
        
        new Chart(wasteDistributionCtx, {
            type: 'doughnut',
            data: {
                labels: labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
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
    
    // Initialize carbon timeline chart
    const carbonTimelineCtx = document.getElementById('carbon-timeline-chart');
    if (carbonTimelineCtx) {
        const carbonTimelineData = JSON.parse(carbonTimelineCtx.dataset.timeline || '{}');
        
        const dates = Object.keys(carbonTimelineData).sort();
        const carbonValues = dates.map(date => carbonTimelineData[date]);
        
        // Calculate cumulative values
        const cumulativeValues = [];
        let sum = 0;
        carbonValues.forEach(value => {
            sum += value;
            cumulativeValues.push(sum);
        });
        
        new Chart(carbonTimelineCtx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Daily Carbon Saved (kg CO2e)',
                        data: carbonValues,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                        tension: 0.1
                    },
                    {
                        label: 'Cumulative Carbon Saved (kg CO2e)',
                        data: cumulativeValues,
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(153, 102, 255, 1)',
                        tension: 0.1
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
    }
    
    // Calculate impact equivalencies
    const totalCarbonSaved = parseFloat(document.getElementById('total-carbon-saved')?.dataset?.carbon || 0);
    
    if (totalCarbonSaved > 0) {
        // Calculate equivalencies
        const treesPlanted = (totalCarbonSaved / 21.77).toFixed(1);
        const carMiles = (totalCarbonSaved / 0.404).toFixed(1);
        const homeEnergy = (totalCarbonSaved / 0.417).toFixed(1);
        
        // Update the UI
        document.getElementById('trees-equivalent').textContent = treesPlanted;
        document.getElementById('car-miles-equivalent').textContent = carMiles;
        document.getElementById('energy-equivalent').textContent = homeEnergy;
    }
    
    // Progress towards next achievement
    const pointsElement = document.getElementById('user-points');
    if (pointsElement) {
        const points = parseInt(pointsElement.dataset.points || 0);
        const nextAchievementPoints = Math.ceil(points / 100) * 100;
        const progress = (points % 100) || 100;
        
        // Update progress bar
        const progressBar = document.getElementById('achievement-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
            
            document.getElementById('next-achievement-points').textContent = nextAchievementPoints;
        }
    }
});

// Export analytics data as CSV
function exportAnalyticsData() {
    const wasteDistributionData = JSON.parse(document.getElementById('waste-distribution-chart').dataset.distribution || '{}');
    const carbonTimelineData = JSON.parse(document.getElementById('carbon-timeline-chart').dataset.timeline || '{}');
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add waste distribution data
    csvContent += "Waste Distribution\n";
    csvContent += "Waste Type,Count\n";
    
    for (const [type, count] of Object.entries(wasteDistributionData)) {
        csvContent += `${type},${count}\n`;
    }
    
    csvContent += "\nCarbon Timeline\n";
    csvContent += "Date,Carbon Saved (kg CO2e)\n";
    
    // Add carbon timeline data
    const sortedDates = Object.keys(carbonTimelineData).sort();
    for (const date of sortedDates) {
        csvContent += `${date},${carbonTimelineData[date]}\n`;
    }
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "eco_waste_analytics.csv");
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
}

// Share analytics on social media
function shareAnalytics() {
    const totalCarbonSaved = parseFloat(document.getElementById('total-carbon-saved')?.dataset?.carbon || 0);
    const totalClassifications = document.getElementById('total-classifications')?.textContent || 0;
    
    const shareText = `I've classified ${totalClassifications} waste items and saved ${totalCarbonSaved.toFixed(2)} kg of CO2e using EcoWaste! Join me in making a positive impact on our planet. #SustainableLiving #EcoWaste`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My Sustainability Impact',
            text: shareText,
            url: window.location.href,
        })
        .catch(error => console.log('Error sharing:', error));
    } else {
        // Fallback for browsers that don't support Web Share API
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Share text copied to clipboard!');
        });
    }
}
