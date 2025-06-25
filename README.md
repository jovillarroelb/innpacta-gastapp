# 📊 Control Financiero App

Una aplicación web moderna para el control de finanzas personales con autenticación, gráficos interactivos y diseño responsive.

## 🚀 Versión Actual: 1.0.0

**Estado:** Estable - Listo para producción  
**Última actualización:** 23 de Diciembre, 2024

---

## ✨ Características

- 🔐 **Autenticación segura** con Supabase
- 💰 **Gestión de transacciones** (ingresos y gastos)
- 📂 **Categorías personalizadas** por usuario
- 💵 **Presupuestos mensuales y anuales**
- 📊 **Gráficos interactivos** con Chart.js
- 📱 **Diseño responsive** optimizado para móviles
- 🎨 **UI/UX moderna** con paleta de colores actualizada
- ⚡ **Performance optimizada** con carga paralela
- 🔒 **Seguridad implementada** con RLS
- 👤 **Gestión de perfil** con avatar personalizado

---

## 🛠️ Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Supabase (PostgreSQL + Auth)
- **Gráficos:** Chart.js
- **Deploy:** Vercel
- **Versionado:** Semantic Versioning

---

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/control-financiero-app-rel.git
   cd control-financiero-app-rel
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar Supabase**
   - Crear proyecto en [Supabase](https://supabase.com)
   - Configurar variables de entorno en `script.js`
   - Ejecutar migraciones de base de datos

4. **Ejecutar localmente**
   ```bash
   npm start
   ```

---

## 📁 Estructura del Proyecto

```
control-financiero-app-rel/
├── index.html          # Página principal
├── app.html           # Dashboard de la aplicación
├── admin.html         # Panel de administración
├── script.js          # Lógica principal
├── style.css          # Estilos CSS
├── auth.js            # Autenticación
├── api/               # API endpoints
├── package.json       # Dependencias y scripts
├── CHANGELOG.md       # Historial de cambios
├── VERSION.md         # Control de versiones
└── README.md          # Documentación
```

---

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm start              # Servidor local en puerto 3000

# Versionado
npm run version:patch  # Incrementar patch (1.0.0 → 1.0.1)
npm run version:minor  # Incrementar minor (1.0.0 → 1.1.0)
npm run version:major  # Incrementar major (1.0.0 → 2.0.0)

# Documentación
npm run changelog      # Generar changelog automático
```

---

## 📊 Control de Versiones

### Semantic Versioning (MAJOR.MINOR.PATCH)

- **MAJOR** (1.0.0): Cambios incompatibles con versiones anteriores
- **MINOR** (1.1.0): Nuevas funcionalidades compatibles hacia atrás  
- **PATCH** (1.0.1): Correcciones de bugs compatibles hacia atrás

### Archivos de Versionado
- `package.json` - Versión actual y scripts
- `CHANGELOG.md` - Historial detallado de cambios
- `VERSION.md` - Tracking de versiones y roadmap

---

## 🎯 Roadmap

### v1.1.0 - "Enhancement Release" (Enero 2025)
- [ ] Exportación de datos (PDF/Excel)
- [ ] Notificaciones push
- [ ] Metas financieras
- [ ] Historial de cambios
- [ ] Temas personalizables

### v1.2.0 - "Analytics Release" (Febrero 2025)
- [ ] Análisis de tendencias avanzado
- [ ] Predicciones de gastos
- [ ] Comparativas año a año
- [ ] Reportes personalizados

### v2.0.0 - "Multi-Platform Release" (Marzo 2025)
- [ ] App móvil nativa
- [ ] API pública
- [ ] Integración con bancos
- [ ] Colaboración entre usuarios

---

## 🔒 Seguridad

- **Autenticación:** Supabase Auth con JWT
- **Base de datos:** PostgreSQL con RLS (Row Level Security)
- **Validación:** Cliente y servidor
- **Privacidad:** Datos aislados por usuario

---

## 📱 Responsive Design

La aplicación está optimizada para:
- 📱 **Móviles** (320px - 768px)
- 📱 **Tablets** (768px - 1024px)
- 💻 **Desktop** (1024px+)

---

## 🐛 Reportar Bugs

Si encuentras algún bug o tienes una sugerencia:

1. Revisa los [issues existentes](https://github.com/tu-usuario/control-financiero-app-rel/issues)
2. Crea un nuevo issue con:
   - Descripción del problema
   - Pasos para reproducir
   - Versión de la aplicación
   - Navegador y sistema operativo

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

## 📞 Contacto

- **Desarrollador:** Tu Nombre
- **Email:** tu-email@ejemplo.com
- **GitHub:** [@tu-usuario](https://github.com/tu-usuario)

---

**⭐ Si te gusta este proyecto, ¡dale una estrella en GitHub!**
