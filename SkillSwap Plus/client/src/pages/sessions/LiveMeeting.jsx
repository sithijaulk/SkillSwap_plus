import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, Mic, Share2, LogOut, Shield } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const LiveMeeting = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await api.get(`/sessions/${id}`);
                if (res.data.success) {
                    setSession(res.data.data);
                }
            } catch (err) {
                console.error('Error fetching session for live meeting:', err);
                setError('Could not join the meeting. Please verify your access.');
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [id]);

    const handleBack = () => {
        if (user.role === 'mentor') {
            navigate('/mentor/dashboard?tab=sessions');
        } else {
            navigate('/learner/dashboard?tab=my-learning');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-slate-400 font-medium">Entering Meeting Room...</p>
                </div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 border border-slate-700 p-8 rounded-[2.5rem] max-w-md w-full text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-white mb-2">Connection Failed</h2>
                    <p className="text-slate-400 mb-8">{error || 'Session not found or meeting link missing.'}</p>
                    <button onClick={handleBack} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl">Back to Dashboard</button>
                </div>
            </div>
        );
    }

    // Generate Jitsi URL if not present or just use the ID to stay consistent
    const roomName = `SkillSwap_Plus_SS_${session._id.toString().slice(-8)}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}#config.startWithAudioMuted=true&config.startWithVideoMuted=true`;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Minimal Header */}
            <header className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between px-8">
                <div className="flex items-center space-x-4">
                    <button onClick={handleBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-white leading-tight tracking-tight">{session.topic || session.skill}</h1>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center">
                            <Shield className="w-3 h-3 mr-1" /> Secure Session • {user.role === 'mentor' ? 'Host' : 'Participant'}
                        </p>
                    </div>
                </div>
                
                <div className="hidden md:flex items-center space-x-6">
                    <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Live Now</span>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                     <button 
                        onClick={handleBack}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave
                    </button>
                </div>
            </header>

            {/* Embedded Meeting */}
            <div className="flex-grow relative bg-black">
                <iframe
                    src={jitsiUrl}
                    allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write; speaker"
                    className="absolute inset-0 w-full h-full border-0"
                    title="SkillSwap Live Meeting"
                ></iframe>
            </div>

            {/* Support/Footer info */}
            <div className="bg-slate-900 border-t border-white/5 p-4 hidden md:block">
                <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
                    <div className="flex items-center space-x-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                        <span className="flex items-center"><Video className="w-3.5 h-3.5 mr-1.5" /> Camera Active</span>
                        <span className="flex items-center"><Mic className="w-3.5 h-3.5 mr-1.5" /> Mic Ready</span>
                        <span className="flex items-center"><Share2 className="w-3.5 h-3.5 mr-1.5" /> Screenshare Enabled</span>
                    </div>
                    <p className="text-slate-600 text-[10px] italic">Powered by Jitsi Meet Open Protocol</p>
                </div>
            </div>
        </div>
    );
};

export default LiveMeeting;
