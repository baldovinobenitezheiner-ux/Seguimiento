/* ==========================================================================
   Punto de Entrada y Arranque de la Aplicación
   Archivo: js/inicio-aplicacion.js
   Descripción: Orquestador que inicializa el sistema de autenticación y carga
                el entorno una vez que todos los recursos han sido montados.
   ========================================================================== */

// Iniciar aplicación al estar listo el documento
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAuth();
  });
} else {
  initAuth();
}
