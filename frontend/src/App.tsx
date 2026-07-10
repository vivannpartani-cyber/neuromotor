import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Camera, AlertTriangle, GitBranch, Terminal, Building2, Shield, MessageSquare, Zap } from 'lucide-react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import { Canvas } from '@react-three/fiber';
import ReactMarkdown from 'react-markdown';
import Brain3D from './Brain3D';

// ── Types ─────────────────────────────────────────────────────────────────
type Mode = 'chat' | 'debug' | 'architect' | 'security';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ── Mode config ───────────────────────────────────────────────────────────
const MODES: { id: Mode; icon: React.ReactNode; label: string; placeholder: string; hint: string; regions: string[] }[] = [
  {
    id: 'chat',
    icon: <MessageSquare size={13} />,
    label: 'Chat',
    placeholder: 'Ask me anything — explain, refactor, generate code...',
    hint: 'General coding assistant. All brain regions fire.',
    regions: ['amygdala','hippocampus','wernicke','parietal','temporal','prefrontal','broca','cerebellum'],
  },
  {
    id: 'debug',
    icon: <Terminal size={13} />,
    label: 'Debug',
    placeholder: 'Paste broken code or describe the bug...',
    hint: 'Parietal traces execution. Temporal hunts anti-patterns.',
    regions: ['amygdala','wernicke','parietal','temporal','prefrontal','broca','cerebellum'],
  },
  {
    id: 'architect',
    icon: <Building2 size={13} />,
    label: 'Architect',
    placeholder: 'Describe your app or system to design...',
    hint: 'Prefrontal plans the architecture. Broca generates scaffolding.',
    regions: ['amygdala','hippocampus','wernicke','temporal','prefrontal','broca','cerebellum'],
  },
  {
    id: 'security',
    icon: <Shield size={13} />,
    label: 'Security Scan',
    placeholder: 'Paste a GitHub URL or paste code to audit...',
    hint: 'Temporal hunts vulnerabilities. Parietal traces exploit paths.',
    regions: ['amygdala','wernicke','parietal','temporal','prefrontal','broca','cerebellum'],
  },
];

// ── Region color map (must match Brain3D) ─────────────────────────────────
const REGION_COLORS: Record<string, string> = {
  amygdala:    '#f97316',
  hippocampus: '#a855f7',
  wernicke:    '#06b6d4',
  parietal:    '#3b82f6',
  temporal:    '#10b981',
  prefrontal:  '#6366f1',
  broca:       '#f43f5e',
  cerebellum:  '#eab308',
};

// ── Component ─────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<Mode>('chat');
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant',
    content: `## Neuromotor V9 — The Neural Dev Brain\n\nThis is a **true simulation of the human brain for developers**. Each anatomical region has a real job:\n\n- 🟠 **Amygdala** — detects your stress/frustration via webcam\n- 🟣 **Hippocampus** — recalls your past sessions\n- 🔵 **Wernicke's Area** — reads and comprehends your code\n- 💙 **Parietal Lobe** — traces execution, hunts bugs\n- 🟢 **Temporal Lobe** — detects anti-patterns & security issues\n- 🟤 **Prefrontal Cortex** — plans the response architecture\n- 🔴 **Broca's Area** — writes the code and explanation\n- 🟡 **Cerebellum** — refines style and polish\n\n**Select a mode above**, then watch the brain fire in sequence.`,
  }]);

  const [input, setInput]         = useState('');
  const [repoUrl, setRepoUrl]     = useState('');
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [activeLabel, setActiveLabel] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText]   = useState('SYSTEM IDLE');
  const [firingSequence, setFiringSequence] = useState<{node: string, label: string}[]>([]);

  // Biometric
  const webcamRef   = useRef<Webcam>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [emotion, setEmotion]           = useState('neutral');
  const emotionStreak = useRef({ emotion: 'neutral', startTime: 0 });
  const [autoTriggered, setAutoTriggered] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Load face-api models
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch { /* silent */ }
    })();
  }, []);

  const detectEmotion = useCallback(async () => {
    if (webcamRef.current?.video?.readyState === 4 && modelsLoaded) {
      const det = await faceapi
        .detectSingleFace(webcamRef.current.video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();
      if (det) {
        const top = Object.entries(det.expressions).sort((a, b) => b[1] - a[1])[0][0];
        setEmotion(top);
        const now = Date.now();
        if (top === 'angry' || top === 'sad') {
          if (emotionStreak.current.emotion !== top) {
            emotionStreak.current = { emotion: top, startTime: now };
          } else if (now - emotionStreak.current.startTime > 4000 && !isStreaming) {
            emotionStreak.current = { emotion: 'neutral', startTime: now };
            handleAutoDebug();
          }
        } else {
          emotionStreak.current = { emotion: top, startTime: now };
        }
      }
    }
    setTimeout(detectEmotion, 600);
  }, [modelsLoaded, isStreaming]);

  useEffect(() => { if (modelsLoaded) detectEmotion(); }, [modelsLoaded, detectEmotion]);

  const handleAutoDebug = () => {
    setAutoTriggered(true);
    setTimeout(() => setAutoTriggered(false), 3000);
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'system',
      content: '⚡ AUTONOMOUS TRIGGER: Frustration detected. Emergency debug cycle initiated.'
    }]);
    runInference('Amygdala detected frustration. Emergency debug: analyze my code and explain what\'s wrong.', 'debug');
  };

  const runInference = async (query: string, runMode: Mode) => {
    if (!query.trim() || isStreaming) return;
    setIsStreaming(true);
    setActiveNodes(new Set(['amygdala']));
    setActiveLabel('Amygdala · Threat Detection');
    setStatusText('AMYGDALA FIRING...');
    setFiringSequence([]);

    try {
      const body: any = {
        message: query,
        emotion_state: emotion,
        mode: runMode,
      };
      if (runMode === 'security' && repoUrl) body.repo_url = repoUrl;
      if (input) body.editor_code = input;

      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.node === 'end') {
              setActiveNodes(new Set());
              setActiveLabel('');
              setStatusText('SYSTEM READY');
              setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: ev.response }]);
            } else if (ev.node === 'error') {
              throw new Error(ev.error);
            } else if (ev.node === 'system') {
              setStatusText(ev.message);
            } else {
              // A brain region fired
              const nodeName = ev.node;
              const label    = ev.label || nodeName;
              setActiveNodes(new Set([nodeName]));
              setActiveLabel(label);
              setStatusText(label.toUpperCase() + '...');
              setFiringSequence(prev => [...prev, { node: nodeName, label }]);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: any) {
      setActiveNodes(new Set()); setStatusText('ERROR');
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `⚠️ ${err.message}` }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: query }]);
    setInput('');
    runInference(query, mode);
  };

  const currentMode = MODES.find(m => m.id === mode)!;

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">

      {/* ── LEFT: Biometric + Chat (25%) ─────────────────────────────── */}
      <div className="w-[25%] flex flex-col border-r border-slate-800/60 bg-slate-900/80 backdrop-blur-xl">

        {/* Webcam */}
        <div className="p-3 border-b border-slate-800/50 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[0.18em] text-slate-500">BIOMETRIC OBSERVER</span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${emotion === 'angry' || emotion === 'sad' ? 'border-orange-500/50 text-orange-400 bg-orange-500/10' : 'border-cyan-700/50 text-cyan-400 bg-cyan-500/5'}`}>
              <Camera size={9} />
              {emotion}
            </div>
          </div>
          <div className={`relative h-20 rounded-lg overflow-hidden border ${autoTriggered ? 'border-orange-500 shadow-[0_0_20px_#f97316]' : 'border-slate-800'} transition-all`}>
            {!modelsLoaded && <div className="absolute inset-0 flex items-center justify-center text-[9px] text-slate-600">LOADING MODELS...</div>}
            <Webcam ref={webcamRef} muted videoConstraints={{ facingMode: 'user' }} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
            {autoTriggered && (
              <div className="absolute inset-0 flex items-center justify-center bg-orange-500/20">
                <span className="text-[10px] font-bold text-orange-400 flex items-center gap-1"><AlertTriangle size={11}/> AUTO-DEBUG</span>
              </div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_3px] pointer-events-none" />
          </div>
        </div>

        {/* Firing Sequence Log */}
        {firingSequence.length > 0 && (
          <div className="px-3 py-2 border-b border-slate-800/50 shrink-0">
            <div className="text-[8px] font-bold tracking-[0.15em] text-slate-600 mb-1">FIRING SEQUENCE</div>
            <div className="flex flex-col gap-0.5">
              {firingSequence.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: REGION_COLORS[f.node] || '#64748b' }} />
                  <span className="text-[9px] text-slate-400 font-mono">{f.label}</span>
                </div>
              ))}
              {isStreaming && <div className="flex items-center gap-1.5 ml-0.5"><div className="w-1 h-1 rounded-full bg-slate-600 animate-pulse" /><span className="text-[9px] text-slate-600 font-mono">processing...</span></div>}
            </div>
          </div>
        )}

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
          <AnimatePresence>
            {messages.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-3 py-2 text-xs leading-relaxed rounded-xl max-w-full break-words ${
                  msg.role === 'user'      ? 'bg-indigo-600 text-white' :
                  msg.role === 'system'   ? 'bg-orange-500/10 border border-orange-500/40 text-orange-400 font-mono text-[10px]' :
                                            'bg-slate-800/70 border border-slate-700/40 text-slate-300 prose prose-invert prose-xs max-w-none'
                }`}>
                  {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-800/50 shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input} onChange={e => setInput(e.target.value)}
              disabled={isStreaming}
              placeholder={isStreaming ? 'Brain is thinking...' : currentMode.placeholder}
              className="flex-1 bg-black/40 border border-slate-700/50 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500/60 placeholder:text-slate-600"
            />
            <button type="submit" disabled={!input.trim() || isStreaming} className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg disabled:opacity-40 transition-colors">
              <Send size={13} />
            </button>
          </form>
          {mode === 'security' && (
            <div className="flex gap-2 mt-2">
              <input
                value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="flex-1 bg-black/30 border border-slate-700/40 rounded px-2 py-1 text-[10px] outline-none focus:border-emerald-500/50 placeholder:text-slate-700"
              />
              <button onClick={() => { runInference('Run a full security audit on this codebase.', 'security'); }} disabled={!repoUrl || isStreaming} className="text-[10px] bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 px-2 py-1 rounded disabled:opacity-40 hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                <GitBranch size={9}/> Audit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── CENTER: 3D Brain (45%) ──────────────────────────────────────── */}
      <div className="w-[45%] flex flex-col relative border-r border-slate-800/60">

        {/* Mode selector */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between pointer-events-none">
          <h1 className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 drop-shadow-[0_0_20px_rgba(99,102,241,0.6)]">
            NEUROMOTOR
          </h1>
        </div>

        {/* Mode tabs - absolute so they float over the brain */}
        <div className="absolute top-14 left-0 right-0 z-20 flex justify-center pointer-events-auto">
          <div className="flex gap-1 bg-black/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-1">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                  mode === m.id
                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {m.icon}{m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Brain canvas */}
        <div className="flex-1">
          <Suspense fallback={<div className="h-full flex items-center justify-center text-[10px] text-slate-600 tracking-widest">BOOTING NEURAL ENGINE...</div>}>
            <Canvas camera={{ position: [0, 0, 5.5], fov: 50 }}>
              <Brain3D activeNodes={activeNodes} nodeLabel={activeLabel} />
            </Canvas>
          </Suspense>
        </div>

        {/* Status bar */}
        <div className="h-10 bg-black/60 border-t border-slate-800/60 backdrop-blur-xl flex items-center px-4 gap-3 shrink-0">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isStreaming ? '#6366f1' : '#10b981' }}
            animate={isStreaming ? { opacity: [1, 0.2, 1], scale: [1, 1.3, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />
          <span className="text-[9px] font-bold tracking-[0.15em] text-slate-400">{statusText}</span>
          <div className="flex-1" />
          {/* Active region indicator dots */}
          <div className="flex gap-1 items-center">
            {Object.entries(REGION_COLORS).map(([k, c]) => (
              <div key={k} className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                style={{ backgroundColor: activeNodes.has(k) ? c : '#1e293b', boxShadow: activeNodes.has(k) ? `0 0 8px ${c}` : 'none' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Mode context panel (30%) ────────────────────────────── */}
      <div className="w-[30%] flex flex-col bg-[#0a0f1c]">

        <div className="p-4 border-b border-slate-800/50 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-indigo-400">{currentMode.icon}</span>
            <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">{currentMode.label} Mode</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">{currentMode.hint}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {currentMode.regions.map(r => (
              <div key={r} className="flex items-center gap-1 bg-slate-800/50 px-1.5 py-0.5 rounded text-[8px] text-slate-400 font-mono">
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: REGION_COLORS[r] || '#64748b' }} />
                {r}
              </div>
            ))}
          </div>
        </div>

        {/* Region legend */}
        <div className="p-4 border-b border-slate-800/50 shrink-0">
          <div className="text-[9px] font-bold tracking-[0.15em] text-slate-600 mb-2">ANATOMICAL MAP</div>
          <div className="flex flex-col gap-1.5">
            {Object.entries(REGION_COLORS).map(([region, color]) => {
              const isActive = activeNodes.has(region);
              return (
                <div key={region} className={`flex items-center gap-2 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-30'}`}>
                  <div className="w-2 h-2 rounded-full shrink-0 transition-all duration-300"
                    style={{ backgroundColor: color, boxShadow: isActive ? `0 0 10px ${color}` : 'none' }}
                  />
                  <div>
                    <div className="text-[9px] font-bold" style={{ color: isActive ? color : '#64748b' }}>
                      {MODES.flatMap(m => []).length >= 0 && (() => {
                        const labels: Record<string, string> = {
                          amygdala: "Amygdala", hippocampus: "Hippocampus",
                          wernicke: "Wernicke's Area", parietal: "Parietal Lobe",
                          temporal: "Temporal Lobe", prefrontal: "Prefrontal Cortex",
                          broca: "Broca's Area", cerebellum: "Cerebellum",
                        };
                        return labels[region] || region;
                      })()}
                    </div>
                    <div className="text-[8px] text-slate-600">
                      {({ amygdala:'Threat Detection', hippocampus:'Memory Recall', wernicke:'Comprehension', parietal:'Logic Tracing', temporal:'Pattern Recognition', prefrontal:'Planning', broca:'Code Generation', cerebellum:'Refinement' } as Record<string,string>)[region]}
                    </div>
                  </div>
                  {isActive && (
                    <div className="ml-auto">
                      <Zap size={9} style={{ color }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tip */}
        <div className="p-4 flex-1 flex flex-col justify-end">
          <div className="bg-indigo-950/40 border border-indigo-800/30 rounded-xl p-3">
            <div className="text-[9px] font-bold text-indigo-400 tracking-widest mb-1">💡 BIOMETRIC TIP</div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Stare at the camera and look frustrated for 4 seconds. The Amygdala will detect your stress and autonomously trigger a debug cycle — no typing required.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
