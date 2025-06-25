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

// --- LÓGICA DE DETECCIÓN DE PÁGINA ---
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar footer en todas las páginas
    await initializeFooter();
    
    // Si encuentra el formulario de login, ejecuta la lógica de autenticación.
    if (document.getElementById('login-form')) {
        handleAuthPage();
    } 
    // Si encuentra el contenedor de la app, ejecuta la lógica de la aplicación principal.
    else if (document.getElementById('app-container')) {
        handleAppPage();
    }
});


// --- LÓGICA PARA LA PÁGINA DE LOGIN (index.html) ---
async function handleAuthPage() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const authMessage = document.getElementById('auth-message');

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.replace('/app.html');
        return;
    }

    tabLogin.addEventListener('click', () => {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        tabRegister.classList.remove('text-blue-600', 'border-b-2');
        authMessage.className = 'hidden p-3 text-center rounded-lg';
    });

    tabRegister.addEventListener('click', () => {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabRegister.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        tabLogin.classList.remove('text-blue-600', 'border-b-2');
        authMessage.className = 'hidden p-3 text-center rounded-lg';
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showMessage('Error: ' + error.message, 'error');
        } else {
            window.location.replace('/app.html');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const firstName = document.getElementById('register-first-name').value;
        const lastName = document.getElementById('register-last-name').value;
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
    });

    function showMessage(message, type) {
        authMessage.textContent = message;
        authMessage.className = `p-3 my-4 rounded-lg text-center ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
    }
}


// --- LÓGICA PARA LA APLICACIÓN PRINCIPAL (app.html) ---
let currentUserProfile = null;
let currentView = 'monthly';
let currentMonth = new Date();
let currentYear = new Date().getFullYear();
let monthlyAppData = { budget: 0, transactions: [] };
let annualData = [];
let categories = [];
let expensesChart;
let incomeChart;
let annualChart;
const dom = {};
let categoriesCache = null;

// Función para ocultar errores de la UI
function silentCatch(fn) {
    return async function(...args) {
        try {
            await fn.apply(this, args);
        } catch (e) {
            // No mostrar nada al usuario
        }
    }
}

// Reemplazar llamadas a funciones de carga de datos con silentCatch
// handleAppPage y initializeAppUI ya están protegidas por try/catch, pero los fetch pueden lanzar errores
// Así que envolvemos fetchDataForCurrentMonth y fetchAnnualData

// ...
// En initializeAppUI, reemplaza:
// await Promise.all([fetchDataForCurrentMonth(), fetchAnnualData(), fetchCategories()]);
// por:
// await Promise.all([
//   silentCatch(fetchDataForCurrentMonth)(),
//   silentCatch(fetchAnnualData)(),
//   silentCatch(fetchCategories)()
// ]);
// ...

// Busca la función initializeAppUI y reemplaza la llamada a Promise.all por la versión con silentCatch

async function handleAppPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.replace('/index.html');
        return;
    }
    let profile;
    try {
        // Buscar perfil
        let { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!data) {
            // Si no existe, crear perfil (rol admin si es jovillarroelb@gmail.com)
            const isAdmin = user.email === 'jovillarroelb@gmail.com';
            const firstName = user.user_metadata?.first_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Usuario');
            const lastName = user.user_metadata?.last_name || '';
            const newProfile = {
                id: user.id,
                first_name: firstName,
                last_name: lastName,
                role: isAdmin ? 'admin' : 'user',
                avatar_text: (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase(),
                email: user.email
            };
            const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
            if (insertError) throw insertError;
            data = newProfile;
        }
        profile = data;
        currentUserProfile = profile;
    } catch (error) {
        // Mostrar mensaje de error en pantalla
        document.body.innerHTML = `<div style='display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;'><h2 style='color:#b91c1c;'>Error al cargar tu perfil</h2><p>${error.message || error}</p><button id='retry-profile' style='margin-top:2rem;padding:0.5rem 1.5rem;background:#2563eb;color:white;border:none;border-radius:0.5rem;font-size:1rem;'>Reintentar</button></div>`;
        document.getElementById('retry-profile').onclick = () => window.location.reload();
        return;
    }
    // La inicialización ahora ocurre directamente.
    initializeAppUI();
}

function initializeDOMReferences() {
    dom.appContainer = document.getElementById('app-container');
    dom.loadingIndicator = document.getElementById('loading-indicator');
    dom.mainTitle = document.getElementById('main-title');
    dom.monthlyView = document.getElementById('monthly-dashboard-view');
    dom.annualView = document.getElementById('annual-dashboard-view');
    dom.navMonthly = document.getElementById('nav-monthly');
    dom.navAnnual = document.getElementById('nav-annual');
    dom.headerControls = document.getElementById('header-controls');
    dom.monthControls = document.getElementById('month-controls');
    dom.yearSelector = document.getElementById('year-selector');
    dom.currentMonthDisplay = document.getElementById('current-month-display');
    dom.prevMonthBtn = document.getElementById('prev-month-btn');
    dom.nextMonthBtn = document.getElementById('next-month-btn');
    dom.budgetDisplay = document.getElementById('budget-display');
    dom.totalIncome = document.getElementById('total-income');
    dom.totalExpenses = document.getElementById('total-expenses');
    dom.remainingBudget = document.getElementById('remaining-budget');
    dom.progressBar = document.getElementById('progress-bar');
    dom.expenseForm = document.getElementById('expense-form');
    dom.budgetForm = document.getElementById('budget-form');
    dom.description = document.getElementById('description');
    dom.amount = document.getElementById('amount');
    dom.category = document.getElementById('category');
    dom.comments = document.getElementById('comments');
    dom.expenseListContainer = document.getElementById('expense-list-container');
    dom.expensesChartWrapper = document.getElementById('expenses-chart-wrapper');
    dom.incomeChartWrapper = document.getElementById('income-chart-wrapper');
    dom.annualChartCanvas = document.getElementById('annual-chart');
    dom.manageCategoriesBtn = document.getElementById('manage-categories-btn');
    dom.adminLink = document.getElementById('admin-link');
    dom.logoutBtn = document.getElementById('logout-btn');
    dom.welcomeMessage = document.getElementById('welcome-message');
    dom.userAvatar = document.getElementById('user-avatar');
    dom.categoryModal = document.getElementById('category-modal');
    dom.reassignModal = document.getElementById('reassign-modal');
    dom.editTransactionModal = document.getElementById('edit-transaction-modal');
    dom.editAnnualBudgetsBtn = document.getElementById('edit-annual-budgets-btn');
}

function getMonthId(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function changeMonth(delta) {
    let newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    // Limitar el rango de meses al año seleccionado
    if (newMonth.getFullYear() < currentYear) {
        newMonth = new Date(currentYear, 0, 1);
    } else if (newMonth.getFullYear() > currentYear) {
        newMonth = new Date(currentYear, 11, 1);
    }
    currentMonth = newMonth;
    dom.currentMonthDisplay.textContent = displayMonth(currentMonth);
    fetchDataForCurrentMonth();
}

async function handleAddTransaction(e) {
    e.preventDefault();
    const type = document.querySelector('input[name="transaction_type"]:checked').value;
    const description = dom.description.value.trim();
    const amount = parseFloat(dom.amount.value);
    const categoryId = dom.category.value;
    const comments = dom.comments.value.trim();
    const monthId = getMonthId(currentMonth);
    const date = new Date().toISOString();

    // Validación estricta
    if (!description || isNaN(amount) || amount <= 0 || !categoryId) {
        showFormMessage('Completa todos los campos obligatorios y asegúrate que el monto sea mayor a 0.', 'error');
        return;
    }

    // Feedback visual: loading
    dom.expenseForm.querySelector('button[type="submit"]').disabled = true;
    showFormMessage('Guardando transacción...', 'loading');

    try {
        const response = await fetchWithAuth('/api/transactions', {
            method: 'POST',
            body: JSON.stringify({
                description,
                amount,
                type,
                categoryId,
                date,
                monthId,
                comments
            })
        });
        if (!response.ok) throw new Error('Error al guardar transacción');
        dom.expenseForm.reset();
        fetchDataForCurrentMonth();
        showFormMessage('¡Transacción guardada!', 'success');
    } catch (error) {
        showFormMessage('No se pudo guardar la transacción', 'error');
    } finally {
        dom.expenseForm.querySelector('button[type="submit"]').disabled = false;
        setTimeout(() => hideFormMessage(), 2000);
    }
}

function showFormMessage(msg, type) {
    let el = document.getElementById('expense-form-message');
    if (!el) {
        el = document.createElement('div');
        el.id = 'expense-form-message';
        el.className = 'my-2 text-center text-sm rounded-lg py-2';
        dom.expenseForm.prepend(el);
    }
    el.textContent = msg;
    el.className = 'my-2 text-center text-sm rounded-lg py-2 ' +
        (type === 'success' ? 'bg-green-100 text-green-700' :
         type === 'error' ? 'bg-red-100 text-red-700' :
         type === 'loading' ? 'bg-blue-100 text-blue-700' : '');
}
function hideFormMessage() {
    const el = document.getElementById('expense-form-message');
    if (el) el.remove();
}

async function initializeAppUI() {
    initializeDOMReferences();

    // Fallbacks seguros para nombres y avatar
    const firstName = currentUserProfile.first_name || (currentUserProfile.email ? currentUserProfile.email.split('@')[0] : 'Usuario');
    const lastName = currentUserProfile.last_name || '';
    dom.welcomeMessage.textContent = `Hola ${firstName}, bienvenido.`;
    let avatar = '';
    if (firstName && firstName.charAt(0)) avatar += firstName.charAt(0);
    if (lastName && lastName.charAt(0)) avatar += lastName.charAt(0);
    if (!avatar && currentUserProfile.email) avatar = currentUserProfile.email.charAt(0).toUpperCase();
    if (!avatar) avatar = 'U';
    dom.userAvatar.textContent = avatar.toUpperCase();
    dom.userAvatar.classList.add('cursor-pointer', 'select-none');
    
    if (currentUserProfile.role === 'admin') {
        dom.adminLink.classList.remove('hidden');
        dom.adminLink.href = '/admin.html';
    }
    
    dom.logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.replace('/index.html');
    });

    dom.navMonthly.addEventListener('click', (e) => { e.preventDefault(); switchView('monthly'); });
    dom.navAnnual.addEventListener('click', (e) => { e.preventDefault(); switchView('annual'); });
    dom.prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    dom.nextMonthBtn.addEventListener('click', () => changeMonth(1));
    dom.yearSelector.addEventListener('change', handleYearChange);
    dom.expenseForm.addEventListener('submit', handleAddTransaction);
    dom.manageCategoriesBtn.addEventListener('click', openCategoryModal);
    dom.editAnnualBudgetsBtn.addEventListener('click', openAnnualBudgetsModal);
    dom.userAvatar.addEventListener('click', openProfileModal);
    
    dom.expenseListContainer.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-btn');
        const reassignButton = e.target.closest('.reassign-btn');
        const editButton = e.target.closest('.edit-btn');
        if (deleteButton) handleDeleteTransaction(deleteButton.dataset.id);
        else if (reassignButton) openReassignModal(reassignButton.dataset.id, reassignButton.dataset.description, reassignButton.dataset.categoryId);
        else if (editButton) openEditTransactionModal(editButton.dataset.id, editButton.dataset.description, editButton.dataset.comments);
    });

    // --- OPTIMIZACIÓN: CARGA INICIAL EN PARALELO ---
    dom.loadingIndicator.style.display = 'block';
    dom.monthlyView.classList.add('hidden');
    dom.annualView.classList.add('hidden');
    populateYearSelector();
    dom.yearSelector.value = currentYear;
    dom.currentMonthDisplay.textContent = displayMonth(currentMonth);

    // Fetch en paralelo
    const monthId = getMonthId(currentMonth);
    await Promise.all([
        silentCatch(fetchCategories)(),
        silentCatch(fetchDataForCurrentMonth)(),
        silentCatch(fetchAnnualData)()
    ]);
}

async function fetchWithAuth(url, options = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('/index.html');
        return Promise.reject(new Error("No session found"));
    }
    const token = session.access_token;
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers };
    return fetch(url, { ...options, headers });
}

function switchView(view) {
    currentView = view;
    dom.loadingIndicator.style.display = 'block';
    dom.monthlyView.classList.add('hidden');
    dom.annualView.classList.add('hidden');
    dom.navMonthly.classList.toggle('active', view === 'monthly');
    dom.navAnnual.classList.toggle('active', view === 'annual');
    if (view === 'monthly') {
        dom.mainTitle.textContent = 'Dashboard Mensual';
        dom.monthControls.style.display = 'flex';
        fetchDataForCurrentMonth();
    } else if (view === 'annual') {
        dom.mainTitle.textContent = `Resumen Anual ${currentYear}`;
        dom.monthControls.style.display = 'none';
        fetchAnnualData();
    }
}
async function fetchDataForCurrentMonth() {
    const monthId = getMonthId(currentMonth);
    try {
        const res = await fetchWithAuth(`/api/data/${monthId}`);
        if (!res.ok) throw new Error('Error al cargar datos');
        const data = await res.json();
        monthlyAppData = data;
        renderMonthlyUI();
    } catch (error) {
        // No mostrar error al usuario
        // document.getElementById('loading-indicator').textContent = 'No se pudieron cargar los datos.';
    }
}

async function fetchAnnualData() {
    try {
        const res = await fetchWithAuth(`/api/annual-summary/${currentYear}`);
        if (!res.ok) throw new Error('Error al cargar resumen anual');
        const data = await res.json();
        annualData = data;
        renderAnnualChart();
    } catch (error) {
        // No mostrar error al usuario
        // document.getElementById('loading-indicator').textContent = 'No se pudo cargar el resumen anual.';
    }
}
async function fetchCategories() {
    if (categoriesCache) {
        categories = categoriesCache;
        updateCategoryUI();
        return;
    }
    try {
        const response = await fetchWithAuth(`/api/categories`, {
            headers: { 'x-profile-id': currentUserProfile.id }
        });
        if (!response.ok) return;
        categories = await response.json();
        categoriesCache = categories;
        updateCategoryUI();
    } catch (error) { console.error(error); }
}

function updateCategoryUI() { 
    if(dom.category) {
        dom.category.innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';
        categories.forEach(cat => dom.category.add(new Option(cat.name, cat.id)));
        // Ya no se agrega la opción para crear nueva categoría
    }
}

function renderMonthlyUI() {
    const { budget = 0, transactions = [] } = monthlyAppData;
    const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalIncomeValue = transactions.filter(t => t.type === 'income').reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const balance = totalIncomeValue - totalSpent; 
    const progress = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
    
    if (dom.budgetDisplay) dom.budgetDisplay.textContent = formatCurrency(budget);
    if (dom.progressBar) dom.progressBar.style.width = `${progress}%`;
    dom.totalIncome.textContent = formatCurrency(totalIncomeValue);
    dom.totalExpenses.textContent = formatCurrency(totalSpent);
    dom.remainingBudget.textContent = formatCurrency(balance);
    // Mostrar presupuesto mensual en el nuevo display
    const monthlyBudgetEl = document.getElementById('monthly-budget-display');
    if (monthlyBudgetEl) monthlyBudgetEl.textContent = formatCurrency(budget);
    
    renderTransactionList(transactions);
    renderExpensesChart(transactions);
    renderIncomesChart(transactions);
    
    dom.loadingIndicator.style.display = 'none';
    dom.monthlyView.classList.remove('hidden');
}

function renderTransactionList(transactions) {
    dom.expenseListContainer.innerHTML = '';
    if (transactions.length === 0) {
        dom.expenseListContainer.innerHTML = `<p class="text-center text-gray-500 py-8">Sin movimientos para mostrar este mes.</p>`;
        return;
    }
    
    transactions.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(t => {
        const isExpense = t.type === 'expense';
        const itemEl = document.createElement('div');
        const transactionDate = new Date(t.date);
        const day = String(transactionDate.getUTCDate()).padStart(2, '0');
        const month = transactionDate.toLocaleDateString('es-ES', { month: 'short' });
        const categoryName = t.category_name || 'Sin categoría';
        const comments = t.comments || '';

        itemEl.className = 'flex flex-col gap-2 p-4 sm:p-2 sm:gap-1 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 bg-white shadow-sm';
        itemEl.innerHTML = `
            <div class="flex items-center gap-3 sm:gap-2">
                <div class="w-12 h-12 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isExpense ? 'bg-red-100' : 'bg-green-100'}">
                    <svg class="w-6 h-6 sm:w-5 sm:h-5 ${isExpense ? 'text-red-500' : 'text-green-500'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        ${isExpense ? '<path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M12 4.5v15m0 0l-6.75-6.75M12 19.5l6.75-6.75\" />' : '<path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75\" />'}
                    </svg>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <div>
                            <p class="font-semibold text-gray-800 text-base sm:text-sm leading-tight break-words">${t.description}</p>
                            <p class="text-sm sm:text-xs text-gray-500 mt-1 sm:mt-0">${categoryName} · ${day} de ${month}</p>
                        </div>
                        <span class="font-bold text-lg sm:text-base ${isExpense ? 'text-red-600' : 'text-green-600'} block sm:inline-block mt-2 sm:mt-0 text-right">${isExpense ? '-' : '+'} ${formatCurrency(t.amount)}</span>
                    </div>
                    ${comments ? `<div class=\"flex items-start gap-1 mt-2 sm:mt-1\"><span class=\"text-xs sm:text-[11px] text-gray-400\">💬</span><span class=\"text-xs sm:text-[11px] text-gray-400 leading-relaxed break-words\">${comments}</span></div>` : ''}
                </div>
            </div>
            <div class="flex gap-2 sm:gap-1 justify-end border-t border-gray-100 pt-3 sm:pt-2 mt-2 sm:mt-1">
                <button data-id="${t._id}" data-description="${t.description}" data-comments="${comments}" class="edit-btn text-gray-400 hover:text-yellow-600 p-2 sm:p-1 rounded-lg hover:bg-yellow-50 transition-colors" title="Editar">
                    <svg class="w-5 h-5 sm:w-4 sm:h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                </button>
                <button data-id="${t._id}" data-description="${t.description}" data-category-id="${t.category_id || ''}" class="reassign-btn text-gray-400 hover:text-blue-600 p-2 sm:p-1 rounded-lg hover:bg-blue-50 transition-colors" title="Reasignar Categoría">
                    <svg class="w-5 h-5 sm:w-4 sm:h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                </button>
                <button data-id="${t._id}" class="delete-btn text-gray-400 hover:text-red-600 p-2 sm:p-1 rounded-lg hover:bg-red-50 transition-colors font-bold text-xl sm:text-base" title="Eliminar">&times;</button>
            </div>
        `;
        dom.expenseListContainer.appendChild(itemEl);
    });
}

function renderExpensesChart(transactions) {
    if (expensesChart) expensesChart.destroy();
    const expenses = transactions.filter(t => t.type === 'expense');
    const dataByCategory = {};
    expenses.forEach(t => {
        const cat = t.category_name || 'Sin categoría';
        dataByCategory[cat] = (dataByCategory[cat] || 0) + parseFloat(t.amount);
    });
    const labels = Object.keys(dataByCategory);
    const data = Object.values(dataByCategory);

    const wrapper = dom.expensesChartWrapper;
    wrapper.innerHTML = '';
    if (labels.length === 0) {
        wrapper.innerHTML = `
            <div class="flex flex-col items-center justify-center h-72 text-gray-400">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="mb-2 animate-pulse">
                    <ellipse cx="32" cy="54" rx="20" ry="6" fill="#e0e7ef"/>
                    <rect x="16" y="28" width="32" height="18" rx="9" fill="#f3f4f6" stroke="#cbd5e1" stroke-width="2"/>
                    <rect x="22" y="18" width="20" height="14" rx="7" fill="#f3f4f6" stroke="#cbd5e1" stroke-width="2"/>
                    <path d="M32 18c0-4 8-4 8 0" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
                    <path d="M32 14c0-2 4-2 4 0" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span class="text-base font-medium">Aún no se han registrado gastos</span>
            </div>
        `;
        return;
    }
    const ctx = document.createElement('canvas');
    wrapper.appendChild(ctx);
    expensesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    '#fbbf24', '#f472b6', '#60a5fa', '#a7f3d0', '#fca5a5', '#fcd34d', '#a5b4fc', '#f9a8d4', '#fdba74', '#6ee7b7'
                ],
                borderWidth: 3,
                borderColor: '#fff',
                hoverOffset: 8
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        boxWidth: 18,
                        boxHeight: 18,
                        borderRadius: 6,
                        padding: 18,
                        font: { size: 15, weight: '500', family: 'Inter' },
                        color: '#334155'
                    }
                },
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#334155',
                    bodyColor: '#334155',
                    borderColor: '#e5e7eb',
                    borderWidth: 1,
                    bodyFont: { family: 'Inter', size: 15 },
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) label += formatCurrency(context.parsed);
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function renderIncomesChart(transactions) {
    if (incomeChart) incomeChart.destroy();
    const incomes = transactions.filter(t => t.type === 'income');
    const dataByCategory = {};
    incomes.forEach(t => {
        const cat = t.category_name || 'Sin categoría';
        dataByCategory[cat] = (dataByCategory[cat] || 0) + parseFloat(t.amount);
    });
    const labels = Object.keys(dataByCategory);
    const data = Object.values(dataByCategory);

    const wrapper = dom.incomeChartWrapper;
    wrapper.innerHTML = '';
    if (labels.length === 0) {
        wrapper.innerHTML = `
            <div class="flex flex-col items-center justify-center h-72 text-gray-400">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="mb-2 animate-pulse">
                    <ellipse cx="32" cy="54" rx="20" ry="6" fill="#e0e7ef"/>
                    <rect x="16" y="28" width="32" height="18" rx="9" fill="#f3f4f6" stroke="#cbd5e1" stroke-width="2"/>
                    <rect x="22" y="18" width="20" height="14" rx="7" fill="#f3f4f6" stroke="#cbd5e1" stroke-width="2"/>
                    <path d="M32 18c0-4 8-4 8 0" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
                    <path d="M32 14c0-2 4-2 4 0" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span class="text-base font-medium">Aún no se han registrado ingresos</span>
            </div>
        `;
        return;
    }
    const ctx = document.createElement('canvas');
    wrapper.appendChild(ctx);
    incomeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    '#34d399', '#60a5fa', '#a7f3d0', '#fbbf24', '#f472b6', '#fcd34d', '#a5b4fc', '#f9a8d4', '#fdba74', '#6ee7b7'
                ],
                borderWidth: 3,
                borderColor: '#fff',
                hoverOffset: 8
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        boxWidth: 18,
                        boxHeight: 18,
                        borderRadius: 6,
                        padding: 18,
                        font: { size: 15, weight: '500', family: 'Inter' },
                        color: '#334155'
                    }
                },
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#334155',
                    bodyColor: '#334155',
                    borderColor: '#e5e7eb',
                    borderWidth: 1,
                    bodyFont: { family: 'Inter', size: 15 },
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) label += formatCurrency(context.parsed);
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function populateYearSelector() {
    const startYear = 2025;
    const endYear = 2030;
    dom.yearSelector.innerHTML = '';
    for (let y = startYear; y <= endYear; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        if (y === currentYear) option.selected = true;
        dom.yearSelector.appendChild(option);
    }
}

function handleYearChange() {
    currentYear = parseInt(dom.yearSelector.value, 10);
    currentMonth = new Date(currentYear, 0, 1);
    dom.currentMonthDisplay.textContent = displayMonth(currentMonth);
    fetchDataForCurrentMonth();
}

async function handleDeleteTransaction(id) {
    if (!confirm('¿Seguro que deseas eliminar esta transacción?')) return;
    try {
        const response = await fetchWithAuth(`/api/transactions/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('No se pudo eliminar');
        fetchDataForCurrentMonth();
    } catch (err) {
        alert('No se pudo eliminar la transacción');
    }
}

function openEditTransactionModal(id, description, comments) {
    const html = `
    <div id="edit-modal-bg" style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:1rem;">
        <div id="edit-modal-content" class="w-full max-w-md bg-white rounded-2xl shadow-xl relative overflow-hidden">
            <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <h3 class="font-bold text-xl">Editar Transacción</h3>
                <p class="text-blue-100 text-sm mt-1">Modifica la descripción o comentarios</p>
            </div>
            <div class="p-6">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Descripción:</label>
                    <input type="text" id="edit-description" value="${description || ''}" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="Descripción de la transacción">
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Comentarios:</label>
                    <textarea id="edit-comments" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[80px] resize-vertical" placeholder="Comentarios (opcional)">${comments || ''}</textarea>
                </div>
                <div id="edit-modal-message" class="text-sm min-h-[1.5em] px-3 py-2 rounded-lg mb-4"></div>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 p-6 bg-gray-50 border-t border-gray-200">
                <button id="edit-cancel" class="w-full sm:w-auto px-6 py-3 rounded-lg bg-gray-300 text-gray-700 font-semibold hover:bg-gray-400 transition-colors">Cancelar</button>
                <button id="edit-save" class="w-full sm:w-auto px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">Guardar</button>
            </div>
            <button id="edit-close" class="absolute top-4 right-4 text-2xl text-white hover:text-gray-200 font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">&times;</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const bg = document.getElementById('edit-modal-bg');
    const content = document.getElementById('edit-modal-content');
    function close() {
        bg.remove();
        document.removeEventListener('keydown', escListener);
    }
    function showMessage(msg, type) {
        const el = document.getElementById('edit-modal-message');
        if (!el) return;
        el.textContent = msg;
        if (type === 'error') {
            el.style.color = '#dc2626';
            el.style.background = '#fef2f2';
        } else if (type === 'success') {
            el.style.color = '#16a34a';
            el.style.background = '#f0fdf4';
        } else {
            el.style.color = '#64748b';
            el.style.background = '#f8fafc';
        }
    }
    document.getElementById('edit-close').onclick = close;
    document.getElementById('edit-cancel').onclick = close;
    document.getElementById('edit-save').onclick = async () => {
        const newDesc = document.getElementById('edit-description').value.trim();
        const newComments = document.getElementById('edit-comments').value.trim();
        if (!newDesc) {
            showMessage('La descripción es obligatoria', 'error');
            return;
        }
        showMessage('Guardando cambios...', 'info');
        document.getElementById('edit-save').disabled = true;
        await handleEditTransaction(id, newDesc, newComments);
        showMessage('¡Transacción actualizada!', 'success');
        setTimeout(() => { close(); }, 1000);
    };
    // Cierre con click fuera
    bg.onclick = (e) => { if (e.target === bg) close(); };
    // Cierre con ESC
    function escListener(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', escListener);
    // Enfocar input al abrir
    setTimeout(() => {
        const input = document.getElementById('edit-description');
        if (input) input.focus();
    }, 100);
}

async function handleEditTransaction(id, description, comments) {
    try {
        const response = await fetchWithAuth(`/api/transactions/${id}/details`, {
            method: 'PATCH',
            body: JSON.stringify({ description, comments })
        });
        if (!response.ok) throw new Error('No se pudo editar');
        fetchDataForCurrentMonth();
    } catch (err) {
        alert('No se pudo editar la transacción');
    }
}

function openReassignModal(id, description, categoryId) {
    let options = categories.map(cat => `<option value="${cat.id}" ${cat.id == categoryId ? 'selected' : ''}>${cat.name}</option>`).join('');
    const html = `
    <div id="reassign-modal-bg" style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:1rem;">
        <div id="reassign-modal-content" class="w-full max-w-md bg-white rounded-2xl shadow-xl relative overflow-hidden">
            <div class="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                <h3 class="font-bold text-xl">Reasignar Categoría</h3>
                <p class="text-purple-100 text-sm mt-1">Cambia la categoría de esta transacción</p>
            </div>
            <div class="p-6">
                <div class="mb-4">
                    <p class="text-gray-600 text-sm mb-2">Transacción:</p>
                    <p class="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">${description}</p>
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nueva categoría:</label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">🏷️</span>
                        <select id="reassign-category" class="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white">
                            ${options}
                        </select>
                    </div>
                </div>
                <div id="reassign-modal-message" class="text-sm min-h-[1.5em] px-3 py-2 rounded-lg mb-4"></div>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 p-6 bg-gray-50 border-t border-gray-200">
                <button id="reassign-cancel" class="w-full sm:w-auto px-6 py-3 rounded-lg bg-gray-300 text-gray-700 font-semibold hover:bg-gray-400 transition-colors">Cancelar</button>
                <button id="reassign-save" class="w-full sm:w-auto px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors">Guardar cambios</button>
            </div>
            <button id="reassign-close" class="absolute top-4 right-4 text-2xl text-white hover:text-gray-200 font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">&times;</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    
    const bg = document.getElementById('reassign-modal-bg');
    const content = document.getElementById('reassign-modal-content');
    
    function close() {
        bg.remove();
        document.removeEventListener('keydown', escListener);
    }
    
    function showMessage(msg, type) {
        const messageEl = document.getElementById('reassign-modal-message');
        if (!messageEl) return;
        messageEl.textContent = msg;
        if (type === 'error') {
            messageEl.style.color = '#dc2626';
            messageEl.style.background = '#fef2f2';
        } else if (type === 'success') {
            messageEl.style.color = '#16a34a';
            messageEl.style.background = '#f0fdf4';
        } else {
            messageEl.style.color = '#64748b';
            messageEl.style.background = '#f8fafc';
        }
    }
    
    document.getElementById('reassign-close').onclick = close;
    document.getElementById('reassign-cancel').onclick = close;
    document.getElementById('reassign-save').onclick = async () => {
        const newCat = document.getElementById('reassign-category').value;
        if (!newCat) {
            showMessage('Por favor selecciona una categoría', 'error');
            return;
        }
        
        showMessage('Reasignando categoría...', 'info');
        document.getElementById('reassign-save').disabled = true;
        
        try {
            await handleReassignCategory(id, newCat);
            showMessage('¡Categoría reasignada exitosamente!', 'success');
            setTimeout(() => {
                close();
            }, 1000);
        } catch (err) {
            showMessage('Error al reasignar la categoría', 'error');
            document.getElementById('reassign-save').disabled = false;
        }
    };
    
    // Cierre con click fuera
    bg.onclick = (e) => { if (e.target === bg) close(); };
    
    // Cierre con ESC
    function escListener(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', escListener);
    
    // Enfocar select al abrir
    setTimeout(() => {
        const select = document.getElementById('reassign-category');
        if (select) select.focus();
    }, 100);
}

async function handleReassignCategory(id, categoryId) {
    try {
        const response = await fetchWithAuth(`/api/transactions/${id}/category`, {
            method: 'PATCH',
            body: JSON.stringify({ categoryId })
        });
        if (!response.ok) throw new Error('No se pudo reasignar');
        fetchDataForCurrentMonth();
    } catch (err) {
        alert('No se pudo reasignar la categoría');
    }
}

function openCategoryModal() {
    const modalContainer = document.getElementById('category-modal');
    if (!modalContainer) return;
    modalContainer.innerHTML = `
      <div id="category-modal-bg" style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:1rem;">
        <div id="category-modal-content" class="w-full max-w-md bg-white rounded-2xl shadow-xl relative overflow-hidden">
          <div class="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
            <h2 class="text-xl font-bold">Gestionar Categorías</h2>
            <p class="text-green-100 text-sm mt-1">Agrega o elimina categorías para organizar tus transacciones</p>
          </div>
          <div class="p-6">
            <div id="category-list-container" class="mb-6 max-h-60 overflow-y-auto custom-scrollbar border border-gray-200 rounded-lg p-3 bg-gray-50"></div>
            <form id="add-category-form" class="flex gap-3 mb-4">
              <div class="flex-1 relative">
                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">📁</span>
                <input id="add-category-input" type="text" class="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Nueva categoría" required autocomplete="off" />
              </div>
              <button type="submit" class="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors whitespace-nowrap">Agregar</button>
            </form>
            <div id="category-modal-message" class="text-sm min-h-[1.5em] px-3 py-2 rounded-lg"></div>
          </div>
          <button id="close-category-modal" class="absolute top-4 right-4 text-2xl text-white hover:text-gray-200 font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">&times;</button>
        </div>
      </div>`;
    modalContainer.style.opacity = '1';
    modalContainer.style.pointerEvents = 'auto';

    // Cerrar modal
    document.getElementById('close-category-modal').onclick = closeCategoryModal;
    // Cierre con click fuera
    document.getElementById('category-modal-bg').onclick = (e) => {
      if (e.target === document.getElementById('category-modal-bg')) closeCategoryModal();
    };
    document.addEventListener('keydown', escCloseCategoryModal);

    // Enfocar input al abrir
    setTimeout(() => {
      const input = document.getElementById('add-category-input');
      if (input) input.focus();
    }, 100);

    // Cargar y renderizar categorías
    renderCategoryList();

    // Agregar nueva categoría
    document.getElementById('add-category-form').onsubmit = async (e) => {
      e.preventDefault();
      const input = document.getElementById('add-category-input');
      const msg = document.getElementById('category-modal-message');
      let name = input.value.trim();
      if (!name) {
        showCategoryModalMessage('El nombre no puede estar vacío.', 'error');
        return;
      }
      // Validar unicidad (case-insensitive)
      const { data: existing, error: fetchErr } = await supabase.from('categories').select('name').eq('profile_id', currentUserProfile.id);
      if (fetchErr) {
        showCategoryModalMessage('Error de red. Intenta de nuevo.', 'error');
        return;
      }
      if (existing.some(cat => cat.name.trim().toLowerCase() === name.toLowerCase())) {
        showCategoryModalMessage('Ya existe una categoría con ese nombre.', 'error');
        return;
      }
      showCategoryModalMessage('Agregando categoría...', 'info');
      input.disabled = true;
      try {
        const { error } = await supabase.from('categories').insert([{ name, profile_id: currentUserProfile.id }]);
        if (error) throw error;
        input.value = '';
        showCategoryModalMessage('¡Categoría agregada exitosamente!', 'success');
        await fetchCategories();
        await renderCategoryList();
      } catch (err) {
        showCategoryModalMessage('No se pudo agregar la categoría.', 'error');
      } finally {
        input.disabled = false;
        input.focus();
      }
    };
}

function closeCategoryModal() {
    const modalContainer = document.getElementById('category-modal');
    if (modalContainer) {
      modalContainer.innerHTML = '';
      modalContainer.style.opacity = '0';
      modalContainer.style.pointerEvents = 'none';
    }
    document.removeEventListener('keydown', escCloseCategoryModal);
}
function escCloseCategoryModal(e) {
    if (e.key === 'Escape') closeCategoryModal();
}

function showCategoryModalMessage(msg, type) {
    const el = document.getElementById('category-modal-message');
    if (!el) return;
    el.textContent = msg;
    if (type === 'error') {
        el.style.color = '#dc2626';
        el.style.background = '#fef2f2';
    } else if (type === 'success') {
        el.style.color = '#16a34a';
        el.style.background = '#f0fdf4';
    } else {
        el.style.color = '#64748b';
        el.style.background = '#f8fafc';
    }
}

async function renderCategoryList() {
    const container = document.getElementById('category-list-container');
    if (!container) return;
    container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Cargando categorías...</p>';
    const { data, error } = await supabase.from('categories').select('*').eq('profile_id', currentUserProfile.id).order('name', { ascending: true });
    if (error) {
      container.innerHTML = '<p class="text-red-500 text-center py-4">Error al cargar categorías</p>';
      return;
    }
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">No hay categorías registradas.</p>';
      return;
    }
    container.innerHTML = '';
    data.forEach(cat => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between py-3 px-4 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-gray-200 group';
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <span class="text-green-600 text-sm font-medium">${cat.name.charAt(0).toUpperCase()}</span>
          </div>
          <span class="text-gray-800 font-medium">${cat.name}</span>
        </div>
        <button class="delete-category-btn p-2 rounded-lg hover:bg-red-50 transition-colors" title="Eliminar categoría" data-id="${cat.id}">
          <svg class="w-5 h-5 text-red-400 hover:text-red-600 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>
      `;
      const btnDel = row.querySelector('.delete-category-btn');
      btnDel.onclick = async () => {
        if (confirm(`¿Eliminar la categoría "${cat.name}"?\n\nEsta acción no se puede deshacer.`)) {
          const { error } = await supabase.from('categories').delete().eq('id', cat.id).eq('profile_id', currentUserProfile.id);
          if (error) {
            showCategoryModalMessage('No se pudo eliminar la categoría: ' + error.message, 'error');
            return;
          }
          await fetchCategories();
          renderCategoryList();
          showCategoryModalMessage('Categoría eliminada exitosamente', 'success');
        }
      };
      container.appendChild(row);
    });
}

function openAnnualBudgetsModal() {
    // Cierre modal
    function close() {
        const modal = document.getElementById('annual-budgets-modal-bg');
        if (modal) modal.remove();
        document.removeEventListener('keydown', escListener);
    }
    function escListener(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', escListener);

    // Meses en español
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const year = currentYear;
    let budgets = Array(12).fill(0);
    let loading = true;

    // Renderiza el modal
    function render(budgets, msg = '', msgType = '') {
        const html = `
        <div id="annual-budgets-modal-bg" style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:1rem;">
            <div id="annual-budgets-modal-content" class="w-full max-w-md sm:max-w-2xl bg-white rounded-2xl shadow-xl relative overflow-hidden" style="max-height:90vh;">
                <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                    <h3 class="font-bold text-xl sm:text-2xl">Presupuestos del año ${year}</h3>
                    <p class="text-blue-100 text-sm mt-1">Edita los montos mensuales</p>
                </div>
                <div class="p-6 overflow-y-auto" style="max-height:calc(90vh - 120px);">
                    <form id="annual-budgets-form">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            ${meses.map((mes, i) => `
                                <label class="flex flex-col">
                                    <span class="mb-2 font-medium text-gray-700 text-sm">${mes}</span>
                                    <div class="relative">
                                        <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">$</span>
                                        <input type="number" min="0" step="1" name="budget-${i+1}" value="${budgets[i] || ''}" 
                                               class="w-full pl-8 pr-3 py-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                               placeholder="0" required />
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                        <div id="annual-budgets-modal-message" class="mt-4 text-sm min-h-[1.5em] px-3 py-2 rounded-lg" 
                             style="color:${msgType==='error'?'#dc2626':msgType==='success'?'#16a34a':'#64748b'};background:${msgType==='error'?'#fef2f2':msgType==='success'?'#f0fdf4':'#f8fafc'};">${msg}</div>
                    </form>
                </div>
                <div class="flex flex-col sm:flex-row gap-3 p-6 bg-gray-50 border-t border-gray-200">
                    <button type="button" id="annual-budgets-cancel" class="w-full sm:w-auto px-6 py-3 rounded-lg bg-gray-300 text-gray-700 font-semibold hover:bg-gray-400 transition-colors">Cancelar</button>
                    <button type="submit" form="annual-budgets-form" class="w-full sm:w-auto px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">Guardar cambios</button>
                </div>
                <button id="annual-budgets-close" class="absolute top-4 right-4 text-2xl text-white hover:text-gray-200 font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">&times;</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        document.getElementById('annual-budgets-close').onclick = close;
        document.getElementById('annual-budgets-cancel').onclick = close;
        document.getElementById('annual-budgets-modal-bg').onclick = (e) => { if (e.target === document.getElementById('annual-budgets-modal-bg')) close(); };
        document.getElementById('annual-budgets-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const newBudgets = Array.from({length:12}, (_,i) => parseFloat(form[`budget-${i+1}`].value) || 0);
            const messageEl = document.getElementById('annual-budgets-modal-message');
            messageEl.textContent = 'Guardando presupuestos...';
            messageEl.style.color = '#64748b';
            messageEl.style.background = '#f8fafc';
            // Guardar cada presupuesto mensual
            try {
                for (let i = 0; i < 12; i++) {
                    const monthId = `${year}-${String(i+1).padStart(2,'0')}`;
                    const response = await fetchWithAuth('/api/budget', {
                        method: 'POST',
                        body: JSON.stringify({ monthId, amount: newBudgets[i] })
                    });
                    if (!response.ok) throw new Error('Error al guardar presupuesto');
                }
                messageEl.textContent = '¡Presupuestos guardados exitosamente!';
                messageEl.style.color = '#16a34a';
                messageEl.style.background = '#f0fdf4';
                setTimeout(() => { close(); fetchAnnualData(); }, 1000);
            } catch (err) {
                messageEl.textContent = 'Error al guardar. Intenta de nuevo.';
                messageEl.style.color = '#dc2626';
                messageEl.style.background = '#fef2f2';
            }
        };
    }

    // Cargar presupuestos actuales
    (async () => {
        try {
            const response = await fetchWithAuth(`/api/annual-summary/${year}`);
            if (!response.ok) throw new Error('Error al cargar presupuestos');
            const data = await response.json();
            budgets = data.map(m => m.budget || 0);
        } catch (err) {
            // Si falla, deja budgets en 0
        }
        render(budgets);
    })();
}

function renderAnnualChart() {
    if (!dom.annualChartCanvas) {
        console.warn('No se encontró el canvas annual-chart');
        return;
    }
    if (!annualData || annualData.length === 0) {
        console.warn('annualData vacío o no definido', annualData);
        return;
    }
    console.log('Renderizando gráfico anual con datos:', annualData);
    if (annualChart) annualChart.destroy();
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const gastos = annualData.map(m => m.totalExpenses || 0);
    const presupuestos = annualData.map(m => m.budget || 0);
    console.log('Gastos:', gastos);
    console.log('Presupuestos:', presupuestos);
    const ctx = dom.annualChartCanvas.getContext('2d');
    annualChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Gasto real',
                    data: gastos,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)', // Rojo más suave
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1,
                    borderRadius: 8,
                    maxBarThickness: 28,
                    borderSkipped: false
                },
                {
                    label: 'Presupuesto',
                    data: presupuestos,
                    type: 'line',
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    pointRadius: 6,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 13,
                            weight: '500'
                        }
                    }
                },
                tooltip: { 
                    mode: 'index', 
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            interaction: { 
                mode: 'nearest', 
                axis: 'x', 
                intersect: false 
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#6b7280'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: { 
                        display: true, 
                        text: 'Monto ($)',
                        font: {
                            size: 13,
                            weight: '500'
                        },
                        color: '#6b7280'
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        color: '#6b7280',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            },
            elements: {
                point: {
                    hoverRadius: 8,
                    hoverBorderWidth: 3
                }
            }
        }
    });
    // Mostrar la vista anual y ocultar el loading
    dom.loadingIndicator.style.display = 'none';
    dom.annualView.classList.remove('hidden');
}

async function openProfileModal() {
    const user = currentUserProfile;
    const html = `
    <div id="profile-modal-bg" style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:1rem;">
        <div id="profile-modal-content" class="w-full max-w-md bg-white rounded-2xl shadow-xl relative overflow-hidden">
            <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <h3 class="font-bold text-xl">Editar Perfil</h3>
                <p class="text-blue-100 text-sm mt-1">Actualiza tu información personal</p>
            </div>
            <div class="p-6">
                <form id="profile-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input type="text" id="profile-first-name" value="${user.first_name || ''}" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" required />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                        <input type="text" id="profile-last-name" value="${user.last_name || ''}" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" required />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                        <input type="email" value="${user.email || ''}" class="w-full px-4 py-3 border border-gray-100 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed" readonly />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña <span class="text-gray-400">(opcional)</span></label>
                        <input type="password" id="profile-password" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
                        <input type="password" id="profile-password-confirm" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="Repite la nueva contraseña" autocomplete="new-password" />
                    </div>
                    <div id="profile-modal-message" class="text-sm min-h-[1.5em] px-3 py-2 rounded-lg mb-2"></div>
                </form>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 p-6 bg-gray-50 border-t border-gray-200">
                <button id="profile-cancel" class="w-full sm:w-auto px-6 py-3 rounded-lg bg-gray-300 text-gray-700 font-semibold hover:bg-gray-400 transition-colors">Cancelar</button>
                <button id="profile-save" class="w-full sm:w-auto px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">Guardar cambios</button>
            </div>
            <button id="profile-close" class="absolute top-4 right-4 text-2xl text-white hover:text-gray-200 font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">&times;</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const bg = document.getElementById('profile-modal-bg');
    function close() {
        bg.remove();
        document.removeEventListener('keydown', escListener);
    }
    function showMessage(msg, type) {
        const el = document.getElementById('profile-modal-message');
        if (!el) return;
        el.textContent = msg;
        if (type === 'error') {
            el.style.color = '#dc2626';
            el.style.background = '#fef2f2';
        } else if (type === 'success') {
            el.style.color = '#16a34a';
            el.style.background = '#f0fdf4';
        } else {
            el.style.color = '#64748b';
            el.style.background = '#f8fafc';
        }
    }
    document.getElementById('profile-close').onclick = close;
    document.getElementById('profile-cancel').onclick = close;
    bg.onclick = (e) => { if (e.target === bg) close(); };
    function escListener(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', escListener);
    setTimeout(() => {
        const input = document.getElementById('profile-first-name');
        if (input) input.focus();
    }, 100);
    document.getElementById('profile-save').onclick = async () => {
        const firstName = document.getElementById('profile-first-name').value.trim();
        const lastName = document.getElementById('profile-last-name').value.trim();
        const password = document.getElementById('profile-password').value;
        const password2 = document.getElementById('profile-password-confirm').value;
        if (!firstName || !lastName) {
            showMessage('Nombre y apellido son obligatorios', 'error');
            return;
        }
        if (password || password2) {
            if (password.length < 6) {
                showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }
            if (password !== password2) {
                showMessage('Las contraseñas no coinciden', 'error');
                return;
            }
        }
        showMessage('Guardando cambios...', 'info');
        document.getElementById('profile-save').disabled = true;
        try {
            // Actualizar nombre y apellido en Supabase
            let { error: updateError } = await supabase.from('profiles').update({ first_name: firstName, last_name: lastName }).eq('id', user.id);
            if (updateError) throw updateError;
            // Actualizar metadata de usuario
            await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName } });
            // Cambiar contraseña si corresponde
            if (password) {
                const { error: passError } = await supabase.auth.updateUser({ password });
                if (passError) throw passError;
            }
            // Actualizar avatar instantáneamente
            currentUserProfile.first_name = firstName;
            currentUserProfile.last_name = lastName;
            let avatar = '';
            if (firstName && firstName.charAt(0)) avatar += firstName.charAt(0);
            if (lastName && lastName.charAt(0)) avatar += lastName.charAt(0);
            if (!avatar && user.email) avatar = user.email.charAt(0).toUpperCase();
            if (!avatar) avatar = 'U';
            dom.userAvatar.textContent = avatar.toUpperCase();
            showMessage('¡Perfil actualizado!', 'success');
            setTimeout(() => { close(); }, 1200);
        } catch (err) {
            showMessage('Error al guardar: ' + (err.message || err), 'error');
            document.getElementById('profile-save').disabled = false;
        }
    };
}

// Invalida caché cuando se agrega/elimina categoría
async function addCategory(name) {
    categoriesCache = null;
    // ... lógica de inserción ...
}
async function deleteCategory(id) {
    categoriesCache = null;
    // ... lógica de eliminación ...
}
