// Elimino import { supabase } ...
// Elimino todas las llamadas a supabase.auth, supabase.from, etc.
// Elimino funciones y helpers de Supabase que ya no se usan.

function displayMonth(date) {
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return meses[date.getMonth()];
}

function formatCurrency(value) {
    const numValue = parseFloat(value) || 0;
    const roundedValue = Math.round(numValue);
    return '$' + roundedValue.toLocaleString('es-CL', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
    });
}

// Mejoras en el manejo de errores y UX
function showLoading(elementId, show = true) {
    const element = document.getElementById(elementId);
    if (element) {
        if (show) {
            element.innerHTML = '<div class="flex justify-center"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>';
        } else {
            element.innerHTML = '';
        }
    }
}

function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ${
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'success' ? 'bg-green-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, duration);
}

// Función de validación de email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Función para inicializar el footer con información de versión
async function initializeFooter() {
    const versionElements = document.querySelectorAll('#app-version');
    const yearElements = document.querySelectorAll('#current-year');
    
    // Obtener versión dinámicamente desde la API
    let appVersion = '1.0.0'; // Versión por defecto
    try {
        const response = await fetchWithAuth('/api/version');
        if (response && response.ok) {
            const versionData = await response.json();
            appVersion = versionData.version;
        }
    } catch (error) {
        // Silenciar error si no hay sesión activa
    }
    
    // Actualizar elementos de versión
    versionElements.forEach(element => {
        if (element) element.textContent = appVersion;
    });
    
    // Actualizar año actual
    const currentYear = new Date().getFullYear();
    yearElements.forEach(element => {
        if (element) element.textContent = currentYear;
    });
}

// Mejora en la inicialización de la app
document.addEventListener('DOMContentLoaded', () => {
    // Forzar ocultar todos los modales al cargar (solo si existen)
    ['category-modal', 'reassign-modal', 'edit-transaction-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // Inicializar footer en todas las páginas
    initializeFooter();
    
    // Si encuentra el formulario de login, ejecuta la lógica de autenticación.
    if (document.getElementById('login-form')) {
        handleAuthPage();
    } 
    // Si encuentra el contenedor de la app, ejecuta la lógica de la aplicación principal.
    else if (document.getElementById('app-container')) {
        // Definir funciones de modales SOLO en la app principal
        window.setupModalCloseEvents = function(modalId, closeFn) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            function escListener(e) { if (e.key === 'Escape') closeFn(); }
            function clickListener(e) { if (e.target === modal) closeFn(); }
            document.addEventListener('keydown', escListener);
            modal.addEventListener('mousedown', clickListener);
            modal._cleanup = () => {
                document.removeEventListener('keydown', escListener);
                modal.removeEventListener('mousedown', clickListener);
            };
        };
        window.showCategoryModal = showCategoryModal;
        window.hideCategoryModal = hideCategoryModal;
        handleAppPage();
    }

    const token = localStorage.getItem('jwt_token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // Si el rol viene en el JWT y es admin, muestra el menú admin
            if (payload && payload.role === 'admin') {
                document.getElementById('admin-menu-item').style.display = 'block';
                // Solo aquí, si quieres, podrías hacer fetch a /api/admin/users
            }
            // No hagas fetch a /api/admin/users si el rol no es admin
        } catch {}
    }

    // Fix: Navegación admin sin reload
    const adminMenuItem = document.querySelector('#admin-menu-item a');
    if (adminMenuItem) {
        adminMenuItem.addEventListener('click', function(e) {
            e.preventDefault();
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            window.location.href = 'admin.html';
        });
    }
});

// Función para inicializar la app correctamente
async function handleAppPage() {
    // Mostrar vista mensual por defecto
    const monthlyView = document.getElementById('monthly-dashboard-view');
    const annualView = document.getElementById('annual-dashboard-view');
    
    if (monthlyView && annualView) {
        monthlyView.classList.remove('hidden');
        annualView.classList.add('hidden');
    }
    
    // Activar el tab de vista mensual
    const navMonthly = document.getElementById('nav-monthly');
    const navAnnual = document.getElementById('nav-annual');
    
    if (navMonthly && navAnnual) {
        navMonthly.classList.add('active', 'bg-gradient-to-r', 'from-blue-600', 'to-purple-500', 'text-white');
        navMonthly.classList.remove('text-gray-500');
        navAnnual.classList.remove('active', 'bg-gradient-to-r', 'from-blue-600', 'to-purple-500', 'text-white');
        navAnnual.classList.add('text-gray-500');
    }
    
    // Si hay tabs o botones para cambiar de vista, añade el listener:
    if (navAnnual && navMonthly) {
        navAnnual.addEventListener('click', () => {
            monthlyView.classList.add('hidden');
            annualView.classList.remove('hidden');
            navAnnual.classList.add('active', 'bg-gradient-to-r', 'from-blue-600', 'to-purple-500', 'text-white');
            navAnnual.classList.remove('text-gray-500');
            navMonthly.classList.remove('active', 'bg-gradient-to-r', 'from-blue-600', 'to-purple-500', 'text-white');
            navMonthly.classList.add('text-gray-500');
        });
        navMonthly.addEventListener('click', () => {
            annualView.classList.add('hidden');
            monthlyView.classList.remove('hidden');
            navMonthly.classList.add('active', 'bg-gradient-to-r', 'from-blue-600', 'to-purple-500', 'text-white');
            navMonthly.classList.remove('text-gray-500');
            navAnnual.classList.remove('active', 'bg-gradient-to-r', 'from-blue-600', 'to-purple-500', 'text-white');
            navAnnual.classList.add('text-gray-500');
        });
    }
    
    // Prevenir envío de formularios por defecto
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', e => e.preventDefault());
    });
    
    // Mejorar UX con tooltips y validaciones
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (value < 0) {
                e.target.value = 0;
            }
        });
    });
}

// --- LÓGICA PARA LA PÁGINA DE LOGIN (index.html) ---
async function handleAuthPage() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const authMessage = document.getElementById('auth-message');

    // Estilos iniciales de los tabs
    tabLogin.className = 'w-1/2 py-3 rounded-tl-xl rounded-tr-none text-gray-500 bg-white font-semibold text-lg transition-colors';
    tabRegister.className = 'w-1/2 py-3 rounded-tr-xl rounded-tl-none text-gray-500 bg-white font-semibold text-lg transition-colors';
    tabLogin.classList.add('active');

    function setActiveTab(tab) {
        if (tab === 'login') {
            tabLogin.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-purple-500', 'text-white');
            tabLogin.classList.remove('text-gray-500', 'bg-white');
            tabRegister.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-purple-500', 'text-white');
            tabRegister.classList.add('text-gray-500', 'bg-white');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        } else {
            tabRegister.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-purple-500', 'text-white');
            tabRegister.classList.remove('text-gray-500', 'bg-white');
            tabLogin.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-purple-500', 'text-white');
            tabLogin.classList.add('text-gray-500', 'bg-white');
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        }
    }
    setActiveTab('login');

    tabLogin.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveTab('login');
        authMessage.className = 'hidden p-3 text-center rounded-lg';
    });
    tabRegister.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveTab('register');
        authMessage.className = 'hidden p-3 text-center rounded-lg';
    });

    // Evita bucles de refresh: solo redirige si hay sesión
    try {
        const token = localStorage.getItem('jwt_token');
        if (token) {
            window.location.replace('/app.html');
            return;
        }
    } catch (error) {
        console.error('Error al verificar sesión:', error);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            showMessage('Por favor completa todos los campos', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showMessage('Por favor ingresa un email válido', 'error');
            return;
        }
        
        showLoading('login-submit', true);
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const result = await response.json();
            if (!response.ok) {
                showMessage(result.message || 'Error en el inicio de sesión', 'error');
            } else {
                // Guarda el token JWT en localStorage
                localStorage.setItem('jwt_token', result.token);
                showNotification('¡Inicio de sesión exitoso!', 'success');
                setTimeout(() => window.location.replace('/app.html'), 1000);
            }
        } catch (error) {
            showMessage('Error de conexión. Intenta nuevamente.', 'error');
        } finally {
            showLoading('login-submit', false);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const firstName = document.getElementById('register-first-name').value.trim();
        const lastName = document.getElementById('register-last-name').value.trim();
        
        if (!email || !password || !firstName || !lastName) {
            showMessage('Por favor completa todos los campos', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showMessage('Por favor ingresa un email válido', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        showLoading('register-submit', true);
        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, firstName, lastName })
            });
            const result = await response.json();
            if (!response.ok) {
                showMessage(result.message || 'Error en el registro', 'error');
            } else {
                // Guarda el token JWT en localStorage
                localStorage.setItem('jwt_token', result.token);
                showMessage('¡Registro exitoso! Ya puedes usar la app.', 'success');
                registerForm.reset();
                // Opcional: redirigir o recargar para iniciar sesión automáticamente
                setTimeout(() => window.location.reload(), 1200);
            }
        } catch (error) {
            showMessage('Error de conexión. Intenta nuevamente.', 'error');
        } finally {
            showLoading('register-submit', false);
        }
    });

    function showMessage(message, type) {
        authMessage.textContent = message;
        authMessage.className = `p-3 my-4 rounded-lg text-center ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
    }
}

// Mejoras en las funciones de refresco
let refreshTimeout;
function debounceRefresh(func, delay = 300) {
    clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(func, delay);
}

async function refreshCategoriesUI() {
    try {
        showLoading('categories-loading', true);
        let categories = await getCategories();
        categories = categories.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
        renderCategorySelector(categories);
        renderCategoryList(categories);
    } catch (error) {
        console.error('Error al refrescar categorías:', error);
        showNotification('Error al cargar categorías', 'error');
    } finally {
        showLoading('categories-loading', false);
    }
}

async function refreshBudgetsUI() {
    try {
        showLoading('budgets-loading', true);
        const budgets = await getBudgets();
        renderBudgetList(budgets);
    } catch (error) {
        console.error('Error al refrescar presupuestos:', error);
        showNotification('Error al cargar presupuestos', 'error');
    } finally {
        showLoading('budgets-loading', false);
    }
}

async function refreshTransactionsUI() {
    try {
        showLoading('transactions-loading', true);
        const transactions = await getTransactions();
        renderTransactionList(transactions);
    } catch (error) {
        console.error('Error al refrescar transacciones:', error);
        showNotification('Error al cargar transacciones', 'error');
    } finally {
        showLoading('transactions-loading', false);
    }
}

async function refreshChartsUI() {
    try {
        showLoading('charts-loading', true);
        const data = await getChartData();
        renderCharts(data);
    } catch (error) {
        console.error('Error al refrescar gráficos:', error);
        showNotification('Error al cargar gráficos', 'error');
    } finally {
        showLoading('charts-loading', false);
    }
}

// Función helper para fetch con autenticación
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        // No hay sesión activa, retorna null silenciosamente
        return null;
    }
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    } catch (error) {
        console.error('Error en fetchWithAuth:', error);
        throw error;
    }
}

// --- LÓGICA PRINCIPAL DE LA APLICACIÓN ---
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Función para obtener datos del usuario
async function getCurrentUser() {
    const token = localStorage.getItem('jwt_token');
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Si el JWT trae nombre y apellido, úsalos
        if (payload.first_name && payload.last_name) {
            return { id: payload.sub, email: payload.email, first_name: payload.first_name, last_name: payload.last_name, role: payload.role };
        }
        // Si el rol viene en el JWT y no es admin, no intentes fetch a /api/admin/users
        if (payload.role && payload.role !== 'admin') {
            return { id: payload.sub, email: payload.email, role: payload.role };
        }
        // Si no hay nombre/apellido, intenta consultar a la API (puede ser admin sin rol en JWT)
        const response = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            const users = await response.json();
            if (Array.isArray(users)) {
                const user = users.find(u => u.id == payload.sub || u.email === payload.email);
                if (user) {
                    // Si es admin, retorna todos los datos y marca como admin
                    user.role = 'admin';
                    return user;
                }
            }
        }
        // Si no está en la lista de admins, retorna lo que haya en el JWT
        return { id: payload.sub, email: payload.email };
    } catch {
        return null;
    }
}

// Función para obtener categorías por usuario
async function getCategories() {
    try {
        const token = localStorage.getItem('jwt_token');
        if (!token) throw new Error('No hay sesión activa');
        const response = await fetch('/api/categories', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const categories = await response.json();
        console.log('Categorías obtenidas para usuario', currentUser.id, categories);
        return categories || [];
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        showNotification('Error al obtener categorías', 'error');
        return [];
    }
}

// Función para obtener transacciones
async function getTransactions() {
    try {
        const token = localStorage.getItem('jwt_token');
        if (!token) throw new Error('No hay sesión activa');
        const monthId = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const response = await fetch('/api/transactions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const allTx = await response.json();
        // Filtrar por mes y año seleccionados
        return allTx.filter(tx => tx.month === monthId);
    } catch (error) {
        console.error('Error al obtener transacciones:', error);
        return [];
    }
}

// Función para obtener presupuestos
async function getBudgets() {
    try {
        const token = localStorage.getItem('jwt_token');
        if (!token) throw new Error('No hay sesión activa');
        const monthId = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const response = await fetch('/api/budgets', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const allBudgets = await response.json();
        // Filtrar por mes y año seleccionados
        return allBudgets.filter(b => b.month === monthId);
    } catch (error) {
        console.error('Error al obtener presupuestos:', error);
        return [];
    }
}

// Función para renderizar el selector de categorías
function renderCategorySelector(categories) {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;
    
    categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

// Función para renderizar la lista de transacciones
function renderTransactionList(transactions) {
    const container = document.getElementById('expense-list-container');
    if (!container) return;
    if (transactions.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay transacciones este mes</p>';
        return;
    }
    // Ordenar por created_at descendente (más nuevas arriba)
    transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    container.innerHTML = transactions.map(transaction => {
        const isSinCategoria = !transaction.category_name || transaction.category_name === 'Sin categoría';
        const categoriaHtml = isSinCategoria
            ? '<span class="font-bold text-yellow-500">Sin categoría</span>'
            : `<span class="text-gray-500">${transaction.category_name}</span>`;
        return `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-3">
            <div class="flex-1">
                <h4 class="font-semibold text-gray-800">${transaction.description}</h4>
                <p class="text-sm">${categoriaHtml}</p>
                ${transaction.comments ? `<p class="text-xs text-gray-400 mt-1">${transaction.comments}</p>` : ''}
            </div>
            <div class="text-right flex items-center">
                <div class="mr-3">
                    <p class="font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}">
                        ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                    </p>
                    <p class="text-xs text-gray-400">${new Date(transaction.created_at).toLocaleDateString()}</p>
                </div>
                <div class="flex space-x-1">
                    <button class="btn-action btn-edit" onclick="editTransaction('${transaction.id}')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteTransaction('${transaction.id}')" title="Eliminar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Función para renderizar la lista de categorías
function renderCategoryList(categories) {
    console.log('Categorías cargadas:', categories);
}

// Función para renderizar la lista de presupuestos
function renderBudgetList(budgets) {
    console.log('Presupuestos cargados:', budgets);
}

// Función para obtener datos de gráficos
async function getChartData() {
    try {
        const transactions = await getTransactions();
        const categories = await getCategories();
        const expensesByCategory = {};
        const incomeByCategory = {};
        transactions.forEach(transaction => {
            const categoryName = transaction.category_name || 'Sin categoría';
            const monto = Number(transaction.amount) || 0;
            if (transaction.type === 'expense') {
                expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + monto;
            } else if (transaction.type === 'income') {
                incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + monto;
            }
        });
        return {
            expenses: expensesByCategory,
            income: incomeByCategory,
            categories: categories
        };
    } catch (error) {
        console.error('Error al obtener datos de gráficos:', error);
        return { expenses: {}, income: {}, categories: [] };
    }
}

// Instancias globales de los gráficos mensuales
let expensesChartInstance = null;
let incomeChartInstance = null;

function renderCharts(data) {
    console.log('📊 Renderizando gráficos con datos:', data);
    // Gráfico de gastos por categoría
    const expensesCtx = document.getElementById('expenses-chart');
    if (expensesCtx) {
        if (expensesChartInstance) {
            expensesChartInstance.destroy();
        }
        if (Object.keys(data.expenses).length > 0) {
            expensesChartInstance = new Chart(expensesCtx, {
        type: 'doughnut',
        data: {
                    labels: Object.keys(data.expenses),
            datasets: [{
                        data: Object.values(data.expenses),
                backgroundColor: [
                            '#ef4444', '#f97316', '#eab308', '#84cc16',
                            '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
                        ]
            }]
        },
        options: {
                    responsive: true,
                    maintainAspectRatio: false,
            plugins: {
                        legend: { position: 'bottom' }
            }
        }
    });
        } else {
            expensesCtx.getContext('2d').clearRect(0, 0, expensesCtx.width, expensesCtx.height);
            expensesChartInstance = null;
        }
    }
    // Gráfico de ingresos por categoría
    const incomeCtx = document.getElementById('income-chart');
    if (incomeCtx) {
        if (incomeChartInstance) {
            incomeChartInstance.destroy();
        }
        if (Object.keys(data.income).length > 0) {
            incomeChartInstance = new Chart(incomeCtx, {
        type: 'doughnut',
        data: {
                    labels: Object.keys(data.income),
            datasets: [{
                        data: Object.values(data.income),
                backgroundColor: [
                            '#10b981', '#059669', '#047857', '#065f46',
                            '#064e3b', '#022c22', '#042f2e', '#0f766e'
                        ]
            }]
        },
        options: {
                    responsive: true,
                    maintainAspectRatio: false,
            plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        } else {
            incomeCtx.getContext('2d').clearRect(0, 0, incomeCtx.width, incomeCtx.height);
            incomeChartInstance = null;
        }
    }
}

// --- MODALES: Cierre con ESC y click fuera ---
function setupModalCloseEvents(modalId, closeFn) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  // Cerrar con ESC
  function escListener(e) {
    if (e.key === 'Escape') closeFn();
  }
  // Cerrar con click fuera
  function clickListener(e) {
    if (e.target === modal) closeFn();
  }
  document.addEventListener('keydown', escListener);
  modal.addEventListener('mousedown', clickListener);
  // Limpiar listeners al cerrar
  modal._cleanup = () => {
    document.removeEventListener('keydown', escListener);
    modal.removeEventListener('mousedown', clickListener);
  };
}

// --- MODAL DE CATEGORÍAS ---
function showCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (!modal) {
        console.error('No se encontró el modal de categorías');
        return;
    }
    modal.innerHTML = `
        <div class="modal-content">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Gestionar Categorías</h3>
            <div id="categories-list" class="mb-4 max-h-60 overflow-y-auto"></div>
            <form id="add-category-form" class="space-y-3">
                <input type="text" id="new-category-name" placeholder="Nueva Categoría" 
                       class="w-full px-4 py-2 bg-gray-100 border-transparent rounded-lg" required>
                <div class="flex space-x-2">
                    <button type="submit" class="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition">
                        Agregar Categoría
                    </button>
                    <button type="button" id="close-category-modal-btn" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
                        Cerrar
                    </button>
                </div>
            </form>
        </div>
    `;
    modal.classList.remove('hidden');
    loadCategoriesList();
    setupCategoryForm();
    // Cierre con ESC y click fuera
    setupModalCloseEvents('category-modal', hideCategoryModal);
    // Cierre con botón
    document.getElementById('close-category-modal-btn').onclick = hideCategoryModal;
}

function hideCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (modal) {
        modal.classList.add('hidden');
        if (modal._cleanup) modal._cleanup();
    }
}

// --- ORDEN ALFABÉTICO Y REFRESCO DE SELECTOR ---
async function loadCategoriesList() {
    const container = document.getElementById('categories-list');
    if (!container) {
        console.error('No se encontró el contenedor de la lista de categorías');
        return;
    }
    try {
        let categories = await getCategories();
        if (!categories || categories.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay categorías definidas</p>';
            renderCategorySelector([]); // Refresca el selector vacío
            return;
        }
        // Ordena alfabéticamente
        categories = categories.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
        container.innerHTML = categories.map(category => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                <span class="font-medium text-gray-800">${category.name}</span>
                <button onclick="deleteCategory('${category.id}')" class="text-red-500 hover:text-red-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        `).join('');
        renderCategorySelector(categories); // Refresca el selector
        console.log('Lista de categorías renderizada:', categories);
    } catch (error) {
        console.error('Error al cargar categorías en el modal:', error);
        container.innerHTML = '<p class="text-red-500 text-center py-4">Error al cargar categorías</p>';
    }
}

// Función para configurar formulario de categorías
function setupCategoryForm() {
    const form = document.getElementById('add-category-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nameInput = document.getElementById('new-category-name');
        const name = nameInput.value.trim();
        
        if (!name) {
            showNotification('Por favor ingresa un nombre para la categoría', 'error');
            return;
        }
        
        try {
            await addCategory({ name });
            nameInput.value = '';
            await loadCategoriesList();
            await refreshCategoriesUI();
            showNotification('Categoría agregada exitosamente', 'success');
        } catch (error) {
            console.error('Error al agregar categoría:', error);
            showNotification('Error al agregar categoría', 'error');
        }
    });
}

// Función para eliminar categoría por usuario
async function deleteCategory(categoryId) {
    showConfirmModal({
        title: "Eliminar categoría",
        message: "¿Seguro que deseas eliminar esta categoría? Esta acción no se puede deshacer.",
        onConfirm: async () => {
            try {
                const token = localStorage.getItem('jwt_token');
                const res = await fetch(`/api/categories/${categoryId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Error al eliminar categoría');
                showNotification('Categoría eliminada', 'success');
                await refreshCategoriesUI();
                if (typeof loadCategoriesList === 'function') await loadCategoriesList();
            } catch (err) {
                showNotification('No se pudo eliminar la categoría', 'error');
            }
        }
    });
}

// --- MODAL DE EDICIÓN DE TRANSACCIÓN ---
let currentEditTransactionId = null;
async function editTransaction(transactionId) {
    console.log('[editTransaction] transactionId:', transactionId);
    currentEditTransactionId = transactionId;
    const modal = document.getElementById('edit-transaction-modal');
    const form = document.getElementById('edit-transaction-form');
    const descInput = document.getElementById('edit-description');
    const amountInput = document.getElementById('edit-amount');
    const catSelect = document.getElementById('edit-category');
    const commentsInput = document.getElementById('edit-comments');
    if (!modal || !form || !descInput || !amountInput || !catSelect || !commentsInput) {
        console.error('[editTransaction] Elementos del modal no encontrados');
        return;
    }
    if (!transactionId) {
        showNotification('ID de transacción inválido', 'error');
        console.error('[editTransaction] transactionId inválido:', transactionId);
        return;
    }
    // Obtener datos de la transacción
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        showNotification('No hay sesión activa', 'error');
        return;
    }
    const response = await fetch('/api/transactions', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        showNotification('Error al obtener transacción', 'error');
        console.error('[editTransaction] Error al obtener transacción:', response.statusText);
        return;
    }
    const transactions = await response.json();
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) {
        showNotification('Transacción no encontrada', 'error');
        console.error('[editTransaction] Transacción no encontrada para id:', transactionId);
        return;
    }
    descInput.value = tx.description || '';
    amountInput.value = tx.amount || '';
    commentsInput.value = tx.comments || '';
    // Poblar categorías
    const categoriesResponse = await fetch('/api/categories', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!categoriesResponse.ok) {
        showNotification('Error al obtener categorías', 'error');
        console.error('[editTransaction] Error al obtener categorías:', categoriesResponse.statusText);
        return;
    }
    const categories = await categoriesResponse.json();
    catSelect.innerHTML = categories.map(cat => `<option value="${cat.id}" ${cat.id === tx.category_id ? 'selected' : ''}>${cat.name}</option>`).join('');
    // Mostrar modal
    modal.classList.remove('hidden');
    // Cierre con ESC y click fuera
    setupModalCloseEvents('edit-transaction-modal', hideEditTransactionModal);
}
function hideEditTransactionModal() {
    const modal = document.getElementById('edit-transaction-modal');
    if (modal) {
        modal.classList.add('hidden');
        if (modal._cleanup) modal._cleanup();
    }
    currentEditTransactionId = null;
}
const closeEditTransactionBtn = document.getElementById('close-edit-transaction-btn');
if (closeEditTransactionBtn) {
    closeEditTransactionBtn.addEventListener('click', hideEditTransactionModal);
}
const editTransactionForm = document.getElementById('edit-transaction-form');
if (editTransactionForm) {
    editTransactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentEditTransactionId) {
            showNotification('ID de transacción inválido', 'error');
            console.error('[editTransactionForm] currentEditTransactionId inválido:', currentEditTransactionId);
            return;
        }
        const desc = document.getElementById('edit-description').value.trim();
        const amount = parseFloat(document.getElementById('edit-amount').value);
        const catId = document.getElementById('edit-category').value;
        const comments = document.getElementById('edit-comments').value.trim();
        if (!desc) {
            showNotification('La descripción no puede estar vacía', 'error');
            return;
        }
        if (!amount || amount <= 0) {
            showNotification('El monto debe ser mayor a 0', 'error');
            return;
        }
        if (!catId) {
            showNotification('Debes seleccionar una categoría', 'error');
            return;
        }
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                showNotification('No hay sesión activa', 'error');
                return;
            }
            console.log('[editTransactionForm] update', { description: desc, amount: amount, category_id: catId, comments, id: currentEditTransactionId, user_id: currentUser.id });
            const response = await fetch('/api/transactions', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ description: desc, amount: amount, category_id: catId, comments, id: currentEditTransactionId, user_id: currentUser.id })
            });
            if (!response.ok) {
                showNotification('Error al actualizar transacción', 'error');
                console.error('[editTransactionForm] Error al actualizar transacción:', response.statusText);
                return;
            }
            showNotification('Transacción actualizada', 'success');
            hideEditTransactionModal();
            await refreshAllMonthlyUI();
        } catch (error) {
            showNotification('Error inesperado al actualizar transacción', 'error');
            console.error('[editTransactionForm] Error inesperado:', error);
        }
    });
}

// Función para reasignar categoría
function reassignCategory(transactionId) {
    // Implementar modal de reasignación de categoría
    showNotification('Funcionalidad de reasignación en desarrollo', 'info');
}

// Función para eliminar transacción
async function deleteTransaction(transactionId) {
    showConfirmModal({
        title: "Eliminar transacción",
        message: "¿Seguro que deseas eliminar esta transacción? Esta acción no se puede deshacer.",
        onConfirm: async () => {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                showNotification('No hay sesión activa', 'error');
                return;
            }
            try {
                const response = await fetch('/api/transactions', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id: transactionId, user_id: currentUser.id })
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                showNotification('Transacción eliminada', 'success');
                await refreshAllMonthlyUI();
                await updateMonthlyTotals();
            } catch (error) {
                showNotification('Error al eliminar transacción', 'error');
                console.error('[deleteTransaction] Error:', error);
            }
        }
    });
}

// Función para agregar transacción
async function addTransaction(transactionData) {
    try {
        const token = localStorage.getItem('jwt_token');
        if (!token) throw new Error('No hay sesión activa');
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transactionData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw errorData;
        }
        showNotification('Transacción agregada exitosamente', 'success');
        await refreshTransactionsUI();
        await refreshChartsUI();
        await updateMonthlyTotals();
        return await response.json();
    } catch (error) {
        console.error('Error al agregar transacción:', error);
        showNotification('Error al agregar transacción', 'error');
        throw error;
    }
}

// Función para agregar categoría por usuario
async function addCategory(categoryData) {
    try {
        const token = localStorage.getItem('jwt_token');
        if (!token) throw new Error('No hay sesión activa');
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        showNotification('Categoría agregada exitosamente', 'success');
        await refreshCategoriesUI();
        return await response.json();
    } catch (error) {
        console.error('Error al agregar categoría:', error);
        showNotification('Error al agregar categoría', 'error');
        throw error;
    }
}

// Función para cerrar sesión
async function logout() {
    try {
        localStorage.removeItem('jwt_token');
        showNotification('Sesión cerrada exitosamente', 'success');
        setTimeout(() => {
            window.location.replace('/');
        }, 1000);
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showNotification('Error al cerrar sesión', 'error');
    }
}

function populateYearSelector() {
  const yearSelector = document.getElementById('year-selector');
  if (!yearSelector) return;
  yearSelector.innerHTML = '';
  for (let year = 2025; year <= 2030; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelector.appendChild(option);
  }
  // Selecciona el año actual si está en el rango, si no selecciona 2025
  const current = (new Date()).getFullYear();
  yearSelector.value = (current >= 2025 && current <= 2030) ? current : 2025;
}

// === ACTUALIZACIÓN DE TOTALES MENSUALES ===
async function updateMonthlyTotals() {
    // Obtener transacciones y presupuesto del mes actual
    const [transactions, budgets] = await Promise.all([
        getTransactions(),
        getBudgets()
    ]);
    // Calcular totales
    let totalIncome = 0;
    let totalExpenses = 0;
    transactions.forEach(tx => {
        if (tx.type === 'income') totalIncome += Number(tx.amount) || 0;
        if (tx.type === 'expense') totalExpenses += Number(tx.amount) || 0;
    });
    // El presupuesto mensual es el mismo que el de la curva azul anual
    const monthlyBudget = budgets.length > 0 ? Number(budgets[0].amount) || 0 : 0;
    const balance = totalIncome - totalExpenses;
    // Actualizar DOM
    const elIncome = document.getElementById('total-income');
    const elExpenses = document.getElementById('total-expenses');
    const elBudget = document.getElementById('monthly-budget-display');
    const elBalance = document.getElementById('remaining-budget');
    if (elIncome) elIncome.textContent = formatCurrency(totalIncome);
    if (elExpenses) elExpenses.textContent = formatCurrency(totalExpenses);
    if (elBudget) elBudget.textContent = formatCurrency(monthlyBudget);
    if (elBalance) elBalance.textContent = formatCurrency(balance);
    // Opcional: color del balance
    if (elBalance) {
        elBalance.classList.remove('text-green-600', 'text-red-600', 'text-gray-800');
        if (balance > 0) elBalance.classList.add('text-green-600');
        else if (balance < 0) elBalance.classList.add('text-red-600');
        else elBalance.classList.add('text-gray-800');
    }
}
// Llamar updateMonthlyTotals tras refrescar datos del mes
async function refreshAllMonthlyUI() {
    await Promise.all([
        refreshCategoriesUI(),
        refreshBudgetsUI(),
        refreshTransactionsUI(),
        refreshChartsUI()
    ]);
    await updateMonthlyTotals();
}
// Reemplazar llamadas a refresh...UI por refreshAllMonthlyUI en initializeApp y donde corresponda
const originalInitializeApp = initializeApp;
initializeApp = async function() {
    await originalInitializeApp();
    await refreshAllMonthlyUI();
};

// Función para inicializar la aplicación principal
async function initializeApp() {
    console.log('🚀 Inicializando aplicación...');
    try {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            console.log('❌ No hay sesión activa, redirigiendo a /');
            window.location.replace('/');
            return;
        }
        
        console.log('✅ Sesión activa encontrada');
        currentUser = await getCurrentUser();
        
        // Configurar elementos de la interfaz
        const mainTitle = document.getElementById('main-title');
        const welcomeMessage = document.getElementById('welcome-message');
        const userAvatar = document.getElementById('user-avatar');
        
        if (mainTitle) mainTitle.textContent = 'Dashboard Financiero';
        if (welcomeMessage) {
            let nombre = currentUser.first_name || '';
            let apellido = currentUser.last_name || '';
            let nombreCompleto = (nombre + ' ' + apellido).trim();
            welcomeMessage.textContent = `Bienvenido/a, ${nombreCompleto || currentUser.email}`;
        }
        if (userAvatar) renderAvatar(currentUser);
        
        // Configurar controles de fecha
        populateYearSelector();
        const currentMonthDisplay = document.getElementById('current-month-display');
        if (currentMonthDisplay) currentMonthDisplay.textContent = displayMonth(new Date(currentYear, currentMonth));
        
        console.log('📊 Cargando datos iniciales...');
        // Cargar datos iniciales
        await Promise.all([
            refreshCategoriesUI(),
            refreshTransactionsUI(),
            refreshBudgetsUI(),
            refreshChartsUI()
        ]);
        
        console.log('🔧 Configurando event listeners...');
        // Configurar event listeners
        setupEventListeners();
        
        // Ocultar loading
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        console.log('✅ Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error al inicializar la aplicación:', error);
        showNotification('Error al cargar la aplicación', 'error');
    }
}

// Función para configurar event listeners
function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    // Formulario de transacciones
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        console.log('✅ Formulario de transacciones encontrado');
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const description = document.getElementById('description').value.trim();
            const amount = parseFloat(document.getElementById('amount').value);
            const type = document.querySelector('input[name="transaction_type"]:checked').value;
            const categoryId = document.getElementById('category').value;
            const comments = document.getElementById('comments').value.trim();
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const month = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
            // Validación de campos requeridos
            if (!description || !amount || amount <= 0 || !type || !date || !month || (type === 'expense' && !categoryId)) {
                showNotification('Por favor completa todos los campos requeridos', 'error');
                return;
            }
            // Construir objeto para backend
            const transactionData = {
                description,
                amount,
                type,
                date,
                month,
                comments
            };
            if (type === 'expense') {
                transactionData.category_id = categoryId; // UUID como string
            } else {
                transactionData.category_id = null;
            }
            try {
                await addTransaction(transactionData);
                expenseForm.reset();
            } catch (error) {
                console.error('Error al agregar transacción:', error);
            }
        });
    } else {
        console.log('❌ Formulario de transacciones no encontrado');
    }
    
    // Botón de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        console.log('✅ Botón de logout encontrado');
        logoutBtn.addEventListener('click', () => {
            console.log('🔄 Click en botón de logout');
            logout();
        });
    } else {
        console.log('❌ Botón de logout no encontrado');
    }
    
    // Botón de gestión de categorías
    const manageCategoriesBtn = document.getElementById('manage-categories-btn');
    if (manageCategoriesBtn) {
        console.log('✅ Botón de gestión de categorías encontrado');
        manageCategoriesBtn.addEventListener('click', () => {
            showCategoryModal();
        });
    } else {
        console.log('❌ Botón de gestión de categorías no encontrado');
    }
    
    // Controles de navegación de meses
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    
    if (prevMonthBtn) {
        console.log('✅ Botón de mes anterior encontrado');
        prevMonthBtn.addEventListener('click', async () => {
            if (currentMonth === 0) {
                currentMonth = 11;
                currentYear--;
            } else {
                currentMonth--;
            }
            updateMonthDisplay();
            await refreshAllMonthlyUI();
        });
    } else {
        console.log('❌ Botón de mes anterior no encontrado');
    }
    
    if (nextMonthBtn) {
        console.log('✅ Botón de mes siguiente encontrado');
        nextMonthBtn.addEventListener('click', async () => {
            if (currentMonth === 11) {
                currentMonth = 0;
                currentYear++;
    } else {
                currentMonth++;
            }
            updateMonthDisplay();
            await refreshAllMonthlyUI();
        });
    } else {
        console.log('❌ Botón de mes siguiente no encontrado');
    }
    
    console.log('✅ Event listeners configurados');
}

// Función para actualizar la visualización del mes
function updateMonthDisplay() {
    const currentMonthDisplay = document.getElementById('current-month-display');
    if (currentMonthDisplay) {
        currentMonthDisplay.textContent = displayMonth(new Date(currentYear, currentMonth));
    }
}

// === LÓGICA ANUAL ===

// Obtiene los gastos y presupuestos por mes para el año seleccionado
async function getAnnualData(selectedYear) {
    try {
        const token = localStorage.getItem('jwt_token');
        if (!token) throw new Error('No hay sesión activa');
        // 1. Obtener todos los presupuestos del usuario
        const budgetsResponse = await fetch('/api/budgets', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!budgetsResponse.ok) throw new Error('Error al obtener presupuestos');
        const budgets = await budgetsResponse.json();
        // 2. Obtener todas las transacciones del usuario
        const txResponse = await fetch('/api/transactions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!txResponse.ok) throw new Error('Error al obtener transacciones');
        const transactions = await txResponse.json();
        // 3. Filtrar por año seleccionado
        const budgetsData = budgets.filter(b => b.month.startsWith(selectedYear));
        const transactionsData = transactions.filter(t => t.month.startsWith(selectedYear));
        // 4. Procesar datos por mes
        const gastosPorMes = Array(12).fill(0);
        const ingresosPorMes = Array(12).fill(0);
        const presupuestosPorMes = Array(12).fill(0);
        budgetsData.forEach(b => {
            const mes = parseInt(b.month.split('-')[1], 10) - 1;
            presupuestosPorMes[mes] = Number(b.amount) || 0;
        });
        transactionsData.forEach(t => {
            const mes = parseInt(t.month.split('-')[1], 10) - 1;
            const monto = Number(t.amount) || 0;
            if (t.type === 'expense') {
                gastosPorMes[mes] += monto;
            } else if (t.type === 'income') {
                ingresosPorMes[mes] += monto;
            }
        });
        return { gastosPorMes, ingresosPorMes, presupuestosPorMes };
    } catch (error) {
        console.error('Error al obtener datos anuales:', error);
        return { gastosPorMes: Array(12).fill(0), ingresosPorMes: Array(12).fill(0), presupuestosPorMes: Array(12).fill(0) };
    }
}

// Renderiza el gráfico anual en el canvas 'annual-chart'
let annualChartInstance = null;
function renderAnnualChart({ gastosPorMes, ingresosPorMes, presupuestosPorMes }, selectedYear) {
    const ctx = document.getElementById('annual-chart');
    if (!ctx) return;
    if (annualChartInstance) {
        annualChartInstance.destroy();
    }
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    // Calcular balance mensual asegurando números
    const balancePorMes = ingresosPorMes.map((ing, i) => (Number(ing) || 0) - (Number(gastosPorMes[i]) || 0));
    annualChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Balance',
                    data: balancePorMes,
                    backgroundColor: 'rgba(16,185,129,0.7)',
                    borderRadius: 6,
                    maxBarThickness: 32
                },
                {
                    label: 'Presupuesto',
                    data: presupuestosPorMes,
                    type: 'line',
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.1)',
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#2563eb',
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: {
                    display: true,
                    text: `Balance vs. Presupuesto - ${selectedYear}`
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString('es-CL');
                        }
                    }
                }
            }
        }
    });
}

// Lógica para refrescar el gráfico anual al cambiar de año o mostrar la vista
async function refreshAnnualChartUI() {
    const yearSelector = document.getElementById('year-selector');
    const selectedYear = yearSelector ? yearSelector.value : (new Date()).getFullYear();
    const data = await getAnnualData(selectedYear);
    renderAnnualChart(data, selectedYear);
}

// --- Integración con la UI ---
// Al cambiar a la vista anual, refrescar el gráfico
const navAnnual = document.getElementById('nav-annual');
if (navAnnual) {
    navAnnual.addEventListener('click', () => {
        refreshAnnualChartUI();
    });
}
// Al cambiar el año, refrescar el gráfico si la vista anual está visible
const yearSelector = document.getElementById('year-selector');
if (yearSelector) {
    yearSelector.addEventListener('change', async () => {
        currentYear = parseInt(yearSelector.value, 10);
        // Si la vista anual está visible, refresca el gráfico anual
        const annualView = document.getElementById('annual-dashboard-view');
        if (annualView && !annualView.classList.contains('hidden')) {
            await refreshAnnualChartUI();
        }
        // Siempre refresca la UI mensual para el año seleccionado
        await refreshAllMonthlyUI();
    });
}

// === MODAL DE EDICIÓN DE PRESUPUESTOS ANUALES ===
const editAnnualBudgetsBtn = document.getElementById('edit-annual-budgets-btn');
const editAnnualBudgetsModal = document.getElementById('edit-annual-budgets-modal');
const editAnnualBudgetsForm = document.getElementById('edit-annual-budgets-form');
const closeEditAnnualBudgetsBtn = document.getElementById('close-edit-annual-budgets-btn');
const saveAnnualBudgetsBtn = document.getElementById('save-annual-budgets-btn');
const editAnnualYear = document.getElementById('edit-annual-year');

if (editAnnualBudgetsBtn && editAnnualBudgetsModal && editAnnualBudgetsForm) {
    editAnnualBudgetsBtn.addEventListener('click', async () => {
        // Mostrar modal y poblar inputs
        const yearSelector = document.getElementById('year-selector');
        const selectedYear = yearSelector ? yearSelector.value : (new Date()).getFullYear();
        editAnnualYear.textContent = selectedYear;
        editAnnualBudgetsModal.classList.remove('hidden');
        // Obtener presupuestos actuales (fetch actualizado SIEMPRE)
        const response = await fetch('/api/budgets', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const budgets = await response.json();
        // Poblar inputs
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        editAnnualBudgetsForm.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const monthId = `${selectedYear}-${String(i+1).padStart(2, '0')}`;
            // Si no hay presupuesto, mostrar 0
            const presupuesto = budgets.find(b => b.month === monthId)?.amount ?? 0;
            editAnnualBudgetsForm.innerHTML += `
                <div class="flex flex-col">
                    <label class="text-sm font-medium text-gray-700 mb-1">${meses[i]}</label>
                    <input type="number" min="0" step="1000" name="${monthId}" value="${presupuesto}" class="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500" required />
                </div>
            `;
        }
        // Cierre con ESC y click fuera
        setupModalCloseEvents('edit-annual-budgets-modal', () => {
            editAnnualBudgetsModal.classList.add('hidden');
        });
    });
}
if (closeEditAnnualBudgetsBtn && editAnnualBudgetsModal) {
    closeEditAnnualBudgetsBtn.addEventListener('click', () => {
        editAnnualBudgetsModal.classList.add('hidden');
    });
}
if (editAnnualBudgetsForm) {
    editAnnualBudgetsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveAnnualBudgetsBtn.disabled = true;
        const formData = new FormData(editAnnualBudgetsForm);
        const updates = [];
        for (let [month, amount] of formData.entries()) {
            updates.push({ month, amount: parseInt(amount, 10) });
        }
        // Actualizar presupuestos en Supabase
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            showNotification('No hay sesión activa', 'error');
            return;
        }
        try {
            const response = await fetch('/api/budgets', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            showNotification('Presupuestos actualizados', 'success');
            editAnnualBudgetsModal.classList.add('hidden');
            refreshAnnualChartUI();
        } catch (error) {
            showNotification('Error al actualizar presupuestos', 'error');
        } finally {
            saveAnnualBudgetsBtn.disabled = false;
        }
    });
}

// Inicializar la aplicación cuando se carga la página
if (document.getElementById('app-container')) {
    initializeApp();
    initializeMonthYearSelectors();
    setupMonthYearListeners();
}

window.deleteTransaction = deleteTransaction;
window.editTransaction = editTransaction;
window.deleteCategory = deleteCategory;

// Corregir cálculo de sumas por categoría para gráficos
function calcularTotalesPorCategoria(transactions, tipo) {
    const totales = {};
    transactions.forEach(tx => {
        if (tx.type !== tipo) return;
        const cat = tx.category_name || 'Sin categoría';
        const monto = Number(tx.amount) || 0;
        if (!totales[cat]) totales[cat] = 0;
        totales[cat] += monto;
    });
    return totales;
}

// Al cambiar el mes o año, refrescar la UI mensual
function setupMonthYearListeners() {
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const yearSelector = document.getElementById('year-selector');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', async () => {
            if (currentMonth === 0) {
                currentMonth = 11;
                currentYear--;
            } else {
                currentMonth--;
            }
            updateMonthDisplay();
            await refreshAllMonthlyUI();
        });
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', async () => {
            if (currentMonth === 11) {
                currentMonth = 0;
                currentYear++;
            } else {
                currentMonth++;
            }
            updateMonthDisplay();
            await refreshAllMonthlyUI();
        });
    }
    if (yearSelector) {
        yearSelector.addEventListener('change', async () => {
            currentYear = parseInt(yearSelector.value, 10);
            updateMonthDisplay();
            await refreshAllMonthlyUI();
        });
    }
}

// Inicializar selectores de mes y año al cargar la app
function initializeMonthYearSelectors() {
    const monthSelector = document.getElementById('month-selector');
    const yearSelector = document.getElementById('year-selector');
    const now = new Date();
    currentMonth = now.getMonth();
    currentYear = now.getFullYear();
    if (monthSelector) monthSelector.value = currentMonth;
    if (yearSelector) yearSelector.value = currentYear;
    // Listeners para cambios
    if (monthSelector) {
        monthSelector.addEventListener('change', async () => {
            currentMonth = parseInt(monthSelector.value, 10);
            updateMonthDisplay();
            await refreshAllMonthlyUI();
        });
    }
    if (yearSelector) {
        yearSelector.addEventListener('change', async () => {
            currentYear = parseInt(yearSelector.value, 10);
            updateMonthDisplay();
            await refreshAllMonthlyUI();
        });
    }
}

// Mostrar/ocultar selector de mes según la vista
function showMonthlyView() {
    toggleMonthSelector(true);
    // ...código para mostrar la vista mensual...
}
function showAnnualView() {
    toggleMonthSelector(false);
    // ...código para mostrar la vista anual...
}

// Avatar: mostrar iniciales nombre y apellido
function renderAvatar(user) {
    const avatar = document.getElementById('user-avatar');
    if (!avatar) return;
    const first = user.first_name ? user.first_name[0].toUpperCase() : '';
    const last = user.last_name ? user.last_name[0].toUpperCase() : '';
    avatar.textContent = first + last;
}

// Abrir modal de perfil al hacer click en el avatar
const avatar = document.getElementById('user-avatar');
if (avatar) {
    avatar.addEventListener('click', async () => {
        const modal = document.getElementById('profile-modal');
        if (!modal) return;
        // Poblar campos con datos actuales usando getCurrentUser
        const user = await getCurrentUser();
        document.getElementById('profile-email').value = user?.email || '';
        document.getElementById('profile-firstname').value = user?.first_name || '';
        document.getElementById('profile-lastname').value = user?.last_name || '';
        document.getElementById('profile-password').value = '';
        modal.classList.remove('hidden');
        setupModalCloseEvents('profile-modal', () => { modal.classList.add('hidden'); });
    });
}

// Guardar cambios de perfil
const profileForm = document.getElementById('profile-form');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = document.getElementById('profile-firstname').value.trim();
        const lastName = document.getElementById('profile-lastname').value.trim();
        const password = document.getElementById('profile-password').value;
        const passwordRepeat = document.getElementById('profile-password-repeat').value;
        if (password && password !== passwordRepeat) {
            showNotification('Las contraseñas no coinciden', 'error');
            return;
        }
        const token = localStorage.getItem('jwt_token');
        if (!token) return;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const body = { firstName, lastName };
        if (password) body.password = password;
        try {
            const response = await fetch(`/api/admin/users/${payload.sub}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) throw new Error('Error al actualizar perfil');
            showNotification('Perfil actualizado', 'success');
            document.getElementById('profile-modal').classList.add('hidden');
            // Refrescar avatar
            renderAvatar({ first_name: firstName, last_name: lastName });
        } catch (err) {
            showNotification('Error al actualizar perfil', 'error');
        }
    });
}

// Cerrar modal con botón cancelar
const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
if (closeProfileModalBtn) {
    closeProfileModalBtn.addEventListener('click', () => {
        document.getElementById('profile-modal').classList.add('hidden');
    });
}

// Logout desde el modal
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        localStorage.removeItem('jwt_token');
        window.location.reload();
    });
}

// Mostrar menú admin si el usuario es admin (por JWT o por BBDD)
async function showAdminMenuIfNeeded() {
    const user = await getCurrentUser();
    if (user && user.role === 'admin') {
        document.getElementById('admin-menu-item').style.display = 'block';
    }
}
// Llama a esta función en la inicialización
showAdminMenuIfNeeded();

function showConfirmModal({ title = "¿Estás seguro?", message = "", onConfirm }) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;
    modal.classList.remove('hidden');

    const acceptBtn = document.getElementById('confirm-modal-accept');
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    const cleanup = () => {
        modal.classList.add('hidden');
        acceptBtn.removeEventListener('click', onAccept);
        cancelBtn.removeEventListener('click', onCancel);
    };

    function onAccept() {
        cleanup();
        if (typeof onConfirm === 'function') onConfirm();
    }
    function onCancel() {
        cleanup();
    }

    acceptBtn.addEventListener('click', onAccept);
    cancelBtn.addEventListener('click', onCancel);
}
window.showConfirmModal = showConfirmModal;

