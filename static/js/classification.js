// Classification page functionality

document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('waste-upload-form');
    const imagePreview = document.getElementById('image-preview');
    const previewContainer = document.getElementById('preview-container');
    const fileInput = document.getElementById('waste-image');
    const submitButton = document.getElementById('submit-classification');
    const loadingSpinner = document.getElementById('loading-spinner');
    const weightInput = document.getElementById('waste-weight');
    
    // Handle file selection for preview
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (file) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    previewContainer.classList.remove('d-none');
                    submitButton.disabled = false;
                };
                
                reader.readAsDataURL(file);
            } else {
                previewContainer.classList.add('d-none');
                submitButton.disabled = true;
            }
        });
    }
    
    // Handle form submission with loading state
    if (uploadForm) {
        uploadForm.addEventListener('submit', function() {
            if (loadingSpinner) {
                loadingSpinner.classList.remove('d-none');
                submitButton.disabled = true;
            }
        });
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Weight input validation - ensure numeric value
    if (weightInput) {
        weightInput.addEventListener('input', function() {
            // Remove non-numeric characters except decimal point
            this.value = this.value.replace(/[^0-9.]/g, '');
            
            // Ensure only one decimal point
            const parts = this.value.split('.');
            if (parts.length > 2) {
                this.value = parts[0] + '.' + parts.slice(1).join('');
            }
        });
    }
    
    // Handle recommendations accordion
    const recommendationsContainer = document.getElementById('recommendations-container');
    if (recommendationsContainer) {
        // Dynamically show/hide based on classification result
        const wasteType = recommendationsContainer.dataset.wasteType;
        if (wasteType) {
            recommendationsContainer.classList.remove('d-none');
        }
    }
});

// Function to copy recommendations to clipboard
function copyRecommendations() {
    const recommendationsList = document.getElementById('recommendations-list');
    if (recommendationsList) {
        const items = recommendationsList.querySelectorAll('li');
        let text = 'Recycling Recommendations:\n\n';
        
        items.forEach(item => {
            text += '- ' + item.textContent + '\n';
        });
        
        navigator.clipboard.writeText(text).then(() => {
            // Show copied notification
            const copyBtn = document.getElementById('copy-recommendations');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        });
    }
}

// Handle classification result sharing
function shareClassification() {
    const wasteType = document.getElementById('waste-type-result')?.textContent;
    const shareText = `I just classified my waste as ${wasteType} using EcoWaste! Join me in making a positive impact on our planet. #SustainableLiving #EcoWaste`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My Waste Classification',
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
