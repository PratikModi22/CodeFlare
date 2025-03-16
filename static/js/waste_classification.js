// Global variables
let imagePreview = null;
let classificationResult = null;
let uploadedImage = null;

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Setup image upload preview
    const imageUploadInput = document.getElementById('image-upload');
    const imagePreviewElement = document.getElementById('image-preview');
    const uploadForm = document.getElementById('upload-form');
    const classifyBtn = document.getElementById('classify-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resultContainer = document.getElementById('classification-result');
    
    // Initialize camera capture
    setupCameraCapture();
    
    // Add event listener for file input change
    imageUploadInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        previewImage(file);
    });
    
    // Add event listener for the form submission
    uploadForm.addEventListener('submit', function(event) {
        event.preventDefault();
        classifyWaste();
    });
    
    // Add event listener for reset button
    resetBtn.addEventListener('click', resetClassification);
    
    // Add drag and drop functionality
    const dropArea = document.getElementById('drop-area');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    // Initialize tippy.js tooltips
    if (typeof tippy !== 'undefined') {
        tippy('[data-tippy-content]');
    }
});

// Setup camera capture functionality
function setupCameraCapture() {
    const cameraBtn = document.getElementById('camera-btn');
    const captureBtn = document.getElementById('capture-btn');
    const cameraFeedback = document.getElementById('camera-feedback');
    const cameraModal = document.getElementById('camera-modal');
    
    // Check if camera buttons exist
    if (!cameraBtn || !captureBtn) return;
    
    // Add event listener for camera button
    cameraBtn.addEventListener('click', function() {
        // Start the camera when the modal is shown
        const modal = new bootstrap.Modal(cameraModal);
        modal.show();
        
        cameraModal.addEventListener('shown.bs.modal', function() {
            startCamera();
        });
        
        cameraModal.addEventListener('hidden.bs.modal', function() {
            stopCamera();
        });
    });
    
    // Add event listener for capture button
    captureBtn.addEventListener('click', captureImage);
}

// Start the camera feed
function startCamera() {
    const videoElement = document.getElementById('camera-feed');
    
    // Check if videoElement exists
    if (!videoElement) return;
    
    // Access user's camera
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(stream) {
            window.localStream = stream;
            videoElement.srcObject = stream;
            videoElement.play();
            document.getElementById('capture-btn').disabled = false;
        })
        .catch(function(error) {
            console.error('Error accessing camera:', error);
            alert('Could not access camera. Please make sure camera permissions are enabled and try again.');
        });
}

// Stop the camera feed
function stopCamera() {
    const videoElement = document.getElementById('camera-feed');
    
    // Check if video element and stream exist
    if (!videoElement || !window.localStream) return;
    
    // Stop all tracks
    window.localStream.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
    document.getElementById('capture-btn').disabled = true;
}

// Capture an image from the camera feed
function captureImage() {
    const videoElement = document.getElementById('camera-feed');
    
    // Check if video element exists and is playing
    if (!videoElement || !videoElement.srcObject) return;
    
    // Create a canvas element to capture the frame
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    // Draw the current video frame to the canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Convert the canvas to a Blob
    canvas.toBlob(function(blob) {
        // Create a File object from the Blob
        const now = new Date();
        const filename = `camera_capture_${now.getTime()}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });
        
        // Preview the image
        previewImage(file);
        
        // Close the modal
        bootstrap.Modal.getInstance(document.getElementById('camera-modal')).hide();
    }, 'image/jpeg');
}

// Preview the uploaded or captured image
function previewImage(file) {
    // Save the uploaded file
    uploadedImage = file;
    
    // Create a URL for the file
    const imageURL = URL.createObjectURL(file);
    
    // Display the image preview
    const previewElement = document.getElementById('image-preview');
    previewElement.src = imageURL;
    previewElement.classList.remove('d-none');
    
    // Show the preview container and classify button
    document.getElementById('preview-container').classList.remove('d-none');
    document.getElementById('classify-btn').disabled = false;
    
    // Hide the result container if it was previously shown
    document.getElementById('classification-result').classList.add('d-none');
    
    // Show file info
    const fileInfo = document.getElementById('file-info');
    fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    fileInfo.classList.remove('d-none');
}

// Handle the drag and drop events
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    document.getElementById('drop-area').classList.add('highlight');
}

function unhighlight() {
    document.getElementById('drop-area').classList.remove('highlight');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            // Update the file input
            document.getElementById('image-upload').files = files;
            previewImage(file);
        } else {
            alert('Please upload an image file.');
        }
    }
}

// Classify the uploaded waste image
function classifyWaste() {
    // Check if an image has been uploaded
    if (!uploadedImage) {
        alert('Please upload an image first.');
        return;
    }
    
    // Create a FormData object
    const formData = new FormData();
    formData.append('image', uploadedImage);
    
    // Show loading state
    const classifyBtn = document.getElementById('classify-btn');
    classifyBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Classifying...';
    classifyBtn.disabled = true;
    
    // Make the API request
    fetch('/api/classify-waste', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Classification failed');
        }
        return response.json();
    })
    .then(data => {
        // Store the classification result
        classificationResult = data;
        
        // Show the result
        displayClassificationResult(data);
        
        // Reset the button
        classifyBtn.innerHTML = 'Classify Waste';
        classifyBtn.disabled = false;
    })
    .catch(error => {
        console.error('Error classifying waste:', error);
        
        // Show error message
        const resultContainer = document.getElementById('classification-result');
        resultContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> 
                Failed to classify the image. Please try again or upload a clearer image.
            </div>
        `;
        resultContainer.classList.remove('d-none');
        
        // Reset the button
        classifyBtn.innerHTML = 'Classify Waste';
        classifyBtn.disabled = false;
    });
}

// Display the classification result
function displayClassificationResult(result) {
    const resultContainer = document.getElementById('classification-result');
    
    // Create the recyclable status icon and message
    const recyclableStatus = result.recyclable ? 
        `<span class="badge bg-success"><i class="fas fa-recycle"></i> Recyclable</span>` : 
        `<span class="badge bg-danger"><i class="fas fa-trash-alt"></i> Non-Recyclable</span>`;
    
    // Create the result HTML
    resultContainer.innerHTML = `
        <div class="card border-primary">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">
                    <i class="fas fa-search"></i> Classification Result
                </h5>
            </div>
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h3 class="mb-0">${result.waste_type}</h3>
                    ${recyclableStatus}
                </div>
                
                <div class="progress mb-3" style="height: 25px;">
                    <div class="progress-bar bg-success" role="progressbar" 
                         style="width: ${result.confidence * 100}%;" 
                         aria-valuenow="${result.confidence * 100}" 
                         aria-valuemin="0" aria-valuemax="100">
                        ${(result.confidence * 100).toFixed(0)}% Confidence
                    </div>
                </div>
                
                <div class="alert ${result.recyclable ? 'alert-success' : 'alert-warning'}">
                    <h5>
                        <i class="${result.recyclable ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'}"></i> 
                        ${result.recyclable ? 'Great news!' : 'Attention!'}
                    </h5>
                    <p>
                        ${result.recyclable ? 
                            `This item is recyclable! By recycling properly, you've just earned <strong>${result.points_earned} points</strong> and saved approximately <strong>${result.carbon_saved.toFixed(2)} kg of CO2</strong>.` : 
                            `This item should not be recycled through conventional methods. Please dispose of it properly according to local guidelines to minimize environmental impact.`
                        }
                    </p>
                </div>
                
                <div class="mt-3">
                    <h5>What to do with ${result.waste_type}:</h5>
                    <ul class="list-group">
                        ${getWasteTypeInstructions(result.waste_type, result.recyclable)}
                    </ul>
                </div>
                
                <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
                    <button class="btn btn-primary" onclick="findRecyclingCenters('${result.waste_type}')">
                        <i class="fas fa-map-marker-alt"></i> Find Recycling Centers
                    </button>
                    <button class="btn btn-info" onclick="shareResult()">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Show the result container
    resultContainer.classList.remove('d-none');
    
    // Scroll to the result
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// Get instructions for handling different waste types
function getWasteTypeInstructions(wasteType, recyclable) {
    const wasteTypeLower = wasteType.toLowerCase();
    
    if (wasteTypeLower.includes('plastic')) {
        return `
            <li class="list-group-item">Rinse the container to remove any food residue</li>
            <li class="list-group-item">Remove any non-plastic components (like metal lids)</li>
            <li class="list-group-item">Check for recycling symbols (usually 1-7 inside a triangle)</li>
            <li class="list-group-item">Place in your recycling bin or take to a recycling center</li>
        `;
    } else if (wasteTypeLower.includes('paper') || wasteTypeLower.includes('cardboard')) {
        return `
            <li class="list-group-item">Remove any non-paper materials (like plastic windows in envelopes)</li>
            <li class="list-group-item">Flatten cardboard boxes to save space</li>
            <li class="list-group-item">Keep paper dry and clean</li>
            <li class="list-group-item">Place in your recycling bin or take to a recycling center</li>
        `;
    } else if (wasteTypeLower.includes('glass')) {
        return `
            <li class="list-group-item">Rinse the container to remove any residue</li>
            <li class="list-group-item">Remove any non-glass components (like plastic lids)</li>
            <li class="list-group-item">Don't break the glass - it's easier to recycle intact</li>
            <li class="list-group-item">Place in your recycling bin or take to a glass recycling center</li>
        `;
    } else if (wasteTypeLower.includes('metal') || wasteTypeLower.includes('aluminum') || wasteTypeLower.includes('can')) {
        return `
            <li class="list-group-item">Rinse the container to remove any residue</li>
            <li class="list-group-item">Remove any non-metal components if possible</li>
            <li class="list-group-item">Crush cans to save space (optional)</li>
            <li class="list-group-item">Place in your recycling bin or take to a recycling center</li>
        `;
    } else if (wasteTypeLower.includes('organic') || wasteTypeLower.includes('food') || wasteTypeLower.includes('vegetable')) {
        return `
            <li class="list-group-item">Compost if possible - great for garden soil!</li>
            <li class="list-group-item">Use a dedicated food waste bin if your area provides collection</li>
            <li class="list-group-item">Keep meat and dairy separate in some composting systems</li>
            <li class="list-group-item">If composting isn't available, dispose with regular waste</li>
        `;
    } else if (wasteTypeLower.includes('electronic') || wasteTypeLower.includes('battery') || wasteTypeLower.includes('device')) {
        return `
            <li class="list-group-item">Never place in regular trash or recycling bins</li>
            <li class="list-group-item">Take to an e-waste recycling center or electronics store</li>
            <li class="list-group-item">Consider donating if the device still works</li>
            <li class="list-group-item">Remove batteries for separate recycling</li>
        `;
    } else {
        // Generic instructions based on recyclability
        if (recyclable) {
            return `
                <li class="list-group-item">Clean the item if necessary</li>
                <li class="list-group-item">Check local recycling guidelines for specific instructions</li>
                <li class="list-group-item">Place in appropriate recycling bin</li>
                <li class="list-group-item">Take to a recycling center if curbside recycling isn't available</li>
            `;
        } else {
            return `
                <li class="list-group-item">Check if there are specialized disposal options in your area</li>
                <li class="list-group-item">Consider if the item can be reused or repurposed</li>
                <li class="list-group-item">Dispose in general waste if no alternatives are available</li>
                <li class="list-group-item">Never dump illegally or in nature</li>
            `;
        }
    }
}

// Reset the classification form
function resetClassification() {
    // Reset the file input
    document.getElementById('image-upload').value = '';
    
    // Hide the preview
    document.getElementById('preview-container').classList.add('d-none');
    document.getElementById('image-preview').classList.add('d-none');
    document.getElementById('file-info').classList.add('d-none');
    
    // Hide the result
    document.getElementById('classification-result').classList.add('d-none');
    
    // Disable the classify button
    document.getElementById('classify-btn').disabled = true;
    
    // Reset the uploaded image
    uploadedImage = null;
    classificationResult = null;
}

// Redirect to waste map with the waste type
function findRecyclingCenters(wasteType) {
    window.location.href = `/waste-map?waste_type=${encodeURIComponent(wasteType)}`;
}

// Share classification result
function shareResult() {
    if (!classificationResult) return;
    
    const wasteType = classificationResult.waste_type;
    const recyclable = classificationResult.recyclable;
    
    const title = 'I just classified some waste with EcoTrack!';
    const text = `I identified ${wasteType} waste and learned it's ${recyclable ? 'recyclable' : 'not recyclable'}. Join me in making a difference!`;
    const url = window.location.href;
    
    // Check if Web Share API is supported
    if (navigator.share) {
        navigator.share({
            title: title,
            text: text,
            url: url
        })
        .catch(console.error);
    } else {
        // Fallback - copy to clipboard
        const shareText = `${title}\n\n${text}\n\n${url}`;
        
        // Create a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        textarea.style.position = 'fixed';  // Avoid scrolling to bottom
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
            document.execCommand('copy');
            alert('Result copied to clipboard! You can now paste and share it.');
        } catch (err) {
            console.error('Failed to copy: ', err);
            alert('Failed to copy to clipboard. Please share manually.');
        }
        
        document.body.removeChild(textarea);
    }
}
