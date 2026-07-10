import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Camera, AlertTriangle, GitBranch, Terminal, Building2, Shield, MessageSquare, Zap, Flame, Brain, Eye, Code2, Cpu, ChevronRight, Activity } from 'lucide-react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import { Canvas } from '@react-three/fiber';
import ReactMarkdown from 'react-markdown';
import Brain3D from './Brain3D';

type Mode = 'chat' | 'debug' | 'architect' | 'security';
interface Message { id: string; role: 'user' | 'assistant' | 'system'; content: string; }

const MODES: { id: Mode; icon: React.ReactNode; label: string; placeholder: string; hint: string; regions: string[] }[] = [
  { id: 'chat',     icon: <MessageSquare size={13} />, label: 'Chat',          placeholder: 'Ask me anything — explain, refactor, generate code...', hint: 'General coding assistant. All brain regions fire.', regions: ['amygdala','hippocampus','wernicke','parietal','temporal','prefrontal','broca','cerebellum'] },
  { id: 'debug',    icon: <Terminal size={13} />,      label: 'Debug',         placeholder: 'Paste broken code or describe the bug...',              hint: 'Parietal traces execution. Temporal hunts anti-patterns.', regions: ['amygdala','wernicke','parietal','temporal','prefrontal','broca','cerebellum'] },
  { id: 'architect',icon: <Building2 size={13} />,    label: 'Architect',     placeholder: 'Describe your app or system to design...',              hint: 'Prefrontal plans the architecture. Broca generates scaffolding.', regions: ['amygdala','hippocampus','wernicke','temporal','prefrontal','broca','cerebellum'] },
  { id: 'security', icon: <Shield size={13} />,       label: 'Security Scan', placeholder: 'Paste a GitHub URL or paste code to audit...',          hint: 'Temporal hunts vulnerabilities. Parietal traces exploit paths.', regions: ['amygdala','wernicke','parietal','temporal','prefrontal','broca','cerebellum'] },
];

const REGION_COLORS: Record<string, string> = {
  amygdala:'#f97316', hippocampus:'#a855f7', wernicke:'#06b6d4',
  parietal:'#3b82f6', temporal:'#10b981',    prefrontal:'#6366f1',
  broca:'#f43f5e',    cerebellum:'#eab308',
};

const REGION_INFO = [
  { key:'prefrontal',  label:'Prefrontal Cortex', desc:'Plans architecture and structures the response strategy', color:'#6366f1' },
  { key:'temporal',    label:'Temporal Lobe',      desc:'Hunts anti-patterns, code smells and vulnerabilities',  color:'#10b981' },
  { key:'parietal',    label:'Parietal Lobe',      desc:'Traces execution paths and locates logic bugs',         color:'#3b82f6' },
  { key:'wernicke',    label:"Wernicke's Area",    desc:'Comprehends your query and extracts intent',            color:'#06b6d4' },
  { key:'broca',       label:"Broca's Area",       desc:'Generates polished, production-quality code output',    color:'#f43f5e' },
  { key:'amygdala',    label:'Amygdala',           desc:'Reads your biometric emotion state from the webcam',    color:'#f97316' },
  { key:'hippocampus', label:'Hippocampus',        desc:'Recalls your long-term session memory and context',     color:'#a855f7' },
  { key:'cerebellum',  label:'Cerebellum',         desc:'Refines and polishes the final output quality',         color:'#eab308' },
];

// ─── Landing Page ───────────────────────────────────────────────────────────
function LandingPage({ onStart }: { onStart: () => void }) {
  const [activeNodes] = useState(new Set<string>());

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-200 overflow-x-hidden font-sans">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-indigo-400" />
          <span className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">NEUROMOTOR</span>
        </div>
        <span className="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold tracking-widest">BETA</span>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col lg:flex-row items-center min-h-[92vh] px-8 lg:px-20 gap-12 py-16">
        {/* Text */}
        <div className="flex-1 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold tracking-widest mb-6">
              <Activity size={10} className="animate-pulse" />
              NEURAL DEV BRAIN — V12
            </div>
            <h1 className="text-5xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
              <span className="text-white">Your code gets</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400">a real brain.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-xl">
              Neuromotor routes every prompt through <strong className="text-slate-200">8 anatomical AI lobes</strong> — each specialised like the real thing. It reads your face through the webcam, plans architectures, hunts bugs, and writes production-ready code. All in real-time.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              {[{icon:<Eye size={12}/>,text:'Biometric Amygdala'},{icon:<Brain size={12}/>,text:'8 Specialised Lobes'},{icon:<Code2 size={12}/>,text:'Neural Sandbox'},{icon:<Flame size={12}/>,text:'Hyper-Focus Overdrive'}].map(f=>(
                <div key={f.text} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700/50 bg-slate-800/40 text-slate-400 text-[11px] font-bold tracking-wide">
                  <span className="text-indigo-400">{f.icon}</span>{f.text}
                </div>
              ))}
            </div>
            <motion.button onClick={onStart} whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(99,102,241,0.5)' }} whileTap={{ scale: 0.98 }}
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black text-base tracking-widest shadow-[0_0_25px_rgba(99,102,241,0.35)] transition-all overflow-hidden">
              <Cpu size={18} className="group-hover:rotate-12 transition-transform" />
              TRY BETA NOW
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <p className="text-[10px] text-slate-600 mt-4 tracking-wide">No login required · Free beta · Runs locally</p>
          </motion.div>
        </div>

        {/* 3D Brain */}
        <motion.div className="flex-1 w-full max-w-xl h-[500px] lg:h-[620px] relative"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2 }}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[360px] h-[360px] rounded-full bg-indigo-600/15 blur-[60px]" />
          </div>
          <Suspense fallback={<div className="h-full flex items-center justify-center text-[11px] text-slate-600 tracking-widest">BOOTING NEURAL ENGINE...</div>}>
            <Canvas camera={{ position: [0, 0, 5.5], fov: 50 }}>
              <Brain3D activeNodes={activeNodes} nodeLabel="" overdrive={false} />
            </Canvas>
          </Suspense>
        </motion.div>
      </section>

      {/* 8 Lobes Grid */}
      <section className="relative z-10 px-8 lg:px-20 py-20 border-t border-white/5">
        <div className="text-center mb-14">
          <div className="text-[10px] font-bold tracking-[0.25em] text-slate-600 mb-3">ANATOMICAL ARCHITECTURE</div>
          <h2 className="text-3xl lg:text-4xl font-black text-white">8 lobes. One brain.</h2>
          <p className="text-slate-500 mt-3 text-sm max-w-lg mx-auto">Every prompt fires a real signal cascade through each specialised region — just like neuroscience.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {REGION_INFO.map((r, i) => (
            <motion.div key={r.key} initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: i*0.07 }}
              className="group relative p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm hover:border-slate-600/60 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${r.color}18, transparent 70%)` }} />
              <div className="w-2 h-2 rounded-full mb-3" style={{ backgroundColor: r.color, boxShadow: `0 0 10px ${r.color}` }} />
              <div className="text-[11px] font-black text-white tracking-wide mb-1">{r.label}</div>
              <div className="text-[10px] text-slate-500 leading-relaxed">{r.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="relative z-10 px-8 lg:px-20 py-16 border-t border-white/5">
        <div className="grid lg:grid-cols-3 gap-8">
          {[
            { color:'orange', icon:<Eye size={18} className="text-orange-400"/>, title:'Biometric Amygdala', body:'Your webcam feeds your face into a real-time emotion classifier. Look frustrated for 4 seconds and the Amygdala autonomously fires a debug cycle — no typing required.' },
            { color:'cyan',   icon:<Code2 size={18} className="text-cyan-400"/>, title:'Neural Sandbox', body:"When Broca's Area writes frontend code, it's instantly rendered in a live preview panel. See your app running inside Neuromotor — no copy-pasting needed." },
            { color:'rose',   icon:<Flame size={18} className="text-rose-400"/>, title:'Hyper-Focus Overdrive', body:'Toggle Overdrive and the brain goes red. System prompts shift to maximum intensity, forcing the models to produce extreme, verbose, fully self-contained output.' },
          ].map(f => (
            <motion.div key={f.title} initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              className={`p-7 rounded-3xl border border-${f.color}-500/20 bg-gradient-to-br from-${f.color}-500/5 to-transparent`}>
              <div className={`w-10 h-10 rounded-2xl bg-${f.color}-500/15 border border-${f.color}-500/30 flex items-center justify-center mb-5`}>{f.icon}</div>
              <h3 className="text-lg font-black text-white mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-8 lg:px-20 py-24 border-t border-white/5 text-center">
        <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">Ready to think faster?</h2>
          <p className="text-slate-500 mb-10 text-base max-w-md mx-auto">Boot the neural engine, point your webcam, and start building. Your brain awaits.</p>
          <motion.button onClick={onStart} whileHover={{ scale:1.03, boxShadow:'0 0 50px rgba(99,102,241,0.5)' }} whileTap={{ scale:0.97 }}
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-black text-lg tracking-widest shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all">
            <Brain size={20} />BOOT NEUROMOTOR
          </motion.button>
        </motion.div>
      </section>

      <div className="relative z-10 border-t border-white/5 px-8 lg:px-20 py-6 flex items-center justify-between text-[10px] text-slate-700 font-mono">
        <span>NEUROMOTOR V12 · BETA</span>
        <span>BUILT WITH LANGGRAPH · LLAMA 3 · THREE.JS</span>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────
function MainApp() {
  const [mode, setMode] = useState<Mode>('chat');
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant',
    content: `## Neuromotor V12\n\nWelcome. I'm your Neural Dev Brain — 8 anatomical AI lobes routing your requests in real-time.\n\n**Select a mode above** and fire away. If you look frustrated, the Amygdala will auto-trigger a debug cycle!`,
  }]);
  const [overdrive, setOverdrive] = useState(false);
  const [sandboxCode, setSandboxCode] = useState<{html:string,css:string,js:string}|null>(null);
  const [input, setInput] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [activeLabel, setActiveLabel] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText] = useState('SYSTEM IDLE');
  const [firingSequence, setFiringSequence] = useState<{node:string,label:string}[]>([]);
  const webcamRef = useRef<Webcam>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [emotion, setEmotion] = useState('neutral');
  const emotionStreak = useRef({ emotion:'neutral', startTime:0 });
  const [autoTriggered, setAutoTriggered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch {}
    })();
  }, []);

  const detectEmotion = useCallback(async () => {
    if (webcamRef.current?.video?.readyState === 4 && modelsLoaded) {
      const det = await faceapi.detectSingleFace(webcamRef.current.video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
      if (det) {
        const top = Object.entries(det.expressions).sort((a,b)=>b[1]-a[1])[0][0];
        setEmotion(top);
        const now = Date.now();
        if (top==='angry'||top==='sad') {
          if (emotionStreak.current.emotion!==top) { emotionStreak.current={emotion:top,startTime:now}; }
          else if (now-emotionStreak.current.startTime>4000&&!isStreaming) { emotionStreak.current={emotion:'neutral',startTime:now}; handleAutoDebug(); }
        } else { emotionStreak.current={emotion:top,startTime:now}; }
      }
    }
    setTimeout(detectEmotion, 1500);
  }, [modelsLoaded, isStreaming]);

  useEffect(() => { if (modelsLoaded) detectEmotion(); }, [modelsLoaded, detectEmotion]);

  const handleAutoDebug = () => {
    setAutoTriggered(true); setTimeout(()=>setAutoTriggered(false),3000);
    setMessages(prev=>[...prev,{id:Date.now().toString(),role:'system',content:'⚡ AUTONOMOUS TRIGGER: Frustration detected. Emergency debug cycle initiated.'}]);
    runInference("Amygdala detected frustration. Emergency debug: analyze my code and explain what's wrong.",'debug');
  };

  const runInference = async (query:string, runMode:Mode) => {
    if (!query.trim()||isStreaming) return;
    setIsStreaming(true); setActiveNodes(new Set(['amygdala'])); setActiveLabel('Amygdala · Threat Detection');
    setStatusText('AMYGDALA FIRING...'); setFiringSequence([]);
    try {
      const body: any = { message:query, emotion_state:emotion, mode:runMode, overdrive };
      if (runMode==='security'&&repoUrl) body.repo_url=repoUrl;
      if (input) body.editor_code=input;
      const res = await fetch('http://localhost:8000/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader=res.body!.getReader(); const decoder=new TextDecoder(); let buffer='';
      while(true) {
        const {done,value}=await reader.read(); if(done) break;
        buffer+=decoder.decode(value,{stream:true}); const lines=buffer.split('\n'); buffer=lines.pop()??'';
        for(const line of lines) {
          if(!line.startsWith('data: ')) continue;
          try {
            const ev=JSON.parse(line.slice(6));
            if(ev.node==='end') {
              setActiveNodes(new Set()); setActiveLabel(''); setStatusText('SYSTEM READY');
              setMessages(prev=>[...prev,{id:Date.now().toString(),role:'assistant',content:ev.response}]);
              const extract=(text:string,lang:string)=>{const m=text.match(new RegExp('```'+lang+'\\n([\\s\\S]*?)```','i'));return m?m[1]:'';};
              const html=extract(ev.response,'html'),css=extract(ev.response,'css'),js=extract(ev.response,'javascript')||extract(ev.response,'js');
              if(html||css||js) setSandboxCode({html,css,js});
            } else if(ev.node==='error') { throw new Error(ev.error);
            } else if(ev.node==='system') { setStatusText(ev.message);
            } else { setActiveNodes(new Set([ev.node])); setActiveLabel(ev.label||ev.node); setStatusText((ev.label||ev.node).toUpperCase()+'...'); setFiringSequence(p=>[...p,{node:ev.node,label:ev.label||ev.node}]); }
          } catch {}
        }
      }
    } catch(err:any) {
      setActiveNodes(new Set()); setStatusText('ERROR');
      setMessages(prev=>[...prev,{id:Date.now().toString(),role:'assistant',content:`⚠️ ${err.message}`}]);
    } finally { setIsStreaming(false); }
  };

  const handleSubmit=(e:React.FormEvent)=>{
    e.preventDefault(); const q=input.trim(); if(!q) return;
    setMessages(prev=>[...prev,{id:Date.now().toString(),role:'user',content:q}]); setInput(''); runInference(q,mode);
  };

  const currentMode=MODES.find(m=>m.id===mode)!;

  const renderSandbox=()=>{
    if(!sandboxCode) return null;
    const srcDoc=`<html><head><style>${sandboxCode.css}</style></head><body>${sandboxCode.html}<script>${sandboxCode.js}</script></body></html>`;
    return (
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-100 shrink-0">
          <span className="text-[10px] font-bold text-slate-800 tracking-widest">LIVE PREVIEW</span>
          <button onClick={()=>setSandboxCode(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-300 px-2 py-0.5 rounded">CLOSE</button>
        </div>
        <iframe srcDoc={srcDoc} title="Live Preview" className="w-full flex-1 border-none" sandbox="allow-scripts" />
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* LEFT */}
      <div className="w-[25%] flex flex-col border-r border-slate-800/60 bg-slate-900/80 backdrop-blur-xl">
        <div className="p-3 border-b border-slate-800/50 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[0.18em] text-slate-500">BIOMETRIC OBSERVER</span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${emotion==='angry'||emotion==='sad'?'border-orange-500/50 text-orange-400 bg-orange-500/10':'border-cyan-700/50 text-cyan-400 bg-cyan-500/5'}`}>
              <Camera size={9}/>{emotion}
            </div>
          </div>
          <div className={`relative h-36 rounded-lg overflow-hidden border ${autoTriggered?'border-orange-500 shadow-[0_0_20px_#f97316]':'border-slate-800'} transition-all`}>
            {!modelsLoaded&&<div className="absolute inset-0 flex items-center justify-center text-[9px] text-slate-600">LOADING MODELS...</div>}
            <Webcam ref={webcamRef} muted videoConstraints={{facingMode:'user'}} style={{width:'100%',height:'100%',objectFit:'cover',opacity:0.7}}/>
            {autoTriggered&&<div className="absolute inset-0 flex items-center justify-center bg-orange-500/20"><span className="text-[10px] font-bold text-orange-400 flex items-center gap-1"><AlertTriangle size={11}/> AUTO-DEBUG</span></div>}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_3px] pointer-events-none"/>
          </div>
        </div>
        {firingSequence.length>0&&(
          <div className="px-3 py-2 border-b border-slate-800/50 shrink-0">
            <div className="text-[8px] font-bold tracking-[0.15em] text-slate-600 mb-1">FIRING SEQUENCE</div>
            <div className="flex flex-col gap-0.5">
              {firingSequence.map((f,i)=>(
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor:REGION_COLORS[f.node]||'#64748b'}}/>
                  <span className="text-[9px] text-slate-400 font-mono">{f.label}</span>
                </div>
              ))}
              {isStreaming&&<div className="flex items-center gap-1.5 ml-0.5"><div className="w-1 h-1 rounded-full bg-slate-600 animate-pulse"/><span className="text-[9px] text-slate-600 font-mono">processing...</span></div>}
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <AnimatePresence>
            {messages.map(msg=>(
              <motion.div key={msg.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className={`flex flex-col ${msg.role==='user'?'items-end':'items-start'}`}>
                <div className={`px-3 py-2 text-xs leading-relaxed rounded-xl max-w-full break-words ${msg.role==='user'?'bg-indigo-600 text-white':msg.role==='system'?'bg-orange-500/10 border border-orange-500/40 text-orange-400 font-mono text-[10px]':'bg-slate-800/70 border border-slate-700/40 text-slate-300 prose prose-invert prose-xs max-w-none'}`}>
                  {msg.role==='assistant'?<ReactMarkdown>{msg.content}</ReactMarkdown>:msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef}/>
        </div>
        <div className="p-3 border-t border-slate-800/50 shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} disabled={isStreaming} placeholder={isStreaming?'Brain is thinking...':currentMode.placeholder}
              className="flex-1 bg-black/40 border border-slate-700/50 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500/60 placeholder:text-slate-600"/>
            <button type="submit" disabled={!input.trim()||isStreaming} className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg disabled:opacity-40 transition-colors"><Send size={13}/></button>
          </form>
          {mode==='security'&&(
            <div className="flex gap-2 mt-2">
              <input value={repoUrl} onChange={e=>setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repo"
                className="flex-1 bg-black/30 border border-slate-700/40 rounded px-2 py-1 text-[10px] outline-none focus:border-emerald-500/50 placeholder:text-slate-700"/>
              <button onClick={()=>{runInference('Run a full security audit on this codebase.','security');}} disabled={!repoUrl||isStreaming}
                className="text-[10px] bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 px-2 py-1 rounded disabled:opacity-40 hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                <GitBranch size={9}/> Audit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CENTER */}
      <div className="w-[45%] flex flex-col relative border-r border-slate-800/60">
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between pointer-events-none">
          <h1 className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 drop-shadow-[0_0_20px_rgba(99,102,241,0.6)]">NEUROMOTOR</h1>
        </div>
        <div className="absolute top-14 left-0 right-0 z-20 flex justify-center pointer-events-auto">
          <div className="flex gap-1 bg-black/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-1">
            {MODES.map(m=>(
              <button key={m.id} onClick={()=>setMode(m.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${mode===m.id?'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]':'text-slate-500 hover:text-slate-300'}`}>
                {m.icon}{m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <Suspense fallback={<div className="h-full flex items-center justify-center text-[10px] text-slate-600 tracking-widest">BOOTING NEURAL ENGINE...</div>}>
            <Canvas camera={{position:[0,0,5.5],fov:50}}>
              <Brain3D activeNodes={activeNodes} nodeLabel={activeLabel} overdrive={overdrive}/>
            </Canvas>
          </Suspense>
        </div>
        <div className="h-10 bg-black/60 border-t border-slate-800/60 backdrop-blur-xl flex items-center px-4 gap-3 shrink-0">
          <motion.div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:isStreaming?'#6366f1':'#10b981'}}
            animate={isStreaming?{opacity:[1,0.2,1],scale:[1,1.3,1]}:{}} transition={{repeat:Infinity,duration:0.8}}/>
          <span className="text-[9px] font-bold tracking-[0.15em] text-slate-400">{statusText}</span>
          <div className="flex-1"/>
          <div className="flex gap-1 items-center">
            {Object.entries(REGION_COLORS).map(([k,c])=>(
              <div key={k} className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                style={{backgroundColor:activeNodes.has(k)?c:'#1e293b',boxShadow:activeNodes.has(k)?`0 0 8px ${c}`:'none'}}/>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-[30%] flex flex-col bg-[#0a0f1c]">
        {sandboxCode ? renderSandbox() : (
          <>
            <div className="p-4 border-b border-slate-800/50 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">{currentMode.icon}</span>
                  <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">{currentMode.label} Mode</span>
                </div>
                <button onClick={()=>setOverdrive(!overdrive)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[8px] font-bold tracking-wider uppercase transition-colors border ${overdrive?'bg-rose-500/20 text-rose-400 border-rose-500/50':'bg-slate-800/50 text-slate-500 border-slate-700/50 hover:text-slate-300'}`}>
                  <Flame size={10}/> Hyper-Focus
                </button>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">{currentMode.hint}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {currentMode.regions.map(r=>(
                  <div key={r} className="flex items-center gap-1 bg-slate-800/50 px-1.5 py-0.5 rounded text-[8px] text-slate-400 font-mono">
                    <div className="w-1 h-1 rounded-full" style={{backgroundColor:REGION_COLORS[r]||'#64748b'}}/>{r}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-b border-slate-800/50 shrink-0">
              <div className="text-[9px] font-bold tracking-[0.15em] text-slate-600 mb-2">ANATOMICAL MAP</div>
              <div className="flex flex-col gap-1.5">
                {Object.entries(REGION_COLORS).map(([region,color])=>{
                  const isActive=activeNodes.has(region);
                  const labels:Record<string,string>={amygdala:'Amygdala',hippocampus:'Hippocampus',wernicke:"Wernicke's Area",parietal:'Parietal Lobe',temporal:'Temporal Lobe',prefrontal:'Prefrontal Cortex',broca:"Broca's Area",cerebellum:'Cerebellum'};
                  const descs:Record<string,string>={amygdala:'Threat Detection',hippocampus:'Memory Recall',wernicke:'Comprehension',parietal:'Logic Tracing',temporal:'Pattern Recognition',prefrontal:'Planning',broca:'Code Generation',cerebellum:'Refinement'};
                  return (
                    <div key={region} className={`flex items-center gap-2 transition-all duration-300 ${isActive?'opacity-100':'opacity-30'}`}>
                      <div className="w-2 h-2 rounded-full shrink-0 transition-all duration-300" style={{backgroundColor:color,boxShadow:isActive?`0 0 10px ${color}`:'none'}}/>
                      <div>
                        <div className="text-[9px] font-bold" style={{color:isActive?color:'#64748b'}}>{labels[region]}</div>
                        <div className="text-[8px] text-slate-600">{descs[region]}</div>
                      </div>
                      {isActive&&<div className="ml-auto"><Zap size={9} style={{color}}/></div>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-end">
              <div className="bg-indigo-950/40 border border-indigo-800/30 rounded-xl p-3">
                <div className="text-[9px] font-bold text-indigo-400 tracking-widest mb-1">💡 BIOMETRIC TIP</div>
                <p className="text-[10px] text-slate-500 leading-relaxed">Stare at the camera and look frustrated for 4 seconds. The Amygdala will detect your stress and autonomously trigger a debug cycle — no typing required.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────
export default function App() {
  const [isStarted, setIsStarted] = useState(false);
  return (
    <AnimatePresence mode="wait">
      {!isStarted ? (
        <motion.div key="landing" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,scale:0.98}} transition={{duration:0.5}}>
          <LandingPage onStart={()=>setIsStarted(true)}/>
        </motion.div>
      ) : (
        <motion.div key="app" className="h-screen" initial={{opacity:0,scale:1.02}} animate={{opacity:1,scale:1}} transition={{duration:0.5}}>
          <MainApp/>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
