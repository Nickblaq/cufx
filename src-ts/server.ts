import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import Database from 'better-sqlite3';

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = 'data/production.db';

app.use(express.json());

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
        '^/py': '', // Strips '/py' so '/py/add-user' becomes '/add-user' when hitting Python
    },
}));

app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));
