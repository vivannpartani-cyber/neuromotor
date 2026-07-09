import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Camera, Shield, Code, Zap } from 'lucide-react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import { Canvas } from '@react-three/fiber';
import Brain3D from './Brain3D';

// ─────────────────────────────────────────
// Types & Metadata
// ─────────────────────────────────────────
type NodeKey = 'idle' | 'amygdala' | 'hippocampus' | 'syntax' | 'logic' | 'security' | 'frontal_lobe' | 'end' | 'error';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ─────────────────────────────────────────
// Chat Message
// ─────────────────────────────────────────
function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mb-6 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div 
        className={`max-w-[90%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-lg backdrop-blur-md ${
          isUser 
            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-none rounded-[18px_18px_4px_18px]'
            : 'bg-slate-900/60 border border-slate-700/50 text-slate-200 rounded-[18px_18px_18px_4px]'
        }`}
      >
        {message.content}
      </div>
      <div className="text-[10px] text-slate-500 mt-1">
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// App
// ─────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant', timestamp: new Date(),
    content: `Neuromotor V5: Neural Network Coding Agent.\n\nRunning Parallel Hidden Layers:\n- Syntax Node (Blue)\n- Logic Node (Yellow)\n- Security Node (Red)\n\nSubmit a coding task to activate parallel execution.`,

  }]);
  
  const [input, setInput] = useState('');
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set(['idle']));
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText]  = useState('SYSTEM READY');
  
  // Biometric State
  const webcamRef = useRef<Webcam>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [emotion, setEmotion] = useState<string>('neutral');

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
      }
    }
    setTimeout(detectEmotion, 500);
  }, [modelsLoaded]);

  useEffect(() => { if (modelsLoaded) detectEmotion(); }, [modelsLoaded, detectEmotion]);

  const sendToBackend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    
    const query = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: query, timestamp: new Date() }]);
    setInput('');
    setIsStreaming(true); 
    setActiveNodes(new Set(['amygdala'])); 
    setStatusText('INPUT LAYER (AMYGDALA) ANALYZING...');

    try {
      const res = await fetch('http://localhost:8000/chat', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ message: query, emotion_state: emotion }) 
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; let finalResp = '';
      
      // Parallel node tracking
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
              // Add node to active set
              currentActive.add(event.node);
              setActiveNodes(new Set(currentActive));
              
              if (['syntax', 'logic', 'security'].includes(event.node)) {
                setStatusText('HIDDEN LAYER: PARALLEL PROCESSING...');
              } else if (event.node === 'frontal_lobe') {
                currentActive.clear(); // Clear parallel nodes when frontal lobe starts
                currentActive.add('frontal_lobe');
                setActiveNodes(new Set(currentActive));
                setStatusText('OUTPUT LAYER: SYNTHESIZING...');
              }
            }
          } catch { /* skip */ }
        }
      }

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: finalResp || 'No response generated.', timestamp: new Date() }]);
    } catch (err: any) {
      setActiveNodes(new Set()); setStatusText('SYSTEM ERROR');
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', timestamp: new Date(), content: `⚠️ ${err.message}` }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] font-sans overflow-hidden text-slate-200">
      
      {/* ── Left: Massive 3D Neural Network (65%) ── */}
      <div className="w-[65%] flex flex-col relative z-10 border-r border-slate-800/50 shadow-2xl">
        
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start pointer-events-none">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              NEUROMOTOR
            </h1>
            <div className="text-[10px] font-bold tracking-[0.3em] text-cyan-500/80 mt-1 uppercase">
              V5 Parallel Neural Network
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex gap-4 bg-slate-900/60 backdrop-blur-md p-3 rounded-xl border border-slate-800/50">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_10px_#3b82f6]"/><span className="text-[9px] font-bold tracking-widest text-slate-300">SYNTAX NODE</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#eab308] shadow-[0_0_10px_#eab308]"/><span className="text-[9px] font-bold tracking-widest text-slate-300">LOGIC NODE</span></div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ef4444] shadow-[0_0_10px_#ef4444]"/><span className="text-[9px] font-bold tracking-widest text-slate-300">SECURITY NODE</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]"/><span className="text-[9px] font-bold tracking-widest text-slate-300">FRONTAL LOBE</span></div>
            </div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 bg-black/40">
          <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-slate-500 tracking-widest">BOOTING NEURAL ENGINE...</div>}>
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
              <Brain3D activeNodes={activeNodes} />
            </Canvas>
          </Suspense>
        </div>

        
        {/* Network Status Footer */}
        <div className="h-16 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/50 flex items-center px-6 gap-6">
          <div className="flex items-center gap-3">
             <motion.div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" animate={isStreaming ? { opacity: [1, 0.2, 1] } : { opacity: 1 }} transition={{ repeat: Infinity }} />
             <span className="text-[11px] font-bold tracking-[0.2em] text-cyan-400">{statusText}</span>
          </div>
          
          <div className="flex-1" />
          
          {/* Active Nodes Indicators */}
          <div className="flex gap-2">
            {['amygdala', 'syntax', 'logic', 'security', 'frontal_lobe'].map(n => (
              <div key={n} className={`px-3 py-1 rounded border text-[9px] font-bold tracking-widest uppercase transition-all duration-300 ${activeNodes.has(n) ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                {n.replace('_', ' ')}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Floating Chat Terminal (35%) ── */}
      <div className="w-[35%] flex flex-col relative z-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-repeat opacity-95">
        
        {/* Biometric Observer Header */}
        <div className="p-4 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0 h-[100px]">
          <div>
            <span className="text-[10px] font-bold text-slate-500 tracking-widest block mb-1">BIOMETRIC OBSERVER</span>
            <div className="flex items-center gap-2">
              <Camera size={14} className={emotion !== 'neutral' ? "text-orange-400" : "text-cyan-400"} />
              <span className={`text-xs font-bold uppercase tracking-wider ${emotion !== 'neutral' ? "text-orange-400" : "text-cyan-400"}`}>{emotion}</span>
            </div>
          </div>
          
          <div className="w-[100px] h-full bg-black rounded-lg border border-slate-800 overflow-hidden relative shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center">
            {!modelsLoaded && <span className="text-[8px] text-slate-500 absolute z-10 text-center">LOADING...</span>}
            <Webcam
              ref={webcamRef}
              muted={true}
              videoConstraints={{ facingMode: "user" }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col custom-scrollbar">
          <AnimatePresence>
            {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
          </AnimatePresence>

          {isStreaming && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex mb-4">
              <div className="flex gap-1.5 p-4 bg-slate-900/60 border border-slate-700/50 rounded-[18px_18px_18px_4px] items-center">
                {[0,1,2].map(i => <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500" animate={{ opacity: [0.3,1,0.3], y: [0,-3,0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-800/50 bg-slate-900/90 backdrop-blur-xl shrink-0">
          <form onSubmit={sendToBackend} className="flex flex-col gap-2">
            <textarea 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              disabled={isStreaming}
              rows={3}
              placeholder={isStreaming ? 'Neural Network processing...' : 'Submit a coding task...'}
              className="w-full bg-black/40 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500/70 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all placeholder:text-slate-600 disabled:opacity-50 resize-none custom-scrollbar"
            />
            <motion.button 
              type="submit" 
              disabled={!input.trim() || isStreaming}
              whileHover={input.trim() && !isStreaming ? { scale: 1.01 } : {}} 
              whileTap={input.trim() && !isStreaming ? { scale: 0.99 } : {}}
              className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold tracking-wider transition-all ${
                input.trim() && !isStreaming 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' 
                  : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              <Send size={16} /> INITIALIZE PARALLEL EXECUTION
            </motion.button>
          </form>
        </div>

      </div>
    </div>
  );
}
