const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');

const roomState = new Map();

const allowOrigin = (origin) => {
    if (!origin || config.NODE_ENV === 'development') {
        return true;
    }

    return origin === config.CLIENT_URL;
};

const getTokenFromHandshake = (socket) => {
    const authHeader = socket.handshake?.auth?.token || socket.handshake?.headers?.authorization;
    if (!authHeader) {
        return null;
    }

    if (authHeader.startsWith('Bearer ')) {
        return authHeader.replace('Bearer ', '').trim();
    }

    return authHeader;
};

const initializeMeetingGateway = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (allowOrigin(origin)) {
                    return callback(null, true);
                }
                return callback(new Error('CORS not allowed'));
            },
            credentials: true
        }
    });

    io.use((socket, next) => {
        try {
            const token = getTokenFromHandshake(socket);
            if (!token) {
                return next(new Error('Unauthorized socket connection'));
            }

            const decoded = jwt.verify(token, config.JWT_SECRET);
            socket.user = {
                userId: decoded.userId,
                role: decoded.role
            };
            return next();
        } catch (error) {
            return next(new Error('Invalid socket token'));
        }
    });

    io.on('connection', (socket) => {
        socket.on('meeting:join', (payload = {}) => {
            const { sessionId, displayName, started = false, ownerId = null } = payload;

            if (!sessionId || !socket.user?.userId) {
                socket.emit('meeting:error', { message: 'Invalid meeting join payload' });
                return;
            }

            const roomId = `meeting:${sessionId}`;
            socket.join(roomId);
            socket.data.sessionId = sessionId;
            socket.data.displayName = displayName || 'Participant';

            const existingState = roomState.get(sessionId) || {
                started: Boolean(started),
                ownerId: ownerId || socket.user.userId,
                sharedPdf: null
            };

            roomState.set(sessionId, existingState);

            socket.emit('meeting:state', {
                started: existingState.started,
                ownerId: existingState.ownerId,
                sharedPdf: existingState.sharedPdf
            });

            socket.to(roomId).emit('meeting:user-joined', {
                socketId: socket.id,
                userId: socket.user.userId,
                displayName: socket.data.displayName,
                role: socket.user.role
            });

            const peers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
                .filter((peerSocketId) => peerSocketId !== socket.id)
                .map((peerSocketId) => {
                    const peerSocket = io.sockets.sockets.get(peerSocketId);
                    return {
                        socketId: peerSocketId,
                        userId: peerSocket?.user?.userId,
                        displayName: peerSocket?.data?.displayName,
                        role: peerSocket?.user?.role
                    };
                });

            socket.emit('meeting:peers', peers);
        });

        socket.on('meeting:start', ({ sessionId }) => {
            if (!sessionId) {
                return;
            }

            const state = roomState.get(sessionId);
            if (!state) {
                return;
            }

            if (state.ownerId !== socket.user.userId) {
                socket.emit('meeting:error', { message: 'Only the meeting owner can start this session' });
                return;
            }

            state.started = true;
            roomState.set(sessionId, state);
            io.to(`meeting:${sessionId}`).emit('meeting:started', { sessionId });
        });

        socket.on('meeting:signal', ({ sessionId, targetSocketId, signalType, data }) => {
            if (!sessionId || !targetSocketId || !signalType) {
                return;
            }

            io.to(targetSocketId).emit('meeting:signal', {
                sessionId,
                fromSocketId: socket.id,
                signalType,
                data
            });
        });

        socket.on('meeting:share-pdf', ({ sessionId, pdfDataUrl, fileName }) => {
            if (!sessionId || !pdfDataUrl) {
                return;
            }

            const state = roomState.get(sessionId);
            if (!state) {
                return;
            }

            if (state.ownerId !== socket.user.userId) {
                socket.emit('meeting:error', { message: 'Only the meeting owner can share PDFs' });
                return;
            }

            state.sharedPdf = {
                pdfDataUrl,
                fileName: fileName || 'Shared.pdf',
                sharedAt: new Date().toISOString()
            };
            roomState.set(sessionId, state);

            io.to(`meeting:${sessionId}`).emit('meeting:pdf-shared', state.sharedPdf);
        });

        socket.on('disconnect', () => {
            const { sessionId } = socket.data || {};
            if (!sessionId) {
                return;
            }

            const roomId = `meeting:${sessionId}`;
            socket.to(roomId).emit('meeting:user-left', { socketId: socket.id });

            const roomSockets = io.sockets.adapter.rooms.get(roomId);
            if (!roomSockets || roomSockets.size === 0) {
                roomState.delete(sessionId);
            }
        });
    });

    return io;
};

module.exports = {
    initializeMeetingGateway
};
