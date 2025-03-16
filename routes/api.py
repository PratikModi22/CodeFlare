from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from models import User, WasteRecord, WasteCategory, RecyclingCenter, Badge
from utils.vision_api import classify_waste_image
from utils.maps_api import find_nearby_centers
from utils.carbon_calculator import calculate_carbon_impact
import base64
import uuid
import os
from datetime import datetime
import json

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/classify-waste', methods=['POST'])
@login_required
def classify_waste():
    try:
        # Get image data from request
        data = request.json
        image_data = data.get('image')  # Base64 encoded image
        manual_category_id = data.get('category_id')
        
        if not image_data and not manual_category_id:
            return jsonify({'error': 'No image or category provided'}), 400
        
        # If manual category is provided, use it
        if manual_category_id:
            category = WasteCategory.query.get(manual_category_id)
            if not category:
                return jsonify({'error': 'Invalid category ID'}), 400
            category_id = category.id
            category_name = category.name
        else:
            # Use Vision API to classify the waste
            image_bytes = base64.b64decode(image_data.split(',')[1])
            
            # Call the Vision API
            if current_app.config['GOOGLE_VISION_API_KEY']:
                result = classify_waste_image(image_bytes, current_app.config['GOOGLE_VISION_API_KEY'])
                
                # Map Vision API result to our waste categories
                category_name = result['category']
                category = WasteCategory.query.filter_by(name=category_name).first()
                
                if not category:
                    # Default to Non-recyclable if category not found
                    category = WasteCategory.query.filter_by(name='Non-recyclable').first()
                
                category_id = category.id
            else:
                # If no API key, use a fallback method or return an error
                return jsonify({'error': 'Vision API key not configured'}), 500
        
        # Save record to database
        quantity = data.get('quantity', 1.0)
        disposed_properly = data.get('disposed_properly', True)
        lat = data.get('latitude')
        lng = data.get('longitude')
        
        # Calculate points and carbon impact
        points_earned = 10 if disposed_properly else 0
        if category.recyclable and disposed_properly:
            points_earned += 15
        
        carbon_impact = calculate_carbon_impact(category_id, quantity, disposed_properly)
        
        # Generate a unique filename and save the image if provided
        image_url = None
        if image_data:
            filename = f"{uuid.uuid4().hex}.jpg"
            # In a real app, you'd save the image to a cloud storage service
            # For now, let's just generate a URL
            image_url = f"/static/uploads/{filename}"
        
        # Create waste record
        waste_record = WasteRecord(
            user_id=current_user.id,
            category_id=category_id,
            quantity=quantity,
            disposed_properly=disposed_properly,
            image_url=image_url,
            location_lat=lat,
            location_lng=lng,
            points_earned=points_earned,
            carbon_impact=carbon_impact
        )
        
        db.session.add(waste_record)
        
        # Update user's points and carbon saved
        current_user.points += points_earned
        current_user.carbon_saved += carbon_impact
        
        # Check for new badges
        available_badges = Badge.query.filter(Badge.points_required <= current_user.points).all()
        for badge in available_badges:
            if badge not in current_user.badges:
                current_user.badges.append(badge)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'category': category_name,
            'recyclable': category.recyclable,
            'points_earned': points_earned,
            'carbon_impact': carbon_impact,
            'total_points': current_user.points,
            'total_carbon_saved': current_user.carbon_saved
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/nearby-centers', methods=['GET'])
@login_required
def nearby_centers():
    try:
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if not lat or not lng:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        # Use Google Maps API to find nearby recycling centers
        if current_app.config['GOOGLE_MAPS_API_KEY']:
            centers = find_nearby_centers(lat, lng, current_app.config['GOOGLE_MAPS_API_KEY'])
        else:
            # Fallback to database centers if API key not available
            centers = RecyclingCenter.query.all()
            centers = [
                {
                    'id': center.id,
                    'name': center.name,
                    'address': center.address,
                    'lat': center.latitude,
                    'lng': center.longitude,
                    'accepted_waste': center.accepted_waste,
                    'distance': 0  # Would calculate distance if we had API
                }
                for center in centers
            ]
        
        return jsonify({
            'success': True,
            'centers': centers
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/user-stats', methods=['GET'])
@login_required
def user_stats():
    try:
        user_records = WasteRecord.query.filter_by(user_id=current_user.id).all()
        
        stats = {
            'total_waste': sum(record.quantity for record in user_records),
            'recyclable_waste': sum(record.quantity for record in user_records if record.category.recyclable),
            'total_points': current_user.points,
            'carbon_saved': current_user.carbon_saved,
            'badge_count': current_user.badges.count(),
            'record_count': len(user_records)
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/add-recycling-center', methods=['POST'])
@login_required
def add_recycling_center():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['name', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create new recycling center
        center = RecyclingCenter(
            name=data['name'],
            address=data.get('address', ''),
            latitude=data['latitude'],
            longitude=data['longitude'],
            phone=data.get('phone', ''),
            website=data.get('website', ''),
            description=data.get('description', ''),
            accepted_waste=','.join(map(str, data.get('accepted_waste', []))),
            opening_hours=json.dumps(data.get('opening_hours', {}))
        )
        
        db.session.add(center)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'center_id': center.id
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
