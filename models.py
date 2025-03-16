from datetime import datetime
from app import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    points = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    
    # Relationships
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
