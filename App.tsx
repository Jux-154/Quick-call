
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Monitor, 
  MonitorOff, 
  Copy, 
  Sparkles,
  User,
  Link as LinkIcon,
  ChevronRight,
  Info,
  Maximize2
} from 'lucide-react';
import { CallStatus } from './types';
import { summarizeCallContext } from './services/geminiService';

const STORAGE_KEY = 'gemini_rtc_user_id';

const App: React.FC = () => {
  // --- State ---
  const [myId, setMyId] = useState<string>('');
  const [remoteId, setRemoteId] = useState<string>('');
  const [status, setStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // --- Refs ---
  const peerRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const lobbyPreviewRef = useRef<HTMLVideoElement>(null);
  const currentCallRef = useRef<any>(null);

  // --- Initialisation ---
  const initializeId = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    if (joinId) setRemoteId(joinId);

    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = Math.random().toString(36).substring(2, 9).toUpperCase();
      localStorage.setItem(STORAGE_KEY, id);
    }
    setMyId(id);
    return id;
  }, []);

  // Démarrer la preview locale dès l'arrivée
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (lobbyPreviewRef.current) lobbyPreviewRef.current.srcObject = stream;
      } catch (e) {
        console.error("Media permission denied", e);
      }
    };
    initMedia();
  }, []);

  useEffect(() => {
    const id = initializeId();
    const peer = new window.Peer(id, {
      debug: 1,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    peer.on('open', () => setIsPeerReady(true));
    peer.on('call', (call: any) => {
      setIncomingCall(call);
      setStatus(CallStatus.RECEIVING);
    });
    peer.on('disconnected', () => peer.reconnect());
    peerRef.current = peer;
    return () => peer.destroy();
  }, [initializeId]);

  // Sync Video Refs
  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream, status]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream, status]);

  // --- Actions ---
  const initiateCall = async () => {
    if (!remoteId) return;
    setStatus(CallStatus.RINGING);
    const call = peerRef.current.call(remoteId, localStream);
    setupCallHandlers(call);
  };

  const answerCall = () => {
    if (!incomingCall) return;
    incomingCall.answer(localStream);
    setupCallHandlers(incomingCall);
  };

  const setupCallHandlers = (call: any) => {
    currentCallRef.current = call;
    call.on('stream', (stream: MediaStream) => {
      setRemoteStream(stream);
      setStatus(CallStatus.IN_CALL);
    });
    call.on('close', endCall);
    call.on('error', endCall);
  };

  const endCall = () => {
    if (currentCallRef.current) currentCallRef.current.close();
    setRemoteStream(null);
    setStatus(CallStatus.IDLE);
    setIncomingCall(null);
    setIsScreenSharing(false);
    setShowAiPanel(false);
  };

  const toggleMic = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      track.enabled = !track.enabled;
      setIsMicMuted(!track.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      track.enabled = !track.enabled;
      setIsVideoOff(!track.enabled);
    }
  };

  const generateAiNotes = async () => {
    setIsAiLoading(true);
    const summary = await summarizeCallContext("Résumé automatique de la session de visioconférence.");
    setAiSummary(summary);
    setIsAiLoading(false);
    setShowAiPanel(true);
  };

  // --- UI Components ---
  const Lobby = () => (
    <div className="max-w-4xl w-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full items-center">
        {/* Preview Gauche */}
        <div className="space-y-6">
          <div className="relative aspect-video bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-700/50">
            <video ref={lobbyPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
              <button onClick={toggleMic} className={`p-2 rounded-xl transition-all ${isMicMuted ? 'text-red-500' : 'text-emerald-400'}`}>
                {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button onClick={toggleVideo} className={`p-2 rounded-xl transition-all ${isVideoOff ? 'text-red-500' : 'text-sky-400'}`}>
                {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
              </button>
            </div>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-white mb-2">Prêt à discuter ?</h2>
            <p className="text-slate-400">Vérifiez votre micro et votre caméra avant de rejoindre.</p>
          </div>
        </div>

        {/* Actions Droite */}
        <div className="space-y-8 bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-sm">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Votre code personnel</span>
            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-white/5 group">
              <span className="text-xl font-mono font-bold text-indigo-400">{myId}</span>
              <button 
                onClick={() => { navigator.clipboard.writeText(myId); alert("Code copié !"); }} 
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 group-hover:text-indigo-400"
              >
                <Copy size={20} />
              </button>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          <div className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Entrez le code de votre ami..." 
                value={remoteId}
                onChange={(e) => setRemoteId(e.target.value.toUpperCase())}
                className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono text-lg"
              />
              {remoteId && (
                <button 
                  onClick={initiateCall}
                  className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-xl font-bold flex items-center space-x-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                >
                  <span>Appeler</span>
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
            {!remoteId && (
              <p className="text-[10px] text-center text-slate-500 font-medium">Saisissez un code pour commencer un appel vidéo sécurisé.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const CallingOverlay = () => (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-300">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="relative w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center border-4 border-indigo-500/50">
          <Phone size={48} className="text-indigo-400 animate-bounce" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-white uppercase tracking-widest">Appel en cours...</h3>
        <p className="text-slate-500 font-mono">{remoteId}</p>
      </div>
      <button onClick={endCall} className="bg-red-500 hover:bg-red-600 text-white p-6 rounded-full shadow-2xl shadow-red-500/20 active:scale-90 transition-all">
        <PhoneOff size={32} />
      </button>
    </div>
  );

  const ReceivingOverlay = () => (
    <div className="fixed inset-0 z-[100] bg-indigo-950/80 backdrop-blur-2xl flex flex-col items-center justify-center space-y-10 animate-in slide-in-from-bottom duration-500">
      <div className="text-center space-y-4">
        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <User size={48} className="text-white" />
        </div>
        <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Appel Entrant</h3>
        <p className="text-indigo-200/60 font-mono tracking-widest">DE: {incomingCall?.peer}</p>
      </div>
      <div className="flex space-x-6">
        <button onClick={endCall} className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-3xl font-bold transition-all border border-white/5">
          Décliner
        </button>
        <button onClick={answerCall} className="bg-emerald-500 hover:bg-emerald-400 text-white px-12 py-4 rounded-3xl font-bold shadow-2xl shadow-emerald-500/40 flex items-center space-x-3 active:scale-95 transition-all">
          <Phone size={24} />
          <span>Répondre</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden font-sans">
      
      {/* Background decoration */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Lobby (Hidden in call) */}
      {status === CallStatus.IDLE && (
        <header className="fixed top-8 left-8 right-8 flex justify-between items-center z-50">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg">
              <Video className="text-white" size={20} />
            </div>
            <span className="text-xl font-black text-white uppercase tracking-tighter">Gemini<span className="text-indigo-500 italic">RTC</span></span>
          </div>
          <div className="flex items-center space-x-4 bg-slate-900/50 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/5">
            <div className={`w-2 h-2 rounded-full ${isPeerReady ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isPeerReady ? 'Serveur Actif' : 'Connexion...'}</span>
          </div>
        </header>
      )}

      {/* Main Viewport */}
      {status === CallStatus.IDLE ? <Lobby /> : (
        <div className="relative w-full h-full max-w-7xl aspect-[16/10] bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border border-white/5 flex">
          {/* Main Video Area */}
          <div className="flex-grow relative bg-black">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            
            {/* PiP Local Video */}
            <div className="absolute top-8 right-8 w-48 md:w-64 aspect-video bg-slate-800 rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-black/50 group">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              {isVideoOff && (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                  <User size={32} className="text-slate-700" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <Maximize2 size={20} className="text-white/70" />
              </div>
            </div>

            {/* Bottom Controls Bar */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-4 bg-slate-900/40 backdrop-blur-2xl px-8 py-5 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <button onClick={toggleMic} className={`p-4 rounded-2xl transition-all ${isMicMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <button onClick={toggleVideo} className={`p-4 rounded-2xl transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
              </button>
              <div className="w-px h-8 bg-white/10 mx-2" />
              <button onClick={() => {}} className="p-4 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all">
                <Monitor size={24} />
              </button>
              <button onClick={generateAiNotes} className={`p-4 rounded-2xl transition-all ${isAiLoading ? 'bg-indigo-500 text-white animate-pulse' : 'bg-white/10 text-indigo-400 hover:bg-white/20'}`}>
                <Sparkles size={24} />
              </button>
              <div className="w-px h-8 bg-white/10 mx-2" />
              <button onClick={endCall} className="bg-red-500 hover:bg-red-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-red-500/20 active:scale-95 transition-all">
                Quitter
              </button>
            </div>
          </div>

          {/* Side AI Panel */}
          {showAiPanel && (
            <div className="w-96 bg-slate-900 border-l border-white/5 flex flex-col animate-in slide-in-from-right duration-500">
               <div className="p-6 border-b border-white/5 flex justify-between items-center">
                 <h4 className="text-sm font-black uppercase tracking-widest text-white flex items-center space-x-2">
                   <Sparkles size={16} className="text-indigo-400" />
                   <span>Notes IA</span>
                 </h4>
                 <button onClick={() => setShowAiPanel(false)} className="text-slate-500 hover:text-white transition-colors">Fermer</button>
               </div>
               <div className="flex-grow p-6 overflow-y-auto space-y-6">
                 {isAiLoading ? (
                   <div className="flex flex-col items-center justify-center h-full space-y-4 text-slate-600">
                     <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                     <p className="text-xs font-bold uppercase tracking-widest">Analyse en cours...</p>
                   </div>
                 ) : (
                   <div className="prose prose-invert text-sm text-slate-400 leading-relaxed font-medium">
                     {aiSummary}
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      )}

      {/* Overlays */}
      {status === CallStatus.RINGING && <CallingOverlay />}
      {status === CallStatus.RECEIVING && <ReceivingOverlay />}

      {/* Footer (Info) */}
      {status === CallStatus.IDLE && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-3 text-slate-600 bg-white/5 px-6 py-3 rounded-full border border-white/5">
           <Info size={14} />
           <p className="text-[10px] font-bold uppercase tracking-widest">Chiffré de bout en bout • Peer-to-Peer direct</p>
        </div>
      )}
    </div>
  );
};

export default App;
