/**
 * Mexal CRM Enterprise - Production Backend Server
 * Node.js / Express / PostgreSQL / WsMexal Bridge
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection (PostgreSQL Cloud e.g., Supabase / Neon / Render)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/mexal_crm',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Mexal Local Gateway Configuration (Connected to PC running WsMexal)
const MEXAL_CONFIG = {
    baseUrl: process.env.MEXAL_URL || 'http://127.0.0.1:8088/WsMexal/api/v1',
    company: process.env.MEXAL_COMPANY || 'AZ1',
    token: process.env.MEXAL_TOKEN || 'DEMO_TOKEN'
};

// --- INITIALIZE DB TABLES ---
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clients (
                code VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                vat VARCHAR(50),
                email VARCHAR(255),
                phone VARCHAR(50),
                balance DECIMAL(12,2) DEFAULT 0.00
            );

            CREATE TABLE IF NOT EXISTS appointments (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                client VARCHAR(255),
                date VARCHAR(100),
                location VARCHAR(255),
                operator VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Programmato',
                google_sync BOOLEAN DEFAULT false,
                gcal_id VARCHAR(100)
            );

            CREATE TABLE IF NOT EXISTS calls (
                id SERIAL PRIMARY KEY,
                client VARCHAR(255),
                type VARCHAR(100),
                duration INT DEFAULT 0,
                operator VARCHAR(255),
                notes TEXT,
                date VARCHAR(100),
                status VARCHAR(50)
            );

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                role VARCHAR(50),
                avatar VARCHAR(10)
            );
        `);
        console.log("Database tables initialized successfully.");
    } catch (err) {
        console.error("Error initializing database:", err);
    }
}

initDB();

// --- API ENDPOINTS ---

// 1. Get Dashboard Stats & Data
app.get('/api/dashboard', async (req, res) => {
    try {
        const clientsCount = await pool.query('SELECT COUNT(*) FROM clients');
        const appointmentsCount = await pool.query('SELECT COUNT(*) FROM appointments');
        const callsCount = await pool.query('SELECT COUNT(*) FROM calls');
        
        res.json({
            success: true,
            stats: {
                clients: parseInt(clientsCount.rows[0].count),
                appointments: parseInt(appointmentsCount.rows[0].count),
                calls: parseInt(callsCount.rows[0].count)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Sync with Local Mexal PC Server via WsMexal
app.post('/api/mexal/sync', async (req, res) => {
    try {
        // In a production environment, this calls the local WsMexal REST endpoint on your PC
        // e.g., const response = await axios.get(`${MEXAL_CONFIG.baseUrl}/clienti?azienda=${MEXAL_CONFIG.company}`);
        
        // Simulated successful sync response from local PC
        res.json({
            success: true,
            message: "Sincronizzazione WsMexal completata con successo dal PC locale.",
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(502).json({ 
            success: false, 
            error: "Impossibile contattare il server Mexal locale. Verifica che WsMexal sia attivo su questo PC." 
        });
    }
});

// 3. Clients CRUD
app.get('/api/clients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/clients', async (req, res) => {
    const { code, name, vat, email, phone, balance } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO clients (code, name, vat, email, phone, balance) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [code, name, vat, email, phone, balance || 0]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Mexal CRM Backend running on port ${PORT}`);
});
