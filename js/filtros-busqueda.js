/* ==========================================================================
   Filtros y Búsqueda de Radicaciones
   Archivo: js/filtros-busqueda.js
   Descripción: Generación de opciones de filtro dinámicas, datalists de
                autocompletado, lógica de filtrado y eventos de reactividad.
   ========================================================================== */

/**
 * Genera dinámicamente las opciones de los selectores de filtro según los datos cargados
 */
function buildFilterOptions() {
  const now = new Date();
  const prevMes = document.getElementById('f-mes').value;
  const prevAnio = document.getElementById('f-anio').value;
  const prevEnt = document.getElementById('f-entidad').value;
  const prevRad = document.getElementById('f-radicador').value;
  const prevEst = document.getElementById('f-estado').value;

  const anios = Array.from(new Set([
    ...records.map(r => r.fecha ? r.fecha.slice(0, 4) : null).filter(Boolean),
    String(now.getFullYear())
  ])).sort();

  const entidades = Array.from(new Set(records.map(r => r.entidad).filter(Boolean))).sort();
  const radicadores = Array.from(new Set(records.map(r => r.responsable).filter(Boolean))).sort();
  const estados = Array.from(new Set(records.map(r => r.estado).filter(Boolean))).sort();

  const selMes = document.getElementById('f-mes');
  selMes.innerHTML = '<option value="">Todos</option>' + MESES.map((m, i) => `<option value="${i + 1}">${m.charAt(0) + m.slice(1).toLowerCase()}</option>`).join('');

  const selAnio = document.getElementById('f-anio');
  selAnio.innerHTML = '<option value="">Todos</option>' + anios.map(a => `<option value="${a}">${a}</option>`).join('');

  const selEnt = document.getElementById('f-entidad');
  selEnt.innerHTML = '<option value="">Todas</option>' + entidades.map(e => `<option value="${e}">${e}</option>`).join('');

  const selRad = document.getElementById('f-radicador');
  selRad.innerHTML = '<option value="">Todos</option>' + radicadores.map(r => `<option value="${r}">${r}</option>`).join('');

  const selEst = document.getElementById('f-estado');
  selEst.innerHTML = '<option value="">Todos</option>' + estados.map(e => `<option value="${e}">${e}</option>`).join('');

  selMes.value = prevMes;
  if (selMes.value !== prevMes) selMes.value = '';

  selAnio.value = prevAnio;
  if (selAnio.value !== prevAnio) selAnio.value = '';

  selEnt.value = prevEnt;
  if (selEnt.value !== prevEnt) selEnt.value = '';

  selRad.value = prevRad;
  if (selRad.value !== prevRad) selRad.value = '';

  selEst.value = prevEst;
  if (selEst.value !== prevEst) selEst.value = '';
}

/**
 * Selecciona el mes y año en curso por defecto en la barra de herramientas
 */
function applyCurrentMonthDefault() {
  const now = new Date();
  const fMes = document.getElementById('f-mes');
  const fAnio = document.getElementById('f-anio');
  if (fMes) fMes.value = String(now.getMonth() + 1);
  if (fAnio) fAnio.value = String(now.getFullYear());
}

/**
 * Genera las listas de autocompletado (datalists) para entidades y radicadores
 */
function buildDatalists() {
  const entidades = Array.from(new Set([...SEED_ENTIDADES, ...records.map(r => r.entidad)].filter(Boolean))).sort();
  const radicadores = Array.from(new Set(records.map(r => r.responsable).filter(Boolean))).sort();
  const dlEnt = document.getElementById('dl-entidades');
  const dlRad = document.getElementById('dl-radicadores');
  if (dlEnt) dlEnt.innerHTML = entidades.map(e => `<option value="${e}">`).join('');
  if (dlRad) dlRad.innerHTML = radicadores.map(r => `<option value="${r}">`).join('');
}

/**
 * Retorna los registros que cumplen con todos los filtros activos
 * @returns {Array<object>}
 */
function getFiltered() {
  const mes = document.getElementById('f-mes').value;
  const anio = document.getElementById('f-anio').value;
  const entidad = document.getElementById('f-entidad').value;
  const radicador = document.getElementById('f-radicador').value;
  const estado = document.getElementById('f-estado').value;
  const fechaInicio = document.getElementById('f-fecha-inicio').value;
  const fechaFin = document.getElementById('f-fecha-fin').value;

  return records.filter(r => {
    if (!r.fecha) return false;
    const [y, m] = r.fecha.split('-');
    if (mes && parseInt(m, 10) !== parseInt(mes, 10)) return false;
    if (anio && y !== anio) return false;
    if (entidad && r.entidad !== entidad) return false;
    if (radicador && r.responsable !== radicador) return false;
    if (estado && r.estado !== estado) return false;
    if (fechaInicio && r.fecha < fechaInicio) return false;
    if (fechaFin && r.fecha > fechaFin) return false;
    return true;
  });
}

/**
 * Retorna registros filtrados por entidad, radicador y estado, ignorando mes y año
 * para alimentar la gráfica de línea mensual histórica.
 * @returns {Array<object>}
 */
function getFilteredIgnoringMesAnio() {
  const entidad = document.getElementById('f-entidad').value;
  const radicador = document.getElementById('f-radicador').value;
  const estado = document.getElementById('f-estado').value;

  return records.filter(r => {
    if (!r.fecha) return false;
    if (entidad && r.entidad !== entidad) return false;
    if (radicador && r.responsable !== radicador) return false;
    if (estado && r.estado !== estado) return false;
    return true;
  });
}

// Event Listeners para cambios en los filtros
['f-mes', 'f-anio'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', () => {
    document.getElementById('f-fecha-inicio').value = '';
    document.getElementById('f-fecha-fin').value = '';
    if (typeof render === 'function') render();
  });
});

['f-entidad', 'f-radicador', 'f-estado'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', () => {
    if (typeof render === 'function') render();
  });
});

['f-fecha-inicio', 'f-fecha-fin'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', () => {
    document.getElementById('f-mes').value = '';
    document.getElementById('f-anio').value = '';
    if (typeof render === 'function') render();
  });
});

document.getElementById('btn-clear')?.addEventListener('click', () => {
  ['f-mes', 'f-anio', 'f-entidad', 'f-radicador', 'f-estado', 'f-fecha-inicio', 'f-fecha-fin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  if (typeof render === 'function') render();
});
