// Fuerza redeploy - 2024-06-23 17:00
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const path = require('path');

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

// Configuración de Supabase con validación
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Configuración de Supabase incompleta');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware de logging para debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Middleware de Autenticación usando jsonwebtoken con mejor manejo de errores
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ 
            message: 'No se proporcionó token de autenticación.',
            code: 'MISSING_TOKEN'
        });
    }
    try {
        // Verifica el JWT con la clave pública de Supabase
        const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET, { 
            algorithms: ['HS256'],
            issuer: 'supabase'
        });
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
                month_id: monthId, 
                comments, 
                user_id: userId, 
                user_id_legacy: userId 
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
                month_id: monthId, 
                amount: parseFloat(amount) 
            }], { 
                onConflict: ['user_id', 'month_id'] 
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

app.get('/api/categories', async (req, res) => {
    const profileId = getProfileId(req);
    if (!profileId) {
        return res.status(401).json({ 
            message: 'No autorizado - profile_id requerido',
            code: 'MISSING_PROFILE_ID'
        });
    }
    
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .eq('profile_id', profileId)
            .order('name', { ascending: true });
        if (error) throw error;
        res.status(200).json(data || []);
    } catch (error) {
        console.error('Error en GET /api/categories', error);
        res.status(500).json({ 
            message: 'Error al obtener categorías',
            code: 'CATEGORIES_FETCH_ERROR'
        });
    }
});

app.post('/api/categories', async (req, res) => {
    const profileId = getProfileId(req);
    const { name } = req.body;
    
    if (!profileId) {
        return res.status(401).json({ 
            message: 'No autorizado - profile_id requerido',
            code: 'MISSING_PROFILE_ID'
        });
    }
    
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ 
            message: 'El nombre de la categoría es requerido',
            code: 'MISSING_CATEGORY_NAME'
        });
    }
    
    try {
        const { data, error } = await supabase
            .from('categories')
            .insert([{ 
                name: name.trim(), 
                profile_id: profileId 
            }])
            .select();
        if (error && error.code === '23505') {
            return res.status(409).json({ 
                message: 'La categoría ya existe',
                code: 'CATEGORY_ALREADY_EXISTS'
            });
        }
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error en POST /api/categories', error);
        res.status(500).json({ 
            message: 'Error al crear la categoría',
            code: 'CATEGORY_CREATION_ERROR'
        });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    const profileId = getProfileId(req);
    const { id } = req.params;
    
    if (!profileId) {
        return res.status(401).json({ 
            message: 'No autorizado - profile_id requerido',
            code: 'MISSING_PROFILE_ID'
        });
    }
    
    if (!id) {
        return res.status(400).json({ 
            message: 'ID de categoría requerido',
            code: 'MISSING_CATEGORY_ID'
        });
    }
    
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
        if (count === 0) {
            return res.status(404).json({ 
                message: "Categoría no encontrada",
                code: 'CATEGORY_NOT_FOUND'
            });
        }
        res.status(200).json({ message: "Categoría eliminada exitosamente" });
    } catch (error) {
        console.error('Error en DELETE /api/categories', error);
        res.status(500).json({ 
            message: 'Error al eliminar la categoría',
            code: 'CATEGORY_DELETION_ERROR'
        });
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    if (!id) {
        return res.status(400).json({ 
            message: 'ID de transacción requerido',
            code: 'MISSING_TRANSACTION_ID'
        });
    }
    
    try {
        const { data, error } = await supabase
            .from('transactions')
            .delete()
            .eq('_id', id)
            .eq('user_id', userId)
            .select();
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ 
                message: "Transacción no encontrada",
                code: 'TRANSACTION_NOT_FOUND'
            });
        }
        res.status(200).json({ message: "Transacción eliminada exitosamente" });
    } catch (error) {
        console.error('Error en DELETE /api/transactions', error);
        res.status(500).json({ 
            message: 'Error al eliminar la transacción',
            code: 'TRANSACTION_DELETION_ERROR'
        });
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
