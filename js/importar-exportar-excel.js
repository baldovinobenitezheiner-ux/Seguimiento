/* ==========================================================================
   Importación y Exportación de Archivos Excel
   Archivo: js/importar-exportar-excel.js
   Descripción: Procesamiento de carga masiva de archivos .xlsx/.xls con SheetJS,
                validaciones de campos y duplicados, y generación de reportes
                descargables con tablas resumen y detalle de radicados.
   ========================================================================== */

/**
 * Normaliza nombres de encabezados de Excel quitando tildes, espacios y caracteres especiales
 * @param {any} value Texto del encabezado
 * @returns {string}
 */
function normalizeExcelHeader(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Convierte un valor de celda de Excel a número decimal/entero válido
 * @param {any} value Valor de la celda
 * @returns {number}
 */
function parseExcelNumber(value) {
  if (typeof value === 'number') return value;
  const clean = String(value ?? '').replace(/[^\d.-]/g, '');
  return clean ? Number(clean) : NaN;
}

/**
 * Normaliza fechas provenientes de celdas numéricas o strings de Excel al formato YYYY-MM-DD
 * @param {any} value Valor de la fecha en la celda
 * @returns {string}
 */
function parseExcelDate(value) {
  if (typeof value === 'number' && typeof XLSX !== 'undefined' && XLSX.SSF) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parts = text.split(/[\/-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return '';
}

/**
 * Procesa la importación masiva de radicaciones desde un archivo Excel
 * @param {File} file Archivo seleccionado
 */
async function importBulkExcel(file) {
  if (typeof XLSX === 'undefined') {
    if (typeof mostrarAlerta === 'function') {
      mostrarAlerta('No se pudo cargar el lector de Excel. Verifica la conexión a internet e inténtalo de nuevo.', 'error', 'Librería no disponible');
    } else {
      alert('No se pudo cargar el lector de Excel.');
    }
    return;
  }

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    if (!rows.length) {
      if (typeof mostrarAlerta === 'function') {
        mostrarAlerta('El archivo seleccionado está vacío o no contiene registros.', 'warning', 'Archivo vacío');
      } else {
        alert('El archivo no contiene registros.');
      }
      return;
    }

    const aliases = {
      radicado: ['radicado', 'nradicado', 'numeroradicado'],
      valor: ['valor'],
      entidad: ['entidad'],
      estado: ['estado'],
      fecha: ['fecharadicacion', 'fecha'],
      responsable: ['responsable', 'radicador'],
      facturas: ['cantidadfacturas', 'facturas', 'cantidaddefacturas']
    };

    const headers = Object.keys(rows[0]);
    const headerMap = {};
    Object.entries(aliases).forEach(([field, names]) => {
      const match = headers.find(header => names.includes(normalizeExcelHeader(header)));
      if (match) headerMap[field] = match;
    });

    const missing = Object.keys(aliases).filter(field => !headerMap[field]);
    if (missing.length) {
      const mensajeMissing = `Faltan columnas obligatorias:\n\n• ${missing.join('\n• ')}\n\nUsa los mismos nombres que solicita el formulario.`;
      if (typeof mostrarAlerta === 'function') {
        mostrarAlerta(mensajeMissing, 'warning', 'Columnas obligatorias faltantes');
      } else {
        alert(mensajeMissing);
      }
      return;
    }

    const imported = [];
    const errors = [];

    rows.forEach((row, index) => {
      const line = index + 2;
      const radicado = parseExcelNumber(row[headerMap.radicado]);
      const valor = parseExcelNumber(row[headerMap.valor]);
      const entidad = String(row[headerMap.entidad] ?? '').trim();
      const estado = String(row[headerMap.estado] ?? '').trim().toUpperCase();
      const fecha = parseExcelDate(row[headerMap.fecha]);
      const responsable = String(row[headerMap.responsable] ?? '').trim();
      const facturas = parseExcelNumber(row[headerMap.facturas]);
      const rowErrors = [];

      if (!Number.isFinite(radicado)) rowErrors.push('radicado');
      if (!Number.isFinite(valor)) rowErrors.push('valor');
      if (!entidad) rowErrors.push('entidad');
      if (!['CONFIRMADO', 'PENDIENTE'].includes(estado)) rowErrors.push('estado');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) rowErrors.push('fecha');
      if (!responsable) rowErrors.push('responsable');
      if (!Number.isFinite(facturas)) rowErrors.push('facturas');

      if (rowErrors.length) {
        errors.push(`Fila ${line}: campo(s) inválido(s) [${rowErrors.join(', ')}]`);
        return;
      }

      if (records.some(record => String(record.radicado) === String(radicado)) || imported.some(record => String(record.radicado) === String(radicado))) {
        errors.push(`Fila ${line}: radicado #${radicado} duplicado`);
        return;
      }

      imported.push({
        id: 'r-' + Date.now() + '-' + index + '-' + Math.floor(Math.random() * 1000),
        radicado,
        valor,
        entidad: entidad.toUpperCase(),
        estado,
        fecha,
        responsable: responsable.toUpperCase(),
        facturas
      });
    });

    if (imported.length) {
      records.push(...imported);
      if (typeof saveData === 'function') await saveData();
      if (typeof logActivity === 'function') {
        await logActivity('crear_radicado', `Carga masiva de ${imported.length} radicaciones desde Excel`);
      }
      if (typeof buildFilterOptions === 'function') buildFilterOptions();
      if (typeof buildDatalists === 'function') buildDatalists();
      if (typeof render === 'function') render();
    }

    if (typeof mostrarAlerta === 'function') {
      if (errors.length) {
        const detalleErrores = `Se cargaron con éxito ${imported.length} radicaciones.\n\nFilas omitidas (${errors.length}):\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? '\n...' : ''}`;
        mostrarAlerta(detalleErrores, 'warning', 'Carga masiva completada');
      } else {
        mostrarAlerta(`Se cargaron con éxito ${imported.length} radicaciones sin errores.`, 'success', 'Carga masiva exitosa');
      }
    } else {
      alert(`Se cargaron ${imported.length} radicaciones.`);
    }
  } catch (error) {
    console.error('No se pudo importar el archivo', error);
    if (typeof mostrarAlerta === 'function') {
      mostrarAlerta('No se pudo leer el archivo Excel. Verifica que sea un archivo válido (.xlsx o .xls).', 'error', 'Error al leer archivo');
    } else {
      alert('No se pudo leer el archivo Excel.');
    }
  }
}

/**
 * Genera y descarga el archivo Excel consolidado con los datos filtrados actualmente
 */
function exportExcel() {
  if (typeof XLSX === 'undefined') {
    if (typeof mostrarAlerta === 'function') {
      mostrarAlerta('La librería para exportar a Excel no está disponible.', 'error', 'Error de exportación');
    } else {
      alert('La librería para exportar a Excel no está disponible.');
    }
    return;
  }

  const registrosData = [
    ['Radicado', 'Entidad', 'Valor', 'Estado', 'Fecha radicación', 'Responsable', 'Cantidad facturas']
  ];
  const sortedRegs = [...lastFiltered].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.radicado - a.radicado));
  sortedRegs.forEach(r => {
    registrosData.push([r.radicado, r.entidad, r.valor, r.estado, r.fecha, r.responsable, r.facturas]);
  });
  const wsRegistros = XLSX.utils.aoa_to_sheet(registrosData);
  wsRegistros['!cols'] = [{ wch: 10 }, { wch: 26 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 10 }];

  const pivotData = [['Entidad', 'Valor radicado', 'Radicados', 'Facturas']];
  lastEntidadRows.forEach(e => {
    pivotData.push([e.entidad, e.valor, e.radicados, e.facturas]);
  });
  const totalValor = lastEntidadRows.reduce((s, e) => s + e.valor, 0);
  const totalRadicados = lastEntidadRows.reduce((s, e) => s + e.radicados, 0);
  const totalFacturas = lastEntidadRows.reduce((s, e) => s + e.facturas, 0);
  pivotData.push(['Total general', totalValor, totalRadicados, totalFacturas]);
  const wsPivot = XLSX.utils.aoa_to_sheet(pivotData);
  wsPivot['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 12 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsRegistros, 'Registros');
  XLSX.utils.book_append_sheet(wb, wsPivot, 'Radicado por entidad');

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `reporte_radicacion_${fecha}.xlsx`);
  if (typeof logActivity === 'function') {
    logActivity('descargar_reporte', `Reporte Excel descargado (${lastFiltered.length} registros)`);
  }
  if (typeof mostrarToast === 'function') {
    mostrarToast('Reporte descargado', `Se generó el archivo Excel con ${lastFiltered.length} registros.`, 'success');
  }
}

// Listeners de Excel
document.getElementById('btn-export')?.addEventListener('click', exportExcel);

document.getElementById('btn-bulk-upload')?.addEventListener('click', () => {
  document.getElementById('bulk-file-input')?.click();
});

document.getElementById('bulk-file-input')?.addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (file) await importBulkExcel(file);
  event.target.value = '';
});
