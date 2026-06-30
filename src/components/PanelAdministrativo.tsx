import React, { useState, useMemo } from 'react';
import { 
  Cliente, Pozo, TablaControl, Ticket, CalidadAgua, InterrupcionAP,
  TIPOS_INTERRUPCION, CAUSAS_INTERRUPCION, MITIGACIONES_INTERRUPCION, COMUNICACIONES_INTERRUPCION,
  PuntoMedicionPresion, RegistroPresion
} from '../types';
import { 
  Activity, AlertTriangle, Droplet, Filter, CheckCircle, Clock, Plus, Search, 
  Database, FileText, Check, MapPin, User, Ticket as TicketIcon, Sliders, 
  ChevronLeft, ChevronRight, AlertOctagon, TrendingUp, ShieldAlert, Settings, ArrowUpRight,
  History, Wrench, ZapOff, Calendar, AlertCircle, Trash2, Edit, Gauge,
  Play, Power, FileEdit, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import MapaGeorreferenciado from './MapaGeorreferenciado';

interface PanelAdministrativoProps {
  clientes: Cliente[];
  pozos: Pozo[];
  tablasControl: TablaControl[];
  tickets: Ticket[];
  calidadAgua: CalidadAgua[];
  interrupciones: InterrupcionAP[];
  puntosPresion?: PuntoMedicionPresion[];
  registrosPresion?: RegistroPresion[];
  onUpdateClientes: (newClientes: Cliente[]) => void;
  onUpdatePozos: (newPozos: Pozo[]) => void;
  onUpdateTablasControl: (newTablas: TablaControl[]) => void;
  onUpdateTickets: (newTickets: Ticket[]) => void;
  onUpdateCalidadAgua: (newCalidad: CalidadAgua[]) => void;
  onUpdateInterrupciones: (newInterrupciones: InterrupcionAP[]) => void;
  onUpdatePuntosPresion?: (newPuntos: PuntoMedicionPresion[]) => void;
  onUpdateRegistrosPresion?: (newRegistros: RegistroPresion[]) => void;
}

export default function PanelAdministrativo({
  clientes,
  pozos,
  tablasControl,
  tickets,
  calidadAgua,
  interrupciones,
  puntosPresion = [],
  registrosPresion = [],
  onUpdateClientes,
  onUpdatePozos,
  onUpdateTablasControl,
  onUpdateTickets,
  onUpdateCalidadAgua,
  onUpdateInterrupciones,
  onUpdatePuntosPresion,
  onUpdateRegistrosPresion
}: PanelAdministrativoProps) {
  // Navigation inside administrative panel
  const [activeTab, setActiveTab] = useState<'resumen' | 'tablas' | 'tickets' | 'calidad' | 'continuidad' | 'presiones' | 'mapa'>('resumen');
  
  // Table selected inside tables tab
  const [selectedTableId, setSelectedTableId] = useState<string>('TAB-002'); // Lecturas Medidores
  
  // Search states
  const [searchClient, setSearchClient] = useState('');
  const [clientSectorFilter, setClientSectorFilter] = useState<string>('Todos');
  const [clientStatusFilter, setClientStatusFilter] = useState<string>('Todos');
  const [clientPage, setClientPage] = useState(1);
  const clientsPerPage = 12;

  // Ticket management states
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('Todos');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState<string>('Todos');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Modals / Creators
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [showAddWell, setShowAddWell] = useState(false);
  const [selectedWellForExtraction, setSelectedWellForExtraction] = useState<Pozo | null>(null);
  const [extractionAmount, setExtractionAmount] = useState<string>('');
  const [extractionHours, setExtractionHours] = useState<string>('');
  const [extractionMinutes, setExtractionMinutes] = useState<string>('');
  const [extractionDate, setExtractionDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Well Levels & Pump State Hooks
  const [selectedWellForLevels, setSelectedWellForLevels] = useState<Pozo | null>(null);
  const [staticLevel, setStaticLevel] = useState<string>('');
  const [phreaticLevel, setPhreaticLevel] = useState<string>('');
  const [levelsDate, setLevelsDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [selectedWellForPump, setSelectedWellForPump] = useState<Pozo | null>(null);
  const [pumpDepth, setPumpDepth] = useState<string>('');
  const [pumpChangeDate, setPumpChangeDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pumpChangeReason, setPumpChangeReason] = useState<string>('');

  const [selectedWellForHistory, setSelectedWellForHistory] = useState<Pozo | null>(null);

  // New Client Form State
  const [newClient, setNewClient] = useState({
    nombre: '',
    direccion: '',
    sector: 'Centro' as 'Norte' | 'Sur' | 'Centro' | 'Rural',
    categoria: 'Residencial' as 'Residencial' | 'Comercial' | 'Industrial',
    medidorId: '',
    lecturaAnterior: 0,
    cota: '',
    estadoServicio: 'Activo' as 'Activo' | 'Inactivo'
  });

  // Edit Client Form State
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [showEditClient, setShowEditClient] = useState(false);

  // Edit Reading Form State
  const [editingReadingClient, setEditingReadingClient] = useState<Cliente | null>(null);
  const [showEditReading, setShowEditReading] = useState(false);
  const [readingValue, setReadingValue] = useState<string>('');
  const [readingEstado, setReadingEstado] = useState<'Leído' | 'Imposible de leer' | 'Pendiente'>('Leído');
  const [readingCausa, setReadingCausa] = useState<string>('');

  // New Ticket Form State
  const [newTicket, setNewTicket] = useState({
    clienteNombre: '',
    clienteId: '',
    categoria: 'Fuga en Medidor' as Ticket['categoria'],
    prioridad: 'Media' as Ticket['prioridad'],
    descripcion: '',
    equipoAsignado: 'Cuadrilla Técnica A'
  });

  // New Well Form State
  const [newWell, setNewWell] = useState({
    nombre: '',
    sector: 'Centro',
    capacidadNominal: 10,
    volumenExtraidoMensual: 1000,
    profundidad: 50,
    estado: 'Activo' as 'Activo' | 'Mantenimiento' | 'Inactivo',
  });

  // --- Service Continuity (Continuidad de AP) States ---
  const [showAddInterrupcion, setShowAddInterrupcion] = useState(false);
  const [selectedInterrupcionForResolution, setSelectedInterrupcionForResolution] = useState<InterrupcionAP | null>(null);
  
  // Filtering and Search for Interrupciones
  const [interrupcionSearch, setInterrupcionSearch] = useState('');
  const [interrupcionTypeFilter, setInterrupcionTypeFilter] = useState<string>('Todos');
  const [interrupcionStatusFilter, setInterrupcionStatusFilter] = useState<string>('Todos');
  
  // New Interrupcion Form State
  const [newInterrupcion, setNewInterrupcion] = useState({
    pozoId: 'Todos',
    sector: 'Todos' as InterrupcionAP['sector'],
    tipoInterrupcion: 'Caso Fortuito' as InterrupcionAP['tipoInterrupcion'],
    fechaInicioDate: new Date().toISOString().split('T')[0],
    fechaInicioTime: '12:00',
    fechaTerminoDate: '',
    fechaTerminoTime: '',
    causa: 'Rotura de matriz de distribución',
    causaDetalle: '',
    clientesAfectados: 1000,
    mitigacion: 'Ninguna' as InterrupcionAP['mitigacion'],
    comunicacionUsuarios: 'No' as InterrupcionAP['comunicacionUsuarios'],
    observaciones: ''
  });

  // Resolution Form State
  const [resolutionDate, setResolutionDate] = useState(new Date().toISOString().split('T')[0]);
  const [resolutionTime, setResolutionTime] = useState('12:00');
  const [resolutionObservations, setResolutionObservations] = useState('');

  // Submit new Interrupción
  const handleAddInterrupcionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const id = `INT-${(interrupciones.length + 1).toString().padStart(3, '0')}`;
    const targetPozo = newInterrupcion.pozoId === 'Todos' 
      ? { id: 'Todos', nombre: 'Sistema Completo (Red)' } 
      : pozos.find(p => p.id === newInterrupcion.pozoId) || { id: 'Todos', nombre: 'Sistema Completo (Red)' };
      
    const fechaInicio = `${newInterrupcion.fechaInicioDate}T${newInterrupcion.fechaInicioTime}`;
    let fechaTermino: string | undefined = undefined;
    let duracionHoras: number | undefined = undefined;
    
    if (newInterrupcion.fechaTerminoDate && newInterrupcion.fechaTerminoTime) {
      fechaTermino = `${newInterrupcion.fechaTerminoDate}T${newInterrupcion.fechaTerminoTime}`;
      const diffMs = new Date(fechaTermino).getTime() - new Date(fechaInicio).getTime();
      if (diffMs > 0) {
        duracionHoras = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
      }
    }
    
    const causaFinal = newInterrupcion.causa === 'Otro' 
      ? (newInterrupcion.causaDetalle || 'Otro motivo')
      : newInterrupcion.causa;

    const interrupcionData: InterrupcionAP = {
      id,
      pozoId: newInterrupcion.pozoId,
      nombreCaptacion: targetPozo.nombre,
      sector: newInterrupcion.sector,
      tipoInterrupcion: newInterrupcion.tipoInterrupcion,
      fechaInicio,
      fechaTermino,
      duracionHoras,
      causa: causaFinal,
      clientesAfectados: Number(newInterrupcion.clientesAfectados),
      mitigacion: newInterrupcion.mitigacion,
      comunicacionUsuarios: newInterrupcion.comunicacionUsuarios,
      estado: fechaTermino ? 'Resuelta' : 'Activa',
      observaciones: newInterrupcion.observaciones
    };

    onUpdateInterrupciones([interrupcionData, ...interrupciones]);
    setShowAddInterrupcion(false);
    
    // Reset form
    setNewInterrupcion({
      pozoId: 'Todos',
      sector: 'Todos',
      tipoInterrupcion: 'Caso Fortuito',
      fechaInicioDate: new Date().toISOString().split('T')[0],
      fechaInicioTime: '12:00',
      fechaTerminoDate: '',
      fechaTerminoTime: '',
      causa: 'Rotura de matriz de distribución',
      causaDetalle: '',
      clientesAfectados: 1000,
      mitigacion: 'Ninguna',
      comunicacionUsuarios: 'No',
      observaciones: ''
    });
  };

  // Resolve active Interrupción
  const handleResolveInterrupcionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterrupcionForResolution) return;
    
    const fechaTermino = `${resolutionDate}T${resolutionTime}`;
    const diffMs = new Date(fechaTermino).getTime() - new Date(selectedInterrupcionForResolution.fechaInicio).getTime();
    let duracionHoras: number | undefined = undefined;
    if (diffMs > 0) {
      duracionHoras = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
    } else {
      duracionHoras = 0.5; // default minimum
    }
    
    const updatedInterrupciones = interrupciones.map(item => {
      if (item.id === selectedInterrupcionForResolution.id) {
        return {
          ...item,
          fechaTermino,
          duracionHoras,
          estado: 'Resuelta' as const,
          observaciones: resolutionObservations || item.observaciones
        };
      }
      return item;
    });
    
    onUpdateInterrupciones(updatedInterrupciones);
    setSelectedInterrupcionForResolution(null);
    setResolutionObservations('');
  };

  // Delete Interrupción
  const handleDeleteInterrupcion = (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este registro de interrupción?')) {
      const updated = interrupciones.filter(item => item.id !== id);
      onUpdateInterrupciones(updated);
    }
  };

  // --- Pressure Control States ---
  const [pressureSubTab, setPressureSubTab] = useState<'registros' | 'puntos'>('registros');
  const [presionSearch, setPresionSearch] = useState('');
  const [presionFilter, setPresionFilter] = useState<string>('Todos'); // Todos, Estacionario, Móvil
  const [presionConformityFilter, setPresionConformityFilter] = useState<string>('Todos'); // Todos, Conforme, Baja Presión, Sobrepresión

  const [showAddPuntoModal, setShowAddPuntoModal] = useState(false);
  const [showAddPresionModal, setShowAddPresionModal] = useState(false);

  // New Pressure Point form state
  const [newPunto, setNewPunto] = useState({
    nombre: '',
    tipo: 'Estacionario' as PuntoMedicionPresion['tipo'],
    direccion: '',
    cota: '',
    instrumento: '',
    ultimaMantencion: new Date().toISOString().split('T')[0],
    estado: 'Operativo' as PuntoMedicionPresion['estado']
  });

  // New Pressure Measurement log form state
  const [newPresion, setNewPresion] = useState({
    puntoId: '',
    fechaDate: new Date().toISOString().split('T')[0],
    fechaTime: '12:00',
    presionBar: '',
    operador: 'Carlos Gómez',
    observaciones: ''
  });

  // Submit new pressure point
  const handleAddPuntoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPunto.nombre || !newPunto.direccion) return;

    const id = `PMP-${newPunto.tipo === 'Estacionario' ? 'EST' : 'MOV'}-${(puntosPresion.length + 1).toString().padStart(3, '0')}`;
    
    const puntoData: PuntoMedicionPresion = {
      id,
      nombre: newPunto.nombre,
      tipo: newPunto.tipo,
      direccion: newPunto.direccion,
      cota: newPunto.tipo === 'Estacionario' && newPunto.cota ? Number(newPunto.cota) : undefined,
      instrumento: newPunto.tipo === 'Estacionario' ? (newPunto.instrumento || undefined) : undefined,
      ultimaMantencion: newPunto.tipo === 'Estacionario' ? (newPunto.ultimaMantencion || undefined) : undefined,
      estado: newPunto.estado
    };

    if (onUpdatePuntosPresion) {
      onUpdatePuntosPresion([...puntosPresion, puntoData]);
    }
    
    // Reset form & close
    setNewPunto({
      nombre: '',
      tipo: 'Estacionario',
      direccion: '',
      cota: '',
      instrumento: '',
      ultimaMantencion: new Date().toISOString().split('T')[0],
      estado: 'Operativo'
    });
    setShowAddPuntoModal(false);
  };

  // Delete pressure point
  const handleDeletePunto = (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este punto de medición? Se conservarán los registros de mediciones existentes pero el punto dejará de estar disponible.')) {
      if (onUpdatePuntosPresion) {
        onUpdatePuntosPresion(puntosPresion.filter(p => p.id !== id));
      }
    }
  };

  // Submit new pressure measurement
  const handleAddPresionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresion.puntoId || !newPresion.presionBar) return;

    const selectedPunto = puntosPresion.find(p => p.id === newPresion.puntoId);
    if (!selectedPunto) return;

    const id = `PRES-${(registrosPresion.length + 1).toString().padStart(3, '0')}`;
    const presionBar = Number(newPresion.presionBar);
    const presionMca = Number((presionBar * 10.2).toFixed(2)); // 1 bar = 10.2 meters of water column

    // Normative range in APR: 1.5 bar to 7.0 bar
    let conformidad: RegistroPresion['conformidad'] = 'Conforme';
    if (presionBar < 1.5) {
      conformidad = 'Baja Presión';
    } else if (presionBar > 7.0) {
      conformidad = 'Sobrepresión';
    }

    const presionData: RegistroPresion = {
      id,
      puntoId: newPresion.puntoId,
      puntoNombre: selectedPunto.nombre,
      tipoPunto: selectedPunto.tipo,
      fechaHora: `${newPresion.fechaDate}T${newPresion.fechaTime}`,
      presionBar,
      presionMca,
      operador: newPresion.operador,
      conformidad,
      observaciones: newPresion.observaciones || undefined
    };

    if (onUpdateRegistrosPresion) {
      onUpdateRegistrosPresion([presionData, ...registrosPresion]);
    }

    // Reset form & close
    setNewPresion({
      puntoId: '',
      fechaDate: new Date().toISOString().split('T')[0],
      fechaTime: '12:00',
      presionBar: '',
      operador: 'Carlos Gómez',
      observaciones: ''
    });
    setShowAddPresionModal(false);
  };

  // Delete pressure measurement
  const handleDeletePresion = (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta medición de presión registrada?')) {
      if (onUpdateRegistrosPresion) {
        onUpdateRegistrosPresion(registrosPresion.filter(r => r.id !== id));
      }
    }
  };

  // Export Presiones to CSV (Excel compatible with BOM and ;)
  const exportPresionesToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add UTF-8 BOM for Excel Spanish characters
    csvContent += "ID Registro;Punto de Medición;Tipo Punto;Fecha y Hora;Presión (bar);Presión (m.c.a.);Operador;Conformidad;Observaciones\n";
    
    registrosPresion.forEach(r => {
      const row = [
        r.id,
        r.puntoNombre,
        r.tipoPunto,
        r.fechaHora.replace('T', ' '),
        r.presionBar.toString().replace('.', ','),
        r.presionMca.toString().replace('.', ','),
        r.operador,
        r.conformidad,
        r.observaciones || 'Sin observaciones'
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(";");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Control_Presiones_APR_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Continuidad de AP to CSV (Excel compatible with BOM and ;)
  const exportContinuidadToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add UTF-8 BOM for Excel Spanish characters
    csvContent += "ID Registro;Fuente Afectada;Sector;Tipo de Interrupción;Fecha y Hora Inicio;Fecha y Hora Término;Duración (Horas);Causa o Motivo;Mitigación;Aviso previo;Estado;Observaciones\n";
    
    interrupciones.forEach(item => {
      const row = [
        item.id,
        `"${item.nombreCaptacion.replace(/"/g, '""')}"`,
        item.sector,
        item.tipoInterrupcion,
        item.fechaInicio.replace('T', ' '),
        item.fechaTermino ? item.fechaTermino.replace('T', ' ') : 'En curso',
        item.duracionHoras !== undefined ? item.duracionHoras : 'N/A',
        `"${item.causa.replace(/"/g, '""')}"`,
        item.mitigacion,
        item.comunicacionUsuarios,
        item.estado,
        item.observaciones ? `"${item.observaciones.replace(/"/g, '""')}"` : ""
      ].join(";");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Continuidad_Servicio_AP_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get 30-day moving average and threshold exceeded stats for a well
  const getWell30DayStats = (p: Pozo) => {
    const totalHoras = (p.horasFuncionamientoMensual || 0) + ((p.minutosFuncionamientoMensual || 0) / 60);
    const targetAverage = totalHoras / 30;

    // Distribute the total hours deterministically across 30 days based on well id
    const days: number[] = [];
    const seed = p.id === 'POZ-001' ? 123 : p.id === 'POZ-002' ? 456 : p.id === 'POZ-003' ? 789 : 111;
    
    let sum = 0;
    for (let i = 0; i < 30; i++) {
      // Create stable pseudo-random variations of working hours
      const variation = Math.sin(i * 1.9 + seed) * 0.4; // between -40% and +40%
      let dayHours = targetAverage * (1 + variation);
      dayHours = Math.max(0, Math.min(24, dayHours));
      days.push(dayHours);
      sum += dayHours;
    }

    // Normalize so that sum matches the totalHoras perfectly
    const factor = sum > 0 ? totalHoras / sum : 0;
    const finalDays = days.map(d => Math.max(0, Math.min(24, d * factor)));

    const averageHours = finalDays.reduce((acc, d) => acc + d, 0) / 30;
    const daysExceeded12h = finalDays.filter(d => d > 12).length;

    return {
      averageHours,
      daysExceeded12h,
      percentageOfLimit: (averageHours / 12) * 100
    };
  };

  // Get days elapsed since levels measurement date
  const getDaysSince = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    // Reset hours to compare dates only
    date.setHours(12, 0, 0, 0);
    today.setHours(12, 0, 0, 0);
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Export active tables to Excel-compatible CSV formats
  const exportToExcel = () => {
    // Generate CSV content for the clientes
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add UTF-8 BOM for Excel Spanish characters
    csvContent += "ID Cliente;Nombre;Dirección;Sector;Categoría;ID Medidor;Lectura Anterior;Lectura Actual;Consumo Calculado (m3);Fecha Lectura;Estado;Alerta\n";
    
    clientes.forEach(c => {
      const row = [
        c.id,
        `"${c.nombre.replace(/"/g, '""')}"`,
        `"${c.direccion.replace(/"/g, '""')}"`,
        c.sector,
        c.categoria,
        c.medidorId,
        c.lecturaAnterior,
        c.lecturaActual !== undefined ? c.lecturaActual : "",
        c.consumoCalculado !== undefined ? c.consumoCalculado : "",
        c.fechaLectura ? c.fechaLectura.split('T')[0] : "",
        c.estado,
        c.alertaConsumo ?? "Ninguna"
      ].join(";");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Consumos_Clientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export pozos to Excel-compatible CSV formats
  const exportPozosToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // UTF-8 BOM
    csvContent += "ID Pozo;Nombre de Captación;Sector Cobertura;Caudal Nominal (L/s);Volumen Extraído (m3);Tiempo Funcionamiento;Promedio Móvil 30d (h/día);Días Excedido (>12h);Porcentaje del Límite (%);Nivel Estático (m);Nivel Freático (m);Fecha Medición Niveles;Profundidad Bomba (m);Profundidad Total (m);Última Inspección;Estado Operativo\n";
    
    pozos.forEach(p => {
      const stats = getWell30DayStats(p);
      const tiempoFunc = `${p.horasFuncionamientoMensual || 0}h ${p.minutosFuncionamientoMensual || 0}m`;
      const row = [
        p.id,
        `"${p.nombre.replace(/"/g, '""')}"`,
        p.sector,
        p.capacidadNominal,
        p.volumenExtraidoMensual,
        `"${tiempoFunc}"`,
        stats.averageHours.toFixed(2),
        stats.daysExceeded12h,
        Math.round(stats.percentageOfLimit),
        p.nivelEstatico !== undefined ? p.nivelEstatico : 'N/A',
        p.nivelFreatico !== undefined ? p.nivelFreatico : 'N/A',
        p.fechaNiveles ?? 'N/A',
        p.profundidadBomba !== undefined ? p.profundidadBomba : 'N/A',
        p.profundidad,
        p.ultimaInspeccion,
        p.estado
      ].join(";");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Extraccion_Pozos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Water calculations
  const metrics = useMemo(() => {
    // Total extracted water (sum of active wells)
    const totalExtraido = pozos.reduce((acc, p) => acc + (p.estado === 'Activo' ? p.volumenExtraidoMensual : 0), 0);
    
    // Total registered consumption by clients so far
    let totalConsumido = 0;
    let medidoresLeidos = 0;
    let medidoresPendientes = 0;
    let medidoresNoLeidos = 0;

    clientes.forEach(c => {
      if (c.estado === 'Leído') {
        totalConsumido += c.consumoCalculado || 0;
        medidoresLeidos++;
      } else if (c.estado === 'Imposible de leer') {
        medidoresNoLeidos++;
      } else {
        medidoresPendientes++;
      }
    });

    // Estimate what the unread meters would consume based on previous average (e.g. 20m³ per client)
    const consumoEstimadoNoLeidos = (medidoresPendientes + medidoresNoLeidos) * 20;
    const totalConsumidoProyectado = totalConsumido + consumoEstimadoNoLeidos;

    // Deviations (Pérdidas físicas o comerciales / agua no facturada)
    const desviacionVolumen = Math.max(0, totalExtraido - totalConsumidoProyectado);
    const desviacionPorcentaje = totalExtraido > 0 ? (desviacionVolumen / totalExtraido) * 100 : 0;

    return {
      totalExtraido,
      totalConsumido,
      totalConsumidoProyectado,
      medidoresLeidos,
      medidoresPendientes,
      medidoresNoLeidos,
      desviacionVolumen,
      desviacionPorcentaje,
      progresoCenso: (medidoresLeidos + medidoresNoLeidos) / clientes.length * 100
    };
  }, [clientes, pozos]);

  // Sector breakdown data for Charts
  const sectorData = useMemo(() => {
    const sectores = ['Norte', 'Sur', 'Centro', 'Rural'];
    
    return sectores.map(sec => {
      // Extract from wells in this sector
      const pozosEnSector = pozos.filter(p => p.sector === sec && p.estado === 'Activo');
      const extraido = pozosEnSector.reduce((acc, p) => acc + p.volumenExtraidoMensual, 0);

      // Consumed in this sector
      const clientesEnSector = clientes.filter(c => c.sector === sec);
      let consumidoReal = 0;
      let countLeidos = 0;
      clientesEnSector.forEach(c => {
        if (c.estado === 'Leído') {
          consumidoReal += c.consumoCalculado || 0;
          countLeidos++;
        }
      });

      // Project unread clients in this sector
      const countPendientes = clientesEnSector.length - countLeidos;
      const consumidoProyectado = consumidoReal + (countPendientes * 19.5); // 19.5 m3/mes aprox

      // Deviation
      const perdida = Math.max(0, extraido - consumidoProyectado);
      const perdidaPct = extraido > 0 ? (perdida / extraido) * 100 : 0;

      return {
        name: sec,
        'Extraído (Pozos)': Math.round(extraido),
        'Consumido (Proyectado)': Math.round(consumidoProyectado),
        'Consumo Real (Leído)': Math.round(consumidoReal),
        'Desviación (Pérdida m³)': Math.round(perdida),
        'Porcentaje de Pérdida (%)': Math.round(perdidaPct * 10) / 10
      };
    });
  }, [clientes, pozos]);

  // Client categories data for Charts
  const categoryData = useMemo(() => {
    const categories = ['Residencial', 'Comercial', 'Industrial'];
    const COLORS = ['#0ea5e9', '#3b82f6', '#1d4ed8'];
    
    return categories.map((cat, idx) => {
      const filtered = clientes.filter(c => c.categoria === cat);
      const totalConsumido = filtered.reduce((acc, c) => acc + (c.estado === 'Leído' ? (c.consumoCalculado || 0) : 0), 0);
      return {
        name: cat,
        value: Math.round(totalConsumido),
        count: filtered.length,
        color: COLORS[idx]
      };
    }).filter(item => item.value > 0 || item.count > 0);
  }, [clientes]);

  // Client search and filter logic
  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const matchesSearch = c.nombre.toLowerCase().includes(searchClient.toLowerCase()) || 
                            c.id.toLowerCase().includes(searchClient.toLowerCase()) || 
                            c.medidorId.toLowerCase().includes(searchClient.toLowerCase());
      const matchesSector = clientSectorFilter === 'Todos' || c.sector === clientSectorFilter;
      const matchesStatus = clientStatusFilter === 'Todos' || c.estado === clientStatusFilter;
      return matchesSearch && matchesSector && matchesStatus;
    });
  }, [clientes, searchClient, clientSectorFilter, clientStatusFilter]);

  // Paginated clients
  const paginatedClientes = useMemo(() => {
    const startIndex = (clientPage - 1) * clientsPerPage;
    return filteredClientes.slice(startIndex, startIndex + clientsPerPage);
  }, [filteredClientes, clientPage]);

  const totalPages = Math.ceil(filteredClientes.length / clientsPerPage) || 1;

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch = t.clienteNombre.toLowerCase().includes(ticketSearch.toLowerCase()) || 
                            t.id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
                            t.descripcion.toLowerCase().includes(ticketSearch.toLowerCase());
      const matchesStatus = ticketStatusFilter === 'Todos' || t.estado === ticketStatusFilter;
      const matchesPriority = ticketPriorityFilter === 'Todos' || t.prioridad === ticketPriorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, ticketSearch, ticketStatusFilter, ticketPriorityFilter]);

  // Handler to update frequency on a table
  const handleUpdateFrequency = (tableId: string, frequency: TablaControl['frecuenciaActualizacion']) => {
    const updated = tablasControl.map(t => {
      if (t.id === tableId) {
        // Calculate dynamic next update required based on frequency from current time
        const now = new Date();
        let daysToAdd = 30;
        if (frequency === 'Diaria') daysToAdd = 1;
        else if (frequency === 'Semanal') daysToAdd = 7;
        else if (frequency === 'Mensual') daysToAdd = 30;
        else if (frequency === 'Semestral') daysToAdd = 180;
        else if (frequency === 'Anual') daysToAdd = 365;
        
        const nextDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        return {
          ...t,
          frecuenciaActualizacion: frequency,
          proximaActualizacionRequerida: nextDate.toISOString().split('T')[0],
          estadoFrecuencia: 'Al día' as const
        };
      }
      return t;
    });
    onUpdateTablasControl(updated);
  };

  // Add new client handler
  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.nombre || !newClient.medidorId) return;

    const newId = `CLI-${String(clientes.length + 1).padStart(4, '0')}`;
    const clientToAdd: Cliente = {
      id: newId,
      nombre: newClient.nombre,
      direccion: newClient.direccion || 'Dirección no especificada',
      sector: newClient.sector,
      categoria: newClient.categoria,
      medidorId: newClient.medidorId,
      qrCode: `https://agua-comunidad.cl/medidor/${newClient.medidorId}`,
      nfcUid: `04:${Math.floor(Math.random() * 255).toString(16).toUpperCase()}:2B:AA:89:FE:E0`,
      lecturaAnterior: Number(newClient.lecturaAnterior),
      estado: 'Pendiente',
      cota: newClient.cota ? Number(newClient.cota) : undefined,
      estadoServicio: newClient.estadoServicio
    };

    onUpdateClientes([clientToAdd, ...clientes]);
    setShowAddClient(false);
    // Reset form
    setNewClient({
      nombre: '',
      direccion: '',
      sector: 'Centro',
      categoria: 'Residencial',
      medidorId: '',
      lecturaAnterior: 0,
      cota: '',
      estadoServicio: 'Activo'
    });
  };

  // Edit client handler
  const handleEditClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editingClient.nombre || !editingClient.medidorId) return;

    const updatedClientes = clientes.map(c => {
      if (c.id === editingClient.id) {
        return editingClient;
      }
      return c;
    });

    onUpdateClientes(updatedClientes);
    setShowEditClient(false);
    setEditingClient(null);
  };

  // Toggle client service status (instead of delete, as requested by the user)
  const handleToggleClientStatus = (clientId: string) => {
    const client = clientes.find(c => c.id === clientId);
    if (!client) return;

    const currentStatus = client.estadoServicio || 'Activo';
    const newStatus: 'Activo' | 'Inactivo' = currentStatus === 'Inactivo' ? 'Activo' : 'Inactivo';
    const confirmMsg = newStatus === 'Inactivo'
      ? `¿Está seguro de que desea suspender/cerrar el servicio del cliente ${client.nombre} (${client.id})? El arranque y sus datos de consumo se mantendrán por ley.`
      : `¿Desea reactivar el servicio/arranque para el cliente ${client.nombre} (${client.id})?`;

    if (window.confirm(confirmMsg)) {
      const updatedClientes = clientes.map(c => {
        if (c.id === clientId) {
          return { ...c, estadoServicio: newStatus } as Cliente;
        }
        return c;
      });
      onUpdateClientes(updatedClientes);
    }
  };

  // Manual Reading Editor handler
  const handleEditReadingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReadingClient) return;

    const updatedClientes = clientes.map(c => {
      if (c.id === editingReadingClient.id) {
        if (readingEstado === 'Pendiente') {
          return {
            ...c,
            lecturaActual: undefined,
            consumoCalculado: undefined,
            estado: 'Pendiente' as const,
            fechaLectura: undefined,
            alertaConsumo: 'Ninguna' as const,
            causaNoLectura: undefined
          } as Cliente;
        } else if (readingEstado === 'Imposible de leer') {
          return {
            ...c,
            lecturaActual: undefined,
            consumoCalculado: undefined,
            estado: 'Imposible de leer' as const,
            causaNoLectura: readingCausa || 'No especificada',
            fechaLectura: new Date().toISOString(),
            alertaConsumo: 'Ninguna' as const
          } as Cliente;
        } else {
          const val = Number(readingValue);
          const consumo = Math.round((val - c.lecturaAnterior) * 10) / 10;
          let alertaConsumo: 'Ninguna' | 'Consumo Elevado' | 'Consumo Cero' | 'Lectura Menor' = 'Ninguna';
          if (consumo > 40) alertaConsumo = 'Consumo Elevado';
          else if (consumo === 0) alertaConsumo = 'Consumo Cero';
          else if (consumo < 0) alertaConsumo = 'Lectura Menor';

          return {
            ...c,
            lecturaActual: val,
            consumoCalculado: consumo,
            estado: 'Leído' as const,
            causaNoLectura: undefined,
            fechaLectura: new Date().toISOString(),
            alertaConsumo
          } as Cliente;
        }
      }
      return c;
    });

    onUpdateClientes(updatedClientes);
    setShowEditReading(false);
    setEditingReadingClient(null);
  };

  // Reset Reading to Pendiente
  const handleResetReading = (clientId: string) => {
    const client = clientes.find(c => c.id === clientId);
    if (!client) return;

    if (window.confirm(`¿Está seguro de que desea eliminar/resetear la lectura de este mes para ${client.nombre}? El registro volverá a quedar "Pendiente".`)) {
      const updatedClientes = clientes.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            lecturaActual: undefined,
            consumoCalculado: undefined,
            estado: 'Pendiente' as const,
            causaNoLectura: undefined,
            fechaLectura: undefined,
            alertaConsumo: 'Ninguna' as const
          };
        }
        return c;
      });
      onUpdateClientes(updatedClientes);
    }
  };

  // Add new ticket handler
  const handleAddTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.clienteNombre || !newTicket.descripcion) return;

    const newId = `TCK-2026-${String(tickets.length + 1).padStart(3, '0')}`;
    const ticketToAdd: Ticket = {
      id: newId,
      clienteNombre: newTicket.clienteNombre,
      clienteId: newTicket.clienteId || undefined,
      categoria: newTicket.categoria,
      prioridad: newTicket.prioridad,
      descripcion: newTicket.descripcion,
      fechaCreacion: new Date().toISOString(),
      estado: 'Abierto',
      equipoAsignado: newTicket.equipoAsignado
    };

    onUpdateTickets([ticketToAdd, ...tickets]);
    setShowAddTicket(false);
    setNewTicket({
      clienteNombre: '',
      clienteId: '',
      categoria: 'Fuga en Medidor',
      prioridad: 'Media',
      descripcion: '',
      equipoAsignado: 'Cuadrilla Técnica A'
    });
  };

  // Add new Well handler
  const handleAddWellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWell.nombre) return;

    const newId = `POZ-${String(pozos.length + 1).padStart(3, '0')}`;
    const wellToAdd: Pozo = {
      id: newId,
      nombre: newWell.nombre,
      sector: newWell.sector,
      capacidadNominal: Number(newWell.capacidadNominal),
      volumenExtraidoMensual: Number(newWell.volumenExtraidoMensual),
      profundidad: Number(newWell.profundidad),
      estado: newWell.estado,
      ultimaInspeccion: new Date().toISOString().split('T')[0]
    };

    onUpdatePozos([...pozos, wellToAdd]);
    setShowAddWell(false);
    setNewWell({
      nombre: '',
      sector: 'Centro',
      capacidadNominal: 10,
      volumenExtraidoMensual: 1000,
      profundidad: 50,
      estado: 'Activo',
    });
  };

  // Register Daily Well Extraction handler
  const handleRegisterExtractionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWellForExtraction) return;
    const amount = parseFloat(extractionAmount);
    if (isNaN(amount) || amount < 0) return;

    const hours = parseInt(extractionHours) || 0;
    const minutes = parseInt(extractionMinutes) || 0;

    const updatedPozos = pozos.map(p => {
      if (p.id === selectedWellForExtraction.id) {
        const currentHours = p.horasFuncionamientoMensual || 0;
        const currentMinutes = p.minutosFuncionamientoMensual || 0;
        
        const totalMin = currentMinutes + minutes;
        const extraHours = Math.floor(totalMin / 60);
        const finalMinutes = totalMin % 60;
        const finalHours = currentHours + hours + extraHours;

        return {
          ...p,
          volumenExtraidoMensual: p.volumenExtraidoMensual + amount,
          horasFuncionamientoMensual: finalHours,
          minutosFuncionamientoMensual: finalMinutes,
          ultimaInspeccion: extractionDate
        };
      }
      return p;
    });

    onUpdatePozos(updatedPozos);
    
    // Mark table "TAB-003" (Pozos de Captación) as updated today!
    if (onUpdateTablasControl && tablasControl) {
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const updatedTablas = tablasControl.map(t => {
        if (t.id === 'TAB-003') {
          return {
            ...t,
            ultimaActualizacion: today,
            proximaActualizacionRequerida: nextMonth,
            estadoFrecuencia: 'Al día' as const
          };
        }
        return t;
      });
      onUpdateTablasControl(updatedTablas);
    }

    setSelectedWellForExtraction(null);
    setExtractionAmount('');
    setExtractionHours('');
    setExtractionMinutes('');
  };

  // Register static & phreatic levels handler
  const handleRegisterLevelsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWellForLevels) return;
    const est = parseFloat(staticLevel);
    const fre = parseFloat(phreaticLevel);
    if (isNaN(est) || est < 0 || isNaN(fre) || fre < 0) return;

    const updatedPozos = pozos.map(p => {
      if (p.id === selectedWellForLevels.id) {
        return {
          ...p,
          nivelEstatico: est,
          nivelFreatico: fre,
          fechaNiveles: levelsDate
        };
      }
      return p;
    });

    onUpdatePozos(updatedPozos);

    setSelectedWellForLevels(null);
    setStaticLevel('');
    setPhreaticLevel('');
  };

  // Register pump depth change with history log
  const handleRegisterPumpDepthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWellForPump) return;
    const depth = parseFloat(pumpDepth);
    if (isNaN(depth) || depth < 0) return;

    const updatedPozos = pozos.map(p => {
      if (p.id === selectedWellForPump.id) {
        const currentDepth = p.profundidadBomba || 0;
        const history = p.historialProfundidadBomba || [];
        
        const changeRecord = {
          fecha: pumpChangeDate,
          profundidadAnterior: currentDepth,
          profundidadNueva: depth,
          motivo: pumpChangeReason || 'Ajuste de profundidad de bomba'
        };

        return {
          ...p,
          profundidadBomba: depth,
          historialProfundidadBomba: [changeRecord, ...history]
        };
      }
      return p;
    });

    onUpdatePozos(updatedPozos);

    setSelectedWellForPump(null);
    setPumpDepth('');
    setPumpChangeReason('');
  };

  // Ticket resolution status change
  const handleUpdateTicketStatus = (ticketId: string, status: Ticket['estado'], comments?: string) => {
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          estado: status,
          comentariosAtencion: comments || t.comentariosAtencion,
          fechaResolucion: status === 'Resuelto' || status === 'Cerrado' ? new Date().toISOString() : t.fechaResolucion
        };
      }
      return t;
    });
    onUpdateTickets(updated);
    
    // update current selected ticket reference
    const found = updated.find(u => u.id === ticketId);
    if (found) setSelectedTicket(found);
  };

  return (
    <div className="flex h-full w-full bg-slate-50 text-slate-800 font-sans" id="panel_admin_root">
      {/* Sidebar Navigation - Visible on medium+ screens */}
      <aside className="hidden md:flex w-64 bg-slate-900 flex-col shrink-0 border-r border-slate-800" id="admin_sidebar">
        <div className="p-5 border-b border-slate-800/60">
          <div className="flex items-center gap-3 text-blue-400 font-bold text-base font-display">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-500/20">
              <Droplet className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <span className="tracking-tight uppercase">AguaGestión</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1" id="sidebar_nav">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
              activeTab === 'resumen'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Dashboard General</span>
          </button>
          
          <button
            onClick={() => setActiveTab('tablas')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
              activeTab === 'tablas'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Configuración de Tablas</span>
          </button>
          
          <button
            onClick={() => setActiveTab('tickets')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
              activeTab === 'tickets'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <TicketIcon className="h-4 w-4" />
            <span className="flex-1">Gestión de Tickets</span>
            {tickets.filter(t => t.estado === 'Abierto' || t.estado === 'En Proceso').length > 0 && (
              <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                {tickets.filter(t => t.estado === 'Abierto' || t.estado === 'En Proceso').length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('calidad')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
              activeTab === 'calidad'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Parámetros de Calidad</span>
          </button>

          <button
            onClick={() => setActiveTab('continuidad')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
              activeTab === 'continuidad'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ZapOff className="h-4 w-4" />
            <span className="flex-1">Continuidad de AP</span>
            {interrupciones.filter(i => i.estado === 'Activa').length > 0 && (
              <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold font-mono animate-pulse">
                {interrupciones.filter(i => i.estado === 'Activa').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('presiones')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
              activeTab === 'presiones'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Gauge className="h-4 w-4" />
            <span>Control de Presiones</span>
          </button>

          <button
            onClick={() => setActiveTab('mapa')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
              activeTab === 'mapa'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            id="tab_btn_sidebar_mapa"
          >
            <MapPin className="h-4 w-4 text-sky-400" />
            <span className="flex-1">Mapeo GIS & Calor</span>
            <span className="bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">1K+ GPS</span>
          </button>
        </nav>
        
        <div className="p-4 border-t border-slate-800 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0 font-bold text-xs uppercase shadow-sm">
              CR
            </div>
            <div className="text-xs">
              <p className="text-white font-medium leading-tight">Ing. Carlos R.</p>
              <p className="text-slate-500 text-[10px] font-mono leading-none mt-0.5">Administrador Central</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden" id="admin_main_pane">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between shrink-0" id="admin_header">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600 rounded-lg text-white">
              <Droplet className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 font-display">Oficina Central de Control</h1>
              <p className="text-xs text-slate-500 font-mono">SISTEMA INTEGRAL DE AGUA POTABLE Y ALCANTARILLADO</p>
            </div>
          </div>

          {/* Top summary badge and actions */}
          <div className="mt-3 md:mt-0 flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-4 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs text-slate-600">
              <div>
                <span className="font-semibold block text-slate-900 text-right">Comunidad:</span>
                <span>1,000 Clientes</span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="font-semibold block text-slate-900 text-right">Progreso Lectura:</span>
                <span className="text-blue-600 font-medium">
                  {metrics.medidoresLeidos} de {clientes.length} ({Math.round(metrics.progresoCenso)}%)
                </span>
              </div>
            </div>

            <button
              onClick={exportToExcel}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
              id="export_excel_btn"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Generar Reporte Excel</span>
            </button>
          </div>
        </header>

        {/* Tabs Selector for mobile only */}
        <div className="bg-white border-b border-slate-200 px-6 flex md:hidden space-x-1 overflow-x-auto scrollbar-none shrink-0" id="admin_tabs">
        <button
          onClick={() => setActiveTab('resumen')}
          className={`py-3 px-4 font-medium text-sm border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'resumen' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab_btn_resumen"
        >
          <Activity className="h-4 w-4" />
          <span>Resumen de Pérdidas y Balance</span>
        </button>
        <button
          onClick={() => setActiveTab('tablas')}
          className={`py-3 px-4 font-medium text-sm border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'tablas' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab_btn_tablas"
        >
          <Database className="h-4 w-4" />
          <span>Tablas de Información ({tablasControl.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`py-3 px-4 font-medium text-sm border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'tickets' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab_btn_tickets"
        >
          <TicketIcon className="h-4 w-4" />
          <span>Tickets y Requerimientos</span>
          {tickets.filter(t => t.estado === 'Abierto' || t.estado === 'En Proceso').length > 0 && (
            <span className="bg-red-500 text-white text-xxs font-bold px-1.5 py-0.5 rounded-full">
              {tickets.filter(t => t.estado === 'Abierto' || t.estado === 'En Proceso').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('calidad')}
          className={`py-3 px-4 font-medium text-sm border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'calidad' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab_btn_calidad"
        >
          <Sliders className="h-4 w-4" />
          <span>Parámetros de Calidad</span>
        </button>
        <button
          onClick={() => setActiveTab('continuidad')}
          className={`py-3 px-4 font-medium text-sm border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'continuidad' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab_btn_continuidad"
        >
          <ZapOff className="h-4 w-4" />
          <span>Continuidad de AP</span>
          {interrupciones.filter(i => i.estado === 'Activa').length > 0 && (
            <span className="bg-red-500 text-white text-xxs font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              {interrupciones.filter(i => i.estado === 'Activa').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('presiones')}
          className={`py-3 px-4 font-medium text-sm border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'presiones' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab_btn_presiones"
        >
          <Gauge className="h-4 w-4" />
          <span>Control de Presiones</span>
        </button>

        <button
          onClick={() => setActiveTab('mapa')}
          className={`py-3 px-4 font-medium text-sm border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'mapa' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab_btn_mobile_mapa"
        >
          <MapPin className="h-4 w-4 text-sky-500" />
          <span>Mapeo GIS & Calor</span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6" id="admin_main_content">
        
        {/* ===================== TAB: RESUMEN / RECONCILIATION ===================== */}
        {activeTab === 'resumen' && (
          <div className="space-y-6" id="view_resumen">
            
            {/* Reconciliation Highlight Box */}
            <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white rounded-xl p-6 shadow-md border border-slate-800" id="water_balance_hero">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <span className="bg-sky-500/20 text-sky-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-sky-400/30">
                    Cálculo Automático de Desviaciones
                  </span>
                  <h2 className="text-2xl font-bold mt-2.5 tracking-tight">Reconciliación de Agua Potable (Balance Mensual)</h2>
                  <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                    Compara el caudal acumulado extraído de los pozos de captación contra la sumatoria de las lecturas registradas en los medidores domiciliarios de los clientes.
                  </p>
                </div>
                
                <div className="flex items-center space-x-4 bg-white/5 p-4 rounded-lg border border-white/10 shrink-0">
                  <div className="text-center px-4">
                    <span className="text-xs text-slate-400 block">Pérdida de Agua Estimada</span>
                    <span className={`text-2xl font-extrabold block font-mono ${metrics.desviacionPorcentaje > 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {metrics.desviacionPorcentaje.toFixed(1)}%
                    </span>
                    <span className="text-xxs text-slate-400">Objetivo Técnico: &lt;15%</span>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div className="text-center px-4">
                    <span className="text-xs text-slate-400 block">Censo Completado</span>
                    <span className="text-2xl font-extrabold block text-sky-400 font-mono">
                      {Math.round(metrics.progresoCenso)}%
                    </span>
                    <span className="text-xxs text-slate-400">{metrics.medidoresLeidos} de 1,000 leídos</span>
                  </div>
                </div>
              </div>

              {/* Stat grid inside hero */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10 font-mono">
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-xs text-slate-400 block">Volumen Extraído de Pozos</span>
                  <span className="text-xl font-bold text-white block">{metrics.totalExtraido.toLocaleString()} m³</span>
                  <span className="text-xxs text-slate-500">Macro-medidores activos</span>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-xs text-slate-400 block">Consumo Confirmado (Lecturas)</span>
                  <span className="text-xl font-bold text-sky-400 block">+{metrics.totalConsumido.toLocaleString()} m³</span>
                  <span className="text-xxs text-slate-500">Suma de lecturas reales</span>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-xs text-slate-400 block">Consumo Estimado (No Leídos)</span>
                  <span className="text-xl font-bold text-slate-300 block">+{((metrics.medidoresPendientes + metrics.medidoresNoLeidos) * 20).toLocaleString()} m³</span>
                  <span className="text-xxs text-slate-500">Estimación de predios pendientes</span>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <span className="text-xs text-rose-400 block">Desviación / Agua No Facturada</span>
                  <span className="text-xl font-bold text-rose-400 block">-{Math.round(metrics.desviacionVolumen).toLocaleString()} m³</span>
                  <span className="text-xxs text-rose-500/70">Filtraciones, hurtos o fallas</span>
                </div>
              </div>
            </div>

            {/* Warning alerts if deviations are high */}
            {metrics.desviacionPorcentaje > 15 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-800">Alerta de Desviación Elevada</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Las pérdidas de agua proyectadas superan el 15% del total extraído de los pozos. Se aconseja programar una campaña de detección de fugas nocturnas no visibles y revisar los medidores de consumo residencial con alertas de consumo cero o consumo negativo.
                  </p>
                </div>
              </div>
            )}

            {/* Dashboard grid for Charts and Sector info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chart: Extracted vs Consumed by Sector */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-sky-600" />
                    <span>Balance Hídrico por Sector Operacional</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Junio 2026</span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorData}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                      <Tooltip formatter={(value) => [`${value} m³`]} />
                      <Legend />
                      <Bar dataKey="Extraído (Pozos)" fill="#475569" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Consumido (Proyectado)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Desviación (Pérdida m³)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xxs text-slate-400 mt-2 text-center italic">
                  * La desviación representa el agua que se extrajo de las napas pero que no fue contabilizada por los medidores. Puede deberse a fugas en la red, medidores defectuosos, o llaves de paso públicas sin medidor.
                </p>
              </div>

              {/* Chart: Client Category Consumption */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 flex items-center space-x-2 mb-4">
                    <Sliders className="h-5 w-5 text-sky-600" />
                    <span>Consumo por Categoría Tarifaria</span>
                  </h3>
                  <div className="h-48 flex justify-center items-center relative w-full">
                    <div className="absolute flex flex-col justify-center items-center text-center pointer-events-none z-10 bg-white/80 backdrop-blur-[1px] p-3 rounded-full">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Consumo Total</span>
                      <span className="text-xl font-black text-slate-900 font-mono leading-none mt-1">
                        {metrics.totalConsumido.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 mt-0.5">m³</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ cx, cy, midAngle, outerRadius, percent }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = outerRadius + 12;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text
                                x={x}
                                y={y}
                                fill="#0f172a"
                                textAnchor={x > cx ? 'start' : 'end'}
                                dominantBaseline="central"
                                className="text-[10px] font-extrabold font-mono"
                              >
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                            );
                          }}
                          labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} m³`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {categoryData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1">
                      <div className="flex items-center space-x-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 font-mono">{item.value.toLocaleString()} m³ </span>
                        <span className="text-slate-400 text-xxs">({item.count} clientes)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Pozos Status Grid */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <Database className="h-4 w-4 text-sky-600" />
                  <span>Pozos de Captación Centralizados (Base de Datos Central)</span>
                </h3>
                <button 
                  onClick={() => setShowAddWell(true)}
                  className="text-xs bg-sky-600 text-white font-medium py-1.5 px-3 rounded-lg hover:bg-sky-700 flex items-center space-x-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Agregar Pozo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="pozos_grid">
                {pozos.map((p, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xxs text-slate-400 font-mono block">{p.id}</span>
                        <h4 className="font-semibold text-slate-900 text-sm mt-0.5">{p.nombre}</h4>
                        <div className="flex items-center space-x-1.5 mt-1 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>Sector {p.sector}</span>
                        </div>
                      </div>
                      
                      <span className={`text-xxs px-2 py-0.5 rounded-full font-semibold ${
                        p.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        p.estado === 'Mantenimiento' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {p.estado}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block text-xxs uppercase">Caudal Nominal</span>
                        <span className="font-bold text-slate-800">{p.capacidadNominal} L/s</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-xxs uppercase">Profundidad</span>
                        <span className="font-bold text-slate-800">{p.profundidad} metros</span>
                      </div>
                      <div className="col-span-2 bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100 flex flex-col gap-1">
                        <div className="flex justify-between items-center border-b border-slate-200/50 pb-1">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Volumen Extraído</span>
                            <span className="font-extrabold text-blue-700 text-sm">{p.volumenExtraidoMensual.toLocaleString()} m³</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Funcionamiento</span>
                            <span className="font-extrabold text-slate-800 text-xs">{p.horasFuncionamientoMensual || 0}h {p.minutosFuncionamientoMensual || 0}m</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>Última Insp: {p.ultimaInspeccion}</span>
                        </div>
                      </div>

                      {/* Niveles y Bomba Info */}
                      <div className="col-span-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 space-y-2 text-xxs font-mono">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                          <div>
                            <span className="text-slate-400 block text-[8px] uppercase font-semibold">Estático / Freático</span>
                            <span className="font-bold text-slate-800">
                              {p.nivelEstatico !== undefined ? `${p.nivelEstatico} m` : 'N/D'} / {p.nivelFreatico !== undefined ? `${p.nivelFreatico} m` : 'N/D'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block text-[8px] uppercase font-semibold">Prof. Bomba</span>
                            <span className="font-bold text-slate-800">
                              {p.profundidadBomba !== undefined ? `${p.profundidadBomba} m` : 'N/D'}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px]">
                          {(() => {
                            const days = getDaysSince(p.fechaNiveles);
                            if (days === null) {
                              return (
                                <span className="text-rose-600 font-bold flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>Sin niveles</span>
                                </span>
                              );
                            }
                            const overdue = days > 15;
                            return (
                              <span className={`font-bold inline-flex items-center gap-1 ${overdue ? 'text-rose-600 animate-pulse' : 'text-emerald-700'}`}>
                                {overdue ? (
                                  <>⚠️ Vencido ({days}d)</>
                                ) : (
                                  <>✓ Al día ({days}d)</>
                                )}
                              </span>
                            );
                          })()}
                          <span className="text-slate-400 text-[9px]">Medición: {p.fechaNiveles || 'Nunca'}</span>
                        </div>
                      </div>

                      {/* Alerta y Promedio Móvil 30d */}
                      {(() => {
                        const stats = getWell30DayStats(p);
                        const isExceeded = stats.averageHours > 12;
                        const isClose = stats.averageHours > 10 && stats.averageHours <= 12;
                        
                        return (
                          <div className={`col-span-2 border rounded-lg p-2.5 text-xxs space-y-1.5 transition-all ${
                            isExceeded ? 'bg-red-50/50 border-red-200' :
                            isClose ? 'bg-amber-50/50 border-amber-200' : 'bg-emerald-50/50 border-emerald-200/60'
                          }`}>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-bold">Promedio Móvil 30d:</span>
                              <span className={`font-extrabold font-mono text-xs ${
                                isExceeded ? 'text-red-700' :
                                isClose ? 'text-amber-700' : 'text-emerald-700'
                              }`}>
                                {stats.averageHours.toFixed(1)}h/día
                              </span>
                            </div>

                            {/* Limits progress bar */}
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden relative">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isExceeded ? 'bg-red-600 animate-pulse' :
                                  isClose ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, stats.percentageOfLimit)}%` }}
                              />
                            </div>

                            <div className="flex justify-between items-center text-[10px] pt-0.5">
                              <span className="text-slate-400">Límite: 12h/día</span>
                              <span className={`font-semibold ${
                                isExceeded ? 'text-red-700 font-bold' :
                                isClose ? 'text-amber-700' : 'text-emerald-700'
                              }`}>
                                {Math.round(stats.percentageOfLimit)}% del límite
                              </span>
                            </div>

                            {/* Days count alert */}
                            <div className={`mt-1.5 p-1 rounded-md border text-[10px] font-medium flex items-center gap-1.5 ${
                              isExceeded ? 'bg-red-100/60 border-red-200 text-red-800' :
                              isClose ? 'bg-amber-100/60 border-amber-200 text-amber-800' : 'bg-emerald-100/60 border-emerald-200/50 text-emerald-800'
                            }`}>
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>
                                {isExceeded ? (
                                  <>⚠️ <strong>{stats.daysExceeded12h} días</strong> sobrepasó las 12h</>
                                ) : isClose ? (
                                  <>⚡ <strong>{stats.daysExceeded12h} días</strong> sobrepasó las 12h</>
                                ) : (
                                  <>✓ <strong>{stats.daysExceeded12h} días</strong> sobrepasó las 12h</>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
                        <button
                          onClick={() => {
                            setSelectedWellForExtraction(p);
                            setExtractionAmount('');
                            setExtractionHours('');
                            setExtractionMinutes('');
                            setExtractionDate(new Date().toISOString().split('T')[0]);
                          }}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] py-1.5 rounded-lg border border-blue-200/60 transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Prod. Diaria</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedWellForLevels(p);
                            setStaticLevel(p.nivelEstatico?.toString() || '');
                            setPhreaticLevel(p.nivelFreatico?.toString() || '');
                            setLevelsDate(new Date().toISOString().split('T')[0]);
                          }}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] py-1.5 rounded-lg border border-emerald-200/60 transition-colors flex items-center justify-center gap-1"
                        >
                          <Droplet className="h-3.5 w-3.5" />
                          <span>Log Niveles</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedWellForPump(p);
                            setPumpDepth(p.profundidadBomba?.toString() || '');
                            setPumpChangeDate(new Date().toISOString().split('T')[0]);
                            setPumpChangeReason('');
                          }}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[10px] py-1.5 rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1"
                        >
                          <Wrench className="h-3.5 w-3.5" />
                          <span>Log Bomba</span>
                        </button>
                        {p.historialProfundidadBomba && p.historialProfundidadBomba.length > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedWellForHistory(p);
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] py-1.5 rounded-lg border border-indigo-200 transition-colors flex items-center justify-center gap-1"
                          >
                            <History className="h-3.5 w-3.5" />
                            <span>Historial ({p.historialProfundidadBomba.length})</span>
                          </button>
                        ) : (
                          <div className="bg-slate-50 text-slate-400 text-[10px] py-1.5 rounded-lg border border-dashed border-slate-200 flex items-center justify-center gap-1 cursor-not-allowed select-none">
                            <History className="h-3.5 w-3.5 opacity-50" />
                            <span>Sin Historial</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* List of unreadable meters causes */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center space-x-2">
                <ShieldAlert className="h-4.5 w-4.5 text-red-500" />
                <span>Resumen de Incidencias / Medidores No Leídos</span>
              </h3>
              
              {metrics.medidoresNoLeidos === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No se registran medidores con imposibilidad de lectura este mes.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-red-100 bg-red-50/20 rounded-lg p-4">
                    <span className="text-xs text-slate-500 block uppercase">Porcentaje de Obstrucción de Lectura</span>
                    <span className="text-2xl font-extrabold text-red-600 font-mono mt-1 block">
                      {((metrics.medidoresNoLeidos / clientes.length) * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-600 mt-1 block">
                      Equivale a <strong>{metrics.medidoresNoLeidos} predios</strong> de los {clientes.length} del catastro.
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-700 block">Distribución de Causas Declaradas:</span>
                    <div className="space-y-1.5 text-xs">
                      {/* Count actual causes declared */}
                      {Object.entries(
                        clientes.filter(c => c.estado === 'Imposible de leer').reduce((acc, curr) => {
                          const cause = curr.causaNoLectura || 'No especificada';
                          acc[cause] = (acc[cause] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([cause, count], index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-100">
                          <span className="text-slate-600 truncate max-w-xs">{cause}</span>
                          <span className="font-bold text-slate-900 font-mono bg-white px-1.5 rounded border border-slate-200 text-xxs">{count} predios</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ===================== TAB: TABLAS DE INFORMACIÓN / REGISTROS ===================== */}
        {activeTab === 'tablas' && (
          <div className="space-y-6" id="view_tablas">
            
            {/* Table Selector & Update Frequencies Panel */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="font-semibold text-slate-900 text-sm mb-4 uppercase tracking-wider flex items-center space-x-2">
                <Sliders className="h-4.5 w-4.5 text-sky-600" />
                <span>Control de Tablas y Frecuencias de Actualización Requeridas</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3" id="frequency_cards">
                {tablasControl.map((table, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedTableId(table.id);
                    }}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      selectedTableId === table.id 
                        ? 'border-sky-600 bg-sky-50/40 shadow-xs ring-2 ring-sky-600/15' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xxs font-bold text-slate-400 uppercase font-mono">{table.id}</span>
                        <span className={`text-xxs px-1.5 py-0.5 rounded-full font-semibold ${
                          table.estadoFrecuencia === 'Al día' ? 'bg-emerald-100 text-emerald-800' :
                          table.estadoFrecuencia === 'Próximo a vencer' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800 font-bold animate-pulse'
                        }`}>
                          {table.estadoFrecuencia}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-2">{table.nombreTabla}</h4>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 w-full text-xxs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400">Frecuencia:</span>
                        <select
                          value={table.frecuenciaActualizacion}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleUpdateFrequency(table.id, e.target.value as TablaControl['frecuenciaActualizacion']);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-slate-100 text-slate-700 font-bold px-1 rounded hover:bg-slate-200 border-none outline-none cursor-pointer focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="Diaria">Diaria</option>
                          <option value="Semanal">Semanal</option>
                          <option value="Mensual">Mensual</option>
                          <option value="Semestral">Semestral</option>
                          <option value="Anual">Anual</option>
                        </select>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 font-mono mt-1">
                        <span>Límite:</span>
                        <span className="font-semibold text-slate-700">{table.proximaActualizacionRequerida}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Display Selected Table Content */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              
              {/* Table Header Controls */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {tablasControl.find(t => t.id === selectedTableId)?.nombreTabla}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tablasControl.find(t => t.id === selectedTableId)?.descripcion}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xxs text-slate-500 font-mono">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      <strong>Responsable:</strong> {tablasControl.find(t => t.id === selectedTableId)?.responsable}
                    </span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      <strong>Frecuencia:</strong> {tablasControl.find(t => t.id === selectedTableId)?.frecuenciaActualizacion}
                    </span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      <strong>Último Guardado:</strong> {tablasControl.find(t => t.id === selectedTableId)?.ultimaActualizacion}
                    </span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      <strong>Próximo Vencimiento:</strong> {tablasControl.find(t => t.id === selectedTableId)?.proximaActualizacionRequerida}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(selectedTableId === 'TAB-001' || selectedTableId === 'TAB-002') && ( // Meter readings / clients
                    <>
                      {/* Filters */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar por nombre, ID o medidor..."
                          value={searchClient}
                          onChange={(e) => {
                            setSearchClient(e.target.value);
                            setClientPage(1);
                          }}
                          className="pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white w-48 md:w-64 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <select
                        value={clientSectorFilter}
                        onChange={(e) => {
                          setClientSectorFilter(e.target.value);
                          setClientPage(1);
                        }}
                        className="p-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="Todos">Todos los Sectores</option>
                        <option value="Norte">Norte</option>
                        <option value="Centro">Centro</option>
                        <option value="Sur">Sur</option>
                        <option value="Rural">Rural</option>
                      </select>

                      <select
                        value={clientStatusFilter}
                        onChange={(e) => {
                          setClientStatusFilter(e.target.value);
                          setClientPage(1);
                        }}
                        className="p-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="Todos">Todos los Estados</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Leído">Leído</option>
                        <option value="Imposible de leer">No Leídos</option>
                      </select>

                      <button
                        onClick={() => setShowAddClient(true)}
                        className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-1.5 px-3 rounded-lg text-xs flex items-center space-x-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Nuevo Cliente</span>
                      </button>
                    </>
                  )}

                  {selectedTableId === 'TAB-003' && (
                    <>
                      <button
                        onClick={exportPozosToExcel}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-3 rounded-lg text-xs flex items-center space-x-1"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Exportar Pozos a Excel</span>
                      </button>
                      <button
                        onClick={() => setShowAddWell(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-3 rounded-lg text-xs flex items-center space-x-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Nuevo Pozo</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* TABLE DATA RENDER */}
              <div className="overflow-x-auto">
                
                {/* 1. Clientes y Medidores Table */}
                {(selectedTableId === 'TAB-001' || selectedTableId === 'TAB-002') && (
                  <div className="min-w-full">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono font-bold text-xxs">
                          <th className="py-3 px-4">Código Cliente</th>
                          <th className="py-3 px-4">Cliente / Dirección</th>
                          <th className="py-3 px-4">Cota (m)</th>
                          <th className="py-3 px-4">Sector</th>
                          <th className="py-3 px-4">Tipo</th>
                          <th className="py-3 px-4">Medidor (NFC/QR)</th>
                          {selectedTableId === 'TAB-002' && (
                            <>
                              <th className="py-3 px-4 text-right">Lectura Anterior (m³)</th>
                              <th className="py-3 px-4 text-right">Lectura Actual (m³)</th>
                              <th className="py-3 px-4 text-right">Consumo (m³)</th>
                            </>
                          )}
                          <th className="py-3 px-4 text-center">Estado</th>
                          {selectedTableId === 'TAB-002' && <th className="py-3 px-4">Detalle / Alerta</th>}
                          <th className="py-3 px-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedClientes.length === 0 ? (
                          <tr>
                            <td colSpan={selectedTableId === 'TAB-002' ? 12 : 8} className="py-8 text-center text-slate-400">
                              Ningún cliente coincide con los filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          paginatedClientes.map((c) => (
                            <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${c.estadoServicio === 'Inactivo' ? 'bg-slate-50/50' : ''}`}>
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{c.id}</td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center space-x-2">
                                  <span className={`font-semibold text-slate-950 block ${c.estadoServicio === 'Inactivo' ? 'line-through text-slate-400 font-medium' : ''}`}>{c.nombre}</span>
                                  {c.estadoServicio === 'Inactivo' && (
                                    <span className="bg-rose-50 border border-rose-100 text-rose-700 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0">Inactivo</span>
                                  )}
                                </div>
                                <span className={`text-xxs block ${c.estadoServicio === 'Inactivo' ? 'text-slate-400' : 'text-slate-500'}`}>{c.direccion}</span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-700 font-medium">
                                {c.cota !== undefined ? `${c.cota} m` : '—'}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-600">{c.sector}</td>
                              <td className="py-3.5 px-4">
                                <span className={`text-xxs px-1.5 py-0.5 rounded font-semibold ${
                                  c.categoria === 'Industrial' ? 'bg-indigo-50 text-indigo-700' :
                                  c.categoria === 'Comercial' ? 'bg-sky-50 text-sky-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {c.categoria}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-semibold block font-mono text-slate-800">{c.medidorId}</span>
                                <span className="text-slate-400 text-xxs block font-mono leading-none">NFC: {c.nfcUid.split(':').slice(0,3).join(':')}...</span>
                              </td>
                              {selectedTableId === 'TAB-002' && (
                                <>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-600">
                                    {c.lecturaAnterior.toFixed(1)}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                                    {c.lecturaActual !== undefined ? c.lecturaActual.toFixed(1) : '-'}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold">
                                    {c.consumoCalculado !== undefined ? (
                                      <span className={c.consumoCalculado < 0 ? 'text-red-500' : 'text-sky-600'}>
                                        {c.consumoCalculado > 0 ? `+${c.consumoCalculado.toFixed(1)}` : c.consumoCalculado.toFixed(1)}
                                      </span>
                                    ) : '-'}
                                  </td>
                                </>
                              )}
                              <td className="py-3.5 px-4 text-center">
                                <span className={`text-xxs px-2 py-0.5 rounded-full font-bold inline-block border ${
                                  c.estado === 'Leído' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  c.estado === 'Imposible de leer' ? 'bg-red-50 text-red-700 border-red-200' :
                                  'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                  {c.estado}
                                </span>
                              </td>
                              {selectedTableId === 'TAB-002' && (
                                <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                                  {c.estado === 'Imposible de leer' ? (
                                    <span className="text-red-600 font-medium flex items-center space-x-1">
                                      <AlertOctagon className="h-3 w-3 shrink-0" />
                                      <span>{c.causaNoLectura}</span>
                                    </span>
                                  ) : c.alertaConsumo && c.alertaConsumo !== 'Ninguna' ? (
                                    <span className={`font-semibold px-1.5 py-0.5 rounded text-xxs flex items-center space-x-1 w-max ${
                                      c.alertaConsumo === 'Consumo Elevado' ? 'bg-red-100 text-red-800' :
                                      c.alertaConsumo === 'Consumo Cero' ? 'bg-amber-100 text-amber-800' :
                                      'bg-indigo-100 text-indigo-800'
                                    }`}>
                                      <AlertTriangle className="h-3 w-3 shrink-0" />
                                      <span>{c.alertaConsumo}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xxs font-mono">{c.fechaLectura ? c.fechaLectura.replace('T', ' ').slice(0, 16) : '-'}</span>
                                  )}
                                </td>
                              )}
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center space-x-1.5">
                                  {selectedTableId === 'TAB-001' ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingClient({ ...c });
                                          setShowEditClient(true);
                                        }}
                                        className="p-1 hover:bg-sky-50 text-sky-600 hover:text-sky-800 rounded transition-colors"
                                        title="Editar Catastro del Cliente"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleToggleClientStatus(c.id)}
                                        className={`p-1 rounded transition-colors ${
                                          c.estadoServicio === 'Inactivo'
                                            ? 'hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800'
                                            : 'hover:bg-rose-50 text-rose-600 hover:text-rose-800'
                                        }`}
                                        title={c.estadoServicio === 'Inactivo' ? 'Reactivar Servicio / Arranque' : 'Suspender Servicio / Desactivar Arranque'}
                                      >
                                        {c.estadoServicio === 'Inactivo' ? (
                                          <Play className="h-3.5 w-3.5" />
                                        ) : (
                                          <Power className="h-3.5 w-3.5" />
                                        )}
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingReadingClient({ ...c });
                                          setReadingValue(c.lecturaActual !== undefined ? String(c.lecturaActual) : '');
                                          setReadingEstado(c.estado);
                                          setReadingCausa(c.causaNoLectura || '');
                                          setShowEditReading(true);
                                        }}
                                        className="p-1 hover:bg-amber-50 text-amber-600 hover:text-amber-800 rounded transition-colors"
                                        title="Ingresar / Editar Lectura de Consumo"
                                      >
                                        <FileEdit className="h-3.5 w-3.5" />
                                      </button>
                                      {c.estado !== 'Pendiente' && (
                                        <button
                                          onClick={() => handleResetReading(c.id)}
                                          className="p-1 hover:bg-rose-50 text-rose-600 hover:text-rose-800 rounded transition-colors"
                                          title="Resetear / Eliminar Lectura Actual"
                                        >
                                          <RefreshCw className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    
                    {/* Pagination */}
                    <div className="py-3.5 px-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-slate-500 text-xs">
                      <span>Mostrando del <strong>{(clientPage - 1) * clientsPerPage + 1}</strong> al <strong>{Math.min(clientPage * clientsPerPage, filteredClientes.length)}</strong> de <strong>{filteredClientes.length}</strong> clientes</span>
                      <div className="flex items-center space-x-2">
                        <button
                          disabled={clientPage === 1}
                          onClick={() => setClientPage(prev => Math.max(1, prev - 1))}
                          className="p-1 border border-slate-200 rounded hover:bg-white disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="font-mono">Pág {clientPage} de {totalPages}</span>
                        <button
                          disabled={clientPage === totalPages}
                          onClick={() => setClientPage(prev => Math.min(totalPages, prev + 1))}
                          className="p-1 border border-slate-200 rounded hover:bg-white disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Pozos Table */}
                {selectedTableId === 'TAB-003' && (
                  <div className="min-w-full">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono font-bold text-xxs">
                          <th className="py-3 px-4">ID Pozo</th>
                          <th className="py-3 px-4">Nombre de Captación</th>
                          <th className="py-3 px-4">Sector</th>
                          <th className="py-3 px-4 text-right">Caudal (L/s)</th>
                          <th className="py-3 px-4 text-right">Volumen (m³)</th>
                          <th className="py-3 px-4 text-right">Tiempo Func.</th>
                          <th className="py-3 px-4 text-right">Prom. 30d</th>
                          <th className="py-3 px-4 text-center">Exceso (&gt;12h)</th>
                          <th className="py-3 px-4 text-right">Niveles (Est / Fre)</th>
                          <th className="py-3 px-4 text-center">Control 15 Días</th>
                          <th className="py-3 px-4 text-right">Prof. Bomba</th>
                          <th className="py-3 px-4 text-center">Estado</th>
                          <th className="py-3 px-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pozos.map((p) => {
                          const stats = getWell30DayStats(p);
                          const isExceeded = stats.averageHours > 12;
                          const isClose = stats.averageHours > 10 && stats.averageHours <= 12;
                          
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.id}</td>
                              <td className="py-3.5 px-4 font-semibold text-slate-950">{p.nombre}</td>
                              <td className="py-3.5 px-4 text-slate-600">{p.sector}</td>
                              <td className="py-3.5 px-4 text-right font-mono font-semibold">{p.capacidadNominal} L/s</td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-700">{p.volumenExtraidoMensual.toLocaleString()} m³</td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700">{p.horasFuncionamientoMensual || 0}h {p.minutosFuncionamientoMensual || 0}m</td>
                              <td className="py-3.5 px-4 text-right font-mono font-extrabold">
                                <span className={
                                  isExceeded ? 'text-red-600' :
                                  isClose ? 'text-amber-600' : 'text-emerald-600'
                                }>
                                  {stats.averageHours.toFixed(1)}h/d
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 ${
                                  isExceeded ? 'bg-red-50 text-red-700 border-red-200' :
                                  isClose ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span>{stats.daysExceeded12h}d</span>
                                </span>
                              </td>
                              {/* Niveles (Est/Fre) */}
                              <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-950">
                                {p.nivelEstatico !== undefined && p.nivelFreatico !== undefined ? (
                                  <div className="text-right">
                                    <span className="text-indigo-600 block text-[11px]">{p.nivelEstatico.toFixed(1)} m (Est)</span>
                                    <span className="text-teal-600 block text-[11px]">{p.nivelFreatico.toFixed(1)} m (Fre)</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">No registrado</span>
                                )}
                              </td>
                              {/* Control 15 Días */}
                              <td className="py-3.5 px-4 text-center">
                                {(() => {
                                  const days = getDaysSince(p.fechaNiveles);
                                  if (days === null) {
                                    return (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3 shrink-0" />
                                        <span>Sin registro</span>
                                      </span>
                                    );
                                  }
                                  const overdue = days > 15;
                                  return (
                                    <div className="flex flex-col items-center space-y-0.5 font-mono">
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 ${
                                        overdue 
                                          ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      }`}>
                                        {overdue ? (
                                          <>⚠️ {days}d (Vencido)</>
                                        ) : (
                                          <>✓ {days}d (Al día)</>
                                        )}
                                      </span>
                                      <span className="text-[9px] text-slate-400">{p.fechaNiveles}</span>
                                    </div>
                                  );
                                })()}
                              </td>
                              {/* Profundidad Bomba */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex flex-col items-end gap-1 font-mono">
                                  <div className="flex items-center gap-1 justify-end">
                                    <span className="font-bold text-slate-900">{p.profundidadBomba !== undefined ? `${p.profundidadBomba.toFixed(1)} m` : 'N/D'}</span>
                                    <span className="text-[10px] text-slate-400">/ {p.profundidad} m</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => {
                                        setSelectedWellForPump(p);
                                        setPumpDepth(p.profundidadBomba?.toString() || '');
                                        setPumpChangeDate(new Date().toISOString().split('T')[0]);
                                        setPumpChangeReason('');
                                      }}
                                      title="Cambiar profundidad de bomba"
                                      className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded border border-slate-200 transition-colors"
                                    >
                                      <Wrench className="h-3 w-3" />
                                    </button>
                                    {p.historialProfundidadBomba && p.historialProfundidadBomba.length > 0 && (
                                      <button
                                        onClick={() => {
                                          setSelectedWellForHistory(p);
                                        }}
                                        title="Ver historial de cambios de bomba"
                                        className="p-1 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded border border-slate-200 flex items-center gap-0.5 transition-colors"
                                      >
                                        <History className="h-3 w-3" />
                                        <span className="text-[9px] font-bold text-indigo-700">{p.historialProfundidadBomba.length}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`text-xxs px-2.5 py-0.5 rounded-full font-bold ${
                                  p.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' :
                                  p.estado === 'Mantenimiento' ? 'bg-amber-100 text-amber-800' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {p.estado}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex flex-col gap-1 items-center justify-center">
                                  <button
                                    onClick={() => {
                                      setSelectedWellForExtraction(p);
                                      setExtractionAmount('');
                                      setExtractionHours('');
                                      setExtractionMinutes('');
                                      setExtractionDate(new Date().toISOString().split('T')[0]);
                                    }}
                                    className="w-full text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold border border-blue-200 transition-colors text-center font-semibold"
                                  >
                                    Extracción
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedWellForLevels(p);
                                      setStaticLevel(p.nivelEstatico?.toString() || '');
                                      setPhreaticLevel(p.nivelFreatico?.toString() || '');
                                      setLevelsDate(new Date().toISOString().split('T')[0]);
                                    }}
                                    className="w-full text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-bold border border-emerald-200 transition-colors text-center font-semibold"
                                  >
                                    Niveles (15d)
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3. Water Quality Table */}
                {selectedTableId === 'TAB-004' && (
                  <div className="min-w-full">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono font-bold text-xxs">
                          <th className="py-3 px-4">ID Control</th>
                          <th className="py-3 px-4">Fecha Examen</th>
                          <th className="py-3 px-4 text-right">Cloro Residual (mg/L) [Rango: 0.5 - 2.0]</th>
                          <th className="py-3 px-4 text-right">pH (Unidades) [Rango: 6.5 - 8.5]</th>
                          <th className="py-3 px-4 text-right">Turbiedad (UNT) [Límite: &lt; 5]</th>
                          <th className="py-3 px-4">Microbiología (Fecales)</th>
                          <th className="py-3 px-4 text-center">Resultado Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {calidadAgua.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{c.id}</td>
                            <td className="py-3.5 px-4 font-semibold font-mono text-slate-800">{c.fecha}</td>
                            <td className="py-3.5 px-4 text-right font-mono">
                              <span className={c.cloroLibre < 0.5 || c.cloroLibre > 2.0 ? 'text-red-600 font-bold' : 'text-slate-800 font-semibold'}>
                                {c.cloroLibre.toFixed(2)} mg/L
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono">
                              <span className={c.pH < 6.5 || c.pH > 8.5 ? 'text-red-600 font-bold' : 'text-slate-800 font-semibold'}>
                                {c.pH.toFixed(1)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono">
                              <span className={c.turbiedad > 5 ? 'text-red-600 font-bold' : 'text-slate-800 font-semibold'}>
                                {c.turbiedad.toFixed(1)} UNT
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={c.coliformesFecales === 'Presencia' ? 'text-rose-600 font-extrabold' : 'text-emerald-700 font-medium'}>
                                {c.coliformesFecales}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`text-xxs px-2.5 py-0.5 rounded-full font-bold ${
                                c.estadoExamen === 'Conforme' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'
                              }`}>
                                {c.estadoExamen}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}


                
                {/* 5. Alcantarillado Table (not present but described as TAB-005) */}
                {selectedTableId === 'TAB-005' && (
                  <div className="p-8 text-center bg-white">
                    <Sliders className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h4 className="font-bold text-slate-800 text-sm">Bitácora de Mantenimiento de Alcantarillado (Frecuencia: Semanal)</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Esta tabla contiene las desobstrucciones y limpiezas de redes de colectores. Su estado actual es <strong className="text-rose-600">Retrasado</strong> desde el 2026-06-22 por falta de informe de terreno de la Cuadrilla de Redes.
                    </p>
                    <button 
                      onClick={() => {
                        const updated = tablasControl.map(t => {
                          if (t.id === 'TAB-005') {
                            return {
                              ...t,
                              ultimaActualizacion: new Date().toISOString().split('T')[0],
                              proximaActualizacionRequerida: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
                              estadoFrecuencia: 'Al día' as const
                            };
                          }
                          return t;
                        });
                        onUpdateTablasControl(updated);
                      }}
                      className="mt-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs"
                    >
                      Subir Informe y Poner Al Día
                    </button>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* ===================== TAB: TICKETS / REQUERIMIENTOS ===================== */}
        {activeTab === 'tickets' && (
          <div className="space-y-6" id="view_tickets">
            
            {/* Ticket Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Sistema de Seguimiento de Tickets de Atención</h2>
                <p className="text-xs text-slate-500">
                  Control centralizado de consultas de facturación, solicitudes de conexión, fugas detectadas y rebalses de alcantarillado.
                </p>
              </div>

              <button
                onClick={() => setShowAddTicket(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-lg text-xs flex items-center space-x-1 w-max"
              >
                <Plus className="h-4 w-4" />
                <span>Registrar Ticket / Consulta</span>
              </button>
            </div>

            {/* Filter bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar ticket, cliente o problema..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white w-full focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <select
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value)}
                className="p-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="Todos">Todos los Estados</option>
                <option value="Abierto">Abierto</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Resuelto">Resuelto</option>
                <option value="Cerrado">Cerrado</option>
              </select>

              <select
                value={ticketPriorityFilter}
                onChange={(e) => setTicketPriorityFilter(e.target.value)}
                className="p-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="Todos">Todas las Prioridades</option>
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>

            {/* Two Column Layout: List and Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="tickets_two_column">
              
              {/* Tickets List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden lg:col-span-2 flex flex-col h-[500px]">
                <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-600">
                  Tickets Filtrados ({filteredTickets.length})
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {filteredTickets.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No se encontraron tickets con los filtros activos.
                    </div>
                  ) : (
                    filteredTickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`w-full text-left p-4 hover:bg-slate-50/50 transition-colors flex items-start space-x-3 ${
                          selectedTicket?.id === t.id ? 'bg-sky-50/40 border-l-4 border-sky-600 pl-3' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xxs font-bold text-slate-400">{t.id}</span>
                            <span className="text-xxs text-slate-500 font-mono">{t.fechaCreacion.replace('T', ' ').slice(0, 16)}</span>
                          </div>

                          <h4 className="font-semibold text-slate-950 text-sm mt-0.5 truncate">{t.clienteNombre}</h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{t.descripcion}</p>

                          <div className="flex items-center space-x-2 mt-3">
                            <span className={`text-xxs px-2 py-0.5 rounded-full font-bold ${
                              t.prioridad === 'Urgente' ? 'bg-red-100 text-red-800' :
                              t.prioridad === 'Alta' ? 'bg-orange-100 text-orange-800' :
                              t.prioridad === 'Media' ? 'bg-sky-100 text-sky-800' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              Prioridad {t.prioridad}
                            </span>
                            
                            <span className={`text-xxs px-2 py-0.5 rounded-full font-bold ${
                              t.estado === 'Abierto' ? 'bg-blue-100 text-blue-800' :
                              t.estado === 'En Proceso' ? 'bg-amber-100 text-amber-800 font-medium' :
                              t.estado === 'Resuelto' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {t.estado}
                            </span>

                            <span className="text-xxs text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                              {t.categoria}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Ticket Details Panel */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 h-[500px] flex flex-col justify-between overflow-y-auto">
                {selectedTicket ? (
                  <div className="space-y-4 flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-xxs font-mono font-bold text-slate-400 block">{selectedTicket.id}</span>
                          <h3 className="font-bold text-slate-900 text-base">{selectedTicket.clienteNombre}</h3>
                          {selectedTicket.clienteId && (
                            <span className="text-xxs text-slate-500 font-mono">ID Cliente: {selectedTicket.clienteId}</span>
                          )}
                        </div>
                        <span className={`text-xxs px-2.5 py-1 rounded-full font-bold ${
                          selectedTicket.estado === 'Abierto' ? 'bg-blue-100 text-blue-800' :
                          selectedTicket.estado === 'En Proceso' ? 'bg-amber-100 text-amber-800' :
                          selectedTicket.estado === 'Resuelto' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {selectedTicket.estado}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xxs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-400 block uppercase">Clasificación</span>
                          <span className="font-bold text-slate-700">{selectedTicket.categoria}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase">Prioridad</span>
                          <span className={`font-bold ${
                            selectedTicket.prioridad === 'Urgente' ? 'text-red-600' : 'text-slate-700'
                          }`}>{selectedTicket.prioridad}</span>
                        </div>
                        <div className="mt-1.5">
                          <span className="text-slate-400 block uppercase">Equipo Asignado</span>
                          <span className="font-bold text-slate-700">{selectedTicket.equipoAsignado}</span>
                        </div>
                        <div className="mt-1.5">
                          <span className="text-slate-400 block uppercase">Creación</span>
                          <span className="font-bold text-slate-700">{selectedTicket.fechaCreacion.replace('T', ' ').slice(0, 16)}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Descripción del Problema</h4>
                        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed max-h-24 overflow-y-auto">
                          {selectedTicket.descripcion}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Bitácora de Resolución</h4>
                        {selectedTicket.comentariosAtencion ? (
                          <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-xs">
                            <p className="text-slate-700 leading-normal italic">
                              "{selectedTicket.comentariosAtencion}"
                            </p>
                            {selectedTicket.fechaResolucion && (
                              <span className="text-xxs text-emerald-600 font-mono mt-1.5 block">Resuelto el {selectedTicket.fechaResolucion.replace('T', ' ').slice(0, 16)}</span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No se han registrado comentarios de resolución aún.</p>
                        )}
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    {selectedTicket.estado !== 'Resuelto' && selectedTicket.estado !== 'Cerrado' && (
                      <div className="pt-4 border-t border-slate-100 space-y-2 shrink-0">
                        <span className="text-xxs font-bold text-slate-400 uppercase block">Actualizar Estado de Atención</span>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedTicket.estado === 'Abierto' && (
                            <button
                              onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'En Proceso')}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-1.5 px-3 rounded-lg text-xs"
                            >
                              Iniciar Trabajo
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const comment = prompt('Escriba el informe de resolución técnica:', 'Se subsana falla en terreno satisfactoriamente.');
                              if (comment) {
                                handleUpdateTicketStatus(selectedTicket.id, 'Resuelto', comment);
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs col-span-2"
                          >
                            Resolver Falla / Atendido
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-full text-slate-400">
                    <TicketIcon className="h-10 w-10 text-slate-300 mb-2" />
                    <span className="text-xs">Seleccione un ticket de la lista para ver el historial y aplicar acciones técnicas.</span>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ===================== TAB: CALIDAD DE AGUA ===================== */}
        {activeTab === 'calidad' && (
          <div className="space-y-6" id="view_calidad">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Control Químico Diario de Agua Potable</h2>
                  <p className="text-xs text-slate-500">Historial de monitoreo físico-químico obligatorio según la normativa de salud pública rural.</p>
                </div>

                <button
                  onClick={() => {
                    const id = `CAL-${String(calidadAgua.length + 1).padStart(3, '0')}`;
                    const cloro = 1.0 + Math.random() * 0.6;
                    const ph = 7.1 + Math.random() * 0.5;
                    const turb = 0.5 + Math.random() * 0.5;
                    const newTest: CalidadAgua = {
                      id,
                      fecha: new Date().toISOString().split('T')[0],
                      cloroLibre: Number(cloro.toFixed(2)),
                      pH: Number(ph.toFixed(1)),
                      turbiedad: Number(turb.toFixed(1)),
                      coliformesFecales: 'Ausencia',
                      estadoExamen: 'Conforme'
                    };
                    onUpdateCalidadAgua([newTest, ...calidadAgua]);
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center space-x-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tomar Muestra (Simular)</span>
                </button>
              </div>

              {/* Rango ideal indicator widgets */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl">
                  <span className="text-xxs text-slate-400 font-mono block uppercase">Cloro Residual Residual</span>
                  <span className="text-2xl font-extrabold text-slate-900 font-mono mt-1 block">0.5 - 2.0 <span className="text-xs font-normal">mg/L</span></span>
                  <p className="text-xxs text-slate-500 mt-2">Obligatorio para desinfectar bacterias y coliformes.</p>
                </div>
                <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl">
                  <span className="text-xxs text-slate-400 font-mono block uppercase">Potencial de Hidrógeno (pH)</span>
                  <span className="text-2xl font-extrabold text-slate-900 font-mono mt-1 block">6.5 - 8.5</span>
                  <p className="text-xxs text-slate-500 mt-2">Mantiene el agua neutra, evitando corrosión o incrustación.</p>
                </div>
                <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl">
                  <span className="text-xxs text-slate-400 font-mono block uppercase">Turbiedad Límite</span>
                  <span className="text-2xl font-extrabold text-slate-900 font-mono mt-1 block">&lt; 5.0 <span className="text-xs font-normal">UNT</span></span>
                  <p className="text-xxs text-slate-500 mt-2">Transparencia del agua. Valores mayores indican lodos.</p>
                </div>
                <div className="border border-emerald-100 bg-emerald-50/30 p-4 rounded-xl">
                  <span className="text-xxs text-emerald-500 font-mono block uppercase">Microbiología</span>
                  <span className="text-2xl font-extrabold text-emerald-700 font-mono mt-1 block">Ausencia</span>
                  <p className="text-xxs text-emerald-600 mt-2">Ausencia total de coliformes fecales en 100 mL.</p>
                </div>
              </div>

              {/* Quality chart */}
              <div className="h-64 border border-slate-100 p-3 rounded-xl bg-slate-50/30">
                <span className="text-xs font-bold text-slate-600 block mb-3 font-mono">TENDENCIA HISTÓRICA DEL CLORO LIBRE (Normativa: 0.5 - 2.0 mg/L)</span>
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={[...calidadAgua].reverse()}>
                    <XAxis dataKey="fecha" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 2.5]} />
                    <Tooltip formatter={(value) => [`${value} mg/L`]} />
                    <Area type="monotone" dataKey="cloroLibre" stroke="#0ea5e9" fill="#e0f2fe" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* ===================== TAB: CONTINUIDAD DE AP ===================== */}
        {activeTab === 'continuidad' && (() => {
          const activeCuts = interrupciones.filter(i => i.estado === 'Activa');
          const resolvedCuts = interrupciones.filter(i => i.estado === 'Resuelta');
          const totalAfectados = interrupciones.reduce((acc, i) => acc + i.clientesAfectados, 0);
          
          const avgDuration = resolvedCuts.length > 0 
            ? (resolvedCuts.reduce((acc, i) => acc + (i.duracionHoras || 0), 0) / resolvedCuts.length).toFixed(1)
            : '0.0';

          const filtered = interrupciones.filter(item => {
            const matchSearch = item.nombreCaptacion.toLowerCase().includes(interrupcionSearch.toLowerCase()) ||
                                item.causa.toLowerCase().includes(interrupcionSearch.toLowerCase()) ||
                                item.id.toLowerCase().includes(interrupcionSearch.toLowerCase()) ||
                                item.sector.toLowerCase().includes(interrupcionSearch.toLowerCase());
                                
            const matchType = interrupcionTypeFilter === 'Todos' || item.tipoInterrupcion === interrupcionTypeFilter;
            const matchStatus = interrupcionStatusFilter === 'Todos' || item.estado === interrupcionStatusFilter;
            
            return matchSearch && matchType && matchStatus;
          });

          return (
            <div className="space-y-6" id="view_continuidad">
              
              {/* Header and top-level actions */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Registro de Continuidad de AP (Agua Potable)</h2>
                  <p className="text-xs text-slate-500">Historial obligatorio y control de interrupciones al suministro conforme al estándar regulatorio.</p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={exportContinuidadToExcel}
                    className="bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 py-1.5 px-3 rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span>Exportar Continuidad (Excel)</span>
                  </button>

                  <button
                    onClick={() => {
                      setNewInterrupcion({
                        pozoId: 'Todos',
                        sector: 'Todos',
                        tipoInterrupcion: 'Caso Fortuito',
                        fechaInicioDate: new Date().toISOString().split('T')[0],
                        fechaInicioTime: '12:00',
                        fechaTerminoDate: '',
                        fechaTerminoTime: '',
                        causa: 'Rotura de matriz de distribución',
                        causaDetalle: '',
                        clientesAfectados: 1000,
                        mitigacion: 'Ninguna',
                        comunicacionUsuarios: 'No',
                        observaciones: ''
                      });
                      setShowAddInterrupcion(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center space-x-1 shadow-sm transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Registrar Interrupción</span>
                  </button>
                </div>
              </div>

              {/* KPI metrics cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
                  <div className="p-3 rounded-lg bg-slate-100 text-slate-600">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs font-mono block uppercase">Total Eventos</span>
                    <span className="text-xl font-bold text-slate-900 font-mono">{interrupciones.length}</span>
                    <span className="text-[10px] text-slate-500 block">Registrados en base central</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
                  <div className={`p-3 rounded-lg ${activeCuts.length > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
                    <ZapOff className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs font-mono block uppercase">Cortes en Curso</span>
                    <span className={`text-xl font-bold font-mono ${activeCuts.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {activeCuts.length}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {activeCuts.length > 0 ? 'Afectando servicio activo' : 'Servicio 100% operativo'}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs font-mono block uppercase">Duración Promedio</span>
                    <span className="text-xl font-bold text-slate-900 font-mono">{avgDuration} <span className="text-xs font-normal">hrs</span></span>
                    <span className="text-[10px] text-slate-500 block">En eventos resueltos</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
                  <div className="p-3 rounded-lg bg-indigo-100 text-indigo-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs font-mono block uppercase">Población Afectada</span>
                    <span className="text-xl font-bold text-slate-900 font-mono">{totalAfectados.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 block">Clientes acumulados</span>
                  </div>
                </div>
              </div>

              {/* Filters and search section */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por captación, causa o sector..."
                    value={interrupcionSearch}
                    onChange={(e) => setInterrupcionSearch(e.target.value)}
                    className="pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={interrupcionTypeFilter}
                  onChange={(e) => setInterrupcionTypeFilter(e.target.value)}
                  className="p-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Todos">Todos los Tipos</option>
                  <option value="Fuerza mayor">Fuerza Mayor</option>
                  <option value="Caso Fortuito">Caso Fortuito</option>
                  <option value="Programado">Programado</option>
                </select>

                <select
                  value={interrupcionStatusFilter}
                  onChange={(e) => setInterrupcionStatusFilter(e.target.value)}
                  className="p-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Todos">Todos los Estados</option>
                  <option value="Activa">Activa (En Curso)</option>
                  <option value="Resuelta">Resuelta</option>
                </select>
              </div>

              {/* Interruption list table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-600 flex justify-between items-center">
                  <span>Listado de Discontinuidades ({filtered.length})</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Orden cronológico descendente</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 font-mono">
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Captación / Red</th>
                        <th className="py-3 px-4">Sector</th>
                        <th className="py-3 px-4">Tipo</th>
                        <th className="py-3 px-4">Inicio</th>
                        <th className="py-3 px-4">Término / Reposición</th>
                        <th className="py-3 px-4 text-center">Duración (hrs)</th>
                        <th className="py-3 px-4">Causa / Mitigación</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                            No se registran interrupciones al suministro con los filtros activos.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((item) => {
                          const dateStart = new Date(item.fechaInicio);
                          const formattedStart = `${dateStart.toLocaleDateString('es-CL')} ${String(dateStart.getHours()).padStart(2, '0')}:${String(dateStart.getMinutes()).padStart(2, '0')}`;
                          
                          let formattedEnd = '—';
                          if (item.fechaTermino) {
                            const dateEnd = new Date(item.fechaTermino);
                            formattedEnd = `${dateEnd.toLocaleDateString('es-CL')} ${String(dateEnd.getHours()).padStart(2, '0')}:${String(dateEnd.getMinutes()).padStart(2, '0')}`;
                          }

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-500">{item.id}</td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-900 leading-tight">{item.nombreCaptacion}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{item.pozoId === 'Todos' ? 'General' : `ID: ${item.pozoId}`}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                                  {item.sector === 'Todos' ? 'Toda la Red' : `Sector ${item.sector}`}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                  item.tipoInterrupcion === 'Fuerza mayor'
                                    ? 'bg-red-50 text-red-600 border-red-100'
                                    : item.tipoInterrupcion === 'Caso Fortuito'
                                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                                      : 'bg-sky-50 text-sky-700 border-sky-100'
                                }`}>
                                  {item.tipoInterrupcion}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap">{formattedStart}</td>
                              <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap">
                                {item.estado === 'Activa' ? (
                                  <span className="text-red-500 font-bold flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <span>En curso</span>
                                  </span>
                                ) : formattedEnd}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono font-semibold">
                                {item.duracionHoras !== undefined ? `${item.duracionHoras} hrs` : '—'}
                              </td>
                              <td className="py-3.5 px-4 max-w-[200px]">
                                <div className="truncate font-medium text-slate-800" title={item.causa}>{item.causa}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-px rounded text-[9px] font-mono">
                                    Mitigación: {item.mitigacion}
                                  </span>
                                  <span className="text-slate-400 font-mono">|</span>
                                  <span className="text-slate-400">Aviso: {item.comunicacionUsuarios}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center w-fit gap-1 ${
                                  item.estado === 'Activa'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  <span className={`h-1 w-1 rounded-full ${item.estado === 'Activa' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                  <span>{item.estado}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  {item.estado === 'Activa' && (
                                    <button
                                      onClick={() => {
                                        setSelectedInterrupcionForResolution(item);
                                        setResolutionDate(new Date().toISOString().split('T')[0]);
                                        setResolutionTime(`${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`);
                                        setResolutionObservations('');
                                      }}
                                      className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded transition-colors"
                                      title="Declarar Resuelta / Reponer Servicio"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={() => handleDeleteInterrupcion(item.id)}
                                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded transition-colors"
                                    title="Eliminar Registro"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {filtered.length > 0 && (
                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex flex-col sm:flex-row gap-2 justify-between">
                    <span>* Los cortes por Fuerza Mayor y Caso Fortuito no requieren aviso previo. Cortes Programados requieren mínimo 24 horas de aviso.</span>
                    <span className="font-semibold text-slate-700">Afectación acumulada: {filtered.reduce((sum, item) => sum + item.clientesAfectados, 0)} clientes</span>
                  </div>
                )}
              </div>
              
              {/* Detailed observation logs block */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span>Bitácora de Observaciones Técnicas</span>
                </h3>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                  {interrupciones.filter(i => i.observaciones).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No hay notas de observaciones registradas para las interrupciones del servicio.</p>
                  ) : (
                    interrupciones.filter(i => i.observaciones).map(i => (
                      <div key={i.id} className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
                        <div className="flex justify-between items-center mb-1 font-mono text-[10px] text-slate-400">
                          <span className="font-bold text-slate-600">{i.id} — {i.nombreCaptacion}</span>
                          <span>Iniciado: {i.fechaInicio.replace('T', ' ')}</span>
                        </div>
                        <p className="text-slate-600 italic">"{i.observaciones}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          );
        })()}

        {/* ===================== TAB: CONTROL DE PRESIONES ===================== */}
        {activeTab === 'presiones' && (() => {
          // Filter records first
          const filteredReadings = registrosPresion.filter(r => {
            const matchSearch = r.puntoNombre.toLowerCase().includes(presionSearch.toLowerCase()) ||
                                r.operador.toLowerCase().includes(presionSearch.toLowerCase()) ||
                                (r.observaciones && r.observaciones.toLowerCase().includes(presionSearch.toLowerCase()));
            const matchType = presionFilter === 'Todos' || r.tipoPunto === presionFilter;
            const matchConformity = presionConformityFilter === 'Todos' || r.conformidad === presionConformityFilter;
            return matchSearch && matchType && matchConformity;
          });

          // Filter points
          const filteredPoints = puntosPresion.filter(p => {
            const matchSearch = p.nombre.toLowerCase().includes(presionSearch.toLowerCase()) ||
                                p.direccion.toLowerCase().includes(presionSearch.toLowerCase()) ||
                                (p.instrumento && p.instrumento.toLowerCase().includes(presionSearch.toLowerCase()));
            const matchType = presionFilter === 'Todos' || p.tipo === presionFilter;
            return matchSearch && matchType;
          });

          // Calculate statistics based on filtered readings
          const totalPoints = puntosPresion.length;
          const stationaryCount = puntosPresion.filter(p => p.tipo === 'Estacionario').length;
          const mobileCount = puntosPresion.filter(p => p.tipo === 'Móvil').length;

          const recentReadings = filteredReadings;
          const avgPressure = recentReadings.length > 0
            ? (recentReadings.reduce((acc, r) => acc + r.presionBar, 0) / recentReadings.length).toFixed(2)
            : '0.00';

          const lowPressureAlerts = recentReadings.filter(r => r.conformidad === 'Baja Presión').length;
          const overPressureAlerts = recentReadings.filter(r => r.conformidad === 'Sobrepresión').length;

          // Chart data (sorted chronologically from filtered records)
          const chartData = [...filteredReadings]
            .slice(0, 15)
            .reverse()
            .map(r => ({
              fecha: r.fechaHora.split('T')[0],
              punto: r.puntoNombre,
              presion: r.presionBar,
              mca: r.presionMca,
              minRange: 1.5,
              maxRange: 7.0
            }));

          return (
            <div className="space-y-6 animate-in fade-in duration-200" id="presiones_panel">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Gauge className="h-5.5 w-5.5 text-blue-600" />
                    <span>Control de Presiones de la Red de AP</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Administre los puntos de monitoreo y registre las mediciones de presión estacionarias y móviles. Rango normativo: 1.5 a 7.0 bar.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportPresionesToExcel}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Exportar Presiones</span>
                  </button>
                  {pressureSubTab === 'registros' ? (
                    <button
                      onClick={() => {
                        if (puntosPresion.length === 0) {
                          alert('Primero debe agregar al menos un punto de medición en la pestaña de "Puntos de Monitoreo".');
                          setPressureSubTab('puntos');
                        } else {
                          setShowAddPresionModal(true);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Registrar Medición</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAddPuntoModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Agregar Punto de Monitoreo</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Avg Pressure */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                    <Gauge className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xxs uppercase font-mono tracking-wider text-slate-400 font-bold block">Presión Promedio</span>
                    <span className="text-xl font-bold text-slate-900">{avgPressure} bar</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {recentReadings.length > 0 ? `${(Number(avgPressure)*10.2).toFixed(1)} m.c.a.` : 'Sin lecturas'}
                    </span>
                  </div>
                </div>

                {/* Stationary Instruments */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xxs uppercase font-mono tracking-wider text-slate-400 font-bold block">Puntos Estacionarios</span>
                    <span className="text-xl font-bold text-slate-900">{stationaryCount}</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Equipos fijos administrables</span>
                  </div>
                </div>

                {/* Mobile Points */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                    <History className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xxs uppercase font-mono tracking-wider text-slate-400 font-bold block">Lugares Móviles</span>
                    <span className="text-xl font-bold text-slate-900">{mobileCount}</span>
                    <span className="text-[10px] text-indigo-600 block mt-0.5 font-medium">Lecturas con equipo móvil</span>
                  </div>
                </div>

                {/* Alerts Count */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                  <div className={`p-3 rounded-lg shrink-0 ${lowPressureAlerts + overPressureAlerts > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xxs uppercase font-mono tracking-wider text-slate-400 font-bold block">Alertas Fuera de Rango</span>
                    <span className={`text-xl font-bold ${lowPressureAlerts + overPressureAlerts > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {lowPressureAlerts + overPressureAlerts}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {lowPressureAlerts} Baja Presión | {overPressureAlerts} Sobrepresión
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex border-b border-slate-200" id="pressure_sub_tabs">
                <button
                  onClick={() => { setPressureSubTab('registros'); setPresionSearch(''); }}
                  className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                    pressureSubTab === 'registros'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span>Historial de Presiones ({registrosPresion.length})</span>
                </button>
                <button
                  onClick={() => { setPressureSubTab('puntos'); setPresionSearch(''); }}
                  className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                    pressureSubTab === 'puntos'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sliders className="h-4 w-4" />
                  <span>Puntos de Monitoreo y Equipos ({puntosPresion.length})</span>
                </button>
              </div>

              {/* SUBTAB 1: HISTORIAL DE REGISTROS DE PRESIONES */}
              {pressureSubTab === 'registros' && (
                <div className="space-y-6">
                  {/* Filters Bar */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xxs flex flex-col lg:flex-row gap-3">
                    {/* Search bar */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por punto, operador u observaciones..."
                        value={presionSearch}
                        onChange={(e) => setPresionSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    {/* Filters dropdowns */}
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-medium">Tipo Punto:</span>
                        <select
                          value={presionFilter}
                          onChange={(e) => setPresionFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden"
                        >
                          <option value="Todos">Todos</option>
                          <option value="Estacionario">Estacionario</option>
                          <option value="Móvil">Móvil</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-medium">Conformidad:</span>
                        <select
                          value={presionConformityFilter}
                          onChange={(e) => setPresionConformityFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden"
                        >
                          <option value="Todos">Todos</option>
                          <option value="Conforme">Conforme (1.5 - 7.0 bar)</option>
                          <option value="Baja Presión">Baja Presión (&lt; 1.5 bar)</option>
                          <option value="Sobrepresión">Sobrepresión (&gt; 7.0 bar)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Recharts chart if there are readings */}
                  {chartData.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                      <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span>Curva de Comportamiento de Presión (Últimas 15 mediciones)</span>
                      </h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorPresion" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                            <YAxis domain={[0, 9]} tick={{ fontSize: 10 }} label={{ value: 'Presión (bar)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }} />
                            <Tooltip content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 text-white p-2.5 rounded-lg border border-slate-700 text-xxs font-sans shadow-lg">
                                    <p className="font-bold">{data.punto}</p>
                                    <p className="text-slate-400 mt-1">Fecha: {data.fecha}</p>
                                    <p className="text-blue-400 font-bold mt-0.5">Presión: {data.presion} bar ({data.mca} mca)</p>
                                  </div>
                                );
                              }
                              return null;
                            }} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Area type="monotone" dataKey="presion" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPresion)" name="Presión Registrada (bar)" />
                            <Area type="monotone" dataKey="minRange" stroke="#d97706" strokeWidth={1} strokeDasharray="3 3" fill="none" name="Límite Mínimo Normativo (1.5 bar)" />
                            <Area type="monotone" dataKey="maxRange" stroke="#dc2626" strokeWidth={1} strokeDasharray="3 3" fill="none" name="Límite Máximo Normativo (7.0 bar)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Readings Table */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xxs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                            <th className="py-3 px-4">Cod. Registro</th>
                            <th className="py-3 px-4">Punto de Monitoreo</th>
                            <th className="py-3 px-4">Tipo</th>
                            <th className="py-3 px-4">Fecha y Hora</th>
                            <th className="py-3 px-4 text-right">Presión (bar)</th>
                            <th className="py-3 px-4 text-right">Presión (m.c.a.)</th>
                            <th className="py-3 px-4">Conformidad</th>
                            <th className="py-3 px-4">Operador</th>
                            <th className="py-3 px-4">Observaciones</th>
                            <th className="py-3 px-4 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredReadings.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                                No se encontraron registros de presión que coincidan con los filtros aplicados.
                              </td>
                            </tr>
                          ) : (
                            filteredReadings.map((r) => (
                              <tr key={r.id} className="hover:bg-slate-50/50">
                                <td className="py-3 px-4 font-mono font-bold text-slate-700">{r.id}</td>
                                <td className="py-3 px-4 font-semibold text-slate-900">{r.puntoNombre}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    r.tipoPunto === 'Estacionario'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-indigo-50 text-indigo-700'
                                  }`}>
                                    {r.tipoPunto === 'Estacionario' ? 'Fijo Estacionario' : 'Equipo Móvil'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-500">{r.fechaHora.replace('T', ' ')}</td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{r.presionBar.toFixed(2)}</td>
                                <td className="py-3 px-4 text-right font-mono text-slate-500">{r.presionMca.toFixed(2)}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-sans uppercase ${
                                    r.conformidad === 'Conforme'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : r.conformidad === 'Baja Presión'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-red-100 text-red-800 border border-red-200'
                                  }`}>
                                    {r.conformidad}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-600 font-medium">{r.operador}</td>
                                <td className="py-3 px-4 max-w-xs truncate text-slate-500 italic" title={r.observaciones}>
                                  {r.observaciones || '—'}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => handleDeletePresion(r.id)}
                                    className="text-red-600 hover:text-red-900 p-1.5 rounded hover:bg-red-50 transition-colors inline-flex"
                                    title="Eliminar Registro"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: PUNTOS DE MONITOREO (ADMINISTRABLES) */}
              {pressureSubTab === 'puntos' && (
                <div className="space-y-6">
                  {/* Points Search Bar */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xxs flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar puntos de monitoreo, instrumentos o direcciones..."
                        value={presionSearch}
                        onChange={(e) => setPresionSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs shrink-0">
                      <span className="text-slate-400 font-medium">Filtrar por Tipo:</span>
                      <select
                        value={presionFilter}
                        onChange={(e) => setPresionFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden"
                      >
                        <option value="Todos">Todos</option>
                        <option value="Estacionario">Estacionario (Fijos)</option>
                        <option value="Móvil">Móvil (Rutas)</option>
                      </select>
                    </div>
                  </div>

                  {/* Points Grid Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPoints.length === 0 ? (
                      <div className="col-span-full bg-white border border-slate-200 p-12 rounded-xl text-center text-slate-400 italic">
                        No se encontraron puntos de medición de presión. Haga clic en "Agregar Punto" para registrar uno nuevo.
                      </div>
                    ) : (
                      filteredPoints.map((p) => {
                        // Check maintenance urgency (e.g. if last maintenance is > 180 days ago)
                        const needsMaintenance = p.tipo === 'Estacionario' && p.ultimaMantencion && (() => {
                          const lastDate = new Date(p.ultimaMantencion);
                          const ageInDays = (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
                          return ageInDays > 180;
                        })();

                        return (
                          <div
                            key={p.id}
                            className={`bg-white rounded-xl border p-5 shadow-xs transition-all duration-200 flex flex-col justify-between ${
                              p.estado === 'Operativo'
                                ? 'border-slate-200 hover:border-slate-300'
                                : 'border-amber-200 bg-amber-50/10'
                            }`}
                          >
                            <div>
                              {/* Card Header */}
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                    {p.id}
                                  </span>
                                  <h4 className="text-sm font-bold text-slate-900 mt-1 leading-tight">{p.nombre}</h4>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  p.tipo === 'Estacionario'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                }`}>
                                  {p.tipo === 'Estacionario' ? 'Estacionario (Fijo)' : 'Equipo Móvil'}
                                </span>
                              </div>

                              {/* Card Body */}
                              <div className="space-y-2.5 my-4 text-xs text-slate-600">
                                <div className="flex gap-2 items-start">
                                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                  <span><span className="font-semibold text-slate-700">Dirección:</span> {p.direccion}</span>
                                </div>

                                {p.tipo === 'Estacionario' && (
                                  <>
                                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 font-mono text-[11px]">
                                      <div>
                                        <span className="text-slate-400 block font-sans">Cota (Altitud):</span>
                                        <span className="font-bold text-slate-700">{p.cota} m.s.n.m.</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block font-sans">Instrumento:</span>
                                        <span className="font-bold text-slate-700 truncate block" title={p.instrumento}>{p.instrumento || 'No especificado'}</span>
                                      </div>
                                    </div>

                                    <div className="border-t border-slate-100 pt-2.5">
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Última Mantención:</span>
                                        <span className="font-mono font-bold text-slate-700">{p.ultimaMantencion}</span>
                                      </div>
                                      {needsMaintenance ? (
                                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded font-semibold border border-amber-100">
                                          <AlertCircle className="h-3 w-3 shrink-0" />
                                          <span>Requiere mantención (&gt; 6 meses)</span>
                                        </div>
                                      ) : (
                                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-semibold border border-emerald-100">
                                          <CheckCircle className="h-3 w-3 shrink-0" />
                                          <span>Mantención al día</span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}

                                {p.tipo === 'Móvil' && (
                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xxs text-slate-500 leading-relaxed italic">
                                    En estos lugares se utiliza equipamiento de medición portátil (manómetro móvil) para monitorear las presiones de la red de distribución en terreno.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Footer */}
                            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${
                                  p.estado === 'Operativo'
                                    ? 'bg-emerald-500'
                                    : p.estado === 'En Calibración'
                                    ? 'bg-amber-500'
                                    : 'bg-slate-400'
                                }`} />
                                <span className="font-semibold text-slate-700 text-xxs uppercase">{p.estado}</span>
                              </div>

                              <button
                                onClick={() => handleDeletePunto(p.id)}
                                className="text-red-500 hover:text-red-800 text-xxs font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Eliminar Punto</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'mapa' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <MapaGeorreferenciado
              clientes={clientes}
              pozos={pozos}
              puntosPresion={puntosPresion || []}
              tickets={tickets}
              interrupciones={interrupciones}
            />
          </div>
        )}

      </main>

      {/* MODAL: ADD CLIENT */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="modal_add_client">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Ingreso de Nuevo Cliente</h3>
            
            <form onSubmit={handleAddClientSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newClient.nombre}
                  onChange={(e) => setNewClient({...newClient, nombre: e.target.value})}
                  placeholder="Ej: Marcelo Castro Tapia"
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Dirección Domiciliaria</label>
                <input
                  type="text"
                  value={newClient.direccion}
                  onChange={(e) => setNewClient({...newClient, direccion: e.target.value})}
                  placeholder="Ej: Av. Las Rosas #440"
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sector *</label>
                  <select
                    value={newClient.sector}
                    onChange={(e) => setNewClient({...newClient, sector: e.target.value as any})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                  >
                    <option value="Norte">Sector Norte</option>
                    <option value="Centro">Sector Centro</option>
                    <option value="Sur">Sector Sur</option>
                    <option value="Rural">Sector Rural</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Categoría Tarifaria *</label>
                  <select
                    value={newClient.categoria}
                    onChange={(e) => setNewClient({...newClient, categoria: e.target.value as any})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                  >
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Código Medidor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: MED-99381"
                    value={newClient.medidorId}
                    onChange={(e) => setNewClient({...newClient, medidorId: e.target.value.toUpperCase()})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lectura Inicial (m³)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newClient.lecturaAnterior}
                    onChange={(e) => setNewClient({...newClient, lecturaAnterior: Number(e.target.value)})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cota de Altitud (m.s.n.m.)</label>
                  <input
                    type="number"
                    placeholder="Ej: 215"
                    value={newClient.cota}
                    onChange={(e) => setNewClient({...newClient, cota: e.target.value})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estado de Servicio *</label>
                  <select
                    value={newClient.estadoServicio || 'Activo'}
                    onChange={(e) => setNewClient({...newClient, estadoServicio: e.target.value as any})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                  >
                    <option value="Activo">Activo (Habilitado)</option>
                    <option value="Inactivo">Inactivo (Suspendido)</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2 rounded-lg border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 py-2 rounded-lg"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CLIENT */}
      {showEditClient && editingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="modal_edit_client">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Editar Catastro de Cliente: {editingClient.id}</h3>
            
            <form onSubmit={handleEditClientSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={editingClient.nombre}
                  onChange={(e) => setEditingClient({...editingClient, nombre: e.target.value})}
                  placeholder="Ej: Marcelo Castro Tapia"
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Dirección Domiciliaria</label>
                <input
                  type="text"
                  value={editingClient.direccion}
                  onChange={(e) => setEditingClient({...editingClient, direccion: e.target.value})}
                  placeholder="Ej: Av. Las Rosas #440"
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sector *</label>
                  <select
                    value={editingClient.sector}
                    onChange={(e) => setEditingClient({...editingClient, sector: e.target.value as any})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                  >
                    <option value="Norte">Sector Norte</option>
                    <option value="Centro">Sector Centro</option>
                    <option value="Sur">Sector Sur</option>
                    <option value="Rural">Sector Rural</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Categoría Tarifaria *</label>
                  <select
                    value={editingClient.categoria}
                    onChange={(e) => setEditingClient({...editingClient, categoria: e.target.value as any})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                  >
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Código Medidor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: MED-99381"
                    value={editingClient.medidorId}
                    onChange={(e) => setEditingClient({...editingClient, medidorId: e.target.value.toUpperCase()})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lectura Anterior (m³)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editingClient.lecturaAnterior}
                    onChange={(e) => setEditingClient({...editingClient, lecturaAnterior: Number(e.target.value)})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cota de Altitud (m.s.n.m.)</label>
                  <input
                    type="number"
                    placeholder="Ej: 215"
                    value={editingClient.cota || ''}
                    onChange={(e) => setEditingClient({...editingClient, cota: e.target.value ? Number(e.target.value) : undefined})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estado de Servicio *</label>
                  <select
                    value={editingClient.estadoServicio || 'Activo'}
                    onChange={(e) => setEditingClient({...editingClient, estadoServicio: e.target.value as 'Activo' | 'Inactivo'})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                  >
                    <option value="Activo">Activo (Habilitado)</option>
                    <option value="Inactivo">Inactivo (Suspendido)</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditClient(false);
                    setEditingClient(null);
                  }}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2 rounded-lg border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 py-2 rounded-lg"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT READING */}
      {showEditReading && editingReadingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="modal_edit_reading">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Registrar / Editar Lectura Mensual</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">
              Cliente: <span className="text-slate-800 font-bold">{editingReadingClient.nombre}</span> ({editingReadingClient.id})<br />
              Medidor: <span className="text-slate-800 font-mono font-bold">{editingReadingClient.medidorId}</span>
            </p>
            
            <form onSubmit={handleEditReadingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Estado de la Lectura *</label>
                <select
                  value={readingEstado}
                  onChange={(e) => setReadingEstado(e.target.value as any)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                >
                  <option value="Leído">Leído (Lectura Tomada Exitosamente)</option>
                  <option value="Imposible de leer">Imposible de leer (Problema de Acceso / Falla)</option>
                  <option value="Pendiente">Pendiente (Sin registrar aún)</option>
                </select>
              </div>

              {readingEstado === 'Leído' && (
                <>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block">Lectura Anterior:</span>
                      <span className="text-slate-900 font-mono font-bold text-sm">{editingReadingClient.lecturaAnterior.toFixed(1)} m³</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Consumo Estimado:</span>
                      <span className="text-slate-900 font-mono font-bold text-sm">
                        {readingValue ? `${Math.round((Number(readingValue) - editingReadingClient.lecturaAnterior) * 10) / 10} m³` : '—'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Lectura Actual (m³) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={readingValue}
                      onChange={(e) => setReadingValue(e.target.value)}
                      placeholder="Ej: 124.5"
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-mono"
                    />
                    {Number(readingValue) < editingReadingClient.lecturaAnterior && readingValue !== '' && (
                      <p className="text-xxs text-rose-600 font-semibold mt-1">
                        ⚠️ Alerta: La lectura actual es menor que la lectura anterior. Esto generará un consumo negativo.
                      </p>
                    )}
                  </div>
                </>
              )}

              {readingEstado === 'Imposible de leer' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Causa de No Lectura *</label>
                  <select
                    value={readingCausa}
                    onChange={(e) => setReadingCausa(e.target.value)}
                    required
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white text-xs"
                  >
                    <option value="">-- Seleccione Causa --</option>
                    <option value="Predio Cerrado / Inaccesible">Predio Cerrado / Inaccesible</option>
                    <option value="Medidor Obstruido / Tapado por Tierra o Escombros">Medidor Obstruido / Tapado</option>
                    <option value="Vidrio Empañado / Sucio / Rayado">Vidrio Empañado / Sucio</option>
                    <option value="Medidor Dañado o Pantalla Rota">Medidor Dañado o Pantalla Rota</option>
                    <option value="Perro Agresivo en Predio">Perro Agresivo en Predio</option>
                    <option value="Fuga de Agua Activa en Medidor">Fuga de Agua Activa en Medidor</option>
                    <option value="Caja de Medidor Inundada">Caja de Medidor Inundada</option>
                    <option value="Peligro en Zona / Orden Público">Peligro en Zona</option>
                  </select>
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditReading(false);
                    setEditingReadingClient(null);
                  }}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2 rounded-lg border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={readingEstado === 'Leído' && readingValue === ''}
                  className="flex-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 py-2 rounded-lg disabled:opacity-50 disabled:pointer-events-none"
                >
                  Guardar Lectura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD TICKET */}
      {showAddTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="modal_add_ticket">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Ingreso de Nuevo Ticket de Atención</h3>
            
            <form onSubmit={handleAddTicketSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Cliente solicitante *</label>
                <input
                  type="text"
                  required
                  value={newTicket.clienteNombre}
                  onChange={(e) => setNewTicket({...newTicket, clienteNombre: e.target.value})}
                  placeholder="Ej: Marcelo Castro Tapia"
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Clasificación de Falla *</label>
                  <select
                    value={newTicket.categoria}
                    onChange={(e) => setNewTicket({...newTicket, categoria: e.target.value as any})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white text-xs"
                  >
                    <option value="Fuga en Medidor">Fuga en Medidor</option>
                    <option value="Rotura de Matriz">Rotura de Matriz</option>
                    <option value="Taponamiento de Alcantarillado">Taponamiento de Alcantarillado</option>
                    <option value="Alta Facturación">Alta Facturación</option>
                    <option value="Problema de Presión">Problema de Presión</option>
                    <option value="Consulta de Factura">Consulta de Factura</option>
                    <option value="Solicitud de Conexión">Solicitud de Conexión</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Prioridad *</label>
                  <select
                    value={newTicket.prioridad}
                    onChange={(e) => setNewTicket({...newTicket, prioridad: e.target.value as any})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white text-xs"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Asignar Equipo Técnico *</label>
                <select
                  value={newTicket.equipoAsignado}
                  onChange={(e) => setNewTicket({...newTicket, equipoAsignado: e.target.value})}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white text-xs"
                >
                  <option value="Cuadrilla Técnica A">Cuadrilla Técnica A</option>
                  <option value="Cuadrilla de Emergencia Redes">Cuadrilla de Emergencia Redes</option>
                  <option value="Cuadrilla de Alcantarillado">Cuadrilla de Alcantarillado</option>
                  <option value="Oficina Comercial">Oficina Comercial</option>
                  <option value="Atención al Cliente">Atención al Cliente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción Detallada del Requerimiento *</label>
                <textarea
                  required
                  rows={3}
                  value={newTicket.descripcion}
                  onChange={(e) => setNewTicket({...newTicket, descripcion: e.target.value})}
                  placeholder="Detalle de la filtración, dirección exacta, observaciones generales..."
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddTicket(false)}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2 rounded-lg border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 py-2 rounded-lg"
                >
                  Crear Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD WELL */}
      {showAddWell && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="modal_add_well">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Ingreso de Nuevo Pozo de Captación</h3>
            
            <form onSubmit={handleAddWellSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Pozo / Ubicación *</label>
                <input
                  type="text"
                  required
                  value={newWell.nombre}
                  onChange={(e) => setNewWell({...newWell, nombre: e.target.value})}
                  placeholder="Ej: Pozo Los Aromos"
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sector *</label>
                  <select
                    value={newWell.sector}
                    onChange={(e) => setNewWell({...newWell, sector: e.target.value})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                  >
                    <option value="Norte">Norte</option>
                    <option value="Centro">Centro</option>
                    <option value="Sur">Sur</option>
                    <option value="Rural">Rural</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estado Operativo *</label>
                  <select
                    value={newWell.estado}
                    onChange={(e) => setNewWell({...newWell, estado: e.target.value as any})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xxs font-semibold text-slate-600 mb-1">Caudal (L/s)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newWell.capacidadNominal}
                    onChange={(e) => setNewWell({...newWell, capacidadNominal: Number(e.target.value)})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xxs font-semibold text-slate-600 mb-1">Profundidad (m)</label>
                  <input
                    type="number"
                    min="0"
                    value={newWell.profundidad}
                    onChange={(e) => setNewWell({...newWell, profundidad: Number(e.target.value)})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xxs font-semibold text-slate-600 mb-1">Extracción (m³)</label>
                  <input
                    type="number"
                    min="0"
                    value={newWell.volumenExtraidoMensual}
                    onChange={(e) => setNewWell({...newWell, volumenExtraidoMensual: Number(e.target.value)})}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddWell(false)}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2 rounded-lg border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 py-2 rounded-lg"
                >
                  Crear Pozo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER WELL EXTRACTION */}
      {selectedWellForExtraction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="modal_register_extraction">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-blue-600 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registrar Producción Diaria</h3>
                <p className="text-xxs text-slate-400 font-mono">POZO: {selectedWellForExtraction.id} - {selectedWellForExtraction.nombre}</p>
              </div>
            </div>

            <form onSubmit={handleRegisterExtractionSubmit} className="space-y-4 mt-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Volumen Extraído Acumulado:</span>
                  <span className="font-bold text-slate-950 font-mono">{selectedWellForExtraction.volumenExtraidoMensual.toLocaleString()} m³</span>
                </div>
                <div className="flex justify-between">
                  <span>Tiempo Funcionamiento Acumulado:</span>
                  <span className="font-bold text-slate-950 font-mono">
                    {selectedWellForExtraction.horasFuncionamientoMensual || 0}h {selectedWellForExtraction.minutosFuncionamientoMensual || 0}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Caudal de Operación:</span>
                  <span className="font-bold text-slate-950 font-mono">{selectedWellForExtraction.capacidadNominal} L/s</span>
                </div>
                <div className="flex justify-between">
                  <span>Último Reporte:</span>
                  <span className="font-mono">{selectedWellForExtraction.ultimaInspeccion}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Volumen Extraído Hoy (m³) *
                </label>
                <input
                  type="number"
                  required
                  min="0.1"
                  step="any"
                  value={extractionAmount}
                  onChange={(e) => setExtractionAmount(e.target.value)}
                  placeholder="Ej: 15.5 o 45.2"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Este volumen se sumará al total acumulado del pozo para el balance hídrico mensual.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Horas Funcionamiento *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="24"
                    value={extractionHours}
                    onChange={(e) => setExtractionHours(e.target.value)}
                    placeholder="Horas (0-24)"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Minutos Funcionamiento *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="59"
                    value={extractionMinutes}
                    onChange={(e) => setExtractionMinutes(e.target.value)}
                    placeholder="Minutos (0-59)"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha de la Medición / Registro *
                </label>
                <input
                  type="date"
                  required
                  value={extractionDate}
                  onChange={(e) => setExtractionDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWellForExtraction(null)}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2 rounded-lg border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 py-2 rounded-lg"
                >
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER STATIC & PHREATIC LEVELS */}
      {selectedWellForLevels && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="modal_register_levels">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-emerald-600 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Droplet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registrar Niveles de Acuífero (Control 15 Días)</h3>
                <p className="text-xxs text-slate-400 font-mono">POZO: {selectedWellForLevels.id} - {selectedWellForLevels.nombre}</p>
              </div>
            </div>

            <form onSubmit={handleRegisterLevelsSubmit} className="space-y-4 mt-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Profundidad Total Pozo:</span>
                  <span className="font-bold text-slate-950 font-mono">{selectedWellForLevels.profundidad} m</span>
                </div>
                <div className="flex justify-between">
                  <span>Nivel Estático Anterior:</span>
                  <span className="font-bold text-slate-950 font-mono">
                    {selectedWellForLevels.nivelEstatico !== undefined ? `${selectedWellForLevels.nivelEstatico} m` : 'No registrado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Nivel Freático Anterior:</span>
                  <span className="font-bold text-slate-950 font-mono">
                    {selectedWellForLevels.nivelFreatico !== undefined ? `${selectedWellForLevels.nivelFreatico} m` : 'No registrado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Última Medición:</span>
                  <span className="font-mono">{selectedWellForLevels.fechaNiveles || 'Sin fecha'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nivel Estático (m) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={staticLevel}
                    onChange={(e) => setStaticLevel(e.target.value)}
                    placeholder="Ej: 18.5"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Nivel de agua en reposo</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nivel Freático / Dinámico (m) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={phreaticLevel}
                    onChange={(e) => setPhreaticLevel(e.target.value)}
                    placeholder="Ej: 32.2"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Nivel de agua en bombeo</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha de la Medición *
                </label>
                <input
                  type="date"
                  required
                  value={levelsDate}
                  onChange={(e) => setLevelsDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Este control de nivel estático y dinámico se debe registrar con una frecuencia máxima de 15 días.</p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWellForLevels(null)}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2 rounded-lg border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 py-2 rounded-lg"
                >
                  Guardar Niveles
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER PUMP DEPTH ADJUSTMENT */}
      {selectedWellForPump && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="modal_register_pump">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-slate-700 mb-2">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Wrench className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ajuste de Profundidad de Bomba</h3>
                <p className="text-xxs text-slate-400 font-mono">POZO: {selectedWellForPump.id} - {selectedWellForPump.nombre}</p>
              </div>
            </div>

            <form onSubmit={handleRegisterPumpDepthSubmit} className="space-y-4 mt-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Profundidad Pozo:</span>
                  <span className="font-bold text-slate-950 font-mono">{selectedWellForPump.profundidad} m</span>
                </div>
                <div className="flex justify-between">
                  <span>Profundidad Bomba Actual:</span>
                  <span className="font-bold text-slate-950 font-mono">
                    {selectedWellForPump.profundidadBomba !== undefined ? `${selectedWellForPump.profundidadBomba} m` : 'No asignada'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Nivel Estático actual:</span>
                  <span className="font-bold text-slate-950 font-mono">
                    {selectedWellForPump.nivelEstatico !== undefined ? `${selectedWellForPump.nivelEstatico} m` : 'No registrado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Nivel Freático actual:</span>
                  <span className="font-bold text-slate-950 font-mono">
                    {selectedWellForPump.nivelFreatico !== undefined ? `${selectedWellForPump.nivelFreatico} m` : 'No registrado'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nueva Profundidad de la Bomba (m) *
                </label>
                <input
                  type="number"
                  required
                  min="0.1"
                  max={selectedWellForPump.profundidad}
                  step="any"
                  value={pumpDepth}
                  onChange={(e) => setPumpDepth(e.target.value)}
                  placeholder="Ej: 48.5"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  La profundidad no puede superar la profundidad física total del pozo ({selectedWellForPump.profundidad} m) y debe quedar bajo el nivel freático para evitar succión de aire.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha del Cambio / Ajuste *
                </label>
                <input
                  type="date"
                  required
                  value={pumpChangeDate}
                  onChange={(e) => setPumpChangeDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo o Justificación del Cambio *
                </label>
                <textarea
                  required
                  value={pumpChangeReason}
                  onChange={(e) => setPumpChangeReason(e.target.value)}
                  placeholder="Ej: Descenso estacional del nivel estático, mantención de tuberías de succión, cambio de motor..."
                  rows={3}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWellForPump(null)}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2 rounded-lg border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 py-2 rounded-lg"
                >
                  Guardar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PUMP DEPTH HISTORY */}
      {selectedWellForHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="modal_view_pump_history">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-indigo-600 mb-4 pb-3 border-b border-slate-100">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Historial de Cambios de Profundidad de Bomba</h3>
                <p className="text-xxs text-slate-400 font-mono">POZO: {selectedWellForHistory.id} - {selectedWellForHistory.nombre}</p>
              </div>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {(!selectedWellForHistory.historialProfundidadBomba || selectedWellForHistory.historialProfundidadBomba.length === 0) ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No hay registros históricos de cambios para la bomba de este pozo.
                </div>
              ) : (
                <div className="relative border-l-2 border-indigo-100 ml-3 pl-5 space-y-5">
                  {selectedWellForHistory.historialProfundidadBomba.map((h, i) => (
                    <div key={i} className="relative">
                      {/* Circle dot marker */}
                      <span className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-indigo-500 bg-white" />
                      
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-bold text-slate-700 font-mono">{h.fecha}</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-extrabold font-mono">
                            {h.profundidadAnterior.toFixed(1)} m → {h.profundidadNueva.toFixed(1)} m
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed font-semibold">
                          Motivo: <span className="font-normal text-slate-500 italic">"{h.motivo || 'No especificado'}"</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedWellForHistory(null)}
                className="w-full text-xs font-semibold text-slate-700 hover:bg-slate-100 py-2.5 rounded-lg border border-slate-200 transition-colors"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR DISCONTINUIDAD / CORTE */}
      {showAddInterrupcion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" id="modal_add_interrupcion">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-lg w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <ZapOff className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registrar Discontinuidad del Suministro AP</h3>
                <p className="text-xxs text-slate-400 font-mono">Formulario de Control de Continuidad de AP</p>
              </div>
            </div>

            <form onSubmit={handleAddInterrupcionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Captación / Origen Afectado *
                  </label>
                  <select
                    value={newInterrupcion.pozoId}
                    onChange={(e) => setNewInterrupcion({ ...newInterrupcion, pozoId: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                  >
                    <option value="Todos">Sistema Completo (Red de Distribución)</option>
                    {pozos.map(p => (
                      <option key={p.id} value={p.id}>{p.id} - {p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sector de la Red Afectado *
                  </label>
                  <select
                    value={newInterrupcion.sector}
                    onChange={(e) => setNewInterrupcion({ ...newInterrupcion, sector: e.target.value as any })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                  >
                    <option value="Todos">Toda la Red / Todos los sectores</option>
                    <option value="Centro">Sector Centro</option>
                    <option value="Norte">Sector Norte</option>
                    <option value="Sur">Sector Sur</option>
                    <option value="Rural">Sector Rural</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Interrupción *
                  </label>
                  <select
                    value={newInterrupcion.tipoInterrupcion}
                    onChange={(e) => setNewInterrupcion({ ...newInterrupcion, tipoInterrupcion: e.target.value as any })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white font-semibold"
                  >
                    {TIPOS_INTERRUPCION.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block leading-tight">
                    {newInterrupcion.tipoInterrupcion === 'Programado' 
                      ? 'Requiere aviso previo de mínimo 24 horas.' 
                      : 'Corte de fuerza mayor / caso fortuito imprevisto.'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aviso Previo a Usuarios *
                  </label>
                  <select
                    value={newInterrupcion.comunicacionUsuarios}
                    onChange={(e) => setNewInterrupcion({ ...newInterrupcion, comunicacionUsuarios: e.target.value as any })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                  >
                    {COMUNICACIONES_INTERRUPCION.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">¿Se notificó formalmente antes?</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={newInterrupcion.fechaInicioDate}
                    onChange={(e) => setNewInterrupcion({ ...newInterrupcion, fechaInicioDate: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hora de Inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={newInterrupcion.fechaInicioTime}
                    onChange={(e) => setNewInterrupcion({ ...newInterrupcion, fechaInicioTime: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-xxs font-mono font-bold text-slate-400 block uppercase mb-2">Resolución Inmediata (Opcional si el corte ya terminó)</span>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Fecha de Término
                    </label>
                    <input
                      type="date"
                      value={newInterrupcion.fechaTerminoDate}
                      onChange={(e) => setNewInterrupcion({ ...newInterrupcion, fechaTerminoDate: e.target.value })}
                      className="w-full text-[11px] p-2 border border-slate-200 rounded bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Hora de Término
                    </label>
                    <input
                      type="time"
                      value={newInterrupcion.fechaTerminoTime}
                      onChange={(e) => setNewInterrupcion({ ...newInterrupcion, fechaTerminoTime: e.target.value })}
                      className="w-full text-[11px] p-2 border border-slate-200 rounded bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Causa o Motivo Principal *
                  </label>
                  <select
                    value={newInterrupcion.causa}
                    onChange={(e) => setNewInterrupcion({ ...newInterrupcion, causa: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                  >
                    {CAUSAS_INTERRUPCION.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                    <option value="Otro">Otro (Especificar abajo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Suministro de Mitigación *
                  </label>
                  <select
                    value={newInterrupcion.mitigacion}
                    onChange={(e) => setNewInterrupcion({ ...newInterrupcion, mitigacion: e.target.value as any })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                  >
                    {MITIGACIONES_INTERRUPCION.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              {newInterrupcion.causa === 'Otro' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Especificar Causa / Detalle del motivo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newInterrupcion.causaDetalle}
                    onChange={(e) => setNewInterrupcion({ ...newInterrupcion, causaDetalle: e.target.value })}
                    placeholder="Escriba el motivo técnico del corte..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número Estimado de Clientes / Hogares Afectados *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newInterrupcion.clientesAfectados}
                    onChange={(e) => setNewInterrupcion({ ...newInterrupcion, clientesAfectados: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones Técnicas o Comentarios Adicionales
                </label>
                <textarea
                  value={newInterrupcion.observaciones}
                  onChange={(e) => setNewInterrupcion({ ...newInterrupcion, observaciones: e.target.value })}
                  placeholder="Escriba comentarios, número de informe, teléfonos de contacto, cuadrillas, etc..."
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddInterrupcion(false)}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2.5 rounded-lg border border-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg shadow-sm transition-colors"
                >
                  Guardar Registro de Corte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DECLARAR REPOSICIÓN / RESOLVER INTERRUPCIÓN */}
      {selectedInterrupcionForResolution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="modal_resolve_interrupcion">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-emerald-600 mb-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registrar Reposición del Suministro</h3>
                <p className="text-xxs text-slate-400 font-mono">Evento: {selectedInterrupcionForResolution.id} — {selectedInterrupcionForResolution.nombreCaptacion}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed font-semibold">
              El suministro se suspendió el <span className="text-slate-900 font-mono font-bold">{new Date(selectedInterrupcionForResolution.fechaInicio).toLocaleString('es-CL')}</span> afectando a {selectedInterrupcionForResolution.clientesAfectados} clientes de {selectedInterrupcionForResolution.sector === 'Todos' ? 'Toda la Red' : `Sector ${selectedInterrupcionForResolution.sector}`}.
            </p>

            <form onSubmit={handleResolveInterrupcionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Término / Reposición *
                  </label>
                  <input
                    type="date"
                    required
                    value={resolutionDate}
                    onChange={(e) => setResolutionDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hora de Término / Reposición *
                  </label>
                  <input
                    type="time"
                    required
                    value={resolutionTime}
                    onChange={(e) => setResolutionTime(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones Técnicas de Cierre / Reposición
                </label>
                <textarea
                  required
                  value={resolutionObservations}
                  onChange={(e) => setResolutionObservations(e.target.value)}
                  placeholder="Detallar los trabajos realizados (ej. Reparación de tubería PVC de 110mm, reposición de fase eléctrica, etc.)..."
                  rows={3}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInterrupcionForResolution(null)}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2.5 rounded-lg border border-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-lg shadow-sm transition-colors"
                >
                  Guardar Reposición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR PUNTO DE MEDICIÓN DE PRESIÓN */}
      {showAddPuntoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" id="modal_add_punto_presion">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-blue-600 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Agregar Punto de Medición de Presión</h3>
                <p className="text-xxs text-slate-400 font-mono">Definición de Lugares de Control de Presiones</p>
              </div>
            </div>

            <form onSubmit={handleAddPuntoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Lugar / Punto de Monitoreo *
                </label>
                <input
                  type="text"
                  required
                  value={newPunto.nombre}
                  onChange={(e) => setNewPunto({...newPunto, nombre: e.target.value})}
                  placeholder="Ej. Salida Estanque Principal, Sector Alto Calle 4"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Lugar *
                  </label>
                  <select
                    value={newPunto.tipo}
                    onChange={(e) => setNewPunto({...newPunto, tipo: e.target.value as PuntoMedicionPresion['tipo']})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="Estacionario">1.- Instrumento Estacionario (Fijo)</option>
                    <option value="Móvil">2.- Equipo Móvil (Portátil)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado Operativo *
                  </label>
                  <select
                    value={newPunto.estado}
                    onChange={(e) => setNewPunto({...newPunto, estado: e.target.value as PuntoMedicionPresion['estado']})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="Operativo">Operativo</option>
                    <option value="En Calibración">En Calibración</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección o Referencia de Ubicación *
                </label>
                <input
                  type="text"
                  required
                  value={newPunto.direccion}
                  onChange={(e) => setNewPunto({...newPunto, direccion: e.target.value})}
                  placeholder="Ej. Av. Las Condes #1043, esquina Pasaje Sur"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              {newPunto.tipo === 'Estacionario' && (
                <div className="space-y-4 border-t border-slate-100 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Detalles del Instrumento Fijo</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cota del Punto (m.s.n.m.)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={newPunto.cota}
                        onChange={(e) => setNewPunto({...newPunto, cota: e.target.value})}
                        placeholder="Ej. 420.5"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tipo de Manómetro / Equipo
                      </label>
                      <input
                        type="text"
                        value={newPunto.instrumento}
                        onChange={(e) => setNewPunto({...newPunto, instrumento: e.target.value})}
                        placeholder="Ej. Manómetro Bourdon Clase 1A"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fecha de Última Mantención / Calibración
                    </label>
                    <input
                      type="date"
                      value={newPunto.ultimaMantencion}
                      onChange={(e) => setNewPunto({...newPunto, ultimaMantencion: e.target.value})}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-2 pt-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddPuntoModal(false)}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2.5 rounded-lg border border-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg shadow-sm transition-colors"
                >
                  Agregar Punto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR MEDICIÓN DE PRESIÓN */}
      {showAddPresionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" id="modal_add_lectura_presion">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-blue-600 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registrar Medición de Presión en Red</h3>
                <p className="text-xxs text-slate-400 font-mono">Control Diario de Presiones del Sistema</p>
              </div>
            </div>

            <form onSubmit={handleAddPresionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Punto de Monitoreo / Medición *
                </label>
                <select
                  required
                  value={newPresion.puntoId}
                  onChange={(e) => setNewPresion({...newPresion, puntoId: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Seleccione un Punto de Medición --</option>
                  {puntosPresion.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.nombre} ({p.tipo === 'Estacionario' ? 'Fijo Estacionario' : 'Equipo Móvil'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Medición *
                  </label>
                  <input
                    type="date"
                    required
                    value={newPresion.fechaDate}
                    onChange={(e) => setNewPresion({...newPresion, fechaDate: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hora de Medición *
                  </label>
                  <input
                    type="time"
                    required
                    value={newPresion.fechaTime}
                    onChange={(e) => setNewPresion({...newPresion, fechaTime: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Presión Medida (bar) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    max="15"
                    value={newPresion.presionBar}
                    onChange={(e) => setNewPresion({...newPresion, presionBar: e.target.value})}
                    placeholder="Ej. 2.50"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono pr-12"
                  />
                  <span className="absolute right-3.5 top-3 text-[10px] font-bold text-slate-400 font-mono">BAR</span>
                </div>
                {newPresion.presionBar && !isNaN(Number(newPresion.presionBar)) && (
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold flex justify-between">
                    <span>Equivalente en columna de agua:</span>
                    <span className="font-mono text-blue-600 font-extrabold bg-blue-50 px-1.5 rounded">
                      {(Number(newPresion.presionBar) * 10.2).toFixed(2)} m.c.a.
                    </span>
                  </p>
                )}
                <p className="text-[9px] text-slate-400 mt-1">
                  * Rango norma APR: 1.5 a 7.0 bar. Presiones menores a 1.5 bar o mayores a 7.0 bar gatillarán alertas de desviación.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operador responsable *
                </label>
                <input
                  type="text"
                  required
                  value={newPresion.operador}
                  onChange={(e) => setNewPresion({...newPresion, operador: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones / Hallazgos en Terreno
                </label>
                <textarea
                  value={newPresion.observaciones}
                  onChange={(e) => setNewPresion({...newPresion, observaciones: e.target.value})}
                  placeholder="Detallar condiciones particulares (ej. Vibración en la aguja, fuga menor en válvula, etc.)..."
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddPresionModal(false)}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2.5 rounded-lg border border-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg shadow-sm transition-colors"
                >
                  Guardar Medición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
