/* ==========================================================================
   Auditoría e Histórico de Movimientos
   Archivo: js/auditoria-movimientos.js
   Descripción: Registro de acciones de usuarios en el sistema, carga y
                renderizado del historial de auditoría.
   ========================================================================== */

/**
 * Registra un movimiento o acción realizada por el usuario actual
 * @param {string} action Código de la acción (ver ACTION_LABELS)
 * @param {string} detail Descripción detallada del movimiento
 */
async function logActivity(action, detail) {
  try {
    const res = await window.storage.get(ACTIVITY_KEY, true);
    const log = (res && res.value) ? JSON.parse(res.value) : [];
    log.push({
      ts: new Date().toISOString(),
      user: currentUser,
      role: currentRole,
      action,
      detail
    });
    if (log.length > 1000) log.splice(0, log.length - 1000);
    await window.storage.set(ACTIVITY_KEY, JSON.stringify(log), true);
  } catch (e) {
    console.error('No se pudo registrar el movimiento', e);
  }
}

/**
 * Carga el registro de auditoría desde el almacenamiento
 */
async function loadActivityLog() {
  try {
    const res = await window.storage.get(ACTIVITY_KEY, true);
    activityLog = (res && res.value) ? JSON.parse(res.value) : [];
  } catch (e) {
    activityLog = [];
  }
}

/**
 * Renderiza la tabla de auditoría con los movimientos ordenados por fecha descendente
 */
function renderActivityLog() {
  const tbody = document.querySelector('#tbl-activity-log tbody');
  if (!tbody) return;
  const sorted = [...activityLog].sort((a, b) => b.ts.localeCompare(a.ts));
  tbody.innerHTML = sorted.length
    ? sorted.map(e => {
        const d = new Date(e.ts);
        const fecha = isNaN(d) ? e.ts : d.toLocaleString('es-CO');
        return `<tr>
          <td>${fecha}</td>
          <td>${e.user ?? ''}</td>
          <td>${ACTION_LABELS[e.action] || e.action}</td>
          <td>${e.detail ?? ''}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="4" class="empty">Aún no hay movimientos registrados</td></tr>';
}

// Event Listeners para el panel de auditoría
document.getElementById('menu-item-historico')?.addEventListener('click', async () => {
  const dropdown = document.getElementById('admin-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  await loadActivityLog();
  renderActivityLog();
  const overlay = document.getElementById('activity-log-overlay');
  if (overlay) overlay.style.display = 'flex';
});

document.getElementById('btn-close-activity-log')?.addEventListener('click', () => {
  const overlay = document.getElementById('activity-log-overlay');
  if (overlay) overlay.style.display = 'none';
});
