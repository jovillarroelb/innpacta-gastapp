-- Migración para agregar campo role a la tabla users
-- Ejecutar este script en la base de datos para agregar el campo role

-- Agregar columna role si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
    END IF;
END $$;

-- Actualizar usuarios existentes que no tengan role asignado
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Crear índice para mejorar performance en consultas por role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role); 