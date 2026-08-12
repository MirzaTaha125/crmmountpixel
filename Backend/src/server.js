import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
dotenv.config();

// Minimal-noise logging: silence console.log/info/debug unless VERBOSE_LOGS=true.
// console.error and console.warn always work so real issues are not hidden.
if (process.env.VERBOSE_LOGS !== 'true') {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from 'http';
import UserRoutes from "./routes/UserRoutes.js";
import connectDB from "./config/db.js";
import cors from 'cors';
import { corsOriginCallback } from './config/corsConfig.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initSocket } from './socket.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { auditLog } from './middleware/auditMiddleware.js';
import { optionalAuth } from './middleware/authMiddleware.js';
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
import { autoSyncPendingInvoices, stripeInvoiceWebhook, publicInvoiceView } from './controllers/InvoiceController.js';
import AdminAssetRoutes from './routes/AdminAssetRoutes.js';
import PublicInquiryRoutes from './routes/PublicInquiryRoutes.js';
import BrandRoutes from './routes/BrandRoutes.js';
import ChecklistRoutes from './routes/ChecklistRoutes.js';

if (!process.env.JWT_SECRET) {
    console.error("ERROR: JWT_SECRET is not set in environment variables. Please add it to your .env file.");
    process.exit(1);
}

const app = express();
const httpServer = createServer(app);

// VPS/proxy setup (Nginx/Cloudflare): trust X-Forwarded-* headers for correct client IP.
app.set('trust proxy', process.env.TRUST_PROXY || 1);

// Initialize Socket.IO
// Initializing socket.io
initSocket(httpServer);

// CORS — before helmet and routes. Allowlist + CORS_ORIGINS env; *.minutesheet.com over HTTPS in production.
const corsOptions = {
    origin: corsOriginCallback,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    maxAge: 86400,
};

// ─── Public-API origin whitelist (from registered brands) ────────────────────
// /api/public/* is a browser-facing endpoint (brand websites POST inquiries to it).
// We accept requests only when the browser's Origin header matches a hostname the
// admin has registered on a Brand's Official Websites list — everything else is
// blocked at the CORS layer.
//
// Non-browser callers (curl, server-to-server) don't send an Origin header. We
// allow those through so integrations that identify themselves via `brandCode`
// in the request body keep working; CORS is fundamentally a browser mechanism.
import Brand from './model/Brand.js';
import { normalizeHost } from './utils/hostUtils.js';

let publicOriginCache = { hosts: new Set(), fetchedAt: 0 };
async function getAllowedPublicHosts() {
    const now = Date.now();
    if (now - publicOriginCache.fetchedAt < 30_000) return publicOriginCache.hosts;
    try {
        const brands = await Brand.find({ officialWebsites: { $exists: true, $ne: [] } })
            .select('officialWebsites').lean();
        const set = new Set();
        for (const b of brands) for (const h of (b.officialWebsites || [])) set.add(h);
        publicOriginCache = { hosts: set, fetchedAt: now };
    } catch (err) {
        console.error('Public CORS lookup failed:', err.message);
        // On DB error, keep the previous cache — do NOT open the endpoint to everyone.
    }
    return publicOriginCache.hosts;
}

function publicCorsMiddleware(req, res, next) {
    return cors({
        origin: async (origin, callback) => {
            // Strict lockdown — only browsers on a registered brand website may POST.
            // No Origin (curl / server-to-server) is rejected too: the admin explicitly
            // asked that "only that website will be able to send us the endpoint".
            if (!origin) return callback(new Error('Origin header is required'));
            const host = normalizeHost(origin);
            const allowed = await getAllowedPublicHosts();
            if (host && allowed.has(host)) return callback(null, true);
            return callback(new Error(`Origin ${origin} is not a registered brand website`));
        },
        credentials: false,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Accept'],
        maxAge: 3600,
    })(req, res, next);
}

// Called by BrandController after any brand write so the CORS allowlist reflects
// the change immediately instead of waiting for the 30-second cache to expire.
export function invalidatePublicOriginCache() {
    publicOriginCache = { hosts: new Set(), fetchedAt: 0 };
}

app.use((req, res, next) => {
    if (req.path.startsWith('/api/public')) {
        return publicCorsMiddleware(req, res, next);
    }
    // Public invoice viewer — clients click a link and their browser (any
    // origin) fetches the invoice. GET-only, no auth, so open CORS is fine.
    if (req.path.startsWith('/api/invoice-view')) {
        return cors({ origin: true, methods: ['GET', 'OPTIONS'], credentials: false })(req, res, next);
    }
    // Use strict CORS for all other routes
    return cors(corsOptions)(req, res, next);
});

// Security Headers (after CORS so helmet doesn't override CORS headers)
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Stripe webhook MUST receive the raw request body (unparsed) for signature
// verification. Mount it BEFORE express.json() so its handler sees a Buffer,
// not a parsed object. All other routes still get parsed JSON below.
app.post('/api/invoices/webhook/stripe', express.raw({ type: 'application/json' }), stripeInvoiceWebhook);

// Public invoice viewer — GET-only, no auth. Mounted directly so it isn't
// caught by the authenticated /api/invoices/* router below.
app.get('/api/invoice-view/:slug', publicInvoiceView);

app.use(express.json());

// Serve uploaded files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Connect to database and start server
const startServer = async () => {
    // Start listening immediately so the port is open even if DB is slow/fails
    httpServer.listen(5001, '0.0.0.0', () => {
        process.stdout.write("CRM API Server running on http://localhost:5001\n");
        // Quick "is Stripe configured?" summary so the operator can spot a missing key at a glance.
        const sk = process.env.STRIPE_SECRET_KEY || '';
        if (!sk) {
            process.stdout.write("Stripe: DISABLED (STRIPE_SECRET_KEY not set in .env)\n");
        } else {
            const mode = sk.startsWith('sk_live_') ? 'LIVE' : (sk.startsWith('sk_test_') ? 'TEST/SANDBOX' : 'UNKNOWN');
            process.stdout.write(`Stripe: ENABLED (${mode} mode)\n`);
        }
    });

    try {
        await connectDB();
    } catch (error) {
        console.error("CRITICAL: MongoDB connection failed initially.");
        console.error("The server is still running, but DB-dependent routes will fail.");
        console.error("Error Detail:", error.message);
        // We don't exit(1) here to allow the server to stay alive for diagnostics
    }
};

startServer();

// Auto-sync PayPal invoice statuses so an invoice flips to "Paid" by itself — no manual
// Sync click or webhook required. First pass 30s after boot, then every 5 minutes.
// Lightweight: cached OAuth token, capped batch, spaced calls, skips terminal invoices.
// (The PayPal webhook, if configured, still updates instantly; this is the fallback.)
setTimeout(() => autoSyncPendingInvoices().catch(() => {}), 30 * 1000);
setInterval(() => autoSyncPendingInvoices().catch(() => {}), 5 * 60 * 1000);


app.get("/", (req, res) => {
    res.json({ message: "CRM API is running..." });
});

// NOTE: audit logging (audit middleware) is wired here at mount time so individual
// route files stay untouched. Reads are ignored; only successful create/update/delete
// are recorded, attributed to the acting user. Routes that already log richly inside
// their controllers (Users, Clients, Payments, Invoices, 2FA) are intentionally NOT
// wrapped to avoid duplicate entries. Employee/Package/Salary routes are public, so
// `optionalAuth` is added to attribute the acting user when a token is sent.
app.use("/api/crm", UserRoutes);
app.use("/api/users", UserRoutes);
app.use("/api/clients", ClientRoutes);
app.use("/api/packages", optionalAuth, auditLog({ module: 'Packages', entityType: 'Package' }), PackageRoutes);
app.use("/api/employees", optionalAuth, auditLog({ module: 'Employees', entityType: 'Employee' }), EmployeeRoutes);
app.use("/api/salaries", optionalAuth, auditLog({ module: 'Salaries', entityType: 'Salary' }), SalaryRoutes);
app.use("/api/project-details", auditLog({ module: 'Projects', entityType: 'ProjectDetail' }), ProjectDetailRoutes);
app.use("/api/payment-history", PaymentHistoryRoutes);
app.use("/api/assignments", auditLog({ module: 'Assignments', entityType: 'Assignment' }), AssignmentRoutes);
app.use("/api/custom-packages", auditLog({ module: 'Packages', entityType: 'CustomPackage' }), CustomPackageRoutes);
app.use("/api/payment-links", PaymentLinkRoutes);
app.use("/api/inquiries", auditLog({ module: 'Inquiries', entityType: 'Inquiry' }), InquiryRoutes);
app.use("/api/call-schedules", auditLog({ module: 'CallSchedules', entityType: 'CallSchedule' }), CallScheduleRoutes);
app.use("/api/permissions", auditLog({ module: 'Permissions', entityType: 'Permission' }), PermissionRoutes);
app.use("/api/projects", auditLog({ module: 'Projects', entityType: 'Project' }), ProjectRoutes);
app.use("/api/roles", auditLog({ module: 'Roles', entityType: 'Role' }), RoleRoutes);
app.use("/api/expenses", auditLog({ module: 'Expenses', entityType: 'Expense' }), ExpenseRoutes);
app.use("/api/disputes", auditLog({ module: 'Disputes', entityType: 'Dispute' }), DisputeRoutes);
app.use("/api/hosting-domains", auditLog({ module: 'HostingDomains', entityType: 'HostingDomain' }), HostingDomainRoutes);
app.use("/api/client-assets", auditLog({ module: 'Assets', entityType: 'ClientAsset' }), ClientAssetRoutes);
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
app.use("/api/admin-assets", auditLog({ module: 'Assets', entityType: 'AdminAsset' }), AdminAssetRoutes);
app.use("/api/brands", auditLog({ module: 'Brands', entityType: 'Brand' }), BrandRoutes);
app.use("/api/checklists", auditLog({ module: 'BrandStatus', entityType: 'Checklist' }), ChecklistRoutes);
app.use("/api/public", PublicInquiryRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);