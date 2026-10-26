/* ==========================================================================
   Configuración, Constantes y Estado Global
   Archivo: js/configuracion-constantes.js
   Descripción: Constantes maestras, variables compartidas de la aplicación
                y funciones auxiliares de formato de moneda y números.
   ========================================================================== */

const SEED_ENTIDADES = [];
const SEED_DATA = [];

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];

const STORAGE_KEY = 'radicacion:records';
const USERS_KEY = 'radicacion:users';
const ACTIVITY_KEY = 'radicacion:activity_log';

// The tunnel must remain active while GitHub Pages uses the local database.
var PUBLIC_API_URL = 'https://violet-colts-stop.loca.lt/storage.php';

const ROLE_LABELS = {
  admin: 'Administrador',
  editor: 'Ingresa y edita',
  viewer: 'Solo vista'
};

const ACTION_LABELS = {
  login: 'Inicio de sesión',
  crear_radicado: 'Anexó radicado',
  editar_radicado: 'Editó radicado',
  eliminar_radicado: 'Eliminó radicado',
  descargar_reporte: 'Descargó reporte Excel',
  crear_usuario: 'Creó usuario',
  editar_usuario: 'Editó usuario',
  eliminar_usuario: 'Eliminó usuario'
};

const LOGIN_BACKGROUNDS = [
  'url("https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2400&q=90")',
  'url("https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2400&q=90")',
  'url("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=90")',
  'url("https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=2400&q=90")',
  'url("https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=2400&q=90")',
  'url("https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2400&q=90")'
];

// Estado global compartido accesible entre módulos
var records = [];
var users = [];
var activityLog = [];
var currentUser = null;
var currentRole = null;
var editingUsername = null;
var chartEntidades = null;
var chartHistorico = null;
var lastEntidadRows = [];
var lastFiltered = [];

/**
 * Formatea un número a representación de moneda colombiana (COP)
 */
function fmtMoney(n) {
  return '$ ' + Math.round(n).toLocaleString('es-CO');
}

/**
 * Formatea un número entero con separadores de miles
 */
function fmtNum(n) {
  return Math.round(n).toLocaleString('es-CO');
}
