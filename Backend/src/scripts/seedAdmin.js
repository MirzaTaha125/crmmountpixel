import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';
import dotenv from 'dotenv';
import User from '../model/User.js';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });
        console.log('MongoDB connected');

        const existing = await User.findOne({ Email: 'admin@gmail.com' });
        if (existing) {
            console.log('Admin already exists, skipping.');
            process.exit(0);
        }

        const hashed = await bcrypt.hash('admin123', 10);

        await User.create({
            First_Name: 'Admin',
            Last_Name: 'User',
            Email: 'admin@gmail.com',
            Password: hashed,
            Confirm_Password: hashed,
            Role: 'Admin',
        });

        console.log('Admin seeded successfully: admin@gmail.com / admin123');
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
    }
};

seedAdmin();
