# 🚀 Dashboard Financiero - Control de Gastos e Ingresos

Una aplicación web moderna y completa para el control financiero personal, construida con **Node.js**, **Express**, **Supabase** y **Chart.js**.

## 🚀 Versión Actual: 1.0.0

**Estado:** Estable - Listo para producción  
**Última actualización:** 23 de Diciembre, 2024

---

## ✨ Características Principales

### 🔐 **Autenticación Segura**
- Registro e inicio de sesión con Supabase Auth
- Validación de email y contraseñas
- Sesiones persistentes y seguras
- Protección de rutas con JWT

### 💰 **Gestión Financiera**
- **Transacciones**: Agregar, editar y eliminar gastos e ingresos
- **Categorías**: Sistema personalizable de categorías por usuario
- **Presupuestos**: Definir y monitorear presupuestos mensuales
- **Filtros**: Búsqueda y filtrado por fecha, categoría y tipo

### 📊 **Visualización de Datos**
- **Gráficos interactivos**: Gastos vs Ingresos, distribución por categorías
- **Vistas temporales**: Mensual y anual
- **Métricas en tiempo real**: Balance, totales y promedios
- **Responsive**: Optimizado para móviles y desktop

### 🎨 **Experiencia de Usuario**
- **UI Moderna**: Diseño limpio con paleta azul/violeta
- **Notificaciones**: Feedback visual para todas las acciones
- **Loading States**: Indicadores de carga para mejor UX
- **Validaciones**: Formularios con validación en tiempo real

### 🔧 **Funcionalidades Técnicas**
- **API RESTful**: Endpoints seguros y documentados
- **Base de datos**: Supabase PostgreSQL con RLS
- **Multiusuario**: Cada usuario tiene sus propios datos
- **CORS configurado**: Seguridad para producción

---

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js, Express.js
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth + JWT
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Gráficos**: Chart.js
- **Estilos**: Tailwind CSS
- **Despliegue**: Heroku, Vercel

---

## 📦 Instalación y Configuración

### Prerrequisitos
- Node.js >= 18.0.0
- npm o yarn
- Cuenta en Supabase

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/innpacta-gastapp.git
cd innpacta-gastapp
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Crear archivo `.env` en la raíz del proyecto:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4. Configurar Supabase

#### Crear Proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Obtén las credenciales de la API

#### Configurar Base de Datos
Ejecuta los siguientes scripts SQL en el SQL Editor de Supabase:

```sql
-- Tabla de perfiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, name)
);

-- Tabla de presupuestos
CREATE TABLE budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month_id)
);

-- Tabla de transacciones
CREATE TABLE transactions (
  _id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  month_id TEXT NOT NULL,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para poblar categorías por defecto
CREATE OR REPLACE FUNCTION populate_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (name, profile_id) VALUES
    ('Alimentación', NEW.id),
    ('Transporte', NEW.id),
    ('Entretenimiento', NEW.id),
    ('Salud', NEW.id),
    ('Educación', NEW.id),
    ('Vivienda', NEW.id),
    ('Servicios', NEW.id),
    ('Otros', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_populate_categories
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION populate_default_categories();

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own categories" ON categories
  FOR ALL USING (profile_id = auth.uid());

CREATE POLICY "Users can view own budgets" ON budgets
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own transactions" ON transactions
  FOR ALL USING (user_id = auth.uid());
```

### 5. Ejecutar la Aplicación

#### Desarrollo
```bash
npm run dev
```

#### Producción
```bash
npm start
```

La aplicación estará disponible en `http://localhost:3000`

---

## 🚀 Despliegue

### Heroku
```bash
# Crear app en Heroku
heroku create tu-app-name

# Configurar variables de entorno
heroku config:set SUPABASE_URL=your-supabase-url
heroku config:set SUPABASE_KEY=your-supabase-key
heroku config:set SUPABASE_SERVICE_KEY=your-service-key
heroku config:set SUPABASE_JWT_SECRET=your-jwt-secret
heroku config:set NODE_ENV=production

# Desplegar
git push heroku main
```

### Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel
```

---

## 📱 Uso de la Aplicación

### 1. **Registro/Login**
- Accede a la aplicación
- Regístrate con email y contraseña
- O inicia sesión si ya tienes cuenta

### 2. **Configurar Categorías**
- Ve a "Administración" → "Categorías"
- Agrega tus categorías personalizadas
- Las categorías son específicas por usuario

### 3. **Agregar Transacciones**
- Usa el formulario principal
- Selecciona tipo (Gasto/Ingreso)
- Elige categoría y fecha
- Agrega descripción y monto

### 4. **Definir Presupuestos**
- Ve a "Presupuestos"
- Define el monto para el mes actual
- Monitorea el progreso en tiempo real

### 5. **Analizar Datos**
- Revisa los gráficos de gastos vs ingresos
- Cambia entre vista mensual y anual
- Filtra por categorías y fechas

---

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrarse
- `POST /api/auth/logout` - Cerrar sesión

### Transacciones
- `GET /api/data/:monthId` - Obtener datos del mes
- `POST /api/transactions` - Crear transacción
- `PATCH /api/transactions/:id/details` - Actualizar transacción
- `DELETE /api/transactions/:id` - Eliminar transacción

### Categorías
- `GET /api/categories` - Obtener categorías
- `POST /api/categories` - Crear categoría
- `DELETE /api/categories/:id` - Eliminar categoría

### Presupuestos
- `POST /api/budget` - Guardar presupuesto

### Utilidades
- `GET /health` - Health check
- `GET /api/version` - Información de versión

---

## 🐛 Solución de Problemas

### Error: "supabaseUrl is required"
- Verifica que las variables de entorno estén configuradas
- Asegúrate de que el archivo `.env` existe en la raíz

### Error: "Token inválido"
- La sesión puede haber expirado
- Intenta cerrar sesión y volver a iniciar

### Error: "No autorizado"
- Verifica que estés autenticado
- Revisa que las políticas RLS estén configuradas

### Problemas de CORS
- Verifica la configuración de CORS en `api/index.js`
- Asegúrate de que los dominios estén permitidos

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

## 📞 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación de Supabase
2. Abre un issue en GitHub
3. Contacta al equipo de desarrollo

---

**Desarrollado con ❤️ por el equipo de Innpacta**
