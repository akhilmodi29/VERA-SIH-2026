import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, MicOff, Volume2, ShieldAlert, Activity, 
  MessageSquareWarning, AlertOctagon, Fingerprint,
  Wifi, MessageCircle
} from 'lucide-react';

import { useLiveDetection } from '../hooks/useLiveDetection';
import { api } from '../services/api';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const CallDemo: React.FC = () => {
  const [callState, setCallState] = useState<'incoming' | 'active'>('incoming');
  const [callMode, setCallMode] = useState<'live' | 'replay'>('replay');
  const [timerMs, setTimerMs] = useState(0);

  const {
    startLiveDetection,
    stopLiveDetection,
    telemetry,
    accumulatedTranscript,
    accumulatedSignals
  } = useLiveDetection();

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (callState === 'active') {
      intervalRef.current = window.setInterval(() => {
        setTimerMs(prev => prev + 1000);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerMs(0);
      stopLiveDetection();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [callState, stopLiveDetection]);

  const handleAccept = async () => {
    setCallState('active');
    try {
      const session = await api.createSession();
      if (callMode === 'replay') {
        await startLiveDetection(session.session_id, '/scam_call.wav');
      } else {
        await startLiveDetection(session.session_id);
      }
    } catch (err) {
      console.error("Failed to start session or detection", err);
      setCallState('incoming');
      alert(err instanceof Error ? err.message : "Microphone permission denied or backend error.");
    }
  };

  const handleEnd = () => {
    setCallState('incoming');
    stopLiveDetection();
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const riskLevel = (telemetry?.risk_level?.toUpperCase() as RiskLevel) || 'LOW';
  const overallRisk = telemetry?.overall_risk_score != null ? (telemetry.overall_risk_score <= 1.0 ? Math.round(telemetry.overall_risk_score * 100) : telemetry.overall_risk_score) : 0;
  const voiceIntegrity = telemetry?.voice_integrity_score != null ? Math.round(telemetry.voice_integrity_score) : 100;
  const transcript = accumulatedTranscript || "";
  const signals = accumulatedSignals || [];

  const getRiskColor = (level: RiskLevel) => {
    switch(level) {
      case 'LOW': return 'text-emerald-400';
      case 'MEDIUM': return 'text-yellow-500';
      case 'HIGH': return 'text-orange-500';
      case 'CRITICAL': return 'text-red-500';
      default: return 'text-emerald-400';
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] md:min-h-0 md:h-full bg-[#070b14] text-gray-200 md:p-6 gap-0 md:gap-6 overflow-x-hidden">
      
      {/* LEFT: Phone UI */}
      <div className="w-full md:flex-1 md:max-w-sm mx-auto bg-[#F5F7FA] md:rounded-[3rem] shadow-2xl flex flex-col relative overflow-hidden text-slate-800 md:border-[8px] border-slate-900 h-[calc(100dvh-64px)] md:h-auto pt-[env(safe-area-inset-top)] shrink-0">
        
        {/* Top Status Bar (iOS style) */}
        <div className="w-full flex justify-between items-center px-4 md:px-6 pt-2 md:pt-4 pb-2 z-10 relative">
          <div className="text-[14px] md:text-[15px] font-semibold tracking-tight w-14">9:41</div>
          
          {/* Dynamic Island */}
          <div className="w-[100px] md:w-[120px] h-7 md:h-8 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-2 md:top-3 flex items-center justify-end px-3">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shadow-[0_0_4px_rgba(16,185,129,0.8)]"></div>
             <div className="w-1.5 h-1.5 rounded-full bg-blue-700 opacity-50"></div>
          </div>
          
          <div className="flex items-center space-x-1.5">
            <div className="flex space-x-[2px] items-end h-3">
              <div className="w-0.5 h-1.5 bg-slate-800 rounded-sm"></div>
              <div className="w-0.5 h-2 bg-slate-800 rounded-sm"></div>
              <div className="w-0.5 h-2.5 bg-slate-800 rounded-sm"></div>
              <div className="w-0.5 h-3 bg-slate-800 rounded-sm"></div>
            </div>
            <Wifi size={14} strokeWidth={2.5} className="md:w-4 md:h-4" />
            <div className="w-5 md:w-6 h-2.5 md:h-3 border border-slate-800 rounded-[4px] p-[1px] relative flex items-center">
              <div className="bg-slate-800 h-full w-[80%] rounded-[2px]"></div>
              <div className="absolute right-[-3px] top-1/2 -translate-y-1/2 w-[2px] h-1.5 bg-slate-800 rounded-r-sm"></div>
            </div>
          </div>
        </div>

        {/* Call Info Content */}
        <div className="flex-1 flex flex-col items-center pt-4 md:pt-8 px-4 md:px-6 relative z-10 min-h-0">
          <div className="flex items-center text-slate-500 text-xs md:text-sm font-medium mb-4 md:mb-6">
            <Wifi size={12} className="mr-2 md:w-3.5 md:h-3.5" />
            <span>Incoming Wi-Fi call: VERA</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-medium text-[#0f172a] tracking-tight mb-2 text-center leading-tight">Unknown Caller</h2>
          
          {callState === 'incoming' ? (
            <p className="text-base md:text-lg text-slate-500">Incoming call...</p>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-emerald-600 mb-1 animate-pulse">{formatTime(timerMs)}</span>
            </div>
          )}

          {/* Large Avatar */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-b from-[#e2e8f0] to-[#cbd5e1] mt-6 mb-8 md:mt-10 md:mb-12 flex items-center justify-center overflow-hidden shadow-inner relative shrink-0">
             <div className="absolute bottom-[-15%] w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 bg-[#94a3b8] rounded-full"></div>
             <div className="absolute top-[20%] w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-[#94a3b8] rounded-full"></div>
          </div>

          {/* Mode Toggle (subtle integration) */}
          {callState === 'incoming' && (
            <div className="flex bg-slate-200/50 backdrop-blur-md rounded-full p-1 mb-6 md:mb-8 shadow-sm">
              <button 
                onClick={() => setCallMode('live')}
                className={`px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-semibold rounded-full transition-all ${callMode === 'live' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Live
              </button>
              <button 
                onClick={() => setCallMode('replay')}
                className={`px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-semibold rounded-full transition-all ${callMode === 'replay' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Replay
              </button>
            </div>
          )}

          {/* Message Button */}
          {callState === 'incoming' && (
             <button className="flex items-center space-x-2 bg-white px-5 md:px-6 py-2 md:py-2.5 rounded-full shadow-sm text-[#007AFF] font-medium text-sm mb-auto border border-slate-100">
               <MessageCircle size={16} className="text-[#007AFF] md:w-[18px] md:h-[18px]" />
               <span>Message</span>
             </button>
          )}

        </div>

        {/* Call Controls Area */}
        <div className="w-full pb-8 md:pb-12 px-4 md:px-6 relative z-10 shrink-0 mb-[env(safe-area-inset-bottom)]">
          {callState === 'incoming' ? (
            <div className="w-full bg-[#f1f5f9]/80 backdrop-blur-lg rounded-[2.5rem] p-2 md:p-3 flex justify-between items-center shadow-sm relative overflow-hidden">
              <button onClick={handleEnd} className="pl-4 md:pl-6 text-[#475569] font-medium text-base md:text-lg z-10 w-20 md:w-24 text-left">
                Decline
              </button>
              
              <button onClick={handleAccept} className="w-16 h-16 md:w-[72px] md:h-[72px] bg-white rounded-full flex items-center justify-center shadow-md z-10 mx-auto group">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#22c55e] rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Phone size={20} className="text-white fill-white md:w-6 md:h-6" />
                </div>
              </button>

              <button onClick={handleAccept} className="pr-4 md:pr-6 text-[#475569] font-medium text-base md:text-lg z-10 w-20 md:w-24 text-right">
                Answer
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6 md:space-y-8 w-full bg-[#f1f5f9]/80 backdrop-blur-lg rounded-[2.5rem] p-4 md:p-6 shadow-sm">
              <div className="flex justify-around w-full">
                <button className="flex flex-col items-center text-slate-600 hover:text-slate-900 transition-colors">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white flex items-center justify-center mb-2 shadow-sm">
                    <MicOff size={20} className="md:w-6 md:h-6" />
                  </div>
                  <span className="text-[10px] md:text-xs font-medium">Mute</span>
                </button>
                <button className="flex flex-col items-center text-slate-600 hover:text-slate-900 transition-colors">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white flex items-center justify-center mb-2 shadow-sm">
                    <Volume2 size={20} className="md:w-6 md:h-6" />
                  </div>
                  <span className="text-[10px] md:text-xs font-medium">Speaker</span>
                </button>
              </div>
              <button onClick={handleEnd} className="w-16 h-16 md:w-[72px] md:h-[72px] bg-[#ef4444] rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors">
                <PhoneOff size={24} className="text-white fill-white md:w-8 md:h-8" />
              </button>
            </div>
          )}
        </div>
        
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-20%] w-[150%] h-[50%] rounded-[100%] bg-[#e2e8f0]/40 blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-20%] w-[150%] h-[50%] rounded-[100%] bg-[#f8fafc]/80 blur-3xl"></div>
        </div>
      </div>

      {/* RIGHT: VERA Analysis Panel */}
      <div className="flex-2 flex flex-col gap-4 w-full md:w-2/3 xl:w-3/4 overflow-y-auto custom-scrollbar md:pr-2 px-4 md:px-0 py-6 md:py-0 pb-20 md:pb-0 shrink-0">
        
        {/* Critical Banner */}
        {riskLevel === 'CRITICAL' && (
          <div className="bg-red-900/20 border-2 border-red-500 rounded-xl p-4 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse flex flex-col">
            <div className="flex items-center text-red-500 font-bold text-lg mb-2 uppercase tracking-wide">
              <AlertOctagon size={24} className="mr-3 shrink-0" />
              CRITICAL — POSSIBLE SOCIAL ENGINEERING ATTACK
            </div>
            <div className="text-sm text-red-200">
              <span className="font-semibold">Why this is risky:</span> OTP request + financial transfer + urgency + secrecy
            </div>
          </div>
        )}

        {/* Top 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Voice Integrity */}
          <div className="bg-[#0a101d] border border-[#1a2333] rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center text-gray-300 font-semibold text-sm">
                <Activity size={16} className="text-blue-500 mr-2" />
                Voice Integrity
              </div>
              <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full uppercase tracking-wider ${voiceIntegrity < 50 ? 'border-red-900/50 bg-red-900/20 text-red-400' : 'border-emerald-900/50 bg-emerald-900/20 text-emerald-400'}`}>
                {voiceIntegrity < 50 ? 'Synthetic' : 'Genuine'}
              </span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">{voiceIntegrity}%</div>
              <div className="w-full h-1.5 bg-[#121d30] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${voiceIntegrity < 50 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${voiceIntegrity}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Overall Risk */}
          <div className="bg-[#0a101d] border border-[#1a2333] rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center text-gray-300 font-semibold text-sm">
                <ShieldAlert size={16} className="text-blue-500 mr-2" />
                Overall Risk
              </div>
            </div>
            <div className="flex items-center">
              <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-[4px] border-[#121d30] mr-4 shadow-inner"
                style={{ 
                  borderTopColor: riskLevel === 'CRITICAL' ? '#ef4444' : riskLevel === 'HIGH' ? '#f97316' : riskLevel === 'MEDIUM' ? '#eab308' : '#10b981',
                  borderRightColor: riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? (riskLevel === 'CRITICAL' ? '#ef4444' : '#f97316') : 'transparent'
                }}
              >
                <div className="text-lg font-bold text-white">
                  {overallRisk}%
                </div>
              </div>
              <div className="flex flex-col">
                <div className={`text-xl font-bold uppercase tracking-wide ${getRiskColor(riskLevel)}`}>
                  {riskLevel}
                </div>
                <div className="text-[10px] text-gray-500">Risk Assessment</div>
              </div>
            </div>
          </div>

          {/* Threat Progression */}
          <div className="bg-[#0a101d] border border-[#1a2333] rounded-xl p-5 shadow-lg flex flex-col justify-between">
             <div className="flex items-center text-gray-300 font-semibold text-sm mb-4">
                <Activity size={16} className="text-blue-500 mr-2" />
                Threat Progression
              </div>
              <div className="flex justify-between relative w-full px-2 mt-2">
                <div className="absolute top-1.5 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 z-0"></div>
                
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => {
                  const isActive = 
                    (level === 'LOW') ||
                    (level === 'MEDIUM' && (riskLevel === 'MEDIUM' || riskLevel === 'HIGH' || riskLevel === 'CRITICAL')) ||
                    (level === 'HIGH' && (riskLevel === 'HIGH' || riskLevel === 'CRITICAL')) ||
                    (level === 'CRITICAL' && riskLevel === 'CRITICAL');
                  
                  return (
                    <div key={level} className="flex flex-col items-center z-10">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 bg-[#0a101d] transition-all duration-500 ${
                        isActive 
                          ? (level === 'LOW' ? 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' 
                            : level === 'MEDIUM' ? 'border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]'
                            : level === 'HIGH' ? 'border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                            : 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]')
                          : 'border-[#1a2333]'
                      }`}></div>
                      <div className={`text-[8px] font-bold mt-1 ${isActive ? 'text-gray-300' : 'text-gray-600'}`}>{level}</div>
                    </div>
                  );
                })}
              </div>
          </div>
        </div>

        {/* Lower Row: Transcript & Signals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          
          {/* Transcript */}
          <div className="bg-[#0a101d] border border-[#1a2333] rounded-xl p-5 shadow-lg flex flex-col h-full min-h-[200px]">
             <div className="flex justify-between items-center mb-4 border-b border-[#1a2333] pb-2">
              <div className="flex items-center text-gray-300 font-semibold text-sm">
                <MessageSquareWarning size={16} className="text-gray-400 mr-2" />
                Live Transcript
              </div>
            </div>
            <div className="flex-1 overflow-y-auto text-sm text-gray-300 italic leading-relaxed">
              {transcript ? `"${transcript}"` : (
                <span className="text-gray-600 not-italic">Waiting for speech...</span>
              )}
            </div>
          </div>

          {/* Security Signals */}
          <div className="bg-[#0a101d] border border-[#1a2333] rounded-xl p-5 shadow-lg flex flex-col h-full min-h-[200px]">
             <div className="flex justify-between items-center mb-4 border-b border-[#1a2333] pb-2">
              <div className="flex items-center text-gray-300 font-semibold text-sm">
                <Fingerprint size={16} className="text-gray-400 mr-2" />
                Security Signals
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {signals.length > 0 ? (
                signals.map((sig, idx) => (
                   <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border flex items-center bg-orange-900/20 text-orange-400 border-orange-900/50"
                   >
                    <ShieldAlert size={12} className="mr-1.5" />
                    {sig}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">No anomalous vectors detected</span>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default CallDemo;
