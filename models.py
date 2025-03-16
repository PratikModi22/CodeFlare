from app import db
from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    points = db.Column(db.Integer, default=0)
    carbon_saved = db.Column(db.Float, default=0.0)  # in kg CO2
    
    # Relations
    waste_records = db.relationship('WasteRecord', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class WasteCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    description = db.Column(db.Text)
    recyclable = db.Column(db.Boolean, default=False)
    carbon_factor = db.Column(db.Float, default=0.0)  # carbon impact per kg
    
    # Relations
    waste_records = db.relationship('WasteRecord', backref='category', lazy=True)

class WasteRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('waste_category.id'), nullable=False)
    quantity = db.Column(db.Float, default=1.0)  # in kg
    disposed_properly = db.Column(db.Boolean, default=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    image_url = db.Column(db.String(256))
    location_lat = db.Column(db.Float)
    location_lng = db.Column(db.Float)
    points_earned = db.Column(db.Integer, default=0)
    carbon_impact = db.Column(db.Float, default=0.0)  # in kg CO2

class RecyclingCenter(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    address = db.Column(db.String(256))
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    phone = db.Column(db.String(20))
    website = db.Column(db.String(128))
    description = db.Column(db.Text)
    
    # Accepted waste types (comma-separated list of category IDs)
    accepted_waste = db.Column(db.String(256))
    
    # Opening hours (JSON string)
    opening_hours = db.Column(db.Text)

class Badge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(256))
    points_required = db.Column(db.Integer, default=0)
    
    # Many-to-many relationship with users
    users = db.relationship('User', secondary='user_badges', backref=db.backref('badges', lazy='dynamic'))

# Association table for User and Badge (many-to-many)
user_badges = db.Table('user_badges',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('badge_id', db.Integer, db.ForeignKey('badge.id'), primary_key=True),
    db.Column('earned_date', db.DateTime, default=datetime.utcnow)
)

# Initialize default waste categories
def init_waste_categories():
    categories = [
        {'name': 'Plastic', 'recyclable': True, 'carbon_factor': 6.0, 
         'description': 'Includes bottles, containers, bags, and packaging.'},
        {'name': 'Paper', 'recyclable': True, 'carbon_factor': 1.5, 
         'description': 'Includes newspapers, magazines, office paper, and cardboard.'},
        {'name': 'Glass', 'recyclable': True, 'carbon_factor': 0.9, 
         'description': 'Includes bottles, jars, and containers.'},
        {'name': 'Metal', 'recyclable': True, 'carbon_factor': 4.0, 
         'description': 'Includes cans, aluminum foil, and scrap metal.'},
        {'name': 'Organic', 'recyclable': True, 'carbon_factor': 0.8, 
         'description': 'Includes food waste, garden waste, and compostable materials.'},
        {'name': 'Electronic', 'recyclable': True, 'carbon_factor': 20.0, 
         'description': 'Includes devices, batteries, and electrical components.'},
        {'name': 'Hazardous', 'recyclable': False, 'carbon_factor': 30.0, 
         'description': 'Includes chemicals, medical waste, and toxic materials.'},
        {'name': 'Non-recyclable', 'recyclable': False, 'carbon_factor': 2.5, 
         'description': 'General waste that cannot be recycled.'}
    ]
    
    for category_data in categories:
        category = WasteCategory.query.filter_by(name=category_data['name']).first()
        if not category:
            category = WasteCategory(**category_data)
            db.session.add(category)
    
    db.session.commit()

# Initialize badges
def init_badges():
    badges = [
        {'name': 'Beginner Recycler', 'points_required': 100, 
         'description': 'Started your journey towards sustainable waste management.'},
        {'name': 'Waste Warrior', 'points_required': 500, 
         'description': 'Consistently practicing proper waste disposal.'},
        {'name': 'Eco Champion', 'points_required': 1000, 
         'description': 'Making a significant positive impact on the environment.'},
        {'name': 'Sustainability Expert', 'points_required': 2500, 
         'description': 'Leading by example in sustainable waste practices.'},
        {'name': 'Planet Protector', 'points_required': 5000, 
         'description': 'Your efforts have saved significant carbon emissions.'}
    ]
    
    for badge_data in badges:
        badge = Badge.query.filter_by(name=badge_data['name']).first()
        if not badge:
            badge = Badge(**badge_data)
            db.session.add(badge)
    
    db.session.commit()
