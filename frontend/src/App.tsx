import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Zap, Database, Brain } from 'lucide-react';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
type NodeKey = 'idle' | 'amygdala' | 'hippocampus' | 'frontal_lobe' | 'tools' | 'end' | 'error';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  nodeHistory?: NodeKey[];
  routeType?: 'urgent' | 'normal';
  timestamp: Date;
}

interface NodeConfig {
  key: NodeKey;
  label: string;
  sublabel: string;
  color: string;
  dimColor: string;
  cy: number;
  icon: React.ReactNode;
  description: string;
}

// ─────────────────────────────────────────
// Node Definitions
// ─────────────────────────────────────────
const NODES: NodeConfig[] = [
  {
    key: 'amygdala',
    label: 'Amygdala',
    sublabel: 'Threat Router',
    color: '#f97316',
    dimColor: '#7c2d12',
    cy: 80,
    icon: <Zap size={14} />,
    description: 'Scans every input for urgency. If triggered, bypasses the entire brain and responds instantly.',
  },
  {
    key: 'hippocampus',
    label: 'Hippocampus',
    sublabel: 'Persistent Memory',
    color: '#a855f7',
    dimColor: '#4a1d96',
    cy: 220,
    icon: <Database size={14} />,
    description: 'Queries the local ChromaDB vector store for relevant memories from past conversations.',
  },
  {
    key: 'frontal_lobe',
    label: 'Frontal Lobe',
    sublabel: 'Executive Reasoning',
    color: '#10b981',
    dimColor: '#064e3b',
    cy: 360,
    icon: <Brain size={14} />,
    description: 'The heavy thinker. Uses retrieved memories + web search tools to form the final answer.',
  },
];

const NODE_META: Record<string, { badge: string; color: string }> = {
  amygdala:     { badge: '⚡ Amygdala',     color: '#f97316' },
  hippocampus:  { badge: '💾 Hippocampus',  color: '#a855f7' },
  frontal_lobe: { badge: '🧠 Frontal Lobe', color: '#10b981' },
  tools:        { badge: '🔍 Web Search',   color: '#3b82f6' },
};

const STATUS_MAP: Record<string, string> = {
  amygdala:     'Amygdala scanning threat level...',
  hippocampus:  'Hippocampus retrieving memories...',
  frontal_lobe: 'Frontal Lobe reasoning...',
  tools:        'Executing web search...',
};

// ─────────────────────────────────────────
// Brain Node (SVG)
// ─────────────────────────────────────────
function BrainNode({ node, status }: { node: NodeConfig; status: 'idle' | 'active' | 'done' }) {
  const isActive = status === 'active';
  const isDone   = status === 'done';

  return (
    <g>
      {/* Permanent dim background ring — always visible */}
      <circle cx={155} cy={node.cy} r={36}
        fill={node.dimColor} opacity={0.5} />
      <circle cx={155} cy={node.cy} r={36}
        fill="none" stroke={node.color} strokeWidth={1} opacity={0.25} />

      {/* Active pulse rings */}
      {isActive && (<>
        <motion.circle cx={155} cy={node.cy} r={42} fill="none"
          stroke={node.color} strokeWidth={1.5}
          animate={{ r: [38, 50, 38], opacity: [0.6, 0, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeOut' }}
        />
        <motion.circle cx={155} cy={node.cy} r={50} fill="none"
          stroke={node.color} strokeWidth={0.8}
          animate={{ r: [44, 60, 44], opacity: [0.3, 0, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeOut', delay: 0.2 }}
        />
      </>)}

      {/* Done ring */}
      {isDone && (
        <circle cx={155} cy={node.cy} r={42}
          fill="none" stroke={node.color} strokeWidth={1} opacity={0.5} />
      )}

      {/* Main filled circle */}
      <motion.circle cx={155} cy={node.cy} r={32}
        animate={{
          fill: isActive ? node.color : isDone ? node.color + 'cc' : node.dimColor,
        }}
        transition={{ duration: 0.35 }}
        style={{ filter: isActive ? `drop-shadow(0 0 14px ${node.color})` : 'none' }}
      />

      {/* Inner white dot */}
      <circle cx={155} cy={node.cy} r={8}
        fill={isActive || isDone ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)'} />

      {/* Labels */}
      <text x={155} y={node.cy + 52} textAnchor="middle"
        fill={isActive || isDone ? node.color : '#64748b'}
        fontSize={12} fontWeight={700}
        fontFamily="Inter, system-ui, sans-serif">
        {node.label}
      </text>
      <text x={155} y={node.cy + 66} textAnchor="middle"
        fill={isActive || isDone ? node.color + 'aa' : '#334155'}
        fontSize={9} fontFamily="Inter, system-ui, sans-serif"
        letterSpacing={0.8}>
        {node.sublabel.toUpperCase()}
      </text>
    </g>
  );
}

// ─────────────────────────────────────────
// Connection Line
// ─────────────────────────────────────────
function Connection({ fromY, toY, isActive, isDone, color }: {
  fromY: number; toY: number; isActive: boolean; isDone: boolean; color: string;
}) {
  return (
    <g>
      <line x1={155} y1={fromY + 38} x2={155} y2={toY - 38}
        stroke={isDone ? color + '60' : '#1e293b'} strokeWidth={2} />
      {isActive && (
        <motion.circle cx={155} r={5} fill={color}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          initial={{ cy: fromY + 38, opacity: 0 }}
          animate={{ cy: [fromY + 38, toY - 38], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.65, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.15 }}
        />
      )}
    </g>
  );
}

// ─────────────────────────────────────────
// Brain Visualizer
// ─────────────────────────────────────────
function BrainVisualizer({ activeNode, doneNodes }: {
  activeNode: NodeKey; doneNodes: Set<NodeKey>;
}) {
  const getStatus = (k: NodeKey): 'idle' | 'active' | 'done' =>
    activeNode === k ? 'active' : doneNodes.has(k) ? 'done' : 'idle';

  const isComplete = doneNodes.has('frontal_lobe') || doneNodes.has('amygdala');
  const isUrgent = doneNodes.has('amygdala') && !doneNodes.has('hippocampus');

  return (
    <svg viewBox="0 0 310 500" width="100%" style={{ maxWidth: 260 }}>
      {/* Urgent bypass dashed line */}
      <line x1={190} y1={86}  x2={232} y2={86}  stroke="#f9731640" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={232} y1={86}  x2={232} y2={414} stroke="#f9731640" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={190} y1={414} x2={232} y2={414} stroke="#f9731640" strokeWidth={1} strokeDasharray="4,3" />
      <text x={239} y={256} fill="#f9731628" fontSize={7.5}
        fontFamily="Inter, system-ui" letterSpacing={2}
        transform="rotate(90,239,256)" textAnchor="middle">
        URGENT BYPASS
      </text>

      {/* Connections */}
      <Connection fromY={80}  toY={220} color="#a855f7"
        isActive={activeNode === 'hippocampus'}
        isDone={doneNodes.has('hippocampus')} />
      <Connection fromY={220} toY={360} color="#10b981"
        isActive={activeNode === 'frontal_lobe'}
        isDone={doneNodes.has('frontal_lobe')} />

      {/* Nodes */}
      {NODES.map(n => <BrainNode key={n.key} node={n} status={getStatus(n.key)} />)}

      {/* Output */}
      <line x1={155} y1={398} x2={155} y2={440}
        stroke={isComplete ? '#10b981' : '#1e293b'} strokeWidth={2} />
      {isComplete ? (
        <motion.text x={155} y={458} textAnchor="middle"
          fill={isUrgent ? '#f97316' : '#10b981'}
          fontSize={10} fontWeight={700} letterSpacing={1.5}
          fontFamily="Inter, system-ui, sans-serif"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {isUrgent ? '⚡ URGENT RESPONSE' : '✓ RESPONSE READY'}
        </motion.text>
      ) : (
        <text x={155} y={458} textAnchor="middle"
          fill="#1e293b" fontSize={10} letterSpacing={1.5}
          fontFamily="Inter, system-ui, sans-serif">
          AWAITING INPUT
        </text>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────
// Node Info Cards (left panel bottom)
// ─────────────────────────────────────────
function NodeInfoCard({ node, isActive, isDone }: {
  node: NodeConfig; isActive: boolean; isDone: boolean;
}) {
  const lit = isActive || isDone;
  return (
    <motion.div
      animate={{ borderColor: lit ? node.color + '50' : '#0f172a' }}
      transition={{ duration: 0.3 }}
      style={{
        border: '1px solid',
        borderRadius: 8,
        padding: '8px 11px',
        marginBottom: 6,
        background: lit ? node.color + '08' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ color: lit ? node.color : '#334155' }}>{node.icon}</span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: lit ? node.color : '#475569',
          fontFamily: 'Inter, system-ui',
        }}>
          {node.label}
        </span>
        {isActive && (
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 0.7 }}
            style={{ marginLeft: 'auto', fontSize: 9, color: node.color, letterSpacing: 1 }}
          >
            ACTIVE
          </motion.span>
        )}
      </div>
      <p style={{
        fontSize: 10, color: '#475569', marginTop: 4, lineHeight: 1.5,
        fontFamily: 'Inter, system-ui',
      }}>
        {node.description}
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Chat Message
// ─────────────────────────────────────────
function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      style={{ marginBottom: 22, display: 'flex', flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start' }}
    >
      {!isUser && message.nodeHistory && message.nodeHistory.length > 0 && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 7, flexWrap: 'wrap' }}>
          {message.nodeHistory.map((n, i) => {
            const m = NODE_META[n]; if (!m) return null;
            return (
              <span key={i} style={{
                fontSize: 10, padding: '2px 9px', borderRadius: 999,
                border: `1px solid ${m.color}40`,
                background: `${m.color}12`, color: m.color,
                fontFamily: 'Inter, system-ui', fontWeight: 600,
              }}>
                {m.badge}
              </span>
            );
          })}
          {message.routeType === 'urgent' && (
            <span style={{
              fontSize: 10, padding: '2px 9px', borderRadius: 999,
              border: '1px solid #f9731640', background: '#f9731612', color: '#f97316',
              fontFamily: 'Inter, system-ui', fontWeight: 700,
            }}>
              ⚡ URGENT — brain bypassed
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
    content: `Corpus Callosum is online.\n\nI work differently from a regular chatbot. Every message you send is routed through three specialized agents:\n\n⚡ Amygdala — instant threat detection. If your message is urgent (e.g. "STOP NOW"), I skip everything else and respond in milliseconds.\n\n💾 Hippocampus — I query my local memory (ChromaDB) for relevant context from past conversations. I remember things you've told me.\n\n🧠 Frontal Lobe — I reason through the answer, using web search if I need real-world data.\n\nWatch the brain diagram light up as I think. Try asking something, or type "STOP EVERYTHING NOW" to see the urgency bypass in action.`,
  }]);
  const [input, setInput] = useState('');
  const [activeNode, setActiveNode] = useState<NodeKey>('idle');
  const [doneNodes, setDoneNodes]   = useState<Set<NodeKey>>(new Set());
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
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'user',
      content: query, timestamp: new Date(),
    }]);
    setInput('');
    setIsStreaming(true);
    setIsError(false);
    setDoneNodes(new Set());
    setActiveNode('idle');
    setStatusText('CONNECTING...');

    const visited: NodeKey[] = [];

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
            const data = JSON.parse(line.slice(6));
            if (data.node === 'end') {
              finalResp = data.response;
              setActiveNode('end');
              setStatusText('DONE');
            } else if (data.node === 'error') {
              throw new Error(data.error);
            } else {
              const key = data.node as NodeKey;
              visited.push(key);
              setDoneNodes(new Set(visited.slice(0, -1)));
              setActiveNode(key);
              setStatusText((STATUS_MAP[key] ?? 'PROCESSING').toUpperCase());
            }
          } catch { /* skip bad lines */ }
        }
      }

      setDoneNodes(new Set(visited));
      setActiveNode('idle');

      // Detect urgency: amygdala fired but hippocampus did not
      const isUrgent = visited.includes('amygdala') && !visited.includes('hippocampus');

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: finalResp || 'No response generated.',
        nodeHistory: visited, routeType: isUrgent ? 'urgent' : 'normal',
        timestamp: new Date(),
      }]);
      setStatusText('READY');

    } catch (err: any) {
      setIsError(true);
      setActiveNode('idle');
      setStatusText('ERROR');
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant', timestamp: new Date(),
        content: err.message?.includes('fetch')
          ? '⚠️  Cannot reach the backend.\n\nStart the server in a terminal:\n\n  cd ~/Documents/neuromotor/corpus_callosum\n  python3 -m uvicorn server:app --reload\n\nThen add your GROQ_API_KEY to corpus_callosum/.env'
          : `⚠️  Error: ${err.message}`,
      }]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: '#020617', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden',
    }}>

      {/* ── Left: Brain + Info ── */}
      <div style={{
        width: 320, flexShrink: 0,
        borderRight: '1px solid #0f172a',
        display: 'flex', flexDirection: 'column',
        background: '#020c1b',
        overflowY: 'auto',
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #0f172a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, boxShadow: '0 0 18px rgba(124,58,237,0.5)',
            }}>🧠</div>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14, letterSpacing: '0.07em' }}>
                CORPUS CALLOSUM
              </div>
              <div style={{ color: '#334155', fontSize: 9, letterSpacing: '0.16em', marginTop: 1 }}>
                NEURO-ARCHITECTURE AI
              </div>
            </div>
          </div>
        </div>

        {/* Brain SVG */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 20px' }}>
          <BrainVisualizer activeNode={activeNode} doneNodes={doneNodes} />
        </div>

        {/* Node info cards */}
        <div style={{ padding: '0 16px 16px' }}>
          {NODES.map(n => (
            <NodeInfoCard key={n.key} node={n}
              isActive={activeNode === n.key}
              isDone={doneNodes.has(n.key)} />
          ))}
        </div>

        {/* Status */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid #0f172a', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: isError ? '#ef4444' : isStreaming ? '#f97316' : '#10b981',
            }}
              animate={isStreaming ? { opacity: [1, 0.2, 1] } : { opacity: 1 }}
              transition={{ repeat: Infinity, duration: 0.75 }}
            />
            <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {/* ── Right: Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '13px 24px', borderBottom: '1px solid #0f172a',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(2,6,23,0.95)',
        }}>
          <span style={{ color: '#334155', fontSize: 11 }}>MODEL</span>
          <span style={{
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
            color: '#a78bfa', fontSize: 11, padding: '2px 10px', borderRadius: 999, fontWeight: 600,
          }}>
            openai/gpt-oss-120b · Groq
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ color: '#1e293b', fontSize: 11 }}>
            {messages.filter(m => m.role === 'user').length} queries
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 12px' }}>
          <AnimatePresence>
            {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
          </AnimatePresence>
          {isStreaming && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', marginBottom: 16 }}>
              <div style={{
                display: 'flex', gap: 5, padding: '10px 14px',
                background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(51,65,85,0.5)',
                borderRadius: '18px 18px 18px 4px', alignItems: 'center',
              }}>
                {[0,1,2].map(i => (
                  <motion.div key={i}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#475569' }}
                    animate={{ opacity: [0.3,1,0.3], y: [0,-4,0] }}
                    transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.18 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '14px 24px 18px', borderTop: '1px solid #0f172a',
          background: 'rgba(2,6,23,0.95)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
            <input
              ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              disabled={isStreaming}
              placeholder={isStreaming ? 'Brain is thinking...' : 'Send a message to the brain...'}
              style={{
                flex: 1, background: '#070f23',
                border: '1px solid #1e293b', borderRadius: 12,
                padding: '11px 16px', color: '#e2e8f0', fontSize: 14,
                outline: 'none', fontFamily: 'Inter, system-ui', transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#4f46e580')}
              onBlur={e  => (e.target.style.borderColor = '#1e293b')}
            />
            <motion.button type="submit"
              disabled={!input.trim() || isStreaming}
              whileHover={input.trim() && !isStreaming ? { scale: 1.03 } : {}}
              whileTap={input.trim() && !isStreaming ? { scale: 0.97 } : {}}
              style={{
                background: input.trim() && !isStreaming ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#0f172a',
                border: '1px solid', borderColor: input.trim() && !isStreaming ? 'transparent' : '#1e293b',
                borderRadius: 12, padding: '0 20px',
                color: input.trim() && !isStreaming ? '#fff' : '#334155',
                cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 7,
                fontSize: 13, fontWeight: 600, fontFamily: 'Inter, system-ui',
                minWidth: 88, justifyContent: 'center', transition: 'all 0.2s',
                boxShadow: input.trim() && !isStreaming ? '0 0 18px rgba(79,70,229,0.4)' : 'none',
              }}
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
