/* ==========================================================================
   Sistema de Alertas Decoradas, Confirmaciones y Notificaciones (Toasts)
   Archivo: js/sistema-alertas.js
   Descripción: Módulo encargado de renderizar alertas modales elegantes con
                micro-animaciones, cuadros de confirmación y notificaciones
                flotantes sin usar los cuadros de diálogo nativos del navegador.
   ========================================================================== */

(function () {
  // Iconos en formato SVG para cada tipo de alerta
  const ICONOS_SVG = {
    success: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    `,
    error: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    `,
    danger: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `,
    warning: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `,
    info: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `
  };

  const TITULOS_DEFAULT = {
    success: '¡Operación Exitosa!',
    error: 'Ha ocurrido un error',
    warning: 'Atención',
    info: 'Información',
    danger: 'Confirmar Acción'
  };

  let overlayEl = null;
  let cardEl = null;
  let resolvePromise = null;
  let toastContainer = null;

  /**
   * Inicializa la estructura DOM del modal de alerta
   */
  function asegurarModalDOM() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'alerta-overlay';
    overlayEl.id = 'alerta-decorada-overlay';

    overlayEl.innerHTML = `
      <div class="alerta-card" id="alerta-decorada-card" role="dialog" aria-modal="true">
        <div class="alerta-icono-wrap" id="alerta-icono"></div>
        <h3 class="alerta-titulo" id="alerta-titulo"></h3>
        <div class="alerta-cuerpo" id="alerta-cuerpo"></div>
        <div class="alerta-acciones" id="alerta-acciones"></div>
      </div>
    `;

    document.body.appendChild(overlayEl);
    cardEl = overlayEl.querySelector('#alerta-decorada-card');
  }

  /**
   * Inicializa el contenedor flotante de notificaciones Toasts
   */
  function asegurarToastContainer() {
    if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.className = 'contenedor-toasts';
    toastContainer.id = 'contenedor-toasts';
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  /**
   * Cierra el modal de alerta con animación
   */
  function cerrarModal(resultado) {
    if (!overlayEl) return;
    overlayEl.classList.remove('activa');
    setTimeout(() => {
      if (resolvePromise) {
        resolvePromise(resultado);
        resolvePromise = null;
      }
    }, 200);
  }

  /**
   * Muestra un modal de alerta decorado y moderno
   * @param {string} mensaje Texto o mensaje de la alerta
   * @param {'success'|'error'|'warning'|'info'} tipo Tipo de alerta
   * @param {string} [titulo] Título opcional
   * @returns {Promise<void>}
   */
  window.mostrarAlerta = function (mensaje, tipo = 'info', titulo = '') {
    asegurarModalDOM();
    const tipoValido = ICONOS_SVG[tipo] ? tipo : 'info';

    return new Promise((resolve) => {
      resolvePromise = resolve;

      cardEl.className = 'alerta-card alerta-tipo-' + tipoValido;
      document.getElementById('alerta-icono').innerHTML = ICONOS_SVG[tipoValido];
      document.getElementById('alerta-titulo').textContent = titulo || TITULOS_DEFAULT[tipoValido];

      // Formateo del cuerpo si contiene saltos de línea con listas (ej. errores de Excel)
      const cuerpoEl = document.getElementById('alerta-cuerpo');
      if (mensaje.includes('\n\n')) {
        const partes = mensaje.split('\n\n');
        cuerpoEl.innerHTML = `<div>${partes[0]}</div><div class="alerta-detalles-box">${partes.slice(1).join('<br>').replace(/\n/g, '<br>')}</div>`;
      } else {
        cuerpoEl.textContent = mensaje;
      }

      // Acciones del modal
      const accionesEl = document.getElementById('alerta-acciones');
      const btnColor = tipoValido === 'error' ? 'alerta-btn-danger' : (tipoValido === 'warning' ? 'alerta-btn-gold' : 'alerta-btn-navy');

      accionesEl.innerHTML = `
        <button class="alerta-btn ${btnColor}" id="btn-alerta-aceptar">Entendido</button>
      `;

      const btnAceptar = document.getElementById('btn-alerta-aceptar');
      btnAceptar.focus();
      btnAceptar.onclick = () => cerrarModal(true);

      overlayEl.classList.add('activa');
    });
  };

  /**
   * Muestra un modal de confirmación interactivo
   * @param {string} mensaje Pregunta o advertencia de confirmación
   * @param {string} [titulo] Título de la confirmación
   * @param {object} [opciones] Personalizaciones (textoConfirmar, textoCancelar, tipo)
   * @returns {Promise<boolean>} Resuelve true si el usuario confirma, false si cancela
   */
  window.mostrarConfirmacion = function (mensaje, titulo = '¿Confirmar acción?', opciones = {}) {
    asegurarModalDOM();

    const tipo = opciones.tipo || 'danger';
    const tipoValido = ICONOS_SVG[tipo] ? tipo : 'danger';
    const textoConfirmar = opciones.textoConfirmar || 'Sí, continuar';
    const textoCancelar = opciones.textoCancelar || 'Cancelar';

    return new Promise((resolve) => {
      resolvePromise = resolve;

      cardEl.className = 'alerta-card alerta-tipo-' + tipoValido;
      document.getElementById('alerta-icono').innerHTML = ICONOS_SVG[tipoValido];
      document.getElementById('alerta-titulo').textContent = titulo;
      document.getElementById('alerta-cuerpo').textContent = mensaje;

      const accionesEl = document.getElementById('alerta-acciones');
      const btnConfirmarClase = tipoValido === 'danger' ? 'alerta-btn-danger' : 'alerta-btn-navy';

      accionesEl.innerHTML = `
        <button class="alerta-btn alerta-btn-cancelar" id="btn-confirmar-cancelar">${textoCancelar}</button>
        <button class="alerta-btn ${btnConfirmarClase}" id="btn-confirmar-aceptar">${textoConfirmar}</button>
      `;

      document.getElementById('btn-confirmar-cancelar').onclick = () => cerrarModal(false);
      document.getElementById('btn-confirmar-aceptar').onclick = () => cerrarModal(true);

      overlayEl.classList.add('activa');
    });
  };

  /**
   * Muestra una notificación flotante decorada (Toast)
   * @param {string} titulo Título breve de la notificación
   * @param {string} [mensaje] Mensaje complementario
   * @param {'success'|'error'|'warning'|'info'} [tipo]
   * @param {number} [duracion] Tiempo en ms antes de auto-cerrarse (por defecto 3800ms)
   */
  window.mostrarToast = function (titulo, mensaje = '', tipo = 'info', duracion = 3800) {
    const container = asegurarToastContainer();
    const tipoValido = ICONOS_SVG[tipo] ? tipo : 'info';

    const toast = document.createElement('div');
    toast.className = `toast-item toast-tipo-${tipoValido}`;

    toast.innerHTML = `
      <div class="toast-icono">${ICONOS_SVG[tipoValido]}</div>
      <div class="toast-contenido">
        <h4 class="toast-titulo">${titulo}</h4>
        ${mensaje ? `<p class="toast-mensaje">${mensaje}</p>` : ''}
      </div>
      <button class="toast-cerrar" aria-label="Cerrar notificación">&times;</button>
    `;

    container.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    const removerToast = () => {
      toast.classList.remove('visible');
      toast.classList.add('saliendo');
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 350);
    };

    toast.querySelector('.toast-cerrar').onclick = removerToast;

    if (duracion > 0) {
      setTimeout(removerToast, duracion);
    }
  };

  // Reemplazo transparente de window.alert para que cualquier alert preexistente sea decorado
  window.alert = function (mensaje) {
    return window.mostrarAlerta(String(mensaje ?? ''), 'info', 'Aviso del Sistema');
  };
})();
