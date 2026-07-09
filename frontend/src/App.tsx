import React, { useEffect, useState, useRef } from 'react';
import { Activity, Shield, ShieldAlert, Cpu, Keyboard, MousePointer2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://127.0.0.1:8000/api';

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
  const evtSourceRef = useRef<EventSource | null>(null);

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
          time: new Date().toLocaleTimeString(),
          dwell: data.latest_dwell,
          flight: data.latest_flight,
          speed: data.latest_speed
        }];
        return newData.slice(-20); // Keep last 20 points
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
      console.error("Failed to fetch status:", e);
    }
  };

  const handleCommand = async (endpoint: string) => {
    try {
      await fetch(`${API_URL}${endpoint}`, { method: 'POST' });
      fetchStatus();
    } catch (e) {
      console.error("Command failed:", e);
    }
  };

  const isTraining = status.engine_state === 'training';
  const isInference = status.engine_state === 'inference';

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      
      {/* Header */}
      <header className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Neuromotor-Auth
          </h1>
          <p className="text-gray-400">Continuous Behavioral Biometric Authentication</p>
        </div>
        
        <div className="flex gap-4">
          <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${status.is_model_trained ? 'bg-success' : 'bg-gray-500'}`} />
            <span className="text-sm font-medium">Model {status.is_model_trained ? 'Trained' : 'Untrained'}</span>
          </div>
          <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
            <Cpu size={16} className={isInference ? 'text-primary' : 'text-gray-400'} />
            <span className="text-sm font-medium capitalize">{status.engine_state}</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Controls */}
        <div className="glass rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield size={20} /> Engine Controls
          </h2>
          
          <button
            onClick={() => handleCommand(isTraining ? '/engine/train/stop' : '/engine/train/start')}
            className={`py-3 px-4 rounded-xl font-medium transition-all duration-300 relative overflow-hidden group ${
              isTraining 
                ? 'bg-accent/20 text-accent border border-accent/50 hover:bg-accent/30' 
                : 'bg-surface hover:bg-surface/80 border border-white/5'
            }`}
          >
            {isTraining ? 'Stop Training & Compile' : 'Start Baseline Training'}
            {isTraining && (
              <motion.div 
                className="absolute inset-0 bg-accent/10"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              />
            )}
          </button>

          <button
            onClick={() => handleCommand(isInference ? '/engine/stop' : '/engine/inference/start')}
            disabled={!status.is_model_trained}
            className={`py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
              !status.is_model_trained
                ? 'opacity-50 cursor-not-allowed bg-surface/50 border border-transparent'
                : isInference
                  ? 'bg-primary/20 text-primary border border-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:bg-primary/30'
                  : 'bg-primary text-white hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]'
            }`}
          >
            {isInference ? 'Stop Defense Mode' : 'Arm Defense (Inference)'}
          </button>
        </div>

        {/* Telemetry Stats */}
        <div className="glass rounded-2xl p-6 md:col-span-2">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Activity size={20} /> Live Telemetry
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Keyboard />} label="Key Buffer" value={status.key_buffer_size} />
            <StatCard icon={<MousePointer2 />} label="Mouse Buffer" value={status.mouse_buffer_size} />
            <StatCard label="Latest Dwell" value={`${telemetry.latest_dwell.toFixed(1)}ms`} highlight />
            <StatCard label="Latest Flight" value={`${telemetry.latest_flight.toFixed(1)}ms`} />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass rounded-2xl p-6 h-[400px]">
         <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Activity size={20} /> Signature Real-time Flow
          </h2>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="time" stroke="#ffffff50" fontSize={12} />
              <YAxis stroke="#ffffff50" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff20', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="dwell" stroke="#3b82f6" strokeWidth={2} dot={false} name="Dwell (ms)" />
              <Line type="monotone" dataKey="flight" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Flight (ms)" />
            </LineChart>
          </ResponsiveContainer>
      </div>

    </div>
  );
}

function StatCard({ icon, label, value, highlight = false }: { icon?: React.ReactNode, label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? 'bg-primary/10 border-primary/30' : 'bg-black/20 border-white/5'}`}>
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        {icon && <span className="text-gray-300 opacity-70">{React.cloneElement(icon as React.ReactElement, { size: 14 })}</span>}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-primary' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}
