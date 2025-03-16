import os
import json
import logging
from datetime import datetime
from flask import render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.utils import secure_filename
from app import app, db
from models import User, WasteEntry, EcoActivity, RecyclingCenter
from utils.waste_classifier import classify_waste_image
from utils.maps_helper import find_nearby_centers
from utils.carbon_calculator import calculate_carbon_savings

logger = logging.getLogger(__name__)

# Home route
@app.route('/')
def index():
    sdg_info = {
        "sdg11": "Sustainable Cities and Communities",
        "sdg12": "Responsible Consumption and Production",
        "sdg13": "Climate Action"
    }
    
    stats = {
        "users": User.query.count(),
        "waste_entries": WasteEntry.query.count(),
        "total_carbon_saved": db.session.query(db.func.sum(WasteEntry.carbon_saved)).scalar() or 0
    }
    
    return render_template('index.html', sdg_info=sdg_info, stats=stats)

# Authentication routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user is None or not user.check_password(password):
            flash('Invalid username or password', 'danger')
            return redirect(url_for('login'))
        
        login_user(user, remember=True)
        next_page = request.args.get('next')
        
        flash('Login successful!', 'success')
        return redirect(next_page or url_for('index'))
    
    return render_template('auth/login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        if User.query.filter_by(username=username).first():
            flash('Username already exists', 'danger')
            return redirect(url_for('register'))
        
        if User.query.filter_by(email=email).first():
            flash('Email already registered', 'danger')
            return redirect(url_for('register'))
        
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('auth/register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

# Waste Classification Routes
@app.route('/classify', methods=['GET'])
@login_required
def classify_page():
    return render_template('classify.html', google_maps_api_key=app.config["GOOGLE_MAPS_API_KEY"])

@app.route('/api/classify', methods=['POST'])
@login_required
def classify_waste():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400
    
    try:
        # Process image for classification
        waste_type, confidence = classify_waste_image(file)
        
        # Get location data if provided
        latitude = request.form.get('latitude', type=float)
        longitude = request.form.get('longitude', type=float)
        location_name = request.form.get('location_name', '')
        
        # Get estimated weight if provided
        weight = request.form.get('weight', type=float, default=0.5)
        
        # Calculate carbon savings
        carbon_saved = calculate_carbon_savings(waste_type, weight)
        
        # Save the waste entry
        waste_entry = WasteEntry(
            user_id=current_user.id,
            waste_type=waste_type,
            weight=weight,
            carbon_saved=carbon_saved,
            latitude=latitude,
            longitude=longitude,
            location_name=location_name
        )
        
        db.session.add(waste_entry)
        
        # Award points to the user
        points_earned = 10 if waste_type == 'recyclable' else 5
        current_user.add_points(points_earned)
        
        # Record the activity
        activity = EcoActivity(
            user_id=current_user.id,
            activity_type="waste_classification",
            points_earned=points_earned,
            carbon_saved=carbon_saved,
            details=json.dumps({
                "waste_type": waste_type,
                "weight": weight,
                "confidence": confidence
            })
        )
        db.session.add(activity)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'waste_type': waste_type,
            'confidence': confidence,
            'carbon_saved': carbon_saved,
            'points_earned': points_earned,
            'message': f'Successfully classified as {waste_type} waste!'
        })
        
    except Exception as e:
        logger.error(f"Error in classification: {e}")
        return jsonify({'error': str(e)}), 500

# Waste Map Routes
@app.route('/map')
def waste_map():
    # Get all recycling centers
    centers = RecyclingCenter.query.all()
    
    # Convert centers to GeoJSON format
    geojson_centers = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature", 
                "properties": {
                    "id": center.id,
                    "name": center.name,
                    "address": center.address,
                    "phone": center.phone,
                    "website": center.website,
                    "accepted_types": center.accepted_types
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [center.longitude, center.latitude]
                }
            } for center in centers
        ]
    }
    
    return render_template('map.html', 
                          centers=json.dumps(geojson_centers),
                          google_maps_api_key=app.config["GOOGLE_MAPS_API_KEY"])

@app.route('/api/centers')
def get_centers():
    # Get latitude and longitude from request
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    radius = request.args.get('radius', default=10, type=float)  # km
    
    if not lat or not lng:
        return jsonify({"error": "Latitude and longitude required"}), 400
    
    try:
        # Use helper function to find nearby centers
        centers = find_nearby_centers(lat, lng, radius)
        return jsonify(centers)
    except Exception as e:
        logger.error(f"Error finding centers: {e}")
        return jsonify({"error": str(e)}), 500

# Dashboard Routes
@app.route('/dashboard')
@login_required
def dashboard():
    # Get user's waste statistics
    user_stats = {
        "total_entries": WasteEntry.query.filter_by(user_id=current_user.id).count(),
        "total_weight": db.session.query(db.func.sum(WasteEntry.weight)).filter_by(user_id=current_user.id).scalar() or 0,
        "total_carbon_saved": db.session.query(db.func.sum(WasteEntry.carbon_saved)).filter_by(user_id=current_user.id).scalar() or 0,
        "points": current_user.points,
        "level": current_user.level
    }
    
    # Get waste type distribution
    waste_types = db.session.query(
        WasteEntry.waste_type, 
        db.func.count(WasteEntry.id)
    ).filter_by(user_id=current_user.id).group_by(WasteEntry.waste_type).all()
    
    waste_distribution = {waste_type: count for waste_type, count in waste_types}
    
    # Get recent entries
    recent_entries = WasteEntry.query.filter_by(user_id=current_user.id).order_by(WasteEntry.timestamp.desc()).limit(5).all()
    
    # Get community stats
    community_stats = {
        "total_users": User.query.count(),
        "total_waste_entries": WasteEntry.query.count(),
        "total_carbon_saved": db.session.query(db.func.sum(WasteEntry.carbon_saved)).scalar() or 0
    }
    
    # Get leaderboard
    leaderboard = User.query.order_by(User.points.desc()).limit(10).all()
    
    return render_template('dashboard.html', 
                          user_stats=user_stats,
                          waste_distribution=waste_distribution,
                          recent_entries=recent_entries,
                          community_stats=community_stats,
                          leaderboard=leaderboard)

@app.route('/api/user/stats')
@login_required
def get_user_stats():
    # Get monthly waste statistics for current user
    monthly_stats = db.session.query(
        db.func.strftime('%Y-%m', WasteEntry.timestamp).label('month'),
        db.func.sum(WasteEntry.weight).label('weight'),
        db.func.sum(WasteEntry.carbon_saved).label('carbon_saved')
    ).filter_by(user_id=current_user.id)\
     .group_by('month')\
     .order_by('month')\
     .all()
    
    result = {
        'labels': [m[0] for m in monthly_stats],
        'weights': [float(m[1]) if m[1] else 0 for m in monthly_stats],
        'carbon_saved': [float(m[2]) if m[2] else 0 for m in monthly_stats]
    }
    
    return jsonify(result)

# User Profile Route
@app.route('/profile')
@login_required
def profile():
    # Get user's activity history
    activities = EcoActivity.query.filter_by(user_id=current_user.id).order_by(EcoActivity.timestamp.desc()).limit(20).all()
    
    # Calculate progress to next level
    next_level_points = current_user.level * 100
    progress_percentage = (current_user.points / next_level_points) * 100
    
    # Get badges (placeholder for now)
    badges = [
        {"name": "Recycling Novice", "earned": True, "icon": "award"},
        {"name": "Waste Warrior", "earned": current_user.level >= 2, "icon": "shield"},
        {"name": "Carbon Saver", "earned": db.session.query(db.func.sum(WasteEntry.carbon_saved)).filter_by(user_id=current_user.id).scalar() > 10, "icon": "leaf"},
        {"name": "SDG Champion", "earned": current_user.level >= 5, "icon": "globe"}
    ]
    
    return render_template('profile.html', 
                          user=current_user,
                          activities=activities,
                          progress_percentage=progress_percentage,
                          next_level_points=next_level_points,
                          badges=badges)

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500
