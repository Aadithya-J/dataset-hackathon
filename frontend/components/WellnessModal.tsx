import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface WellnessModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const WellnessModal: React.FC<WellnessModalProps> = ({ isOpen, onClose, userId }) => {
  const [formData, setFormData] = useState({
    name: '',
    age: 30,
    marital_status: 'Single',
    education_level: "Bachelor's Degree",
    number_of_children: 0,
    smoking_status: 'Non-smoker',
    physical_activity_level: 'Moderate',
    employment_status: 'Employed',
    income: 50000,
    alcohol_consumption: 'Low',
    dietary_habits: 'Moderate',
    sleep_patterns: 'Fair',
    history_of_mental_illness: 'No',
    history_of_substance_abuse: 'No',
    family_history_of_depression: 'No',
    chronic_medical_conditions: 'No'
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetch(`http://localhost:8000/assessment/latest/${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.found) {
            setFormData(prev => ({ ...prev, ...data.data }));
            if (data.prediction) {
                setResult({
                    prediction: data.prediction,
                    llm_analysis: data.summary,
                    top_features: data.top_features
                });
            }
          }
        })
        .catch(err => console.error("Failed to fetch assessment:", err));
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'age' || name === 'number_of_children' || name === 'income' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/assessment/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          ...formData
        }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error submitting assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Wellness Assessment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {result ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Assessment Complete</h3>
                <p className="text-green-700 dark:text-green-300 mt-2">
                  Thank you for sharing. I've analyzed your profile and will keep these factors in mind during our conversations to provide better support.
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Key Insights:</h4>
                {result.llm_analysis ? (
                    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {result.llm_analysis}
                    </div>
                ) : (
                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {result.top_features?.map((f: any, idx: number) => (
                        <li key={idx}>
                        {f.feature.replace('encoder__', '').replace('remainder__', '').replace('_', ' ')} 
                        </li>
                    ))}
                    </ul>
                )}
              </div>

              <div className="flex gap-3">
                  <button 
                    onClick={onClose}
                    className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => setResult(null)}
                    className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Update Details
                  </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Age</label>
                  <input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>

                {/* Selects */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Marital Status</label>
                  <select name="marital_status" value={formData.marital_status} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Education Level</label>
                  <select name="education_level" value={formData.education_level} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option>High School</option><option>Associate Degree</option><option>Bachelor's Degree</option><option>Master's Degree</option><option>PhD</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Children</label>
                  <input type="number" name="number_of_children" value={formData.number_of_children} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Income (USD)</label>
                  <input type="number" name="income" value={formData.income} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employment Status</label>
                  <select name="employment_status" value={formData.employment_status} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option>Employed</option><option>Unemployed</option>
                  </select>
                </div>

                {/* Lifestyle */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Smoking Status</label>
                  <select name="smoking_status" value={formData.smoking_status} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option>Non-smoker</option><option>Former</option><option>Smoker</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Physical Activity</label>
                  <select name="physical_activity_level" value={formData.physical_activity_level} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option>Sedentary</option><option>Moderate</option><option>Active</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alcohol Consumption</label>
                  <select name="alcohol_consumption" value={formData.alcohol_consumption} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option>Low</option><option>Moderate</option><option>High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dietary Habits</label>
                  <select name="dietary_habits" value={formData.dietary_habits} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option>Healthy</option><option>Moderate</option><option>Unhealthy</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sleep Patterns</label>
                  <select name="sleep_patterns" value={formData.sleep_patterns} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option>Good</option><option>Fair</option><option>Poor</option>
                  </select>
                </div>

                {/* History */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">History of Mental Illness</label>
                  <select name="history_of_mental_illness" value={formData.history_of_mental_illness} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option>No</option><option>Yes</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">History of Substance Abuse</label>
                  <select name="history_of_substance_abuse" value={formData.history_of_substance_abuse} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option>No</option><option>Yes</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Family History of Depression</label>
                  <select name="family_history_of_depression" value={formData.family_history_of_depression} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option>No</option><option>Yes</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Chronic Medical Conditions</label>
                  <select name="chronic_medical_conditions" value={formData.chronic_medical_conditions} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option>No</option><option>Yes</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Analyzing...' : 'Submit Assessment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
