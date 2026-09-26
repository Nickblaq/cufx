// src-ts/server.ts
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import Database from 'better-sqlite3';

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = 'data/production.db';

app.use(express.json());

// 🌟 FIX: This makes your main Railway domain return a status message
app.get('/', (req, res) => {
    res.json({
        status: "online",
        message: "Welcome to the Dual-Runtime API Gateway",
        runtimes: ["Node.js/TypeScript", "Python 3"],
        database: "SQLite (Shared)"
    });
});

// Native TS endpoint: Reads directly from the shared SQLite DB
app.get('/ts-users', (req, res) => {
    try {
        const db = new Database(DB_PATH, { timeout: 10000 });
        const rows = db.prepare('SELECT * FROM users').all();
        db.close();
        res.json({ source: "TypeScript Gateway", users: rows });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Proxy Bridge: Forwards any request hitting /py/* directly to Python on port 8000
app.use('/py', createProxyMiddleware({
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    pathRewrite: {
        '^/py': '', // Strips '/py' so '/py/python-status' becomes '/python-status' when hitting Python
    },
}));

app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));
