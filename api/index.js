// Fuerza redeploy - 2024-06-23 17:00
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');

// Validación de variables de entorno críticas
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SUPABASE_JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
    console.error('💡 Asegúrate de configurar estas variables en tu archivo .env o en las variables de entorno del servidor.');
    process.exit(1);
}

const app = express();

// Configuración de CORS más específica
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-app.herokuapp.com', 'https://your-app.vercel.app'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..'))); // Sirve archivos estáticos desde la raíz

// Pool para conexión directa a la base de datos
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middleware de logging para debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Middleware de Autenticación usando jsonwebtoken con mejor manejo de errores
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Token recibido:', token);
    if (!token) {
        return res.status(401).json({ 
            message: 'No se proporcionó token de autenticación.',
            code: 'MISSING_TOKEN'
        });
    }
    try {
        // Verifica el JWT con la clave secreta, sin validar issuer
        const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET, { 
            algorithms: ['HS256']
        });
        console.log('Usuario decodificado:', decoded);
        req.user = { id: decoded.sub };
        next();
    } catch (err) {
        console.error('Error de autenticación:', err.message);
        return res.status(401).json({ 
            message: 'Token inválido o expirado.',
            code: 'INVALID_TOKEN',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Middleware para verificar si el usuario es admin
async function adminOnly(req, res, next) {
    const client = await pool.connect();
    try {
        const userResult = await client.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
            return res.status(403).json({ message: 'Acceso solo para administradores.' });
        }
        next();
    } finally {
        client.release();
    }
}

// --- AUTENTICACIÓN PERSONALIZADA JWT ---
app.post('/auth/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'Faltan campos requeridos.' });
    }
    try {
        const client = await pool.connect();
        try {
            // Verifica si el usuario ya existe
            const userExists = await client.query('SELECT id FROM users WHERE email = $1', [email]);
            if (userExists.rows.length > 0) {
                return res.status(409).json({ message: 'El email ya está registrado.' });
            }
            // Hashea la contraseña
            const hashedPassword = await bcrypt.hash(password, 10);
            // Crea el usuario
            const userResult = await client.query(
                'INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING id',
                [firstName, lastName, email, hashedPassword]
            );
            const userId = userResult.rows[0].id;
            // Poblar categorías por defecto
            await client.query(
                `INSERT INTO categories (name, user_id) VALUES
                ('Alimentación', $1),
                ('Educacion', $1),
                ('Sueldo', $1),
                ('Ocio', $1),
                ('Cuentas', $1)`,
                [userId]
            );
            // Poblar presupuestos por defecto (opcional: solo mes actual)
            const now = new Date();
            const monthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            await client.query(
                'INSERT INTO budgets (user_id, amount, month) VALUES ($1, $2, $3)',
                [userId, 0, monthId]
            );
            // Generar JWT
            const token = jwt.sign(
                { sub: userId, email },
                process.env.SUPABASE_JWT_SECRET,
                { expiresIn: '7d' }
            );
            res.status(201).json({ token });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error en /auth/register:', err);
        res.status(500).json({ message: 'Error registrando usuario.' });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Faltan campos requeridos.' });
    }
    try {
        const client = await pool.connect();
        try {
            const userResult = await client.query('SELECT id, password FROM users WHERE email = $1', [email]);
            if (userResult.rows.length === 0) {
                return res.status(401).json({ message: 'Credenciales inválidas.' });
            }
            const user = userResult.rows[0];
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                return res.status(401).json({ message: 'Credenciales inválidas.' });
            }
            // Generar JWT
            const token = jwt.sign(
                { sub: user.id, email },
                process.env.SUPABASE_JWT_SECRET,
                { expiresIn: '7d' }
            );
            res.status(200).json({ token });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error en /auth/login:', err);
        res.status(500).json({ message: 'Error en login.' });
    }
});

// Middleware de autenticación para /api
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
    
    if (!monthId || !/^\d{4}-\d{2}$/.test(monthId)) {
        return res.status(400).json({ 
            message: 'Formato de mes inválido. Use YYYY-MM',
            code: 'INVALID_MONTH_FORMAT'
        });
    }
    
    try {
        // Obtener presupuesto
        const { data: budgetRows, error: budgetError } = await supabase
            .from('budgets')
            .select('amount')
            .eq('user_id', userId)
            .eq('month', monthId);
        if (budgetError) throw budgetError;
        
        // Obtener transacciones (con nombre de categoría)
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('*, categories(name)')
            .eq('user_id', userId)
            .eq('month', monthId)
            .order('date', { ascending: false });
        if (txError) throw txError;
        
        res.status(200).json({
            budget: budgetRows && budgetRows.length > 0 ? parseFloat(budgetRows[0].amount) : 0,
            transactions: transactions || []
        });
    } catch (error) {
        console.error(`Error en /api/data/${monthId}: `, error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

app.post('/api/transactions', async (req, res) => {
    const { description, amount, type, categoryId, date, monthId, comments } = req.body;
    const userId = req.user.id;
    
    // Validación de datos requeridos
    if (!description || !amount || !type || !date || !monthId) {
        return res.status(400).json({ 
            message: 'Faltan campos requeridos: description, amount, type, date, monthId',
            code: 'MISSING_REQUIRED_FIELDS'
        });
    }
    
    if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({ 
            message: 'Tipo debe ser "income" o "expense"',
            code: 'INVALID_TRANSACTION_TYPE'
        });
    }
    
    try {
        const { data, error } = await supabase
            .from('transactions')
            .insert([{ 
                description, 
                amount: parseFloat(amount), 
                type, 
                category_id: categoryId, 
                date, 
                month: monthId, 
                comments, 
                user_id: userId 
            }])
            .select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error en POST /api/transactions', error);
        res.status(500).json({ 
            message: 'Error al crear la transacción',
            code: 'TRANSACTION_CREATION_ERROR'
        });
    }
});

app.post('/api/budget', async (req, res) => {
    const { monthId, amount } = req.body;
    const userId = req.user.id;
    
    if (!monthId || !amount) {
        return res.status(400).json({ 
            message: 'Faltan campos requeridos: monthId, amount',
            code: 'MISSING_REQUIRED_FIELDS'
        });
    }
    
    if (isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
        return res.status(400).json({ 
            message: 'El monto debe ser un número positivo',
            code: 'INVALID_AMOUNT'
        });
    }
    
    try {
        // UPSERT presupuesto
        const { error } = await supabase
            .from('budgets')
            .upsert([{ 
                user_id: userId, 
                month: monthId, 
                amount: parseFloat(amount) 
            }], { 
                onConflict: ['user_id', 'month'] 
            });
        if (error) throw error;
        res.status(200).json({ message: "Presupuesto guardado exitosamente" });
    } catch (error) {
        console.error('Error en POST /api/budget', error);
        res.status(500).json({ 
            message: 'Error al guardar el presupuesto',
            code: 'BUDGET_SAVE_ERROR'
        });
    }
});

app.patch('/api/transactions/:id/details', async (req, res) => {
    const { id } = req.params;
    const { description, comments } = req.body;
    const userId = req.user.id;
    
    if (!description) {
        return res.status(400).json({ 
            message: 'La descripción es requerida.',
            code: 'MISSING_DESCRIPTION'
        });
    }
    
    try {
        const { data, error } = await supabase
            .from('transactions')
            .update({ description, comments })
            .eq('_id', id)
            .eq('user_id', userId)
            .select();
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ 
                message: 'Transacción no encontrada.',
                code: 'TRANSACTION_NOT_FOUND'
            });
        }
        res.status(200).json(data[0]);
    } catch (error) {
        console.error(`Error en PATCH /api/transactions/${id}/details`, error);
        res.status(500).json({ 
            message: 'Error al actualizar la transacción.',
            code: 'TRANSACTION_UPDATE_ERROR'
        });
    }
});

// Obtener categorías del usuario
app.get('/api/categories', async (req, res) => {
    const userId = req.user.id;
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT id, name FROM categories WHERE user_id = $1 ORDER BY name', [userId]);
        client.release();
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en GET /api/categories', error);
        res.status(500).json({ message: 'Error al obtener categorías', code: 'CATEGORIES_FETCH_ERROR' });
    }
});

// Crear categoría
app.post('/api/categories', async (req, res) => {
    const userId = req.user.id;
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: 'El nombre de la categoría es requerido', code: 'MISSING_CATEGORY_NAME' });
    }
    try {
        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO categories (name, user_id) VALUES ($1, $2) RETURNING id, name',
            [name.trim(), userId]
        );
        client.release();
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'La categoría ya existe', code: 'CATEGORY_ALREADY_EXISTS' });
        }
        console.error('Error en POST /api/categories', error);
        res.status(500).json({ message: 'Error al crear la categoría', code: 'CATEGORY_CREATION_ERROR' });
    }
});

// Eliminar categoría
app.delete('/api/categories', async (req, res) => {
    const userId = req.user.id;
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ message: 'ID de categoría requerido', code: 'MISSING_CATEGORY_ID' });
    }
    try {
        const client = await pool.connect();
        // Quitar la categoría de las transacciones
        await client.query('UPDATE transactions SET category_id = NULL WHERE category_id = $1 AND user_id = $2', [id, userId]);
        // Eliminar la categoría
        const result = await client.query('DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
        client.release();
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Categoría no encontrada', code: 'CATEGORY_NOT_FOUND' });
        }
        res.status(200).json({ message: 'Categoría eliminada exitosamente' });
    } catch (error) {
        console.error('Error en DELETE /api/categories', error);
        res.status(500).json({ message: 'Error al eliminar la categoría', code: 'CATEGORY_DELETION_ERROR' });
    }
});

// Obtener presupuestos del usuario
app.get('/api/budgets', async (req, res) => {
    const userId = req.user.id;
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM budgets WHERE user_id = $1 ORDER BY month', [userId]);
        client.release();
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en GET /api/budgets', error);
        res.status(500).json({ message: 'Error al obtener presupuestos', code: 'BUDGETS_FETCH_ERROR' });
    }
});

// Crear o actualizar presupuesto
app.put('/api/budgets', async (req, res) => {
    const userId = req.user.id;
    const budgets = Array.isArray(req.body) ? req.body : [req.body];
    try {
        const client = await pool.connect();
        for (const b of budgets) {
            await client.query(
                'INSERT INTO budgets (user_id, amount, month) VALUES ($1, $2, $3) ON CONFLICT (user_id, month) DO UPDATE SET amount = EXCLUDED.amount',
                [userId, b.amount, b.month]
            );
        }
        client.release();
        res.status(200).json({ message: 'Presupuestos guardados exitosamente' });
    } catch (error) {
        console.error('Error en PUT /api/budgets', error);
        res.status(500).json({ message: 'Error al guardar presupuestos', code: 'BUDGET_SAVE_ERROR' });
    }
});

// Obtener transacciones del usuario
app.get('/api/transactions', async (req, res) => {
    const userId = req.user.id;
    try {
        const client = await pool.connect();
        const result = await client.query(
            `SELECT t.*, c.name as category_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1 ORDER BY t.date DESC`,
            [userId]
        );
        client.release();
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en GET /api/transactions', error);
        res.status(500).json({ message: 'Error al obtener transacciones', code: 'TRANSACTIONS_FETCH_ERROR' });
    }
});

// Crear transacción
app.post('/api/transactions', async (req, res) => {
    const userId = req.user.id;
    const { description, amount, type, category_id, date, month, comments } = req.body;
    if (!description || !amount || !type || !date || !month) {
        return res.status(400).json({ message: 'Faltan campos requeridos', code: 'MISSING_REQUIRED_FIELDS' });
    }
    if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({ message: 'Tipo debe ser "income" o "expense"', code: 'INVALID_TRANSACTION_TYPE' });
    }
    try {
        const client = await pool.connect();
        const result = await client.query(
            `INSERT INTO transactions (user_id, description, amount, type, category_id, date, month, comments) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [userId, description, parseFloat(amount), type, category_id || null, date, month, comments]
        );
        client.release();
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error en POST /api/transactions', error);
        res.status(500).json({ message: 'Error al crear la transacción', code: 'TRANSACTION_CREATION_ERROR' });
    }
});

// Actualizar transacción
app.put('/api/transactions', async (req, res) => {
    const userId = req.user.id;
    const { _id, description, amount, category_id, comments } = req.body;
    if (!_id || !description) {
        return res.status(400).json({ message: 'Faltan campos requeridos', code: 'MISSING_REQUIRED_FIELDS' });
    }
    try {
        const client = await pool.connect();
        const result = await client.query(
            `UPDATE transactions SET description = $1, amount = $2, category_id = $3, comments = $4 WHERE _id = $5 AND user_id = $6 RETURNING *`,
            [description, amount, category_id || null, comments, _id, userId]
        );
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Transacción no encontrada', code: 'TRANSACTION_NOT_FOUND' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error en PUT /api/transactions', error);
        res.status(500).json({ message: 'Error al actualizar la transacción', code: 'TRANSACTION_UPDATE_ERROR' });
    }
});

// Eliminar transacción
app.delete('/api/transactions', async (req, res) => {
    const userId = req.user.id;
    const { _id } = req.body;
    if (!_id) {
        return res.status(400).json({ message: 'ID de transacción requerido', code: 'MISSING_TRANSACTION_ID' });
    }
    try {
        const client = await pool.connect();
        const result = await client.query('DELETE FROM transactions WHERE _id = $1 AND user_id = $2 RETURNING _id', [_id, userId]);
        client.release();
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Transacción no encontrada', code: 'TRANSACTION_NOT_FOUND' });
        }
        res.status(200).json({ message: 'Transacción eliminada' });
    } catch (error) {
        console.error('Error en DELETE /api/transactions', error);
        res.status(500).json({ message: 'Error al eliminar la transacción', code: 'TRANSACTION_DELETION_ERROR' });
    }
});

// Ruta de health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Listar todos los usuarios (solo admin)
app.get('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY created_at DESC');
        client.release();
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ message: 'Error al listar usuarios.' });
    }
});

// Cambiar el rol de un usuario (solo admin)
app.patch('/api/admin/users/:id/role', authMiddleware, adminOnly, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Rol inválido.' });
    }
    try {
        const client = await pool.connect();
        const result = await client.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, first_name, last_name, email, role',
            [role, id]
        );
        client.release();
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error al cambiar rol:', error);
        res.status(500).json({ message: 'Error al cambiar rol.' });
    }
});

// Endpoint para obtener la versión de la app
app.get('/api/version', (req, res) => {
    let version = '1.0.0';
    try {
        version = fs.readFileSync('VERSION.md', 'utf8').trim();
    } catch {}
    res.json({ version });
});

// Middleware de manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({ 
        message: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR'
    });
});

// Manejo de rutas no encontradas (debe ir al final)
app.use((req, res) => {
    res.status(404).json({ 
        message: 'Ruta no encontrada',
        code: 'ROUTE_NOT_FOUND'
    });
});

// Configuración del puerto con fallback
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
    console.log(`📊 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});
