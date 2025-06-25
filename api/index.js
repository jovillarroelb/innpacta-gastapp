// Fuerza redeploy - 2024-06-23 17:00
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Sirve archivos estáticos desde la raíz

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
        // Obtener presupuesto
        const { data: budgetRows, error: budgetError } = await supabase
            .from('budgets')
            .select('amount')
            .eq('user_id', userId)
            .eq('month_id', monthId);
        if (budgetError) throw budgetError;
        // Obtener transacciones (con nombre de categoría)
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('*, categories(name)')
            .eq('user_id', userId)
            .eq('month_id', monthId)
            .order('date', { ascending: false });
        if (txError) throw txError;
        res.status(200).json({
            budget: budgetRows && budgetRows.length > 0 ? parseFloat(budgetRows[0].amount) : 0,
            transactions: transactions || []
        });
    } catch (error) {
        console.error(`Error en /api/data/${monthId}: `, error);
        res.status(200).json({ budget: 0, transactions: [] });
    }
});

app.post('/api/transactions', async (req, res) => {
    const { description, amount, type, categoryId, date, monthId, comments } = req.body;
    const userId = req.user.id;
    try {
        const { data, error } = await supabase
            .from('transactions')
            .insert([{ description, amount, type, category_id: categoryId, date, month_id: monthId, comments, user_id: userId, user_id_legacy: userId }])
            .select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error en POST /api/transactions', error);
        res.status(500).json({ message: 'Error al crear la transacción' });
    }
});

app.post('/api/budget', async (req, res) => {
    const { monthId, amount } = req.body;
    const userId = req.user.id;
    try {
        // UPSERT presupuesto
        const { error } = await supabase
            .from('budgets')
            .upsert([{ user_id: userId, month_id: monthId, amount }], { onConflict: ['user_id', 'month_id'] });
        if (error) throw error;
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
        const { data, error } = await supabase
            .from('transactions')
            .update({ description, comments })
            .eq('_id', id)
            .eq('user_id', req.user.id)
            .select();
        if (error) throw error;
        if (!data || data.length === 0) return res.status(404).json({ message: 'Transacción no encontrada.' });
        res.status(200).json(data[0]);
    } catch (error) {
        console.error(`Error en PATCH /api/transactions/${id}/details`, error);
        res.status(500).json({ message: 'Error al actualizar la transacción.' });
    }
});

app.get('/api/categories', async (req, res) => {
    const profileId = getProfileId(req);
    if (!profileId) return res.status(401).json({ message: 'No autorizado' });
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .eq('profile_id', profileId)
            .order('name', { ascending: true });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener categorías' });
    }
});

app.post('/api/categories', async (req, res) => {
    const profileId = getProfileId(req);
    const { name } = req.body;
    if (!profileId) return res.status(401).json({ message: 'No autorizado' });
    try {
        const { data, error } = await supabase
            .from('categories')
            .insert([{ name, profile_id: profileId }])
            .select();
        if (error && error.code === '23505') return res.status(409).json({ message: 'La categoría ya existe' });
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear la categoría' });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    const profileId = getProfileId(req);
    const { id } = req.params;
    if (!profileId) return res.status(401).json({ message: 'No autorizado' });
    try {
        // Primero, actualiza transacciones para quitar la categoría
        await supabase
            .from('transactions')
            .update({ category_id: null })
            .eq('category_id', id);
        // Luego, elimina la categoría
        const { error, count } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)
            .eq('profile_id', profileId);
        if (error) throw error;
        if (count === 0) return res.status(404).json({ message: "Categoría no encontrada" });
        res.status(200).json({ message: "Categoría eliminada" });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la categoría' });
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('transactions')
            .delete()
            .eq('_id', id)
            .eq('user_id', req.user.id)
            .select();
        if (error) throw error;
        if (!data || data.length === 0) return res.status(404).json({ message: "Transacción no encontrada" });
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
        const { data, error } = await supabase
            .from('transactions')
            .update({ category_id: categoryId })
            .eq('_id', id)
            .eq('user_id', req.user.id)
            .select();
        if (error) throw error;
        if (!data || data.length === 0) return res.status(404).json({ message: 'Transacción no encontrada.' });
        res.status(200).json(data[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la categoría de la transacción.' });
    }
});

app.get('/api/annual-summary/:year', async (req, res) => {
    const { year } = req.params;
    const userId = req.user.id;
    if (isNaN(year)) return res.status(400).json({ message: 'El año proporcionado no es válido.' });
    try {
        // Obtiene todos los gastos del año agrupados por mes
        const { data: expenses, error: expError } = await supabase
            .from('transactions')
            .select('amount, date')
            .eq('user_id', userId)
            .eq('type', 'expense');
        if (expError) throw expError;
        // Obtiene todos los presupuestos del año
        const { data: budgets, error: budError } = await supabase
            .from('budgets')
            .select('month_id, amount')
            .eq('user_id', userId)
            .like('month_id', `${year}%`);
        if (budError) throw budError;
        // Procesa los datos para devolver el resumen mensual
        const monthlyData = {};
        for (let i = 1; i <= 12; i++) {
            const monthStr = `${year}-${String(i).padStart(2, '0')}`;
            monthlyData[monthStr] = { month: monthStr, totalExpenses: 0, budget: 0 };
        }
        expenses.forEach(row => {
            const month = row.date.slice(0, 7);
            if (monthlyData[month]) monthlyData[month].totalExpenses += parseFloat(row.amount);
        });
        budgets.forEach(row => {
            if (monthlyData[row.month_id]) monthlyData[row.month_id].budget = parseFloat(row.amount);
        });
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
