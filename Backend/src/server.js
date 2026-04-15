import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
import { createServer } from 'http';
import UserRoutes from "./routes/UserRoutes.js";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initSocket } from './socket.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import ClientRoutes from './routes/ClientRoutes.js';
import PackageRoutes from './routes/PackageRoutes.js';
import EmployeeRoutes from './routes/EmployeeRoutes.js';
import SalaryRoutes from './routes/SalaryRoutes.js';
import ProjectDetailRoutes from './routes/ProjectDetailRoutes.js';
import PaymentHistoryRoutes from './routes/PaymentHistoryRoutes.js';
import AssignmentRoutes from './routes/AssignmentRoutes.js';
import CustomPackageRoutes from './routes/CustomPackageRoutes.js';
import PaymentLinkRoutes from './routes/PaymentLinkRoutes.js';
import InquiryRoutes from './routes/InquiryRoutes.js';
import CallScheduleRoutes from './routes/CallScheduleRoutes.js';
import PermissionRoutes from './routes/PermissionRoutes.js';
import ProjectRoutes from './routes/ProjectRoutes.js';
import RoleRoutes from './routes/RoleRoutes.js';
import ExpenseRoutes from './routes/ExpenseRoutes.js';
import DisputeRoutes from './routes/DisputeRoutes.js';
import HostingDomainRoutes from './routes/HostingDomainRoutes.js';
import ClientAssetRoutes from './routes/ClientAssetRoutes.js';
import EmailRoutes from './routes/EmailRoutes.js';
import ActivityLogRoutes from './routes/ActivityLogRoutes.js';
import ChatRoutes from './routes/ChatRoutes.js';
import TwoFactorRoutes, { verify2FALoginRoute } from './routes/TwoFactorRoutes.js';
import { verify2FALogin } from './controllers/TwoFactorController.js';
import PasswordResetRoutes from './routes/PasswordResetRoutes.js';
import AdminTwoFactorRoutes from './routes/AdminTwoFactorRoutes.js';
import InvoiceRoutes from './routes/InvoiceRoutes.js';
import AdminAssetRoutes from './routes/AdminAssetRoutes.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
    console.error("ERROR: JWT_SECRET is not set in environment variables. Please add it to your .env file.");
    process.exit(1);
}

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
// Initializing socket.io
initSocket(httpServer);

// Security Headers
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 100 request per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.use(cors());
app.use(express.json());

// Connect to database and start server
const startServer = async () => {
    // Start listening immediately so the port is open even if DB is slow/fails
    httpServer.listen(5001, '0.0.0.0', () => {
        console.log("------------------------------------------");
        console.log("CRM API Server is running on port 5001");
        console.log("Endpoint: http://localhost:5001/api/crm");
        console.log("------------------------------------------");
    });

    try {
        console.log("Attempting to connect to MongoDB...");
        await connectDB();
    } catch (error) {
        console.error("CRITICAL: MongoDB connection failed initially.");
        console.error("The server is still running, but DB-dependent routes will fail.");
        console.error("Error Detail:", error.message);
        // We don't exit(1) here to allow the server to stay alive for diagnostics
    }
};

startServer();

app.use((req, res, next) => {
    console.log(`Req method is ${req.method}`)
    next()
})

app.get("/", (req, res) => {
    res.json({ message: "CRM API is running..." });
});

app.use("/api/crm", UserRoutes);
app.use("/api/users", UserRoutes);
app.use("/api/clients", ClientRoutes);
app.use("/api/packages", PackageRoutes);
app.use("/api/employees", EmployeeRoutes);
app.use("/api/salaries", SalaryRoutes);
app.use("/api/project-details", ProjectDetailRoutes);
app.use("/api/payment-history", PaymentHistoryRoutes);
app.use("/api/assignments", AssignmentRoutes);
app.use("/api/custom-packages", CustomPackageRoutes);
app.use("/api/payment-links", PaymentLinkRoutes);
app.use("/api/inquiries", InquiryRoutes);
app.use("/api/call-schedules", CallScheduleRoutes);
app.use("/api/permissions", PermissionRoutes);
app.use("/api/projects", ProjectRoutes);
app.use("/api/roles", RoleRoutes);
app.use("/api/expenses", ExpenseRoutes);
app.use("/api/disputes", DisputeRoutes);
app.use("/api/hosting-domains", HostingDomainRoutes);
app.use("/api/client-assets", ClientAssetRoutes);
app.use("/api/emails", EmailRoutes);
app.use("/api/activity-logs", ActivityLogRoutes);
app.use("/api/chat", ChatRoutes);
// Password reset routes (no auth required)
app.use("/api/password-reset", PasswordResetRoutes);
// Login verification route (no auth middleware, must be BEFORE /api/2fa route)
app.post("/api/2fa/verify-login", verify2FALogin);
// Other 2FA routes (require authentication)
app.use("/api/2fa", TwoFactorRoutes);
// Admin 2FA management routes (require admin authentication)
app.use("/api/admin-2fa", AdminTwoFactorRoutes);
app.use("/api/invoices", InvoiceRoutes);
app.use("/api/admin-assets", AdminAssetRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);