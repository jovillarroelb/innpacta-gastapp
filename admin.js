document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar footer
    await initializeFooter();
    
    const isAuthenticated = sessionStorage.getItem('isAdminAuthenticated');
    
    if (isAuthenticated !== 'true') {
        window.location.href = '/index.html';
        return;
    }

    document.getElementById('admin-container').style.display = 'block';
    
    // const logoutBtn = document.getElementById('logout-btn');
    const backToAppBtn = document.getElementById('back-to-app-btn');
    
    // if (logoutBtn) {
    //     logoutBtn.addEventListener('click', () => {
    //         sessionStorage.removeItem('isAdminAuthenticated');
    //         window.location.href = '/index.html';
    //     });
    // }

    if (backToAppBtn) {
        backToAppBtn.addEventListener('click', () => {
            sessionStorage.removeItem('isAdminAuthenticated');
            window.location.replace('/index.html');
        });
    }
    
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
    if (sessionStorage.getItem('isAdminAuthenticated') !== 'true') return;
    const token = localStorage.getItem('jwt_token');
    if (!token) return;
    try {
        const response = await fetch(`${API_BASE_URL}/admin/all-data`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) {
            throw new Error(`Error ${response.status} al cargar los datos del mantenedor.`);
        }
        const data = await response.json();
        renderUsersTable(data.users || []);
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
    setupUsersTableListener();
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
                // Mostrar la nueva contraseña en modal custom
                showPasswordModal(newPassword);
                try { await navigator.clipboard.writeText(newPassword); } catch {}
                showNotification('Contraseña reseteada y copiada al portapapeles', 'success');
            } catch (err) {
                showNotification('Error al resetear contraseña', 'error');
            } finally {
                e.target.disabled = false;
            }
        }
        if (e.target.classList.contains('delete-user-btn')) {
            // Modal de confirmación custom
            showConfirmModal({
                title: 'Eliminar usuario',
                message: '¿Seguro que deseas eliminar este usuario? Esta acción es irreversible.',
                onConfirm: async () => {
                    e.target.disabled = true;
                    try {
                        const res = await fetch(`/api/admin/users/${userId}`, {
                            method: 'DELETE',
                            headers: authHeaders
                        });
                        if (!res.ok) throw new Error('Error al eliminar usuario');
                        showNotification('Usuario eliminado', 'success');
                        fetchAllAdminData();
                    } catch (err) {
                        showNotification('Error al eliminar usuario', 'error');
                    } finally {
                        e.target.disabled = false;
                    }
                }
            });
            return;
        }
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

// Modal custom para mostrar nueva contraseña
function showPasswordModal(password) {
    const modal = document.getElementById('password-modal');
    const input = document.getElementById('password-modal-input');
    const copyBtn = document.getElementById('password-modal-copy');
    const closeBtn = document.getElementById('password-modal-close');
    input.value = password;
    modal.classList.remove('hidden');
    // Selecciona el texto automáticamente
    input.select();
    // Copiar al portapapeles
    copyBtn.onclick = () => {
        input.select();
        document.execCommand('copy');
        copyBtn.textContent = '¡Copiado!';
        setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1500);
    };
    // Cerrar modal
    closeBtn.onclick = () => {
        modal.classList.add('hidden');
    };
    // Cerrar con Escape
    modal.onkeydown = (e) => {
        if (e.key === 'Escape') {
            modal.classList.add('hidden');
        }
    };
    // Permitir cerrar haciendo click fuera del modal
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    };
}
