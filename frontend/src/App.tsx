import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
type NodeKey = 'idle' | 'amygdala' | 'hippocampus' | 'frontal_lobe' | 'tools' | 'end' | 'error';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  nodeHistory?: NodeKey[];
  timestamp: Date;
}

interface NodeConfig {
  key: NodeKey;
  label: string;
  sublabel: string;
  color: string;
  cy: number;
  emoji: string;
}

// ─────────────────────────────────────────
// Node Definitions
// ─────────────────────────────────────────
const NODES: NodeConfig[] = [
  { key: 'amygdala',     label: 'Amygdala',     sublabel: 'Threat Router',       color: '#f97316', cy: 75,  emoji: '⚡' },
  { key: 'hippocampus',  label: 'Hippocampus',   sublabel: 'Long-term Memory',    color: '#a855f7', cy: 210, emoji: '💾' },
  { key: 'frontal_lobe', label: 'Frontal Lobe',  sublabel: 'Executive Function',  color: '#10b981', cy: 345, emoji: '⚙️' },
];

const NODE_META: Record<string, { badge: string; color: string }> = {
  amygdala:     { badge: '⚡ Amygdala',     color: '#f97316' },
  hippocampus:  { badge: '💾 Hippocampus',  color: '#a855f7' },
  frontal_lobe: { badge: '⚙️ Frontal Lobe', color: '#10b981' },
  tools:        { badge: '🔍 Tools',        color: '#3b82f6' },
};

const STATUS_MAP: Record<string, string> = {
  amygdala:     '⚡ Amygdala scanning for threats...',
  hippocampus:  '💾 Hippocampus retrieving memories...',
  frontal_lobe: '⚙️  Frontal Lobe reasoning...',
  tools:        '🔍 Executing external tools...',
};

// ─────────────────────────────────────────
// Signal Connection (SVG animated line)
// ─────────────────────────────────────────
function Connection({ fromY, toY, isActive, color }: {
  fromY: number; toY: number; isActive: boolean; color: string;
}) {
  return (
    <g>
      <line x1={150} y1={fromY + 38} x2={150} y2={toY - 38}
        stroke="#1e293b" strokeWidth={2} />
      {isActive && (
        <motion.circle cx={150} r={5} fill={color}
          initial={{ cy: fromY + 38, opacity: 0 }}
          animate={{ cy: [fromY + 38, toY - 38], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.7, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.1 }}
        />
      )}
    </g>
  );
}

// ─────────────────────────────────────────
// Brain Node (SVG)
// ─────────────────────────────────────────
function BrainNode({ node, status }: {
  node: NodeConfig;
  status: 'idle' | 'active' | 'done';
}) {
  const isActive = status === 'active';
  const isDone   = status === 'done';
  const fillColor = isActive || isDone ? node.color : '#0f172a';
  const textColor = isActive || isDone ? node.color : '#334155';

  return (
    <motion.g animate={{ opacity: status === 'idle' ? 0.3 : 1 }} transition={{ duration: 0.3 }}>
      {/* Pulsing outer ring */}
      {isActive && (
        <motion.circle cx={150} cy={node.cy} r={46} fill="none"
          stroke={node.color} strokeWidth={1.5}
          animate={{ r: [42, 50, 42], opacity: [0.4, 0.9, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
        />
      )}
      {isDone && (
        <circle cx={150} cy={node.cy} r={43} fill="none"
          stroke={node.color} strokeWidth={1} opacity={0.35} />
      )}

      {/* Main circle */}
      <motion.circle cx={150} cy={node.cy} r={32}
        fill={fillColor}
        animate={{ fill: fillColor }}
        transition={{ duration: 0.4 }}
        style={{ filter: isActive ? `drop-shadow(0 0 12px ${node.color}88)` : 'none' }}
      />

      {/* Inner dot */}
      <circle cx={150} cy={node.cy} r={9}
        fill={isActive || isDone ? 'rgba(255,255,255,0.85)' : '#1e293b'} />

      {/* Emoji (rendered as foreign object for crisp display) */}
      <text x={150} y={node.cy + 5} textAnchor="middle"
        fontSize={11} fill={isActive || isDone ? '#fff' : '#334155'}
        fontFamily="system-ui">
        {node.emoji}
      </text>

      {/* Labels */}
      <text x={150} y={node.cy + 52} textAnchor="middle"
        fill={textColor} fontSize={12} fontWeight={600}
        fontFamily="Inter, system-ui, sans-serif">
        {node.label}
      </text>
      <text x={150} y={node.cy + 67} textAnchor="middle"
        fill="#475569" fontSize={10}
        fontFamily="Inter, system-ui, sans-serif">
        {node.sublabel}
      </text>
    </motion.g>
  );
}

// ─────────────────────────────────────────
// Full Brain Visualizer
// ─────────────────────────────────────────
function BrainVisualizer({ activeNode, doneNodes }: {
  activeNode: NodeKey; doneNodes: Set<NodeKey>;
}) {
  const getStatus = (key: NodeKey): 'idle' | 'active' | 'done' =>
    activeNode === key ? 'active' : doneNodes.has(key) ? 'done' : 'idle';

  const isComplete = doneNodes.has('frontal_lobe') || doneNodes.has('amygdala');

  return (
    <svg viewBox="0 0 300 480" width="100%" style={{ maxWidth: 260 }}>
      {/* Urgent bypass (dashed, right side) */}
      <line x1={188} y1={82}  x2={228} y2={82}  stroke="#f9731630" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={228} y1={82}  x2={228} y2={398} stroke="#f9731630" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={188} y1={398} x2={228} y2={398} stroke="#f9731630" strokeWidth={1} strokeDasharray="4,3" />
      <text x={234} y={242} fill="#f9731625" fontSize={8}
        fontFamily="Inter, system-ui, sans-serif"
        transform="rotate(90, 234, 242)" textAnchor="middle" letterSpacing={2}>
        URGENT BYPASS
      </text>

      {/* Connection signals */}
      <Connection fromY={75}  toY={210} isActive={activeNode === 'hippocampus'}  color="#a855f7" />
      <Connection fromY={210} toY={345} isActive={activeNode === 'frontal_lobe'} color="#10b981" />

      {/* Output indicator */}
      <line x1={150} y1={383} x2={150} y2={425} stroke={isComplete ? '#10b981' : '#1e293b'} strokeWidth={2} />
      <AnimatePresence>
        {isComplete ? (
          <motion.text key="done" x={150} y={442} textAnchor="middle"
            fill="#10b981" fontSize={11} fontWeight={700}
            fontFamily="Inter, system-ui, sans-serif"
            initial={{ opacity: 0, y: 448 }} animate={{ opacity: 1, y: 442 }}>
            ✓ RESPONSE
          </motion.text>
        ) : (
          <text key="idle" x={150} y={442} textAnchor="middle"
            fill="#1e293b" fontSize={11}
            fontFamily="Inter, system-ui, sans-serif">
            OUTPUT
          </text>
        )}
      </AnimatePresence>

      {/* Nodes */}
      {NODES.map(node => (
        <BrainNode key={node.key} node={node} status={getStatus(node.key)} />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────
// Chat Message
// ─────────────────────────────────────────
function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ marginBottom: 24, display: 'flex', flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start' }}
    >
      {/* Node badges */}
      {!isUser && message.nodeHistory && message.nodeHistory.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {message.nodeHistory.map((n, i) => {
            const meta = NODE_META[n];
            if (!meta) return null;
            return (
              <span key={i} style={{
                fontSize: 10, padding: '2px 9px', borderRadius: 999,
                border: `1px solid ${meta.color}40`,
                background: `${meta.color}12`,
                color: meta.color,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 600,
              }}>
                {meta.badge}
              </span>
            );
          })}
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: '78%',
        background: isUser
          ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
          : 'rgba(15, 23, 42, 0.9)',
        border: isUser ? 'none' : '1px solid rgba(51, 65, 85, 0.5)',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '12px 16px',
        color: '#e2e8f0',
        fontSize: 14,
        lineHeight: 1.65,
        fontFamily: 'Inter, system-ui, sans-serif',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {message.content}
      </div>

      <div style={{
        fontSize: 10, color: '#334155', marginTop: 5,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Typing Indicator
// ─────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ display: 'flex', marginBottom: 20 }}>
      <div style={{
        display: 'flex', gap: 5, alignItems: 'center',
        padding: '10px 14px',
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(51, 65, 85, 0.5)',
        borderRadius: '18px 18px 18px 4px',
      }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i}
            style={{ width: 6, height: 6, borderRadius: '50%', background: '#475569' }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.18 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// App
// ─────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '0',
    role: 'assistant',
    content: 'Corpus Callosum is online.\n\nI\'m a multi-agent AI system modeled after human neuroanatomy — watch the brain diagram on the left as I think. Each query flows through:\n\n  ⚡ Amygdala → threat detection\n  💾 Hippocampus → memory retrieval\n  ⚙️  Frontal Lobe → reasoning + tools\n\nAsk me anything.',
    timestamp: new Date(),
  }]);
  const [input, setInput]           = useState('');
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
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
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

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';
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
              // Mark previous as done, activate current
              setDoneNodes(new Set(visited.slice(0, -1)));
              setActiveNode(key);
              setStatusText((STATUS_MAP[key] ?? 'PROCESSING').toUpperCase());
            }
          } catch { /* skip malformed lines */ }
        }
      }

      setDoneNodes(new Set(visited));
      setActiveNode('idle');

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: finalResp || 'No response generated.',
        nodeHistory: visited,
        timestamp: new Date(),
      }]);
      setStatusText('READY');

    } catch (err: any) {
      setIsError(true);
      setActiveNode('idle');
      setStatusText('ERROR');
      const isConnErr = err.message?.includes('fetch') || err.message?.includes('Failed');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: isConnErr
          ? '⚠️  Cannot reach backend. Start the server:\n\n  cd corpus_callosum\n  uvicorn server:app --reload'
          : `⚠️  Error: ${err.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: '#020617',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
    }}>

      {/* ── Left: Brain Visualizer ── */}
      <div style={{
        width: 300, flexShrink: 0,
        borderRight: '1px solid #0f172a',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(2, 6, 23, 0.95)',
      }}>
        {/* Brand */}
        <div style={{
          padding: '22px 22px 18px',
          borderBottom: '1px solid #0f172a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, flexShrink: 0,
              boxShadow: '0 0 16px rgba(124, 58, 237, 0.4)',
            }}>
              🧠
            </div>
            <div>
              <div style={{
                color: '#f1f5f9', fontWeight: 700, fontSize: 14,
                letterSpacing: '0.08em',
              }}>
                CORPUS CALLOSUM
              </div>
              <div style={{ color: '#334155', fontSize: 9, letterSpacing: '0.14em', marginTop: 1 }}>
                NEURO-ARCHITECTURE AI
              </div>
            </div>
          </div>
        </div>

        {/* SVG Brain */}
        <div style={{
          flex: 1, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          padding: '8px 20px',
        }}>
          <BrainVisualizer activeNode={activeNode} doneNodes={doneNodes} />
        </div>

        {/* Status Bar */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #0f172a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.div
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: isError ? '#ef4444' : isStreaming ? '#f97316' : '#10b981',
                flexShrink: 0,
              }}
              animate={isStreaming ? { opacity: [1, 0.2, 1] } : { opacity: 1 }}
              transition={{ repeat: Infinity, duration: 0.75 }}
            />
            <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em', lineHeight: 1.3 }}>
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {/* ── Right: Chat Panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Chat header */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid #0f172a',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(2, 6, 23, 0.8)',
        }}>
          <span style={{ color: '#334155', fontSize: 11, letterSpacing: '0.05em' }}>MODEL</span>
          <span style={{
            background: 'rgba(124, 58, 237, 0.1)',
            border: '1px solid rgba(124, 58, 237, 0.25)',
            color: '#a78bfa',
            fontSize: 11, padding: '3px 11px', borderRadius: 999,
            fontWeight: 600, letterSpacing: '0.04em',
          }}>
            openai/gpt-oss-120b · Groq
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ color: '#1e293b', fontSize: 11 }}>
            {messages.filter(m => m.role === 'user').length} queries
          </span>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '28px 28px 12px',
        }}>
          <AnimatePresence>
            {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
          </AnimatePresence>
          {isStreaming && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '14px 24px 18px',
          borderTop: '1px solid #0f172a',
          background: 'rgba(2, 6, 23, 0.9)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isStreaming}
              placeholder="Send a message to the brain..."
              style={{
                flex: 1,
                background: 'rgba(7, 15, 35, 0.9)',
                border: '1px solid #1e293b',
                borderRadius: 12,
                padding: '11px 16px',
                color: '#e2e8f0',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'Inter, system-ui, sans-serif',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#4f46e580')}
              onBlur={e  => (e.target.style.borderColor = '#1e293b')}
            />
            <motion.button
              type="submit"
              disabled={!input.trim() || isStreaming}
              whileHover={input.trim() && !isStreaming ? { scale: 1.03 } : {}}
              whileTap={input.trim() && !isStreaming ? { scale: 0.97 } : {}}
              style={{
                background: input.trim() && !isStreaming
                  ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                  : '#0f172a',
                border: '1px solid',
                borderColor: input.trim() && !isStreaming ? 'transparent' : '#1e293b',
                borderRadius: 12,
                padding: '0 20px',
                color: input.trim() && !isStreaming ? '#fff' : '#334155',
                cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 7,
                fontSize: 13, fontWeight: 600,
                fontFamily: 'Inter, system-ui, sans-serif',
                minWidth: 88, justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: input.trim() && !isStreaming ? '0 0 16px rgba(79,70,229,0.35)' : 'none',
              }}
            >
              <Send size={14} />
              Send
            </motion.button>
          </form>

          <p style={{
            textAlign: 'center', marginTop: 10,
            fontSize: 10, color: '#1e293b',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}>
            Backend must be running ·{' '}
            <code style={{ color: '#334155' }}>
              cd corpus_callosum && uvicorn server:app --reload
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
