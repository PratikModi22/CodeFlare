from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app, jsonify
from flask_login import login_required, current_user
from app import db
from models import User, WasteRecord, WasteCategory, RecyclingCenter, Badge, init_waste_categories, init_badges
from utils.vision_api import classify_waste_image
from utils.carbon_calculator import calculate_carbon_impact
from datetime import datetime
import os
import base64
import uuid

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    # Initialize default data if database is empty
    with current_app.app_context():
        if WasteCategory.query.count() == 0:
            init_waste_categories()
        if Badge.query.count() == 0:
            init_badges()
    
    sdg_info = {
        'sdg11': {
            'title': 'Sustainable Cities and Communities',
            'description': 'Make cities inclusive, safe, resilient and sustainable'
        },
        'sdg12': {
            'title': 'Responsible Consumption and Production',
            'description': 'Ensure sustainable consumption and production patterns'
        },
        'sdg13': {
            'title': 'Climate Action',
            'description': 'Take urgent action to combat climate change and its impacts'
        }
    }
    
    return render_template('index.html', sdg_info=sdg_info)

@main_bp.route('/classify', methods=['GET'])
@login_required
def classify_waste_page():
    categories = WasteCategory.query.all()
    return render_template('classify.html', categories=categories, google_api_key=current_app.config['GOOGLE_VISION_API_KEY'])

@main_bp.route('/map')
@login_required
def waste_map():
    centers = RecyclingCenter.query.all()
    return render_template('map.html', centers=centers, google_maps_api_key=current_app.config['GOOGLE_MAPS_API_KEY'])

@main_bp.route('/analytics')
@login_required
def analytics():
    # Get user's waste records
    user_records = WasteRecord.query.filter_by(user_id=current_user.id).all()
    
    # Prepare data for charts
    waste_by_category = {}
    carbon_impact_over_time = []
    points_over_time = []
    
    for record in user_records:
        # Waste by category
        category_name = record.category.name
        if category_name in waste_by_category:
            waste_by_category[category_name] += record.quantity
        else:
            waste_by_category[category_name] = record.quantity
        
        # Carbon impact over time
        carbon_impact_over_time.append({
            'date': record.timestamp.strftime('%Y-%m-%d'),
            'impact': record.carbon_impact
        })
        
        # Points over time
        points_over_time.append({
            'date': record.timestamp.strftime('%Y-%m-%d'),
            'points': record.points_earned
        })
    
    # Get user's badges
    user_badges = current_user.badges.all()
    
    return render_template('analytics.html', 
                           waste_by_category=waste_by_category,
                           carbon_impact_over_time=carbon_impact_over_time,
                           points_over_time=points_over_time,
                           user_badges=user_badges,
                           total_points=current_user.points,
                           total_carbon_saved=current_user.carbon_saved)
