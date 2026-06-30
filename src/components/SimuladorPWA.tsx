import React, { useState, useMemo } from 'react';
import { Cliente, RegistroOffline, CAUSAS_NO_LECTURA } from '../types';
import { 
  Wifi, WifiOff, QrCode, Scan, Smartphone, Check, AlertTriangle, 
  HelpCircle, Search, RefreshCw, ChevronRight, X, Sparkles, LogIn, HardDriveDownload
} from 'lucide-react';

interface SimuladorPWAProps {
  clientes: Cliente[];
  offlineQueue: RegistroOffline[];
  isOfflineMode: boolean;
  onSetOfflineMode: (offline: boolean) => void;
  onRegisterReading: (reading: RegistroOffline) => void;
  onSyncQueue: () => void;
}

export default function SimuladorPWA({
  clientes,
  offlineQueue,
  isOfflineMode,
  onSetOfflineMode,
  onRegisterReading,
  onSyncQueue
}: SimuladorPWAProps) {
  // Mobile UI States
  const [pwaScreen, setPwaScreen] = useState<'inicio' | 'buscar' | 'escanear' | 'formulario' | 'cola'>('inicio');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  
  // Reading Form States
  const [lecturaActualStr, setLecturaActualStr] = useState('');
  const [imposibleLeer, setImposibleLeer] = useState(false);
  const [causaNoLectura, setCausaNoLectura] = useState(CAUSAS_NO_LECTURA[0]);
  const [metodoCaptura, setMetodoCaptura] = useState<'QR' | 'NFC' | 'Manual'>('Manual');

  // Scanner Simulator States
  const [scanType, setScanType] = useState<'QR' | 'NFC'>('QR');
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);

  // Search filtered clients inside PWA (only show pending or read)
  const pwaFilteredClientes = useMemo(() => {
    if (!searchQuery) return [];
    return clientes.filter(c => 
      c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.medidorId.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5); // Limit search results on mobile
  }, [clientes, searchQuery]);

  // Instant Check calculations on the PWA form
  const formChecks = useMemo(() => {
    if (!selectedClient || imposibleLeer) return null;
    const lecturaActualNum = Number(lecturaActualStr);
    
    if (isNaN(lecturaActualNum) || lecturaActualStr.trim() === '') {
      return { validador: 'Incompleto', alertType: 'None', mensaje: '', consumo: 0 };
    }

    const consumo = Math.round((lecturaActualNum - selectedClient.lecturaAnterior) * 10) / 10;
    
    if (lecturaActualNum < selectedClient.lecturaAnterior) {
      return {
        validador: 'Error',
        alertType: 'Lectura Menor',
        mensaje: `⚠️ ERROR: La lectura actual (${lecturaActualNum} m³) es menor que la anterior (${selectedClient.lecturaAnterior} m³). El consumo daría negativo (${consumo} m³).`,
        consumo
      };
    }

    if (consumo === 0) {
      return {
        validador: 'Advertencia',
        alertType: 'Consumo Cero',
        mensaje: '🔔 ADVERTENCIA: El consumo calculado es exactamente 0.0 m³. Valide si el inmueble está deshabitado o si el medidor se encuentra trabado.',
        consumo
      };
    }

    if (consumo > 100) {
      return {
        validador: 'Advertencia',
        alertType: 'Consumo Elevado',
        mensaje: `🔥 ALERTA CRÍTICA: Consumo extremadamente alto (${consumo} m³). Esto podría significar una fuga subterránea severa después del medidor. Avise al cliente de inmediato.`,
        consumo
      };
    }

    // Normal reading
    return {
      validador: 'Ok',
      alertType: 'Ninguna',
      mensaje: `✅ Consumo normal detectado: ${consumo} m³ para el periodo actual.`,
      consumo
    };
  }, [selectedClient, lecturaActualStr, imposibleLeer]);

  // Simulate scanning QR/NFC
  const handleSimulateScan = (tipo: 'QR' | 'NFC', cliente: Cliente) => {
    if (cliente.estadoServicio === 'Inactivo') {
      alert(`⚠️ El medidor ${cliente.medidorId} pertenece a un arranque con servicio INACTIVO/CERRADO. No se pueden registrar lecturas en terreno.`);
      return;
    }
    setScanType(tipo);
    setScannedFeedback(`¡Medidor ${cliente.medidorId} detectado con éxito mediante ${tipo}!`);
    setMetodoCaptura(tipo);
    
    setTimeout(() => {
      setSelectedClient(cliente);
      setLecturaActualStr('');
      setImposibleLeer(cliente.estado === 'Imposible de leer');
      if (cliente.estado === 'Imposible de leer' && cliente.causaNoLectura) {
        setCausaNoLectura(cliente.causaNoLectura);
      }
      setScannedFeedback(null);
      setPwaScreen('formulario');
    }, 1200);
  };

  // Submit Reading to queue/server
  const handleSubmitReading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const lecturaNum = imposibleLeer ? undefined : Number(lecturaActualStr);
    
    if (!imposibleLeer && (isNaN(lecturaNum!) || lecturaActualStr.trim() === '')) {
      alert('Por favor, ingrese un valor de lectura válido o active la opción de imposibilidad de lectura.');
      return;
    }

    onRegisterReading({
      id: selectedClient.id,
      lecturaActual: lecturaNum,
      estado: imposibleLeer ? 'Imposible de leer' : 'Leído',
      causaNoLectura: imposibleLeer ? causaNoLectura : undefined,
      fechaLectura: new Date().toISOString(),
      metodoCaptura
    });

    // Success screen redirection
    alert(isOfflineMode 
      ? 'Lectura guardada en la cola OFFLINE local. Se sincronizará al recuperar señal.' 
      : 'Lectura enviada de inmediato al Servidor Central con éxito.'
    );

    // Reset and return
    setSelectedClient(null);
    setLecturaActualStr('');
    setImposibleLeer(false);
    setPwaScreen('inicio');
  };

  return (
    <div className="flex justify-center items-center h-full bg-slate-950 p-2" id="pwa_simulator_frame">
      {/* Physical phone border wrapper */}
      <div className="relative w-[345px] h-[670px] bg-slate-900 rounded-[38px] p-3.5 shadow-2xl border-4 border-slate-800 flex flex-col justify-between overflow-hidden">
        
        {/* Notch details */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-5 w-32 bg-slate-900 rounded-b-xl z-50 flex items-center justify-center">
          <span className="w-12 h-1 bg-slate-800 rounded-full mb-1" />
        </div>

        {/* Internal Screen Area */}
        <div className="flex-1 bg-slate-50 rounded-[28px] overflow-hidden flex flex-col justify-between text-slate-900 relative">
          
          {/* Top StatusBar */}
          <div className="bg-blue-600 text-white px-5 pt-5 pb-2 flex justify-between items-center text-xs font-semibold select-none shrink-0" id="mobile_status_bar">
            <span>10:41 AM</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-xxs tracking-widest uppercase bg-blue-700 px-1 py-0.25 rounded">4G LTE</span>
              {isOfflineMode ? (
                <div className="flex items-center space-x-1 text-amber-200">
                  <span className="text-[10px] font-mono">OFFLINE</span>
                  <WifiOff className="h-3.5 w-3.5" />
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-emerald-200">
                  <span className="text-[10px] font-mono">ONLINE</span>
                  <Wifi className="h-3.5 w-3.5 animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Offline/Online toggle panel at the top (Interactive Simulation) */}
          <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between text-[11px] border-b border-slate-800 shrink-0 font-sans" id="conection_simulator_panel">
            <span className="text-slate-400">Prueba de Sincronización:</span>
            <button
              onClick={() => {
                if (isOfflineMode) {
                  // Going online -> trigger auto-sync
                  onSetOfflineMode(false);
                  if (offlineQueue.length > 0) {
                    onSyncQueue();
                  }
                } else {
                  onSetOfflineMode(true);
                }
              }}
              className={`px-2 py-0.5 rounded font-bold text-[10px] transition-all flex items-center space-x-1 ${
                isOfflineMode 
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <span>{isOfflineMode ? 'CONECTAR' : 'DESCONECTAR'}</span>
            </button>
          </div>

          {/* Notification for offline queue pending items */}
          {offlineQueue.length > 0 && (
            <div className="bg-amber-500 text-slate-950 text-xxs font-semibold px-3 py-1.5 flex items-center justify-between shadow-sm border-b border-amber-600/30 shrink-0">
              <div className="flex items-center space-x-1.5">
                <WifiOff className="h-3.5 w-3.5 animate-bounce" />
                <span>{offlineQueue.length} lecturas retenidas en cola offline</span>
              </div>
              {!isOfflineMode && (
                <button
                  onClick={onSyncQueue}
                  className="bg-slate-950 text-white px-1.5 py-0.5 rounded text-[9px] hover:bg-slate-900 flex items-center space-x-1"
                >
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  <span>Sincronizar</span>
                </button>
              )}
            </div>
          )}

          {/* SCREEN CONTENT */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col" id="mobile_body">

            {/* SCREEN 1: INICIO (HOME) */}
            {pwaScreen === 'inicio' && (
              <div className="space-y-4 flex flex-col justify-between flex-1">
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600 border border-blue-200">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900">PWA Lectura de Medidores</h2>
                    <p className="text-xxs text-slate-400 mt-0.5 uppercase tracking-wide font-mono">Comunidad Rural APyA</p>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setScanType('QR');
                        setPwaScreen('escanear');
                      }}
                      className="p-4 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-center transition-all flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100">
                        <QrCode className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold block text-slate-800">Escanear QR</span>
                      <span className="text-[9px] text-slate-400 block leading-tight">Cámara o simulador</span>
                    </button>

                    <button
                      onClick={() => {
                        setScanType('NFC');
                        setPwaScreen('escanear');
                      }}
                      className="p-4 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-center transition-all flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100">
                        <Scan className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold block text-slate-800">Leer NFC</span>
                      <span className="text-[9px] text-slate-400 block leading-tight">Sin contacto</span>
                    </button>
                  </div>

                  {/* Manual search helper */}
                  <button
                    onClick={() => setPwaScreen('buscar')}
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between text-left hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <Search className="h-4 w-4 text-slate-400" />
                      <div>
                        <span className="text-xs font-bold block text-slate-800">Búsqueda Domiciliaria</span>
                        <span className="text-[9px] text-slate-400 block">Buscar cliente por ID, nombre o calle</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                </div>

                {/* Operator Stats */}
                <div className="bg-slate-100 border border-slate-200/50 p-3.5 rounded-xl font-mono text-xxs space-y-2.5">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>OPERADOR ACTIVO:</span>
                    <span className="font-bold text-slate-800">Técnico Terreno-1</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex justify-between">
                    <span>Total Clientes:</span>
                    <span className="font-bold text-slate-800">1,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lecturas Realizadas:</span>
                    <span className="font-bold text-blue-700">
                      {clientes.filter(c => c.estado === 'Leído' || c.estado === 'Imposible de leer').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cola de Envíos Offline:</span>
                    <span className={`font-bold ${offlineQueue.length > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {offlineQueue.length} registros
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 2: BUSCAR CLIENTE MANUAL */}
            {pwaScreen === 'buscar' && (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-xs text-slate-800">Búsqueda de Medidor</h3>
                    <button 
                      onClick={() => {
                        setPwaScreen('inicio');
                        setSearchQuery('');
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Escriba RUT, Nombre o Medidor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Dynamic results list */}
                  <div className="space-y-1.5 mt-3 max-h-[280px] overflow-y-auto">
                    {pwaFilteredClientes.map((c) => (
                      <button
                        key={c.id}
                        disabled={c.estadoServicio === 'Inactivo'}
                        onClick={() => {
                          setSelectedClient(c);
                          setLecturaActualStr('');
                          setImposibleLeer(c.estado === 'Imposible de leer');
                          if (c.estado === 'Imposible de leer' && c.causaNoLectura) {
                            setCausaNoLectura(c.causaNoLectura);
                          }
                          setMetodoCaptura('Manual');
                          setPwaScreen('formulario');
                        }}
                        className={`w-full text-left p-2.5 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/20 transition-all flex justify-between items-center ${
                          c.estadoServicio === 'Inactivo' ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-[9px] font-bold text-slate-400">{c.id}</span>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1 rounded">{c.medidorId}</span>
                            {c.estadoServicio === 'Inactivo' && (
                              <span className="text-[8px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-1 rounded">INACTIVO</span>
                            )}
                          </div>
                          <span className={`text-xs font-bold block mt-0.5 ${c.estadoServicio === 'Inactivo' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{c.nombre}</span>
                          <span className="text-[10px] text-slate-500 block leading-tight">{c.direccion}</span>
                        </div>
                        {c.estadoServicio !== 'Inactivo' && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                      </button>
                    ))}

                    {searchQuery && pwaFilteredClientes.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xxs font-mono">
                        No se encontraron clientes activos.
                      </div>
                    )}

                    {!searchQuery && (
                      <div className="bg-slate-50 border border-slate-200/50 rounded-lg p-4 text-center text-xxs text-slate-400 font-mono">
                        Escriba parte del nombre para ver sugerencias rápidas de la comunidad de 1,000 clientes.
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPwaScreen('inicio');
                    setSearchQuery('');
                  }}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg text-xs font-semibold"
                >
                  Volver
                </button>
              </div>
            )}

            {/* SCREEN 3: ESCANEAR QR/NFC SIMULATOR */}
            {pwaScreen === 'escanear' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-xs text-slate-800">
                      {scanType === 'QR' ? 'Escáner Código QR' : 'Lector NFC Activo'}
                    </h3>
                    <button 
                      onClick={() => setPwaScreen('inicio')}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-tight mb-3">
                    {scanType === 'QR' 
                      ? 'Apunta la cámara del celular al adhesivo QR ubicado en la tapa interna de la caja del medidor.'
                      : 'Acerque el celular a la cápsula de comunicación NFC sellada arriba del dial del medidor.'}
                  </p>

                  {/* Viewfinder Mockup */}
                  <div className="relative h-44 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-700">
                    {scannedFeedback ? (
                      <div className="text-center p-3 text-white bg-emerald-600/95 absolute inset-0 flex flex-col items-center justify-center z-10 animate-in fade-in duration-150">
                        <Check className="h-10 w-10 text-white bg-white/20 p-2 rounded-full animate-bounce mb-1" />
                        <span className="text-xs font-bold">{scannedFeedback}</span>
                        <span className="text-[9px] text-emerald-200 font-mono mt-0.5">Sincronizando formulario...</span>
                      </div>
                    ) : (
                      <>
                        {/* Red flashing line for laser scanner */}
                        {scanType === 'QR' ? (
                          <>
                            <div className="absolute left-6 right-6 h-px bg-red-500 animate-pulse" style={{ top: '45%' }} />
                            <div className="w-24 h-24 border-2 border-sky-400 border-dashed rounded-lg animate-pulse" />
                          </>
                        ) : (
                          <div className="text-center text-sky-400 animate-pulse space-y-1.5">
                            <Smartphone className="h-8 w-8 mx-auto" />
                            <span className="text-[10px] font-mono tracking-widest block">ESCUCHANDO SEÑAL NFC...</span>
                          </div>
                        )}
                        <span className="absolute bottom-2 text-[9px] text-slate-400 font-mono">SIMULACIÓN SENSOR MÓVIL</span>
                      </>
                    )}
                  </div>

                  {/* List of mock hardware triggers */}
                  <div className="mt-4">
                    <span className="text-[10px] font-bold text-slate-600 block mb-1.5 uppercase font-mono">Simular aproximación física:</span>
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                      {/* Pick 3-4 representative clients to tap and simulate */}
                      {clientes.slice(15, 20).map((c, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSimulateScan(scanType, c)}
                          className={`w-full text-left p-2 bg-white hover:bg-sky-50 border border-slate-200 rounded-lg text-xxs flex justify-between items-center ${
                            c.estadoServicio === 'Inactivo' ? 'opacity-50' : ''
                          }`}
                        >
                          <div>
                            <span className={`font-semibold ${c.estadoServicio === 'Inactivo' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {c.nombre} {c.estadoServicio === 'Inactivo' && '(Inactivo)'}
                            </span>
                            <span className="text-slate-400 block">Medidor: {c.medidorId}</span>
                          </div>
                          <span className={`${c.estadoServicio === 'Inactivo' ? 'bg-slate-100 text-slate-400' : 'bg-sky-100 text-sky-800'} font-mono font-bold px-1 py-0.5 rounded text-[9px]`}>
                            {c.estadoServicio === 'Inactivo' ? 'Inactivo' : scanType === 'QR' ? 'Escanear QR' : 'Tocar NFC'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setPwaScreen('inicio')}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg text-xs font-semibold"
                >
                  Cancelar Escaneo
                </button>
              </div>
            )}

            {/* SCREEN 4: LECTURA FORMULARY / CAPTURE */}
            {pwaScreen === 'formulario' && selectedClient && (
              <form onSubmit={handleSubmitReading} className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div>
                      <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Lectura en Terreno</span>
                      <h3 className="font-bold text-xs text-slate-900 leading-tight">{selectedClient.nombre}</h3>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setPwaScreen('inicio')}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Client Metadata Card */}
                  <div className="bg-slate-100 p-2.5 rounded-lg text-xxs space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">DIRECCIÓN:</span>
                      <span className="font-bold text-slate-700 truncate max-w-[160px]">{selectedClient.direccion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">SECTOR / TIPO:</span>
                      <span className="font-bold text-slate-700">{selectedClient.sector} - {selectedClient.categoria}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ID MEDIDOR:</span>
                      <span className="font-bold text-sky-700">{selectedClient.medidorId}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 text-slate-600">
                      <span>MÉTODO CAPTURA:</span>
                      <span className="font-bold text-slate-800 bg-white px-1.5 rounded border border-slate-200 text-[9px]">{metodoCaptura}</span>
                    </div>
                  </div>

                  {/* Toggle impossibility of reading */}
                  <div className="flex items-center justify-between p-2 bg-rose-50 border border-rose-100 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <div>
                        <span className="text-[10px] font-bold text-rose-900 block leading-tight">¿Imposible Tomar Medición?</span>
                        <span className="text-[9px] text-rose-500 leading-none block">Predio cerrado, perro, fango...</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={imposibleLeer}
                      onChange={(e) => setImposibleLeer(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                    />
                  </div>

                  {/* FORM FIELDS */}
                  {!imposibleLeer ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3.5 bg-sky-50/50 p-2.5 rounded-lg border border-sky-100/60 text-center">
                        <div>
                          <span className="text-xxs text-slate-400 font-mono block uppercase">Anterior</span>
                          <span className="text-sm font-extrabold text-slate-700 font-mono leading-none mt-1 block">
                            {selectedClient.lecturaAnterior.toFixed(1)} <span className="text-xxs font-normal">m³</span>
                          </span>
                        </div>
                        <div className="border-l border-sky-100">
                          <span className="text-xxs text-slate-400 font-mono block uppercase">Consumo Estimado</span>
                          <span className="text-sm font-extrabold text-sky-700 font-mono leading-none mt-1 block">
                            ~22.0 <span className="text-xxs font-normal">m³</span>
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Ingrese Lectura Actual del Medidor (m³) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            required
                            placeholder="Ingrese m³ enteros y decimales..."
                            value={lecturaActualStr}
                            onChange={(e) => setLecturaActualStr(e.target.value)}
                            className="w-full text-xs p-2.5 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono font-bold text-center text-sm text-slate-900"
                          />
                        </div>
                      </div>

                      {/* Display Alert messages / Checks */}
                      {formChecks && formChecks.mensaje && (
                        <div className={`p-2 rounded-lg text-[10px] leading-tight ${
                          formChecks.validador === 'Error' ? 'bg-red-50 text-red-700 border border-red-100' :
                          formChecks.validador === 'Advertencia' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {formChecks.mensaje}
                        </div>
                      )}

                      {/* Estimated Billing Indicator */}
                      {formChecks && formChecks.validador === 'Ok' && (
                        <div className="bg-slate-100 p-2 rounded-lg text-xxs font-mono flex justify-between">
                          <span className="text-slate-500">PRESUPUESTO PREVIO:</span>
                          <span className="font-bold text-slate-800">
                            ${(formChecks.consumo * (selectedClient.categoria === 'Industrial' ? 2.5 : selectedClient.categoria === 'Comercial' ? 1.8 : 1.2)).toFixed(2)} CLP
                          </span>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="space-y-2 animate-in slide-in-from-top-1 duration-150">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                          Especifique Causa de la Imposibilidad de Lectura *
                        </label>
                        <div className="space-y-1.5 max-h-[190px] overflow-y-auto">
                          {CAUSAS_NO_LECTURA.map((causa, index) => (
                            <label
                              key={index}
                              className={`flex items-center space-x-2 p-2 rounded-lg border text-xxs cursor-pointer transition-colors ${
                                causaNoLectura === causa
                                  ? 'bg-rose-50 border-rose-200 text-rose-800 font-semibold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="causaNoLectura"
                                checked={causaNoLectura === causa}
                                onChange={() => setCausaNoLectura(causa)}
                                className="w-3.5 h-3.5 text-rose-600 border-slate-300 focus:ring-rose-500"
                              />
                              <span className="leading-tight">{causa}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                <div className="flex space-x-2 pt-3 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setPwaScreen('inicio');
                    }}
                    className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 py-2 rounded-lg border border-slate-200"
                  >
                    Salir
                  </button>
                  <button
                    type="submit"
                    className="flex-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 py-2 rounded-lg"
                  >
                    {isOfflineMode ? 'Guardar Offline' : 'Enviar Lectura'}
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Simulated smartphone bottom bar button / Nav */}
          <div className="bg-white border-t border-slate-100 px-5 py-3 flex justify-around text-slate-400 shrink-0 select-none" id="mobile_nav_bar">
            <button 
              onClick={() => {
                setSelectedClient(null);
                setSearchQuery('');
                setPwaScreen('inicio');
              }}
              className={`flex flex-col items-center space-y-0.5 ${pwaScreen === 'inicio' ? 'text-sky-600' : 'hover:text-slate-600'}`}
            >
              <Smartphone className="h-4.5 w-4.5" />
              <span className="text-[9px] font-medium leading-none">Inicio</span>
            </button>
            <button 
              onClick={() => setPwaScreen('buscar')}
              className={`flex flex-col items-center space-y-0.5 ${pwaScreen === 'buscar' ? 'text-sky-600' : 'hover:text-slate-600'}`}
            >
              <Search className="h-4.5 w-4.5" />
              <span className="text-[9px] font-medium leading-none">Buscar</span>
            </button>
            <button 
              onClick={() => {
                setScanType('QR');
                setPwaScreen('escanear');
              }}
              className={`flex flex-col items-center space-y-0.5 ${pwaScreen === 'escanear' ? 'text-sky-600' : 'hover:text-slate-600'}`}
            >
              <QrCode className="h-4.5 w-4.5" />
              <span className="text-[9px] font-medium leading-none">Escanear</span>
            </button>
          </div>

        </div>

        {/* Physical Home Button Indicator Bar */}
        <div className="h-1.5 w-28 bg-slate-800 rounded-full mx-auto mb-1 mt-2 shrink-0" />

      </div>
    </div>
  );
}
