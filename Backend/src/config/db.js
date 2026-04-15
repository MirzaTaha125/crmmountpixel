import mongoose from "mongoose";

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error("ERROR: MONGO_URI is not set in environment variables. Please add it to your .env file.");
            process.exit(1);
        }

        const options = {
            serverSelectionTimeoutMS: 30000, // 30 seconds instead of default 10
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            connectTimeoutMS: 30000, // 30 seconds to establish connection
            maxPoolSize: 10, // Maintain up to 10 socket connections
            minPoolSize: 5, // Maintain at least 5 socket connections
            retryWrites: true,
            w: 'majority',
            family: 4, // Force IPv4 DNS resolution
        };

        await mongoose.connect(process.env.MONGO_URI, options);
        console.log("MongoDB connected successfully");
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected successfully');
        });

    } catch (error) {
        console.error("Error connecting to MongoDB:", error.message);
        
        // Provide helpful error messages
        if (error.name === 'MongooseServerSelectionError') {
            console.error("\n⚠️  MongoDB Atlas Connection Issue Detected!");
            console.error("Possible causes:");
            console.error("1. Your IP address is not whitelisted in MongoDB Atlas");
            console.error("   → Go to: https://cloud.mongodb.com → Network Access → Add IP Address");
            console.error("   → Or add 0.0.0.0/0 to allow all IPs (for development only)");
            console.error("2. Incorrect connection string in MONGO_URI");
            console.error("3. Network/firewall blocking the connection");
            console.error("\nFor more help: https://www.mongodb.com/docs/atlas/security-whitelist/\n");
        }
        
        // Don't exit immediately, allow for retry or graceful shutdown
        // process.exit(1);
        throw error; // Re-throw to let the caller handle it
    }
}

export default connectDB;
