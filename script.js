import { supabase } from './auth.js';

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
        if (response.ok) {
            const versionData = await response.json();
            appVersion = versionData.version;
        }
    } catch (error) {
        console.log('No se pudo obtener la versión desde la API, usando versión por defecto');
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
    // Inicializar footer en todas las páginas
    initializeFooter();
    
    // Si encuentra el formulario de login, ejecuta la lógica de autenticación.
    if (document.getElementById('login-form')) {
        handleAuthPage();
    } 
    // Si encuentra el contenedor de la app, ejecuta la lógica de la aplicación principal.
    else if (document.getElementById('app-container')) {
        handleAppPage();
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
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
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
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                showMessage('Error: ' + error.message, 'error');
            } else {
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
            const { data, error } = await supabase.auth.signUp({
                email, password,
                options: { data: { first_name: firstName, last_name: lastName } }
            });
            if (error) {
                showMessage('Error: ' + error.message, 'error');
            } else {
                showMessage('¡Registro exitoso! Revise su correo para confirmar la cuenta.', 'success');
                registerForm.reset();
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
        const categories = await getCategories();
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

// Mejora en el manejo de errores de la API
async function apiCall(endpoint, options = {}) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('No hay sesión activa');
        }
        
        const response = await fetch(`/api${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error en API call ${endpoint}:`, error);
        throw error;
    }
}

// --- LÓGICA PRINCIPAL DE LA APLICACIÓN ---
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Función para obtener datos del usuario
async function getCurrentUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        return null;
    }
}

// Función para obtener categorías
async function getCategories() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No hay sesión activa');
        
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');
            
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return [];
    }
}

// Función para obtener transacciones
async function getTransactions() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No hay sesión activa');
        
        const monthId = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                categories(name)
            `)
            .eq('user_id', session.user.id)
            .eq('month_id', monthId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error al obtener transacciones:', error);
        return [];
    }
}

// Función para obtener presupuestos
async function getBudgets() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No hay sesión activa');
        
        const monthId = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        
        const { data, error } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('month_id', monthId);
            
        if (error) throw error;
        return data || [];
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
    
    container.innerHTML = transactions.map(transaction => `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex-1">
                <h4 class="font-semibold text-gray-800">${transaction.description}</h4>
                <p class="text-sm text-gray-500">${transaction.categories?.name || 'Sin categoría'}</p>
            </div>
            <div class="text-right">
                <p class="font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}">
                    ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                </p>
                <p class="text-xs text-gray-400">${new Date(transaction.created_at).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
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
            const categoryName = transaction.categories?.name || 'Sin categoría';
            if (transaction.type === 'expense') {
                expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + transaction.amount;
            } else {
                incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + transaction.amount;
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

// Función para renderizar gráficos
function renderCharts(data) {
    console.log('Datos de gráficos:', data);
}

// Función para agregar transacción
async function addTransaction(transactionData) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No hay sesión activa');
        
        const monthId = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        
        const { data, error } = await supabase
            .from('transactions')
            .insert([{
                user_id: session.user.id,
                description: transactionData.description,
                amount: transactionData.amount,
                type: transactionData.type,
                category_id: transactionData.category_id,
                month_id: monthId,
                date: new Date().toISOString().split('T')[0],
                comments: transactionData.comments || ''
            }])
            .select();
            
        if (error) throw error;
        
        showNotification('Transacción agregada exitosamente', 'success');
        await refreshTransactionsUI();
        await refreshChartsUI();
        
        return data[0];
    } catch (error) {
        console.error('Error al agregar transacción:', error);
        showNotification('Error al agregar transacción', 'error');
        throw error;
    }
}

// Función para agregar categoría
async function addCategory(categoryData) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No hay sesión activa');
        
        const { data, error } = await supabase
            .from('categories')
            .insert([{
                user_id: session.user.id,
                name: categoryData.name
            }])
            .select();
            
        if (error) throw error;
        
        showNotification('Categoría agregada exitosamente', 'success');
        await refreshCategoriesUI();
        
        return data[0];
    } catch (error) {
        console.error('Error al agregar categoría:', error);
        showNotification('Error al agregar categoría', 'error');
        throw error;
    }
}

// Función para cerrar sesión
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        showNotification('Sesión cerrada exitosamente', 'success');
        setTimeout(() => {
            window.location.replace('/');
        }, 1000);
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showNotification('Error al cerrar sesión', 'error');
    }
}

// Función para inicializar la aplicación principal
async function initializeApp() {
    console.log('🚀 Inicializando aplicación...');
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.log('❌ No hay sesión activa, redirigiendo a /');
            window.location.replace('/');
            return;
        }
        
        console.log('✅ Sesión activa encontrada');
        currentUser = session.user;
        
        // Configurar elementos de la interfaz
        const mainTitle = document.getElementById('main-title');
        const welcomeMessage = document.getElementById('welcome-message');
        const userAvatar = document.getElementById('user-avatar');
        
        if (mainTitle) mainTitle.textContent = 'Dashboard Financiero';
        if (welcomeMessage) welcomeMessage.textContent = `Bienvenido, ${currentUser.user_metadata?.first_name || currentUser.email}`;
        if (userAvatar) userAvatar.textContent = (currentUser.user_metadata?.first_name || currentUser.email).charAt(0).toUpperCase();
        
        // Configurar controles de fecha
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
            
            const description = document.getElementById('description').value;
            const amount = parseFloat(document.getElementById('amount').value);
            const type = document.querySelector('input[name="transaction_type"]:checked').value;
            const category_id = document.getElementById('category').value;
            const comments = document.getElementById('comments').value;
            
            if (!description || !amount || !category_id) {
                showNotification('Por favor completa todos los campos requeridos', 'error');
                return;
            }
            
            try {
                await addTransaction({ description, amount, type, category_id, comments });
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
            showNotification('Funcionalidad de categorías en desarrollo', 'info');
        });
    } else {
        console.log('❌ Botón de gestión de categorías no encontrado');
    }
    
    // Controles de navegación de meses
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    
    if (prevMonthBtn) {
        console.log('✅ Botón de mes anterior encontrado');
        prevMonthBtn.addEventListener('click', () => {
            if (currentMonth === 0) {
                currentMonth = 11;
                currentYear--;
            } else {
                currentMonth--;
            }
            updateMonthDisplay();
            refreshTransactionsUI();
            refreshChartsUI();
        });
    } else {
        console.log('❌ Botón de mes anterior no encontrado');
    }
    
    if (nextMonthBtn) {
        console.log('✅ Botón de mes siguiente encontrado');
        nextMonthBtn.addEventListener('click', () => {
            if (currentMonth === 11) {
                currentMonth = 0;
                currentYear++;
            } else {
                currentMonth++;
            }
            updateMonthDisplay();
            refreshTransactionsUI();
            refreshChartsUI();
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

// Función helper para fetch con autenticación
async function fetchWithAuth(url, options = {}) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('No hay sesión activa');
        }
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
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

// Inicializar la aplicación cuando se carga la página
if (document.getElementById('app-container')) {
    initializeApp();
}

