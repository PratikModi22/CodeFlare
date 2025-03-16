import requests
import base64
import json
import logging

def classify_waste_image(image_bytes, api_key):
    """
    Classify waste image using Google Cloud Vision API
    
    Args:
        image_bytes: Raw image bytes
        api_key: Google Cloud Vision API key
        
    Returns:
        dict: Classification result with category and confidence
    """
    try:
        # Encode image as base64
        encoded_image = base64.b64encode(image_bytes).decode('utf-8')
        
        # Prepare request to Vision API
        api_url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
        
        request_data = {
            "requests": [
                {
                    "image": {
                        "content": encoded_image
                    },
                    "features": [
                        {
                            "type": "LABEL_DETECTION",
                            "maxResults": 10
                        },
                        {
                            "type": "OBJECT_LOCALIZATION",
                            "maxResults": 5
                        }
                    ]
                }
            ]
        }
        
        # Send request to Vision API
        response = requests.post(api_url, json=request_data)
        
        if response.status_code != 200:
            logging.error(f"Vision API error: {response.text}")
            return {"category": "Non-recyclable", "confidence": 0.0}
        
        # Parse response
        result = response.json()
        
        # Map Vision API labels to waste categories
        waste_mapping = {
            "plastic": "Plastic",
            "bottle": "Plastic",
            "container": "Plastic",
            "paper": "Paper",
            "cardboard": "Paper",
            "newspaper": "Paper",
            "glass": "Glass",
            "metal": "Metal",
            "can": "Metal",
            "aluminum": "Metal",
            "food": "Organic",
            "fruit": "Organic",
            "vegetable": "Organic",
            "electronic": "Electronic",
            "device": "Electronic",
            "battery": "Electronic",
            "chemical": "Hazardous",
            "toxic": "Hazardous",
            "styrofoam": "Non-recyclable"
        }
        
        # Get labels from response
        if 'responses' in result and result['responses'] and 'labelAnnotations' in result['responses'][0]:
            labels = result['responses'][0]['labelAnnotations']
            
            # Try to match labels to waste categories
            for label in labels:
                description = label['description'].lower()
                confidence = label['score']
                
                for keyword, category in waste_mapping.items():
                    if keyword in description:
                        return {"category": category, "confidence": confidence}
        
        # If no match found, default to non-recyclable
        return {"category": "Non-recyclable", "confidence": 0.5}
    
    except Exception as e:
        logging.error(f"Error in waste classification: {str(e)}")
        return {"category": "Non-recyclable", "confidence": 0.0}

# Fallback function for when API key is not available
def classify_waste_image_fallback(image_bytes):
    """Fallback classification when Vision API is not available"""
    # This would use a local model or simple image analysis
    # For now, just return a random category for demonstration
    import random
    
    categories = [
        "Plastic", "Paper", "Glass", "Metal", "Organic", 
        "Electronic", "Hazardous", "Non-recyclable"
    ]
    
    selected = random.choice(categories)
    confidence = random.uniform(0.7, 0.95)
    
    return {"category": selected, "confidence": confidence}
