import { Cliente, Pozo, TablaControl, Ticket, CalidadAgua, RegistroOffline, InterrupcionAP, PuntoMedicionPresion, RegistroPresion } from './types';

// Helper arrays to generate realistic names and addresses
const NOMBRES = [
  'Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Sofía', 'José', 'Laura', 'Pedro', 'Camila',
  'Andrés', 'Valentina', 'Diego', 'Lucía', 'Javier', 'Elena', 'Ricardo', 'Gabriela',
  'Manuel', 'Isabella', 'Felipe', 'Fernanda', 'Héctor', 'Patricia', 'Fernando', 'Carmen',
  'Mauricio', 'Alejandra', 'Hugo', 'Daniela', 'Roberto', 'Paola', 'Gonzalo', 'Mónica',
  'Eduardo', 'Natalia', 'Raúl', 'Carolina', 'Oscar', 'Silvia', 'Julio', 'Clara', 'Alonso'
];

const APELLIDOS = [
  'González', 'Rodríguez', 'Gómez', 'Fernández', 'López', 'Díaz', 'Martínez', 'Pérez',
  'García', 'Sánchez', 'Romero', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Vargas', 'Acosta',
  'Castro', 'Medina', 'Herrera', 'Silva', 'Guzmán', 'Muñoz', 'Ríos', 'Ortega', 'Mendoza',
  'Delgado', 'Soto', 'Herrera', 'Peña', 'Rojas', 'Salazar', 'Miranda', 'Ibáñez', 'Cárdenas',
  'Paredes', 'Vásquez', 'Navarro', 'Campos', 'Figueroa', 'Contreras', 'Carrasco', 'Orellana'
];

const CALLES = [
  'Av. Prat', 'Calle Los Alerces', 'Av. Central', 'Calle Las Rosas', 'Pasaje El Bosque',
  'Av. O’Higgins', 'Calle Los Arrayanes', 'Calle Esmeralda', 'Av. España', 'Calle San Martín',
  'Camino Rinconada', 'Pasaje Los Copihues', 'Calle Condell', 'Av. Vicuña Mackenna',
  'Pasaje El Trébol', 'Calle Bulnes', 'Calle Manuel Montt', 'Calle Los Coihues'
];

const SECTORES: Array<'Norte' | 'Sur' | 'Centro' | 'Rural'> = ['Norte', 'Sur', 'Centro', 'Rural'];

// Procedural generator for 1,000 clients
export function generar1000Clientes(): Cliente[] {
  const listado: Cliente[] = [];
  
  for (let i = 1; i <= 1000; i++) {
    // Deterministic random generator based on index i to keep it consistent
    const seedNombre = (i * 3) % NOMBRES.length;
    const seedApellido1 = (i * 7) % APELLIDOS.length;
    const seedApellido2 = (i * 11) % APELLIDOS.length;
    const seedCalle = (i * 13) % CALLES.length;
    const seedSector = i % SECTORES.length;
    const numeroCasa = 100 + (i * 17) % 899;
    
    const nombreCompleto = `${NOMBRES[seedNombre]} ${APELLIDOS[seedApellido1]} ${APELLIDOS[seedApellido2]}`;
    const direccion = `${CALLES[seedCalle]} #${numeroCasa}`;
    const sector = SECTORES[seedSector];
    
    // Meter codes
    const medidorNum = 10000 + i * 27 % 89999;
    const medidorId = `MED-${medidorNum}`;
    const qrCode = `https://agua-comunidad.cl/medidor/${medidorId}`;
    const nfcUid = `04:${(i * 13).toString(16).padStart(2, '0').toUpperCase()}:2B:${(i * 17).toString(16).padStart(2, '0').toUpperCase()}:89:${(i * 23).toString(16).padStart(2, '0').toUpperCase()}:E0`;
    
    // Categories: Residencial (~88%), Comercial (~10%), Industrial (~2%)
    let categoria: 'Residencial' | 'Comercial' | 'Industrial' = 'Residencial';
    const catRand = i % 50;
    if (catRand === 0) {
      categoria = 'Industrial';
    } else if (catRand < 6) {
      categoria = 'Comercial';
    }
    
    // Readings: Previous reading between 80 m3 and 950 m3
    const lecturaAnterior = Math.round((100 + (i * 1.5) % 850) * 10) / 10;
    
    // We pre-populate some as "Leído" or "Imposible de leer" to make the app look alive immediately (e.g., first 120 clients)
    let estado: 'Pendiente' | 'Leído' | 'Imposible de leer' = 'Pendiente';
    let lecturaActual: number | undefined;
    let consumoCalculado: number | undefined;
    let fechaLectura: string | undefined;
    let causaNoLectura: string | undefined;
    let alertaConsumo: 'Ninguna' | 'Consumo Elevado' | 'Consumo Cero' | 'Lectura Menor' | undefined = 'Ninguna';
    
    if (i <= 140) {
      if (i % 15 === 0) {
        estado = 'Imposible de leer';
        causaNoLectura = 'Predio Cerrado / Inaccesible';
        fechaLectura = `2026-06-28T09:${(10 + i % 40).toString().padStart(2, '0')}:00`;
      } else {
        estado = 'Leído';
        // Consumption is normally between 12 and 45 m3
        const consumo = Math.round((12 + (i * 0.4) % 33) * 10) / 10;
        lecturaActual = Math.round((lecturaAnterior + consumo) * 10) / 10;
        consumoCalculado = consumo;
        fechaLectura = `2026-06-28T10:${(10 + i % 40).toString().padStart(2, '0')}:00`;
        
        // Throw some alerts
        if (i % 22 === 0) {
          // Extremely high consumption
          const exceso = 150;
          lecturaActual = Math.round((lecturaAnterior + exceso) * 10) / 10;
          consumoCalculado = exceso;
          alertaConsumo = 'Consumo Elevado';
        } else if (i % 35 === 0) {
          // Zero consumption
          lecturaActual = lecturaAnterior;
          consumoCalculado = 0;
          alertaConsumo = 'Consumo Cero';
        } else if (i % 79 === 0) {
          // Error: smaller than previous
          lecturaActual = Math.round((lecturaAnterior - 5) * 10) / 10;
          consumoCalculado = -5;
          alertaConsumo = 'Lectura Menor';
        }
      }
    }
    
    const cota = Math.round(150 + (i * 0.45) % 150);
    const lat = -33.7250 + ((i * 17) % 100) * 0.0004 - 0.02;
    const lng = -70.8640 + ((i * 31) % 100) * 0.0005 - 0.025;
    
    listado.push({
      id: `CLI-${String(i).padStart(4, '0')}`,
      nombre: nombreCompleto,
      direccion,
      sector,
      medidorId,
      qrCode,
      nfcUid,
      lecturaAnterior,
      lecturaActual,
      consumoCalculado,
      fechaLectura,
      estado,
      causaNoLectura,
      categoria,
      alertaConsumo,
      cota,
      estadoServicio: 'Activo',
      lat,
      lng
    });
  }
  
  return listado;
}

// Initial Wells data
export const INITIAL_POZOS: Pozo[] = [
  {
    id: 'POZ-001',
    nombre: 'Pozo El Rosal (Matriz Norte)',
    sector: 'Norte',
    capacidadNominal: 15.0, // L/s
    volumenExtraidoMensual: 11200, // m3 (Junio 2026)
    profundidad: 85,
    estado: 'Activo',
    ultimaInspeccion: '2026-06-15',
    horasFuncionamientoMensual: 480,
    minutosFuncionamientoMensual: 30,
    nivelEstatico: 18.5,
    nivelFreatico: 32.2,
    fechaNiveles: '2026-06-18', // ~11 days ago
    profundidadBomba: 45.0,
    historialProfundidadBomba: [
      { fecha: '2025-03-10', profundidadAnterior: 40.0, profundidadNueva: 45.0, motivo: 'Ajuste estacional por descenso del acuífero' }
    ],
    lat: -33.7080,
    lng: -70.8520
  },
  {
    id: 'POZ-002',
    nombre: 'Pozo San Isidro (Matriz Centro-Sur)',
    sector: 'Centro',
    capacidadNominal: 22.5, // L/s
    volumenExtraidoMensual: 16800, // m3 (Junio 2026)
    profundidad: 110,
    estado: 'Activo',
    ultimaInspeccion: '2026-06-10',
    horasFuncionamientoMensual: 520,
    minutosFuncionamientoMensual: 15,
    nivelEstatico: 24.1,
    nivelFreatico: 45.8,
    fechaNiveles: '2026-06-12', // ~17 days ago (overdue, > 15 days!)
    profundidadBomba: 60.0,
    historialProfundidadBomba: [],
    lat: -33.7250,
    lng: -70.8640
  },
  {
    id: 'POZ-003',
    nombre: 'Pozo Alto Alegre (Matriz Rural-Reserva)',
    sector: 'Rural',
    capacidadNominal: 10.0, // L/s
    volumenExtraidoMensual: 7500, // m3 (Junio 2026)
    profundidad: 70,
    estado: 'Mantenimiento',
    ultimaInspeccion: '2026-06-25',
    horasFuncionamientoMensual: 240,
    minutosFuncionamientoMensual: 0,
    nivelEstatico: 12.3,
    nivelFreatico: 22.1,
    fechaNiveles: '2026-06-25', // ~4 days ago
    profundidadBomba: 35.0,
    historialProfundidadBomba: [
      { fecha: '2026-02-14', profundidadAnterior: 30.0, profundidadNueva: 35.0, motivo: 'Reemplazo de bomba dañada and optimización' }
    ],
    lat: -33.7420,
    lng: -70.8850
  }
];

// Initial tables metadata with update frequencies
export const INITIAL_TABLAS_CONTROL: TablaControl[] = [
  {
    id: 'TAB-001',
    nombreTabla: 'Catastro de Clientes y Medidores',
    descripcion: 'Padrón de usuarios activos del sistema APyA, su tipo de tarifa, ubicación y medidor asociado.',
    frecuenciaActualizacion: 'Semestral',
    ultimaActualizacion: '2026-01-10',
    proximaActualizacionRequerida: '2026-07-10',
    estadoFrecuencia: 'Próximo a vencer',
    responsable: 'Oficina Comercial'
  },
  {
    // The user notes: "con excepcion de la tabla de ..."
    // Let's list the relevant ones and specify frequencies:
    id: 'TAB-002',
    nombreTabla: 'Lecturas de Consumo Mensual (Medidores)',
    descripcion: 'Historial mensual de lecturas registradas por los operadores en terreno o vía PWA.',
    frecuenciaActualizacion: 'Mensual',
    ultimaActualizacion: '2026-05-31',
    proximaActualizacionRequerida: '2026-06-30',
    estadoFrecuencia: 'Al día',
    responsable: 'Operadores de Terreno'
  },
  {
    id: 'TAB-003',
    nombreTabla: 'Caudales de Extracción de Pozos',
    descripcion: 'Registro de macro-mediciones de los pozos de captación centralizados.',
    frecuenciaActualizacion: 'Diaria',
    ultimaActualizacion: '2026-06-28',
    proximaActualizacionRequerida: '2026-06-29',
    estadoFrecuencia: 'Al día',
    responsable: 'Equipo Operaciones'
  },
  {
    id: 'TAB-004',
    nombreTabla: 'Análisis de Calidad y Cloración del Agua',
    descripcion: 'Controles físico-químicos obligatorios: pH, cloro libre residual, turbiedad y microbiología.',
    frecuenciaActualizacion: 'Diaria',
    ultimaActualizacion: '2026-06-28',
    proximaActualizacionRequerida: '2026-06-29',
    estadoFrecuencia: 'Al día',
    responsable: 'Laboratorio Químico'
  },
  {
    id: 'TAB-005',
    nombreTabla: 'Bitácora de Mantenciones Preventivas de Alcantarillado',
    descripcion: 'Registro de desobstrucciones y limpiezas de colectores sanitarios y cámaras de inspección.',
    frecuenciaActualizacion: 'Semanal',
    ultimaActualizacion: '2026-06-15',
    proximaActualizacionRequerida: '2026-06-22',
    estadoFrecuencia: 'Retrasado',
    responsable: 'Cuadrilla de Redes'
  }
];

// Initial service tickets
export const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'TCK-2026-001',
    clienteId: 'CLI-0005',
    clienteNombre: 'Carlos Gómez Fernández',
    categoria: 'Rotura de Matriz',
    descripcion: 'Rotura de matriz en la calle principal, fluye gran cantidad de agua en la vía pública, amenazando con ingresar a casas contiguas.',
    fechaCreacion: '2026-06-28T08:15:00',
    prioridad: 'Urgente',
    estado: 'Resuelto',
    equipoAsignado: 'Cuadrilla de Emergencia Redes',
    comentariosAtencion: 'Se acudió al lugar de inmediato, se cerraron válvulas de compuerta del cuadrante, y se reemplazó tramo de PVC de 110mm que presentaba fractura longitudinal.',
    fechaResolucion: '2026-06-28T11:45:00'
  },
  {
    id: 'TCK-2026-002',
    clienteId: 'CLI-0042',
    clienteNombre: 'Ana Medina Rojas',
    categoria: 'Fuga en Medidor',
    descripcion: 'Filtración constante en la junta de la llave de paso de la caja de medidor. El sector está muy húmedo.',
    fechaCreacion: '2026-06-28T10:30:00',
    prioridad: 'Alta',
    estado: 'En Proceso',
    equipoAsignado: 'Cuadrilla Técnica A',
    comentariosAtencion: 'Inspeccionado, requiere cambio de empaquetadura cónica y tuerca de acople. Programado para resolución hoy.',
  },
  {
    id: 'TCK-2026-003',
    clienteId: 'CLI-0185',
    clienteNombre: 'Juan Delgado Silva',
    categoria: 'Alta Facturación',
    descripcion: 'El consumo facturado este mes duplicó mi promedio habitual de 18 m³ a 45 m³. Solicito revisión del medidor.',
    fechaCreacion: '2026-06-27T14:20:00',
    prioridad: 'Media',
    estado: 'Abierto',
    equipoAsignado: 'Oficina Comercial',
    comentariosAtencion: 'Asignado a revisión comercial. Se verificará lectura tomada en terreno por operador para descartar error de digitación.'
  },
  {
    id: 'TCK-2026-004',
    clienteId: 'CLI-0312',
    clienteNombre: 'María Carrasco Ibáñez',
    categoria: 'Taponamiento de Alcantarillado',
    descripcion: 'La cámara de inspección domiciliaria está colapsando al evacuar, agua servida comienza a rebalsar en el antejardín.',
    fechaCreacion: '2026-06-29T08:05:00',
    prioridad: 'Urgente',
    estado: 'En Proceso',
    equipoAsignado: 'Cuadrilla de Alcantarillado',
    comentariosAtencion: 'Operadores en ruta con camión desobstructor de alta presión para limpiar colector municipal.',
  },
  {
    id: 'TCK-2026-005',
    clienteId: 'CLI-0078',
    clienteNombre: 'Sofía Soto Vásquez',
    categoria: 'Problema de Presión',
    descripcion: 'Poca presión en toda la casa, el agua apenas sube al calefón del segundo piso.',
    fechaCreacion: '2026-06-26T11:10:00',
    prioridad: 'Baja',
    estado: 'Resuelto',
    equipoAsignado: 'Operaciones de Redes',
    comentariosAtencion: 'Se comprobó que el filtro de la llave de paso principal estaba obstruido por incrustaciones calcáreas. Se procedió a limpieza y soplado. Presión restablecida a 1.8 bar.',
    fechaResolucion: '2026-06-27T16:00:00'
  },
  {
    id: 'TCK-2026-006',
    clienteId: 'CLI-0912',
    clienteNombre: 'Daniela Paredes Campo',
    categoria: 'Solicitud de Conexión',
    descripcion: 'Solicito nueva factibilidad de servicio de agua potable y conexión de arranque domiciliario para vivienda en construcción.',
    fechaCreacion: '2026-06-25T09:40:00',
    prioridad: 'Media',
    estado: 'Abierto',
    equipoAsignado: 'Oficina Comercial',
    comentariosAtencion: 'Pendiente de inspección técnica de terreno para validar proximidad a la matriz de distribución principal.'
  },
  {
    id: 'TCK-2026-007',
    clienteId: 'CLI-0205',
    clienteNombre: 'Luis Ortega Peña',
    categoria: 'Consulta de Factura',
    descripcion: 'Quiero consultar si ya se aplicó el descuento del subsidio rural de agua potable decretado por el municipio.',
    fechaCreacion: '2026-06-29T09:12:00',
    prioridad: 'Baja',
    estado: 'Abierto',
    equipoAsignado: 'Atención al Cliente'
  }
];

// Water quality tests history
export const INITIAL_CALIDAD_AGUA: CalidadAgua[] = [
  {
    id: 'CAL-001',
    fecha: '2026-06-29',
    cloroLibre: 1.2, // mg/L
    pH: 7.4,
    turbiedad: 0.8, // UNT
    coliformesFecales: 'Ausencia',
    estadoExamen: 'Conforme'
  },
  {
    id: 'CAL-002',
    fecha: '2026-06-28',
    cloroLibre: 1.4,
    pH: 7.3,
    turbiedad: 1.1,
    coliformesFecales: 'Ausencia',
    estadoExamen: 'Conforme'
  },
  {
    id: 'CAL-003',
    fecha: '2026-06-27',
    cloroLibre: 0.9,
    pH: 7.5,
    turbiedad: 0.5,
    coliformesFecales: 'Ausencia',
    estadoExamen: 'Conforme'
  },
  {
    id: 'CAL-004',
    fecha: '2026-06-26',
    cloroLibre: 0.4, // un poco bajo del rango óptimo pero pasable legalmente (> 0.2)
    pH: 7.2,
    turbiedad: 1.5,
    coliformesFecales: 'Ausencia',
    estadoExamen: 'Conforme'
  },
  {
    id: 'CAL-005',
    fecha: '2026-06-25',
    cloroLibre: 1.1,
    pH: 7.4,
    turbiedad: 1.0,
    coliformesFecales: 'Ausencia',
    estadoExamen: 'Conforme'
  }
];

export const INITIAL_INTERRUPCIONES: InterrupcionAP[] = [
  {
    id: "INT-001",
    pozoId: "POZO-01",
    nombreCaptacion: "Pozo Principal El Arrayán",
    sector: "Norte",
    tipoInterrupcion: "Caso Fortuito",
    fechaInicio: "2026-06-15T08:30",
    fechaTermino: "2026-06-15T14:45",
    duracionHoras: 6.25,
    causa: "Falla electromecánica (Bomba / Motor)",
    clientesAfectados: 120,
    mitigacion: "Estanques Portátiles",
    comunicacionUsuarios: "No",
    estado: "Resuelta",
    observaciones: "Se realizó reemplazo de relé térmico quemado en el tablero eléctrico de la bomba."
  },
  {
    id: "INT-002",
    pozoId: "Todos",
    nombreCaptacion: "Sistema Completo (Red)",
    sector: "Todos",
    tipoInterrupcion: "Programado",
    fechaInicio: "2026-06-20T22:00",
    fechaTermino: "2026-06-21T03:30",
    duracionHoras: 5.5,
    causa: "Mantención programada preventiva",
    clientesAfectados: 1000,
    mitigacion: "Ninguna",
    comunicacionUsuarios: "Sí",
    estado: "Resuelta",
    observaciones: "Limpieza y desinfección programada del estanque de acumulación principal de 100m3."
  },
  {
    id: "INT-003",
    pozoId: "POZO-02",
    nombreCaptacion: "Pozo Secundario Los Copihues",
    sector: "Rural",
    tipoInterrupcion: "Fuerza mayor",
    fechaInicio: "2026-06-28T14:15",
    fechaTermino: "2026-06-28T19:30",
    duracionHoras: 5.25,
    causa: "Corte de suministro eléctrico (Compañía Eléctrica)",
    clientesAfectados: 250,
    mitigacion: "Camión Aljibe",
    comunicacionUsuarios: "Sí",
    estado: "Resuelta",
    observaciones: "Corte general de energía eléctrica de CGE debido a caída de rama sobre línea de media tensión."
  }
];

// Initial Pressure Points Data
export const INITIAL_PUNTOS_PRESION: PuntoMedicionPresion[] = [
  {
    id: 'PMP-EST-001',
    nombre: 'Cámara de Regulación Sector Centro',
    tipo: 'Estacionario',
    direccion: 'Av. Prat #420',
    cota: 185,
    instrumento: 'Sensor Transmisor Wika A-10',
    ultimaMantencion: '2026-04-10',
    estado: 'Operativo',
    lat: -33.7230,
    lng: -70.8610
  },
  {
    id: 'PMP-EST-002',
    nombre: 'Estación Elevadora Norte',
    tipo: 'Estacionario',
    direccion: 'Calle Los Alerces #150',
    cota: 210,
    instrumento: 'Datalogger Keller Leo 5',
    ultimaMantencion: '2026-05-18',
    estado: 'Operativo',
    lat: -33.7120,
    lng: -70.8550
  },
  {
    id: 'PMP-EST-003',
    nombre: 'Punto Alto Red Rural (Copa)',
    tipo: 'Estacionario',
    direccion: 'Camino Rinconada KM 4',
    cota: 275,
    instrumento: 'Manómetro de Carátula Ashcroft',
    ultimaMantencion: '2025-11-05',
    estado: 'Operativo',
    lat: -33.7460,
    lng: -70.8810
  },
  {
    id: 'PMP-MOV-001',
    nombre: 'Punto de Control Móvil - Sector Sur (Grifo Condell)',
    tipo: 'Móvil',
    direccion: 'Calle Condell / Esquina Prat',
    estado: 'Operativo',
    lat: -33.7310,
    lng: -70.8690
  },
  {
    id: 'PMP-MOV-002',
    nombre: 'Punto de Control Móvil - Calle Las Rosas #550',
    tipo: 'Móvil',
    direccion: 'Calle Las Rosas #550',
    estado: 'Operativo',
    lat: -33.7200,
    lng: -70.8710
  }
];

// Initial Pressure Measurements Logs Data
export const INITIAL_REGISTROS_PRESION: RegistroPresion[] = [
  {
    id: 'PRES-001',
    puntoId: 'PMP-EST-001',
    puntoNombre: 'Cámara de Regulación Sector Centro',
    tipoPunto: 'Estacionario',
    fechaHora: '2026-06-29T10:00',
    presionBar: 2.8,
    presionMca: 28.56,
    operador: 'Carlos Gómez',
    conformidad: 'Conforme',
    observaciones: 'Presión estable en horario punta mañana.'
  },
  {
    id: 'PRES-002',
    puntoId: 'PMP-EST-002',
    puntoNombre: 'Estación Elevadora Norte',
    tipoPunto: 'Estacionario',
    fechaHora: '2026-06-29T10:30',
    presionBar: 4.1,
    presionMca: 41.82,
    operador: 'Carlos Gómez',
    conformidad: 'Conforme',
    observaciones: 'Bomba operando con normalidad.'
  },
  {
    id: 'PRES-003',
    puntoId: 'PMP-EST-003',
    puntoNombre: 'Punto Alto Red Rural (Copa)',
    tipoPunto: 'Estacionario',
    fechaHora: '2026-06-29T11:15',
    presionBar: 1.2,
    presionMca: 12.24,
    operador: 'Pedro Martínez',
    conformidad: 'Baja Presión',
    observaciones: 'Presión bajo el mínimo regulatorio de 1.5 bar. Se sospecha de alto consumo en predios agrícolas colindantes.'
  },
  {
    id: 'PRES-004',
    puntoId: 'PMP-MOV-001',
    puntoNombre: 'Punto de Control Móvil - Sector Sur (Grifo Condell)',
    tipoPunto: 'Móvil',
    fechaHora: '2026-06-29T14:20',
    presionBar: 2.1,
    presionMca: 21.42,
    operador: 'Luis Ortega',
    conformidad: 'Conforme',
    observaciones: 'Medición tomada con manómetro portátil calibrado de terreno en grifo de incendio.'
  },
  {
    id: 'PRES-005',
    puntoId: 'PMP-MOV-002',
    puntoNombre: 'Punto de Control Móvil - Calle Las Rosas #550',
    tipoPunto: 'Móvil',
    fechaHora: '2026-06-29T15:45',
    presionBar: 1.8,
    presionMca: 18.36,
    operador: 'Luis Ortega',
    conformidad: 'Conforme',
    observaciones: 'Reclamo por baja presión resuelto: la presión en el medidor de entrada es adecuada.'
  }
];

// LocalStorage helpers to load/save state
export function loadState() {
  try {
    const clientes = localStorage.getItem('apya_clientes');
    const pozos = localStorage.getItem('apya_pozos');
    const tablas = localStorage.getItem('apya_tablas');
    const tickets = localStorage.getItem('apya_tickets');
    const calidad = localStorage.getItem('apya_calidad');
    const queue = localStorage.getItem('apya_offline_queue');
    const interrupciones = localStorage.getItem('apya_interrupciones');
    const puntosPresion = localStorage.getItem('apya_puntos_presion');
    const registrosPresion = localStorage.getItem('apya_registros_presion');

    return {
      clientes: clientes ? JSON.parse(clientes) : generar1000Clientes(),
      pozos: pozos ? JSON.parse(pozos) : INITIAL_POZOS,
      tablas: tablas ? JSON.parse(tablas) : INITIAL_TABLAS_CONTROL,
      tickets: tickets ? JSON.parse(tickets) : INITIAL_TICKETS,
      calidad: calidad ? JSON.parse(calidad) : INITIAL_CALIDAD_AGUA,
      interrupciones: interrupciones ? JSON.parse(interrupciones) : INITIAL_INTERRUPCIONES,
      offlineQueue: queue ? JSON.parse(queue) : [] as RegistroOffline[],
      puntosPresion: puntosPresion ? JSON.parse(puntosPresion) : INITIAL_PUNTOS_PRESION,
      registrosPresion: registrosPresion ? JSON.parse(registrosPresion) : INITIAL_REGISTROS_PRESION
    };
  } catch (e) {
    console.error('Error loading state from localStorage:', e);
    return {
      clientes: generar1000Clientes(),
      pozos: INITIAL_POZOS,
      tablas: INITIAL_TABLAS_CONTROL,
      tickets: INITIAL_TICKETS,
      calidad: INITIAL_CALIDAD_AGUA,
      interrupciones: INITIAL_INTERRUPCIONES,
      offlineQueue: [] as RegistroOffline[],
      puntosPresion: INITIAL_PUNTOS_PRESION,
      registrosPresion: INITIAL_REGISTROS_PRESION
    };
  }
}

export function saveState(state: {
  clientes: Cliente[];
  pozos: Pozo[];
  tablas: TablaControl[];
  tickets: Ticket[];
  calidad: CalidadAgua[];
  interrupciones?: InterrupcionAP[];
  offlineQueue?: RegistroOffline[];
  puntosPresion?: PuntoMedicionPresion[];
  registrosPresion?: RegistroPresion[];
}) {
  try {
    localStorage.setItem('apya_clientes', JSON.stringify(state.clientes));
    localStorage.setItem('apya_pozos', JSON.stringify(state.pozos));
    localStorage.setItem('apya_tablas', JSON.stringify(state.tablas));
    localStorage.setItem('apya_tickets', JSON.stringify(state.tickets));
    localStorage.setItem('apya_calidad', JSON.stringify(state.calidad));
    if (state.interrupciones) {
      localStorage.setItem('apya_interrupciones', JSON.stringify(state.interrupciones));
    }
    if (state.offlineQueue) {
      localStorage.setItem('apya_offline_queue', JSON.stringify(state.offlineQueue));
    }
    if (state.puntosPresion) {
      localStorage.setItem('apya_puntos_presion', JSON.stringify(state.puntosPresion));
    }
    if (state.registrosPresion) {
      localStorage.setItem('apya_registros_presion', JSON.stringify(state.registrosPresion));
    }
  } catch (e) {
    console.error('Error saving state to localStorage:', e);
  }
}
