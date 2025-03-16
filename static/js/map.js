// Initialize variables
let map;
let userMarker;
let recyclingCenters = [];
let infoWindow;

// Initialize the map
function initMap() {
    // Create info window for markers
    infoWindow = new google.maps.InfoWindow();
    
    // Default map center (will be updated with user location)
    const defaultLocation = { lat: 40.7128, lng: -74.0060 }; // New York
    
    // Create the map
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: defaultLocation,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
        ]
    });
    
    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Center map on user location
                map.setCenter(userLocation);
                
                // Add marker for user location
                userMarker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "Your Location",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "#FFFFFF"
                    }
                });
                
                // Fetch recycling centers near the user
                fetchRecyclingCenters(userLocation.lat, userLocation.lng);
            },
            () => {
                // Handle location error
                handleLocationError(true, map.getCenter());
                
                // Fetch default recycling centers
                fetchRecyclingCenters(defaultLocation.lat, defaultLocation.lng);
            }
        );
    } else {
        // Browser doesn't support geolocation
        handleLocationError(false, map.getCenter());
        
        // Fetch default recycling centers
        fetchRecyclingCenters(defaultLocation.lat, defaultLocation.lng);
    }
    
    // Add search functionality
    const input = document.getElementById("search-location");
    const searchBox = new google.maps.places.SearchBox(input);
    
    // Bias searchBox results towards current map's viewport
    map.addListener("bounds_changed", () => {
        searchBox.setBounds(map.getBounds());
    });
    
    // Listen for the event fired when the user selects a prediction
    searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();
        
        if (places.length === 0) {
            return;
        }
        
        // For each place, get the location
        const bounds = new google.maps.LatLngBounds();
        
        places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) {
                console.log("Returned place contains no geometry");
                return;
            }
            
            // Update user marker
            if (userMarker) {
                userMarker.setMap(null);
            }
            
            userMarker = new google.maps.Marker({
                position: place.geometry.location,
                map: map,
                title: "Selected Location",
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#4285F4",
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: "#FFFFFF"
                }
            });
            
            // Fetch recycling centers near the selected location
            fetchRecyclingCenters(
                place.geometry.location.lat(), 
                place.geometry.location.lng()
            );
            
            if (place.geometry.viewport) {
                // Only geocodes have viewport
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        
        map.fitBounds(bounds);
    });
}

// Fetch recycling centers from the API
function fetchRecyclingCenters(lat, lng, radius = 10) {
    // Show loading indicator
    document.getElementById("loading-indicator").classList.remove("d-none");
    
    // Clear existing markers
    clearMarkers();
    
    // Fetch centers from our API
    fetch(`/api/recycling-centers?lat=${lat}&lng=${lng}&radius=${radius}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch recycling centers");
            }
            return response.json();
        })
        .then(centers => {
            // Hide loading indicator
            document.getElementById("loading-indicator").classList.add("d-none");
            
            // Clear the centers list
            const centersList = document.getElementById("recycling-centers-list");
            centersList.innerHTML = "";
            
            if (centers.length === 0) {
                centersList.innerHTML = `
                    <div class="alert alert-info">
                        No recycling centers found in this area. Try expanding your search radius.
                    </div>
                `;
                return;
            }
            
            // Add markers and list items for each center
            centers.forEach((center, index) => {
                // Create marker
                const marker = new google.maps.Marker({
                    position: { lat: center.latitude, lng: center.longitude },
                    map: map,
                    title: center.name,
                    animation: google.maps.Animation.DROP,
                    icon: {
                        url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
                    }
                });
                
                // Add click listener to marker
                marker.addListener("click", () => {
                    showInfoWindow(marker, center);
                });
                
                // Save marker reference
                recyclingCenters.push({
                    id: center.id,
                    marker: marker,
                    data: center
                });
                
                // Create list item
                const listItem = document.createElement("div");
                listItem.className = "card mb-3 recycling-center-card";
                listItem.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">${center.name}</h5>
                        <p class="card-text">
                            <i class="fas fa-map-marker-alt text-danger"></i> ${center.address}<br>
                            <i class="fas fa-recycle text-success"></i> ${center.waste_types}<br>
                            <i class="fas fa-clock text-primary"></i> ${center.operational_hours}
                        </p>
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary view-on-map-btn" data-index="${index}">
                                <i class="fas fa-map-marked-alt"></i> View on Map
                            </button>
                            <button class="btn btn-sm btn-success log-recycling-btn" data-center-id="${center.id}" data-center-name="${center.name}">
                                <i class="fas fa-plus-circle"></i> Log Recycling
                            </button>
                        </div>
                    </div>
                `;
                
                // Add list item to the centers list
                centersList.appendChild(listItem);
                
                // Add click event for "View on Map" button
                listItem.querySelector(".view-on-map-btn").addEventListener("click", () => {
                    // Center map on this location
                    map.setCenter({ lat: center.latitude, lng: center.longitude });
                    map.setZoom(16);
                    
                    // Show info window
                    showInfoWindow(marker, center);
                    
                    // Smooth scroll to map on mobile
                    if (window.innerWidth < 768) {
                        document.getElementById("map-container").scrollIntoView({ behavior: "smooth" });
                    }
                });
                
                // Add click event for "Log Recycling" button
                listItem.querySelector(".log-recycling-btn").addEventListener("click", () => {
                    openLogRecyclingModal(center);
                });
            });
        })
        .catch(error => {
            console.error("Error fetching recycling centers:", error);
            document.getElementById("loading-indicator").classList.add("d-none");
            
            // Show error message
            document.getElementById("recycling-centers-list").innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Failed to load recycling centers. Please try again later.
                </div>
            `;
        });
}

// Clear all center markers from the map
function clearMarkers() {
    recyclingCenters.forEach(center => {
        center.marker.setMap(null);
    });
    recyclingCenters = [];
}

// Show info window for a recycling center
function showInfoWindow(marker, center) {
    // Create info window content
    const content = `
        <div class="info-window">
            <h5>${center.name}</h5>
            <p>
                <strong>Address:</strong> ${center.address}<br>
                <strong>Accepts:</strong> ${center.waste_types}<br>
                <strong>Hours:</strong> ${center.operational_hours}
            </p>
            <div class="mt-2">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}" 
                   target="_blank" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-directions"></i> Directions
                </a>
                <button class="btn btn-sm btn-success ms-2" id="log-from-info-btn">
                    <i class="fas fa-plus-circle"></i> Log Recycling
                </button>
            </div>
        </div>
    `;
    
    // Set info window content and open it
    infoWindow.setContent(content);
    infoWindow.open(map, marker);
    
    // Add click event for "Log Recycling" button in info window
    // We need to do this after the info window is created
    setTimeout(() => {
        const logBtn = document.getElementById("log-from-info-btn");
        if (logBtn) {
            logBtn.addEventListener("click", () => {
                openLogRecyclingModal(center);
            });
        }
    }, 100);
}

// Open modal to log recycling activity
function openLogRecyclingModal(center) {
    // Set center name in modal
    document.getElementById("recycling-center-name").textContent = center.name;
    
    // Set center ID in hidden field
    document.getElementById("center-id").value = center.id;
    
    // Populate waste types based on center's accepted types
    const wasteTypeSelect = document.getElementById("waste-type");
    wasteTypeSelect.innerHTML = ""; // Clear existing options
    
    // Split waste types string and create options
    const acceptedTypes = center.waste_types.split(",").map(type => type.trim());
    acceptedTypes.forEach(type => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        wasteTypeSelect.appendChild(option);
    });
    
    // Reset weight input
    document.getElementById("waste-weight").value = "1";
    
    // Show the modal
    const recyclingModal = new bootstrap.Modal(document.getElementById("log-recycling-modal"));
    recyclingModal.show();
}

// Handle geolocation errors
function handleLocationError(browserHasGeolocation, pos) {
    const errorMessage = browserHasGeolocation
        ? "Error: The Geolocation service failed."
        : "Error: Your browser doesn't support geolocation.";
    
    // Create an info window with the error message
    infoWindow.setPosition(pos);
    infoWindow.setContent(errorMessage);
    infoWindow.open(map);
}

// Submit recycling log
function submitRecyclingLog() {
    // Get form data
    const centerId = document.getElementById("center-id").value;
    const wasteType = document.getElementById("waste-type").value;
    const weight = parseFloat(document.getElementById("waste-weight").value);
    
    // Validate data
    if (!centerId || !wasteType || isNaN(weight) || weight <= 0) {
        alert("Please fill all fields correctly.");
        return;
    }
    
    // Prepare data for API
    const data = {
        center_id: centerId,
        waste_type: wasteType,
        weight: weight
    };
    
    // Show loading state
    const submitBtn = document.getElementById("submit-recycling-log");
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
    submitBtn.disabled = true;
    
    // Send data to API
    fetch("/api/log-recycling", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Failed to log recycling activity");
        }
        return response.json();
    })
    .then(result => {
        // Hide modal
        bootstrap.Modal.getInstance(document.getElementById("log-recycling-modal")).hide();
        
        // Show success message
        const successMsg = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <strong>Success!</strong> You've earned ${result.points_earned} points and saved ${result.carbon_saved.toFixed(2)} kg of CO2.
                ${result.new_achievements.length > 0 ? 
                    `<br><strong>New achievement unlocked:</strong> ${result.new_achievements.join(", ")}` : 
                    ""}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        document.getElementById("alerts-container").innerHTML = successMsg;
        
        // Reset button
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    })
    .catch(error => {
        console.error("Error logging recycling:", error);
        
        // Show error message
        alert("Failed to log recycling activity. Please try again.");
        
        // Reset button
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    });
}

// Initialize event listeners once the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
    // Add submit event listener for recycling log form
    document.getElementById("recycling-log-form").addEventListener("submit", function(e) {
        e.preventDefault();
        submitRecyclingLog();
    });
    
    // Add event listener for search radius change
    document.getElementById("search-radius").addEventListener("change", function() {
        if (userMarker) {
            const position = userMarker.getPosition();
            const radius = parseInt(this.value);
            fetchRecyclingCenters(position.lat(), position.lng(), radius);
        }
    });
});
