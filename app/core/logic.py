def analyze_risk_factors(text: str, current_history: list) -> int:
    """
    Heuristic logic: checks for keywords indicating low activity or hopelessness.
    Returns a risk score (0-10).
    """
    score = 0
    text_lower = text.lower()
    
    # Keywords from Kaggle dataset (Depression indicators)
    risk_keywords = ["bed", "tired", "no energy", "didn't move", "slept all day"]
    
    for word in risk_keywords:
        if word in text_lower:
            score += 2
            
    return score