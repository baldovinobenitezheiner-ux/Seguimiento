/* ==========================================================================
   Autenticación y Control de Accesos
   Archivo: js/autenticacion-usuarios.js
   Descripción: Gestión de inicio de sesión, creación de usuario inicial,
                hashing seguro de contraseñas (SHA-256), roles y cierre de sesión.
   ========================================================================== */

/**
 * Genera el hash criptográfico SHA-256 de una contraseña
 * @param {string} pw Contraseña en texto plano
 * @returns {Promise<string>} Cadena hexadecimal del hash
 */
async function hashPassword(pw) {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Carga la lista de usuarios desde el almacenamiento persistente
 */
async function loadUsers() {
  try {
    const res = await window.storage.get(USERS_KEY, true);
    users = (res && res.value) ? JSON.parse(res.value) : [];
  } catch (e) {
    users = [];
  }
}

/**
 * Guarda la lista de usuarios en el almacenamiento persistente
 */
async function saveUsers() {
  try {
    await window.storage.set(USERS_KEY, JSON.stringify(users), true);
  } catch (e) {
    console.error('No se pudo guardar usuarios', e);
  }
}

/**
 * Muestra el formulario de inicio de sesión
 */
function showLoginForm() {
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('signup-section').style.display = 'none';
  document.getElementById('login-error').style.display = 'none';
}

/**
 * Muestra el formulario para crear el primer administrador
 */
function showSignupForm() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('signup-section').style.display = 'block';
  document.getElementById('signup-error').style.display = 'none';
}

/**
 * Selecciona aleatoriamente una imagen de fondo para la pantalla de login
 */
function setRandomLoginBackground() {
  const current = document.getElementById('login-overlay');
  if (!current) return;
  const index = Math.floor(Math.random() * LOGIN_BACKGROUNDS.length);
  current.style.setProperty('--login-bg-image', LOGIN_BACKGROUNDS[index]);
}

/**
 * Inicializa el flujo de autenticación al arrancar la aplicación
 */
async function initAuth() {
  setRandomLoginBackground();
  await loadUsers();
  if (users.length === 0) {
    showSignupForm();
  } else {
    showLoginForm();
  }
}

/**
 * Ejecuta las acciones posteriores a un login exitoso
 */
function onLoginSuccess() {
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('app-content').style.display = 'block';
  document.getElementById('logged-user-label').textContent = currentUser + ' · ' + (ROLE_LABELS[currentRole] || '');
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('signup-user').value = '';
  document.getElementById('signup-pass').value = '';
  document.getElementById('signup-pass2').value = '';
  applyPermissions();
  if (typeof mostrarToast === 'function') {
    mostrarToast('Bienvenido al sistema', `Sesión iniciada como ${currentUser} (${ROLE_LABELS[currentRole] || currentRole})`, 'success');
  }
  if (typeof loadData === 'function') {
    loadData();
  }
}

/**
 * Aplica los permisos en la interfaz según el rol del usuario actual
 */
function applyPermissions() {
  const canEdit = currentRole === 'admin' || currentRole === 'editor';
  const btnToggleForm = document.getElementById('btn-toggle-form');
  const btnBulkUpload = document.getElementById('btn-bulk-upload');
  const adminMenuWrap = document.getElementById('admin-menu-wrap');

  if (btnToggleForm) btnToggleForm.style.display = canEdit ? '' : 'none';
  if (btnBulkUpload) btnBulkUpload.style.display = canEdit ? '' : 'none';
  if (adminMenuWrap) adminMenuWrap.style.display = currentRole === 'admin' ? 'inline-block' : 'none';
}

// Listener para el botón de Iniciar Sesión
document.getElementById('btn-login')?.addEventListener('click', async () => {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');

  if (!u || !p) {
    errEl.textContent = 'Ingresa usuario y contraseña.';
    errEl.style.display = 'block';
    return;
  }

  const hash = await hashPassword(p);
  const match = users.find(us => us.username.toLowerCase() === u.toLowerCase() && us.hash === hash);
  if (!match) {
    errEl.textContent = 'Usuario o contraseña incorrectos.';
    errEl.style.display = 'block';
    return;
  }

  currentUser = match.username;
  currentRole = match.role;
  if (typeof logActivity === 'function') {
    await logActivity('login', 'Inicio de sesión');
  }
  onLoginSuccess();
});

// Listener para el botón de Crear Administrador Principal
document.getElementById('btn-signup')?.addEventListener('click', async () => {
  const u = document.getElementById('signup-user').value.trim();
  const p = document.getElementById('signup-pass').value;
  const p2 = document.getElementById('signup-pass2').value;
  const errEl = document.getElementById('signup-error');

  if (!u || !p || !p2) {
    errEl.textContent = 'Completa todos los campos.';
    errEl.style.display = 'block';
    return;
  }
  if (p.length < 4) {
    errEl.textContent = 'La contraseña debe tener al menos 4 caracteres.';
    errEl.style.display = 'block';
    return;
  }
  if (p !== p2) {
    errEl.textContent = 'Las contraseñas no coinciden.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  const hash = await hashPassword(p);
  users.push({ username: u, hash, role: 'admin' });
  await saveUsers();
  currentUser = u;
  currentRole = 'admin';
  if (typeof logActivity === 'function') {
    await logActivity('login', 'Inicio de sesión (creación de administrador)');
  }
  onLoginSuccess();
});

// Listener para cerrar sesión
document.getElementById('btn-logout')?.addEventListener('click', () => {
  currentUser = null;
  currentRole = null;
  document.getElementById('app-content').style.display = 'none';
  document.getElementById('admin-panel-overlay').style.display = 'none';
  document.getElementById('activity-log-overlay').style.display = 'none';
  document.getElementById('admin-dropdown').style.display = 'none';
  document.getElementById('login-overlay').style.display = 'flex';
  setRandomLoginBackground();
  showLoginForm();
  if (typeof mostrarToast === 'function') {
    mostrarToast('Sesión cerrada', 'Has salido del sistema de radicación.', 'info');
  }
});
