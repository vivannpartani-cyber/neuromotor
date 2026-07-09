import React, { useEffect, useState, useRef } from 'react';
import { Activity, Shield, ShieldAlert, Cpu, Keyboard, MousePointer2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://127.0.0.1:8000/api';

type Toast = { id: string; message: string; type: 'error' | 'success' };

export default function App() {
  const [status, setStatus] = useState({
    engine_state: 'idle',
    is_model_trained: false,
    key_buffer_size: 0,
    mouse_buffer_size: 0,
  });

  const [telemetry, setTelemetry] = useState({
    latest_dwell: 0,
    latest_flight: 0,
    latest_speed: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const evtSourceRef = useRef<EventSource | null>(null);

  const addToast = (message: string, type: 'error' | 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    fetchStatus();

    // Setup SSE connection
    evtSourceRef.current = new EventSource(`${API_URL}/stream`);
    
    evtSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      setStatus(prev => ({
        ...prev,
        engine_state: data.engine_state,
        key_buffer_size: data.key_count,
        mouse_buffer_size: data.mouse_count,
      }));

      setTelemetry({
        latest_dwell: data.latest_dwell,
        latest_flight: data.latest_flight,
        latest_speed: data.latest_speed,
      });

      setChartData(prev => {
        const newData = [...prev, {
          time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' }),
          dwell: data.latest_dwell,
          flight: data.latest_flight,
        }];
        return newData.slice(-30); // Keep last 30 points for a denser look
      });
    };

    return () => {
      if (evtSourceRef.current) {
        evtSourceRef.current.close();
      }
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/status`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      addToast("Failed to connect to Local Agent.", "error");
    }
  };

  const handleCommand = async (endpoint: string) => {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.detail || "Command failed", "error");
      } else {
        if (endpoint.includes('train/stop')) addToast("AI Baseline Model Compiled Successfully!", "success");
        if (endpoint.includes('inference/start')) addToast("Defense System Armed.", "success");
      }
      fetchStatus();
    } catch (e) {
      addToast("Network Error: Could not reach agent.", "error");
    }
  };

  const isTraining = status.engine_state === 'training';
  const isInference = status.engine_state === 'inference';

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto relative overflow-hidden">
      
      {/* Toasts Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`glass-panel p-4 rounded-xl flex items-center gap-3 border-l-4 ${t.type === 'error' ? 'border-l-danger' : 'border-l-success'}`}
            >
              {t.type === 'error' ? <AlertCircle className="text-danger" size={20}/> : <CheckCircle2 className="text-success" size={20}/>}
              <p className="font-medium text-sm text-gray-200">{t.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between md:items-end mb-12 gap-6 relative z-10">
        <div>
          <h1 className="text-5xl font-black text-gradient mb-3 tracking-tight">
            Neuromotor-Auth
          </h1>
          <p className="text-gray-400 font-medium tracking-wide">ZERO-TRUST BEHAVIORAL BIOMETRICS</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="glass-panel px-5 py-2.5 rounded-full flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              {status.is_model_trained && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${status.is_model_trained ? 'bg-success' : 'bg-gray-500'}`}></span>
            </div>
            <span className="text-sm font-semibold tracking-wide text-gray-200">
              {status.is_model_trained ? 'Model Active' : 'Untrained Baseline'}
            </span>
          </div>
          
          <div className="glass-panel px-5 py-2.5 rounded-full flex items-center gap-3">
            <Cpu size={18} className={isInference ? 'text-primary' : (isTraining ? 'text-accent' : 'text-gray-500')} />
            <span className="text-sm font-semibold tracking-wide uppercase text-gray-200">
              {status.engine_state}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Controls Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl p-8 flex flex-col gap-6"
        >
          <h2 className="text-xl font-bold flex items-center gap-3 text-white/90">
            <Shield size={24} className="text-primary"/> Command Center
          </h2>
          
          <p className="text-sm text-gray-400 leading-relaxed mb-2">
            Establish a biometric baseline by typing and moving your mouse normally. Once trained, arm the defense system to automatically lock the OS on foreign inputs.
          </p>

          <button
            onClick={() => handleCommand(isTraining ? '/engine/train/stop' : '/engine/train/start')}
            className={`py-4 px-6 rounded-2xl font-bold tracking-wide transition-all duration-300 relative overflow-hidden group ${
              isTraining 
                ? 'bg-accent/10 text-accent border border-accent/40 hover:bg-accent/20 glow-accent' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isTraining ? (
                <><Activity size={18} className="animate-pulse"/> Stop Training & Compile AI</>
              ) : 'Start Baseline Training'}
            </span>
          </button>

          <button
            onClick={() => handleCommand(isInference ? '/engine/stop' : '/engine/inference/start')}
            disabled={!status.is_model_trained}
            className={`py-4 px-6 rounded-2xl font-bold tracking-wide transition-all duration-300 relative overflow-hidden ${
              !status.is_model_trained
                ? 'opacity-40 cursor-not-allowed bg-white/5 border border-transparent'
                : isInference
                  ? 'bg-danger/10 text-danger border border-danger/40 glow-danger hover:bg-danger/20'
                  : 'bg-primary text-white hover:bg-primary/90 glow-primary border border-primary/50'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isInference ? <><ShieldAlert size={18}/> Disarm Defense System</> : 'Arm Defense Mode'}
            </span>
          </button>
        </motion.div>

        {/* Telemetry Stats & Chart */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Keyboard />} label="Keys Buffered" value={status.key_buffer_size} />
            <StatCard icon={<MousePointer2 />} label="Mouse Buffered" value={status.mouse_buffer_size} />
            <StatCard label="Dwell Velocity" value={`${telemetry.latest_dwell.toFixed(1)}ms`} highlight />
            <StatCard label="Flight Velocity" value={`${telemetry.latest_flight.toFixed(1)}ms`} highlight color="accent" />
          </div>

          {/* Glowing Area Chart */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-3xl p-8 h-[400px] flex flex-col"
          >
             <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-white/90">
                <Activity size={24} className="text-accent" /> Neuromotor Signature Pulse
              </h2>
              <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDwell" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFlight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={11} tickMargin={10} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={(val) => `${val}ms`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                      }}
                      itemStyle={{ fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="dwell" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorDwell)" name="Dwell Time" />
                    <Area type="monotone" dataKey="flight" stroke="var(--color-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorFlight)" name="Flight Time" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, highlight = false, color = 'primary' }: { icon?: React.ReactNode, label: string, value: string | number, highlight?: boolean, color?: 'primary'|'accent' }) {
  const isPrimary = color === 'primary';
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={`glass-panel p-5 rounded-2xl border-t border-l border-white/10 ${highlight ? (isPrimary ? 'glow-primary border-t-primary/30 border-l-primary/30' : 'glow-accent border-t-accent/30 border-l-accent/30') : ''}`}
    >
      <div className="flex items-center gap-2 text-gray-400 mb-3">
        {icon && <span className="text-gray-500">{React.cloneElement(icon as React.ReactElement, { size: 16 })}</span>}
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
      </div>
      <div className={`text-3xl font-black tracking-tight ${highlight ? (isPrimary ? 'text-primary' : 'text-accent') : 'text-white'}`}>
        {value}
      </div>
    </motion.div>
  );
}
