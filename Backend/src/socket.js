import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './model/User.js';
import Client from './model/Client.js';
import Assignment from './model/Assignment.js';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Allow all origins for now, or specify frontend URL
            methods: ["GET", "POST"]
        }
    });

    io.use(async (socket, next) => {
        try {
            console.log('Socket Middleware: New connection attempt');
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                console.log('Socket Middleware: No token provided, rejecting');
                // Instead of next(new Error(...)) which sometimes causes issues in specific versions if connection is already closing
                // We can just disconnect manually or return error. Returning error is standard.
                // Let's force disconnect to be safe if next(err) is flaky
                return next(new Error('Authentication error: No token provided'));
            }

            console.log('Socket Middleware: Verifying token');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Socket Middleware: Token verified, type:', decoded.type, 'ID:', decoded.id);

            if (decoded.type === 'Client') {
                console.log('Socket Middleware: Fetching Client...');
                const client = await Client.findById(decoded.id).select("-password");
                if (!client) {
                    console.log('Socket Middleware: Client not found');
                    return next(new Error('Authentication error: Client not found'));
                }
                console.log('Socket Middleware: Client found:', client._id);
                socket.crmClient = client;
                socket.user = null;
                socket.userId = client._id.toString();
                socket.userType = 'Client';
            } else {
                console.log('Socket Middleware: Fetching User...');
                const user = await User.findById(decoded.id).select("-Password -Confirm_Password");
                if (!user) {
                    console.log('Socket Middleware: User not found');
                    return next(new Error('Authentication error: User not found'));
                }
                console.log('Socket Middleware: User found:', user._id);
                socket.user = user;
                socket.crmClient = null;
                socket.userId = user._id.toString();
                socket.userType = 'User';
            }

            console.log('Socket Middleware: Authentication successful, proceeding');
            next();
        } catch (err) {
            console.error("Socket Auth Error:", err.message);
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        try {
            console.log(`User connected: ${socket.userId} (${socket.userType})`);

            // Join a room specific to this user/client updates
            if (socket.userId) {
                socket.join(socket.userId);
            } else {
                console.warn('User connected but no userId??');
            }

            // Join rooms for all chats this user/client is part of
            // This requires fetching the chats this user is part of
            // However, it might be better to let the frontend join rooms for specific chats when they are opened
            // OR simply join the user's personal room and we assume event fan out logic in controller

            // For now, let's allow client to join specific chat rooms
            socket.on('join_chat', (chatId) => {
                console.log(`User ${socket.userId} joined chat: ${chatId}`);
                socket.join(chatId);
            });

            socket.on('leave_chat', (chatId) => {
                console.log(`User ${socket.userId} left chat: ${chatId}`);
                socket.leave(chatId);
            });

            // Handle typing events
            socket.on('typing', ({ chatId, isTyping }) => {
                socket.to(chatId).emit('user_typing', {
                    userId: socket.userId,
                    chatId,
                    isTyping,
                    userType: socket.userType,
                    name: socket.userType === 'Client' ? socket.crmClient.name : `${socket.user.First_Name} ${socket.user.Last_Name}`
                });
            });

            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.userId}`);
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
