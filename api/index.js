// Fuerza redeploy - 2024-06-23 17:00
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Sirve archivos estáticos desde la raíz

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Usamos la Service Key aquí, que está en sus variables de entorno
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Middleware de Autenticación usando jsonwebtoken
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No se proporcionó token.' });
    }
    try {
        // Verifica el JWT con la clave pública de Supabase
        const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });
        req.user = { id: decoded.sub };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido.', error: err.message });
    }
};

// Aplicar Middleware a todas las rutas de la API
app.use('/api', authMiddleware);

// Middleware para obtener el user id desde el header (o ajusta según tu auth)
function getProfileId(req) {
    // Por ejemplo, desde un header personalizado:
    return req.headers['x-profile-id'];
}

// --- RUTAS DE LA API (AHORA PROTEGIDAS) ---

app.get('/api/data/:monthId', async (req, res) => {
    const { monthId } = req.params;
    const userId = req.user.id;
    try {
        const budgetRes = await pool.query('SELECT amount FROM budgets WHERE user_id = $1 AND month_id = $2', [userId, monthId]);
        let transactionsRes;
        try {
            transactionsRes = await pool.query(`SELECT t._id, t.description, t.amount, t.type, t.category_id, t.comments, c.name as category_name, t.date FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1 AND t.month_id = $2 ORDER BY t.date DESC`, [userId, monthId]);
        } catch (err) {
            transactionsRes = { rows: [] };
        }
        res.status(200).json({ budget: budgetRes.rows.length > 0 ? parseFloat(budgetRes.rows[0].amount) : 0, transactions: transactionsRes.rows });
    } catch (error) { 
        console.error(`Error en /api/data/${monthId}: `, error);
        res.status(200).json({ budget: 0, transactions: [] });
    }
});

app.post('/api/transactions', async (req, res) => {
    const { description, amount, type, categoryId, date, monthId, comments } = req.body;
    const userId = req.user.id;
    const query = `INSERT INTO transactions (description, amount, type, category_id, date, month_id, comments, user_id, user_id_legacy) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;`;
    try {
        const result = await pool.query(query, [description, amount, type, categoryId, date, monthId, comments, userId, userId]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error en POST /api/transactions', error);
        res.status(500).json({ message: 'Error al crear la transacción' });
    }
});

app.post('/api/budget', async (req, res) => {
    const { monthId, amount } = req.body;
    const userId = req.user.id;
    const query = `INSERT INTO budgets (user_id, month_id, amount) VALUES ($1, $2, $3) ON CONFLICT (user_id, month_id) DO UPDATE SET amount = EXCLUDED.amount;`;
    try {
        await pool.query(query, [userId, monthId, amount]);
        res.status(200).json({ message: "Presupuesto guardado" });
    } catch (error) {
        console.error('Error en POST /api/budget', error);
        res.status(500).json({ message: 'Error al guardar el presupuesto' });
    }
});

app.patch('/api/transactions/:id/details', async (req, res) => {
    const { id } = req.params;
    const { description, comments } = req.body;
    if (!description) {
        return res.status(400).json({ message: 'La descripción es requerida.' });
    }
    try {
        const result = await pool.query('UPDATE transactions SET description = $1, comments = $2 WHERE _id = $3 AND user_id = $4 RETURNING *', [description, comments, id, req.user.id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Transacción no encontrada.' });
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(`Error en PATCH /api/transactions/${id}/details`, error);
        res.status(500).json({ message: 'Error al actualizar la transacción.' });
    }
});

app.get('/api/categories', async (req, res) => {
    const profileId = getProfileId(req);
    if (!profileId) return res.status(401).json({ message: 'No autorizado' });
    try {
        const result = await pool.query('SELECT id, name FROM categories WHERE profile_id = $1 ORDER BY name ASC', [profileId]);
        res.status(200).json(result.rows);
    } catch (error) { 
        res.status(500).json({ message: 'Error al obtener categorías' }); 
    }
});

app.post('/api/categories', async (req, res) => {
    const profileId = getProfileId(req);
    const { name } = req.body;
    if (!profileId) return res.status(401).json({ message: 'No autorizado' });
    try {
        const result = await pool.query('INSERT INTO categories (name, profile_id) VALUES ($1, $2) ON CONFLICT (name, profile_id) DO NOTHING RETURNING *', [name, profileId]);
        if (result.rows.length === 0) return res.status(409).json({ message: 'La categoría ya existe' });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear la categoría' });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    const profileId = getProfileId(req);
    const { id } = req.params;
    if (!profileId) return res.status(401).json({ message: 'No autorizado' });
    try {
        await pool.query('UPDATE transactions SET category_id = NULL WHERE category_id = $1', [id]);
        const result = await pool.query('DELETE FROM categories WHERE id = $1 AND profile_id = $2', [id, profileId]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Categoría no encontrada" });
        res.status(200).json({ message: "Categoría eliminada" });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la categoría' });
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM transactions WHERE _id = $1 AND user_id = $2', [id, req.user.id]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Transacción no encontrada" });
        res.status(200).json({ message: "Transacción eliminada" });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la transacción' });
    }
});

app.patch('/api/transactions/:id/category', async (req, res) => {
    const { id } = req.params;
    const { categoryId } = req.body;
    if (categoryId === undefined) return res.status(400).json({ message: 'Se requiere el ID de la categoría.' });
    try {
        const result = await pool.query('UPDATE transactions SET category_id = $1 WHERE _id = $2 AND user_id = $3 RETURNING *', [categoryId, id, req.user.id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Transacción no encontrada.' });
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la categoría de la transacción.' });
    }
});

app.get('/api/annual-summary/:year', async (req, res) => {
    const { year } = req.params;
    const userId = req.user.id;
    if (isNaN(year)) return res.status(400).json({ message: 'El año proporcionado no es válido.' });
    try {
        const expensesQuery = `SELECT to_char(date, 'YYYY-MM') as month, SUM(amount) as total_expenses FROM transactions WHERE user_id = $1 AND type = 'expense' AND to_char(date, 'YYYY') = $2 GROUP BY month ORDER BY month;`;
        const expensesRes = await pool.query(expensesQuery, [userId, year]);
        const budgetsQuery = `SELECT month_id as month, amount as budget_amount FROM budgets WHERE user_id = $1 AND month_id LIKE $2 ORDER BY month;`;
        const budgetsRes = await pool.query(budgetsQuery, [userId, `${year}%`]);
        const monthlyData = {};
        for (let i = 1; i <= 12; i++) {
            const monthStr = `${year}-${String(i).padStart(2, '0')}`;
            monthlyData[monthStr] = { month: monthStr, totalExpenses: 0, budget: 0 };
        }
        expensesRes.rows.forEach(row => { if (monthlyData[row.month]) monthlyData[row.month].totalExpenses = parseFloat(row.total_expenses); });
        budgetsRes.rows.forEach(row => { if (monthlyData[row.month]) monthlyData[row.month].budget = parseFloat(row.budget_amount); });
        res.status(200).json(Object.values(monthlyData));
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el resumen anual' });
    }
});

// Endpoint para obtener información de versión de la aplicación
app.get('/api/version', (req, res) => {
    try {
        const packageJson = require('../package.json');
        res.status(200).json({
            version: packageJson.version,
            name: packageJson.name,
            description: packageJson.description,
            author: packageJson.author,
            buildDate: new Date().toISOString()
        });
    } catch (error) {
        res.status(200).json({
            version: '1.0.0',
            name: 'control-financiero-app',
            description: 'Aplicación web de control financiero personal',
            author: 'Innpacta Spa',
            buildDate: new Date().toISOString()
        });
    }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

module.exports = app;

// Inicia el servidor solo si este archivo es ejecutado directamente (no importado)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
  });
}
