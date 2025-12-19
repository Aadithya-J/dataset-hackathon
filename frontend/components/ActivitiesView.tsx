import React, { useState, useEffect, useRef } from 'react';
import { ACTIVITIES, AFFIRMATIONS } from '../constants';
import { Activity } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface JournalEntry {
  id: string;
  text: string;
  timestamp: number;
}

const ActivitiesView: React.FC = () => {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [timer, setTimer] = useState(0);
  const [subStepTimer, setSubStepTimer] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [encouragement, setEncouragement] = useState(AFFIRMATIONS[0]);
  const [journalText, setJournalText] = useState('');
  const [journalLogs, setJournalLogs] = useState<JournalEntry[]>([]);
  
  // Doodle Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#6366f1');
  const [brushSize, setBrushSize] = useState(5);
  const [isGlow, setIsGlow] = useState(false);

  // --- Specialized Activity Content ---
  
  const yogaSteps = [
    { name: "Pranamasana (Prayer)", instruct: "Stand at the edge of your mat, feet together, palms at heart center. Breathe evenly." },
    { name: "Hastauttanasana (Raised Arms)", instruct: "Inhale, lift arms up and back. Stretch the whole body from heels to fingertips." },
    { name: "Padahastasana (Hand to Foot)", instruct: "Exhale, fold forward from the waist. Touch the floor or your shins. Relax the neck." },
    { name: "Ashwa Sanchalanasana (Lunge)", instruct: "Inhale, push your right leg back. Left knee between palms. Look up." },
    { name: "Parvatasana (Mountain)", instruct: "Exhale, lift hips up, forming an inverted 'V'. Press heels into the mat." },
    { name: "Ashtanga Namaskara (Salute)", instruct: "Gently bring knees, chest, and chin to the floor. Hips stay slightly raised." },
    { name: "Bhujangasana (Cobra)", instruct: "Inhale, slide forward and lift your chest. Keep elbows slightly bent." },
    { name: "Parvatasana (Mountain)", instruct: "Exhale, return to inverted 'V'. Focus on the stretch in your hamstrings." },
    { name: "Ashwa Sanchalanasana (Lunge)", instruct: "Inhale, bring the right foot forward between your palms. Sink the hips." },
    { name: "Padahastasana (Forward Fold)", instruct: "Exhale, bring the left foot forward. Fold deeply toward your knees." },
    { name: "Hastauttanasana (Raised Arms)", instruct: "Inhale, roll up slowly. Stretch arms to the sky and lean back slightly." },
    { name: "Tadasana (Mountain Pose)", instruct: "Exhale, bring arms down. Feel the energy flowing through your body." }
  ];

  const pmrSteps = [
    { part: "Feet & Toes", tense: "Curl your toes tightly.", relax: "Release and feel the warmth flowing back." },
    { part: "Calves", tense: "Flex your feet toward your knees.", relax: "Relax and let them sink into the floor." },
    { part: "Thighs & Glutes", tense: "Squeeze your leg muscles and glutes.", relax: "Melt into your seat completely." },
    { part: "Abdomen", tense: "Tighten your stomach muscles.", relax: "Breathe out and let your belly soften." },
    { part: "Hands & Arms", tense: "Make tight fists and flex biceps.", relax: "Let your hands open and feel the heaviness." },
    { part: "Shoulders", tense: "Shrug your shoulders up to your ears.", relax: "Drop them and feel the relief." },
    { part: "Face", tense: "Scrunch your eyes and mouth together.", relax: "Let your face become smooth and calm." }
  ];

  const bodyScanSteps = [
    { part: "Toes & Feet", instruct: "Notice any tingling, warmth, or pressure in your feet." },
    { part: "Lower Legs", instruct: "Scan your calves and shins. Release any stored stress." },
    { part: "Knees & Thighs", instruct: "Feel the weight of your legs against your chair or floor." },
    { part: "Hips & Pelvis", instruct: "Soften the muscles around your hips. Sink deeper." },
    { part: "Back & Spine", instruct: "Track each vertebra from bottom to top. Straighten slightly." },
    { part: "Hands & Arms", instruct: "Let your fingers curl naturally. Feel the pulse in your palms." },
    { part: "Neck & Jaw", instruct: "Unclench your jaw. Let your tongue fall away from the roof of your mouth." }
  ];

  const groundingSteps = [
    { label: "5 SEE", instruct: "Name 5 things you can see around you. Observe their colors and textures." },
    { label: "4 FEEL", instruct: "Name 4 things you can feel. The fabric of your clothes, the air on your skin." },
    { label: "3 HEAR", instruct: "Name 3 sounds. The distant traffic, your own breath, the hum of electronics." },
    { label: "2 SMELL", instruct: "Name 2 things you can smell. Try to find subtle scents in the air." },
    { label: "1 TASTE", instruct: "Name 1 thing you can taste, or the sensation inside your mouth." }
  ];

  // --- Effects ---

  useEffect(() => {
    const saved = localStorage.getItem('completedActivities');
    if (saved) setCompletedIds(JSON.parse(saved));
    const savedLogs = localStorage.getItem('journalLogs');
    if (savedLogs) setJournalLogs(JSON.parse(savedLogs));
  }, []);

  const startSession = (activity: Activity) => {
    setActiveActivity(activity);
    setTimer(activity.durationSeconds);
    setSubStepTimer(0);
    setCurrentStepIndex(0);
    setJournalText('');
    setEncouragement(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
  };

  const saveJournalEntry = (text: string) => {
    if (!text.trim()) return;
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      text,
      timestamp: Date.now()
    };
    const updatedLogs = [newEntry, ...journalLogs];
    setJournalLogs(updatedLogs);
    localStorage.setItem('journalLogs', JSON.stringify(updatedLogs));
  };

  useEffect(() => {
    let interval: any;
    if (activeActivity && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
        setSubStepTimer(s => s + 1);
      }, 1000);
    } else if (timer === 0 && activeActivity && activeActivity.durationSeconds > 0) {
      if (activeActivity.type === 'journaling') saveJournalEntry(journalText);
      const next = completedIds.includes(activeActivity.id) ? completedIds : [...completedIds, activeActivity.id];
      setCompletedIds(next);
      localStorage.setItem('completedActivities', JSON.stringify(next));
      setActiveActivity(null);
    }
    return () => clearInterval(interval);
  }, [activeActivity, timer, completedIds, journalText, journalLogs]);

  useEffect(() => {
    if (!activeActivity) return;
    if (activeActivity.type === 'breathing') {
      if (subStepTimer >= 4) { setSubStepTimer(0); setCurrentStepIndex(prev => (prev + 1) % 4); }
    } else if (activeActivity.type === 'yoga') {
      if (subStepTimer >= 20) { setSubStepTimer(0); setCurrentStepIndex(prev => (prev + 1) % yogaSteps.length); }
    } else if (activeActivity.type === 'pmr') {
      if (subStepTimer >= 15) { setSubStepTimer(0); setCurrentStepIndex(prev => (prev + 1) % pmrSteps.length); }
    } else if (activeActivity.type === 'bodyscan') {
      if (subStepTimer >= 40) { setSubStepTimer(0); setCurrentStepIndex(prev => (prev + 1) % bodyScanSteps.length); }
    }
  }, [subStepTimer, activeActivity]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    if (isGlow) { ctx.shadowBlur = brushSize * 2; ctx.shadowColor = brushColor; } else { ctx.shadowBlur = 0; }
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const deleteJournalEntry = (id: string) => {
    const updated = journalLogs.filter(entry => entry.id !== id);
    setJournalLogs(updated);
    localStorage.setItem('journalLogs', JSON.stringify(updated));
  };

  const renderActiveUI = () => {
    if (!activeActivity) return null;

    switch (activeActivity.type) {
      case 'trataka':
        return (
          <div className="flex flex-col items-center gap-12 w-full max-w-2xl text-center">
            <div className="relative h-96 flex items-end justify-center mb-10">
              {/* Candle Body */}
              <div className="w-16 h-48 bg-gradient-to-b from-slate-200 to-slate-400 rounded-t-lg shadow-xl relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0.5 h-6 bg-slate-800" />
              </div>
              
              {/* Animated Flame */}
              <div className="absolute top-[20%] left-1/2 -translate-x-1/2">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.1, 0.9, 1.05, 1], 
                    y: [0, -2, 1, -1, 0],
                    rotate: [0, 1, -1, 0]
                  }} 
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative flex items-center justify-center"
                >
                  <div className="w-12 h-20 bg-orange-500 rounded-full blur-md opacity-20 absolute" />
                  <div className="w-8 h-16 bg-gradient-to-t from-orange-600 via-yellow-400 to-transparent rounded-full shadow-[0_0_20px_rgba(245,158,11,0.6)]" />
                  <div className="w-4 h-10 bg-white rounded-full absolute bottom-2 blur-sm opacity-80" />
                </motion.div>
              </div>
              
              {/* Glow Effect */}
              <div className="absolute top-[20%] w-64 h-64 bg-yellow-400/10 rounded-full blur-[60px] pointer-events-none animate-pulse" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={timer > 60 ? 'gaze' : 'relax'} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <h4 className="text-4xl font-black text-white tracking-tight">
                  {timer > 60 ? "Fixed Gaze" : "Close Your Eyes"}
                </h4>
                <p className="text-xl text-indigo-100/70 font-medium leading-relaxed italic max-w-md">
                  {timer > 60 ? 
                    "Look directly at the tip of the flame. Do not blink if possible. Let your vision lock onto the light." : 
                    "Keep your eyes closed. Visualize the flame in your mind's eye at the point between your eyebrows."}
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="text-4xl font-mono font-black text-white tabular-nums mt-6">{formatTime(timer)}</div>
          </div>
        );

      case 'reflection':
        return (
          <div className="flex flex-col items-center gap-12 w-full max-w-2xl text-center">
            <div className="relative w-80 h-80 flex items-center justify-center">
              {/* Pulsing Aura */}
              <motion.div 
                animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.3, 0.1] }} 
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 bg-indigo-500 rounded-full blur-3xl"
              />
              
              {/* Meditating Silhouette */}
              <div className="relative z-10 text-white/90">
                {/* Using a simple SVG or icon here would be better if font-awesome is not available, but assuming it is based on previous code */}
                <div className="text-[12rem]">🧘</div>
              </div>

              {/* Mind Bubbles */}
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  animate={{ 
                    y: [0, -100], 
                    x: [0, i % 2 === 0 ? 30 : -30, 0],
                    opacity: [0, 1, 0] 
                  }}
                  transition={{ duration: 5, repeat: Infinity, delay: i * 1.5, ease: 'linear' }}
                  className="absolute bottom-1/2 w-4 h-4 bg-white/20 rounded-full blur-sm"
                />
              ))}
            </div>

            <div className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.p 
                  key={Math.floor(timer / 60)} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="text-2xl text-white font-medium italic max-w-lg leading-relaxed"
                >
                  {timer > 240 ? "Start by relaxing every muscle from your toes to your head." : 
                   timer > 180 ? "Observe your thoughts drifting by. Don't pull them closer." :
                   timer > 120 ? "If an emotion arises, simply name it and let it be." :
                   timer > 60 ? "Feel the profound silence behind the noise of the mind." :
                   "You are the observer, not the thoughts. Just be."}
                </motion.p>
              </AnimatePresence>
              <div className="text-4xl font-mono font-black text-white tabular-nums">{formatTime(timer)}</div>
            </div>
          </div>
        );

      case 'pmr':
        const pmrStep = pmrSteps[currentStepIndex];
        const isTensing = subStepTimer < 5;
        const phaseTimer = isTensing ? 5 - subStepTimer : 15 - subStepTimer;

        return (
          <div className="flex flex-col items-center gap-12 w-full max-w-2xl text-center">
            <motion.div 
              key={`${currentStepIndex}-${isTensing}`} 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className={`w-80 h-80 rounded-full flex flex-col items-center justify-center border-[16px] transition-colors duration-500 ${isTensing ? 'border-rose-500/20 bg-rose-500/5' : 'border-indigo-500/20 bg-indigo-500/5'}`}
            >
              <h4 className={`text-5xl font-black uppercase tracking-tighter mb-2 ${isTensing ? 'text-rose-500' : 'text-indigo-400'}`}>
                {isTensing ? 'Tense' : 'Relax'}
              </h4>
              <div className="text-2xl font-mono font-bold opacity-50 tabular-nums">{phaseTimer}s</div>
            </motion.div>
            <div className="space-y-4">
              <h5 className="text-2xl font-black text-white tracking-tight">{pmrStep.part}</h5>
              <p className="text-xl text-indigo-100/70 font-medium leading-relaxed italic">
                "{isTensing ? pmrStep.tense : pmrStep.relax}"
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {pmrSteps.map((_, i) => (
                <div key={i} className={`h-2 rounded-full transition-all duration-500 ${currentStepIndex === i ? 'w-12 bg-indigo-500' : 'w-4 bg-white/10'}`} />
              ))}
            </div>
          </div>
        );

      case 'cloud':
        return (
          <div className="w-full max-w-4xl flex flex-col items-center gap-12">
            <div className="relative w-full h-80 bg-sky-400/5 rounded-[4rem] border border-white/10 overflow-hidden shadow-2xl">
              <motion.div animate={{ x: ['100%', '-20%'] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} className="absolute top-10 left-0 opacity-20 text-9xl text-white">☁️</motion.div>
              <motion.div animate={{ x: ['100%', '-50%'] }} transition={{ duration: 45, repeat: Infinity, ease: 'linear', delay: 5 }} className="absolute top-40 left-0 opacity-10 text-[12rem] text-white">☁️</motion.div>
              <motion.div animate={{ x: ['100%', '-30%'], y: [0, 10, 0] }} transition={{ x: { duration: 20, repeat: Infinity, ease: 'linear' }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }} className="absolute top-20 left-0 text-white/40 drop-shadow-2xl text-[10rem]">☁️</motion.div>
              <div className="absolute inset-0 flex items-center justify-center p-12 text-center">
                <AnimatePresence mode="wait">
                  <motion.p key={Math.floor(timer / 10)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-2xl text-white font-medium italic max-w-lg leading-relaxed">
                    {timer > 240 ? "Visualize a specific thought appearing as a cloud..." : timer > 180 ? "Don't judge the thought. Don't engage with it." : timer > 120 ? "Watch as the wind gently carries it across the sky." : timer > 60 ? "See it becoming smaller and smaller in the distance." : "Your mind is as vast as the blue sky. Deep breath."}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
            <div className="text-4xl font-mono font-black text-white tabular-nums">{formatTime(timer)}</div>
          </div>
        );

      case 'doodle':
        return (
          <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
            <div className="flex gap-4 mb-4 flex-wrap justify-center items-center bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-xl">
               <div className="flex gap-2">
                 {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ffffff'].map(c => (
                   <button key={c} onClick={() => setBrushColor(c)} className={`w-8 h-8 rounded-full border-2 ${brushColor === c ? 'border-white scale-125' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                 ))}
               </div>
               <div className="h-8 w-px bg-white/10 mx-2" />
               <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black text-white/50 uppercase">Size</span>
                 {[2, 5, 12, 25].map(s => (
                   <button key={s} onClick={() => setBrushSize(s)} className={`rounded-full bg-white/10 text-white flex items-center justify-center transition-all ${brushSize === s ? 'w-10 h-10 bg-indigo-600' : 'w-8 h-8 hover:bg-white/20'}`}>
                     <div style={{ width: s/2, height: s/2 }} className="bg-white rounded-full" />
                   </button>
                 ))}
               </div>
               <div className="h-8 w-px bg-white/10 mx-2" />
               <button onClick={() => setIsGlow(!isGlow)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isGlow ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/10 text-white/50'}`}>
                 Glow
               </button>
               <button onClick={clearCanvas} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                 Clear
               </button>
            </div>
            <div className="relative w-full aspect-[4/3] bg-white rounded-[3rem] shadow-2xl overflow-hidden cursor-crosshair">
               <canvas ref={canvasRef} width={800} height={600} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full h-full block" />
               <div className="absolute top-6 right-8 text-slate-300 font-mono font-bold text-2xl pointer-events-none">{formatTime(timer)}</div>
            </div>
          </div>
        );

      case 'breathing':
        const stages = ["Inhale", "Hold", "Exhale", "Hold"];
        return (
          <div className="flex flex-col items-center gap-12">
            <motion.div animate={{ scale: currentStepIndex === 0 ? 1.5 : currentStepIndex === 2 ? 0.8 : 1.2 }} transition={{ duration: 4, ease: "easeInOut" }} className="w-64 h-64 rounded-full border-[16px] border-indigo-500/20 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 animate-ping opacity-20"></div>
              <div className="text-center">
                <h4 className="text-5xl font-black text-white uppercase tracking-tighter mb-2">{stages[currentStepIndex]}</h4>
                <div className="text-2xl font-mono text-indigo-400 font-bold">{4 - subStepTimer}s</div>
              </div>
            </motion.div>
            <div className="flex gap-4">
              {stages.map((s, i) => (
                <div key={i} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentStepIndex === i ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/40'}`}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        );

      case 'yoga':
        const yogaStep = yogaSteps[currentStepIndex];
        return (
          <div className="w-full max-w-2xl text-center space-y-10">
            <div className="relative h-64 bg-white/5 rounded-[3rem] border border-white/10 flex items-center justify-center p-12">
               <motion.div key={currentStepIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <h4 className="text-4xl font-black text-white tracking-tight">{yogaStep.name}</h4>
                  <p className="text-xl text-indigo-200/80 font-medium leading-relaxed">{yogaStep.instruct}</p>
               </motion.div>
               <div className="absolute bottom-6 right-10 text-indigo-400 font-mono font-bold text-xl">{20 - subStepTimer}s</div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {yogaSteps.map((_, i) => (
                <div key={i} className={`h-2 rounded-full transition-all duration-500 ${currentStepIndex === i ? 'w-12 bg-indigo-500' : 'w-4 bg-white/10'}`} />
              ))}
            </div>
          </div>
        );

      case 'grounding':
        const gStep = groundingSteps[currentStepIndex];
        return (
          <div className="w-full max-w-xl text-center space-y-12">
            <div className="flex justify-center gap-4">
               {groundingSteps.map((_, i) => (
                 <div key={i} className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black transition-all ${currentStepIndex === i ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'bg-white/10 text-white/30'}`}>
                   {5 - i}
                 </div>
               ))}
            </div>
            <motion.div key={currentStepIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h4 className="text-white text-5xl font-black tracking-tight">{gStep.label}</h4>
              <p className="text-indigo-200 text-xl font-medium leading-relaxed">{gStep.instruct}</p>
            </motion.div>
            <button onClick={() => currentStepIndex < 4 ? (setCurrentStepIndex(i => i + 1), setSubStepTimer(0)) : setTimer(0)} className="px-16 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all">
               {currentStepIndex < 4 ? 'Observed' : 'Finish Flow'}
            </button>
          </div>
        );

      case 'journaling':
        return (
          <div className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row gap-10">
            <div className="flex-1 space-y-6">
              <textarea value={journalText} onChange={(e) => setJournalText(e.target.value)} placeholder="Let your thoughts flow onto the page. This entry will be saved to your log." className="w-full h-96 p-10 bg-white/5 rounded-[3rem] border border-white/10 text-white placeholder-white/20 focus:outline-none focus:ring-4 ring-indigo-500/20 text-xl font-medium resize-none shadow-2xl" autoFocus />
              <div className="flex justify-between items-center px-6">
                <div className="text-indigo-400 font-black text-4xl tabular-nums">{formatTime(timer)}</div>
                <div className="text-white/40 text-sm font-medium">Session in progress...</div>
              </div>
            </div>
            <div className="w-full lg:w-80 h-[28rem] lg:h-auto flex flex-col bg-white/5 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/10 bg-white/5">
                <h5 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-2">Previous Reflections</h5>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {journalLogs.length > 0 ? (
                  journalLogs.map((entry) => (
                    <motion.div key={entry.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="group p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          {new Date(entry.timestamp).toLocaleDateString()} @ {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button onClick={() => deleteJournalEntry(entry.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-400 text-[10px] transition-all">Delete</button>
                      </div>
                      <p className="text-xs text-white/70 line-clamp-3 leading-relaxed">{entry.text}</p>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <p className="text-xs text-white/30 font-medium">No previous entries. Your reflections will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center">
            <div className="w-72 h-72 rounded-full border-[12px] border-white/5 flex items-center justify-center mb-12 relative">
              <div className="text-8xl font-mono font-black text-white tracking-tighter tabular-nums">{formatTime(timer)}</div>
            </div>
            <p className="max-w-md text-indigo-100/70 italic text-center text-xl font-medium">{activeActivity?.description}</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background dark:bg-background-dark p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter uppercase text-text-primary dark:text-white">Ritual Lab</h2>
            <p className="text-text-muted dark:text-text-mutedDark font-medium max-w-lg text-xl">
              Neurological protocols for emotional recalibration.
            </p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark px-8 py-5 rounded-[2.5rem] border border-border-light dark:border-border-dark shadow-lg flex items-center gap-5">
            <div className="w-12 h-12 bg-accent-blue dark:bg-accent-teal text-white rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold">✓</span>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-text-muted dark:text-text-mutedDark tracking-[0.2em] mb-1">Rituals Logged</div>
              <span className="font-black text-2xl tabular-nums text-text-primary dark:text-white">{completedIds.length}</span>
            </div>
          </div>
        </header>

        {activeActivity && (
          <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
            <div className="fixed top-12 left-0 right-0 px-6 flex justify-center">
              <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/10 backdrop-blur-2xl border border-white/20 px-12 py-5 rounded-[3rem] text-white font-bold text-lg text-center max-w-2xl">
                {encouragement}
              </motion.div>
            </div>
            <div className="w-full max-w-5xl flex flex-col items-center justify-center mt-20 mb-12">
              <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.6em] mb-4">Protocol: {activeActivity.type}</h3>
              <h4 className="text-6xl font-black text-white mb-16 text-center tracking-tighter uppercase">{activeActivity.title}</h4>
              {renderActiveUI()}
            </div>
            <div className="flex items-center gap-8 mt-auto mb-10">
              <button onClick={() => setActiveActivity(null)} className="px-12 py-5 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-black text-xs uppercase tracking-widest border border-white/10">Abort Ritual</button>
              <button onClick={() => setTimer(0)} className="px-14 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-xl">Mark Complete</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {ACTIVITIES.map(activity => (
            <motion.div key={activity.id} whileHover={{ y: -10, scale: 1.02 }} className={`group relative bg-surface-light dark:bg-surface-dark p-10 rounded-[3.5rem] border-2 transition-all duration-500 shadow-xl flex flex-col ${completedIds.includes(activity.id) ? 'border-green-500/40 bg-green-50/5' : 'border-transparent hover:border-accent-blue/30 dark:hover:border-accent-teal/30'}`}>
              {completedIds.includes(activity.id) && <div className="absolute top-8 right-8 text-green-500 bg-green-500/10 w-10 h-10 rounded-2xl flex items-center justify-center">✓</div>}
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mb-10 shadow-2xl group-hover:rotate-12 transition-all ${
                ['breathing', 'yoga', 'bodyscan'].includes(activity.type) ? 'bg-blue-600 text-white' :
                ['grounding', 'pmr'].includes(activity.type) ? 'bg-rose-500 text-white' :
                ['journaling', 'doodle', 'cloud'].includes(activity.type) ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-white'
              }`}>
                {/* Simple icons using emoji or text if font-awesome is not available, but assuming icons are handled elsewhere or I can use simple chars */}
                {activity.type === 'breathing' ? '🌬️' :
                 activity.type === 'yoga' ? '🧘' :
                 activity.type === 'cloud' ? '☁️' :
                 activity.type === 'grounding' ? '👣' :
                 activity.type === 'pmr' ? '💪' :
                 activity.type === 'bodyscan' ? '🧍' :
                 activity.type === 'journaling' ? '✍️' :
                 activity.type === 'doodle' ? '🎨' :
                 activity.type === 'trataka' ? '🕯️' :
                 activity.type === 'reflection' ? '🤔' : '✨'}
              </div>
              <h4 className="text-2xl font-black mb-4 text-text-primary dark:text-white tracking-tight uppercase">{activity.title}</h4>
              <p className="text-sm text-text-muted dark:text-text-mutedDark mb-12 leading-relaxed font-medium">{activity.description}</p>
              <div className="mt-auto flex items-center justify-between pt-10 border-t border-border-light dark:border-border-dark">
                <span className="text-[10px] font-black text-text-muted dark:text-text-mutedDark uppercase tracking-[0.3em] flex items-center gap-3">
                  {activity.durationSeconds > 0 ? `${Math.floor(activity.durationSeconds / 60)} MIN` : 'CORE'}
                </span>
                <button onClick={() => startSession(activity)} className="px-10 py-4 bg-accent-blue dark:bg-accent-teal hover:opacity-90 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl">Launch</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivitiesView;
