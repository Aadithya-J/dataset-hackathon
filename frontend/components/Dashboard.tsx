import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell
} from 'recharts';
import { MOCK_MOOD_DATA, MOCK_STRESS_DATA, MOCK_SLEEP_DATA, COLORS, LIGHT_COLORS } from '../constants';

interface DashboardProps {
  isDarkMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ isDarkMode }) => {
  // Select active color palette
  const activeColors = isDarkMode ? COLORS : LIGHT_COLORS;
  
  // Custom Styles
  const cardClass = "bg-white/60 dark:bg-[#121826]/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-lg transition-colors duration-300";
  const titleClass = "text-lg mb-4 font-medium flex items-center gap-2 transition-colors duration-300";
  const subTextClass = "mt-4 text-sm text-text-muted dark:text-[#94A3B8] transition-colors duration-300";

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto p-6 md:p-8 animate-fade-in pb-24">
      <div className="mb-8">
        <h2 className="text-3xl font-light text-text-primary dark:text-[#E2E8F0] mb-2">Your Insights</h2>
        <p className="text-text-muted dark:text-[#94A3B8]">Reflecting on your journey this week.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stress Chart */}
        <div className={cardClass}>
          <h3 className={`${titleClass} text-accent-tan dark:text-accent-violet`}>
            Stress Levels
            <span className="text-xs text-text-muted dark:text-[#94A3B8] font-normal ml-auto">Last 24 Hours</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_STRESS_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke={activeColors.grid} vertical={false} />
                <XAxis dataKey="time" stroke={activeColors.axis} tick={{fill: activeColors.axis, fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis stroke={activeColors.axis} tick={{fill: activeColors.axis, fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: activeColors.tooltipBg, border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: activeColors.tooltipText }}
                />
                <Line 
                  type="monotone" 
                  dataKey="level" 
                  stroke={activeColors.primaryChart} 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: activeColors.bgSecondary, stroke: activeColors.primaryChart, strokeWidth: 2 }} 
                  activeDot={{ r: 6, fill: activeColors.primaryChart }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className={subTextClass}>
            You've been under a bit more pressure in the afternoons. Consider a breathing break at 2 PM.
          </p>
        </div>

        {/* Mood Chart */}
        <div className={cardClass}>
          <h3 className={`${titleClass} text-accent-blue dark:text-accent-teal`}>
            Mood Distribution
            <span className="text-xs text-text-muted dark:text-[#94A3B8] font-normal ml-auto">This Week</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_MOOD_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke={activeColors.grid} vertical={false} />
                <XAxis dataKey="day" stroke={activeColors.axis} tick={{fill: activeColors.axis, fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: isDarkMode ? 'white' : 'black', opacity: 0.05}}
                  contentStyle={{ backgroundColor: activeColors.tooltipBg, border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: activeColors.tooltipText }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {MOCK_MOOD_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value > 5 ? activeColors.secondaryChart : activeColors.primaryChart} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
           <p className={subTextClass}>
            Your mood lifted significantly towards the weekend. Calmer days usually follow longer sleep.
          </p>
        </div>

         {/* Sleep Quality */}
         <div className={`${cardClass} lg:col-span-2`}>
          <h3 className={`${titleClass} text-indigo-500 dark:text-indigo-400`}>Sleep Trends</h3>
           <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_SLEEP_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke={activeColors.grid} vertical={false} />
                <XAxis dataKey="day" stroke={activeColors.axis} tick={{fill: activeColors.axis, fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: activeColors.tooltipBg, border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: activeColors.tooltipText }}
                />
                <Line 
                  type="basis" 
                  dataKey="hours" 
                  stroke={activeColors.secondaryChart} 
                  strokeWidth={4} 
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;