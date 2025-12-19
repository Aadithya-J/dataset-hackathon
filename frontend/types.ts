export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface MoodData {
  day: string;
  value: number; // 1-10 scale
}

export interface StressData {
  time: string;
  level: number; // 0-100
}

export interface SleepData {
  day: string;
  hours: number;
}

export interface Session {
  id: string;
  date: string; // "Today", "Yesterday", etc.
  preview: string;
}

export enum ViewState {
  CHAT = 'CHAT',
  INSIGHTS = 'INSIGHTS',
}
