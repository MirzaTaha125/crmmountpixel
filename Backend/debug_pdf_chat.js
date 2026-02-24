import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './src/model/Client.js';
import Chat from './src/model/Chat.js';
import Message from './src/model/Message.js';
import User from './src/model/User.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

const debugClientChat = async () => {
    await connectDB();

    try {
        // Find client by name "Mirza Taha" (from the screenshot)
        const client = await Client.findOne({ name: /Mirza Taha/i });

        if (!client) {
            console.log("Client 'Mirza Taha' not found.");
            // Try updating query or list recent clients
            const clients = await Client.find().limit(3);
            console.log("Recent clients:", clients.map(c => `${c.name} (${c._id})`));
            return;
        }

        console.log(`Found Client: ${client.name} (${client._id})`);

        // Find Chats
        const chats = await Chat.find({ clientId: client._id });
        console.log(`Found ${chats.length} chats for this client.`);

        if (chats.length === 0) {
            // Check if there are chats via participants? (Unlikely for client context usually)
            return;
        }

        for (const chat of chats) {
            console.log(`\nChat ID: ${chat._id}`);
            console.log(`  Participants: ${chat.participants}`);

            // Find Messages
            const messages = await Message.find({ chatId: chat._id }).sort({ createdAt: 1 });
            console.log(`  Found ${messages.length} messages.`);

            for (const msg of messages) {
                const type = msg.clientId ? "CLIENT" : (msg.senderId ? "USER" : "SYSTEM");
                const sender = msg.clientId || msg.senderId || "None";
                console.log(`    [${type}] ${sender}: ${msg.message} (ID: ${msg._id})`);
            }
        }

    } catch (error) {
        console.error("Debug Error:", error);
    } finally {
        await mongoose.disconnect();
    }
};

debugClientChat();
