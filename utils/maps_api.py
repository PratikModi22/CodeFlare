import requests
import json
import logging
from models import WasteCategory

def find_nearby_centers(latitude, longitude, api_key, radius=5000):
    """
    Find nearby recycling centers using Google Maps Places API
    
    Args:
        latitude: User's latitude
        longitude: User's longitude
        api_key: Google Maps API key
        radius: Search radius in meters (default: 5000)
        
    Returns:
        list: List of recycling centers with details
    """
    try:
        # Prepare request to Places API
        base_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        
        # Keywords for recycling centers
        keywords = ["recycling center", "waste management", "recycling facility", "waste disposal"]
        
        all_results = []
        
        for keyword in keywords:
            params = {
                "location": f"{latitude},{longitude}",
                "radius": radius,
                "keyword": keyword,
                "key": api_key
            }
            
            # Send request to Places API
            response = requests.get(base_url, params=params)
            
            if response.status_code != 200:
                logging.error(f"Places API error: {response.text}")
                continue
            
            results = response.json().get('results', [])
            all_results.extend(results)
        
        # Process results to our format
        centers = []
        seen_place_ids = set()
        
        for place in all_results:
            place_id = place.get('place_id')
            
            # Skip duplicates
            if place_id in seen_place_ids:
                continue
            
            seen_place_ids.add(place_id)
            
            # Get detailed place information
            center = {
                'id': place_id,
                'name': place.get('name', 'Unknown'),
                'address': place.get('vicinity', 'Unknown address'),
                'lat': place['geometry']['location']['lat'],
                'lng': place['geometry']['location']['lng'],
                'rating': place.get('rating', 0),
                'user_ratings_total': place.get('user_ratings_total', 0)
            }
            
            # Get more details from Place Details API
            details = get_place_details(place_id, api_key)
            if details:
                center.update({
                    'phone': details.get('phone', ''),
                    'website': details.get('website', ''),
                    'hours': details.get('hours', [])
                })
            
            # Estimate accepted waste types based on name and types
            accepted_waste = estimate_accepted_waste(place)
            center['accepted_waste'] = accepted_waste
            
            centers.append(center)
        
        return centers
    
    except Exception as e:
        logging.error(f"Error finding nearby centers: {str(e)}")
        return []

def get_place_details(place_id, api_key):
    """Get detailed information about a place"""
    try:
        url = "https://maps.googleapis.com/maps/api/place/details/json"
        params = {
            "place_id": place_id,
            "fields": "formatted_phone_number,website,opening_hours",
            "key": api_key
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code != 200:
            return None
        
        result = response.json().get('result', {})
        
        details = {
            'phone': result.get('formatted_phone_number', ''),
            'website': result.get('website', '')
        }
        
        # Process opening hours
        if 'opening_hours' in result and 'weekday_text' in result['opening_hours']:
            details['hours'] = result['opening_hours']['weekday_text']
        
        return details
    
    except Exception as e:
        logging.error(f"Error getting place details: {str(e)}")
        return None

def estimate_accepted_waste(place):
    """Estimate what types of waste a place accepts based on name and types"""
    name = place.get('name', '').lower()
    types = place.get('types', [])
    
    accepted = []
    
    # Check for specific waste types in name
    waste_keywords = {
        'plastic': 1,
        'paper': 2,
        'glass': 3,
        'metal': 4,
        'organic': 5,
        'compost': 5,
        'electronic': 6,
        'e-waste': 6,
        'hazardous': 7
    }
    
    for keyword, category_id in waste_keywords.items():
        if keyword in name:
            accepted.append(category_id)
    
    # General recycling centers typically accept common recyclables
    if 'recycling' in name or 'recycling_center' in types:
        # Common recyclables: plastic, paper, glass, metal
        accepted.extend([1, 2, 3, 4])
    
    # If it's a general waste facility, it probably accepts most types
    if 'waste' in name and 'management' in name:
        accepted.extend([1, 2, 3, 4, 5, 7])
    
    # Deduplicate
    accepted = list(set(accepted))
    
    return ','.join(map(str, accepted))

# Fallback function for when API key is not available
def find_nearby_centers_fallback(latitude, longitude):
    """Fallback when Maps API is not available"""
    # Return some sample centers at calculated distances from user location
    from math import sin, cos, sqrt, atan2, radians
    import random
    
    def calculate_distance(lat1, lon1, lat2, lon2):
        # Calculate distance between two points using Haversine formula
        R = 6371.0  # Radius of the Earth in km
        
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        
        a = sin(dlat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        distance = R * c
        return distance
    
    # Sample centers with calculated offsets
    sample_centers = [
        {
            'id': 'sample-1',
            'name': 'EcoRecycle Center',
            'address': '123 Green St',
            'lat': latitude + random.uniform(-0.02, 0.02),
            'lng': longitude + random.uniform(-0.02, 0.02),
            'accepted_waste': '1,2,3,4',
            'phone': '555-123-4567',
            'website': 'http://example.com/ecorecycle'
        },
        {
            'id': 'sample-2',
            'name': 'City Waste Management',
            'address': '456 Sustainability Ave',
            'lat': latitude + random.uniform(-0.03, 0.03),
            'lng': longitude + random.uniform(-0.03, 0.03),
            'accepted_waste': '1,2,3,4,5,7',
            'phone': '555-765-4321',
            'website': 'http://example.com/citywaste'
        },
        {
            'id': 'sample-3',
            'name': 'Electronic Recycling Hub',
            'address': '789 Tech Blvd',
            'lat': latitude + random.uniform(-0.01, 0.01),
            'lng': longitude + random.uniform(-0.01, 0.01),
            'accepted_waste': '6',
            'phone': '555-987-6543',
            'website': 'http://example.com/erecycle'
        }
    ]
    
    # Calculate distances
    for center in sample_centers:
        center['distance'] = calculate_distance(
            latitude, longitude, center['lat'], center['lng']
        )
    
    # Sort by distance
    sample_centers.sort(key=lambda x: x['distance'])
    
    return sample_centers
