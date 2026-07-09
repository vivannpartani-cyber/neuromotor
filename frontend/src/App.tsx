import React, { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Activity, Mic, MicOff } from 'lucide-react';
import Brain3D from './Brain3D';

// ─────────────────────────────────────────
// Types & Metadata
// ─────────────────────────────────────────
type NodeKey = 'idle' | 'amygdala' | 'hippocampus' | 'frontal_lobe' | 'tools' | 'end' | 'error';

interface NodeData {
  threat_level?: number;
  emotional_tone?: string;
  topic_domain?: string;
  routing_note?: string;
  memories_found?: number;
  memory_summary?: string;
  repeat_topic?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  nodeHistory?: NodeKey[];
  nodeDataMap?: Record<string, NodeData>;
  routeType?: 'urgent' | 'normal';
  timestamp: Date;
  isSubvocal?: boolean; // True if it came from SpeechRecognition
}

const STATUS_LABELS: Record<string, string> = {
  amygdala:     'Amygdala assessing threat level...',
  hippocampus:  'Hippocampus searching Supermemory.ai graph...',
  frontal_lobe: 'Frontal Lobe reasoning with full briefing...',
  tools:        'Frontal Lobe executing web search...',
};

// ─────────────────────────────────────────
// Node Activity Panel (Glassmorphism)
// ─────────────────────────────────────────
function NodeActivityPanel({ activeNode, nodeDataMap }: { activeNode: NodeKey; nodeDataMap: Record<string, NodeData>; }) {
  const amygData  = nodeDataMap.amygdala;
  const hippoData = nodeDataMap.hippocampus;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Amygdala card */}
      <motion.div 
        animate={{ 
          borderColor: activeNode === 'amygdala' ? 'rgba(249, 115, 22, 0.5)' : amygData ? 'rgba(249, 115, 22, 0.2)' : 'rgba(30, 41, 59, 0.5)',
          background: activeNode === 'amygdala' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(15, 23, 42, 0.4)'
        }} 
        className="border rounded-xl p-3 backdrop-blur-md transition-colors"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${amygData ? 'bg-orange-500' : 'bg-slate-700'}`} style={{ boxShadow: activeNode === 'amygdala' ? '0 0 10px #f97316' : 'none' }} />
          <span className={`text-xs font-bold ${amygData ? 'text-orange-500' : 'text-slate-500'} uppercase tracking-wider`}>Amygdala</span>
          {activeNode === 'amygdala' && <motion.span animate={{ opacity: [1,0,1] }} transition={{ repeat: Infinity, duration: 0.7 }} className="ml-auto text-[10px] font-bold text-orange-500 tracking-widest">ACTIVE</motion.span>}
        </div>
        {amygData && (
          <div className="flex flex-wrap gap-2">
            {amygData.threat_level !== undefined && <Tag color="#f97316" label={`Threat ${amygData.threat_level}/10`} />}
            {amygData.emotional_tone && <Tag color="#f97316" label={amygData.emotional_tone} />}
            {amygData.topic_domain   && <Tag color="#f97316" label={amygData.topic_domain}   />}
          </div>
        )}
      </motion.div>

      {/* Hippocampus card */}
      <motion.div 
        animate={{ 
          borderColor: activeNode === 'hippocampus' ? 'rgba(168, 85, 247, 0.5)' : hippoData ? 'rgba(168, 85, 247, 0.2)' : 'rgba(30, 41, 59, 0.5)',
          background: activeNode === 'hippocampus' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(15, 23, 42, 0.4)'
        }} 
        className="border rounded-xl p-3 backdrop-blur-md transition-colors"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${hippoData ? 'bg-purple-500' : 'bg-slate-700'}`} style={{ boxShadow: activeNode === 'hippocampus' ? '0 0 10px #a855f7' : 'none' }} />
          <span className={`text-xs font-bold ${hippoData ? 'text-purple-500' : 'text-slate-500'} uppercase tracking-wider`}>Hippocampus</span>
          {activeNode === 'hippocampus' && <motion.span animate={{ opacity: [1,0,1] }} transition={{ repeat: Infinity, duration: 0.7 }} className="ml-auto text-[10px] font-bold text-purple-500 tracking-widest">ACTIVE</motion.span>}
        </div>
        {hippoData && (
          <div className="flex flex-wrap gap-2">
            <Tag color="#a855f7" label={`${hippoData.memories_found ?? 0} Memories`} />
            {hippoData.repeat_topic && <Tag color="#a855f7" label="Repeat Topic ↺" />}
          </div>
        )}
      </motion.div>

      {/* Frontal Lobe card */}
      <motion.div 
        animate={{ 
          borderColor: activeNode === 'frontal_lobe' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(30, 41, 59, 0.5)',
          background: activeNode === 'frontal_lobe' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.4)'
        }} 
        className="border rounded-xl p-3 backdrop-blur-md transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${activeNode === 'frontal_lobe' ? 'bg-emerald-500' : 'bg-slate-700'}`} style={{ boxShadow: activeNode === 'frontal_lobe' ? '0 0 10px #10b981' : 'none' }} />
          <span className={`text-xs font-bold ${activeNode === 'frontal_lobe' ? 'text-emerald-500' : 'text-slate-500'} uppercase tracking-wider`}>Frontal Lobe</span>
          {activeNode === 'frontal_lobe' && <motion.span animate={{ opacity: [1,0,1] }} transition={{ repeat: Infinity, duration: 0.7 }} className="ml-auto text-[10px] font-bold text-emerald-500 tracking-widest">ACTIVE</motion.span>}
        </div>
      </motion.div>
    </div>
  );
}

function Tag({ color, label }: { color: string; label: string }) {
  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, border: `1px solid ${color}40`, background: `${color}10`, color, fontWeight: 600 }}>{label}</span>;
}

// ─────────────────────────────────────────
// Chat Message
// ─────────────────────────────────────────
function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mb-6 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      
      {/* Subvocal Decoding Badge */}
      {isUser && message.isSubvocal && (
        <div className="mb-2 text-[10px] text-cyan-400 font-bold flex items-center gap-1 uppercase tracking-widest">
          <Mic size={10} /> Subvocal Thought Decoded
        </div>
      )}

      {/* Assistant Routing Badge */}
      {!isUser && message.nodeDataMap?.amygdala?.routing_note && (
        <div className="mb-2 max-w-[80%] flex flex-wrap items-center gap-2">
          {message.routeType === 'urgent' && <span className="text-[10px] px-2 py-0.5 rounded-full border border-orange-500/50 bg-orange-500/10 text-orange-500 font-bold">⚡ URGENT BYPASS</span>}
          <span className="text-[10px] text-slate-400 italic">"{message.nodeDataMap.amygdala.routing_note}"</span>
        </div>
      )}
      
      {/* Message Bubble */}
      <div 
        className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-lg backdrop-blur-md ${
          isUser 
            ? (message.isSubvocal ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white border-none rounded-[18px_18px_4px_18px]' : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-none rounded-[18px_18px_4px_18px]')
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
    content: `Corpus Callosum V3 is online.\n\n🧠 Neural Particle Engine: Active.\n💾 Supermemory Graph: Connected.\n🎙️ Subvocal Mode: Click the Microphone to speak your thoughts directly into the system.`,
  }]);
  
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);

  const [activeNode, setActiveNode] = useState<NodeKey>('idle');
  const [doneNodes, setDoneNodes]   = useState<Set<NodeKey>>(new Set());
  const [liveNodeData, setLiveNodeData] = useState<Record<string, NodeData>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText]  = useState('SYSTEM READY');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isStreaming, isListening, input]);

  // Setup Web Speech API
  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) {
          setInput(finalTranscript);
          setIsListening(false);
          sendToBackend(finalTranscript, true);
        } else {
          setInput(interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        setStatusText('SUBVOCAL ERROR');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setStatusText('SYSTEM READY');
    } else {
      if (recognitionRef.current) {
        setInput('');
        recognitionRef.current.start();
        setIsListening(true);
        setStatusText('LISTENING FOR SUBVOCAL THOUGHTS...');
      } else {
        alert("Your browser does not support the Web Speech API (Try Chrome).");
      }
    }
  };

  const sendToBackend = async (query: string, isSubvocal: boolean = false) => {
    if (!query.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: query, timestamp: new Date(), isSubvocal }]);
    setInput('');
    setIsStreaming(true); setDoneNodes(new Set()); setActiveNode('idle'); setLiveNodeData({}); setStatusText('CONNECTING...');

    const visited: NodeKey[] = [];
    const dataMap: Record<string, NodeData> = {};

    try {
      const res = await fetch('http://localhost:8000/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: query }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; let finalResp = '';

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
              finalResp = event.response; setActiveNode('end'); setStatusText('SYSTEM READY');
            } else if (event.node === 'error') {
              throw new Error(event.error);
            } else {
              const key = event.node as NodeKey; visited.push(key);
              if (event.data) { dataMap[key] = event.data; setLiveNodeData({ ...dataMap }); }
              setDoneNodes(new Set(visited.slice(0, -1))); setActiveNode(key);
              setStatusText((STATUS_LABELS[key] ?? 'PROCESSING').toUpperCase());
            }
          } catch { /* skip */ }
        }
      }

      setDoneNodes(new Set(visited)); setActiveNode('idle');
      const isUrgent = visited.includes('amygdala') && !visited.includes('hippocampus');

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: finalResp || 'No response generated.', nodeHistory: visited, nodeDataMap: { ...dataMap }, routeType: isUrgent ? 'urgent' : 'normal', timestamp: new Date() }]);
    } catch (err: any) {
      setActiveNode('idle'); setStatusText('SYSTEM ERROR');
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', timestamp: new Date(), content: err.message?.includes('fetch') ? '⚠️ Cannot reach backend.' : `⚠️ ${err.message}` }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans overflow-hidden text-slate-200">
      
      {/* ── Left: 3D Brain + Node Activity (Glassmorphism Sidebar) ── */}
      <div className="w-[340px] shrink-0 border-r border-slate-800/50 flex flex-col bg-slate-900/50 backdrop-blur-xl relative z-10 shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(99,102,241,0.5)]">🧠</div>
          <div>
            <div className="font-bold text-sm tracking-widest text-slate-100">CORPUS CALLOSUM</div>
            <div className="text-[9px] font-bold tracking-[0.2em] text-cyan-400 mt-1">V3 OPEN SOURCE</div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="h-[280px] relative bg-black/20">
          <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-slate-500 tracking-widest">INITIALIZING PARTICLE ENGINE...</div>}>
            <Brain3D activeNode={activeNode} doneNodes={doneNodes} />
          </Suspense>
          {/* Legend overlay */}
          <div className="absolute bottom-2 right-3 flex flex-col gap-1.5">
            {[ {c: '#f97316', l: 'Amygdala'}, {c: '#a855f7', l: 'Hippocampus'}, {c: '#10b981', l: 'Frontal Lobe'} ].map(item => (
              <div key={item.l} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.c, boxShadow: `0 0 8px ${item.c}` }} />
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">{item.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Node Activity Cards */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <NodeActivityPanel activeNode={activeNode} nodeDataMap={liveNodeData} />
        </div>

        {/* Status Bar */}
        <div className="p-4 border-t border-slate-800/50 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md">
          <motion.div 
            className={`w-2 h-2 rounded-full shrink-0 ${isStreaming || isListening ? 'bg-cyan-500' : 'bg-emerald-500'}`} 
            animate={(isStreaming || isListening) ? { opacity: [1, 0.2, 1] } : { opacity: 1 }} 
            transition={{ repeat: Infinity, duration: 1 }} 
            style={{ boxShadow: `0 0 10px ${(isStreaming || isListening) ? '#06b6d4' : '#10b981'}` }}
          />
          <span className="text-[10px] font-bold text-slate-400 tracking-widest">{statusText}</span>
        </div>
      </div>

      {/* ── Right: Chat Area ── */}
      <div className="flex-1 flex flex-col relative z-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-repeat opacity-95">
        
        {/* Top Bar */}
        <div className="p-4 border-b border-slate-800/50 flex items-center gap-3 bg-slate-900/50 backdrop-blur-md shrink-0">
          <span className="text-[10px] font-bold text-slate-500 tracking-widest">ENGINE</span>
          <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-3 py-1 rounded-full font-bold">openai/gpt-oss-120b</span>
          <div className="flex-1" />
          <span className="text-[10px] font-bold text-slate-500 tracking-widest">{messages.filter(m => m.role === 'user').length} QUERIES LOGGED</span>
        </div>

        {/* Chat History */}
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

        {/* Input Area (Glassmorphism) */}
        <div className="p-5 border-t border-slate-800/50 bg-slate-900/80 backdrop-blur-xl shrink-0">
          <form onSubmit={e => { e.preventDefault(); sendToBackend(input); }} className="flex gap-3">
            
            {/* Mic Toggle Button */}
            <motion.button 
              type="button" 
              onClick={toggleListening}
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              className={`p-3.5 rounded-xl border flex items-center justify-center transition-colors ${
                isListening 
                  ? 'bg-red-500/10 border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50'
              }`}
              title="Toggle Subvocal Decoding"
            >
              {isListening ? <Mic className="animate-pulse" size={18} /> : <MicOff size={18} />}
            </motion.button>

            {/* Input Field */}
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              disabled={isStreaming || isListening}
              placeholder={isListening ? 'Listening to your thoughts...' : isStreaming ? 'Graph is processing...' : 'Type a query...'}
              className="flex-1 bg-black/40 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500/70 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all placeholder:text-slate-600 disabled:opacity-50"
            />

            {/* Send Button */}
            <motion.button 
              type="submit" 
              disabled={!input.trim() || isStreaming || isListening}
              whileHover={input.trim() && !isStreaming ? { scale: 1.02 } : {}} 
              whileTap={input.trim() && !isStreaming ? { scale: 0.98 } : {}}
              className={`px-6 rounded-xl flex items-center gap-2 text-sm font-bold tracking-wider transition-all ${
                input.trim() && !isStreaming 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' 
                  : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              <Send size={16} /> SEND
            </motion.button>
          </form>
        </div>

      </div>
    </div>
  );
}
