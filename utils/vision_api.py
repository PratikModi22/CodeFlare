import os
import io
import logging
from google.cloud import vision
from google.oauth2 import service_account
from app import app

# Setup logging
logger = logging.getLogger(__name__)

# Waste categories and common items
WASTE_CATEGORIES = {
    'recyclable': ['paper', 'cardboard', 'plastic bottle', 'glass bottle', 'aluminum can', 'metal', 'tin', 'newspaper', 'magazine', 'plastic container'],
    'organic': ['food waste', 'fruit', 'vegetable', 'plant', 'leaves', 'grass', 'coffee grounds', 'tea leaves', 'eggshell', 'nutshell'],
    'hazardous': ['battery', 'electronic', 'paint', 'chemical', 'medication', 'light bulb', 'oil', 'pesticide', 'aerosol', 'gas'],
    'landfill': ['styrofoam', 'plastic bag', 'diaper', 'wax paper', 'ceramic', 'porcelain', 'cigarette butt', 'non-recyclable plastic'],
    'electronic': ['computer', 'phone', 'tablet', 'television', 'printer', 'keyboard', 'charger', 'cable', 'electronic device']
}

# Recommendations based on waste type
WASTE_RECOMMENDATIONS = {
    'recyclable': [
        'Rinse containers before recycling',
        'Remove caps and lids',
        'Flatten cardboard boxes',
        'Check local recycling guidelines for specific items'
    ],
    'organic': [
        'Consider home composting',
        'Remove any non-organic stickers or labels',
        'Cut large items into smaller pieces for faster decomposition',
        'Keep meat and dairy out of home compost bins'
    ],
    'hazardous': [
        'Never mix different hazardous materials',
        'Store in original containers when possible',
        'Check for special collection events in your area',
        'Many stores accept batteries and electronics for recycling'
    ],
    'landfill': [
        'Try to find alternatives to single-use items',
        'Consider products with less packaging',
        'Some items like plastic bags may be recyclable at grocery stores',
        'Reuse items when possible before disposing'
    ],
    'electronic': [
        'Check if manufacturer has a take-back program',
        'Remove batteries before recycling',
        'Delete personal data from devices',
        'Many electronics stores offer free recycling services'
    ]
}

def get_vision_client():
    """Creates and returns a Google Vision API client."""
    try:
        api_key = app.config['GOOGLE_VISION_API_KEY']
        
        # If using API key authentication
        if api_key:
            client = vision.ImageAnnotatorClient.from_service_account_json(api_key)
            return client
        
        # Fall back to application default credentials
        return vision.ImageAnnotatorClient()
    
    except Exception as e:
        logger.error(f"Error initializing Vision API client: {str(e)}")
        return None

def classify_waste_image(image_path):
    """
    Classifies an image of waste using Google Vision API.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Dictionary containing the classification result:
        {
            'label': waste category (recyclable, organic, etc.),
            'confidence': confidence score,
            'recommendations': list of disposal recommendations
        }
    """
    try:
        client = get_vision_client()
        if not client:
            logger.error("Failed to initialize Vision API client")
            return None
        
        # Read the image file
        with io.open(image_path, 'rb') as image_file:
            content = image_file.read()
        
        image = vision.Image(content=content)
        
        # Detect labels in the image
        response = client.label_detection(image=image)
        labels = response.label_annotations
        
        if response.error.message:
            logger.error(f"Vision API error: {response.error.message}")
            return None
        
        # Process labels to determine waste category
        waste_scores = {category: 0 for category in WASTE_CATEGORIES}
        
        for label in labels:
            label_name = label.description.lower()
            score = label.score
            
            for category, items in WASTE_CATEGORIES.items():
                for item in items:
                    if item in label_name or label_name in item:
                        waste_scores[category] += score
        
        # Determine the most likely waste category
        max_score = 0
        best_category = 'landfill'  # Default if no matches
        
        for category, score in waste_scores.items():
            if score > max_score:
                max_score = score
                best_category = category
        
        # If no category had a good match, use object detection for more specific analysis
        if max_score < 0.1:
            # Fall back to object detection
            objects = client.object_localization(image=image).localized_object_annotations
            
            for detected_object in objects:
                object_name = detected_object.name.lower()
                score = detected_object.score
                
                for category, items in WASTE_CATEGORIES.items():
                    for item in items:
                        if item in object_name or object_name in item:
                            waste_scores[category] += score
            
            # Recalculate best category
            for category, score in waste_scores.items():
                if score > max_score:
                    max_score = score
                    best_category = category
        
        # Get recommendations for the waste type
        recommendations = WASTE_RECOMMENDATIONS.get(best_category, [])
        
        return {
            'label': best_category,
            'confidence': max_score,
            'recommendations': recommendations
        }
    
    except Exception as e:
        logger.error(f"Error classifying waste image: {str(e)}")
        return None
