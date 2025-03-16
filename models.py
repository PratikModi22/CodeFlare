from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db, login_manager

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    points = db.Column(db.Integer, default=0)
    carbon_saved = db.Column(db.Float, default=0.0)
    date_joined = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    waste_logs = db.relationship('WasteLog', backref='user', lazy='dynamic')
    recycling_activities = db.relationship('RecyclingActivity', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def add_points(self, points):
        self.points += points
        db.session.commit()
    
    def add_carbon_saved(self, amount):
        self.carbon_saved += amount
        db.session.commit()

class WasteType(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    recyclable = db.Column(db.Boolean, default=False)
    carbon_impact = db.Column(db.Float, default=0.0)  # CO2 equivalent per kg
    
    # Relationships
    waste_logs = db.relationship('WasteLog', backref='waste_type', lazy='dynamic')

class WasteLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    waste_type_id = db.Column(db.Integer, db.ForeignKey('waste_type.id'), nullable=False)
    weight = db.Column(db.Float, default=0.0)  # in kg
    image_url = db.Column(db.String(255))
    disposed_properly = db.Column(db.Boolean, default=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def carbon_impact(self):
        return self.weight * self.waste_type.carbon_impact

class RecyclingCenter(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    waste_types = db.Column(db.String(255))  # Comma-separated list of waste types accepted
    operational_hours = db.Column(db.String(255))
    
    # Relationships
    activities = db.relationship('RecyclingActivity', backref='center', lazy='dynamic')

class RecyclingActivity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    center_id = db.Column(db.Integer, db.ForeignKey('recycling_center.id'), nullable=False)
    waste_type = db.Column(db.String(50))
    weight = db.Column(db.Float, default=0.0)  # in kg
    points_earned = db.Column(db.Integer, default=0)
    carbon_saved = db.Column(db.Float, default=0.0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Achievement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    points_required = db.Column(db.Integer, default=0)
    icon = db.Column(db.String(255))
    
    # Define a many-to-many relationship with User
    users = db.relationship('User', secondary='user_achievement', backref=db.backref('achievements', lazy='dynamic'))

# Association table for User and Achievement (many-to-many)
user_achievement = db.Table('user_achievement',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('achievement_id', db.Integer, db.ForeignKey('achievement.id'), primary_key=True),
    db.Column('date_achieved', db.DateTime, default=datetime.utcnow)
)
