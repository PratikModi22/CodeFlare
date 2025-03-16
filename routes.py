import os
import logging
import json
import base64
from datetime import datetime, timedelta
from io import BytesIO
from flask import render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.utils import secure_filename
from app import app, db
from models import User, WasteType, WasteLog, RecyclingCenter, RecyclingActivity, Achievement
from utils import classify_waste_image, get_nearby_recycling_centers, calculate_carbon_savings

# Home page
@app.route('/')
def index():
    waste_types = WasteType.query.all()
    achievements = Achievement.query.order_by(Achievement.points_required).limit(5).all()
    
    # Get statistics for the dashboard
    if current_user.is_authenticated:
        user_waste_logs = WasteLog.query.filter_by(user_id=current_user.id).count()
        total_carbon_saved = current_user.carbon_saved
        recent_activities = RecyclingActivity.query.filter_by(user_id=current_user.id).order_by(RecyclingActivity.timestamp.desc()).limit(5).all()
        user_points = current_user.points
    else:
        user_waste_logs = 0
        total_carbon_saved = 0
        recent_activities = []
        user_points = 0
        
    # Get global statistics
    total_users = User.query.count()
    total_waste_logs = WasteLog.query.count()
    total_carbon_saved_global = db.session.query(db.func.sum(User.carbon_saved)).scalar() or 0
    
    return render_template('index.html', 
                          waste_types=waste_types,
                          achievements=achievements, 
                          user_waste_logs=user_waste_logs,
                          total_carbon_saved=total_carbon_saved,
                          recent_activities=recent_activities,
                          user_points=user_points,
                          total_users=total_users,
                          total_waste_logs=total_waste_logs,
                          total_carbon_saved_global=total_carbon_saved_global)

# Authentication routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            login_user(user, remember=True)
            next_page = request.args.get('next')
            flash('Login successful!', 'success')
            return redirect(next_page or url_for('index'))
        else:
            flash('Invalid email or password', 'danger')
            
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Form validation
        if password != confirm_password:
            flash('Passwords do not match', 'danger')
            return render_template('register.html')
            
        if User.query.filter_by(username=username).first():
            flash('Username already exists', 'danger')
            return render_template('register.html')
            
        if User.query.filter_by(email=email).first():
            flash('Email already exists', 'danger')
            return render_template('register.html')
        
        # Create new user
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('login'))
        
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# Waste Classification
@app.route('/waste-classification', methods=['GET'])
@login_required
def waste_classification():
    waste_types = WasteType.query.all()
    return render_template('waste_classification.html', waste_types=waste_types)

@app.route('/api/classify-waste', methods=['POST'])
@login_required
def api_classify_waste():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
        
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400
        
    try:
        image_data = file.read()
        waste_type, confidence = classify_waste_image(image_data, app.config["GOOGLE_VISION_API_KEY"])
        
        # Get waste type from database or create if not exists
        waste_type_obj = WasteType.query.filter_by(name=waste_type).first()
        if not waste_type_obj:
            # Default values based on typical waste categories
            recyclable = waste_type.lower() in ['plastic', 'paper', 'glass', 'metal', 'cardboard']
            carbon_impact = 2.0  # Default CO2 equivalent per kg
            
            if waste_type.lower() == 'plastic':
                carbon_impact = 6.0
            elif waste_type.lower() == 'paper':
                carbon_impact = 1.5
            elif waste_type.lower() == 'glass':
                carbon_impact = 0.8
            elif waste_type.lower() == 'metal':
                carbon_impact = 4.0
            elif waste_type.lower() == 'organic':
                recyclable = True
                carbon_impact = 0.5
            
            waste_type_obj = WasteType(
                name=waste_type,
                description=f"{waste_type} waste",
                recyclable=recyclable,
                carbon_impact=carbon_impact
            )
            db.session.add(waste_type_obj)
            db.session.commit()
        
        # Create a waste log entry
        waste_log = WasteLog(
            user_id=current_user.id,
            waste_type_id=waste_type_obj.id,
            weight=0.5,  # Default weight in kg
            disposed_properly=True
        )
        db.session.add(waste_log)
        
        # Award points to the user for classification
        points_earned = 10
        current_user.add_points(points_earned)
        
        # Calculate carbon savings
        carbon_saved = calculate_carbon_savings(waste_type_obj, 0.5)
        current_user.add_carbon_saved(carbon_saved)
        
        db.session.commit()
        
        return jsonify({
            'waste_type': waste_type,
            'confidence': confidence,
            'recyclable': waste_type_obj.recyclable,
            'points_earned': points_earned,
            'carbon_saved': carbon_saved
        })
        
    except Exception as e:
        logging.error(f"Error classifying waste: {str(e)}")
        return jsonify({'error': 'Failed to classify waste image'}), 500

# Waste Map
@app.route('/waste-map')
@login_required
def waste_map():
    centers = RecyclingCenter.query.all()
    return render_template('waste_map.html', 
                          centers=centers, 
                          google_maps_api_key=app.config["GOOGLE_MAPS_API_KEY"])

@app.route('/api/recycling-centers', methods=['GET'])
def api_recycling_centers():
    try:
        lat = float(request.args.get('lat', 0))
        lng = float(request.args.get('lng', 0))
        radius = float(request.args.get('radius', 10))  # km
        
        # Get centers from database
        centers = RecyclingCenter.query.all()
        
        # If we have lat/lng, filter centers by distance
        if lat != 0 and lng != 0:
            nearby_centers = get_nearby_recycling_centers(lat, lng, radius, app.config["GOOGLE_MAPS_API_KEY"])
            
            # Add any new centers to the database
            for center in nearby_centers:
                if not RecyclingCenter.query.filter_by(name=center['name']).first():
                    new_center = RecyclingCenter(
                        name=center['name'],
                        address=center['address'],
                        latitude=center['latitude'],
                        longitude=center['longitude'],
                        description=center.get('description', ''),
                        waste_types=center.get('waste_types', 'General Recycling'),
                        operational_hours=center.get('hours', 'Not available')
                    )
                    db.session.add(new_center)
            
            db.session.commit()
            
            # Re-query to get all centers including the new ones
            centers = RecyclingCenter.query.all()
        
        return jsonify([{
            'id': center.id,
            'name': center.name,
            'address': center.address,
            'latitude': center.latitude,
            'longitude': center.longitude,
            'description': center.description,
            'waste_types': center.waste_types,
            'operational_hours': center.operational_hours
        } for center in centers])
        
    except Exception as e:
        logging.error(f"Error fetching recycling centers: {str(e)}")
        return jsonify({'error': 'Failed to fetch recycling centers'}), 500

@app.route('/api/log-recycling', methods=['POST'])
@login_required
def api_log_recycling():
    try:
        data = request.json
        center_id = data.get('center_id')
        waste_type = data.get('waste_type')
        weight = float(data.get('weight', 1.0))
        
        # Validate data
        if not center_id or not waste_type:
            return jsonify({'error': 'Missing required fields'}), 400
            
        center = RecyclingCenter.query.get(center_id)
        if not center:
            return jsonify({'error': 'Recycling center not found'}), 404
            
        # Calculate points and carbon savings
        points_earned = int(weight * 20)  # 20 points per kg
        
        waste_type_obj = WasteType.query.filter_by(name=waste_type).first()
        if not waste_type_obj:
            waste_type_obj = WasteType(
                name=waste_type,
                recyclable=True,
                carbon_impact=2.0  # Default impact
            )
            db.session.add(waste_type_obj)
            db.session.commit()
            
        carbon_saved = calculate_carbon_savings(waste_type_obj, weight)
            
        # Create recycling activity record
        activity = RecyclingActivity(
            user_id=current_user.id,
            center_id=center_id,
            waste_type=waste_type,
            weight=weight,
            points_earned=points_earned,
            carbon_saved=carbon_saved
        )
        db.session.add(activity)
        
        # Update user points and carbon saved
        current_user.add_points(points_earned)
        current_user.add_carbon_saved(carbon_saved)
        
        db.session.commit()
        
        # Check for achievements
        total_points = current_user.points
        total_carbon = current_user.carbon_saved
        
        achievements = []
        
        # Recycling milestones
        if total_points >= 100 and not current_user.achievements.filter_by(name="Recycling Beginner").first():
            achievement = Achievement.query.filter_by(name="Recycling Beginner").first()
            if not achievement:
                achievement = Achievement(
                    name="Recycling Beginner",
                    description="Earn 100 points through recycling activities",
                    points_required=100,
                    icon="fa-seedling"
                )
                db.session.add(achievement)
                db.session.commit()
            current_user.achievements.append(achievement)
            achievements.append(achievement.name)
            
        if total_points >= 500 and not current_user.achievements.filter_by(name="Recycling Enthusiast").first():
            achievement = Achievement.query.filter_by(name="Recycling Enthusiast").first()
            if not achievement:
                achievement = Achievement(
                    name="Recycling Enthusiast",
                    description="Earn 500 points through recycling activities",
                    points_required=500,
                    icon="fa-tree"
                )
                db.session.add(achievement)
                db.session.commit()
            current_user.achievements.append(achievement)
            achievements.append(achievement.name)
            
        if total_carbon >= 50 and not current_user.achievements.filter_by(name="Climate Guardian").first():
            achievement = Achievement.query.filter_by(name="Climate Guardian").first()
            if not achievement:
                achievement = Achievement(
                    name="Climate Guardian",
                    description="Save 50kg of CO2 through proper waste disposal",
                    points_required=0,
                    icon="fa-globe-americas"
                )
                db.session.add(achievement)
                db.session.commit()
            current_user.achievements.append(achievement)
            achievements.append(achievement.name)
            
        db.session.commit()
        
        return jsonify({
            'success': True,
            'points_earned': points_earned,
            'carbon_saved': carbon_saved,
            'new_achievements': achievements
        })
        
    except Exception as e:
        logging.error(f"Error logging recycling: {str(e)}")
        return jsonify({'error': 'Failed to log recycling activity'}), 500

# Analytics Dashboard
@app.route('/analytics')
@login_required
def analytics():
    # User stats
    user_waste_logs = WasteLog.query.filter_by(user_id=current_user.id).all()
    user_recycling = RecyclingActivity.query.filter_by(user_id=current_user.id).all()
    
    # Calculate waste type distribution
    waste_types = {}
    for log in user_waste_logs:
        waste_type = log.waste_type.name
        if waste_type in waste_types:
            waste_types[waste_type] += 1
        else:
            waste_types[waste_type] = 1
            
    # Calculate carbon savings over time
    carbon_data = []
    now = datetime.utcnow()
    for i in range(7):
        date = now - timedelta(days=i)
        date_start = datetime(date.year, date.month, date.day, 0, 0, 0)
        date_end = datetime(date.year, date.month, date.day, 23, 59, 59)
        
        logs = WasteLog.query.filter(
            WasteLog.user_id == current_user.id,
            WasteLog.timestamp >= date_start,
            WasteLog.timestamp <= date_end
        ).all()
        
        activities = RecyclingActivity.query.filter(
            RecyclingActivity.user_id == current_user.id,
            RecyclingActivity.timestamp >= date_start,
            RecyclingActivity.timestamp <= date_end
        ).all()
        
        daily_carbon = sum([log.carbon_impact() for log in logs]) + sum([act.carbon_saved for act in activities])
        carbon_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'carbon_saved': daily_carbon
        })
    
    # Get leaderboard data
    leaderboard = User.query.order_by(User.points.desc()).limit(10).all()
    
    return render_template('analytics.html', 
                          waste_types=waste_types, 
                          carbon_data=carbon_data,
                          leaderboard=leaderboard,
                          user_waste_logs=len(user_waste_logs),
                          user_recycling=len(user_recycling),
                          total_points=current_user.points,
                          total_carbon_saved=current_user.carbon_saved)

# User Profile
@app.route('/profile')
@login_required
def profile():
    user_achievements = current_user.achievements.all()
    all_achievements = Achievement.query.all()
    
    # Get recent activities
    recent_logs = WasteLog.query.filter_by(user_id=current_user.id).order_by(WasteLog.timestamp.desc()).limit(5).all()
    recent_recycling = RecyclingActivity.query.filter_by(user_id=current_user.id).order_by(RecyclingActivity.timestamp.desc()).limit(5).all()
    
    return render_template('profile.html', 
                          user=current_user,
                          user_achievements=user_achievements,
                          all_achievements=all_achievements,
                          recent_logs=recent_logs,
                          recent_recycling=recent_recycling)

# Carbon Tracker
@app.route('/carbon-tracker')
@login_required
def carbon_tracker():
    # Get user's carbon savings
    total_carbon_saved = current_user.carbon_saved
    
    # Calculate equivalent impact
    trees_saved = total_carbon_saved / 21  # Approx. 21kg CO2 per tree per year
    car_km_saved = total_carbon_saved / 0.12  # Approx. 0.12kg CO2 per km
    
    # Get monthly carbon data
    now = datetime.utcnow()
    monthly_data = []
    
    for i in range(6):
        month_date = now - timedelta(days=30*i)
        month_start = datetime(month_date.year, month_date.month, 1)
        if month_date.month == 12:
            month_end = datetime(month_date.year + 1, 1, 1) - timedelta(seconds=1)
        else:
            month_end = datetime(month_date.year, month_date.month + 1, 1) - timedelta(seconds=1)
        
        # Get waste logs for this month
        logs = WasteLog.query.filter(
            WasteLog.user_id == current_user.id,
            WasteLog.timestamp >= month_start,
            WasteLog.timestamp <= month_end
        ).all()
        
        # Get recycling activities for this month
        activities = RecyclingActivity.query.filter(
            RecyclingActivity.user_id == current_user.id,
            RecyclingActivity.timestamp >= month_start,
            RecyclingActivity.timestamp <= month_end
        ).all()
        
        # Calculate carbon saved
        carbon_from_logs = sum([log.carbon_impact() for log in logs])
        carbon_from_activities = sum([act.carbon_saved for act in activities])
        
        monthly_data.append({
            'month': month_date.strftime('%B %Y'),
            'carbon_saved': carbon_from_logs + carbon_from_activities
        })
    
    return render_template('carbon_tracker.html',
                          total_carbon_saved=total_carbon_saved,
                          trees_saved=trees_saved,
                          car_km_saved=car_km_saved,
                          monthly_data=monthly_data)

# Sustainable Goals Information
@app.route('/sustainable-goals')
def sustainable_goals():
    return render_template('sustainable_goals.html')

# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500
