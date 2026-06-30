import React, { useState, useEffect } from 'react';
import { Cliente, Pozo, TablaControl, Ticket, CalidadAgua, RegistroOffline, InterrupcionAP, PuntoMedicionPresion, RegistroPresion } from './types';
import { loadState, saveState } from './data';
import PanelAdministrativo from './components/PanelAdministrativo';
import SimuladorPWA from './components/SimuladorPWA';
import { 
  Wifi, CheckCircle, RefreshCw, Smartphone, Monitor, Database, Droplet, Sparkles 
} from 'lucide-react';

export default function App() {
  // Global States loaded from localStorage (or defaults)
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pozos, setPozos] = useState<Pozo[]>([]);
  const [tablasControl, setTablasControl] = useState<TablaControl[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [calidadAgua, setCalidadAgua] = useState<CalidadAgua[]>([]);
  const [interrupciones, setInterrupciones] = useState<InterrupcionAP[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<RegistroOffline[]>([]);
  const [puntosPresion, setPuntosPresion] = useState<PuntoMedicionPresion[]>([]);
  const [registrosPresion, setRegistrosPresion] = useState<RegistroPresion[]>([]);
  
  // App settings
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('');
  const [showSyncSuccessToast, setShowSyncSuccessToast] = useState(false);
  const [syncCount, setSyncCount] = useState(0);

  // Responsive mode selector for mobile/tablets
  const [viewportView, setViewportView] = useState<'both' | 'central' | 'pwa'>('both');

  // Load state on mount
  useEffect(() => {
    const state = loadState();
    setClientes(state.clientes);
    setPozos(state.pozos);
    setTablasControl(state.tablas);
    setTickets(state.tickets);
    setCalidadAgua(state.calidad);
    setInterrupciones(state.interrupciones);
    setOfflineQueue(state.offlineQueue);
    setPuntosPresion(state.puntosPresion || []);
    setRegistrosPresion(state.registrosPresion || []);
    
    // Automatically adjust default view based on screen size
    const handleResize = () => {
      if (window.innerWidth < 1150) {
        setViewportView('central');
      } else {
        setViewportView('both');
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save state helper
  const handleSaveAll = (updatedState: {
    clientes?: Cliente[];
    pozos?: Pozo[];
    tablas?: TablaControl[];
    tickets?: Ticket[];
    calidad?: CalidadAgua[];
    interrupciones?: InterrupcionAP[];
    offlineQueue?: RegistroOffline[];
    puntosPresion?: PuntoMedicionPresion[];
    registrosPresion?: RegistroPresion[];
  }) => {
    const stateToSave = {
      clientes: updatedState.clientes ?? clientes,
      pozos: updatedState.pozos ?? pozos,
      tablas: updatedState.tablas ?? tablasControl,
      tickets: updatedState.tickets ?? tickets,
      calidad: updatedState.calidad ?? calidadAgua,
      interrupciones: updatedState.interrupciones ?? interrupciones,
      offlineQueue: updatedState.offlineQueue ?? offlineQueue,
      puntosPresion: updatedState.puntosPresion ?? puntosPresion,
      registrosPresion: updatedState.registrosPresion ?? registrosPresion
    };

    saveState(stateToSave);
  };

  // State update handlers
  const handleUpdateClientes = (newClientes: Cliente[]) => {
    setClientes(newClientes);
    handleSaveAll({ clientes: newClientes });
  };

  const handleUpdatePozos = (newPozos: Pozo[]) => {
    setPozos(newPozos);
    handleSaveAll({ pozos: newPozos });
  };

  const handleUpdateTablasControl = (newTablas: TablaControl[]) => {
    setTablasControl(newTablas);
    handleSaveAll({ tablas: newTablas });
  };

  const handleUpdateTickets = (newTickets: Ticket[]) => {
    setTickets(newTickets);
    handleSaveAll({ tickets: newTickets });
  };

  const handleUpdateCalidadAgua = (newCalidad: CalidadAgua[]) => {
    setCalidadAgua(newCalidad);
    handleSaveAll({ calidad: newCalidad });
  };

  const handleUpdateInterrupciones = (newInterrupciones: InterrupcionAP[]) => {
    setInterrupciones(newInterrupciones);
    handleSaveAll({ interrupciones: newInterrupciones });
  };

  const handleUpdatePuntosPresion = (newPuntos: PuntoMedicionPresion[]) => {
    setPuntosPresion(newPuntos);
    handleSaveAll({ puntosPresion: newPuntos });
  };

  const handleUpdateRegistrosPresion = (newRegistros: RegistroPresion[]) => {
    setRegistrosPresion(newRegistros);
    handleSaveAll({ registrosPresion: newRegistros });
  };

  // Register a single reading (from PWA)
  const handleRegisterReading = (reading: RegistroOffline) => {
    if (isOfflineMode) {
      // Offline: save to offline queue
      const updatedQueue = [...offlineQueue, reading];
      setOfflineQueue(updatedQueue);
      handleSaveAll({ offlineQueue: updatedQueue });
    } else {
      // Online: directly register on central database
      applyReadingToCentral(reading);
    }
  };

  // Process a single reading into the Central Client list
  const applyReadingToCentral = (reading: RegistroOffline) => {
    setClientes(prevClientes => {
      const updated = prevClientes.map(c => {
        if (c.id === reading.id) {
          const lecturaAnterior = c.lecturaAnterior;
          let consumoCalculado: number | undefined;
          let alertaConsumo: Cliente['alertaConsumo'] = 'Ninguna';

          if (reading.estado === 'Leído' && reading.lecturaActual !== undefined) {
            consumoCalculado = Math.round((reading.lecturaActual - lecturaAnterior) * 10) / 10;
            
            // Check alerts
            if (reading.lecturaActual < lecturaAnterior) {
              alertaConsumo = 'Lectura Menor';
            } else if (consumoCalculado === 0) {
              alertaConsumo = 'Consumo Cero';
            } else if (consumoCalculado > 100) {
              alertaConsumo = 'Consumo Elevado';
            }
          }

          return {
            ...c,
            estado: reading.estado,
            lecturaActual: reading.lecturaActual,
            consumoCalculado,
            causaNoLectura: reading.causaNoLectura,
            fechaLectura: reading.fechaLectura,
            alertaConsumo
          };
        }
        return c;
      });

      // Save to localStorage
      handleSaveAll({ clientes: updated });
      return updated;
    });

    // Mark the "Lecturas de Medidores" (TAB-002) table metadata as updated today!
    setTablasControl(prevTablas => {
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const updated = prevTablas.map(t => {
        if (t.id === 'TAB-002') {
          return {
            ...t,
            ultimaActualizacion: today,
            proximaActualizacionRequerida: nextMonth,
            estadoFrecuencia: 'Al día' as const
          };
        }
        return t;
      });
      handleSaveAll({ tablas: updated });
      return updated;
    });
  };

  // Synchronize the whole offline queue with central server
  const handleSyncQueue = () => {
    if (offlineQueue.length === 0) return;
    
    setIsSyncing(true);
    setSyncCount(offlineQueue.length);
    setSyncStatusText('Estableciendo enlace de encriptación PWA con Servidor Central...');

    setTimeout(() => {
      setSyncStatusText(`Subiendo y computando ${offlineQueue.length} lecturas de terreno en lote...`);
      
      setTimeout(() => {
        // Apply each reading in the queue
        offlineQueue.forEach(reading => {
          applyReadingToCentral(reading);
        });

        // Clear queue
        setOfflineQueue([]);
        handleSaveAll({ offlineQueue: [] });
        
        setIsSyncing(false);
        setShowSyncSuccessToast(true);

        // Auto-close success toast
        setTimeout(() => {
          setShowSyncSuccessToast(false);
        }, 5000);

      }, 1500);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans" id="app_root_container">
      
      {/* Top Multi-view control for responsive frames */}
      <nav className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between border-b border-slate-800 shrink-0 shadow-lg" id="master_navbar">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-gradient-to-br from-sky-400 to-sky-600 rounded-lg text-white">
            <Droplet className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-sm text-slate-100 uppercase block">Comunidad Rural</span>
            <span className="text-[10px] text-sky-400 block font-mono">SISTEMA APyA & REGISTRO PWA</span>
          </div>
        </div>

        {/* Viewport controls for testing smaller viewports easily */}
        <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => setViewportView('central')}
            className={`px-3 py-1 rounded-md transition-all flex items-center space-x-1.5 font-medium ${
              viewportView === 'central' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Panel Administrador</span>
          </button>
          
          <button
            onClick={() => setViewportView('pwa')}
            className={`px-3 py-1 rounded-md transition-all flex items-center space-x-1.5 font-medium ${
              viewportView === 'pwa' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PWA de Terreno (Lecturas)</span>
          </button>

          <button
            onClick={() => setViewportView('both')}
            className={`px-3 py-1 rounded-md transition-all flex items-center space-x-1.5 font-medium hidden lg:flex ${
              viewportView === 'both' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
            <span>Vista Doble Simultánea</span>
          </button>
        </div>

        {/* Global Connection Badge */}
        <div className="flex items-center space-x-2">
          <span className="hidden md:inline text-xxs text-slate-400">Estado Conectividad:</span>
          {isOfflineMode ? (
            <span className="bg-amber-500/10 text-amber-400 text-xxs font-bold px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center space-x-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>OFFLINE (PWA local)</span>
            </span>
          ) : (
            <span className="bg-emerald-500/10 text-emerald-400 text-xxs font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center space-x-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>CENTRAL ONLINE</span>
            </span>
          )}
        </div>
      </nav>

      {/* Main Container Content */}
      <div className="flex-1 overflow-hidden relative" id="master_split_workspace">
        
        {/* VIEW 1: CENTRAL ADMIN PORTAL ONLY */}
        {viewportView === 'central' && (
          <div className="h-full w-full overflow-hidden" id="viewport_single_admin">
            <PanelAdministrativo
              clientes={clientes}
              pozos={pozos}
              tablasControl={tablasControl}
              tickets={tickets}
              calidadAgua={calidadAgua}
              interrupciones={interrupciones}
              puntosPresion={puntosPresion}
              registrosPresion={registrosPresion}
              onUpdateClientes={handleUpdateClientes}
              onUpdatePozos={handleUpdatePozos}
              onUpdateTablasControl={handleUpdateTablasControl}
              onUpdateTickets={handleUpdateTickets}
              onUpdateCalidadAgua={handleUpdateCalidadAgua}
              onUpdateInterrupciones={handleUpdateInterrupciones}
              onUpdatePuntosPresion={handleUpdatePuntosPresion}
              onUpdateRegistrosPresion={handleUpdateRegistrosPresion}
            />
          </div>
        )}

        {/* VIEW 2: MOBILE PWA ONLY */}
        {viewportView === 'pwa' && (
          <div className="h-full w-full bg-slate-900 flex items-center justify-center py-4" id="viewport_single_pwa">
            <SimuladorPWA
              clientes={clientes}
              offlineQueue={offlineQueue}
              isOfflineMode={isOfflineMode}
              onSetOfflineMode={setIsOfflineMode}
              onRegisterReading={handleRegisterReading}
              onSyncQueue={handleSyncQueue}
            />
          </div>
        )}

        {/* VIEW 3: DUAL SPLIT-SCREEN (BEST FOR TESTING) */}
        {viewportView === 'both' && (
          <div className="h-full w-full lg:grid lg:grid-cols-12 overflow-hidden" id="viewport_dual_split">
            {/* Left: Administrative Desk */}
            <div className="col-span-8 h-full border-r border-slate-200 overflow-hidden flex flex-col">
              <PanelAdministrativo
                clientes={clientes}
                pozos={pozos}
                tablasControl={tablasControl}
                tickets={tickets}
                calidadAgua={calidadAgua}
                interrupciones={interrupciones}
                puntosPresion={puntosPresion}
                registrosPresion={registrosPresion}
                onUpdateClientes={handleUpdateClientes}
                onUpdatePozos={handleUpdatePozos}
                onUpdateTablasControl={handleUpdateTablasControl}
                onUpdateTickets={handleUpdateTickets}
                onUpdateCalidadAgua={handleUpdateCalidadAgua}
                onUpdateInterrupciones={handleUpdateInterrupciones}
                onUpdatePuntosPresion={handleUpdatePuntosPresion}
                onUpdateRegistrosPresion={handleUpdateRegistrosPresion}
              />
            </div>

            {/* Right: Immersive mobile PWA frame */}
            <div className="col-span-4 h-full bg-slate-950 flex flex-col justify-center items-center overflow-hidden border-l border-slate-800">
              <div className="text-center text-slate-400 py-2.5 px-6 max-w-sm font-sans select-none z-10 shrink-0">
                <span className="text-[10px] uppercase font-mono tracking-widest text-sky-400 font-bold">Simulador PWA Móvil</span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                  Tome lecturas domiciliarias a la derecha. ¡Vea el balance y los reportes de desviación actualizarse al instante a la izquierda!
                </p>
              </div>
              <div className="flex-1 w-full flex items-center justify-center p-2 overflow-hidden">
                <SimuladorPWA
                  clientes={clientes}
                  offlineQueue={offlineQueue}
                  isOfflineMode={isOfflineMode}
                  onSetOfflineMode={setIsOfflineMode}
                  onRegisterReading={handleRegisterReading}
                  onSyncQueue={handleSyncQueue}
                />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* SYNC LOADER OVERLAY */}
      {isSyncing && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-50 p-6 select-none" id="sync_loader_overlay">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-sky-500/20 border-t-sky-500 animate-spin" />
              <RefreshCw className="h-6 w-6 text-sky-400 animate-pulse" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider font-mono">SINCRONIZANDO CON SOLUCIÓN</h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {syncStatusText}
              </p>
            </div>
            
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden w-4/5 mx-auto">
              <div className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full animate-infinite-loading" style={{ width: '40%' }} />
            </div>
          </div>
        </div>
      )}

      {/* SYNC SUCCESS TOAST */}
      {showSyncSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 border border-emerald-500/30 text-white rounded-xl shadow-2xl p-4 flex items-start space-x-3 animate-in slide-in-from-bottom-6 duration-300" id="sync_success_toast">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase font-mono text-emerald-400">Sincronización Completada</h4>
            <p className="text-xxs text-slate-300 mt-1 leading-normal">
              Se han subido y procesado con éxito las <strong>{syncCount} lecturas de medidor</strong> acumuladas sin conexión. El balance hídrico y reporte de desviación de pozos se han recalculado automáticamente.
            </p>
          </div>
          <button 
            onClick={() => setShowSyncSuccessToast(false)}
            className="text-slate-400 hover:text-white text-xs font-semibold p-1"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
