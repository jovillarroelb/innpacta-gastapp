// --- SCRIPT PARA POBLAR LA BASE DE DATOS POSTGRESQL ---

require('dotenv').config();
const { Pool } = require('pg');

// Crear un pool de conexiones usando la URL de la base de datos del archivo .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function poblarBaseDeDatos() {
  console.log("Iniciando el script para poblar la base de datos...");

  const client = await pool.connect();
  console.log("Conexión a la base de datos establecida.");

  try {
    // Iniciar una transacción para asegurar que todas las operaciones se completen o ninguna lo haga.
    await client.query('BEGIN');

    // 1. Limpiar las tablas existentes para un estado limpio.
    // El orden es importante por las llaves foráneas.
    console.log("Limpiando tablas existentes...");
    await client.query('TRUNCATE budgets, transactions, categories RESTART IDENTITY CASCADE;');

    // 2. Insertar las categorías y obtener sus IDs generados.
    console.log("Insertando categorías por defecto...");
    const categoriasResult = await client.query(`
      INSERT INTO categories (name) VALUES
      ('Alimentación'), ('Vivienda'), ('Transporte'), ('Salud'),
      ('Ocio'), ('Sueldo'), ('Otros')
      RETURNING id, name;
    `);
    const categoriasMap = new Map(categoriasResult.rows.map(cat => [cat.name, cat.id]));
    console.log("Categorías insertadas exitosamente.");

    // 3. Insertar un presupuesto de prueba para el mes actual.
    const fechaActual = new Date();
    const mesIdActual = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
    const userId = 'a79be7f1-058c-40a6-8418-124ec8466d93'; // UUID válido
    console.log(`Insertando presupuesto de $500.000 para el mes ${mesIdActual}...`);
    await client.query(
      'INSERT INTO budgets (user_id, month_id, amount) VALUES ($1, $2, $3)',
      [userId, mesIdActual, 500000]
    );
    console.log("Presupuesto insertado.");

    // 4. Insertar algunas transacciones de prueba.
    console.log("Insertando transacciones de prueba...");
    const transaccionesQuery = `
      INSERT INTO transactions (user_id, user_id_legacy, month_id, description, amount, type, category_id, date) VALUES
      ($1, $2, $3, 'Supermercado Lider', 45000, 'expense', $4, NOW()),
      ($1, $2, $3, 'Pago de arriendo', 350000, 'expense', $5, NOW() - interval '1 day'),
      ($1, $2, $3, 'Sueldo mensual', 900000, 'income', $6, NOW() - interval '2 day'),
      ($1, $2, $3, 'Cena con amigos', 25000, 'expense', $7, NOW() - interval '3 day');
    `;
    await client.query(transaccionesQuery, [
      userId,
      userId,
      mesIdActual,
      categoriasMap.get('Alimentación'),
      categoriasMap.get('Vivienda'),
      categoriasMap.get('Sueldo'),
      categoriasMap.get('Ocio'),
    ]);
    console.log("Transacciones insertadas.");

    // Si todo fue exitoso, confirma la transacción.
    await client.query('COMMIT');
    console.log("\n¡ÉXITO! La base de datos ha sido poblada con datos de prueba.");

  } catch (error) {
    // Si algo falla, revierte todos los cambios.
    await client.query('ROLLBACK');
    console.error("\nERROR: Ocurrió un problema al poblar la base de datos.");
    console.error("Todos los cambios han sido revertidos.");
    console.error("Detalle del error:", error.message);
  } finally {
    // Asegúrate de cerrar la conexión al final.
    client.release();
    await pool.end();
    console.log("Conexión a la base de datos cerrada.");
  }
}

// Ejecutar la función principal.
poblarBaseDeDatos();