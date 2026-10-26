/* ==========================================================================
   Servicio de Almacenamiento y Conexión Automática con Base de Datos
   Archivo: js/servicio-almacenamiento.js
   Descripción: Persiste los datos en la API PHP cuando está disponible; en
                GitHub Pages sin API configurada, usa localStorage del navegador.
   ========================================================================== */

/**
 * Retorna la URL del endpoint API de almacenamiento de forma automática
 * @returns {string|null}
 */
function getStorageApiUrl() {
  // 1. Si se configuró una URL pública en configuracion-constantes.js (para cuando esté en línea)
  if (typeof PUBLIC_API_URL !== 'undefined' && PUBLIC_API_URL && PUBLIC_API_URL.trim()) {
    let clean = PUBLIC_API_URL.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/storage.php') && !clean.endsWith('/api/storage')) {
      clean = clean.endsWith('/api') ? `${clean}/storage.php` : `${clean}/api/storage.php`;
    }
    return clean;
  }

  // 2. Conexión automática local (Laragon Apache en puerto 80)
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:'
  ) {
    return 'http://localhost/seguimiento-radicacion/Logica/api/storage.php';
  }

  // GitHub Pages solo sirve archivos estáticos; PHP debe configurarse en otro servidor.
  if (window.location.hostname.endsWith('.github.io')) {
    return null;
  }

  // 3. Conexión relativa por defecto si está alojado en el mismo servidor
  return '../Logica/api/storage.php';
}

if (!window.storage) {
  window.storage = {
    /**
     * Obtiene un registro por clave desde MySQL automáticamente
     * @param {string} key Clave a consultar
     * @returns {Promise<{value: string|null}>}
     */
    async get(key) {
      const apiUrl = getStorageApiUrl();
      if (!apiUrl) {
        const value = localStorage.getItem(key);
        return value === null ? null : { value };
      }

      try {
        const separator = apiUrl.includes('?') ? '&' : '?';
        const target = `${apiUrl}${separator}key=${encodeURIComponent(key)}`;
        const response = await fetch(target, { cache: 'no-store' });
        if (!response.ok) throw new Error(`API MySQL respondió HTTP ${response.status}`);
        const data = await response.json();
        return { value: data && Object.prototype.hasOwnProperty.call(data, 'value') ? data.value : null };
      } catch (error) {
        console.warn('No se pudo consultar la API de almacenamiento; se usará localStorage.', error);
        const value = localStorage.getItem(key);
        return value === null ? null : { value };
      }
    },

    /**
     * Guarda o actualiza un registro en la base de datos MySQL automáticamente
     * @param {string} key Clave a guardar
     * @param {string} value Valor serializado en texto o JSON
     * @returns {Promise<any>}
     */
    async set(key, value) {
      const apiUrl = getStorageApiUrl();
      const localValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (!apiUrl) {
        localStorage.setItem(key, localValue);
        return { value };
      }

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value })
        });
        if (!response.ok) throw new Error(`API MySQL respondió HTTP ${response.status}`);
        const data = await response.json();
        localStorage.setItem(key, localValue);
        return data;
      } catch (error) {
        console.warn('No se pudo guardar en la API de almacenamiento; se usará localStorage.', error);
        localStorage.setItem(key, localValue);
        return { value };
      }
    }
  };
}
