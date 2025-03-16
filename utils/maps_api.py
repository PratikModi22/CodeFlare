import os
import requests
import logging
from app import app

# Setup logging
logger = logging.getLogger(__name__)

def get_nearby_recycling_centers(latitude, longitude, radius=5000, waste_type=None):
    """
    Gets nearby recycling centers using Google Maps API.
    
    Args:
        latitude: The latitude of the user's location
        longitude: The longitude of the user's location
        radius: Search radius in meters (default: 5000)
        waste_type: Optional filter for specific waste types
        
    Returns:
        List of dictionaries containing recycling center information
    """
    try:
        api_key = app.config['GOOGLE_MAPS_API_KEY']
        if not api_key:
            logger.error("Google Maps API key not found")
            return []
        
        # Define search keywords based on waste type
        keywords = "recycling center"
        if waste_type:
            if waste_type == "electronic":
                keywords = "electronic waste recycling"
            elif waste_type == "hazardous":
                keywords = "hazardous waste disposal"
        
        # Prepare the Places API request
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            "location": f"{latitude},{longitude}",
            "radius": radius,
            "keyword": keywords,
            "key": api_key
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if response.status_code != 200 or data.get("status") != "OK":
            logger.error(f"Maps API error: {data.get('status')} - {data.get('error_message', 'Unknown error')}")
            return []
        
        # Process the results
        centers = []
        for place in data.get("results", []):
            center = {
                "id": place.get("place_id"),
                "name": place.get("name"),
                "address": place.get("vicinity"),
                "latitude": place.get("geometry", {}).get("location", {}).get("lat"),
                "longitude": place.get("geometry", {}).get("location", {}).get("lng"),
                "rating": place.get("rating"),
                "types": place.get("types", []),
                "open_now": place.get("opening_hours", {}).get("open_now")
            }
            
            # Get additional details for each place
            center_details = get_place_details(center["id"], api_key)
            if center_details:
                center.update(center_details)
            
            centers.append(center)
        
        return centers
    
    except Exception as e:
        logger.error(f"Error fetching recycling centers: {str(e)}")
        return []

def get_place_details(place_id, api_key):
    """
    Gets additional details for a specific place using the Places API Details endpoint.
    
    Args:
        place_id: The place ID from the nearby search
        api_key: Google Maps API key
        
    Returns:
        Dictionary with additional place details
    """
    try:
        url = "https://maps.googleapis.com/maps/api/place/details/json"
        params = {
            "place_id": place_id,
            "fields": "formatted_phone_number,website,opening_hours,formatted_address",
            "key": api_key
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if response.status_code != 200 or data.get("status") != "OK":
            return {}
        
        result = data.get("result", {})
        details = {
            "phone": result.get("formatted_phone_number", ""),
            "website": result.get("website", ""),
            "full_address": result.get("formatted_address", "")
        }
        
        # Process opening hours
        if "opening_hours" in result and "weekday_text" in result["opening_hours"]:
            details["hours"] = result["opening_hours"]["weekday_text"]
        
        return details
    
    except Exception as e:
        logger.error(f"Error fetching place details: {str(e)}")
        return {}

def get_directions(origin_lat, origin_lng, destination_lat, destination_lng, travel_mode="driving"):
    """
    Gets directions from origin to destination using Google Directions API.
    
    Args:
        origin_lat: Origin latitude
        origin_lng: Origin longitude
        destination_lat: Destination latitude
        destination_lng: Destination longitude
        travel_mode: Mode of transportation (driving, walking, bicycling, transit)
        
    Returns:
        Dictionary with directions information
    """
    try:
        api_key = app.config['GOOGLE_MAPS_API_KEY']
        if not api_key:
            logger.error("Google Maps API key not found")
            return {}
        
        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": f"{origin_lat},{origin_lng}",
            "destination": f"{destination_lat},{destination_lng}",
            "mode": travel_mode,
            "key": api_key
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if response.status_code != 200 or data.get("status") != "OK":
            logger.error(f"Directions API error: {data.get('status')}")
            return {}
        
        routes = data.get("routes", [])
        if not routes:
            return {}
        
        # Process the first route
        route = routes[0]
        legs = route.get("legs", [])
        if not legs:
            return {}
        
        leg = legs[0]
        
        return {
            "distance": leg.get("distance", {}).get("text", ""),
            "duration": leg.get("duration", {}).get("text", ""),
            "start_address": leg.get("start_address", ""),
            "end_address": leg.get("end_address", ""),
            "steps": [
                {
                    "instruction": step.get("html_instructions", ""),
                    "distance": step.get("distance", {}).get("text", ""),
                    "duration": step.get("duration", {}).get("text", "")
                }
                for step in leg.get("steps", [])
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching directions: {str(e)}")
        return {}
