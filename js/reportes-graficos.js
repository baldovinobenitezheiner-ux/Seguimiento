/* ==========================================================================
   Reportes Visuales, Gráficos y Tablas
   Archivo: js/reportes-graficos.js
   Descripción: Cálculo de indicadores KPI, renderizado de gráficos con Chart.js
                (barras por entidad y línea histórica), tablas de resumen
                y tabla principal de registros con acciones.
   ========================================================================== */

/**
 * Renderiza todos los componentes visuales del dashboard con base en los filtros activos
 */
function render() {
  const filtered = typeof getFiltered === 'function' ? getFiltered() : [];
  lastFiltered = filtered;

  const totalValor = filtered.reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const totalFacturas = filtered.reduce((s, r) => s + (Number(r.facturas) || 0), 0);
  const totalRadicados = filtered.length;
  const entidadesActivas = new Set(filtered.map(r => r.entidad)).size;
  const radicadoresActivos = new Set(filtered.map(r => r.responsable)).size;

  const kpisEl = document.getElementById('kpis');
  if (kpisEl) {
    kpisEl.innerHTML = `
      <div class="kpi"><div class="label">Valor total radicado</div><div class="value">${fmtMoney(totalValor)}</div></div>
      <div class="kpi"><div class="label">Total facturas</div><div class="value">${fmtNum(totalFacturas)}</div></div>
      <div class="kpi"><div class="label">Radicados</div><div class="value">${fmtNum(totalRadicados)}</div></div>
      <div class="kpi"><div class="label">Entidades activas</div><div class="value">${fmtNum(entidadesActivas)}</div></div>
      <div class="kpi"><div class="label">Radicadores activos</div><div class="value">${fmtNum(radicadoresActivos)}</div></div>
    `;
  }

  // Agrupación por Entidad
  const byEntidad = {};
  filtered.forEach(r => {
    if (!r.entidad) return;
    if (!byEntidad[r.entidad]) byEntidad[r.entidad] = { valor: 0, radicados: 0, facturas: 0 };
    byEntidad[r.entidad].valor += Number(r.valor) || 0;
    byEntidad[r.entidad].radicados += 1;
    byEntidad[r.entidad].facturas += Number(r.facturas) || 0;
  });
  const entidadRowsFull = Object.entries(byEntidad).map(([k, v]) => ({ entidad: k, ...v })).sort((a, b) => b.valor - a.valor);
  lastEntidadRows = entidadRowsFull;
  const entidadRows = entidadRowsFull.slice(0, 20);

  const tblEntidades = document.querySelector('#tbl-entidades tbody');
  if (tblEntidades) {
    tblEntidades.innerHTML = entidadRows.length ? entidadRows.map((e, i) => `
      <tr><td class="rank">${i + 1}</td><td>${e.entidad}</td><td>${fmtMoney(e.valor)}</td><td>${fmtNum(e.radicados)}</td><td>${fmtNum(e.facturas)}</td></tr>
    `).join('') : '<tr><td colspan="5" class="empty">Sin datos para los filtros seleccionados</td></tr>';
  }

  // Gráfico de Barras: Top 10 Entidades
  const top10 = entidadRows.slice(0, 10);
  const ctx = document.getElementById('chart-entidades');
  if (ctx) {
    const chartData = {
      labels: top10.map(e => e.entidad),
      datasets: [{ label: 'Valor radicado', data: top10.map(e => e.valor), backgroundColor: '#c9a227', borderRadius: 4 }]
    };
    if (chartEntidades) {
      chartEntidades.data = chartData;
      chartEntidades.update();
    } else if (typeof Chart !== 'undefined') {
      chartEntidades = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => fmtMoney(c.parsed.x) } }
          },
          scales: {
            x: { ticks: { callback: (v) => '$' + (v / 1e6).toFixed(0) + 'M' } }
          }
        }
      });
    }
  }

  // Agrupación por Radicador
  const byRadicador = {};
  filtered.forEach(r => {
    if (!r.responsable) return;
    if (!byRadicador[r.responsable]) byRadicador[r.responsable] = { valor: 0, radicados: 0, facturas: 0 };
    byRadicador[r.responsable].valor += Number(r.valor) || 0;
    byRadicador[r.responsable].radicados += 1;
    byRadicador[r.responsable].facturas += Number(r.facturas) || 0;
  });
  const radRows = Object.entries(byRadicador).map(([k, v]) => ({ responsable: k, ...v })).sort((a, b) => b.valor - a.valor);

  const tblRadicadores = document.querySelector('#tbl-radicadores tbody');
  if (tblRadicadores) {
    tblRadicadores.innerHTML = radRows.length ? radRows.map((r, i) => `
      <tr><td class="rank">${i + 1}</td><td>${r.responsable}</td><td>${fmtMoney(r.valor)}</td><td>${fmtNum(r.radicados)}</td><td>${fmtNum(r.facturas)}</td></tr>
    `).join('') : '<tr><td colspan="5" class="empty">Sin datos</td></tr>';
  }

  // Listado de Registros
  const sortedRegs = [...filtered].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.radicado - a.radicado));
  const regCountEl = document.getElementById('reg-count');
  if (regCountEl) regCountEl.textContent = fmtNum(sortedRegs.length);

  const canEdit = currentRole === 'admin' || currentRole === 'editor';
  const tblRegistros = document.querySelector('#tbl-registros tbody');
  if (tblRegistros) {
    tblRegistros.innerHTML = sortedRegs.length ? sortedRegs.map(r => `
      <tr>
        <td>${r.radicado ?? ''}</td>
        <td>${r.entidad ?? ''}</td>
        <td>${fmtMoney(r.valor || 0)}</td>
        <td><span class="badge ${r.estado === 'CONFIRMADO' ? 'badge-confirmado' : 'badge-pendiente'}">${r.estado ?? ''}</span></td>
        <td>${r.fecha ?? ''}</td>
        <td>${r.responsable ?? ''}</td>
        <td>${fmtNum(r.facturas || 0)}</td>
        <td class="row-actions">
          ${canEdit ? `<button class="edit-btn" data-id="${r.id}">Editar</button><button class="del-btn" data-id="${r.id}">Eliminar</button>` : ''}
        </td>
      </tr>
    `).join('') : '<tr><td colspan="8" class="empty">Sin registros</td></tr>';
  }

  // Asignar listeners a botones de eliminar
  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const rec = records.find(r => r.id === id);
      const detalle = rec ? `el radicado #${rec.radicado} (${rec.entidad})` : 'este registro de radicación';

      const confirmado = typeof mostrarConfirmacion === 'function'
        ? await mostrarConfirmacion(
            `¿Estás seguro de que deseas eliminar permanentemente ${detalle}? Esta acción no se puede deshacer.`,
            'Eliminar registro de radicación',
            { tipo: 'danger', textoConfirmar: 'Sí, eliminar', textoCancelar: 'Cancelar' }
          )
        : confirm(`¿Eliminar ${detalle}?`);

      if (!confirmado) return;

      records = records.filter(r => r.id !== id);
      if (typeof saveData === 'function') await saveData();
      if (rec && typeof logActivity === 'function') {
        await logActivity('eliminar_radicado', `Radicado ${rec.radicado ?? ''} - ${rec.entidad ?? ''} eliminado`);
      }
      if (typeof mostrarToast === 'function') {
        mostrarToast('Registro eliminado', `Se eliminó ${detalle}`, 'info');
      }
      if (typeof buildFilterOptions === 'function') buildFilterOptions();
      if (typeof buildDatalists === 'function') buildDatalists();
      render();
    });
  });

  // Asignar listeners a botones de editar
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const rec = records.find(r => r.id === id);
      if (!rec) return;
      if (typeof openFormForEdit === 'function') openFormForEdit(rec);
    });
  });

  renderHistorico();
}

/**
 * Renderiza el gráfico y la tabla histórica mensual acumulada
 */
function renderHistorico() {
  const data = typeof getFilteredIgnoringMesAnio === 'function' ? getFilteredIgnoringMesAnio() : [];
  const byMonth = {};
  data.forEach(r => {
    const key = r.fecha.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = { valor: 0, radicados: 0, facturas: 0 };
    byMonth[key].valor += Number(r.valor) || 0;
    byMonth[key].radicados += 1;
    byMonth[key].facturas += Number(r.facturas) || 0;
  });

  const keys = Object.keys(byMonth).sort();
  const labels = keys.map(k => {
    const [y, m] = k.split('-');
    return MESES_CORTOS[parseInt(m, 10) - 1] + ' ' + y;
  });
  const valores = keys.map(k => byMonth[k].valor);

  const ctxH = document.getElementById('chart-historico');
  if (ctxH) {
    const dataH = {
      labels,
      datasets: [{
        label: 'Valor radicado',
        data: valores,
        borderColor: '#0c2340',
        backgroundColor: 'rgba(12,35,64,0.08)',
        fill: true,
        tension: 0.25,
        pointBackgroundColor: '#c9a227',
        pointRadius: 4,
        borderWidth: 2
      }]
    };

    if (chartHistorico) {
      chartHistorico.data = dataH;
      chartHistorico.update();
    } else if (typeof Chart !== 'undefined') {
      chartHistorico = new Chart(ctxH, {
        type: 'line',
        data: dataH,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => fmtMoney(c.parsed.y) } }
          },
          scales: {
            y: { ticks: { callback: (v) => '$' + (v / 1e6).toFixed(0) + 'M' } }
          }
        }
      });
    }
  }

  const tblHistorico = document.querySelector('#tbl-historico tbody');
  if (tblHistorico) {
    tblHistorico.innerHTML = keys.length ? keys.map((k, i) => `
      <tr><td>${labels[i]}</td><td>${fmtMoney(byMonth[k].valor)}</td><td>${fmtNum(byMonth[k].radicados)}</td><td>${fmtNum(byMonth[k].facturas)}</td></tr>
    `).join('') : '<tr><td colspan="4" class="empty">Sin datos</td></tr>';
  }
}
