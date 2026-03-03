/**
 * Script de prueba para validar el parser dinámico de Excel SAP.
 */
const { parsearFila } = require('../domains/production/ordenProduccion.parser');
const OrdenProduccionService = require('../domains/production/ordenProduccion.service');

// Mock de dependencias
const mockRepo = {
  findByCodigoOrden: async () => null
};
const mockAudit = {};
const service = new OrdenProduccionService(mockRepo, mockAudit);

const MAPEO_SAP = {
  'ExtruPP': 1,
  'Telar': 2
};

// Escenario: Excel con basura al inicio y columnas movidas
const excelSimulado = [
  ['REPORTE DE PRODUCCION SAP'], // Basura
  ['Generado el: 2023-10-27'],    // Basura
  [''],                           // Basura
  ['Centro', 'Nº documento', 'Texto breve material', 'Ctd.planificada', 'Confirmada', 'Pendiente'], // Encabezados (Fila 4)
  ['ExtruPP', 1000001, 'CINTA 800 BLANCO', 1000, 0, 1000],
  ['Telar', 2000001, 'TELA 20" BLANCO 8x8', 5000, 1000, 4000]
];

async function runTest() {
  console.log('--- Iniciando prueba de Parser SAP ---');

  try {
    const deteccion = service._detectarEncabezados(excelSimulado);
    if (!deteccion) {
      throw new Error('No se detectaron los encabezados');
    }

    console.log('✓ Encabezados detectados en fila:', deteccion.indexHeader);
    console.log('✓ Mapeo detectado:', deteccion.mapeo);

    const { indexHeader, mapeo } = deteccion;
    const filasDatos = excelSimulado.slice(indexHeader + 1);

    for (const filaArr of filasDatos) {
      const rowData = {};
      for (const [campo, index] of Object.entries(mapeo)) {
        rowData[campo] = filaArr[index];
      }

      const orden = parsearFila(rowData, MAPEO_SAP);
      console.log(`✓ Procesada orden ${orden.codigo_orden}: ${orden.nombre_proceso_sap} - ${orden.descripcion_producto}`);

      if (orden.codigo_orden === '1000001') {
        if (orden.proceso_id !== 1) throw new Error('Error en mapeo de proceso ExtruPP');
        if (orden.especificaciones.color !== 'BLANCO') throw new Error('Error en parseo de especificaciones');
      }
    }

    console.log('\n--- PRUEBA EXITOSA ---');
  } catch (error) {
    console.error('\n❌ PRUEBA FALLIDA:', error.message);
    process.exit(1);
  }
}

runTest();
