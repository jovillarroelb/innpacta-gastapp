require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const userId = '1be585f2-0155-4c77-8925-0582b431c4ed';

async function poblarPresupuestos() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let monto = 3500000;
    for (let mes = 1; mes <= 12; mes++) {
      const monthId = `2025-${String(mes).padStart(2, '0')}`;
      await client.query(
        `INSERT INTO budgets (user_id, month_id, amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, month_id) DO UPDATE SET amount = EXCLUDED.amount`,
        [userId, monthId, monto]
      );
      monto += 100000;
    }
    await client.query('COMMIT');
    console.log('✅ Presupuestos 2025 insertados correctamente.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al poblar presupuestos:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

poblarPresupuestos(); 