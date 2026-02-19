
const db = require('./config/database');

db.serialize(() => {
    // Seed PROCESO_TIPO
    const procesos = [
        ['Extrusor PP', 'kg', 1],
        ['Telares', 'metros', 1],
        ['Laminado', 'metros', 1],
        ['Imprenta', 'piezas', 1],
        ['Conversión de sacos', 'piezas', 0],
        ['Extrusión PE', 'kg', 1],
        ['Conversión de liner', 'piezas', 0],
        ['Peletizado', 'kg', 1],
        ['Conversión de sacos vestidos', 'piezas', 0]
    ];

    const stmt = db.prepare("INSERT INTO PROCESO_TIPO (nombre, unidad_produccion, reporta_merma_kg) VALUES (?, ?, ?)");
    procesos.forEach(p => stmt.run(p));
    stmt.finalize();

    // Seed RECURSO (Maquinas)
    const maquinas = [
        ['MAQ-EXT-01', 'Extrusora 01', 'maquina', 'kg'],
        ['MAQ-TEL-01', 'Telar 01', 'maquina', 'metros'],
        ['MAQ-IMP-01', 'Imprenta 01', 'maquina', 'piezas']
    ];
    const stmt2 = db.prepare("INSERT INTO RECURSO (codigo, nombre, tipo, unidad_medida) VALUES (?, ?, ?, ?)");
    maquinas.forEach(m => stmt2.run(m));
    stmt2.finalize();

    // Seed ORDEN_PRODUCCION
    db.run("INSERT INTO orden_produccion (codigo_orden, producto, cantidad_objetivo, unidad, estado) VALUES ('OP-1001', 'Saco Polipropileno 50kg', 10000, 'piezas', 'en proceso')");

    console.log("Seed completado");
});
