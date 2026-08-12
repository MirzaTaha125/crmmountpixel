import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { corsOriginCallback } from './config/corsConfig.js';
import User from './model/User.js';
import Client from './model/Client.js';

let io;

// Map<userId, Set<socketId>> — tracks active sockets per user/client
const onlineUsers = new Map();

const addSocket = (userId, socketId) => {
    if (!userId) return;
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socketId);
};

const removeSocket = (userId, socketId) => {
    if (!userId || !onlineUsers.has(userId)) return false;
    const set = onlineUsers.get(userId);
    set.delete(socketId);
    if (set.size === 0) {
        onlineUsers.delete(userId);
        return true; // user is now offline
    }
    return false;
};

export const isUserOnline = (userId) => {
    if (!userId) return false;
    return onlineUsers.has(userId.toString());
};

export const getOnlineUserIds = () => Array.from(onlineUsers.keys());

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: corsOriginCallback,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.type === 'Client') {
                const client = await Client.findById(decoded.id).select("-password");
                if (!client) {
                    return next(new Error('Authentication error: Client not found'));
                }
                socket.crmClient = client;
                socket.user = null;
                socket.userId = client._id.toString();
                socket.userType = 'Client';
            } else {
                const user = await User.findById(decoded.id).select("-Password -Confirm_Password");
                if (!user) {
                    return next(new Error('Authentication error: User not found'));
                }
                socket.user = user;
                socket.crmClient = null;
                socket.userId = user._id.toString();
                socket.userType = 'User';
            }

            next();
        } catch (err) {
            console.error("Socket Auth Error:", err.message);
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        try {
            if (socket.userId) {
                socket.join(socket.userId);

                // Staff (CRM users, not clients) join a shared room so we can broadcast
                // staff-wide notifications such as new inquiries to all of them at once.
                if (socket.userType === 'User') {
                    socket.join('staff');
                }

                const wasOffline = !onlineUsers.has(socket.userId);
                addSocket(socket.userId, socket.id);

                // Notify others when a user comes online (only on first socket)
                if (wasOffline) {
                    socket.broadcast.emit('user_online', {
                        userId: socket.userId,
                        userType: socket.userType,
                    });
                }

                // Send current online list to the newly-connected client
                socket.emit('online_users', { userIds: getOnlineUserIds() });
            }

            socket.on('join_chat', (chatId) => {
                socket.join(chatId);
            });

            socket.on('leave_chat', (chatId) => {
                socket.leave(chatId);
            });

            socket.on('typing', ({ chatId, isTyping }) => {
                socket.to(chatId).emit('user_typing', {
                    userId: socket.userId,
                    chatId,
                    isTyping,
                    userType: socket.userType,
                    name: socket.userType === 'Client'
                        ? socket.crmClient?.name
                        : `${socket.user?.First_Name || ''} ${socket.user?.Last_Name || ''}`.trim(),
                });
            });

            socket.on('disconnect', () => {
                if (socket.userId) {
                    const wentOffline = removeSocket(socket.userId, socket.id);
                    if (wentOffline) {
                        socket.broadcast.emit('user_offline', {
                            userId: socket.userId,
                            userType: socket.userType,
                        });
                    }
                }
            });
        } catch (err) {
            console.error('Error within connection handler:', err);
        }
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

/**
 * Broadcast a "new inquiry" notification to all connected staff (CRM users).
 * Safe to call from anywhere — never throws, so it can't break inquiry creation.
 */
export const emitNewInquiry = (inquiry) => {
    try {
        if (!io || !inquiry) return;
        io.to('staff').emit('new_inquiry', {
            _id: inquiry._id,
            name: inquiry.name,
            email: inquiry.email,
            phone: inquiry.phone,
            reason: inquiry.reason || inquiry.message || '',
            source: inquiry.source || '',
            brand: inquiry.brand || '',
            businessName: inquiry.businessName || '',
            sourceUrl: inquiry.sourceUrl || '',
            createdByName: inquiry.createdByName || '',
            createdAt: inquiry.createdAt || new Date(),
        });
    } catch (err) {
        // A socket failure must never break the inquiry flow.
        console.error('emitNewInquiry failed:', err.message);
    }
};
