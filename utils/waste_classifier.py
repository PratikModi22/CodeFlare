import os
import io
import logging
from google.cloud import vision
from google.oauth2 import service_account
from flask import current_app

logger = logging.getLogger(__name__)

# Dictionary mapping Google Vision labels to waste categories
WASTE_CATEGORIES = {
    'plastic': 'recyclable',
    'bottle': 'recyclable',
    'paper': 'recyclable',
    'cardboard': 'recyclable',
    'glass': 'recyclable',
    'metal': 'recyclable',
    'aluminum': 'recyclable',
    'can': 'recyclable',
    'food': 'organic',
    'fruit': 'organic',
    'vegetable': 'organic',
    'plant': 'organic',
    'wood': 'organic',
    'garden': 'organic',
    'battery': 'hazardous',
    'electronic': 'hazardous',
    'chemical': 'hazardous',
    'medicine': 'hazardous',
    'oil': 'hazardous',
    'styrofoam': 'non-recyclable',
    'plastic bag': 'non-recyclable',
    'wrapper': 'non-recyclable',
    'diaper': 'non-recyclable'
}

def classify_waste_image(image_file):
    """
    Classify an image of waste using Google Cloud Vision API
    
    Args:
        image_file: File object containing the image
        
    Returns:
        tuple: (waste_type, confidence)
    """
    try:
        # Initialize Vision client
        api_key = current_app.config["GOOGLE_VISION_API_KEY"]
        if not api_key:
            # Fallback to local classification if no API key
            return local_classify_waste(image_file)
            
        # Set up the Vision client
        client = vision.ImageAnnotatorClient()
        
        # Read the image
        content = image_file.read()
        
        # Create an Image object
        image = vision.Image(content=content)
        
        # Perform label detection
        response = client.label_detection(image=image)
        
        if response.error.message:
            raise Exception(f'Google Vision API error: {response.error.message}')
            
        labels = response.label_annotations
        
        # Map the labels to waste categories
        waste_type_scores = {
            'recyclable': 0.0,
            'organic': 0.0,
            'hazardous': 0.0,
            'non-recyclable': 0.0
        }
        
        for label in labels:
            label_name = label.description.lower()
            
            # Check for exact matches
            if label_name in WASTE_CATEGORIES:
                category = WASTE_CATEGORIES[label_name]
                waste_type_scores[category] += label.score
            else:
                # Check for partial matches
                for keyword, category in WASTE_CATEGORIES.items():
                    if keyword in label_name:
                        waste_type_scores[category] += label.score * 0.7  # Reduced confidence for partial matches
        
        # Determine the most likely waste type
        if max(waste_type_scores.values()) > 0:
            most_likely_type = max(waste_type_scores, key=waste_type_scores.get)
            confidence = waste_type_scores[most_likely_type]
        else:
            # If no match found, default to non-recyclable
            most_likely_type = 'non-recyclable'
            confidence = 0.5
        
        logger.info(f"Classified waste as {most_likely_type} with confidence {confidence}")
        return most_likely_type, float(confidence)
        
    except Exception as e:
        logger.error(f"Error in waste classification: {str(e)}")
        # Fallback to local classification on error
        return local_classify_waste(image_file)

def local_classify_waste(image_file):
    """
    Fallback function for waste classification when API is not available.
    Uses simple color-based heuristics for basic classification.
    
    Args:
        image_file: File object containing the image
        
    Returns:
        tuple: (waste_type, confidence)
    """
    try:
        from PIL import Image
        
        # Reset file pointer to the beginning
        image_file.seek(0)
        
        # Open image with PIL
        img = Image.open(image_file)
        img = img.convert('RGB')
        img = img.resize((100, 100))  # Resize for faster processing
        
        # Calculate dominant colors
        pixels = list(img.getdata())
        r_avg = sum(p[0] for p in pixels) / len(pixels)
        g_avg = sum(p[1] for p in pixels) / len(pixels)
        b_avg = sum(p[2] for p in pixels) / len(pixels)
        
        # Very simple heuristic based on color
        # Green/brown -> organic
        # Blue/transparent -> recyclable
        # Red/yellow -> hazardous
        # Gray/black -> non-recyclable
        
        if g_avg > r_avg and g_avg > b_avg:
            # Dominant green, likely organic
            waste_type = 'organic'
            confidence = 0.6
        elif b_avg > r_avg and b_avg > g_avg:
            # Dominant blue, likely recyclable
            waste_type = 'recyclable'
            confidence = 0.6
        elif r_avg > g_avg and r_avg > b_avg:
            if r_avg > 150 and g_avg > 150:
                # Yellow-ish, might be hazardous
                waste_type = 'hazardous'
                confidence = 0.5
            else:
                waste_type = 'non-recyclable'
                confidence = 0.4
        else:
            # Default to non-recyclable
            waste_type = 'non-recyclable'
            confidence = 0.4
            
        logger.info(f"Local classification: {waste_type} with confidence {confidence}")
        return waste_type, confidence
        
    except Exception as e:
        logger.error(f"Error in local waste classification: {str(e)}")
        # Ultimate fallback - just return a reasonable default
        return 'non-recyclable', 0.3
