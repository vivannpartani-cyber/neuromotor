import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Cpu, Activity, Fingerprint, Lock, Copy, Check } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Mock Data for the simulation
const generateMockData = () => {
  const data = [];
  let time = 0;
  
  // Normal typing (User)
  for (let i = 0; i < 20; i++) {
    data.push({
      time: time++,
      dwell: 90 + Math.random() * 20,
      flight: 1500 + Math.random() * 200,
      anomalyScore: 0.1 + Math.random() * 0.1,
      status: 'normal'
    });
  }
  
  // Intruder takes over
  for (let i = 0; i < 10; i++) {
    data.push({
      time: time++,
      dwell: 160 + Math.random() * 40,
      flight: 2200 + Math.random() * 500,
      anomalyScore: 0.8 + Math.random() * 0.2,
      status: 'threat'
    });
  }
  return data;
};

const MOCK_DATA = generateMockData();

const CodeSnippet = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden bg-black/60 border border-emerald-500/20 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-emerald-500/20">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        <span className="text-xs text-emerald-400/60 font-mono">Terminal</span>
      </div>
      <div className="p-4 font-mono text-sm text-emerald-300 flex justify-between items-center">
        <code>$ {code}</code>
        <button 
          onClick={handleCopy}
          className="text-emerald-500/50 hover:text-emerald-400 transition-colors focus:outline-none"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isAnimating, setIsAnimating] = useState(true);

  // Animate the chart filling up
  useEffect(() => {
    if (!isAnimating) return;
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < MOCK_DATA.length) {
        setChartData(prev => {
          const newData = [...prev, MOCK_DATA[currentIndex]];
          if (newData.length > 25) return newData.slice(-25);
          return newData;
        });
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setChartData([]);
          setIsAnimating(true); // restart loop
        }, 3000);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isAnimating]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Fingerprint className="text-emerald-500" size={24} />
            <span className="font-bold text-lg tracking-tight text-white">Neuromotor-Auth</span>
          </div>
          <div className="flex space-x-6 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How it Works</a>
            <a href="#install" className="hover:text-emerald-400 transition-colors">Install</a>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-32 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-8">
              <ShieldAlert size={14} />
              <span>Zero-Trust Security</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8">
              Authenticate with your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Subconscious.
              </span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-12 leading-relaxed">
              Neuromotor is a headless background daemon that continuously analyzes your typing cadence and mouse micro-movements. If an intruder touches your keyboard, the OS locks instantly.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-full sm:w-96">
                <CodeSnippet code="pip install neuromotor-auth" />
              </div>
              <a 
                href="#docs" 
                className="px-6 py-4 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors"
              >
                Read Docs
              </a>
            </div>
          </motion.div>
        </section>

        {/* Live Simulation Chart Section */}
        <section className="max-w-7xl mx-auto px-6 py-20" id="how-it-works">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Live Intrusion Simulation</h3>
                <p className="text-slate-400">Monitoring keystroke dwell velocity and flight patterns.</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-medium text-emerald-500 uppercase tracking-wider">Active</span>
              </div>
            </div>

            <div className="h-80 w-full">
              {(() => {
                const isThreat = chartData.length > 0 && chartData[chartData.length - 1].status === 'threat';
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDwell" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorThreat" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis stroke="#475569" fontSize={12} tickFormatter={(val) => `${val}ms`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '0.5rem' }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="dwell" 
                        name="Dwell Time"
                        stroke={isThreat ? '#ef4444' : '#10b981'} 
                        fill={isThreat ? 'url(#colorThreat)' : 'url(#colorDwell)'} 
                        strokeWidth={2} 
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
            
            {/* Status Indicator */}
            <div className="mt-6 flex justify-center">
               <div className={`px-4 py-2 rounded-full font-bold text-sm tracking-widest uppercase transition-colors duration-300 ${chartData.length > 0 && chartData[chartData.length - 1].status === 'threat' ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                 {chartData.length > 0 && chartData[chartData.length - 1].status === 'threat' ? '🚨 ANOMALY DETECTED: LOCKING OS 🚨' : 'SYSTEM SECURE: USER VERIFIED'}
               </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-6 py-20" id="features">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Cpu className="text-emerald-400" size={32} />}
              title="Local Machine Learning"
              description="Powered by a local Isolation Forest algorithm (scikit-learn). Zero network calls. Zero latency. Complete privacy."
            />
            <FeatureCard 
              icon={<Activity className="text-emerald-400" size={32} />}
              title="Continuous Biometrics"
              description="Monitors Key-Dwell, Flight-Time, and Cursor Micro-accelerations in real-time. If you step away and someone else types, it knows."
            />
            <FeatureCard 
              icon={<Lock className="text-emerald-400" size={32} />}
              title="Instant OS Lock"
              description="Headless daemon runs silently in the background. If an intruder is detected, it instantly triggers a hard-lock via AppleScript."
            />
          </div>
        </section>

        {/* Install Instructions */}
        <section className="max-w-3xl mx-auto px-6 py-20 text-center" id="install">
          <h2 className="text-3xl font-bold text-white mb-6">Start Securing Your Terminal</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-left">
            <h4 className="text-lg font-semibold text-white mb-4">1. Install via Pip</h4>
            <div className="mb-6"><CodeSnippet code="pip install neuromotor-auth" /></div>
            
            <h4 className="text-lg font-semibold text-white mb-4">2. Train your Baseline (60s)</h4>
            <div className="mb-6"><CodeSnippet code="neuromotor train --duration 60" /></div>
            
            <h4 className="text-lg font-semibold text-white mb-4">3. Arm the Defense Daemon</h4>
            <div><CodeSnippet code="neuromotor defend" /></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-slate-950 py-8 text-center text-slate-500 text-sm">
        <p>Built with privacy first. Your keystrokes never leave your machine.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/30 transition-colors group">
      <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
