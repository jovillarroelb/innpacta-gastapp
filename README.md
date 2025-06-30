# 💸 GastApp - Dashboard Financiero Multiusuario

Gestión y control de gastos e ingresos personales y familiares, con enfoque en privacidad y seguridad de los datos.

---

## 🚀 ¿Qué es GastApp?
GastApp es una aplicación web moderna para el control financiero, donde cada usuario puede registrar, analizar y gestionar sus gastos e ingresos mensuales y anuales. La información se almacena cifrada en la base de datos para máxima confidencialidad.

---

## 🏗️ Arquitectura y Seguridad

- **Base de datos:** PostgreSQL alojada en Supabase (solo como hosting, no se usa Supabase Auth).
- **Backend:** Node.js + Express. Acceso a la base de datos mediante el driver nativo `pg`.
- **Autenticación:** Personalizada, con tabla propia de usuarios y JWT.
- **Cifrado:** Todos los datos sensibles (monto, descripción, comentarios, etc.) se cifran antes de almacenarse en la base de datos.
- **Frontend:** HTML, CSS, JavaScript (sin frameworks pesados).

---

## ✨ Funcionalidades principales

- Registro e inicio de sesión seguro (autenticación propia, no Supabase Auth)
- Gestión de transacciones (gastos/ingresos) y presupuestos mensuales
- Visualización de métricas y gráficos
- Multiusuario: cada usuario solo accede a sus propios datos
- Cifrado de datos sensibles en la base de datos
- Responsive y fácil de usar

---

## ⚙️ Instalación y configuración

### 1. Clona el repositorio
```bash
git clone https://github.com/tu-usuario/innpacta-gastapp.git
cd innpacta-gastapp
```

### 2. Instala las dependencias
```bash
npm install
```

### 3. Configura las variables de entorno
Crea un archivo `.env` en la raíz del proyecto:
```env
# Conexión a la base de datos de Supabase (PostgreSQL)
DATABASE_URL=postgres://usuario:contraseña@host:puerto/basededatos

# Clave secreta para JWT (genera una segura)
JWT_SECRET=tu_clave_secreta

# Clave para cifrado de datos sensibles (hexadecimal de 64 caracteres)
ENCRYPTION_KEY=tu_clave_hexadecimal_64

# Puerto del servidor
PORT=3000
NODE_ENV=development
```

### 4. Configura la base de datos
- Crea tu proyecto en [Supabase](https://supabase.com) y obtén la URL de conexión a PostgreSQL.
- Ejecuta los scripts SQL incluidos en el proyecto para crear las tablas necesarias (`users`, `transactions`, `budgets`, `categories`, etc.).

### 5. Ejecuta la aplicación
- **Desarrollo:**
  ```bash
  npm run dev
  ```
- **Producción:**
  ```bash
  npm start
  ```

La app estará disponible en `http://localhost:3000`

---

## 🔒 Seguridad y privacidad
- **Cifrado:** Todos los datos sensibles se cifran antes de guardarse en la base de datos. Si alguien accede a la BBDD, no podrá leer los datos sin la clave.
- **Autenticación:** Solo usuarios autenticados pueden acceder a la API. El backend valida JWT en cada petición.
- **Privacidad:** Cada usuario solo puede ver y modificar sus propios datos.

---

## 🛠️ Estructura del proyecto

```
innpacta-gastapp/
  ├── api/              # Lógica del backend (Express)
  ├── utils/            # Utilidades (cifrado, helpers)
  ├── poblar_bd.js      # Script para poblar la base de datos
  ├── poblar_presupuestos_2025.js # Script para poblar presupuestos
  ├── index.html        # Login/registro
  ├── app.html          # Dashboard principal
  ├── script.js         # Lógica frontend
  ├── style.css         # Estilos
  └── ...
```

---

## 📋 Endpoints principales

- `POST /auth/register` — Registro de usuario
- `POST /auth/login` — Login de usuario
- `GET /api/transactions` — Listar transacciones del usuario
- `POST /api/transactions` — Crear transacción
- `PUT /api/transactions` — Editar transacción
- `GET /api/budgets` — Listar presupuestos
- `POST /api/budget` — Crear/actualizar presupuesto
- ...

---

## 🧑‍💻 Contribuir
¡Pull requests y sugerencias son bienvenidas!

---

## 📝 Licencia
MIT