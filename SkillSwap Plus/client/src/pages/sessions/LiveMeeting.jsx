import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, Mic, MonitorUp, FileText, LogOut, Shield, XCircle, Play, Users } from 'lucide-react';
import { io } from 'socket.io-client';
import api, { API_ORIGIN } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const LiveMeeting = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meetingStarted, setMeetingStarted] = useState(false);
    const [connecting, setConnecting] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [screenSharing, setScreenSharing] = useState(false);
    const [remotePeers, setRemotePeers] = useState([]);
    const [sharedPdf, setSharedPdf] = useState(null);

    const localVideoRef = useRef(null);
    const socketRef = useRef(null);
    const localStreamRef = useRef(null);
    const peerConnectionsRef = useRef(new Map());
    const joinedRoomRef = useRef(false);
    const pollingRef = useRef(null);

    const ownerId = useMemo(() => {
        if (!session) return null;
        const raw = session?.isGroupSession ? (session?.creator?._id || session?.creator) : (session?.mentor?._id || session?.mentor);
        return raw?.toString?.() || null;
    }, [session]);

    const currentUserId = user?._id?.toString?.() || null;
    const isOwner = Boolean(ownerId && currentUserId && ownerId === currentUserId);
    const sessionStatus = String(session?.status || '').toLowerCase();
    const canOpenMeeting = Boolean(isOwner || sessionStatus === 'live');

    const cleanupRemotePeer = useCallback((socketId) => {
        const pc = peerConnectionsRef.current.get(socketId);
        if (pc) {
            pc.ontrack = null;
            pc.onicecandidate = null;
            pc.close();
            peerConnectionsRef.current.delete(socketId);
        }

        setRemotePeers((prev) => prev.filter((peer) => peer.socketId !== socketId));
    }, []);

    const attachLocalStream = useCallback((stream) => {
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
    }, []);

    const setupLocalMedia = useCallback(async () => {
        if (localStreamRef.current) {
            attachLocalStream(localStreamRef.current);
            return localStreamRef.current;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        localStreamRef.current = stream;
        attachLocalStream(stream);
        setMicEnabled(true);
        setVideoEnabled(true);
        return stream;
    }, [attachLocalStream]);

    const createPeerConnection = useCallback((targetSocketId) => {
        if (peerConnectionsRef.current.has(targetSocketId)) {
            return peerConnectionsRef.current.get(targetSocketId);
        }

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        const localStream = localStreamRef.current;
        if (localStream) {
            localStream.getTracks().forEach((track) => {
                pc.addTrack(track, localStream);
            });
        }

        pc.ontrack = (event) => {
            const [stream] = event.streams;
            if (!stream) return;

            setRemotePeers((prev) => {
                const existing = prev.find((peer) => peer.socketId === targetSocketId);
                if (existing) {
                    return prev.map((peer) => (peer.socketId === targetSocketId ? { ...peer, stream } : peer));
                }

                return [...prev, { socketId: targetSocketId, stream, displayName: 'Participant' }];
            });
        };

        pc.onicecandidate = (event) => {
            if (!event.candidate || !socketRef.current) return;

            socketRef.current.emit('meeting:signal', {
                sessionId: id,
                targetSocketId,
                signalType: 'ice-candidate',
                data: event.candidate
            });
        };

        pc.onconnectionstatechange = () => {
            if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
                cleanupRemotePeer(targetSocketId);
            }
        };

        peerConnectionsRef.current.set(targetSocketId, pc);
        return pc;
    }, [cleanupRemotePeer, id]);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await api.get(`/sessions/${id}`);
                if (res.data.success) {
                    const sessionData = res.data.data;
                    setSession(sessionData);
                    setMeetingStarted(String(sessionData?.status || '').toLowerCase() === 'live');
                }
            } catch (err) {
                console.error('Error fetching session for live meeting:', err);
                setError('Could not join the meeting. Please verify your access.');
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [id, user]);

    useEffect(() => {
        if (!session || !user) return undefined;

        if (!canOpenMeeting) {
            setConnecting(false);
            if (!pollingRef.current) {
                pollingRef.current = window.setInterval(async () => {
                    try {
                        const res = await api.get(`/sessions/${id}`);
                        if (res.data?.success) {
                            const updated = res.data.data;
                            setSession(updated);
                            if (String(updated?.status || '').toLowerCase() === 'live') {
                                setMeetingStarted(true);
                            }
                        }
                    } catch (pollError) {
                        console.error('Session polling error:', pollError);
                    }
                }, 5000);
            }

            return () => {
                if (pollingRef.current) {
                    window.clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            };
        }

        const initMeeting = async () => {
            try {
                setConnecting(true);
                await setupLocalMedia();

                const token = localStorage.getItem('token');
                const socket = io(API_ORIGIN, {
                    transports: ['websocket'],
                    auth: {
                        token: token ? `Bearer ${token}` : ''
                    }
                });

                socketRef.current = socket;

                socket.on('meeting:state', (state) => {
                    setMeetingStarted(Boolean(state?.started));
                    if (state?.sharedPdf) {
                        setSharedPdf(state.sharedPdf);
                    }
                });

                socket.on('meeting:started', () => {
                    setMeetingStarted(true);
                });

                socket.on('meeting:peers', async (peers = []) => {
                    for (const peer of peers) {
                        setRemotePeers((prev) => {
                            if (prev.some((item) => item.socketId === peer.socketId)) {
                                return prev;
                            }
                            return [...prev, { socketId: peer.socketId, displayName: peer.displayName || 'Participant', stream: null }];
                        });

                        const pc = createPeerConnection(peer.socketId);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);

                        socket.emit('meeting:signal', {
                            sessionId: id,
                            targetSocketId: peer.socketId,
                            signalType: 'offer',
                            data: offer
                        });
                    }
                });

                socket.on('meeting:user-joined', (peer) => {
                    setRemotePeers((prev) => {
                        if (prev.some((item) => item.socketId === peer.socketId)) {
                            return prev;
                        }
                        return [...prev, { socketId: peer.socketId, displayName: peer.displayName || 'Participant', stream: null }];
                    });
                });

                socket.on('meeting:user-left', ({ socketId }) => {
                    cleanupRemotePeer(socketId);
                });

                socket.on('meeting:pdf-shared', (pdfPayload) => {
                    setSharedPdf(pdfPayload);
                });

                socket.on('meeting:signal', async ({ fromSocketId, signalType, data }) => {
                    const pc = createPeerConnection(fromSocketId);

                    if (signalType === 'offer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(data));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);

                        socket.emit('meeting:signal', {
                            sessionId: id,
                            targetSocketId: fromSocketId,
                            signalType: 'answer',
                            data: answer
                        });
                        return;
                    }

                    if (signalType === 'answer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(data));
                        return;
                    }

                    if (signalType === 'ice-candidate' && data) {
                        await pc.addIceCandidate(new RTCIceCandidate(data));
                    }
                });

                socket.on('connect', () => {
                    if (joinedRoomRef.current) return;

                    socket.emit('meeting:join', {
                        sessionId: id,
                        displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Participant',
                        started: String(session?.status || '').toLowerCase() === 'live',
                        ownerId
                    });
                    joinedRoomRef.current = true;
                    setConnecting(false);
                });

                socket.on('disconnect', () => {
                    joinedRoomRef.current = false;
                });
            } catch (initError) {
                console.error('Meeting initialization error:', initError);
                setError('Unable to access camera/microphone. Please allow permissions and retry.');
                setConnecting(false);
            }
        };

        initMeeting();

        return () => {
            if (pollingRef.current) {
                window.clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [canOpenMeeting, cleanupRemotePeer, createPeerConnection, id, ownerId, session, setupLocalMedia, user]);

    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                window.clearInterval(pollingRef.current);
                pollingRef.current = null;
            }

            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }

            peerConnectionsRef.current.forEach((pc) => pc.close());
            peerConnectionsRef.current.clear();

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
                localStreamRef.current = null;
            }
        };
    }, []);

    const handleStartMeeting = async () => {
        try {
            await api.put(`/sessions/${id}/status`, { status: 'live' });
            setSession((prev) => ({ ...prev, status: 'live' }));
            setMeetingStarted(true);
            if (socketRef.current) {
                socketRef.current.emit('meeting:start', { sessionId: id });
            }
        } catch (startError) {
            console.error('Failed to start meeting:', startError);
            setError(startError.response?.data?.message || 'Failed to start meeting.');
        }
    };

    const toggleMic = () => {
        const stream = localStreamRef.current;
        if (!stream) return;

        stream.getAudioTracks().forEach((track) => {
            track.enabled = !track.enabled;
            setMicEnabled(track.enabled);
        });
    };

    const toggleVideo = () => {
        const stream = localStreamRef.current;
        if (!stream) return;

        stream.getVideoTracks().forEach((track) => {
            track.enabled = !track.enabled;
            setVideoEnabled(track.enabled);
        });
    };

    const toggleScreenShare = async () => {
        const stream = localStreamRef.current;
        if (!stream) return;

        if (!screenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];

                peerConnectionsRef.current.forEach((pc) => {
                    const sender = pc.getSenders().find((item) => item.track && item.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    }
                });

                const cameraTrack = stream.getVideoTracks()[0];
                if (cameraTrack) {
                    stream.removeTrack(cameraTrack);
                }
                stream.addTrack(screenTrack);
                attachLocalStream(stream);
                setScreenSharing(true);

                screenTrack.onended = () => {
                    toggleScreenShare();
                };
                return;
            } catch (shareError) {
                console.error('Screen share error:', shareError);
                return;
            }
        }

        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const cameraTrack = cameraStream.getVideoTracks()[0];
        const screenTrack = stream.getVideoTracks()[0];

        peerConnectionsRef.current.forEach((pc) => {
            const sender = pc.getSenders().find((item) => item.track && item.track.kind === 'video');
            if (sender && cameraTrack) {
                sender.replaceTrack(cameraTrack);
            }
        });

        if (screenTrack) {
            screenTrack.stop();
            stream.removeTrack(screenTrack);
        }

        if (cameraTrack) {
            stream.addTrack(cameraTrack);
        }

        attachLocalStream(stream);
        setScreenSharing(false);
    };

    const handleSharePdf = async (event) => {
        if (!isOwner || !socketRef.current) return;

        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setError('Only PDF files are supported for sharing.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('PDF is too large. Please use files under 10MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const payload = {
                sessionId: id,
                pdfDataUrl: reader.result,
                fileName: file.name
            };

            socketRef.current.emit('meeting:share-pdf', payload);
            setSharedPdf({
                pdfDataUrl: reader.result,
                fileName: file.name,
                sharedAt: new Date().toISOString()
            });
        };
        reader.readAsDataURL(file);
    };

    const handleBack = () => {
        if (user.role === 'mentor') {
            navigate('/mentor/dashboard?tab=sessions');
        } else {
            navigate('/learner/dashboard?tab=my-sessions');
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

    if (!canOpenMeeting) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="max-w-xl w-full bg-slate-900 border border-slate-700 rounded-[2rem] p-8 text-center">
                    <Shield className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-white mb-2">Waiting For Owner Start</h2>
                    <p className="text-slate-400 mb-6">Mentor owner start meeting button click karana thuru Join Now disable wela thiyenawa. session live unama me page eka auto update wenawa.</p>
                    <button onClick={handleBack} className="bg-indigo-600 text-white font-black px-6 py-3 rounded-xl">Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col text-white">
            <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between px-8">
                <div className="flex items-center space-x-4">
                    <button onClick={handleBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-white leading-tight tracking-tight">{session.topic || session.skill}</h1>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center">
                            <Shield className="w-3 h-3 mr-1" /> SkillSwap Local Meet • {isOwner ? 'Owner' : 'Participant'}
                        </p>
                    </div>
                </div>

                <div className="hidden md:flex items-center space-x-3">
                    <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <div className={`w-2 h-2 rounded-full ${meetingStarted ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{meetingStarted ? 'Live Now' : 'Waiting Start'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-300 text-xs">
                        <Users className="w-4 h-4" />
                        <span>{remotePeers.length + 1}</span>
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

            {!meetingStarted && isOwner && (
                <div className="px-8 py-4 border-b border-amber-500/20 bg-amber-500/10 text-amber-200 flex items-center justify-between">
                    <p className="text-sm font-bold">You are the meeting owner. Click start to enable Join Now for participants.</p>
                    <button
                        onClick={handleStartMeeting}
                        className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2"
                    >
                        <Play className="w-4 h-4" /> Start Meeting
                    </button>
                </div>
            )}

            {!meetingStarted && !isOwner && (
                <div className="px-8 py-4 border-b border-amber-500/20 bg-amber-500/10 text-amber-200 text-sm font-bold">
                    Waiting for owner to start the meeting...
                </div>
            )}

            <div className="flex-1 grid lg:grid-cols-[2fr_1fr] gap-0">
                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-[minmax(220px,1fr)]">
                    <div className="bg-black rounded-2xl border border-white/10 overflow-hidden relative">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute left-3 bottom-3 text-xs font-bold bg-black/60 px-2 py-1 rounded">You {isOwner ? '(Owner)' : ''}</div>
                    </div>

                    {remotePeers.length === 0 && (
                        <div className="bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center text-slate-400 text-sm font-medium">
                            {connecting ? 'Connecting to participants...' : 'No one else in this room yet'}
                        </div>
                    )}

                    {remotePeers.map((peer) => (
                        <div key={peer.socketId} className="bg-black rounded-2xl border border-white/10 overflow-hidden relative">
                            {peer.stream ? (
                                <video
                                    autoPlay
                                    playsInline
                                    ref={(node) => {
                                        if (node && node.srcObject !== peer.stream) {
                                            node.srcObject = peer.stream;
                                        }
                                    }}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Connecting video...</div>
                            )}
                            <div className="absolute left-3 bottom-3 text-xs font-bold bg-black/60 px-2 py-1 rounded">{peer.displayName || 'Participant'}</div>
                        </div>
                    ))}
                </div>

                <aside className="border-l border-white/10 p-4 md:p-6 bg-slate-900/50 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <button onClick={toggleMic} className={`p-3 rounded-xl border text-xs font-black uppercase tracking-widest ${micEnabled ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-red-500/15 border-red-500/40 text-red-300'}`}>
                            <Mic className="w-4 h-4 mx-auto mb-1" /> {micEnabled ? 'Mic On' : 'Mic Off'}
                        </button>
                        <button onClick={toggleVideo} className={`p-3 rounded-xl border text-xs font-black uppercase tracking-widest ${videoEnabled ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-red-500/15 border-red-500/40 text-red-300'}`}>
                            <Video className="w-4 h-4 mx-auto mb-1" /> {videoEnabled ? 'Cam On' : 'Cam Off'}
                        </button>
                        <button onClick={toggleScreenShare} className={`p-3 rounded-xl border text-xs font-black uppercase tracking-widest ${screenSharing ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-800 border-white/10 text-slate-200'}`}>
                            <MonitorUp className="w-4 h-4 mx-auto mb-1" /> {screenSharing ? 'Stop Share' : 'Share Screen'}
                        </button>
                    </div>

                    {isOwner && (
                        <label className="block rounded-xl border border-dashed border-indigo-500/40 bg-indigo-500/10 px-4 py-3 cursor-pointer text-center">
                            <FileText className="w-4 h-4 inline mr-2" />
                            <span className="text-xs font-black uppercase tracking-widest">Share PDF / Presentation</span>
                            <input type="file" accept="application/pdf" onChange={handleSharePdf} className="hidden" />
                        </label>
                    )}

                    {sharedPdf && (
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2">Shared Material</p>
                            <p className="text-xs text-slate-300 mb-3 truncate">{sharedPdf.fileName}</p>
                            <iframe title="Shared PDF" src={sharedPdf.pdfDataUrl} className="w-full h-64 rounded border border-white/10 bg-white" />
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default LiveMeeting;
