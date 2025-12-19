import { MoodData, StressData, SleepData, Session, Activity } from './types';

export const COMPANION_NAME = "PANDORA";

export const SYSTEM_INSTRUCTION = `
You are Pandora, a compassionate, supportive, and non-judgmental mental health companion. 
Your tone is calm, soothing, and empathetic. You are a trusted friend talking late at night.
Keep responses concise but warm. Use soft language. 
Avoid clinical jargon. Instead of "You are experiencing anxiety," say "It sounds like things feel heavy right now."
If the user expresses severe distress or self-harm, gently provide immediate resources and encourage professional help, but remain calm.
Prioritize listening and validating feelings. 
Occasionally ask gentle reflective questions like "How does that sit with you?" or "Would you like to explore that feeling?"
`;

export const MOCK_MOOD_DATA: MoodData[] = [
  { day: 'Mon', value: 6 },
  { day: 'Tue', value: 5 },
  { day: 'Wed', value: 7 },
  { day: 'Thu', value: 4 },
  { day: 'Fri', value: 6 },
  { day: 'Sat', value: 8 },
  { day: 'Sun', value: 7 },
];

export const MOCK_STRESS_DATA: StressData[] = [
  { time: 'Morning', level: 30 },
  { time: 'Noon', level: 65 },
  { time: 'Afternoon', level: 50 },
  { time: 'Evening', level: 40 },
  { time: 'Night', level: 20 },
];

export const MOCK_SLEEP_DATA: SleepData[] = [
  { day: 'Mon', hours: 6.5 },
  { day: 'Tue', hours: 7 },
  { day: 'Wed', hours: 5.5 },
  { day: 'Thu', hours: 8 },
  { day: 'Fri', hours: 7.5 },
  { day: 'Sat', hours: 9 },
  { day: 'Sun', hours: 8 },
];

// Dark Theme Colors (Original)
export const COLORS = {
  bg: '#0F1115',
  bgSecondary: '#121826',
  teal: '#5EEAD4',
  violet: '#A78BFA',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  
  // Chart Specifics
  grid: '#334155',
  axis: '#64748B',
  tooltipBg: '#1E293B',
  tooltipText: '#E2E8F0',
  primaryChart: '#5EEAD4', // Teal
  secondaryChart: '#A78BFA', // Violet
};

// Light Theme Colors (New Palette)
export const LIGHT_COLORS = {
  bg: '#FDF8EB',
  bgSecondary: '#F4F1EA',
  teal: '#5D8AA8', // Mapped to Slate Blue
  violet: '#C8A67B', // Mapped to Tan
  text: '#2C3E50',
  textMuted: '#64748B',

  // Chart Specifics
  grid: '#CBD5E1', // Slate 300
  axis: '#64748B',
  tooltipBg: '#FFFFFF',
  tooltipText: '#1E293B',
  primaryChart: '#5D8AA8', // Slate Blue
  secondaryChart: '#C8A67B', // Tan
};

export const AFFIRMATIONS = [
  "You are enough just as you are.",
  "Your feelings are valid.",
  "This too shall pass.",
  "You are stronger than you know.",
  "Peace begins with a smile.",
  "You deserve happiness.",
  "Take it one day at a time.",
  "Breathe in calm, breathe out stress.",
];

export const ACTIVITIES: Activity[] = [
  { id: 'breathing', type: 'breathing', title: 'Box Breathing', description: 'Regulate your nervous system with controlled breathing.', durationSeconds: 300 },
  { id: 'grounding', type: 'grounding', title: '5-4-3-2-1 Grounding', description: 'Connect with your senses to anchor yourself in the present.', durationSeconds: 0 },
  { id: 'journaling', type: 'journaling', title: 'Free Writing', description: 'Unload your mind without judgment.', durationSeconds: 600 },
  { id: 'doodle', type: 'doodle', title: 'Zen Doodling', description: 'Express yourself creatively to release tension.', durationSeconds: 300 },
  { id: 'cloud', type: 'cloud', title: 'Cloud Gazing', description: 'Let your thoughts drift away like clouds.', durationSeconds: 300 },
  { id: 'pmr', type: 'pmr', title: 'Muscle Relaxation', description: 'Systematically release physical tension.', durationSeconds: 450 },
  { id: 'bodyscan', type: 'bodyscan', title: 'Body Scan', description: 'Reconnect with your physical self.', durationSeconds: 600 },
  { id: 'trataka', type: 'trataka', title: 'Candle Gazing', description: 'Improve focus and calm the mind.', durationSeconds: 300 },
  { id: 'reflection', type: 'reflection', title: 'Self Reflection', description: 'Explore your inner thoughts in silence.', durationSeconds: 300 },
  { id: 'yoga', type: 'yoga', title: 'Sun Salutation', description: 'Energize your body with a gentle flow.', durationSeconds: 600 },
];