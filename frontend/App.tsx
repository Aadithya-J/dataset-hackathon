import React, { useState, useEffect } from 'react';
import { Menu, User } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Dashboard from './components/Dashboard';
import ActivitiesView from './components/ActivitiesView';
import { AuthModal } from './components/AuthModal';
import { WellnessModal } from './components/WellnessModal';
import { ViewState } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.CHAT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isWellnessOpen, setIsWellnessOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check system preference or default to dark
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
       // Optional: Auto-detect. For now, defaulting to dark as per original design, 
       // but user can toggle.
    }
    
    // Check for existing session
    const userId = localStorage.getItem('user_id');
    if (userId) {
        setUser({ id: userId }); // Simple check
    } else {
        // Prompt login on first load if desired, or let them be guest
        setIsAuthOpen(true);
    }
    
    // Initialize a new session ID if none exists
    if (!sessionId) {
        setSessionId(crypto.randomUUID());
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background dark:bg-background-dark text-text-primary dark:text-text-primaryDark transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar 
        currentView={currentView}
        setView={setCurrentView}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        onSelectSession={(sid) => {
            if (sid) {
                setSessionId(sid);
            } else {
                setSessionId(crypto.randomUUID());
            }
        }}
        onOpenWellness={() => setIsWellnessOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* Mobile Header */}
        <div className="md:hidden p-4 flex justify-between items-center bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
            <Menu size={24} />
          </button>
          <span className="font-semibold">Pandora</span>
          <button onClick={() => setIsAuthOpen(true)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
            <User size={24} />
          </button>
        </div>

        {/* Desktop Auth Button (Absolute Top Right) */}
        <div className="hidden md:block absolute top-4 right-4 z-10">
            <button 
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-surface-light dark:bg-surface-dark rounded-full shadow-sm hover:shadow-md transition"
            >
                <User size={18} />
                <span className="text-sm">{user ? 'Profile' : 'Sign In'}</span>
            </button>
        </div>

        {currentView === ViewState.CHAT ? (
          <ChatArea 
            isVoiceMode={isVoiceMode} 
            setIsVoiceMode={setIsVoiceMode}
            isDarkMode={isDarkMode}
            sessionId={sessionId || 'default'}
          />
        ) : currentView === ViewState.RITUALS ? (
          <ActivitiesView />
        ) : (
          <Dashboard isDarkMode={isDarkMode} user={user} />
        )}
      </div>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(u) => setUser(u)}
      />
      
      <WellnessModal
        isOpen={isWellnessOpen}
        onClose={() => setIsWellnessOpen(false)}
        userId={user?.id || 'guest'}
      />
    </div>
  );
};

export default App;