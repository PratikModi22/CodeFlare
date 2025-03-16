// Waste Map functionality

document.addEventListener('DOMContentLoaded', function() {
  // Map elements
  const mapContainer = document.getElementById('map-container');
  const centersList = document.getElementById('centers-list');
  const loadingSpinner = document.getElementById('loading-spinner');
  
  // Map variables
  let map;
  let markers = [];
  let userMarker;
  let userLocation = null;
  
  // Waste category icons for the map
  const categoryIcons = {
    1: '<i class="fas fa-wine-bottle text-primary"></i>',  // Plastic
    2: '<i class="fas fa-newspaper text-warning"></i>',    // Paper
    3: '<i class="fas fa-glass-martini text-info"></i>',   // Glass
    4: '<i class="fas fa-bacon text-secondary"></i>',      // Metal
    5: '<i class="fas fa-apple-alt text-success"></i>',    // Organic
    6: '<i class="fas fa-laptop text-purple"></i>',        // Electronic
    7: '<i class="fas fa-skull-crossbones text-danger"></i>', // Hazardous
    8: '<i class="fas fa-trash text-dark"></i>'            // Non-recyclable
  };
  
  // Initialize map
  function initMap() {
    if (!mapContainer) return;
    
    // Default location (will be updated with user's location)
    const defaultLocation = [40.7128, -74.0060]; // New York
    
    // Create map
    map = L.map(mapContainer).setView(defaultLocation, 13);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Get user location
    getUserLocation();
  }
  
  // Get user's location
  function getUserLocation() {
    if (navigator.geolocation) {
      loadingSpinner.style.display = 'block';
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          // Update map view
          map.setView([userLocation.latitude, userLocation.longitude], 13);
          
          // Add user marker
          addUserMarker();
          
          // Fetch nearby recycling centers
          fetchNearbyCenters();
        },
        (error) => {
          console.error('Error getting location:', error);
          loadingSpinner.style.display = 'none';
          showToast('Could not access your location. Showing default map.', 'warning');
          
          // Fetch centers with default location
          fetchNearbyCenters(40.7128, -74.0060);
        }
      );
    } else {
      console.error('Geolocation not supported');
      loadingSpinner.style.display = 'none';
      showToast('Your browser does not support geolocation.', 'warning');
      
      // Fetch centers with default location
      fetchNearbyCenters(40.7128, -74.0060);
    }
  }
  
  // Add user marker to map
  function addUserMarker() {
    if (!map || !userLocation) return;
    
    // Remove existing user marker
    if (userMarker) {
      map.removeLayer(userMarker);
    }
    
    // Create user marker with custom icon
    const userIcon = L.divIcon({
      html: '<div class="user-marker"><i class="fas fa-user-circle fa-2x text-primary"></i></div>',
      className: 'user-marker-icon',
      iconSize: [30, 30]
    });
    
    userMarker = L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon })
      .addTo(map)
      .bindPopup('<strong>Your Location</strong>')
      .openPopup();
  }
  
  // Fetch nearby recycling centers
  async function fetchNearbyCenters(lat, lng) {
    loadingSpinner.style.display = 'block';
    
    try {
      // Use provided coordinates or user location
      const latitude = lat || userLocation.latitude;
      const longitude = lng || userLocation.longitude;
      
      const response = await fetch(`/api/nearby-centers?lat=${latitude}&lng=${longitude}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recycling centers');
      }
      
      // Display centers on map and in list
      displayCenters(data.centers);
      
    } catch (error) {
      console.error('Error fetching recycling centers:', error);
      showToast(error.message || 'Error finding recycling centers.', 'error');
    } finally {
      loadingSpinner.style.display = 'none';
    }
  }
  
  // Display recycling centers on map and in list
  function displayCenters(centers) {
    if (!map) return;
    
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Clear centers list
    if (centersList) {
      centersList.innerHTML = '';
    }
    
    if (!centers || centers.length === 0) {
      if (centersList) {
        centersList.innerHTML = '<div class="alert alert-info">No recycling centers found nearby.</div>';
      }
      return;
    }
    
    // Add markers for each center
    centers.forEach((center, index) => {
      // Create marker
      const marker = L.marker([center.lat, center.lng])
        .addTo(map)
        .bindPopup(createPopupContent(center));
      
      markers.push(marker);
      
      // Add to list
      if (centersList) {
        centersList.appendChild(createCenterListItem(center, index, () => {
          map.setView([center.lat, center.lng], 15);
          marker.openPopup();
        }));
      }
    });
    
    // Create bounds to fit all markers
    const bounds = L.latLngBounds([
      [userLocation.latitude, userLocation.longitude],
      ...centers.map(center => [center.lat, center.lng])
    ]);
    
    map.fitBounds(bounds, { padding: [50, 50] });
  }
  
  // Create popup content for marker
  function createPopupContent(center) {
    // Parse accepted waste types
    let acceptedWasteHtml = '';
    if (center.accepted_waste) {
      const wasteTypes = center.accepted_waste.split(',');
      acceptedWasteHtml = '<div class="accepted-waste mt-2"><strong>Accepts:</strong> ';
      acceptedWasteHtml += wasteTypes.map(type => {
        const typeId = parseInt(type.trim());
        return `<span class="waste-type-icon">${categoryIcons[typeId] || ''}</span>`;
      }).join(' ');
      acceptedWasteHtml += '</div>';
    }
    
    // Format opening hours if available
    let hoursHtml = '';
    if (center.hours && center.hours.length) {
      hoursHtml = '<div class="mt-2"><strong>Hours:</strong><br>';
      hoursHtml += center.hours.map(hour => `<small>${hour}</small>`).join('<br>');
      hoursHtml += '</div>';
    }
    
    return `
      <div class="center-popup">
        <h5>${center.name}</h5>
        <p>${center.address}</p>
        ${acceptedWasteHtml}
        ${center.phone ? `<div class="mt-1"><i class="fas fa-phone-alt"></i> ${center.phone}</div>` : ''}
        ${center.website ? `<div class="mt-1"><a href="${center.website}" target="_blank"><i class="fas fa-globe"></i> Website</a></div>` : ''}
        ${hoursHtml}
        <div class="mt-2">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}" 
             class="btn btn-sm btn-primary" target="_blank">
            <i class="fas fa-directions"></i> Directions
          </a>
        </div>
      </div>
    `;
  }
  
  // Create list item for a recycling center
  function createCenterListItem(center, index, onClick) {
    const item = document.createElement('div');
    item.className = 'card mb-3 center-card';
    
    // Parse accepted waste
    let acceptedWasteIcons = '';
    if (center.accepted_waste) {
      const wasteTypes = center.accepted_waste.split(',');
      acceptedWasteIcons = wasteTypes.map(type => {
        const typeId = parseInt(type.trim());
        return `<span class="waste-type-icon">${categoryIcons[typeId] || ''}</span>`;
      }).join(' ');
    }
    
    // Calculate distance text
    const distanceText = center.distance ? 
      `${center.distance.toFixed(1)} km away` : 
      '';
    
    item.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${center.name}</h5>
        <p class="card-text">${center.address}</p>
        <div class="accepted-waste mb-2">
          <small class="text-muted">Accepts: ${acceptedWasteIcons}</small>
        </div>
        ${distanceText ? `<small class="text-muted">${distanceText}</small>` : ''}
        <button class="btn btn-sm btn-outline-primary mt-2 view-on-map-btn">
          <i class="fas fa-map-marker-alt"></i> View on Map
        </button>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}" 
           class="btn btn-sm btn-outline-success mt-2" target="_blank">
          <i class="fas fa-directions"></i> Directions
        </a>
      </div>
    `;
    
    // Add click event
    const viewButton = item.querySelector('.view-on-map-btn');
    if (viewButton && onClick) {
      viewButton.addEventListener('click', onClick);
    }
    
    return item;
  }
  
  // Show toast notification
  function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    
    if (!toastContainer) {
      // Create toast container if it doesn't exist
      const container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast show bg-${type} text-white`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
      <div class="toast-header bg-${type} text-white">
        <strong class="me-auto">Waste Management App</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    `;
    
    document.querySelector('.toast-container').appendChild(toast);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }
  
  // Add recycle center form submission
  const addCenterForm = document.getElementById('add-center-form');
  if (addCenterForm) {
    addCenterForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      try {
        const formData = {
          name: document.getElementById('center-name').value,
          address: document.getElementById('center-address').value,
          latitude: parseFloat(document.getElementById('center-latitude').value),
          longitude: parseFloat(document.getElementById('center-longitude').value),
          phone: document.getElementById('center-phone').value,
          website: document.getElementById('center-website').value,
          description: document.getElementById('center-description').value
        };
        
        // Get accepted waste types
        const acceptedWaste = [];
        document.querySelectorAll('input[name="accepted-waste"]:checked').forEach(checkbox => {
          acceptedWaste.push(checkbox.value);
        });
        formData.accepted_waste = acceptedWaste;
        
        // Submit to API
        const response = await fetch('/api/add-recycling-center', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to add recycling center');
        }
        
        // Success message
        showToast('Recycling center added successfully!', 'success');
        
        // Refresh centers
        fetchNearbyCenters();
        
        // Reset form
        addCenterForm.reset();
        
        // Hide modal if using Bootstrap modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('add-center-modal'));
        if (modal) {
          modal.hide();
        }
        
      } catch (error) {
        console.error('Error adding recycling center:', error);
        showToast(error.message || 'Error adding recycling center.', 'error');
      }
    });
  }
  
  // Initialize the map
  initMap();
  
  // Search functionality
  const searchForm = document.getElementById('search-location-form');
  if (searchForm) {
    searchForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const address = document.getElementById('search-address').value;
      if (!address) return;
      
      try {
        loadingSpinner.style.display = 'block';
        
        // Geocode the address using OpenStreetMap Nominatim
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          const location = data[0];
          const lat = parseFloat(location.lat);
          const lng = parseFloat(location.lon);
          
          // Update map view
          map.setView([lat, lng], 13);
          
          // Add marker for searched location
          const searchMarker = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(`<strong>${address}</strong>`)
            .openPopup();
          
          markers.push(searchMarker);
          
          // Fetch centers near this location
          fetchNearbyCenters(lat, lng);
        } else {
          showToast('Location not found. Please try a different address.', 'warning');
          loadingSpinner.style.display = 'none';
        }
      } catch (error) {
        console.error('Error searching location:', error);
        showToast('Error searching location. Please try again.', 'error');
        loadingSpinner.style.display = 'none';
      }
    });
  }
});
