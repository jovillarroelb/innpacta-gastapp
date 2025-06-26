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
        renderUsersTable(data.users || []);
        renderDefaultCategoriesTable(data.categories || []);
    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

function renderUsersTable(users) {
    const usersBody = document.getElementById('users-table-body');
    if (!usersBody) return;
    usersBody.innerHTML = '';
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${user.first_name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${user.last_name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">${user.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                <select data-user-id="${user.id}" class="role-select border rounded px-2 py-1" disabled>
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>user</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
                </select>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${new Date(user.created_at).toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 flex gap-2">
                <button class="reset-password-btn bg-yellow-500 text-white px-3 py-1 rounded" data-user-id="${user.id}">Resetear Contraseña</button>
                <button class="delete-user-btn bg-red-500 text-white px-3 py-1 rounded" data-user-id="${user.id}">Eliminar</button>
            </td>
        `;
        usersBody.appendChild(tr);
    });
}

// Listener único para acciones de usuario
setupUsersTableListener = function() {
    const usersBody = document.getElementById('users-table-body');
    if (!usersBody) return;
    if (usersBody._listenerAdded) return;
    usersBody._listenerAdded = true;
    usersBody.addEventListener('click', async (e) => {
        const userId = e.target.getAttribute('data-user-id');
        if (e.target.classList.contains('reset-password-btn')) {
            e.target.disabled = true;
            try {
                const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
                    method: 'POST',
                    headers: { ...authHeaders, 'Content-Type': 'application/json' }
                });
                if (!res.ok) throw new Error('Error al resetear contraseña');
                const { newPassword } = await res.json();
                // Mostrar la nueva contraseña en pantalla (alert o modal simple)
                alert('Nueva contraseña generada para el usuario:\n\n' + newPassword + '\n\nCópiala y compártela con el usuario.');
                try { await navigator.clipboard.writeText(newPassword); } catch {}
                showNotification('Contraseña reseteada y copiada al portapapeles', 'success');
            } catch (err) {
                showNotification('Error al resetear contraseña', 'error');
            } finally {
                e.target.disabled = false;
            }
        }
        if (e.target.classList.contains('delete-user-btn')) {
            if (!confirm('¿Seguro que deseas eliminar este usuario? Esta acción es irreversible.')) return;
            e.target.disabled = true;
            try {
                const res = await fetch(`/api/admin/users/${userId}`, {
                    method: 'DELETE',
                    headers: authHeaders
                });
                if (!res.ok) throw new Error('Error al eliminar usuario');
                showNotification('Usuario eliminado', 'success');
                // Refrescar tabla tras eliminar
                fetchAllAdminData();
            } catch (err) {
                showNotification('Error al eliminar usuario', 'error');
            }
        }
    });
}

// Renderizar tabla de categorías por defecto
function renderDefaultCategoriesTable(categories) {
    const catBody = document.getElementById('default-categories-table-body');
    if (!catBody) return;
    catBody.innerHTML = '';
    categories.forEach(cat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${cat.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${cat.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">(próximas acciones)</td>
        `;
        catBody.appendChild(tr);
    });
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
