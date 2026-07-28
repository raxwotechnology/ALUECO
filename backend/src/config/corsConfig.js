const defaultOrigins = [
    'https://alueco.netlify.app',
    'https://alueco.onrender.com',
    'https://export-lanka.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
];

export const isOriginAllowed = (origin) => {
    // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
    if (!origin) return true;

    const normalizedOrigin = origin.trim().replace(/\/$/, '').toLowerCase();

    // Check environment variables FRONTEND_URL or CORS_ORIGIN
    const envOrigins = [process.env.FRONTEND_URL, process.env.CORS_ORIGIN]
        .filter(Boolean)
        .flatMap(val => val.split(','))
        .map(o => o.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '').toLowerCase());

    const allowedList = [...defaultOrigins.map(o => o.toLowerCase()), ...envOrigins];

    if (allowedList.includes('*') || allowedList.includes(normalizedOrigin)) {
        return true;
    }

    // Pattern matching for Netlify subdomains, Render services, Vercel deployments, and localhost
    if (
        /\.netlify\.app$/.test(normalizedOrigin) ||
        /\.onrender\.com$/.test(normalizedOrigin) ||
        /\.vercel\.app$/.test(normalizedOrigin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)
    ) {
        return true;
    }

    return false;
};

export const corsOptions = {
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Request from origin '${origin}' blocked.`);
            callback(null, false);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};
