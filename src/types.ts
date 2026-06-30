export interface Cliente {
  id: string;
  nombre: string;
  direccion: string;
  sector: 'Norte' | 'Sur' | 'Centro' | 'Rural';
  medidorId: string;
  qrCode: string;
  nfcUid: string;
  lecturaAnterior: number; // en m³
  lecturaActual?: number; // en m³
  consumoCalculado?: number; // en m³ (lecturaActual - lecturaAnterior)
  fechaLectura?: string;
  estado: 'Pendiente' | 'Leído' | 'Imposible de leer';
  causaNoLectura?: string;
  categoria: 'Residencial' | 'Comercial' | 'Industrial';
  alertaConsumo?: 'Ninguna' | 'Consumo Elevado' | 'Consumo Cero' | 'Lectura Menor';
  cota?: number; // Cota de altitud en m.s.n.m.
  estadoServicio?: 'Activo' | 'Inactivo';
}

export interface RegistroProfundidadBomba {
  fecha: string;
  profundidadAnterior: number;
  profundidadNueva: number;
  motivo?: string;
}

export interface Pozo {
  id: string;
  nombre: string;
  sector: string;
  capacidadNominal: number; // Litros por segundo
  volumenExtraidoMensual: number; // en m³
  profundidad: number; // en metros
  estado: 'Activo' | 'Mantenimiento' | 'Inactivo';
  ultimaInspeccion: string;
  horasFuncionamientoMensual?: number; // horas de funcionamiento acumulado mensual
  minutosFuncionamientoMensual?: number; // minutos de funcionamiento acumulado mensual
  nivelEstatico?: number; // en metros, completar cada max 15 dias
  nivelFreatico?: number; // en metros, completar cada max 15 dias
  fechaNiveles?: string; // ultima fecha en que se registraron los niveles
  profundidadBomba?: number; // en metros
  historialProfundidadBomba?: RegistroProfundidadBomba[]; // historial de cambios
}

export interface TablaControl {
  id: string;
  nombreTabla: string;
  descripcion: string;
  frecuenciaActualizacion: 'Diaria' | 'Semanal' | 'Mensual' | 'Semestral' | 'Anual';
  ultimaActualizacion: string;
  proximaActualizacionRequerida: string;
  estadoFrecuencia: 'Al día' | 'Próximo a vencer' | 'Retrasado';
  responsable: string;
}

export interface Ticket {
  id: string;
  clienteId?: string;
  clienteNombre: string;
  categoria: 'Rotura de Matriz' | 'Fuga en Medidor' | 'Alta Facturación' | 'Taponamiento de Alcantarillado' | 'Problema de Presión' | 'Consulta de Factura' | 'Solicitud de Conexión';
  descripcion: string;
  fechaCreacion: string;
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  estado: 'Abierto' | 'En Proceso' | 'Resuelto' | 'Cerrado';
  equipoAsignado: string;
  comentariosAtencion?: string;
  fechaResolucion?: string;
}

export interface CalidadAgua {
  id: string;
  fecha: string;
  cloroLibre: number; // mg/L (rango ideal: 0.5 - 2.0)
  pH: number; // (rango ideal: 6.5 - 8.5)
  turbiedad: number; // UNT (rango ideal: < 5)
  coliformesFecales: 'Ausencia' | 'Presencia';
  estadoExamen: 'Conforme' | 'No Conforme';
}

export interface RegistroOffline {
  id: string; // ID de cliente
  lecturaActual?: number;
  estado: 'Leído' | 'Imposible de leer';
  causaNoLectura?: string;
  fechaLectura: string;
  metodoCaptura: 'QR' | 'NFC' | 'Manual';
}

export const CAUSAS_NO_LECTURA = [
  'Predio Cerrado / Inaccesible',
  'Medidor Obstruido / Tapado por Tierra o Escombros',
  'Vidrio Empañado / Sucio / Rayado',
  'Medidor Dañado o Pantalla Rota',
  'Perro Agresivo en Predio',
  'Fuga de Agua Activa en Medidor',
  'Caja de Medidor Inundada',
  'Peligro en Zona / Orden Público'
];

export interface InterrupcionAP {
  id: string;
  pozoId: string; // ID of Pozo, or "Todos" (for general net)
  nombreCaptacion: string; // Pozo name or "Sistema Completo (Red)"
  sector: 'Norte' | 'Sur' | 'Centro' | 'Rural' | 'Todos';
  tipoInterrupcion: 'Fuerza mayor' | 'Caso Fortuito' | 'Programado';
  fechaInicio: string; // YYYY-MM-DDTHH:MM
  fechaTermino?: string; // YYYY-MM-DDTHH:MM
  duracionHoras?: number;
  causa: string;
  clientesAfectados: number;
  mitigacion: 'Camión Aljibe' | 'Estanques Portátiles' | 'Bypass de red' | 'Ninguna';
  comunicacionUsuarios: 'Sí' | 'No' | 'No aplica';
  estado: 'Activa' | 'Resuelta';
  observaciones?: string;
}

export const TIPOS_INTERRUPCION = ['Fuerza mayor', 'Caso Fortuito', 'Programado'] as const;

export const CAUSAS_INTERRUPCION = [
  'Falla electromecánica (Bomba / Motor)',
  'Corte de suministro eléctrico (Compañía Eléctrica)',
  'Rotura de matriz de distribución',
  'Mantención programada preventiva',
  'Problemas de calidad / Alta turbiedad',
  'Sequía / Disminución de caudal de pozo',
  'Fuga de agua importante detectada',
  'Otro'
];

export const MITIGACIONES_INTERRUPCION = [
  'Camión Aljibe',
  'Estanques Portátiles',
  'Bypass de red',
  'Ninguna'
] as const;

export const COMUNICACIONES_INTERRUPCION = ['Sí', 'No', 'No aplica'] as const;

export interface PuntoMedicionPresion {
  id: string;
  nombre: string;
  tipo: 'Estacionario' | 'Móvil';
  direccion: string;
  cota?: number; // Cota del punto (m.s.n.m.)
  instrumento?: string; // Tipo de instrumento de medición de presión estacionario
  ultimaMantencion?: string; // Fecha de última mantención del equipo de medición de presión (solo estacionario)
  estado: 'Operativo' | 'En Calibración' | 'Inactivo';
}

export interface RegistroPresion {
  id: string;
  puntoId: string;
  puntoNombre: string;
  tipoPunto: 'Estacionario' | 'Móvil';
  fechaHora: string; // YYYY-MM-DDTHH:MM
  presionBar: number; // en bar (rango normativo: 1.5 - 7.0 bar)
  presionMca: number; // en m.c.a. (metros de columna de agua, ~ bar * 10)
  operador: string;
  conformidad: 'Conforme' | 'Baja Presión' | 'Sobrepresión';
  observaciones?: string;
}


