// Maps and location functionality

let map;
let userMarker;
let centerMarkers = [];
let infoWindow;

// Initialize the map
function initMap() {
    // Check if the map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    // Get Google Maps API key
    const apiKey = mapContainer.dataset.apiKey || '';
    
    // Initialize map with default center
    map = L.map('map').setView([37.7749, -122.4194], 10);
    
    // Add the OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add custom map controls
    addMapControls();
    
    // Initialize info window
    infoWindow = L.popup();
    
    // Try to get user's location
    getUserLocation();
    
    // Load recycling centers if available
    loadRecyclingCenters();
}

// Add custom controls to the map
function addMapControls() {
    // Create a custom control for finding user location
    const locationControl = L.control({position: 'topleft'});
    
    locationControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        div.innerHTML = `
            <a href="#" title="Find my location" role="button" aria-label="Find my location" onclick="getUserLocation(); return false;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" 
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </a>
        `;
        return div;
    };
    
    locationControl.addTo(map);
    
    // Create a control for search radius
    const radiusControl = L.control({position: 'topright'});
    
    radiusControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'leaflet-control radius-control');
        div.innerHTML = `
            <div class="card bg-dark">
                <div class="card-body p-2">
                    <label for="search-radius" class="form-label">Search Radius: <span id="radius-display">5</span> km</label>
                    <input type="range" class="form-range" id="search-radius" min="1" max="20" step="1" value="5">
                    <button class="btn btn-sm btn-primary w-100" onclick="searchCenters()">Update</button>
                </div>
            </div>
        `;
        return div;
    };
    
    radiusControl.addTo(map);
    
    // Add event listener for the radius slider
    setTimeout(() => {
        const radiusSlider = document.getElementById('search-radius');
        const radiusDisplay = document.getElementById('radius-display');
        
        if (radiusSlider && radiusDisplay) {
            radiusSlider.addEventListener('input', function() {
                radiusDisplay.textContent = this.value;
            });
        }
    }, 100);
}

// Get the user's current location
function getUserLocation() {
    if (navigator.geolocation) {
        // Show loading indicator
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.classList.add('loading');
        }
        
        navigator.geolocation.getCurrentPosition(
            // Success callback
            function(position) {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                
                // Center map on user location
                map.setView([latitude, longitude], 13);
                
                // Add or update user marker
                if (userMarker) {
                    userMarker.setLatLng([latitude, longitude]);
                } else {
                    userMarker = L.marker([latitude, longitude], {
                        icon: L.divIcon({
                            html: `<div class="user-marker"><i class="fas fa-user"></i></div>`,
                            className: '',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        })
                    }).addTo(map);
                    
                    userMarker.bindPopup('<strong>Your Location</strong>');
                }
                
                // Remove loading indicator
                if (mapContainer) {
                    mapContainer.classList.remove('loading');
                }
                
                // Search for recycling centers near the user
                searchCenters(latitude, longitude);
            },
            // Error callback
            function(error) {
                console.error('Error getting location:', error);
                
                // Remove loading indicator
                const mapContainer = document.getElementById('map');
                if (mapContainer) {
                    mapContainer.classList.remove('loading');
                }
                
                // Show error message
                const errorMessage = getLocationErrorMessage(error);
                showAlert(errorMessage, 'warning');
                
                // Load centers with default location
                searchCenters();
            }
        );
    } else {
        showAlert('Geolocation is not supported by this browser.', 'warning');
        
        // Load centers with default location
        searchCenters();
    }
}

// Get error message for geolocation errors
function getLocationErrorMessage(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            return "Location access was denied. Please allow location access to find recycling centers near you.";
        case error.POSITION_UNAVAILABLE:
            return "Location information is unavailable. Using default location.";
        case error.TIMEOUT:
            return "The request to get your location timed out. Using default location.";
        case error.UNKNOWN_ERROR:
            return "An unknown error occurred while getting your location. Using default location.";
        default:
            return "Error getting your location. Using default location.";
    }
}

// Search for recycling centers
function searchCenters(lat, lng) {
    // Get the current map center if no coordinates provided
    if (!lat || !lng) {
        const center = map.getCenter();
        lat = center.lat;
        lng = center.lng;
    }
    
    // Get the search radius
    const radiusSlider = document.getElementById('search-radius');
    const radius = radiusSlider ? parseInt(radiusSlider.value, 10) : 5;
    
    // Show loading indicator
    showLoading(true);
    
    // Draw the search radius circle
    drawSearchRadius(lat, lng, radius);
    
    // Call the API to get recycling centers
    fetch(`/api/centers?lat=${lat}&lng=${lng}&radius=${radius}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(centers => {
            // Clear existing markers
            clearCenterMarkers();
            
            // Add markers for each center
            addCenterMarkers(centers);
            
            // Hide loading indicator
            showLoading(false);
            
            // Update the centers list if it exists
            updateCentersList(centers);
        })
        .catch(error => {
            console.error('Error fetching recycling centers:', error);
            showAlert('Error loading recycling centers. Please try again later.', 'danger');
            showLoading(false);
        });
}

// Draw a circle showing the search radius
function drawSearchRadius(lat, lng, radius) {
    // Clear any existing radius circle
    if (window.radiusCircle) {
        map.removeLayer(window.radiusCircle);
    }
    
    // Create a new radius circle
    window.radiusCircle = L.circle([lat, lng], {
        color: '#2196F3',
        fillColor: '#2196F3',
        fillOpacity: 0.1,
        radius: radius * 1000 // Convert km to meters
    }).addTo(map);
}

// Clear all recycling center markers
function clearCenterMarkers() {
    centerMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    centerMarkers = [];
}

// Add markers for recycling centers
function addCenterMarkers(centers) {
    if (!centers || centers.length === 0) {
        showAlert('No recycling centers found in this area. Try increasing the search radius.', 'info');
        return;
    }
    
    // Create a marker for each center
    centers.forEach(center => {
        const marker = L.marker([center.latitude, center.longitude], {
            icon: L.divIcon({
                html: `<div class="center-marker"><i class="fas fa-recycle"></i></div>`,
                className: '',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map);
        
        // Create popup content
        const popupContent = `
            <div class="map-info-window">
                <h5>${center.name}</h5>
                <p>${center.address || 'No address available'}</p>
                ${center.distance ? `<p><strong>Distance:</strong> ${center.distance} km</p>` : ''}
                ${center.phone ? `<p><strong>Phone:</strong> ${center.phone}</p>` : ''}
                ${center.website ? `<p><a href="${center.website}" target="_blank" rel="noopener">Visit Website</a></p>` : ''}
                ${center.accepted_types ? `<p><strong>Accepts:</strong> ${formatAcceptedTypes(center.accepted_types)}</p>` : ''}
                <a href="https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}" 
                   class="btn btn-sm btn-primary" target="_blank" rel="noopener">Get Directions</a>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        centerMarkers.push(marker);
    });
}

// Format accepted waste types for display
function formatAcceptedTypes(types) {
    if (!types) return 'Unknown';
    
    return types.split(',').map(type => {
        const formattedType = type.trim();
        return `<span class="badge badge-${formattedType}">${formattedType}</span>`;
    }).join(' ');
}

// Update the list of centers if it exists on the page
function updateCentersList(centers) {
    const centersList = document.getElementById('centers-list');
    if (!centersList) return;
    
    // Clear current list
    centersList.innerHTML = '';
    
    if (!centers || centers.length === 0) {
        centersList.innerHTML = '<div class="alert alert-info">No recycling centers found in this area.</div>';
        return;
    }
    
    // Add each center to the list
    centers.forEach(center => {
        const listItem = document.createElement('div');
        listItem.className = 'card mb-3 bg-dark';
        listItem.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${center.name}</h5>
                <p class="card-text">${center.address || 'No address available'}</p>
                ${center.distance ? `<p class="card-text"><small class="text-muted">${center.distance} km away</small></p>` : ''}
                ${center.accepted_types ? `<p class="card-text">Accepts: ${formatAcceptedTypes(center.accepted_types)}</p>` : ''}
                <button class="btn btn-sm btn-outline-primary" onclick="showCenterOnMap(${center.latitude}, ${center.longitude})">
                    Show on Map
                </button>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}" 
                   class="btn btn-sm btn-outline-success" target="_blank" rel="noopener">Get Directions</a>
            </div>
        `;
        centersList.appendChild(listItem);
    });
}

// Center map on a specific recycling center
function showCenterOnMap(lat, lng) {
    map.setView([lat, lng], 15);
    
    // Find the marker and open its popup
    centerMarkers.forEach(marker => {
        const markerLatLng = marker.getLatLng();
        if (markerLatLng.lat === lat && markerLatLng.lng === lng) {
            marker.openPopup();
        }
    });
}

// Show loading indicator
function showLoading(isLoading) {
    const loadingIndicator = document.getElementById('map-loading');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('map-alerts');
    if (!alertContainer) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            alertContainer.removeChild(alertDiv);
        }, 150);
    }, 5000);
}

// Load recycling centers from the provided data
function loadRecyclingCenters() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer || !mapContainer.dataset.centers) return;
    
    try {
        const centersData = JSON.parse(mapContainer.dataset.centers);
        
        if (centersData && centersData.features) {
            // Add GeoJSON data to map
            L.geoJSON(centersData, {
                pointToLayer: function(feature, latlng) {
                    return L.marker(latlng, {
                        icon: L.divIcon({
                            html: `<div class="center-marker"><i class="fas fa-recycle"></i></div>`,
                            className: '',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        })
                    });
                },
                onEachFeature: function(feature, layer) {
                    if (feature.properties) {
                        const props = feature.properties;
                        const popupContent = `
                            <div class="map-info-window">
                                <h5>${props.name}</h5>
                                <p>${props.address || 'No address available'}</p>
                                ${props.phone ? `<p><strong>Phone:</strong> ${props.phone}</p>` : ''}
                                ${props.website ? `<p><a href="${props.website}" target="_blank" rel="noopener">Visit Website</a></p>` : ''}
                                ${props.accepted_types ? `<p><strong>Accepts:</strong> ${formatAcceptedTypes(props.accepted_types)}</p>` : ''}
                                <a href="https://www.google.com/maps/dir/?api=1&destination=${feature.geometry.coordinates[1]},${feature.geometry.coordinates[0]}" 
                                   class="btn btn-sm btn-primary" target="_blank" rel="noopener">Get Directions</a>
                            </div>
                        `;
                        layer.bindPopup(popupContent);
                    }
                }
            }).addTo(map);
        }
    } catch (e) {
        console.error('Error parsing centers data:', e);
    }
}

// Initialize map when document is ready
document.addEventListener('DOMContentLoaded', function() {
    initMap();
});
