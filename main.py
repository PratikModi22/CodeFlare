import os
import logging
from flask import Flask, render_template, flash, redirect, url_for, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET") or "devkey-not-for-production"

# Configure SQLAlchemy
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///waste_management.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Define models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    points = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    waste_entries = db.relationship('WasteEntry', backref='user', lazy='dynamic')
    activities = db.relationship('EcoActivity', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def add_points(self, points):
        self.points += points
        # Check for level up (every 100 points)
        if self.points >= self.level * 100:
            self.level += 1
        db.session.commit()

class WasteEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    image_url = db.Column(db.String(256))
    waste_type = db.Column(db.String(64), nullable=False)
    weight = db.Column(db.Float)  # in kg
    carbon_saved = db.Column(db.Float)  # in kg CO2
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Location data
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    location_name = db.Column(db.String(128))

class EcoActivity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    activity_type = db.Column(db.String(64), nullable=False)
    points_earned = db.Column(db.Integer, default=0)
    carbon_saved = db.Column(db.Float)  # in kg CO2
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Additional details in JSON format
    details = db.Column(db.Text)  # JSON string

class RecyclingCenter(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    address = db.Column(db.String(256))
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    phone = db.Column(db.String(20))
    website = db.Column(db.String(128))
    
    # Accepted waste types (comma-separated string)
    accepted_types = db.Column(db.String(256))
    
    # Operating hours (JSON string)
    hours = db.Column(db.Text)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

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
    return render_template('classify.html')

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
    
    return render_template('map.html', centers=geojson_centers)

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

# Initialize database
with app.app_context():
    db.create_all()
    logger.info("Database tables created")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
