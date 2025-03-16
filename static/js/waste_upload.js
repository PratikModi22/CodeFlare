// Waste image upload and classification functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeWasteUpload();
    setupLocationCapture();
});

// Initialize waste upload functionality
function initializeWasteUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('waste-image');
    const preview = document.getElementById('image-preview');
    const classifyForm = document.getElementById('classify-form');
    
    if (!uploadArea || !fileInput || !classifyForm) return;
    
    // Handle drag and drop events
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('active');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('active');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('active');
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            displayImagePreview(e.dataTransfer.files[0]);
        }
    });
    
    // Handle click to upload
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Handle file selection
    fileInput.addEventListener('change', function() {
        if (fileInput.files.length) {
            displayImagePreview(fileInput.files[0]);
        }
    });
    
    // Handle form submission
    classifyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        classifyWasteImage();
    });
}

// Display image preview
function displayImagePreview(file) {
    const preview = document.getElementById('image-preview');
    const container = document.getElementById('preview-container');
    
    if (!preview || !container) return;
    
    // Show the preview container
    container.style.display = 'block';
    
    // Create a file reader to read the image
    const reader = new FileReader();
    
    reader.onload = function(e) {
        preview.src = e.target.result;
        preview.style.display = 'block';
    };
    
    reader.readAsDataURL(file);
    
    // Enable the classify button
    const classifyButton = document.getElementById('classify-button');
    if (classifyButton) {
        classifyButton.disabled = false;
    }
}

// Classify waste image
function classifyWasteImage() {
    const classifyForm = document.getElementById('classify-form');
    const resultContainer = document.getElementById('classification-result');
    const loadingSpinner = document.getElementById('classification-loading');
    
    if (!classifyForm || !resultContainer) return;
    
    // Show loading spinner
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }
    
    // Clear previous results
    resultContainer.innerHTML = '';
    resultContainer.style.display = 'none';
    
    // Create form data for submission
    const formData = new FormData(classifyForm);
    
    // Add location data if available
    const locationData = getLocationData();
    if (locationData.latitude && locationData.longitude) {
        formData.append('latitude', locationData.latitude);
        formData.append('longitude', locationData.longitude);
        formData.append('location_name', locationData.name || '');
    }
    
    // Submit the form
    fetch('/api/classify', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        
        displayClassificationResult(data);
    })
    .catch(error => {
        console.error('Error:', error);
        
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        
        // Show error message
        resultContainer.innerHTML = `
            <div class="alert alert-danger">
                <h4>Error classifying waste</h4>
                <p>${error.message || 'An unknown error occurred. Please try again later.'}</p>
            </div>
        `;
        resultContainer.style.display = 'block';
    });
}

// Display classification result
function displayClassificationResult(data) {
    const resultContainer = document.getElementById('classification-result');
    
    if (!resultContainer) return;
    
    if (data.error) {
        resultContainer.innerHTML = `
            <div class="alert alert-danger">
                <h4>Error</h4>
                <p>${data.error}</p>
            </div>
        `;
    } else {
        // Get waste type and icon
        const wasteType = data.waste_type;
        const iconClass = getWasteTypeIcon(wasteType);
        const wasteTypeClass = wasteType.toLowerCase();
        
        // Format confidence as percentage
        const confidence = Math.round(data.confidence * 100);
        
        // Get disposal instructions
        const instructions = getDisposalInstructions(wasteType);
        
        // Display result
        resultContainer.innerHTML = `
            <div class="card bg-dark border-${wasteTypeClass} mb-4">
                <div class="card-body text-center">
                    <h3 class="mb-4">Waste Classification Result</h3>
                    <div class="waste-icon mb-3">
                        <i class="${iconClass} ${wasteTypeClass} fa-3x"></i>
                    </div>
                    <h4 class="card-title ${wasteTypeClass}">${formatWasteType(wasteType)}</h4>
                    <div class="progress mb-3">
                        <div class="progress-bar bg-${wasteTypeClass}" role="progressbar" 
                             style="width: ${confidence}%" aria-valuenow="${confidence}" 
                             aria-valuemin="0" aria-valuemax="100">
                            ${confidence}% Confidence
                        </div>
                    </div>
                    <div class="alert alert-secondary">
                        <h5>Disposal Instructions</h5>
                        <p>${instructions}</p>
                    </div>
                    <div class="impact-info mt-4">
                        <h5>Environmental Impact</h5>
                        <p>You saved approximately <strong>${data.carbon_saved} kg</strong> of CO₂e emissions!</p>
                        <p>You earned <strong>${data.points_earned} points</strong> for proper waste classification.</p>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="d-flex justify-content-between">
                        <button class="btn btn-outline-primary" onclick="resetClassification()">
                            <i class="fas fa-redo"></i> Classify Another
                        </button>
                        <a href="/map" class="btn btn-outline-success">
                            <i class="fas fa-map-marker-alt"></i> Find Recycling Centers
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        // Update user points if available on the page
        updateUserPoints(data.points_earned);
    }
    
    resultContainer.style.display = 'block';
    
    // Scroll to the result
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// Get icon class for waste type
function getWasteTypeIcon(wasteType) {
    switch(wasteType.toLowerCase()) {
        case 'recyclable':
            return 'fas fa-recycle';
        case 'organic':
            return 'fas fa-seedling';
        case 'hazardous':
            return 'fas fa-skull-crossbones';
        case 'non-recyclable':
            return 'fas fa-trash';
        default:
            return 'fas fa-question-circle';
    }
}

// Format waste type for display
function formatWasteType(wasteType) {
    // Capitalize first letter of each word
    return wasteType.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') + ' Waste';
}

// Get disposal instructions for waste type
function getDisposalInstructions(wasteType) {
    switch(wasteType.toLowerCase()) {
        case 'recyclable':
            return 'Clean and place in the recycling bin. Remove any non-recyclable parts or contaminants first.';
        case 'organic':
            return 'Place in compost bin or organic waste collection. Avoid including any non-biodegradable materials.';
        case 'hazardous':
            return 'Do not place in regular trash! Take to a hazardous waste collection center or special disposal event.';
        case 'non-recyclable':
            return 'Place in general waste bin. Consider if any parts can be repurposed before disposal.';
        default:
            return 'Unable to determine disposal instructions. Please check local waste management guidelines.';
    }
}

// Reset classification form
function resetClassification() {
    const classifyForm = document.getElementById('classify-form');
    const preview = document.getElementById('image-preview');
    const previewContainer = document.getElementById('preview-container');
    const resultContainer = document.getElementById('classification-result');
    
    if (classifyForm) {
        classifyForm.reset();
    }
    
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
    
    if (resultContainer) {
        resultContainer.style.display = 'none';
        resultContainer.innerHTML = '';
    }
    
    // Disable the classify button
    const classifyButton = document.getElementById('classify-button');
    if (classifyButton) {
        classifyButton.disabled = true;
    }
}

// Update user points on the page
function updateUserPoints(pointsEarned) {
    const pointsElement = document.getElementById('user-points');
    if (!pointsElement) return;
    
    const currentPoints = parseInt(pointsElement.textContent, 10) || 0;
    const newPoints = currentPoints + pointsEarned;
    
    // Animate the points increase
    const duration = 1000;
    const start = Date.now();
    
    const timer = setInterval(function() {
        const timePassed = Date.now() - start;
        if (timePassed >= duration) {
            clearInterval(timer);
            pointsElement.textContent = newPoints;
            return;
        }
        
        const progress = timePassed / duration;
        const currentValue = Math.floor(currentPoints + progress * pointsEarned);
        pointsElement.textContent = currentValue;
    }, 20);
}

// Setup location capture
function setupLocationCapture() {
    const locationBtn = document.getElementById('get-location-btn');
    const locationDisplay = document.getElementById('location-display');
    
    if (!locationBtn || !locationDisplay) return;
    
    locationBtn.addEventListener('click', function() {
        if (navigator.geolocation) {
            locationBtn.disabled = true;
            locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
            
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    
                    // Store the location data
                    window.userLocation = {
                        latitude: latitude,
                        longitude: longitude
                    };
                    
                    // Attempt to get location name
                    getLocationName(latitude, longitude, function(locationName) {
                        window.userLocation.name = locationName;
                        
                        // Update the display
                        locationDisplay.innerHTML = `
                            <div class="alert alert-success">
                                <i class="fas fa-map-marker-alt"></i> Location captured: 
                                <strong>${locationName || 'Unknown location'}</strong>
                                <br>
                                <small>Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</small>
                            </div>
                        `;
                        
                        locationBtn.disabled = false;
                        locationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Update Location';
                    });
                },
                function(error) {
                    console.error('Error getting location:', error);
                    
                    locationDisplay.innerHTML = `
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i> 
                            Could not get your location: ${getGeolocationErrorMessage(error)}
                        </div>
                    `;
                    
                    locationBtn.disabled = false;
                    locationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Try Again';
                }
            );
        } else {
            locationDisplay.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Geolocation is not supported by this browser.
                </div>
            `;
        }
    });
}

// Get location name from coordinates
function getLocationName(latitude, longitude, callback) {
    try {
        // Try to use Nominatim API for reverse geocoding
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                let locationName = 'Unknown location';
                
                if (data && data.display_name) {
                    // Try to extract a meaningful location name
                    const address = data.address;
                    if (address) {
                        if (address.road) {
                            locationName = address.road;
                            if (address.city || address.town || address.village) {
                                locationName += ', ' + (address.city || address.town || address.village);
                            }
                        } else if (address.city || address.town || address.village) {
                            locationName = address.city || address.town || address.village;
                        } else {
                            locationName = data.display_name.split(',').slice(0, 2).join(',');
                        }
                    } else {
                        locationName = data.display_name.split(',').slice(0, 2).join(',');
                    }
                }
                
                callback(locationName);
            })
            .catch(error => {
                console.error('Error getting location name:', error);
                callback('Unknown location');
            });
    } catch (error) {
        console.error('Error in getLocationName:', error);
        callback('Unknown location');
    }
}

// Get location data
function getLocationData() {
    return window.userLocation || {};
}

// Get error message for geolocation errors
function getGeolocationErrorMessage(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            return "You denied the request for geolocation.";
        case error.POSITION_UNAVAILABLE:
            return "Location information is unavailable.";
        case error.TIMEOUT:
            return "The request to get your location timed out.";
        case error.UNKNOWN_ERROR:
            return "An unknown error occurred.";
        default:
            return "Error getting your location.";
    }
}
