import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Camera, Shield, Zap, AlertTriangle, GitBranch, Play } from 'lucide-react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import { Canvas } from '@react-three/fiber';
import ReactMarkdown from 'react-markdown';
import Brain3D from './Brain3D';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// ─────────────────────────────────────────
// App
// ─────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant', timestamp: new Date(),
    content: `Neuromotor V8: Biometric Code Review Swarm.\n\nEnter a GitHub URL. The 3 parallel lobes will clone the repo and audit it simultaneously for syntax, logic, and security vulnerabilities.`,
  }]);
  
  const [input, setInput] = useState('');
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set(['idle']));
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText]  = useState('SYSTEM READY');
  
  // Swarm State
  const [repoUrl, setRepoUrl] = useState('https://github.com/torvalds/linux');
  const [reviewReport, setReviewReport] = useState('> Swarm is standing by. Enter a repository URL and initiate the audit.');

  // Biometric State
  const webcamRef = useRef<Webcam>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [emotion, setEmotion] = useState<string>('neutral');
  
  // Autonomous Trigger State
  const emotionStreak = useRef<{ emotion: string, startTime: number }>({ emotion: 'neutral', startTime: 0 });
  const [autonomousTriggered, setAutonomousTriggered] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isStreaming]);

  // Load Face-API
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch (e) {
        console.error("Failed to load models", e);
      }
    };
    loadModels();
  }, []);

  const detectEmotion = useCallback(async () => {
    if (webcamRef.current?.video?.readyState === 4 && modelsLoaded) {
      const video = webcamRef.current.video;
      const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
      if (detections) {
        let maxEmotion = 'neutral';
        let maxScore = 0;
        for (const [expr, score] of Object.entries(detections.expressions)) {
          if (score > maxScore) { maxScore = score; maxEmotion = expr; }
        }
        setEmotion(maxEmotion);

        // Autonomous Debugging Trigger Logic
        const now = Date.now();
        if (maxEmotion === 'angry' || maxEmotion === 'sad') {
          if (emotionStreak.current.emotion !== maxEmotion) {
            emotionStreak.current = { emotion: maxEmotion, startTime: now };
          } else if (now - emotionStreak.current.startTime > 4000 && !isStreaming && repoUrl) {
            // Trigger autonomous debug
            emotionStreak.current = { emotion: 'neutral', startTime: now };
            triggerAutonomousDebug();
          }
        } else {
          emotionStreak.current = { emotion: maxEmotion, startTime: now };
        }
      }
    }
    setTimeout(detectEmotion, 500);
  }, [modelsLoaded, isStreaming, repoUrl]);

  useEffect(() => { if (modelsLoaded) detectEmotion(); }, [modelsLoaded, detectEmotion]);

  const triggerAutonomousDebug = () => {
    setAutonomousTriggered(true);
    setTimeout(() => setAutonomousTriggered(false), 3000);
    const msg = "I'm extremely frustrated with this codebase. Trigger an emergency full swarm audit on the repo to find out what's wrong.";
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: '⚡ AUTONOMOUS TRIGGER: User frustration detected. Emergency repo audit initiated.', timestamp: new Date() }]);
    sendToBackend(null, msg, true);
  };

  const sendToBackend = async (e: React.FormEvent | null, overrideMessage?: string, isAutonomous = false) => {
    if (e) e.preventDefault();
    const query = overrideMessage || input.trim();
    if (!query || isStreaming) return;
    
    if (!isAutonomous) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: query, timestamp: new Date() }]);
    }
    setInput('');
    setIsStreaming(true); 
    setActiveNodes(new Set(['amygdala'])); 
    setStatusText('INPUT LAYER (AMYGDALA) ANALYZING...');
    setReviewReport('> Cloning repository and analyzing code... This may take a minute.');

    try {
      const res = await fetch('http://localhost:8000/chat', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ message: query, emotion_state: emotion, repo_url: repoUrl }) 
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; let finalResp = '';
      const currentActive = new Set<string>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.node === 'end') {
              finalResp = event.response; 
              setActiveNodes(new Set()); 
              setStatusText('SYSTEM READY');
            } else if (event.node === 'error') {
              throw new Error(event.error);
            } else {
              currentActive.add(event.node);
              setActiveNodes(new Set(currentActive));
              
              if (['syntax', 'logic', 'security'].includes(event.node)) {
                setStatusText('SWARM ACTIVE: PARALLEL AUDIT...');
              } else if (event.node === 'frontal_lobe') {
                currentActive.clear(); 
                currentActive.add('frontal_lobe');
                setActiveNodes(new Set(currentActive));
                setStatusText('OUTPUT LAYER: SYNTHESIZING REPORT...');
              }
            }
          } catch { /* skip */ }
        }
      }

      setReviewReport(finalResp || 'Error: No report generated.');
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Swarm Review Complete. Check the command center panel.', timestamp: new Date() }]);
    } catch (err: any) {
      setActiveNodes(new Set()); setStatusText('SYSTEM ERROR');
      setReviewReport(`> Error: ${err.message}`);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', timestamp: new Date(), content: `⚠️ ${err.message}` }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] font-sans overflow-hidden text-slate-200">
      
      {/* ── Left Pane: Biometric Chat (25%) ── */}
      <div className="w-[25%] flex flex-col relative z-20 border-r border-slate-800/50 bg-slate-900/90 backdrop-blur-xl shadow-2xl">
        
        <div className="p-4 border-b border-slate-800/50 flex flex-col gap-3 shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 tracking-widest">BIOMETRIC OBSERVER</span>
            <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-full border border-slate-700/50">
              <Camera size={12} className={emotion === 'angry' || emotion === 'sad' ? "text-orange-400" : "text-cyan-400"} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${emotion === 'angry' || emotion === 'sad' ? "text-orange-400" : "text-cyan-400"}`}>{emotion}</span>
            </div>
          </div>
          
          <div className={`relative w-full h-24 bg-black rounded-lg border ${autonomousTriggered ? 'border-orange-500 shadow-[0_0_20px_#f97316]' : 'border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]'} overflow-hidden transition-all duration-300`}>
            {!modelsLoaded && <span className="text-[10px] text-slate-500 absolute z-10 w-full text-center top-10">LOADING ML MODELS...</span>}
            <Webcam ref={webcamRef} muted={true} videoConstraints={{ facingMode: "user" }} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: autonomousTriggered ? 0.3 : 0.7 }} />
            {autonomousTriggered && (
              <div className="absolute inset-0 flex items-center justify-center bg-orange-500/20">
                <span className="text-orange-500 font-bold tracking-widest text-xs flex items-center gap-1"><AlertTriangle size={14}/> AUTONOMOUS AUDIT</span>
              </div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
          <AnimatePresence>
            {messages.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words rounded-xl ${
                    msg.role === 'user' ? 'bg-indigo-600 text-white' : 
                    msg.role === 'system' ? 'bg-orange-500/10 border border-orange-500/50 text-orange-400 font-mono text-[10px]' : 
                    'bg-slate-800/80 border border-slate-700/50 text-slate-300'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-slate-800/50 shrink-0 bg-slate-900">
          <form onSubmit={e => sendToBackend(e)} className="flex gap-2">
            <input 
              value={input} onChange={e => setInput(e.target.value)} disabled={isStreaming}
              placeholder={isStreaming ? '...' : 'Message Neuromotor...'}
              className="flex-1 bg-black/40 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500/70"
            />
            <button type="submit" disabled={!input.trim() || isStreaming} className="bg-indigo-600 p-2 rounded-lg text-white disabled:opacity-50"><Send size={14}/></button>
          </form>
        </div>
      </div>

      {/* ── Center Pane: 3D Brain (40%) ── */}
      <div className="w-[40%] flex flex-col relative z-10 border-r border-slate-800/50">
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between pointer-events-none">
          <h1 className="text-xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">NEUROMOTOR</h1>
        </div>
        
        <div className="flex-1 bg-black/40">
          <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-slate-500 tracking-widest">BOOTING NEURAL ENGINE...</div>}>
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
              <Brain3D activeNodes={activeNodes} />
            </Canvas>
          </Suspense>
        </div>
        
        <div className="h-12 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/50 flex items-center px-4 gap-4">
          <motion.div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" animate={isStreaming ? { opacity: [1, 0.2, 1] } : { opacity: 1 }} transition={{ repeat: Infinity }} />
          <span className="text-[9px] font-bold tracking-[0.2em] text-cyan-400">{statusText}</span>
          <div className="flex-1" />
          <div className="flex gap-1">
            {['syntax', 'logic', 'security'].map(n => (
              <div key={n} className={`w-2 h-2 rounded-full transition-all duration-300 ${activeNodes.has(n) ? 'bg-indigo-500 shadow-[0_0_15px_#6366f1]' : 'bg-slate-800'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Pane: Swarm Command Center (35%) ── */}
      <div className="w-[35%] flex flex-col relative z-20 bg-[#0f172a] opacity-95">
        
        <div className="h-16 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-md flex flex-col justify-center px-4 shrink-0 gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 tracking-widest flex items-center gap-1.5"><GitBranch size={12}/> SWARM TARGET</span>
            <button 
              onClick={(e) => sendToBackend(e, "Run a full swarm code review on this repository.", false)}
              disabled={isStreaming || !repoUrl}
              className="flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-500/50 text-indigo-400 px-3 py-1 rounded text-[10px] font-bold tracking-wider hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
            >
              <Play size={10} /> INITIATE AUDIT
            </button>
          </div>
          <input 
            type="text" 
            value={repoUrl} 
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full bg-black/30 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#0a0f1c] prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{reviewReport}</ReactMarkdown>
        </div>

      </div>

    </div>
  );
}
