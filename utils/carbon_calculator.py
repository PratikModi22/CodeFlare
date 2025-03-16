from models import WasteCategory

def calculate_carbon_impact(category_id, quantity, disposed_properly):
    """
    Calculate the carbon impact of a waste disposal action
    
    Args:
        category_id: ID of the waste category
        quantity: Amount of waste in kg
        disposed_properly: Whether waste was disposed properly
        
    Returns:
        float: Carbon impact in kg CO2 equivalent (negative means carbon saved)
    """
    try:
        # Get category carbon factor
        from app import db
        category = WasteCategory.query.get(category_id)
        
        if not category:
            # Default factor if category not found
            carbon_factor = 2.5
        else:
            carbon_factor = category.carbon_factor
        
        # Base calculation - how much carbon would be emitted if not recycled
        base_impact = carbon_factor * quantity
        
        # If recyclable waste is disposed properly, we save carbon
        if category.recyclable and disposed_properly:
            # Calculate carbon saved (up to 70% for recyclable items)
            carbon_saved = base_impact * 0.7
            return -carbon_saved  # Negative value represents carbon saved
        
        # If not recycled or not recyclable, return the positive impact (emissions)
        return base_impact * 0.3 if disposed_properly else base_impact
        
    except Exception as e:
        # Default value in case of error
        return 0.0

def estimate_carbon_footprint(waste_records):
    """
    Estimate total carbon footprint based on user's waste records
    
    Args:
        waste_records: List of WasteRecord objects
        
    Returns:
        dict: Carbon statistics including total, saved, and net impact
    """
    total_emissions = 0.0
    total_savings = 0.0
    
    for record in waste_records:
        impact = record.carbon_impact
        
        if impact < 0:
            # Negative impact means carbon saved
            total_savings += abs(impact)
        else:
            # Positive impact means carbon emitted
            total_emissions += impact
    
    # Calculate net impact
    net_impact = total_emissions - total_savings
    
    # Equivalent metrics for visualization
    trees_equivalent = total_savings / 21.0  # One tree absorbs ~21kg CO2 per year
    car_km_equivalent = total_savings / 0.2  # ~0.2kg CO2 per km driven
    
    return {
        'total_emissions': total_emissions,
        'total_savings': total_savings,
        'net_impact': net_impact,
        'trees_equivalent': trees_equivalent,
        'car_km_equivalent': car_km_equivalent
    }
