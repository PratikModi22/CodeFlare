import os
import math
import requests
import logging
from flask import current_app
from models import RecyclingCenter, db

logger = logging.getLogger(__name__)

def find_nearby_centers(latitude, longitude, radius=10):
    """
    Find recycling centers near a given location
    
    Args:
        latitude (float): Latitude of the location
        longitude (float): Longitude of the location
        radius (float): Search radius in kilometers (default: 10)
        
    Returns:
        list: List of nearby recycling centers
    """
    try:
        # Try to use Google Maps API if key is available
        api_key = current_app.config["GOOGLE_MAPS_API_KEY"]
        
        if api_key:
            return find_centers_google_api(latitude, longitude, radius, api_key)
        else:
            # Fallback to database search
            return find_centers_from_db(latitude, longitude, radius)
            
    except Exception as e:
        logger.error(f"Error finding recycling centers: {str(e)}")
        # Fallback to database in case of API error
        return find_centers_from_db(latitude, longitude, radius)

def find_centers_google_api(latitude, longitude, radius, api_key):
    """
    Find recycling centers using Google Places API
    
    Args:
        latitude (float): Latitude of the location
        longitude (float): Longitude of the location
        radius (float): Search radius in kilometers
        api_key (str): Google Maps API key
        
    Returns:
        list: List of nearby recycling centers
    """
    # Convert radius to meters for Google API
    radius_meters = radius * 1000
    
    # Prepare the request URL
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{latitude},{longitude}",
        "radius": radius_meters,
        "keyword": "recycling center",
        "type": "establishment",
        "key": api_key
    }
    
    response = requests.get(url, params=params)
    
    if response.status_code != 200:
        raise Exception(f"Google Places API error: {response.status_code}")
        
    data = response.json()
    
    if data["status"] != "OK" and data["status"] != "ZERO_RESULTS":
        raise Exception(f"Google Places API error: {data['status']}")
    
    centers = []
    
    for place in data.get("results", []):
        # Extract data from the place result
        center = {
            "name": place["name"],
            "address": place.get("vicinity", ""),
            "latitude": place["geometry"]["location"]["lat"],
            "longitude": place["geometry"]["location"]["lng"],
            "place_id": place["place_id"],
            "rating": place.get("rating", 0),
            "types": place.get("types", [])
        }
        
        centers.append(center)
        
        # Save to database for future use
        try:
            # Check if it already exists
            existing = RecyclingCenter.query.filter_by(
                latitude=center["latitude"],
                longitude=center["longitude"]
            ).first()
            
            if not existing:
                new_center = RecyclingCenter(
                    name=center["name"],
                    address=center["address"],
                    latitude=center["latitude"],
                    longitude=center["longitude"],
                    accepted_types="recyclable,organic,hazardous"  # Default assumption
                )
                db.session.add(new_center)
                db.session.commit()
        except Exception as e:
            logger.error(f"Error saving recycling center to database: {str(e)}")
    
    return centers

def find_centers_from_db(latitude, longitude, radius):
    """
    Find recycling centers from the database
    
    Args:
        latitude (float): Latitude of the location
        longitude (float): Longitude of the location
        radius (float): Search radius in kilometers
        
    Returns:
        list: List of nearby recycling centers
    """
    # Query all centers from database
    all_centers = RecyclingCenter.query.all()
    
    # Filter centers by distance
    nearby_centers = []
    
    for center in all_centers:
        distance = calculate_distance(
            latitude, longitude, 
            center.latitude, center.longitude
        )
        
        if distance <= radius:
            nearby_centers.append({
                "name": center.name,
                "address": center.address,
                "latitude": center.latitude,
                "longitude": center.longitude,
                "phone": center.phone,
                "website": center.website,
                "accepted_types": center.accepted_types,
                "distance": round(distance, 2)
            })
    
    # Sort by distance
    nearby_centers.sort(key=lambda x: x["distance"])
    
    return nearby_centers

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the Haversine distance between two points in kilometers
    
    Args:
        lat1, lon1: Coordinates of the first point
        lat2, lon2: Coordinates of the second point
        
    Returns:
        float: Distance in kilometers
    """
    # Earth radius in kilometers
    R = 6371.0
    
    # Convert degrees to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Differences
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    
    # Haversine formula
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    
    return distance

def seed_sample_centers():
    """
    Seed the database with some initial recycling centers
    Only needed if the database is empty
    """
    # Check if we already have centers
    if RecyclingCenter.query.count() > 0:
        return
        
    # Sample centers in major cities
    centers = [
        {
            "name": "EcoCycle Center",
            "address": "123 Green St, San Francisco, CA",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "phone": "(415) 555-1234",
            "website": "https://www.ecocycle.org",
            "accepted_types": "recyclable,organic,hazardous"
        },
        {
            "name": "NYC Department of Sanitation",
            "address": "125 Worth St, New York, NY",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "phone": "(212) 555-4321",
            "website": "https://www1.nyc.gov/assets/dsny/site/home",
            "accepted_types": "recyclable,hazardous"
        },
        {
            "name": "Chicago Recycling Center",
            "address": "2300 S Throop St, Chicago, IL",
            "latitude": 41.8781,
            "longitude": -87.6298,
            "phone": "(312) 555-6789",
            "website": "https://www.chicago.gov/city/en/depts/streets/supp_info/recycling1.html",
            "accepted_types": "recyclable,organic"
        },
        {
            "name": "LA Sanitation & Environment",
            "address": "1149 S Broadway, Los Angeles, CA",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "phone": "(213) 555-9876",
            "website": "https://www.lacitysan.org",
            "accepted_types": "recyclable,organic,hazardous"
        },
        {
            "name": "Houston Recycling Center",
            "address": "5614 Neches St, Houston, TX",
            "latitude": 29.7604,
            "longitude": -95.3698,
            "phone": "(713) 555-5432",
            "website": "https://www.houstontx.gov/solidwaste/recycling.html",
            "accepted_types": "recyclable,hazardous"
        }
    ]
    
    for center_data in centers:
        center = RecyclingCenter(**center_data)
        db.session.add(center)
    
    db.session.commit()
