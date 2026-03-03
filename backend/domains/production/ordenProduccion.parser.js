/**
 * Módulo de parseo de descripciones y filas de Excel SAP para órdenes de producción.
 * Contiene la lógica de extracción de especificaciones técnicas por proceso.
 */

const PREFIJOS_TEJIDO = {
  'LB':    { tipo: 'Laminado', color_tejido: 'Blanco' },
  'LV':    { tipo: 'Laminado', color_tejido: 'Verde' },
  'LC':    { tipo: 'Laminado', color_tejido: 'Celeste' },
  'TB':    { tipo: 'Tejido',   color_tejido: 'Blanco' },
  'TBuff': { tipo: 'Tejido',   color_tejido: 'Buff' }
};

/**
 * Parsea la descripción de un producto según el proceso para extraer especificaciones.
 * @param {string} descripcion - Descripción del producto en SAP.
 * @param {number} procesoId - ID del proceso industrial.
 * @returns {Object} Objeto con las especificaciones parseadas.
 */
function parsearDescripcion(descripcion, procesoId) {
  const especificaciones = {};
  if (!descripcion) return especificaciones;

  const descUpper = descripcion.toUpperCase();

  switch (procesoId) {
    case 1: // ExtruPP
      {
        const tokens = descripcion.trim().split(/\s+/);
        const ultimoToken = tokens[tokens.length - 1];
        if (ultimoToken && ultimoToken === ultimoToken.toUpperCase()) {
          especificaciones.color = ultimoToken;
        }
      }
      break;

    case 2: // Telar
      {
        const anchoMatch = descripcion.match(/(\d+(?:\.\d+)?)\s*[""]/);
        if (anchoMatch) {
          especificaciones.ancho_nominal = parseFloat(anchoMatch[1]);
          const postAncho = descripcion.substring(anchoMatch.index + anchoMatch[0].length).trim();
          const colorToken = postAncho.split(/\s+/)[0];
          if (colorToken && colorToken === colorToken.toUpperCase()) {
            especificaciones.color = colorToken;
            especificaciones.color_urdido = colorToken;
            especificaciones.color_trama = colorToken;
          }
        }
        const constrMatch = descripcion.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
        if (constrMatch) {
          especificaciones.construccion_urdido = parseFloat(constrMatch[1]);
          especificaciones.construccion_trama = parseFloat(constrMatch[2]);
        } else {
          especificaciones.construccion_urdido = 8.5;
          especificaciones.construccion_trama = 8.5;
        }
      }
      break;

    case 3: // Laminado
      {
        const anchoMatch = descripcion.match(/(\d+(?:\.\d+)?)\s*[""]/);
        if (anchoMatch) {
          especificaciones.ancho_nominal = parseFloat(anchoMatch[1]);
          const postAncho = descripcion.substring(anchoMatch.index + anchoMatch[0].length).trim();
          const colorToken = postAncho.split(/\s+/)[0];
          if (colorToken && colorToken === colorToken.toUpperCase()) {
            especificaciones.color = colorToken;
          }
        }
        especificaciones.con_pelicula_impresa = false;
        let prefijoEncontrado = null;
        for (const prefijo in PREFIJOS_TEJIDO) {
          if (descripcion.includes(prefijo)) {
            prefijoEncontrado = PREFIJOS_TEJIDO[prefijo];
            break;
          }
        }
        const dimMatch = descripcion.match(/\((\d+(?:\.\d+)?)[""]?\s*[xX]\s*(\d+(?:\.\d+)?)[""]?\)/);
        if (prefijoEncontrado && dimMatch) {
          especificaciones.con_pelicula_impresa = true;
          especificaciones.dimensiones_pelicula = {
            ancho: parseFloat(dimMatch[1]),
            largo: parseFloat(dimMatch[2])
          };
          especificaciones.tipo_tejido_pelicula = prefijoEncontrado.tipo;
        }
      }
      break;

    case 4: // Imprenta
      {
        const baseDesc = descripcion.replace(/^Tela Impresa\s+/i, '');
        for (const prefijo in PREFIJOS_TEJIDO) {
          if (baseDesc.startsWith(prefijo)) {
            especificaciones.tipo_tejido = PREFIJOS_TEJIDO[prefijo].tipo;
            especificaciones.color_tejido = PREFIJOS_TEJIDO[prefijo].color_tejido;
            break;
          }
        }
        const dimMatch = descripcion.match(/\((\d+(?:\.\d+)?)[""]?\s*[xX]\s*(\d+(?:\.\d+)?)[""]?\)/);
        if (dimMatch) {
          especificaciones.ancho_saco = parseFloat(dimMatch[1]);
          especificaciones.largo_cliente = parseFloat(dimMatch[2]);
          especificaciones.largo_impresion = especificaciones.largo_cliente + 1;
        }
        const kgMatch = descripcion.match(/(\d+(?:\.\d+)?)\s*[Kk][Gg]/);
        if (kgMatch) {
          especificaciones.peso_contenido_kg = parseFloat(kgMatch[1]);
        }
        especificaciones.costura_posicion = null;
        especificaciones.nota_costura = 'Definir posición de costura: arriba o abajo. No viene en orden SAP.';
      }
      break;

    case 5: // ConverSA
      {
        const baseDesc = descripcion.replace(/^Tela Impresa\s+/i, '');
        for (const prefijo in PREFIJOS_TEJIDO) {
          if (baseDesc.startsWith(prefijo)) {
            especificaciones.tipo_tejido = PREFIJOS_TEJIDO[prefijo].tipo;
            especificaciones.color_tejido = PREFIJOS_TEJIDO[prefijo].color_tejido;
            break;
          }
        }
        const dimMatch = descripcion.match(/\((\d+(?:\.\d+)?)[""]?\s*[xX]\s*(\d+(?:\.\d+)?)[""]?\)/);
        if (dimMatch) {
          especificaciones.ancho_saco = parseFloat(dimMatch[1]);
          especificaciones.largo_saco = parseFloat(dimMatch[2]);
        }
        const kgMatch = descripcion.match(/(\d+(?:\.\d+)?)\s*[Kk][Gg]/);
        if (kgMatch) {
          especificaciones.peso_contenido_kg = parseFloat(kgMatch[1]);
        }
        if (/Sin Impresión/i.test(descripcion)) {
          especificaciones.sin_impresion = true;
        }
        if (/microperforado/i.test(descripcion)) {
          especificaciones.microperforado = true;
        }
        especificaciones.con_fuelle = null;
        especificaciones.nota_fuelle = 'Definir si el saco lleva fuelle o es plano. No viene en orden SAP.';
      }
      break;

    case 6: // ExtruPE
      {
        const anchoMatch = descripcion.match(/(\d+(?:\.\d+)?)\s*[""]/);
        if (anchoMatch) {
          especificaciones.ancho_nominal = parseFloat(anchoMatch[1]);
        }
        const espesorMatch = descripcion.match(/(\d+(?:\.\d+)?)\s*mm/i);
        if (espesorMatch) {
          especificaciones.espesor_mm = parseFloat(espesorMatch[1]);
        }
        especificaciones.microperforado = false;
        if (descripcion.includes('S/MP')) {
          especificaciones.microperforado = false;
        } else if (descripcion.includes(' MP')) {
          especificaciones.microperforado = true;
        }
      }
      break;

    case 7: // Conv. Liner PE
      {
        let dimMatch = descripcion.match(/\((\d+(?:\.\d+)?)[""]?\s*[xX]\s*(\d+(?:\.\d+)?)[""]?\)/);
        if (!dimMatch) {
          dimMatch = descripcion.match(/(\d+(?:\.\d+)?)[""]\s*[xX]\s*(\d+(?:\.\d+)?)[""]/);
        }
        if (dimMatch) {
          especificaciones.ancho_nominal = parseFloat(dimMatch[1]);
          especificaciones.largo_nominal = parseFloat(dimMatch[2]);
        }
        especificaciones.microperforado = false;
        if (descripcion.includes('S/MP')) {
          especificaciones.microperforado = false;
        } else if (descripcion.includes(' MP')) {
          especificaciones.microperforado = true;
        }
        const coloresConocidos = ['NEGRO', 'BLANCO', 'ROJO', 'VERDE', 'AZUL', 'AMARILLO', 'TRANSPARENTE'];
        let colorEncontrado = 'TRANSPARENTE';
        for (const c of coloresConocidos) {
          if (descUpper.includes(c)) {
            colorEncontrado = c;
            break;
          }
        }
        especificaciones.color = colorEncontrado;
      }
      break;

    case 8: // Peletizado
      {
        especificaciones.tipo_material = descripcion;
      }
      break;

    case 9: // VestidoM
      {
        const baseDesc = descripcion.replace(/^Tela Impresa\s+/i, '');
        for (const prefijo in PREFIJOS_TEJIDO) {
          if (baseDesc.startsWith(prefijo)) {
            especificaciones.tipo_tejido = PREFIJOS_TEJIDO[prefijo].tipo;
            especificaciones.color_tejido = PREFIJOS_TEJIDO[prefijo].color_tejido;
            break;
          }
        }
        const dimMatch = descripcion.match(/\((\d+(?:\.\d+)?)[""]?\s*[xX]\s*(\d+(?:\.\d+)?)[""]?\)/);
        if (dimMatch) {
          especificaciones.ancho_saco = parseFloat(dimMatch[1]);
          especificaciones.largo_saco = parseFloat(dimMatch[2]);
        }
        const kgMatch = descripcion.match(/(\d+(?:\.\d+)?)\s*[Kk][Gg]/);
        if (kgMatch) {
          especificaciones.peso_contenido_kg = parseFloat(kgMatch[1]);
        }
        especificaciones.microperforado = false;
        if (descripcion.includes('S/MP')) {
          especificaciones.microperforado = false;
        } else if (descripcion.includes(' MP')) {
          especificaciones.microperforado = true;
        }
        const linerMatch = descripcion.match(/[Ll](\d+(?:\.\d+)?)/);
        if (linerMatch) {
          especificaciones.ancho_liner = parseFloat(linerMatch[1]);
        } else if (especificaciones.ancho_saco) {
          especificaciones.ancho_liner = especificaciones.ancho_saco + 1;
          especificaciones.nota_liner = 'Ancho de liner calculado automáticamente como ancho saco + 1 pulgada';
        }
      }
      break;
  }

  return especificaciones;
}

/**
 * Convierte datos de una fila de Excel SAP en un objeto de orden de producción.
 * @param {Object} datos - Objeto con los datos extraídos de la fila.
 * @param {Object} mapeoSAP - Mapeo de nombre SAP a proceso_id.
 * @returns {Object} Objeto de orden parseado.
 */
function parsearFila(datos, mapeoSAP) {
  const {
    nombreSap,
    codigoDoc,
    descripcion,
    cantPlanificada,
    cantCompletada,
    cantPendiente,
    fechaPedido,
    fechaInicio,
    fechaVencimiento
  } = datos;

  const procesoId = mapeoSAP[nombreSap] || null;
  const especificaciones = procesoId ? parsearDescripcion(descripcion, procesoId) : {};
  const camposPendientes = [];

  if (!procesoId) {
    camposPendientes.push('proceso_no_reconocido');
  } else {
    if (procesoId === 4 && especificaciones.costura_posicion === null) {
      camposPendientes.push('costura_posicion');
    }
    if (procesoId === 5 && especificaciones.con_fuelle === null) {
      camposPendientes.push('con_fuelle');
    }
  }

  return {
    codigo_orden: String(codigoDoc),
    proceso_id: procesoId,
    nombre_proceso_sap: nombreSap,
    descripcion_producto: descripcion,
    cantidad_planificada: parseFloat(cantPlanificada),
    cantidad_completada: parseFloat(cantCompletada || 0),
    cantidad_pendiente: parseFloat(cantPendiente),
    fecha_pedido: fechaPedido instanceof Date ? fechaPedido.toISOString() : fechaPedido,
    fecha_inicio: fechaInicio instanceof Date ? fechaInicio.toISOString() : fechaInicio,
    fecha_vencimiento: fechaVencimiento instanceof Date ? fechaVencimiento.toISOString() : fechaVencimiento,
    especificaciones,
    requiere_validacion: camposPendientes.length > 0,
    campos_pendientes: camposPendientes
  };
}

module.exports = { parsearDescripcion, parsearFila };
