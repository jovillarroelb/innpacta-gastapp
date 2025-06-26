document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar footer
    await initializeFooter();
    
    const isAuthenticated = sessionStorage.getItem('isAdminAuthenticated');
    
    if (isAuthenticated !== 'true') {
        window.location.href = '/index.html';
        return;
    }

    document.getElementById('admin-container').style.display = 'block';
    
    const logoutBtn = document.getElementById('logout-btn');
    const backToAppBtn = document.getElementById('back-to-app-btn');
    
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('isAdminAuthenticated');
        window.location.href = '/index.html';
    });

    backToAppBtn.addEventListener('click', () => {
        window.location.href = '/index.html';
    });
    
    fetchAllAdminData();
});

const API_BASE_URL = '/api';

const formatCurrency = (amount) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount || 0);

// Función para inicializar el footer con información de versión
async function initializeFooter() {
    const versionElements = document.querySelectorAll('#app-version');
    const yearElements = document.querySelectorAll('#current-year');
    
    // Obtener versión dinámicamente desde la API
    let appVersion = '1.0.0'; // Versión por defecto
    try {
        const response = await fetch('/api/version');
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

const token = localStorage.getItem('jwt_token');
const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

async function fetchAllAdminData() {
    const loadingIndicator = document.getElementById('loading-indicator-admin');
    try {
        const response = await fetch(`${API_BASE_URL}/admin/all-data`, { headers: authHeaders });
        if (!response.ok) {
            throw new Error(`Error ${response.status} al cargar los datos del mantenedor.`);
        }
        const data = await response.json();
        renderTables(data);
    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

function renderTables(data) {
    const { transactions, budgets, categories } = data;

    const transactionsBody = document.getElementById('transactions-table-body');
    transactionsBody.innerHTML = '';
    if (transactions && transactions.length > 0) {
        transactions.forEach(t => {
            const row = transactionsBody.insertRow();
            row.className = 'hover:bg-slate-50 transition-colors';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${t._id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">${t.user_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${t.month_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${t.description}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${t.comments || ''}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">${formatCurrency(t.amount)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${t.type}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${t.category_name || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${new Date(t.date).toLocaleDateString('es-CL')}</td>
            `;
        });
    } else {
        transactionsBody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-slate-500">No hay transacciones registradas.</td></tr>';
    }

    const budgetsBody = document.getElementById('budgets-table-body');
    budgetsBody.innerHTML = '';
    if (budgets && budgets.length > 0) {
        budgets.forEach(b => {
            const row = budgetsBody.insertRow();
            row.className = 'hover:bg-slate-50 transition-colors';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">${b.user_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${b.month_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">${formatCurrency(b.amount)}</td>
            `;
        });
    } else {
        budgetsBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-slate-500">No hay presupuestos definidos.</td></tr>';
    }

    const categoriesBody = document.getElementById('categories-table-body');
    categoriesBody.innerHTML = '';
     if (categories && categories.length > 0) {
        categories.forEach(c => {
            const row = categoriesBody.insertRow();
            row.className = 'hover:bg-slate-50 transition-colors';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${c.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${c.name}</td>
            `;
        });
    } else {
        categoriesBody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-slate-500">No hay categorías.</td></tr>';
    }
}

// Ejemplo para un formulario:
const forms = document.querySelectorAll('form');
forms.forEach(form => {
  form.addEventListener('submit', e => e.preventDefault());
});

// Después de agregar/eliminar categoría o presupuesto:
function refreshCategoriesUI() {
  // Lógica para volver a renderizar el selector/lista de categorías
}
function refreshBudgetsUI() {
  // Lógica para volver a renderizar la lista de presupuestos
}

// Llama a estas funciones tras agregar/eliminar

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#users-table tbody');
    if (!tableBody) return;
    let currentUserId = null;

    // Obtener usuario actual (decodificando JWT)
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.sub;
        } catch {}
    }

    // Cargar usuarios
    fetch('/api/admin/users', {
        headers: authHeaders
    })
    .then(res => res.json())
    .then(users => {
        tableBody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.first_name}</td>
                <td>${user.last_name}</td>
                <td>${user.email}</td>
                <td>
                    <select ${user.id === currentUserId ? 'disabled' : ''} data-user-id="${user.id}">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>user</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
                    </select>
                </td>
                <td>${new Date(user.created_at).toLocaleString()}</td>
                <td>
                    <button ${user.id === currentUserId ? 'disabled' : ''} data-user-id="${user.id}" class="save-role-btn">Guardar</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    });

    // Delegar evento para guardar rol
    tableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('save-role-btn')) {
            const userId = e.target.getAttribute('data-user-id');
            const select = tableBody.querySelector(`select[data-user-id='${userId}']`);
            const newRole = select.value;
            if (!['user', 'admin'].includes(newRole)) return;
            e.target.disabled = true;
            await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            e.target.disabled = false;
        }
    });
});
