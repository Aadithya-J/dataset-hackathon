import os
import joblib
import numpy as np
import pandas as pd
import shap

# Global store for user risk profiles (In-memory for MVP)
# Key: user_id, Value: dict with prediction and explanation
user_risk_profiles = {}

class RiskAssessmentService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RiskAssessmentService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        print("Loading ML Artifacts...")
        # Path to artifacts relative to this file
        # backend/app/services/ml_service.py -> backend/app/services -> backend/app -> backend -> dev -> logistic-regression-shap
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        self.artifacts_dir = os.path.join(base_dir, 'logistic-regression-shap')
        
        try:
            self.artifacts = {
                'column_transformer': joblib.load(os.path.join(self.artifacts_dir, 'column_transformer.pkl')),
                'scaler': joblib.load(os.path.join(self.artifacts_dir, 'scaler.pkl')),
                'model': joblib.load(os.path.join(self.artifacts_dir, 'logistic_model.pkl')),
                'feature_names': joblib.load(os.path.join(self.artifacts_dir, 'feature_names.pkl')),
                'target_classes': joblib.load(os.path.join(self.artifacts_dir, 'target_classes.pkl')),
                'shap_bg': joblib.load(os.path.join(self.artifacts_dir, 'shap_background.npy')),
                'le_employment': joblib.load(os.path.join(self.artifacts_dir, 'le_employment.pkl')),
                'le_mental_illness': joblib.load(os.path.join(self.artifacts_dir, 'le_mental_illness.pkl')),
                'le_substance_abuse': joblib.load(os.path.join(self.artifacts_dir, 'le_substance_abuse.pkl')),
                'le_family_history': joblib.load(os.path.join(self.artifacts_dir, 'le_family_history.pkl')),
            }
            self._initialized = True
            print("ML Artifacts Loaded Successfully.")
        except Exception as e:
            print(f"Error loading ML artifacts: {e}")
            self._initialized = False

    def process_input(self, raw_data):
        """Transform raw dictionary input into scaled features."""
        if not self._initialized:
            raise Exception("ML Service not initialized")

        # 1. Convert to DataFrame
        df_input = pd.DataFrame([raw_data])
        
        # 2. Apply Manual Label Encoders
        data = df_input.values.copy()
        # Indices based on the training columns order. 
        # We assume the input dict keys match the training data columns exactly.
        # The indices 6, 11, 12, 13 are hardcoded in test.py, so we must ensure the input dict 
        # produces the values in the correct order.
        # To be safe, we should enforce the column order.
        
        expected_columns = [
            'Age', 'Marital Status', 'Education Level', 'Number of Children', 
            'Smoking Status', 'Physical Activity Level', 'Employment Status', 
            'Income', 'Alcohol Consumption', 'Dietary Habits', 'Sleep Patterns', 
            'History of Mental Illness', 'History of Substance Abuse', 
            'Family History of Depression'
        ]
        
        # Reorder df to match expected columns
        df_ordered = df_input[expected_columns]
        data = df_ordered.values.copy()

        # Apply encoders
        # Employment Status is at index 6
        data[:, 6] = self.artifacts['le_employment'].transform(data[:, 6])
        # History of Mental Illness is at index 11
        data[:, 11] = self.artifacts['le_mental_illness'].transform(data[:, 11])
        # History of Substance Abuse is at index 12
        data[:, 12] = self.artifacts['le_substance_abuse'].transform(data[:, 12])
        # Family History of Depression is at index 13
        data[:, 13] = self.artifacts['le_family_history'].transform(data[:, 13])
        
        # 3. Apply ColumnTransformer
        X_enc = self.artifacts['column_transformer'].transform(data)
        if hasattr(X_enc, "toarray"):
            X_enc = X_enc.toarray()
            
        # 4. Apply Scaler
        X_scaled = self.artifacts['scaler'].transform(X_enc)
        return X_scaled

    def predict_and_explain(self, user_data: dict):
        if not self._initialized:
            return {"error": "ML Service not initialized"}

        try:
            X_processed = self.process_input(user_data)
            
            # Predict
            prob = self.artifacts['model'].predict_proba(X_processed)[0]
            pred_idx = np.argmax(prob)
            pred_label = self.artifacts['target_classes'][pred_idx]
            confidence = prob[pred_idx]

            # Explain
            explainer = shap.LinearExplainer(
                self.artifacts['model'], 
                self.artifacts['shap_bg'], 
                feature_perturbation="interventional"
            )
            shap_values = explainer.shap_values(X_processed)
            
            if isinstance(shap_values, list):
                vals = shap_values[1] if len(shap_values) > 1 else shap_values[0]
            else:
                vals = shap_values

            # Create summary
            feature_names = self.artifacts['feature_names']
            explanation_df = pd.DataFrame({
                'feature': feature_names,
                'shap_value': vals[0]
            }).sort_values(by='shap_value', key=abs, ascending=False)
            
            top_features = explanation_df.head(5).to_dict(orient='records')

            return {
                "prediction": pred_label,
                "confidence": float(confidence),
                "top_features": top_features
            }
        except Exception as e:
            print(f"Prediction error: {e}")
            return {"error": str(e)}

# Singleton instance
ml_service = RiskAssessmentService()

def get_user_risk_profile(user_id: str):
    return user_risk_profiles.get(user_id)

def set_user_risk_profile(user_id: str, profile: dict):
    user_risk_profiles[user_id] = profile
