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

let storageApiToken = null;

async function readApiResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data && data.error ? data.error : `La API respondió HTTP ${response.status}`);
  }
  return data;
}

if (!window.storage) {
  window.storage = {
    get apiConfigured() {
      return Boolean(getStorageApiUrl());
    },

    async login(username, password) {
      const apiUrl = getStorageApiUrl();
      if (!apiUrl) throw new Error('No hay una API de base de datos configurada');

      const authUrl = apiUrl.replace(/storage\.php(?:\?.*)?$/, 'auth.php');
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await readApiResponse(response);
      storageApiToken = data.token;
      return data.user;
    },

    logout() {
      storageApiToken = null;
    },

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

      const separator = apiUrl.includes('?') ? '&' : '?';
      const target = `${apiUrl}${separator}key=${encodeURIComponent(key)}`;
      const response = await fetch(target, {
        cache: 'no-store',
        headers: storageApiToken ? { Authorization: `Bearer ${storageApiToken}` } : {}
      });
      const data = await readApiResponse(response);
      return { value: data && Object.prototype.hasOwnProperty.call(data, 'value') ? data.value : null };
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

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storageApiToken ? { Authorization: `Bearer ${storageApiToken}` } : {})
        },
        body: JSON.stringify({ key, value })
      });
      const data = await readApiResponse(response);
      localStorage.setItem(key, localValue);
      return data;
    }
  };
}
