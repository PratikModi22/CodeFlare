from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app, jsonify
from flask_login import login_required, current_user
from app import db
from models import User, WasteEntry, RecyclingCenter
from utils.waste_classifier import classify_waste_image
from utils.carbon_calculator import calculate_carbon_savings
from datetime import datetime
import os
import base64
import uuid

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    # Initialize default data if database is empty
    with current_app.app_context():
        # No initialization needed for now
        pass
    
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
    # We don't have categories in our current model
    return render_template('classify.html', google_api_key=current_app.config['GOOGLE_VISION_API_KEY'])

@main_bp.route('/map')
@login_required
def waste_map():
    centers = RecyclingCenter.query.all()
    return render_template('map.html', centers=centers, google_maps_api_key=current_app.config['GOOGLE_MAPS_API_KEY'])

@main_bp.route('/dashboard')
@login_required
def dashboard():
    # Get user's waste entries
    user_entries = WasteEntry.query.filter_by(user_id=current_user.id).all()
    
    # Prepare data for charts
    waste_by_type = {}
    carbon_saved_over_time = []
    
    for entry in user_entries:
        # Waste by type
        waste_type = entry.waste_type
        if waste_type in waste_by_type:
            waste_by_type[waste_type] += entry.weight
        else:
            waste_by_type[waste_type] = entry.weight
        
        # Carbon saved over time
        carbon_saved_over_time.append({
            'date': entry.timestamp.strftime('%Y-%m-%d'),
            'carbon_saved': entry.carbon_saved
        })
    
    user_stats = {
        "total_entries": len(user_entries),
        "total_carbon_saved": sum(entry.carbon_saved for entry in user_entries),
        "points": current_user.points,
        "level": current_user.level
    }
    
    return render_template('dashboard.html', 
                           user_stats=user_stats,
                           waste_by_type=waste_by_type,
                           carbon_saved_over_time=carbon_saved_over_time)
