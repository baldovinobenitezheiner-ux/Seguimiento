/* ==========================================================================
   Administración y Gestión de Usuarios
   Archivo: js/administracion-usuarios.js
   Descripción: Gestión de altas, modificaciones, bajas de usuarios,
                asignación de roles y control del menú administrativo.
   ========================================================================== */

/**
 * Restablece el formulario de usuario a su estado inicial de creación
 */
function resetUserForm() {
  editingUsername = null;
  document.getElementById('admin-user-form-title').textContent = 'Agregar usuario';
  document.getElementById('new-user-username').value = '';
  document.getElementById('new-user-pass').value = '';
  document.getElementById('new-user-pass2').value = '';
  document.getElementById('new-user-pass').placeholder = 'Contraseña';
  document.getElementById('new-user-pass2').placeholder = 'Confirmar contraseña';
  document.getElementById('new-user-role').value = 'editor';
  document.getElementById('btn-add-user').textContent = 'Crear usuario';
  document.getElementById('btn-cancel-user-edit').style.display = 'none';
}

/**
 * Carga los datos de un usuario en el formulario para editarlo
 * @param {string} username Nombre del usuario a modificar
 */
function startUserEdit(username) {
  const user = users.find(item => item.username === username);
  if (!user) return;
  editingUsername = username;
  document.getElementById('admin-user-form-title').textContent = 'Editar usuario';
  document.getElementById('new-user-username').value = user.username;
  document.getElementById('new-user-pass').value = '';
  document.getElementById('new-user-pass2').value = '';
  document.getElementById('new-user-pass').placeholder = 'Nueva contraseña (opcional)';
  document.getElementById('new-user-pass2').placeholder = 'Confirmar nueva contraseña';
  document.getElementById('new-user-role').value = user.role;
  document.getElementById('btn-add-user').textContent = 'Guardar cambios';
  document.getElementById('btn-cancel-user-edit').style.display = '';
  document.getElementById('new-user-username').focus();
}

/**
 * Renderiza la lista de usuarios en la tabla del panel de administración
 */
function renderUsersTable() {
  const tbody = document.querySelector('#tbl-usuarios tbody');
  if (!tbody) return;

  tbody.innerHTML = users.map(u => {
    const canDelete = !(u.username === currentUser);
    return `<tr>
      <td>${u.username}</td>
      <td>${ROLE_LABELS[u.role] || u.role}</td>
      <td><div class="row-actions">
        <button class="edit-btn" data-edit-username="${u.username}">Editar</button>
        ${canDelete ? `<button class="user-del-btn" data-username="${u.username}">Eliminar</button>` : '<span style="color:var(--muted); font-size:11px;">(tú)</span>'}
      </div></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => startUserEdit(btn.getAttribute('data-edit-username')));
  });

  tbody.querySelectorAll('.user-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uname = btn.getAttribute('data-username');
      const target = users.find(u => u.username === uname);
      if (target && target.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
        if (typeof mostrarAlerta === 'function') {
          mostrarAlerta('No puedes eliminar al único administrador del sistema.', 'warning', 'Acción no permitida');
        } else {
          alert('No puedes eliminar al único administrador.');
        }
        return;
      }

      const confirmado = typeof mostrarConfirmacion === 'function'
        ? await mostrarConfirmacion(
            `¿Estás seguro de que deseas eliminar al usuario "${uname}"? Perderá el acceso al aplicativo de inmediato.`,
            'Eliminar usuario',
            { tipo: 'danger', textoConfirmar: 'Sí, eliminar', textoCancelar: 'Cancelar' }
          )
        : confirm(`¿Eliminar el usuario "${uname}"?`);

      if (!confirmado) return;

      users = users.filter(u => u.username !== uname);
      await saveUsers();
      if (typeof logActivity === 'function') {
        await logActivity('eliminar_usuario', `Usuario "${uname}" eliminado`);
      }
      if (typeof mostrarToast === 'function') {
        mostrarToast('Usuario eliminado', `El usuario "${uname}" fue eliminado exitosamente.`, 'info');
      }
      renderUsersTable();
    });
  });
}

// Control del menú desplegable de administración
document.getElementById('btn-admin-menu-toggle')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const dd = document.getElementById('admin-dropdown');
  if (dd) {
    dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
  }
});

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('admin-menu-wrap');
  if (wrap && !wrap.contains(e.target)) {
    const dd = document.getElementById('admin-dropdown');
    if (dd) dd.style.display = 'none';
  }
});

// Apertura y cierre del modal de administración de usuarios
document.getElementById('menu-item-usuarios')?.addEventListener('click', async () => {
  const dd = document.getElementById('admin-dropdown');
  if (dd) dd.style.display = 'none';
  const errEl = document.getElementById('admin-panel-error');
  if (errEl) errEl.style.display = 'none';
  resetUserForm();
  try {
    await loadUsers();
    renderUsersTable();
  } catch (error) {
    console.error('No se pudieron cargar los usuarios', error);
    if (errEl) {
      errEl.textContent = 'No se pudieron cargar los usuarios desde MySQL.';
      errEl.style.display = 'block';
    }
  }
  const overlay = document.getElementById('admin-panel-overlay');
  if (overlay) overlay.style.display = 'flex';
});

document.getElementById('btn-close-admin-panel')?.addEventListener('click', () => {
  resetUserForm();
  const overlay = document.getElementById('admin-panel-overlay');
  if (overlay) overlay.style.display = 'none';
});

document.getElementById('btn-cancel-user-edit')?.addEventListener('click', () => {
  const errEl = document.getElementById('admin-panel-error');
  if (errEl) errEl.style.display = 'none';
  resetUserForm();
});

// Listener para Crear o Guardar cambios de usuario
document.getElementById('btn-add-user')?.addEventListener('click', async () => {
  const u = document.getElementById('new-user-username').value.trim();
  const p = document.getElementById('new-user-pass').value;
  const p2 = document.getElementById('new-user-pass2').value;
  const role = document.getElementById('new-user-role').value;
  const errEl = document.getElementById('admin-panel-error');
  const isEditing = Boolean(editingUsername);

  if (!u || (!isEditing && (!p || !p2))) {
    errEl.textContent = 'Completa todos los campos.';
    errEl.style.display = 'block';
    return;
  }
  const minimumLength = window.storage.apiConfigured ? 12 : 4;
  if (p && p.length < minimumLength) {
    errEl.textContent = `La contraseña debe tener al menos ${minimumLength} caracteres.`;
    errEl.style.display = 'block';
    return;
  }
  if (p !== p2) {
    errEl.textContent = 'Las contraseñas no coinciden.';
    errEl.style.display = 'block';
    return;
  }
  if (users.find(us => us.username.toLowerCase() === u.toLowerCase() && us.username !== editingUsername)) {
    errEl.textContent = 'Ese usuario ya existe.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';

  if (isEditing) {
    const user = users.find(item => item.username === editingUsername);
    if (!user) return;
    const previousUsername = user.username;
    user.username = u;
    user.role = role;
    if (p) user.hash = await hashPassword(p);

    if (currentUser === previousUsername) {
      currentUser = u;
      currentRole = role;
      document.getElementById('logged-user-label').textContent = currentUser + ' · ' + (ROLE_LABELS[currentRole] || '');
      if (typeof applyPermissions === 'function') {
        applyPermissions();
      }
    }
    await saveUsers();
    if (typeof logActivity === 'function') {
      await logActivity('editar_usuario', `Usuario "${previousUsername}" actualizado`);
    }
    if (typeof mostrarToast === 'function') {
      mostrarToast('Usuario actualizado', `Los datos de "${u}" fueron guardados correctamente.`, 'success');
    }
  } else {
    const hash = await hashPassword(p);
    users.push({ username: u, hash, role });
    await saveUsers();
    if (typeof logActivity === 'function') {
      await logActivity('crear_usuario', `Usuario "${u}" creado con permiso "${ROLE_LABELS[role]}"`);
    }
    if (typeof mostrarToast === 'function') {
      mostrarToast('Usuario creado', `El usuario "${u}" fue registrado con éxito.`, 'success');
    }
  }

  resetUserForm();
  renderUsersTable();
});
