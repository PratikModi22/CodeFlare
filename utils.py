import base64
import json
import logging
import requests
import os
from io import BytesIO
from math import radians, sin, cos, sqrt, asin

def classify_waste_image(image_data, api_key):
    """
    Uses Google Cloud Vision API to classify waste images
    
    Args:
        image_data: Binary image data
        api_key: Google Cloud Vision API key
    
    Returns:
        tuple: (waste_type, confidence_score)
    """
    try:
        # If no API key provided, use a fallback local classification
        if not api_key:
            logging.warning("No Google Vision API key provided, using fallback classification")
            return fallback_waste_classification(image_data)
        
        # Encode image data to base64
        encoded_image = base64.b64encode(image_data).decode('utf-8')
        
        # Prepare request to Vision API
        vision_api_url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
        
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
                        }
                    ]
                }
            ]
        }
        
        # Send request to Vision API
        response = requests.post(vision_api_url, json=request_data)
        response.raise_for_status()
        
        result = response.json()
        
        # Process API response
        labels = result["responses"][0]["labelAnnotations"]
        
        # Map labels to waste categories
        waste_keywords = {
            "plastic": ["plastic", "bottle", "container", "packaging", "polymer"],
            "paper": ["paper", "cardboard", "carton", "newspaper", "magazine", "book"],
            "glass": ["glass", "bottle", "jar", "window"],
            "metal": ["metal", "aluminum", "steel", "tin", "can", "foil"],
            "organic": ["food", "fruit", "vegetable", "meat", "leaf", "plant", "wood", "garden"],
            "electronic": ["electronic", "device", "computer", "phone", "battery", "cable"],
            "textile": ["clothing", "fabric", "textile", "shirt", "pants", "cloth"],
            "hazardous": ["chemical", "paint", "oil", "battery", "medicine", "pharmaceutical"]
        }
        
        # Check each label against waste categories
        waste_type_scores = {waste_type: 0 for waste_type in waste_keywords}
        
        for label in labels:
            label_name = label["description"].lower()
            score = label["score"]
            
            for waste_type, keywords in waste_keywords.items():
                if any(keyword in label_name for keyword in keywords):
                    waste_type_scores[waste_type] += score
        
        # Find the waste type with the highest score
        best_match = max(waste_type_scores.items(), key=lambda x: x[1])
        waste_type = best_match[0]
        confidence = best_match[1]
        
        # If no good match found, default to "general waste"
        if confidence < 0.1:
            waste_type = "general waste"
            confidence = 0.5
            
        return waste_type.capitalize(), round(confidence, 2)
        
    except Exception as e:
        logging.error(f"Error classifying image: {str(e)}")
        return fallback_waste_classification(image_data)

def fallback_waste_classification(image_data):
    """
    Fallback classification when API is not available
    
    Args:
        image_data: Binary image data
    
    Returns:
        tuple: (waste_type, confidence_score)
    """
    # This is a placeholder function that would ideally use a local model
    # For now, we'll return a generic response
    return "General Waste", 0.5

def get_nearby_recycling_centers(latitude, longitude, radius_km, api_key):
    """
    Uses Google Maps API to find nearby recycling centers
    
    Args:
        latitude: User's latitude
        longitude: User's longitude
        radius_km: Search radius in kilometers
        api_key: Google Maps API key
    
    Returns:
        list: List of recycling centers
    """
    try:
        # If no API key provided, use a fallback method
        if not api_key:
            logging.warning("No Google Maps API key provided, using fallback recycling centers")
            return fallback_recycling_centers(latitude, longitude)
        
        # Convert radius to meters for Google Maps API
        radius_meters = radius_km * 1000
        
        # Prepare request to Places API
        places_api_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            "location": f"{latitude},{longitude}",
            "radius": radius_meters,
            "keyword": "recycling center",
            "key": api_key
        }
        
        # Send request to Places API
        response = requests.get(places_api_url, params=params)
        response.raise_for_status()
        
        result = response.json()
        
        # Process API response
        centers = []
        
        if result["status"] == "OK":
            for place in result["results"]:
                center = {
                    "name": place["name"],
                    "address": place.get("vicinity", "Address not available"),
                    "latitude": place["geometry"]["location"]["lat"],
                    "longitude": place["geometry"]["location"]["lng"],
                    "description": "",
                    "waste_types": "General Recycling",
                    "hours": "Not available"
                }
                centers.append(center)
        
        return centers
        
    except Exception as e:
        logging.error(f"Error finding recycling centers: {str(e)}")
        return fallback_recycling_centers(latitude, longitude)

def fallback_recycling_centers(latitude, longitude):
    """
    Fallback recycling centers when API is not available
    
    Args:
        latitude: User's latitude
        longitude: User's longitude
    
    Returns:
        list: List of predefined recycling centers
    """
    # This function provides some predefined recycling centers
    # In a real application, this would be a database of known centers
    
    # Calculate distance to determine if centers are nearby
    centers = [
        {
            "name": "EcoRecycle Center",
            "address": "123 Green St",
            "latitude": latitude + 0.01,
            "longitude": longitude + 0.01,
            "description": "Full-service recycling center accepting all types of recyclables",
            "waste_types": "Plastic, Paper, Glass, Metal, Electronics",
            "hours": "Mon-Sat: 8AM-6PM"
        },
        {
            "name": "Community Recycling Hub",
            "address": "456 Earth Ave",
            "latitude": latitude - 0.01,
            "longitude": longitude - 0.02,
            "description": "Community-run recycling center with educational programs",
            "waste_types": "Plastic, Paper, Glass, Organic",
            "hours": "Tue-Sun: 9AM-5PM"
        },
        {
            "name": "GreenTech Recycling",
            "address": "789 Eco Blvd",
            "latitude": latitude + 0.02,
            "longitude": longitude - 0.01,
            "description": "Specializes in electronic waste recycling",
            "waste_types": "Electronics, Batteries, Metal",
            "hours": "Mon-Fri: 10AM-7PM"
        }
    ]
    
    # Filter centers that are within a reasonable distance
    nearby_centers = []
    for center in centers:
        distance = haversine_distance(latitude, longitude, center["latitude"], center["longitude"])
        if distance < 10:  # 10 km radius
            nearby_centers.append(center)
    
    return nearby_centers

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371  # Radius of earth in kilometers
    
    return c * r

def calculate_carbon_savings(waste_type, weight):
    """
    Calculate carbon savings based on waste type and weight
    
    Args:
        waste_type: WasteType object
        weight: Weight in kg
    
    Returns:
        float: Carbon savings in kg CO2 equivalent
    """
    # Calculate based on waste type's carbon impact
    carbon_impact = waste_type.carbon_impact
    
    # If waste is recyclable, we count it as a saving
    if waste_type.recyclable:
        return carbon_impact * weight
    else:
        # Non-recyclable waste doesn't contribute to carbon savings
        return 0
