import React, { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import Brain3D from './Brain3D';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
type NodeKey = 'idle' | 'amygdala' | 'hippocampus' | 'frontal_lobe' | 'tools' | 'end' | 'error';

interface NodeData {
  // Amygdala
  threat_level?: number;
  emotional_tone?: string;
  topic_domain?: string;
  routing_note?: string;
  // Hippocampus
  memories_found?: number;
  memory_summary?: string;
  repeat_topic?: boolean;
  // Frontal / Tools
  status?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  nodeHistory?: NodeKey[];
  nodeDataMap?: Record<string, NodeData>;
  routeType?: 'urgent' | 'normal';
  timestamp: Date;
}

const LOBE_META: Record<string, { label: string; color: string; desc: string }> = {
  amygdala:     { label: 'Amygdala',     color: '#f97316', desc: 'Threat & context assessment' },
  hippocampus:  { label: 'Hippocampus',  color: '#a855f7', desc: 'Memory retrieval & write'   },
  frontal_lobe: { label: 'Frontal Lobe', color: '#10b981', desc: 'Executive reasoning'         },
  tools:        { label: 'Web Search',   color: '#3b82f6', desc: 'Live data lookup'             },
};

const STATUS_LABELS: Record<string, string> = {
  amygdala:     'Amygdala assessing threat level...',
  hippocampus:  'Hippocampus searching memory palace...',
  frontal_lobe: 'Frontal Lobe reasoning with full briefing...',
  tools:        'Frontal Lobe executing web search...',
};

// ─────────────────────────────────────────
// Node Activity Panel (left, below brain)
// ─────────────────────────────────────────
function NodeActivityPanel({ activeNode, nodeDataMap }: {
  activeNode: NodeKey;
  nodeDataMap: Record<string, NodeData>;
}) {
  const amygData  = nodeDataMap.amygdala;
  const hippoData = nodeDataMap.hippocampus;

  return (
    <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Amygdala card */}
      <motion.div
        animate={{ borderColor: activeNode === 'amygdala' ? '#f9731660' : amygData ? '#f9731630' : '#0f172a' }}
        style={{ border: '1px solid', borderRadius: 8, padding: '9px 12px', background: amygData ? '#f9731608' : 'transparent' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: amygData ? 6 : 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316', opacity: amygData ? 1 : 0.3, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: amygData ? '#f97316' : '#334155', fontFamily: 'Inter, system-ui' }}>
            Amygdala
          </span>
          {activeNode === 'amygdala' && (
            <motion.span animate={{ opacity: [1,0,1] }} transition={{ repeat: Infinity, duration: 0.7 }}
              style={{ marginLeft: 'auto', fontSize: 9, color: '#f97316', letterSpacing: 1 }}>ACTIVE</motion.span>
          )}
        </div>
        {amygData && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {amygData.threat_level !== undefined && (
              <Tag color="#f97316" label={`Threat ${amygData.threat_level}/10`} />
            )}
            {amygData.emotional_tone && <Tag color="#f97316" label={amygData.emotional_tone} />}
            {amygData.topic_domain   && <Tag color="#f97316" label={amygData.topic_domain}   />}
          </div>
        )}
        {!amygData && <p style={{ fontSize: 10, color: '#334155', marginTop: 3, fontFamily: 'Inter, system-ui' }}>Scans every input for urgency, tone, and domain before routing.</p>}
      </motion.div>

      {/* Hippocampus card */}
      <motion.div
        animate={{ borderColor: activeNode === 'hippocampus' ? '#a855f760' : hippoData ? '#a855f730' : '#0f172a' }}
        style={{ border: '1px solid', borderRadius: 8, padding: '9px 12px', background: hippoData ? '#a855f708' : 'transparent' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: hippoData ? 6 : 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#a855f7', opacity: hippoData ? 1 : 0.3, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: hippoData ? '#a855f7' : '#334155', fontFamily: 'Inter, system-ui' }}>
            Hippocampus
          </span>
          {activeNode === 'hippocampus' && (
            <motion.span animate={{ opacity: [1,0,1] }} transition={{ repeat: Infinity, duration: 0.7 }}
              style={{ marginLeft: 'auto', fontSize: 9, color: '#a855f7', letterSpacing: 1 }}>ACTIVE</motion.span>
          )}
        </div>
        {hippoData ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <Tag color="#a855f7" label={`${hippoData.memories_found ?? 0} memories retrieved`} />
            {hippoData.repeat_topic && <Tag color="#f59e0b" label="Repeat topic ↺" />}
          </div>
        ) : (
          <p style={{ fontSize: 10, color: '#334155', marginTop: 3, fontFamily: 'Inter, system-ui' }}>Retrieves & writes to a local ChromaDB vector store. Gets smarter over time.</p>
        )}
      </motion.div>

      {/* Frontal Lobe card */}
      <motion.div
        animate={{ borderColor: activeNode === 'frontal_lobe' ? '#10b98160' : '#0f172a' }}
        style={{ border: '1px solid', borderRadius: 8, padding: '9px 12px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', opacity: activeNode === 'frontal_lobe' ? 1 : 0.3, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: activeNode === 'frontal_lobe' ? '#10b981' : '#334155', fontFamily: 'Inter, system-ui' }}>
            Frontal Lobe
          </span>
          {activeNode === 'frontal_lobe' && (
            <motion.span animate={{ opacity: [1,0,1] }} transition={{ repeat: Infinity, duration: 0.7 }}
              style={{ marginLeft: 'auto', fontSize: 9, color: '#10b981', letterSpacing: 1 }}>ACTIVE</motion.span>
          )}
        </div>
        <p style={{ fontSize: 10, color: '#334155', marginTop: 4, fontFamily: 'Inter, system-ui' }}>
          Reads Amygdala's routing brief + Hippocampus memories before forming a response.
        </p>
      </motion.div>
    </div>
  );
}

function Tag({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      fontSize: 9, padding: '2px 7px', borderRadius: 999,
      border: `1px solid ${color}40`, background: `${color}10`, color,
      fontFamily: 'Inter, system-ui', fontWeight: 600, letterSpacing: 0.3,
    }}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────
// Chat Message
// ─────────────────────────────────────────
function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}
    >
      {!isUser && message.nodeHistory && message.nodeHistory.length > 0 && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          {message.nodeHistory.map((n, i) => {
            const m = LOBE_META[n]; if (!m) return null;
            return (
              <React.Fragment key={i}>
                <span style={{
                  fontSize: 10, padding: '2px 9px', borderRadius: 999,
                  border: `1px solid ${m.color}40`, background: `${m.color}12`, color: m.color,
                  fontFamily: 'Inter, system-ui', fontWeight: 600,
                }}>
                  {m.label}
                </span>
                {i < message.nodeHistory!.length - 1 && (
                  <span style={{ color: '#1e293b', fontSize: 10 }}>→</span>
                )}
              </React.Fragment>
            );
          })}
          {message.routeType === 'urgent' && (
            <span style={{
              fontSize: 10, padding: '2px 9px', borderRadius: 999,
              border: '1px solid #f9731440', background: '#f9731412', color: '#f97316',
              fontFamily: 'Inter, system-ui', fontWeight: 700,
            }}>
              ⚡ URGENT BYPASS
            </span>
          )}
          {/* Show amygdala routing note */}
          {message.nodeDataMap?.amygdala?.routing_note && (
            <span style={{
              fontSize: 9, color: '#334155', fontFamily: 'Inter, system-ui', fontStyle: 'italic',
              marginLeft: 2,
            }}>
              "{message.nodeDataMap.amygdala.routing_note}"
            </span>
          )}
        </div>
      )}
      <div style={{
        maxWidth: '78%',
        background: isUser ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'rgba(15,23,42,0.9)',
        border: isUser ? 'none' : '1px solid rgba(51,65,85,0.5)',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '12px 16px', color: '#e2e8f0',
        fontSize: 14, lineHeight: 1.65,
        fontFamily: 'Inter, system-ui', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {message.content}
      </div>
      <div style={{ fontSize: 10, color: '#334155', marginTop: 4, fontFamily: 'Inter, system-ui' }}>
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
    content: `Corpus Callosum is online — rotate the brain on the left to see its 3D structure.\n\nEach region is a genuine specialist agent:\n\n⚡ Amygdala — evaluates threat level (0-10), detects your emotional tone, classifies your domain, and writes a routing directive that the Frontal Lobe must follow.\n\n💾 Hippocampus — queries a local ChromaDB vector store for memories from past sessions. It also WRITES your query back so the brain gets smarter over time. ChatGPT can't do this.\n\n🧠 Frontal Lobe — receives a full briefing from both agents before forming its answer. It uses web search for real-world data.\n\nTry: "What's the latest news in AI?" — watch the brain light up lobe by lobe.`,
  }]);
  const [input, setInput]            = useState('');
  const [activeNode, setActiveNode]  = useState<NodeKey>('idle');
  const [doneNodes, setDoneNodes]    = useState<Set<NodeKey>>(new Set());
  const [liveNodeData, setLiveNodeData] = useState<Record<string, NodeData>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText]  = useState('READY');
  const [isError, setIsError]        = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const query = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: query, timestamp: new Date() }]);
    setInput('');
    setIsStreaming(true);
    setIsError(false);
    setDoneNodes(new Set());
    setActiveNode('idle');
    setLiveNodeData({});
    setStatusText('CONNECTING...');

    const visited: NodeKey[]  = [];
    const dataMap: Record<string, NodeData> = {};

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResp = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.node === 'end') {
              finalResp = event.response;
              setActiveNode('end'); setStatusText('DONE');
            } else if (event.node === 'error') {
              throw new Error(event.error);
            } else {
              const key = event.node as NodeKey;
              visited.push(key);
              if (event.data) {
                dataMap[key] = event.data;
                setLiveNodeData({ ...dataMap });
              }
              setDoneNodes(new Set(visited.slice(0, -1)));
              setActiveNode(key);
              setStatusText((STATUS_LABELS[key] ?? 'PROCESSING').toUpperCase());
            }
          } catch { /* skip */ }
        }
      }

      setDoneNodes(new Set(visited));
      setActiveNode('idle');
      const isUrgent = visited.includes('amygdala') && !visited.includes('hippocampus');

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: finalResp || 'No response generated.',
        nodeHistory: visited, nodeDataMap: { ...dataMap },
        routeType: isUrgent ? 'urgent' : 'normal',
        timestamp: new Date(),
      }]);
      setStatusText('READY');

    } catch (err: any) {
      setIsError(true); setActiveNode('idle'); setStatusText('ERROR');
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant', timestamp: new Date(),
        content: err.message?.includes('fetch')
          ? '⚠️  Cannot reach backend.\n\n  cd ~/Documents/neuromotor/corpus_callosum\n  python3 -m uvicorn server:app --reload'
          : `⚠️  ${err.message}`,
      }]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#020617', fontFamily: 'Inter, system-ui', overflow: 'hidden' }}>

      {/* ── Left: 3D Brain + Node Activity ── */}
      <div style={{ width: 330, flexShrink: 0, borderRight: '1px solid #0f172a', display: 'flex', flexDirection: 'column', background: '#020c1b', overflow: 'hidden' }}>

        {/* Brand */}
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid #0f172a', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 0 16px rgba(124,58,237,0.5)', flexShrink: 0 }}>🧠</div>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em' }}>CORPUS CALLOSUM</div>
              <div style={{ color: '#334155', fontSize: 9, letterSpacing: '0.16em', marginTop: 1 }}>NEURO-ARCHITECTURE AI</div>
            </div>
          </div>
        </div>

        {/* 3D Brain Canvas */}
        <div style={{ height: 260, flexShrink: 0, position: 'relative' }}>
          <Suspense fallback={
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 12 }}>
              Loading 3D brain...
            </div>
          }>
            <Brain3D activeNode={activeNode} doneNodes={doneNodes} />
          </Suspense>

          {/* Lobe color legend overlay */}
          <div style={{ position: 'absolute', bottom: 8, right: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[['#f97316', 'Amygdala'], ['#a855f7', 'Hippocampus'], ['#10b981', 'Frontal Lobe']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: `0 0 5px ${c}` }} />
                <span style={{ fontSize: 9, color: '#475569', fontFamily: 'Inter, system-ui' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Node Activity */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <NodeActivityPanel activeNode={activeNode} nodeDataMap={liveNodeData} />
        </div>

        {/* Status */}
        <div style={{ padding: '11px 16px', borderTop: '1px solid #0f172a', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: isError ? '#ef4444' : isStreaming ? '#f97316' : '#10b981' }}
              animate={isStreaming ? { opacity: [1, 0.2, 1] } : { opacity: 1 }}
              transition={{ repeat: Infinity, duration: 0.75 }}
            />
            <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>{statusText}</span>
          </div>
        </div>
      </div>

      {/* ── Right: Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '13px 22px', borderBottom: '1px solid #0f172a', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(2,6,23,0.95)', flexShrink: 0 }}>
          <span style={{ color: '#334155', fontSize: 11 }}>MODEL</span>
          <span style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa', fontSize: 11, padding: '2px 10px', borderRadius: 999, fontWeight: 600 }}>
            openai/gpt-oss-120b · Groq
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ color: '#1e293b', fontSize: 11 }}>{messages.filter(m => m.role === 'user').length} queries</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px 10px' }}>
          <AnimatePresence>
            {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
          </AnimatePresence>
          {isStreaming && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 5, padding: '10px 14px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: '18px 18px 18px 4px', alignItems: 'center' }}>
                {[0,1,2].map(i => (
                  <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#475569' }}
                    animate={{ opacity: [0.3,1,0.3], y: [0,-4,0] }}
                    transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.18 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '13px 22px 16px', borderTop: '1px solid #0f172a', background: 'rgba(2,6,23,0.95)', flexShrink: 0 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} disabled={isStreaming}
              placeholder={isStreaming ? 'Brain is thinking...' : 'Send a message to the brain...'}
              style={{ flex: 1, background: '#070f23', border: '1px solid #1e293b', borderRadius: 12, padding: '11px 16px', color: '#e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'Inter, system-ui', transition: 'border-color 0.2s' }}
              onFocus={e => (e.target.style.borderColor = '#4f46e580')}
              onBlur={e  => (e.target.style.borderColor = '#1e293b')}
            />
            <motion.button type="submit" disabled={!input.trim() || isStreaming}
              whileHover={input.trim() && !isStreaming ? { scale: 1.03 } : {}}
              whileTap={input.trim() && !isStreaming ? { scale: 0.97 } : {}}
              style={{ background: input.trim() && !isStreaming ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#0f172a', border: '1px solid', borderColor: input.trim() && !isStreaming ? 'transparent' : '#1e293b', borderRadius: 12, padding: '0 20px', color: input.trim() && !isStreaming ? '#fff' : '#334155', cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, fontFamily: 'Inter, system-ui', minWidth: 88, justifyContent: 'center', transition: 'all 0.2s', boxShadow: input.trim() && !isStreaming ? '0 0 18px rgba(79,70,229,0.4)' : 'none' }}
            >
              <Send size={14} /> Send
            </motion.button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 9, fontSize: 10, color: '#1e293b', fontFamily: 'Inter, system-ui' }}>
            Backend · <code style={{ color: '#334155' }}>cd corpus_callosum && python3 -m uvicorn server:app --reload</code>
          </p>
        </div>
      </div>
    </div>
  );
}
