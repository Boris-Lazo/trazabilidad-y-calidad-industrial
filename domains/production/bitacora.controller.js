
const Bitacora = require('./bitacora.model');
const { getTurnoActual } = require('./turno.utils');

const BitacoraController = {
    async getInspectores(req, res) {
        try {
            const inspectores = await Bitacora.getInspectores();
            res.json(inspectores);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    async getTiempoActual(req, res) {
        try {
            const now = new Date();
            const { turno, fechaOperativa } = getTurnoActual(now);

            // Obtener zona horaria local de planta
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            res.json({
                hora: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                fecha: now.toLocaleDateString(),
                turno,
                fechaOperativa,
                timezone
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    async getEstadoActual(req, res) {
        try {
            let bitacora = await Bitacora.findAbierta();

            if (!bitacora) {
                return res.json({ abierta: false });
            }

            const procesos = await Bitacora.getResumenProcesos(bitacora.id);
            const resumenProcesos = [];

            for (const proceso of procesos) {
                const registros = await Bitacora.getRegistrosByProceso(bitacora.id, proceso.id);
                const muestras = await Bitacora.getMuestrasByProceso(bitacora.id, proceso.id);
                const status = await Bitacora.getProcesoStatus(bitacora.id, proceso.id);

                let estado = '⚪ Sin datos';
                let ultimaActualizacion = '—';

                const hasRegistros = registros.length > 0;
                const hasMuestras = muestras.length > 0;
                const hasRechazo = muestras.some(m => m.resultado === 'Rechazo' || m.resultado === 'En espera') ||
                                   registros.some(r => {
                                       try {
                                           const p = JSON.parse(r.parametros);
                                           return p.muestras_estructuradas?.some(me => me.estado === 'Rechazado' || me.estado === 'En espera');
                                       } catch(e) { return false; }
                                   });

                // Verificar incidentes tanto en texto como en JSON estructurado (Extrusor)
                const hasIncidente = registros.some(r => {
                    if (r.observaciones && r.observaciones.toLowerCase().includes('incidente')) return true;
                    try {
                        const p = JSON.parse(r.parametros);
                        if (p && p.incidentes && p.incidentes.length > 0) return true;
                        // También chequear parámetros fuera de rango como incidente
                        if (p.muestras_estructuradas?.some(me => {
                            const params = me.parametros || {};
                            return (params.rpm_tornillo > 100) || (params.presion_bar > 500);
                        })) return true;
                    } catch(e) {}
                    return false;
                });

                if (status && status.no_operativo) {
                    estado = '🟢 Completo'; // Mapeado a Completo para permitir el cierre del turno
                } else if (hasRechazo || hasIncidente) {
                    estado = '🔴 Revisión';
                } else if (hasRegistros && hasMuestras) {
                    // Completo: producción + calidad + desperdicio (el desperdicio se incluye en los registros)
                    estado = '🟢 Completo';
                } else if (hasRegistros || hasMuestras) {
                    estado = '🟡 Parcial';
                } else {
                    estado = '⚪ Sin datos';
                }

                // Calcular última actualización
                const allDates = [
                    ...registros.map(r => new Date(r.fecha_hora)),
                    ...muestras.map(m => new Date(m.fecha_analisis))
                ].filter(d => !isNaN(d.getTime()));

                if (allDates.length > 0) {
                    const latest = new Date(Math.max(...allDates));
                    ultimaActualizacion = latest.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                resumenProcesos.push({
                    id: proceso.id,
                    nombre: proceso.nombre,
                    estado,
                    ultimaActualizacion,
                    accion: estado.includes('Sin datos') ? 'Registrar' : 'Continuar'
                });
            }

            res.json({
                abierta: true,
                bitacora,
                procesos: resumenProcesos
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    async abrirBitacora(req, res) {
        try {
            // Requirement 6: El usuario autenticado queda asociado como inspector_responsable
            const inspector = req.user.nombre || req.user.username;

            const existing = await Bitacora.findAbierta();
            if (existing) {
                return res.status(400).json({ message: 'Ya existe una bitácora abierta.' });
            }

            const { turno, fechaOperativa } = getTurnoActual();
            // Lógica de "fuera de horario": Si la hora actual no coincide con el turno teórico.
            // Por simplicidad, asumimos que si se abre, el turno se calcula automáticamente.
            // Pero el usuario dice: "Si la bitácora fue abierta fuera del horario: Bitácora creada fuera del horario del turno"

            // Podríamos comparar la hora actual con los rangos definidos.
            const now = new Date();
            const hours = now.getHours();
            let fueraDeHorario = false;

            if (turno === 'T1' && (hours < 7 || hours >= 15)) fueraDeHorario = true;
            if (turno === 'T2' && (hours < 15 || hours >= 23)) fueraDeHorario = true;
            if (turno === 'T3' && (hours >= 7 && hours < 23)) fueraDeHorario = true;

            const bitacora = await Bitacora.create({
                turno,
                fecha_operativa: fechaOperativa,
                inspector,
                fuera_de_horario: fueraDeHorario
            });

            res.status(201).json(bitacora);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    async getProcesoData(req, res) {
        try {
            const { bitacora_id, proceso_id } = req.query;
            if (!bitacora_id || !proceso_id) {
                return res.status(400).json({ message: 'Faltan parámetros.' });
            }

            const bitacora = await Bitacora.findById(bitacora_id);
            if (!bitacora) return res.status(404).json({ message: 'Bitácora no encontrada.' });

            let status = await Bitacora.getProcesoStatus(bitacora_id, proceso_id);
            let registros = await Bitacora.getRegistrosByProceso(bitacora_id, proceso_id);
            let muestras = await Bitacora.getMuestrasByProceso(bitacora_id, proceso_id);

            let esSugerencia = false;

            // Si no hay datos en la bitácora actual, buscar los últimos registros como sugerencia
            if (registros.length === 0 && muestras.length === 0 && !status) {
                const lastBitacoraId = await Bitacora.getLastBitacoraId(proceso_id);
                if (lastBitacoraId && lastBitacoraId != bitacora_id) {
                    registros = await Bitacora.getRegistrosByProceso(lastBitacoraId, proceso_id);
                    muestras = await Bitacora.getMuestrasByProceso(lastBitacoraId, proceso_id);
                    esSugerencia = true;
                }
            }

            // Extraer producción y desperdicio de los registros
            const produccion = [];
            const desperdicio = [];
            let observaciones = '';

            // Campos extra para Extrusor PP
            let muestras_estructuradas = [];
            let parametros_operativos = null;
            let mezcla = [];
            let incidentes = [];

            registros.forEach(r => {
                let params = {};
                try {
                    params = JSON.parse(r.parametros) || {};
                } catch(e) {}

                const maquina = params.maquina || '';

                // Extraer datos estructurados si existen (normalmente en el primer registro)
                if (params.muestras_estructuradas) muestras_estructuradas = params.muestras_estructuradas;
                if (params.parametros_operativos) parametros_operativos = params.parametros_operativos;
                if (params.mezcla) mezcla = params.mezcla;
                if (params.incidentes) incidentes = params.incidentes;

                if (r.linea_ejecucion_id) {
                    produccion.push({
                        maquina,
                        orden_id: r.orden_id,
                        cantidad: r.cantidad_producida,
                        unidad: r.unidad || 'kg'
                    });

                    if (r.merma_kg > 0) {
                        desperdicio.push({
                            maquina,
                            orden_id: r.orden_id,
                            kg: r.merma_kg
                        });
                    }
                }

                if (r.observaciones) observaciones = r.observaciones;
            });

            // Si no hay produccion pero hay registros (técnicos), igual sacamos las observaciones
            if (produccion.length === 0 && registros.length > 0) {
                observaciones = registros[0].observaciones;
            }

            res.json({
                no_operativo: !!(status && status.no_operativo),
                motivo_no_operativo: status ? status.motivo_no_operativo : '',
                muestras,
                produccion,
                desperdicio,
                observaciones,
                // Campos extra
                muestras_estructuradas,
                parametros_operativos,
                mezcla,
                incidentes,
                es_sugerencia: esSugerencia,
                solo_lectura: bitacora.estado === 'CERRADA'
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    async cerrarBitacora(req, res) {
        try {
            const { id } = req.params;
            const bitacora = await Bitacora.findById(id);
            if (!bitacora) return res.status(404).json({ message: 'Bitácora no encontrada.' });

            // Requirement 6: Solo el mismo usuario que abrió la bitácora puede cerrarla (excepto ADMIN)
            const currentUser = req.user.nombre || req.user.username;
            if (bitacora.inspector !== currentUser && req.user.rol !== 'ADMIN') {
                return res.status(403).json({ message: 'Solo el inspector que abrió la bitácora puede cerrarla.' });
            }

            // Requirement 15: Bloquear cierre si hay procesos en Revisión sin observaciones (explicación)
            const procesos = await Bitacora.getResumenProcesos(id);
            for (const proceso of procesos) {
                const registros = await Bitacora.getRegistrosByProceso(id, proceso.id);
                const muestras = await Bitacora.getMuestrasByProceso(id, proceso.id);

                const hasRechazo = muestras.some(m => m.resultado === 'Rechazo' || m.resultado === 'En espera') ||
                                   registros.some(r => {
                                       try {
                                           const p = JSON.parse(r.parametros);
                                           return p.muestras_estructuradas?.some(me => me.estado === 'Rechazado' || me.estado === 'En espera');
                                       } catch(e) { return false; }
                                   });
                const hasIncidente = registros.some(r => {
                    if (r.observaciones && r.observaciones.toLowerCase().includes('incidente')) return true;
                    try {
                        const p = JSON.parse(r.parametros);
                        if (p && p.incidentes && p.incidentes.length > 0) return true;
                        if (p.muestras_estructuradas?.some(me => {
                            const params = me.parametros || {};
                            return (params.rpm_tornillo > 100) || (params.presion_bar > 500);
                        })) return true;
                    } catch(e) {}
                    return false;
                });

                if (hasRechazo || hasIncidente) {
                    // Buscar si hay observaciones sustanciales
                    const hasObservaciones = registros.some(r => r.observaciones && r.observaciones.length > 10);
                    if (!hasObservaciones) {
                        return res.status(400).json({
                            message: `El proceso '${proceso.nombre}' tiene desviaciones o rechazos pero no se ha proporcionado una explicación en las observaciones.`
                        });
                    }
                }
            }

            const updated = await Bitacora.close(id);
            res.json(updated);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    async guardarProcesoData(req, res) {
        try {
            const { bitacora_id } = req.body;
            const bitacora = await Bitacora.findById(bitacora_id);
            if (!bitacora) return res.status(404).json({ message: 'Bitácora no encontrada.' });
            if (bitacora.estado === 'CERRADA') {
                return res.status(403).json({ message: 'La bitácora está cerrada y no admite cambios.' });
            }

            await Bitacora.saveProcesoData(req.body);
            res.json({ message: 'Datos guardados correctamente.' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    async _getResumenInterno(bitacoraId) {
        const procesos = await Bitacora.getResumenProcesos(bitacoraId);
        const resumenProcesos = [];
        for (const proceso of procesos) {
            const registros = await Bitacora.getRegistrosByProceso(bitacoraId, proceso.id);
            const muestras = await Bitacora.getMuestrasByProceso(bitacoraId, proceso.id);
            const status = await Bitacora.getProcesoStatus(bitacoraId, proceso.id);

            let estado = '⚪ Sin datos';
            const hasRegistros = registros.length > 0;
            const hasMuestras = muestras.length > 0;
            const hasRechazo = muestras.some(m => m.resultado === 'Rechazo' || m.resultado === 'En espera') ||
                               registros.some(r => {
                                   try {
                                       const p = JSON.parse(r.parametros);
                                       return p.muestras_estructuradas?.some(me => me.estado === 'Rechazado' || me.estado === 'En espera');
                                   } catch(e) { return false; }
                               });

            const hasIncidente = registros.some(r => {
                if (r.observaciones && r.observaciones.toLowerCase().includes('incidente')) return true;
                try {
                    const p = JSON.parse(r.parametros);
                    if (p && p.incidentes && p.incidentes.length > 0) return true;
                    if (p.muestras_estructuradas?.some(me => {
                        const params = me.parametros || {};
                        return (params.rpm_tornillo > 100) || (params.presion_bar > 500);
                    })) return true;
                } catch(e) {}
                return false;
            });

            if (status && status.no_operativo) {
                estado = '🟢 Completo';
            } else if (hasRechazo || hasIncidente) {
                estado = '🔴 Revisión';
            } else if (hasRegistros && hasMuestras) {
                estado = '🟢 Completo';
            } else if (hasRegistros || hasMuestras) {
                estado = '🟡 Parcial';
            } else {
                estado = '⚪ Sin datos';
            }
            resumenProcesos.push({ id: proceso.id, estado });
        }
        return resumenProcesos;
    }
};

module.exports = BitacoraController;
