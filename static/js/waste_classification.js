// Waste Classification functionality

document.addEventListener('DOMContentLoaded', function() {
  // Elements for image capture
  const videoElement = document.getElementById('video-preview');
  const captureButton = document.getElementById('capture-btn');
  const capturedImage = document.getElementById('captured-image');
  const retakeButton = document.getElementById('retake-btn');
  const classifyButton = document.getElementById('classify-btn');
  const manualCategorySelect = document.getElementById('manual-category');
  const resultContainer = document.getElementById('classification-result');
  const loadingSpinner = document.getElementById('loading-spinner');
  
  // User's location
  let userLocation = null;
  
  // Get user location
  function getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          console.log('User location:', userLocation);
        },
        (error) => {
          console.error('Error getting location:', error);
          showToast('Warning: Could not access your location. Some features may be limited.', 'warning');
        }
      );
    } else {
      console.error('Geolocation not supported');
      showToast('Your browser does not support geolocation. Some features may be limited.', 'warning');
    }
  }
  
  // Initialize camera for image capture
  async function initCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Your browser does not support camera access.', 'error');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      videoElement.srcObject = stream;
      videoElement.style.display = 'block';
      capturedImage.style.display = 'none';
      
      // Enable capture button
      captureButton.disabled = false;
    } catch (error) {
      console.error('Error accessing camera:', error);
      showToast('Could not access camera. Please check permissions.', 'error');
      
      // Show manual category selection if camera access fails
      document.getElementById('manual-classification').style.display = 'block';
    }
  }
  
  // Capture image from camera
  function captureImage() {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Display captured image
    capturedImage.src = canvas.toDataURL('image/jpeg');
    capturedImage.style.display = 'block';
    videoElement.style.display = 'none';
    
    // Hide capture button, show retake and classify buttons
    captureButton.style.display = 'none';
    retakeButton.style.display = 'inline-block';
    classifyButton.style.display = 'inline-block';
  }
  
  // Retake image
  function retakeImage() {
    // Show video preview again
    videoElement.style.display = 'block';
    capturedImage.style.display = 'none';
    
    // Show capture button, hide retake and classify buttons
    captureButton.style.display = 'inline-block';
    retakeButton.style.display = 'none';
    classifyButton.style.display = 'none';
    
    // Hide any previous results
    resultContainer.innerHTML = '';
    resultContainer.style.display = 'none';
  }
  
  // Classify waste image
  async function classifyWaste() {
    loadingSpinner.style.display = 'block';
    resultContainer.style.display = 'none';
    
    try {
      // Get image data or manual category
      let requestData = {};
      
      if (capturedImage.style.display === 'block') {
        // Using captured image
        requestData.image = capturedImage.src;
      } else {
        // Using manual category
        const categoryId = manualCategorySelect.value;
        if (!categoryId) {
          showToast('Please select a waste category.', 'warning');
          loadingSpinner.style.display = 'none';
          return;
        }
        requestData.category_id = categoryId;
      }
      
      // Add quantity and location if available
      const quantityInput = document.getElementById('waste-quantity');
      if (quantityInput) {
        requestData.quantity = parseFloat(quantityInput.value) || 1.0;
      }
      
      const disposedProperly = document.getElementById('disposed-properly').checked;
      requestData.disposed_properly = disposedProperly;
      
      // Add location if available
      if (userLocation) {
        requestData.latitude = userLocation.latitude;
        requestData.longitude = userLocation.longitude;
      }
      
      // Send to API for classification
      const response = await fetch('/api/classify-waste', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Classification failed');
      }
      
      // Display result
      displayClassificationResult(data);
      
      // Update user points in navbar if available
      const pointsElement = document.getElementById('user-points');
      if (pointsElement && data.total_points) {
        pointsElement.textContent = data.total_points;
        
        // Animate points change
        pointsElement.classList.add('badge-highlight');
        setTimeout(() => {
          pointsElement.classList.remove('badge-highlight');
        }, 2000);
      }
      
      // Show success message
      showToast('Waste successfully classified!', 'success');
      
    } catch (error) {
      console.error('Error classifying waste:', error);
      showToast(error.message || 'Error classifying waste. Please try again.', 'error');
      resultContainer.innerHTML = `<div class="alert alert-danger">Classification failed: ${error.message}</div>`;
      resultContainer.style.display = 'block';
    } finally {
      loadingSpinner.style.display = 'none';
    }
  }
  
  // Display classification result
  function displayClassificationResult(data) {
    const wasteClass = data.category.toLowerCase().replace(/\s+/g, '');
    const recyclableText = data.recyclable ? 'Recyclable' : 'Non-recyclable';
    const recyclableClass = data.recyclable ? 'success' : 'danger';
    
    const html = `
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">Classification Result</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6 text-center mb-3">
              <div class="waste-category-icon waste-${wasteClass} rounded-circle mx-auto mb-2" 
                   style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-trash-alt fa-2x text-white"></i>
              </div>
              <h4>${data.category}</h4>
              <span class="badge bg-${recyclableClass}">${recyclableText}</span>
            </div>
            <div class="col-md-6">
              <div class="impact-stats">
                <div class="mb-3">
                  <h5><i class="fas fa-award me-2"></i> Points Earned</h5>
                  <p class="h3 text-primary">${data.points_earned} points</p>
                </div>
                <div>
                  <h5><i class="fas fa-leaf me-2"></i> Carbon Impact</h5>
                  <p class="h3 ${data.carbon_impact < 0 ? 'text-success' : 'text-danger'}">
                    ${Math.abs(data.carbon_impact).toFixed(2)} kg CO2 
                    ${data.carbon_impact < 0 ? 'saved' : 'emitted'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <hr>
          
          <div class="text-center mt-3">
            <h5>What to do with this waste?</h5>
            ${getWasteInstructions(data.category, data.recyclable)}
            <a href="/map" class="btn btn-success mt-3">
              <i class="fas fa-map-marker-alt me-2"></i>Find Recycling Centers
            </a>
          </div>
        </div>
      </div>
    `;
    
    resultContainer.innerHTML = html;
    resultContainer.style.display = 'block';
    
    // Scroll to result
    resultContainer.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Get waste disposal instructions based on category
  function getWasteInstructions(category, recyclable) {
    const instructions = {
      'Plastic': 'Clean and empty plastic containers before recycling. Remove caps and lids.',
      'Paper': 'Keep paper dry and free from food contamination. Flatten cardboard boxes.',
      'Glass': 'Rinse glass containers and separate by color if required by your local facility.',
      'Metal': 'Clean metal items and remove any non-metal components if possible.',
      'Organic': 'Compost food waste or use your green bin for garden waste.',
      'Electronic': 'Take to a specialized e-waste recycling center. Data should be wiped from devices.',
      'Hazardous': 'Never put in regular trash. Take to a hazardous waste disposal facility.',
      'Non-recyclable': 'Place in general waste bin. Try to reduce usage of non-recyclable items.'
    };
    
    return `<p class="mt-2">${instructions[category] || 'Dispose according to local guidelines.'}</p>`;
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
  
  // Event listeners
  if (captureButton) {
    captureButton.addEventListener('click', captureImage);
  }
  
  if (retakeButton) {
    retakeButton.addEventListener('click', retakeImage);
  }
  
  if (classifyButton) {
    classifyButton.addEventListener('click', classifyWaste);
  }
  
  // Manual classification form submit
  const manualClassifyForm = document.getElementById('manual-classify-form');
  if (manualClassifyForm) {
    manualClassifyForm.addEventListener('submit', function(e) {
      e.preventDefault();
      classifyWaste();
    });
  }
  
  // Initialize
  getUserLocation();
  
  // Initialize camera if video element exists
  if (videoElement) {
    initCamera();
  }
});
