import React, { useEffect, useState } from 'react';
import { LayoutDashboard, MessageSquare, History, User, ShieldAlert, LogOut, Sun, Moon, Activity, Sparkles } from 'lucide-react';
import { ViewState, Session } from '../types';
import { COMPANION_NAME } from '../constants';
import { Button } from './Button';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onSelectSession: (sessionId: string | null) => void;
  onOpenWellness: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, setIsOpen, isDarkMode, toggleTheme, onSelectSession, onOpenWellness }) => {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;

        try {
            const res = await fetch(`http://localhost:8000/chat/sessions/${userId}`);
            if (res.ok) {
                const sessionData = await res.json();
                const sessionList: Session[] = sessionData.map((s: any) => ({
                    id: s.id,
                    date: new Date(s.created_at).toLocaleDateString(),
                    preview: s.preview
                }));
                
                setSessions(sessionList);
            }
        } catch (err) {
            console.error("Failed to load history for sidebar", err);
        }
    };
    
    fetchHistory();
  }, [isOpen]); // Refresh when sidebar opens

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div 
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-sidebar dark:bg-sidebar-dark border-r border-gray-200 dark:border-white/5 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-6 flex items-center gap-4 border-b border-gray-200 dark:border-white/5">
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-accent-blue to-accent-tan dark:from-accent-teal dark:to-accent-violet animate-breathe flex items-center justify-center">
            <div className="w-8 h-8 bg-sidebar dark:bg-background-dark rounded-full flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-accent-blue to-accent-tan dark:from-accent-teal dark:to-accent-violet opacity-80" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-wide text-text-primary dark:text-white">{COMPANION_NAME}</h1>
            <p className="text-xs text-text-muted dark:text-text-mutedDark">Always here.</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => { 
                setView(ViewState.CHAT); 
                onSelectSession(null);
                setIsOpen(false); 
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentView === ViewState.CHAT 
                ? 'bg-white dark:bg-[#1E293B] text-accent-blue dark:text-accent-teal shadow-md ring-1 ring-gray-100 dark:ring-0' 
                : 'text-text-muted dark:text-text-mutedDark hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-[#E2E8F0]'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">New Chat</span>
          </button>
          
          <button
            onClick={() => { setView(ViewState.INSIGHTS); setIsOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentView === ViewState.INSIGHTS
                ? 'bg-white dark:bg-[#1E293B] text-accent-tan dark:text-accent-violet shadow-md ring-1 ring-gray-100 dark:ring-0' 
                : 'text-text-muted dark:text-text-mutedDark hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-[#E2E8F0]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Mood Insights</span>
          </button>

          <button
            onClick={() => { setView(ViewState.RITUALS); setIsOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentView === ViewState.RITUALS
                ? 'bg-white dark:bg-[#1E293B] text-accent-tan dark:text-accent-violet shadow-md ring-1 ring-gray-100 dark:ring-0' 
                : 'text-text-muted dark:text-text-mutedDark hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-[#E2E8F0]'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Ritual Lab</span>
          </button>

          <button
            onClick={() => {
                onOpenWellness();
                setIsOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
              text-text-muted dark:text-text-mutedDark hover:bg-black/5 dark:hover:bg-white/5
            `}
          >
            <Activity className="w-5 h-5" />
            <span className="font-medium">Wellness Check</span>
          </button>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="flex items-center gap-2 text-text-muted dark:text-[#64748B] text-xs font-bold uppercase tracking-wider mb-3 mt-4 px-2">
            <History className="w-3 h-3" />
            Past Sessions
          </div>
          <div className="space-y-1">
            {sessions.length === 0 ? (
                <div className="px-4 py-3 text-xs text-text-muted dark:text-[#94A3B8]">No history yet</div>
            ) : (
                sessions.map((session) => (
                <div 
                    key={session.id} 
                    onClick={() => {
                        onSelectSession(session.id);
                        setView(ViewState.CHAT);
                        setIsOpen(false);
                    }}
                    className="group px-4 py-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                    <div className="text-sm text-text-primary dark:text-[#E2E8F0] font-medium mb-0.5 truncate group-hover:text-accent-tan dark:group-hover:text-accent-violet transition-colors">
                        {session.preview}
                    </div>
                    <div className="text-xs text-text-muted dark:text-[#94A3B8]">
                        {session.date}
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-white/5 space-y-3">
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium text-text-muted dark:text-text-mutedDark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
               {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
               <span>{isDarkMode ? 'Night Mode' : 'Day Mode'}</span>
            </span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-accent-violet/30' : 'bg-accent-tan/30'}`}>
               <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${isDarkMode ? 'left-4.5 bg-accent-violet' : 'left-0.5 bg-accent-tan'}`} />
            </div>
          </button>

          <Button variant="danger" className="w-full justify-start !px-4 !bg-red-500/5 hover:!bg-red-500/10">
            <ShieldAlert className="w-5 h-5" />
            <span>Emergency Help</span>
          </Button>
          <div className="flex items-center gap-3 px-4 py-2 text-text-muted dark:text-[#64748B] text-sm">
            <User className="w-4 h-4" />
            <span>Profile Settings</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;