import os
import joblib
import numpy as np
import pandas as pd
import shap

# ---------------------
# Configuration
# ---------------------
ARTIFACTS_DIR = './logistic-regression-shap/'

def load_artifacts():
    """Load all saved components from the training phase."""
    artifacts = {
        'column_transformer': joblib.load(os.path.join(ARTIFACTS_DIR, 'column_transformer.pkl')),
        'scaler': joblib.load(os.path.join(ARTIFACTS_DIR, 'scaler.pkl')),
        'model': joblib.load(os.path.join(ARTIFACTS_DIR, 'logistic_model.pkl')),
        'feature_names': joblib.load(os.path.join(ARTIFACTS_DIR, 'feature_names.pkl')),
        'target_classes': joblib.load(os.path.join(ARTIFACTS_DIR, 'target_classes.pkl')),
        'shap_bg': joblib.load(os.path.join(ARTIFACTS_DIR, 'shap_background.npy')),
        # Label Encoders
        'le_employment': joblib.load(os.path.join(ARTIFACTS_DIR, 'le_employment.pkl')),
        'le_mental_illness': joblib.load(os.path.join(ARTIFACTS_DIR, 'le_mental_illness.pkl')),
        'le_substance_abuse': joblib.load(os.path.join(ARTIFACTS_DIR, 'le_substance_abuse.pkl')),
        'le_family_history': joblib.load(os.path.join(ARTIFACTS_DIR, 'le_family_history.pkl')),
    }
    return artifacts

def process_input(raw_data, arts):
    """Transform raw dictionary input into scaled features."""
    # 1. Convert to DataFrame to ensure order matches training
    df_input = pd.DataFrame([raw_data])
    
    # 2. Apply Manual Label Encoders (using the specific columns from your training)
    # Note: Ensure the keys match your CSV column names
    data = df_input.values.copy()
    data[:, 6] = arts['le_employment'].transform(data[:, 6])
    data[:, 11] = arts['le_mental_illness'].transform(data[:, 11])
    data[:, 12] = arts['le_substance_abuse'].transform(data[:, 12])
    data[:, 13] = arts['le_family_history'].transform(data[:, 13])
    
    # 3. Apply ColumnTransformer (OneHotEncoding)
    X_enc = arts['column_transformer'].transform(data)
    if hasattr(X_enc, "toarray"):
        X_enc = X_enc.toarray()
        
    # 4. Apply Scaler
    X_scaled = arts['scaler'].transform(X_enc)
    return X_scaled

def explain_prediction(model, X_scaled, shap_bg, feature_names):
    """Generate SHAP explanation for a single prediction."""
    explainer = shap.LinearExplainer(model, shap_bg, feature_perturbation="interventional")
    shap_values = explainer.shap_values(X_scaled)
    
    # Handle SHAP output format for binary class
    if isinstance(shap_values, list):
        vals = shap_values[1] if len(shap_values) > 1 else shap_values[0]
    else:
        vals = shap_values

    # Create a summary of local feature contributions
    explanation = pd.DataFrame({
        'feature': feature_names,
        'shap_value': vals[0]
    }).sort_values(by='shap_value', key=abs, ascending=False)
    
    return explanation

# ---------------------
# Execution Example
# ---------------------
if __name__ == "__main__":
    # 1. Load Everything
    arts = load_artifacts()
    
    # 2. Define a Mock Input (Mirroring your CSV structure)
    # Make sure keys match exactly the columns after dropping 'Name'
    sample_input = {
        'Age': 35,
        'Marital Status': 'Married',
        'Education Level': "Bachelor's Degree",
        'Number of Children': 0,
        'Smoking Status': 'Non-smoker',
        'Physical Activity Level': 'Moderate',
        'Employment Status': 'Unemployed',
        'Income': 30000,
        'Alcohol Consumption': 'High',
        'Dietary Habits': 'Healthy',
        'Sleep Patterns': 'Fair',
        'History of Mental Illness': 'No',
        'History of Substance Abuse': 'No',
        'Family History of Depression': 'Yes'
    }

    # 3. Process and Predict
    X_processed = process_input(sample_input, arts)
    prob = arts['model'].predict_proba(X_processed)[0]
    pred_idx = np.argmax(prob)
    pred_label = arts['target_classes'][pred_idx]

    print(f"--- Prediction Results ---")
    print(f"Predicted Class: {pred_label}")
    print(f"Confidence: {prob[pred_idx]:.2%}")
    print(f"\n--- XAI (Local SHAP Explanation) ---")
    
    # 4. Explain
    explanation_df = explain_prediction(arts['model'], X_processed, arts['shap_bg'], arts['feature_names'])
    
    # Show top 5 features pushing the probability
    print("Top features influencing this specific result:")
    print(explanation_df.head(5).to_string(index=False))