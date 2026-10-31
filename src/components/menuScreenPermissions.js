// Permiso que el BACKEND exige para cargar cada pantalla del menú (el GET
// principal de la pantalla, ver requirePermission en los *Routes.js). Una
// opción del menú solo se muestra si el usuario lo tiene: antes había
// opciones visibles que al abrirlas decían "No tiene permiso para realizar
// esta acción".
//
// Se suma al "permission" de cada ítem (menu.*), no lo reemplaza. Un arreglo
// es "cualquiera de" (igual que requirePermission en el backend).
//
// Toda opción nueva del menú debe aparecer aquí o en OPEN_SCREENS
// (menuScreenPermissions.test.js lo verifica).
export const SCREEN_PERMISSIONS = {
  "/dashboard/saldos": "balances.ver",

  // Catálogos
  "/clientes": "clientes.ver",
  "/sucursales": ["sucursales.ver", "configuracion.ver"],
  "/riesgos": "tipos_riesgo.ver",
  "/departamentos": "catalogos.ver",
  "/colectores": "cobradores.ver",
  "/promotores": "promotores.ver",

  // Operaciones
  "/creditos": "creditos.ver",
  "/bandeja-de-aprobacion": "aprobaciones.ver",
  "/pagos": "pagos.ver",
  "/cobranza": "cobranza.ver",
  "/clientes/inactivos": "clientes.inactivos.ver",
  "/cobranza/rutas": "rastreo.ver",
  "/cierre-del-dia": "dia.ver",
  "/creditos/notas": "creditos.ver",
  "/creditos/archivos": "creditos.documentos.ver",
  "/creditos/remesas": "creditos.ver",
  "/creditos/entregas-pendientes": "especial.creditos.entregar",
  "/reclamos": ["claims.create", "claims.update", "claims.respond", "claims.close", "claims.assign"],
  "/adjudicaciones": "adjudicaciones.ver",

  // Consultas
  "/saldos": "balances.ver",
  "/creditos/proyeccion-recuperacion": "creditos.proyeccion_recuperacion.ver",
  "/creditos/productividad": "creditos.productividad.ver",
  "/creditos/intereses-cobrados": "reportes.pagos",
  "/provisiones": "balances.ver",
  "/sinriesgos": "reportes.exportar",
  "/cartera-saneada": "creditos.ver",
  "/garantias/reporte": "garantias.ver",

  // Cumplimiento
  "/cumplimiento/matriz-riesgo": "cumplimiento.matriz_riesgo.ver",
  "/cumplimiento/pic": "cumplimiento.matriz_riesgo.ver",
  "/cumplimiento/verificacion-identidad": "cumplimiento.matriz_riesgo.ver",
  "/cumplimiento/listas": "cumplimiento.listas.ver",
  "/cumplimiento/listas-ofac-onu": "cumplimiento.listas.ver",
  "/cumplimiento/alertas": "cumplimiento.alertas.ver",
  "/cumplimiento/ros": "cumplimiento.ros.ver",
  "/cumplimiento/reportes-uaf": "cumplimiento.uaf.ver",
  "/cumplimiento/informe-mensual": "cumplimiento.ros.ver",
  "/cumplimiento/oficial-cumplimiento": "cumplimiento.oficial.ver",
  "/cumplimiento/productos": "cumplimiento.productos.ver",
  "/cumplimiento/firma-preimpresa": "cumplimiento.firma_preimpresa.gestionar",

  // Gestión de TI
  "/ti": "ti.ver",
  "/ti/activos": "ti.ver",
  "/ti/licencias": "ti.ver",
  "/ti/mantenimientos": "ti.ver",
  "/ti/respaldos": "ti.ver",
  "/ti/contratos": "ti.ver",
  "/ti/riesgo/incidentes": "riesgo_tecnologico.ver",
  "/ti/riesgo/autoevaluacion": "riesgo_tecnologico.ver",

  "/conami/tablas": "catalogos.ver",

  // Contabilidad
  "/contabilidad/cuentas": "contabilidad.ver",
  "/contabilidad/libro-diario": "contabilidad.ver",
  "/contabilidad/mayor": "contabilidad.ver",
  "/contabilidad/balance-comprobacion": "contabilidad.ver",
  "/contabilidad/estado-resultados": "contabilidad.ver",
  "/contabilidad/balance-general": "contabilidad.ver",
  "/contabilidad/ingresos-diarios": "contabilidad.ver",
  "/contabilidad/cambios-patrimonio": "contabilidad.ver",
  "/contabilidad/flujo-efectivo": "contabilidad.ver",
  "/contabilidad/notas-eeff": "contabilidad.ver",
  "/contabilidad/indicadores-financieros": "contabilidad.ver",
  "/contabilidad/cierre-ejercicio": "contabilidad.ver",
  "/contabilidad/activo-fijo": "activo_fijo.ver",
  "/contabilidad/activo-fijo/depreciacion": "activo_fijo.ver",
  "/contabilidad/contabilizar": "contabilidad.ver",
  "/contabilidad/mapeos": "contabilidad.ver",
  "/contabilidad/partidas-pendientes": "contabilidad.ver",
  "/contabilidad/integracion": "contabilidad.ver",
  "/retenciones": "retenciones.ver",
  "/proveedores": "proveedores.ver",
  "/cuentas-por-pagar": "cxp.ver",
  "/flujo-caja": ["contabilidad.ver", "cxp.ver", "menu.balances"],

  // Bancos y caja
  "/bancos/cuentas": "bancos.ver",
  "/bancos/movimientos": "bancos.ver",
  "/bancos/conciliacion": "bancos.ver",
  "/caja/mi-caja": ["caja.turnos.operar", "caja.turnos.supervisar"],
  "/caja/turnos": "caja.ver",
  "/caja/tipo-cambio": "caja.ver",
  "/caja/cajas": "caja.ver",
  "/caja/movimientos": "caja.ver",
  "/caja/arqueos": "caja.ver",
  "/caja/cierres-cobradores": "caja.ver",

  // Obligaciones, presupuesto, seguros
  "/obligaciones/financiadores": "obligaciones.ver",
  "/obligaciones/lineas-credito": "obligaciones.ver",
  "/obligaciones": "obligaciones.ver",
  "/presupuesto": "presupuesto.ver",
  "/presupuesto/alertas": "presupuesto.ver",
  "/presupuesto/mi-departamento": "presupuesto.ver",
  "/presupuesto/aprobacion-departamentos": "presupuesto.ver",
  "/presupuesto/departamentos": "presupuesto.ver",
  "/presupuesto/conceptos": "presupuesto.ver",
  "/seguros": "seguros.ver",
  "/seguros/tipos": "seguros.ver",
  "/seguros/aseguradoras": "seguros.ver",
  "/seguros/liquidaciones": "seguros.ver",

  // RRHH
  "/rrhh/dashboard": "rrhh.ver",
  "/rrhh/empleados": "rrhh.ver",
  "/rrhh/planillas": "rrhh.ver",
  "/rrhh/aguinaldo": "rrhh.ver",
  "/rrhh/aprobadores-planilla": "rrhh.ver",
  "/rrhh/aprobar-planillas": "rrhh.planillas.aprobar",
  "/rrhh/deducciones": "rrhh.ver",
  "/rrhh/ingresos": "rrhh.ver",
  "/rrhh/configuracion": "rrhh.ver",
  "/rrhh/incidencias": "rrhh.ver",
  "/rrhh/liquidaciones": "rrhh.ver",
  "/rrhh/reportes": "rrhh.ver",
  "/rrhh/organigrama": "rrhh.ver",
  "/rrhh/contratos-por-vencer": "rrhh.ver",
  "/rrhh/conozca-su-empleado": "cumplimiento.matriz_riesgo.ver",

  // Reportes
  "/auditoria": "auditoria.ver",
  "/reports/conami/icc": "reportes.exportar",
  "/conami/icc-isc": "reportes.exportar",
  "/reports/conami/sinriesgo": "reportes.exportar",
  "/ngrc/cumplimiento": "ngrc.cumplimiento.ver",
  "/reports/studio": "reportes.ver",

  // Configuración
  "/configuracion/perfil-empresa": "configuracion.editar",
  "/configuracion/datos-legales-imf": "configuracion.datos_legales_imf.gestionar",
  "/creditos/politicas": ["politicas_credito.ver", "catalogos.ver"],
  "/configuracion/productos-financieros": ["configuracion.productos.ver", "configuracion.productos.gestionar"],
  "/configuracion/campos-personalizados": "configuracion.campos_personalizados.gestionar",
  "/creditos/evaluacion-financiera/configuracion": "clientes.evaluacion.configuracion.gestionar",
  "/configuracion/provision-cartera": "creditos.provision.configurar",
  "/configuracion/calendarios": ["sucursales.ver", "configuracion.ver"],
  "/configuracion/tipos-cambio": "configuracion.tipos_cambio.gestionar",
  "/notificaciones": "configuracion.ver",
  "/configuracion/respaldo-datos": "respaldos.generar",

  // Usuarios y permisos
  "/usuarios": "usuarios.ver",
  "/roles": "roles.ver",
  "/permisos": "permisos.ver",
  "/aprobadores": "aprobadores.ver",
};

// Pantallas de autoservicio que el backend no protege con permiso: cualquier
// usuario autenticado las puede abrir.
export const OPEN_SCREENS = new Set([
  "/ti/mesa-de-ayuda", // cualquiera reporta y sigue sus tickets
  "/rrhh/mis-vacaciones", // el empleado ve lo suyo
  "/rrhh/aprobar-vacaciones", // jefe inmediato, sin permiso especial
  "/soporte", // tickets de la empresa a CrediMaster
]);

// ¿Puede abrir la pantalla `path`? hasTag(tag) -> boolean. Rutas que no son
// del menú (p. ej. un favorito a otra pantalla) no se filtran aquí.
export const canOpenScreen = (path, hasTag) => {
  const required = SCREEN_PERMISSIONS[path];
  if (!required) return true;
  return (Array.isArray(required) ? required : [required]).some(hasTag);
};
