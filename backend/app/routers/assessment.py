from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain_core.messages import SystemMessage
from ..services.ml_service import ml_service, set_user_risk_profile
from ..core.llm import llm
from ..services.user_service import save_user_assessment, get_latest_assessment

router = APIRouter()

class WellnessForm(BaseModel):
    user_id: str
    age: int
    marital_status: str
    education_level: str
    number_of_children: int
    smoking_status: str
    physical_activity_level: str
    employment_status: str
    income: float
    alcohol_consumption: str
    dietary_habits: str
    sleep_patterns: str
    history_of_mental_illness: str
    history_of_substance_abuse: str
    family_history_of_depression: str
    # Chronic Medical Conditions was in the user prompt but not in test.py example input.
    # I will include it in the model but map it if needed, or ignore if not used by the model.
    # Looking at test.py, it is NOT in the sample_input. So I will exclude it from the ML input 
    # but keep it in the form if the user wants to collect it.
    chronic_medical_conditions: str 

@router.get("/assessment/latest/{user_id}")
async def get_latest_user_assessment(user_id: str):
    assessment = await get_latest_assessment(user_id)
    if not assessment:
        return {"found": False}
    
    # Return the form data stored in the assessment
    return {
        "found": True,
        "data": assessment.get("form_data", {}),
        "prediction": assessment.get("risk_prediction"),
        "summary": assessment.get("llm_summary"),
        "top_features": assessment.get("top_features")
    }

@router.post("/assessment/submit")
async def submit_assessment(form: WellnessForm):
    # Map form data to ML model expected keys
    ml_input = {
        'Age': form.age,
        'Marital Status': form.marital_status,
        'Education Level': form.education_level,
        'Number of Children': form.number_of_children,
        'Smoking Status': form.smoking_status,
        'Physical Activity Level': form.physical_activity_level,
        'Employment Status': form.employment_status,
        'Income': form.income,
        'Alcohol Consumption': form.alcohol_consumption,
        'Dietary Habits': form.dietary_habits,
        'Sleep Patterns': form.sleep_patterns,
        'History of Mental Illness': form.history_of_mental_illness,
        'History of Substance Abuse': form.history_of_substance_abuse,
        'Family History of Depression': form.family_history_of_depression
    }

    result = ml_service.predict_and_explain(ml_input)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    # --- LLM Summarization Step ---
    try:
        pred = result.get("prediction", "Unknown")
        top_features = result.get("top_features", [])
        
        # Helper to extract meaningful value for the feature
        def get_feature_context(feature_name, inputs):
            # Clean name
            clean_name = feature_name.replace('encoder__', '').replace('remainder__', '')
            
            # Case 1: One-Hot Encoded (e.g., "Employment Status_Unemployed")
            if '_' in clean_name:
                # Split by last underscore to separate category and value
                parts = clean_name.rsplit('_', 1)
                if len(parts) == 2:
                    category, value = parts
                    return f"{category}: {value}"
            
            # Case 2: Numerical/Direct (e.g., "Age", "Income")
            # Try to find exact match in inputs
            if clean_name in inputs:
                return f"{clean_name}: {inputs[clean_name]}"
            
            # Fallback
            return clean_name.replace('_', ' ')

        # Format features with values for the prompt
        features_context = []
        for f in top_features:
            ctx = get_feature_context(f['feature'], ml_input)
            features_context.append(f"{ctx} (Impact: {'High' if abs(f['shap_value']) > 0.1 else 'Moderate'})")
            
        features_str = "\n".join([f"- {fc}" for fc in features_context])
        
        prompt = (
            "You are a warm, insightful wellness companion. A user just finished a health check-in. "
            "Based on the analysis below, write 3-4 personalized, non-judgmental observations to help them reflect.\n\n"
            f"Analysis Data:\n"
            f"- Risk Level: {pred}\n"
            f"- Top Influencing Factors:\n{features_str}\n\n"
            "Guidelines:\n"
            "1. **Be Direct but Kind**: Address the factors honestly. If they are sedentary, say 'We noticed physical activity is currently low, which can impact mood.' Don't sugarcoat or hallucinate positive traits not present in the data.\n"
            "2. **Connect the Dots**: Briefly mention *why* a factor matters (e.g., 'Work stress can often drain energy needed for other things').\n"
            "3. **Future Focus**: End each point with a tiny, hopeful look forward (e.g., 'Small steps here can make a big difference').\n"
            "4. **No Jargon**: No 'SHAP', 'algorithms', 'features', 'encoders'.\n"
            "5. **Format**: 3-4 bullet points. Start directly with the bullets."
        )
        
        response = await llm.ainvoke([SystemMessage(content=prompt)])
        llm_analysis = response.content
        
        # Add to result
        result["llm_analysis"] = llm_analysis
        
    except Exception as e:
        print(f"LLM summarization failed: {e}")
        result["llm_analysis"] = "Thank you for sharing. We'll use this to better support you."

    # Store result in memory for the chat agent to access
    # IMPORTANT: Include form_data so the agent has the full context immediately
    result_with_data = result.copy()
    result_with_data["form_data"] = form.dict()
    set_user_risk_profile(form.user_id, result_with_data)
    
    # Persist to Database
    await save_user_assessment(form.user_id, {
        "form_data": form.dict(),
        "prediction": result.get("prediction"),
        "confidence": result.get("confidence"),
        "top_features": result.get("top_features"),
        "llm_analysis": result.get("llm_analysis")
    })
    
    return result
