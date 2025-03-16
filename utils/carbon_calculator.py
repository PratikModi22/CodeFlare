import math
import logging

logger = logging.getLogger(__name__)

# Carbon emissions saved per kg of waste diverted from landfill
# Values are in kg CO2e (carbon dioxide equivalent) per kg of waste
CARBON_SAVINGS = {
    'recyclable': {
        'plastic': 2.5,      # Average for plastic
        'paper': 1.1,        # Paper/cardboard
        'glass': 0.3,        # Glass
        'metal': 4.0,        # Aluminum/metal
        'general': 1.5       # General recyclable
    },
    'organic': {
        'food': 0.8,         # Food waste when composted
        'garden': 0.5,       # Garden waste when composted
        'general': 0.6       # General organic waste
    },
    'hazardous': {
        'battery': 12.0,     # Batteries
        'electronic': 20.0,  # E-waste
        'general': 5.0       # General hazardous waste
    },
    'non-recyclable': 0.0    # No carbon saved for non-recyclable waste
}

def calculate_carbon_savings(waste_type, weight=1.0, specific_type=None):
    """
    Calculate the carbon emissions saved by proper waste disposal
    
    Args:
        waste_type (str): Type of waste (recyclable, organic, hazardous, non-recyclable)
        weight (float): Weight of waste in kg
        specific_type (str, optional): Specific subtype of waste
        
    Returns:
        float: Carbon savings in kg CO2e
    """
    try:
        if waste_type == 'non-recyclable':
            return 0.0
            
        if waste_type not in CARBON_SAVINGS:
            logger.warning(f"Unknown waste type: {waste_type}")
            return 0.0
            
        if isinstance(CARBON_SAVINGS[waste_type], dict):
            # If we have a specific type and it's in our dictionary
            if specific_type and specific_type in CARBON_SAVINGS[waste_type]:
                carbon_factor = CARBON_SAVINGS[waste_type][specific_type]
            else:
                # Use the general factor for this waste type
                carbon_factor = CARBON_SAVINGS[waste_type]['general']
        else:
            carbon_factor = CARBON_SAVINGS[waste_type]
            
        # Calculate savings
        savings = weight * carbon_factor
        
        return round(savings, 2)
        
    except Exception as e:
        logger.error(f"Error calculating carbon savings: {str(e)}")
        return 0.0

def get_carbon_equivalents(carbon_saved):
    """
    Get real-world equivalents for carbon savings
    
    Args:
        carbon_saved (float): Carbon saved in kg CO2e
        
    Returns:
        dict: Equivalents in various real-world terms
    """
    try:
        equivalents = {
            'driving': round(carbon_saved / 0.2, 1),  # km not driven in average car
            'tree_days': round(carbon_saved / 0.022, 1),  # days of tree absorbing CO2
            'phone_charges': round(carbon_saved / 0.005, 0),  # smartphone charges
            'light_bulb_hours': round(carbon_saved / 0.01, 0),  # hours of LED light bulb
        }
        
        return equivalents
        
    except Exception as e:
        logger.error(f"Error calculating carbon equivalents: {str(e)}")
        return {
            'driving': 0,
            'tree_days': 0,
            'phone_charges': 0,
            'light_bulb_hours': 0
        }

def calculate_household_footprint(people=1, has_car=True, diet_type='mixed', recycling_level='medium'):
    """
    Calculate approximate annual carbon footprint for a household
    
    Args:
        people (int): Number of people in household
        has_car (bool): Whether the household has a car
        diet_type (str): Type of diet (vegan, vegetarian, mixed, meat-heavy)
        recycling_level (str): Level of recycling (none, low, medium, high)
        
    Returns:
        float: Estimated carbon footprint in tonnes CO2e per year
    """
    try:
        # Base footprint per person (tonnes CO2e/year)
        base_per_person = 5.0
        
        # Adjustment factors
        car_factor = 1.5 if has_car else 1.0
        
        diet_factors = {
            'vegan': 0.8,
            'vegetarian': 0.9,
            'mixed': 1.0,
            'meat-heavy': 1.2
        }
        
        recycling_factors = {
            'none': 1.1,
            'low': 1.05,
            'medium': 1.0,
            'high': 0.9
        }
        
        # Calculate total footprint
        diet_factor = diet_factors.get(diet_type, 1.0)
        recycling_factor = recycling_factors.get(recycling_level, 1.0)
        
        footprint = people * base_per_person * car_factor * diet_factor * recycling_factor
        
        return round(footprint, 1)
        
    except Exception as e:
        logger.error(f"Error calculating household footprint: {str(e)}")
        return people * 5.0  # Fallback to simple calculation
