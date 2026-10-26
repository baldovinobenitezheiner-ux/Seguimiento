/* ==========================================================================
   Gestión de Registros de Radicación
   Archivo: js/gestion-radicaciones.js
   Descripción: Carga, guardado, validación y mantenimiento (creación y edición)
                de los registros individuales de radicación.
   ========================================================================== */

/**
 * Convierte los datos semilla al formato de objetos de registro
 */
function seedToRecords() {
  return SEED_DATA.map((r, i) => ({
    id: 'seed-' + i,
    radicado: r[0],
    valor: r[1],
    entidad: r[2],
    estado: r[3],
    fecha: r[4],
    responsable: r[5],
    facturas: r[6]
  }));
}

/**
 * Carga los registros de radicación desde el almacenamiento y refresca la vista
 */
async function loadData() {
  try {
    const res = await window.storage.get(STORAGE_KEY, true);
    if (res && res.value) {
      records = JSON.parse(res.value);
    } else {
      records = seedToRecords();
      await saveData();
    }
  } catch (e) {
    if (window.storage.apiConfigured) {
      console.error('No se pudieron cargar los registros desde la base de datos', e);
      records = [];
      if (typeof mostrarAlerta === 'function') {
        mostrarAlerta('No se pudieron cargar los datos desde MySQL. Verifica la conexión e intenta de nuevo.', 'danger', 'Error de conexión');
      }
      return;
    }

    records = seedToRecords();
    try { await saveData(); } catch (e2) {}
  }

  const sub = document.getElementById('subtitle');
  if (sub) {
    sub.textContent = 'Actualizado ' + new Date().toLocaleString('es-CO');
  }

  if (typeof buildFilterOptions === 'function') buildFilterOptions();
  if (typeof buildDatalists === 'function') buildDatalists();
  if (typeof applyCurrentMonthDefault === 'function') applyCurrentMonthDefault();
  if (typeof render === 'function') render();
}

/**
 * Guarda la colección completa de registros en el almacenamiento persistente
 */
async function saveData() {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(records), true);
  } catch (e) {
    console.error('No se pudo guardar la información', e);
    if (window.storage.apiConfigured) {
      if (typeof mostrarAlerta === 'function') {
        mostrarAlerta('No se guardaron los cambios en MySQL. Verifica tu conexión e inténtalo de nuevo.', 'danger', 'Error al guardar');
      }
      throw e;
    }
  }
}

/**
 * Limpia los campos del formulario de radicación
 */
function clearForm() {
  document.getElementById('n-radicado').value = '';
  document.getElementById('n-valor').value = '';
  document.getElementById('n-entidad').value = '';
  document.getElementById('n-estado').value = 'CONFIRMADO';
  document.getElementById('n-fecha').value = '';
  document.getElementById('n-responsable').value = '';
  document.getElementById('n-facturas').value = '';
  document.getElementById('n-edit-id').value = '';
}

/**
 * Abre el formulario configurado para ingresar una nueva radicación
 */
function openFormForCreate() {
  clearForm();
  document.getElementById('form-title').textContent = 'Anexar nueva radicación';
  document.getElementById('btn-save').textContent = 'Guardar registro';
  document.getElementById('form-card').classList.add('open');
  document.getElementById('form-error').style.display = 'none';
  document.getElementById('form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Abre el formulario con los datos cargados para editar una radicación existente
 * @param {object} rec Registro de radicación a editar
 */
function openFormForEdit(rec) {
  document.getElementById('n-radicado').value = rec.radicado ?? '';
  document.getElementById('n-valor').value = rec.valor ?? '';
  document.getElementById('n-entidad').value = rec.entidad ?? '';
  document.getElementById('n-estado').value = rec.estado ?? 'CONFIRMADO';
  document.getElementById('n-fecha').value = rec.fecha ?? '';
  document.getElementById('n-responsable').value = rec.responsable ?? '';
  document.getElementById('n-facturas').value = rec.facturas ?? '';
  document.getElementById('n-edit-id').value = rec.id;

  document.getElementById('form-title').textContent = 'Editar radicación #' + (rec.radicado ?? '');
  document.getElementById('btn-save').textContent = 'Guardar cambios';
  document.getElementById('form-card').classList.add('open');
  document.getElementById('form-error').style.display = 'none';
  document.getElementById('form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Listeners del formulario de radicación
document.getElementById('btn-toggle-form')?.addEventListener('click', openFormForCreate);

document.getElementById('btn-cancel')?.addEventListener('click', () => {
  document.getElementById('form-card').classList.remove('open');
  document.getElementById('form-error').style.display = 'none';
  clearForm();
});

document.getElementById('btn-save')?.addEventListener('click', async () => {
  const radicado = document.getElementById('n-radicado').value.trim();
  const valor = document.getElementById('n-valor').value.trim();
  const entidad = document.getElementById('n-entidad').value.trim();
  const estado = document.getElementById('n-estado').value;
  const fecha = document.getElementById('n-fecha').value;
  const responsable = document.getElementById('n-responsable').value.trim();
  const facturas = document.getElementById('n-facturas').value.trim();
  const editId = document.getElementById('n-edit-id').value;

  const errEl = document.getElementById('form-error');
  if (!radicado || !valor || !entidad || !fecha || !responsable || !facturas) {
    errEl.textContent = 'Completa todos los campos antes de guardar.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  const payload = {
    radicado: Number(radicado),
    valor: Number(valor),
    entidad: entidad.toUpperCase(),
    estado,
    fecha,
    responsable: responsable.toUpperCase(),
    facturas: Number(facturas)
  };

  if (editId) {
    const idx = records.findIndex(r => r.id === editId);
    if (idx !== -1) {
      records[idx] = { ...records[idx], ...payload };
    }
  } else {
    records.push({
      id: 'r-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      ...payload
    });
  }

  await saveData();
  if (typeof logActivity === 'function') {
    await logActivity(
      editId ? 'editar_radicado' : 'crear_radicado',
      `Radicado ${payload.radicado} - ${payload.entidad} - ${fmtMoney(payload.valor)}`
    );
  }
  if (typeof mostrarToast === 'function') {
    mostrarToast(
      editId ? 'Radicación actualizada' : 'Radicación anexada',
      `Radicado #${payload.radicado} (${payload.entidad}) guardado exitosamente.`,
      'success'
    );
  }

  clearForm();
  document.getElementById('form-card').classList.remove('open');

  if (typeof buildFilterOptions === 'function') buildFilterOptions();
  if (typeof buildDatalists === 'function') buildDatalists();
  if (typeof render === 'function') render();
});
