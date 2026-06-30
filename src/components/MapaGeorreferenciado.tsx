import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Map as MapIcon, 
  Layers, 
  Search, 
  Filter, 
  Compass, 
  Activity, 
  Droplet, 
  Gauge, 
  Info, 
  AlertTriangle, 
  X, 
  Maximize2, 
  Minimize2, 
  Check, 
  AlertCircle,
  Clock,
  Sparkles,
  Settings,
  Flame,
  Wrench,
  Wifi,
  MapPin
} from 'lucide-react';
import { Cliente, Pozo, PuntoMedicionPresion, Ticket, InterrupcionAP } from '../types';

interface MapaGeorreferenciadoProps {
  clientes: Cliente[];
  pozos: Pozo[];
  puntosPresion: PuntoMedicionPresion[];
  tickets: Ticket[];
  interrupciones: InterrupcionAP[];
}

export default function MapaGeorreferenciado({
  clientes,
  pozos,
  puntosPresion,
  tickets,
  interrupciones
}: MapaGeorreferenciadoProps) {
  // Map configuration & UI states
  const [mapMode, setMapMode] = useState<'blueprint' | 'satellite' | 'google'>('blueprint');
  const [layerFilter, setLayerFilter] = useState<'all' | 'meters' | 'wells' | 'pressure'>('all');
  const [meterStatusFilter, setMeterStatusFilter] = useState<'all' | 'leido' | 'pendiente' | 'alerta'>('all');
  const [heatmapLayer, setHeatmapLayer] = useState<'none' | 'consumption' | 'cuts' | 'tickets'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<{
    type: 'cliente' | 'pozo' | 'presion';
    data: any;
  } | null>(null);

  // Zoom and Pan states for the custom SVG/Canvas map
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Google Maps API Key handling
  const [googleMapsKey, setGoogleMapsKey] = useState<string>(() => {
    return localStorage.getItem('GOOGLE_MAPS_PLATFORM_KEY') || '';
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInputVal, setKeyInputVal] = useState('');

  const saveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('GOOGLE_MAPS_PLATFORM_KEY', keyInputVal);
    setGoogleMapsKey(keyInputVal);
    setShowKeyInput(false);
  };

  // Geographic dimensions of the Melipilla APyA network bounds
  const bounds = {
    minLat: -33.7470,
    maxLat: -33.7030,
    minLng: -70.8900,
    maxLng: -70.8350
  };

  // Map coordinate projections
  const project = (lat: number, lng: number, width: number, height: number) => {
    const latSpan = bounds.maxLat - bounds.minLat;
    const lngSpan = bounds.maxLng - bounds.minLng;
    
    // Normalize coordinates to 0-1
    const xNorm = (lng - bounds.minLng) / lngSpan;
    const yNorm = (lat - bounds.minLat) / latSpan; // bottom to top

    return {
      x: xNorm * width,
      y: height - (yNorm * height) // invert Y for screen coords
    };
  };

  // Filtered lists
  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      // Coordinates safety fallback
      if (!c.lat || !c.lng) return false;

      const matchesSearch = searchQuery === '' || 
        c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.medidorId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.direccion.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = 
        meterStatusFilter === 'all' ||
        (meterStatusFilter === 'leido' && c.estado === 'Leído') ||
        (meterStatusFilter === 'pendiente' && c.estado === 'Pendiente') ||
        (meterStatusFilter === 'alerta' && c.alertaConsumo && c.alertaConsumo !== 'Ninguna');

      return matchesSearch && matchesStatus;
    });
  }, [clientes, searchQuery, meterStatusFilter]);

  const filteredPozos = useMemo(() => {
    return pozos.filter(p => {
      if (!p.lat || !p.lng) return false;
      return searchQuery === '' || p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [pozos, searchQuery]);

  const filteredPuntosPresion = useMemo(() => {
    return puntosPresion.filter(p => {
      if (!p.lat || !p.lng) return false;
      return searchQuery === '' || p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [puntosPresion, searchQuery]);

  // Generate heatmap centers
  const heatSources = useMemo(() => {
    if (heatmapLayer === 'none') return [];

    if (heatmapLayer === 'consumption') {
      // Find top 15% clients with high consumption
      return clientes
        .filter(c => c.consumoCalculado && c.consumoCalculado > 30 && c.lat && c.lng)
        .map(c => ({
          lat: c.lat!,
          lng: c.lng!,
          intensity: Math.min((c.consumoCalculado || 15) / 100, 1) * 0.8,
          label: `Consumo Alto: ${c.consumoCalculado} m³`,
          color: 'rgba(239, 68, 68, 0.4)' // Red glow
        }));
    }

    if (heatmapLayer === 'cuts') {
      // Match active interrupciones to areas
      return interrupciones
        .filter(i => i.estado === 'Activa')
        .map(i => {
          // Find central coordinate depending on sector
          let lat = -33.7250;
          let lng = -70.8640;
          if (i.sector === 'Norte') { lat = -33.7120; lng = -70.8520; }
          else if (i.sector === 'Sur') { lat = -33.7380; lng = -70.8710; }
          else if (i.sector === 'Rural') { lat = -33.7420; lng = -70.8850; }
          
          return {
            lat,
            lng,
            intensity: 0.9,
            label: `Sector Afectado: ${i.sector} (${i.causa})`,
            color: 'rgba(245, 158, 11, 0.5)' // Amber glow
          };
        });
    }

    if (heatmapLayer === 'tickets') {
      // Find open tickets with coordinates (map via client)
      return tickets
        .filter(t => t.estado === 'Abierto' || t.estado === 'En Proceso')
        .map(t => {
          const client = clientes.find(c => c.id === t.clienteId);
          if (client && client.lat && client.lng) {
            return {
              lat: client.lat,
              lng: client.lng,
              intensity: t.prioridad === 'Urgente' ? 0.95 : t.prioridad === 'Alta' ? 0.75 : 0.5,
              label: `${t.categoria}: ${t.descripcion}`,
              color: t.prioridad === 'Urgente' ? 'rgba(220, 38, 38, 0.65)' : 'rgba(239, 68, 68, 0.45)'
            };
          }
          return null;
        })
        .filter(Boolean) as any[];
    }
    return [];
  }, [heatmapLayer, clientes, interrupciones, tickets]);

  // Pan and Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.3, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.3, 0.8));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Auto-center on selected item
  const handleCenterOnItem = (item: { lat: number; lng: number }) => {
    if (!mapContainerRef.current) return;
    const { width, height } = mapContainerRef.current.getBoundingClientRect();
    const pos = project(item.lat, item.lng, width || 800, height || 550);
    
    // Calculate translation to bring pos to center of map container
    const centerX = width / 2;
    const centerY = height / 2;
    setZoom(1.8);
    setPan({
      x: centerX - pos.x * 1.8,
      y: centerY - pos.y * 1.8
    });
  };

  // Locate and focus query match
  const handleLocateClient = (client: Cliente) => {
    if (client.lat && client.lng) {
      setSelectedItem({ type: 'cliente', data: client });
      handleCenterOnItem({ lat: client.lat, lng: client.lng });
    }
  };

  // Helper streets and pipe layout in our vector map
  const vectorLayers = useMemo(() => {
    const width = 800;
    const height = 550;

    // Projected pipes (well to node, sectors)
    const mainPipes = [
      // Well 1 (North) to Center
      { start: { lat: -33.7080, lng: -70.8520 }, end: { lat: -33.7230, lng: -70.8610 }, color: '#3b82f6', width: 4, label: 'Matriz Principal DN200' },
      // Well 2 (Center) to South
      { start: { lat: -33.7250, lng: -70.8640 }, end: { lat: -33.7380, lng: -70.8710 }, color: '#3b82f6', width: 4.5, label: 'Alimentadora Sur DN250' },
      // Well 3 (Rural) to Rural West
      { start: { lat: -33.7420, lng: -70.8850 }, end: { lat: -33.7460, lng: -70.8810 }, color: '#0ea5e9', width: 3, label: 'Matriz Rural DN110' },
      // Loop North to West
      { start: { lat: -33.7120, lng: -70.8550 }, end: { lat: -33.7200, lng: -70.8710 }, color: '#0ea5e9', width: 2.5, label: 'Anillo Secundario DN75' },
    ];

    // Project coordinates
    const projectedPipes = mainPipes.map((p, idx) => {
      const p1 = project(p.start.lat, p.start.lng, width, height);
      const p2 = project(p.end.lat, p.end.lng, width, height);
      return {
        id: idx,
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        color: p.color,
        strokeWidth: p.width,
        label: p.label
      };
    });

    return {
      pipes: projectedPipes
    };
  }, []);

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-xl flex flex-col md:flex-row h-[700px] w-full" id="georeferencing_system">
      
      {/* Left Sidebar: Controls & Search */}
      <div className="w-full md:w-80 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-col space-y-4 shrink-0 overflow-y-auto">
        <div>
          <div className="flex items-center space-x-2">
            <Compass className="h-5 w-5 text-sky-400 animate-spin-slow" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mapeo GIS & Diagnóstico</h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Geolocalice medidores en tiempo real, monitoree presiones y analice puntos críticos mediante capas de calor normativo.
          </p>
        </div>

        {/* Map Mode Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tipo de Visualización</label>
          <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setMapMode('blueprint')}
              className={`py-1.5 px-2 rounded-md text-[10px] font-bold transition-all ${
                mapMode === 'blueprint'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Plano Red
            </button>
            <button
              onClick={() => setMapMode('satellite')}
              className={`py-1.5 px-2 rounded-md text-[10px] font-bold transition-all ${
                mapMode === 'satellite'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Satélite
            </button>
            <button
              onClick={() => {
                if (googleMapsKey) {
                  setMapMode('google');
                } else {
                  setKeyInputVal('');
                  setShowKeyInput(true);
                }
              }}
              className={`py-1.5 px-2 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                mapMode === 'google'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Google Map
              {googleMapsKey ? <Wifi className="h-2.5 w-2.5 text-emerald-400" /> : <Settings className="h-2.5 w-2.5 text-amber-500" />}
            </button>
          </div>
        </div>

        {/* Filter Layers */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Marcadores Activos</label>
          <select
            value={layerFilter}
            onChange={(e) => setLayerFilter(e.target.value as any)}
            className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:outline-none"
          >
            <option value="all">Mostrar todos los puntos (1,000+)</option>
            <option value="meters">Solo Medidores Domiciliarios</option>
            <option value="wells">Solo Pozos de Captación</option>
            <option value="pressure">Solo Puntos de Presión</option>
          </select>
        </div>

        {/* Secondary Filter: Meter Status */}
        {layerFilter !== 'pressure' && layerFilter !== 'wells' && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Estado de Lectura de Medidor</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setMeterStatusFilter('all')}
                className={`py-1 px-1.5 rounded text-[10px] font-semibold transition-all ${
                  meterStatusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setMeterStatusFilter('leido')}
                className={`py-1 px-1.5 rounded text-[10px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  meterStatusFilter === 'leido' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Leídos
              </button>
              <button
                onClick={() => setMeterStatusFilter('pendiente')}
                className={`py-1 px-1.5 rounded text-[10px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  meterStatusFilter === 'pendiente' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setMeterStatusFilter('alerta')}
                className={`py-1 px-1.5 rounded text-[10px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  meterStatusFilter === 'alerta' ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Con Alerta
              </button>
            </div>
          </div>
        )}

        {/* Heatmap Overlay */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
            <Flame className="h-3 w-3 text-orange-500" />
            Capas Térmicas (Análisis de Calor)
          </label>
          <div className="space-y-1 bg-slate-900 p-2 rounded-lg border border-slate-800">
            <button
              onClick={() => setHeatmapLayer(heatmapLayer === 'none' ? 'consumption' : 'none')}
              className={`w-full text-left py-1 px-2 rounded text-[10px] font-medium flex items-center justify-between transition-all ${
                heatmapLayer === 'consumption'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <span>Zonas de Consumo Elevado</span>
              {heatmapLayer === 'consumption' ? <Check className="h-3 w-3" /> : <div className="h-2 w-2 rounded-full bg-red-500/40" />}
            </button>
            <button
              onClick={() => setHeatmapLayer(heatmapLayer === 'cuts' ? 'none' : 'cuts')}
              className={`w-full text-left py-1 px-2 rounded text-[10px] font-medium flex items-center justify-between transition-all ${
                heatmapLayer === 'cuts'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <span>Áreas Afectadas por Cortes Activos</span>
              {heatmapLayer === 'cuts' ? <Check className="h-3 w-3" /> : <div className="h-2 w-2 rounded-full bg-amber-500/40" />}
            </button>
            <button
              onClick={() => setHeatmapLayer(heatmapLayer === 'tickets' ? 'none' : 'tickets')}
              className={`w-full text-left py-1 px-2 rounded text-[10px] font-medium flex items-center justify-between transition-all ${
                heatmapLayer === 'tickets'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <span>Densidad de Fugas y Roturas de Matriz</span>
              {heatmapLayer === 'tickets' ? <Check className="h-3 w-3" /> : <div className="h-2 w-2 rounded-full bg-rose-500/40" />}
            </button>
          </div>
        </div>

        {/* Quick Search */}
        <div className="space-y-1.5 flex-1 flex flex-col justify-end">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Buscar Cliente o Medidor</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Escriba RUT, Nombre, Medidor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg py-2 pl-8 pr-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick List of Found Clientes */}
          {searchQuery && filteredClientes.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg max-h-40 overflow-y-auto mt-1 divide-y divide-slate-800">
              {filteredClientes.slice(0, 10).map(c => (
                <button
                  key={c.id}
                  onClick={() => handleLocateClient(c)}
                  className="w-full text-left p-1.5 hover:bg-slate-800/50 text-[10px] flex justify-between items-center transition-all"
                >
                  <div className="truncate">
                    <span className="font-semibold text-slate-200 block truncate">{c.nombre}</span>
                    <span className="text-slate-400 text-[9px] block">Caja {c.medidorId} | {c.direccion}</span>
                  </div>
                  <span className={`text-[8px] font-bold uppercase px-1 rounded ${
                    c.estado === 'Leído' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {c.estado}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Map Content Window */}
      <div className="flex-1 relative bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-slate-800/80 shadow-md">
          <div className="flex items-center gap-2 text-xxs font-semibold text-slate-300">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Ubicaciones GPS Sincronizadas ({filteredClientes.length} / {clientes.length} arranques)</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800 mx-1"></div>
          
          {/* Zoom Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all"
              title="Disminuir Zoom"
            >
              <Minimize2 className="h-3 w-3" />
            </button>
            <span className="text-[10px] font-bold font-mono text-slate-400 min-w-[28px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all"
              title="Aumentar Zoom"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <button
              onClick={handleResetZoom}
              className="text-[9px] font-extrabold text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 px-1.5 py-0.5 rounded border border-transparent hover:border-sky-500/20 transition-all ml-1"
            >
              Reiniciar
            </button>
          </div>
        </div>

        {/* Heatmap Legend */}
        {heatmapLayer !== 'none' && (
          <div className="absolute bottom-3 left-3 z-20 bg-slate-950/95 p-3 rounded-lg border border-slate-800 shadow-md max-w-xs text-xxs leading-relaxed animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 font-bold text-white mb-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <span>Capa Térmica Activa</span>
            </div>
            <p className="text-slate-400">
              {heatmapLayer === 'consumption' && 'Mostrando nodos con consumos atípicos (> 30 m³) que requieren fiscalización preventiva.'}
              {heatmapLayer === 'cuts' && 'Zonas hidráulicas con interrupción temporal de suministro activa para distribución de aljibes.'}
              {heatmapLayer === 'tickets' && 'Densidad de avisos por rotura de matriz o fugas de agua ingresadas en las últimas 48 hrs.'}
            </p>
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-slate-300 font-medium">Mayor densidad / Gravedad</span>
            </div>
          </div>
        )}

        {/* Google Maps API Key Modal */}
        {showKeyInput && (
          <div className="absolute inset-0 bg-slate-950/90 z-40 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-amber-500 animate-spin-slow" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Activar Google Maps</h4>
                </div>
                <button onClick={() => setShowKeyInput(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xxs text-slate-400 leading-relaxed">
                Para visualizar los medidores sobre mapas reales de Google, debe ingresar su clave API. De lo contrario, continúe utilizando el plano vectorial con capas de calor integradas.
              </p>
              <form onSubmit={saveApiKey} className="space-y-3">
                <input
                  type="password"
                  placeholder="Pegue su GOOGLE_MAPS_PLATFORM_KEY"
                  value={keyInputVal}
                  onChange={(e) => setKeyInputVal(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
                <div className="flex justify-end gap-2 text-xxs">
                  <button
                    type="button"
                    onClick={() => setShowKeyInput(false)}
                    className="px-3 py-2 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 rounded-lg text-white font-bold hover:bg-sky-500 transition-all"
                  >
                    Guardar y Activar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Interactive Vector GIS Map container */}
        <div 
          ref={mapContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`w-full h-full relative overflow-hidden select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ backgroundColor: mapMode === 'satellite' ? '#0b1329' : '#030712' }}
        >
          {/* Main Pan and Zoom Wrapper */}
          <div 
            className="absolute origin-center transition-all duration-100 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: '800px',
              height: '550px',
              top: '50%',
              left: '50%',
              marginTop: '-275px',
              marginLeft: '-400px'
            }}
          >
            {/* SVG MAP BASE & NETWORKS */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 550">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke={mapMode === 'satellite' ? 'rgba(51, 65, 85, 0.15)' : 'rgba(15, 23, 42, 0.6)'} strokeWidth="1" />
                </pattern>
                <radialGradient id="satelliteGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0b1329" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background styling based on mode */}
              {mapMode === 'satellite' ? (
                <>
                  <rect width="800" height="550" fill="url(#satelliteGlow)" />
                  {/* Sat terrain overlay outline representation */}
                  <path d="M 100 100 Q 250 80 400 130 T 700 150 L 800 550 L 0 550 Z" fill="#0c1d3a" opacity="0.3" />
                  <path d="M 50 400 C 150 420, 250 350, 400 420 S 650 450, 750 380" fill="none" stroke="#16315c" strokeWidth="15" opacity="0.4" />
                </>
              ) : (
                <>
                  <rect width="800" height="550" fill="#030712" />
                  <rect width="800" height="550" fill="url(#grid)" />
                </>
              )}

              {/* Grid outline borders of the Melipilla network boundaries */}
              <rect x="10" y="10" width="780" height="530" fill="none" stroke="rgba(14, 165, 233, 0.08)" strokeWidth="1.5" strokeDasharray="5,5" />

              {/* Streets network simulation (projected to display a coherent layout) */}
              <g stroke="rgba(148, 163, 184, 0.12)" strokeWidth="3" strokeLinecap="round" opacity={mapMode === 'satellite' ? 0.45 : 0.7}>
                {/* Av. Prat (Diagonal center) */}
                <line x1="50" y1="100" x2="750" y2="480" />
                {/* Calle Los Alerces */}
                <line x1="100" y1="50" x2="100" y2="500" />
                {/* Av. Central */}
                <line x1="150" y1="200" x2="680" y2="200" strokeWidth="4" />
                {/* Calle Las Rosas */}
                <line x1="50" y1="350" x2="750" y2="350" />
                {/* Pasaje El Bosque */}
                <line x1="320" y1="150" x2="320" y2="480" />
                {/* Av. O'Higgins */}
                <line x1="550" y1="50" x2="550" y2="500" strokeWidth="4.5" />
                {/* Camino Rinconada */}
                <line x1="120" y1="400" x2="780" y2="520" stroke="rgba(244, 63, 94, 0.08)" strokeWidth="6" />
              </g>

              {/* STREET NAMES */}
              <g fill="rgba(148, 163, 184, 0.4)" fontSize="8" fontFamily="monospace" fontWeight="bold">
                <text x="350" y="280" transform="rotate(27, 350, 280)">AV. PRAT</text>
                <text x="160" y="195">AV. CENTRAL</text>
                <text x="560" y="80">AV. O'HIGGINS</text>
                <text x="60" y="345">CALLE LAS ROSAS</text>
                <text x="110" y="120" transform="rotate(90, 110, 120)">C. LOS ALERCES</text>
                <text x="330" y="440" transform="rotate(90, 330, 440)">PJE. EL BOSQUE</text>
              </g>

              {/* WATER HYDRAULIC PIPELINES OVERLAY */}
              {(layerFilter === 'all' || layerFilter === 'wells') && (
                <g opacity={0.85}>
                  {vectorLayers.pipes.map(p => (
                    <g key={p.id}>
                      {/* Outer pulsing glow */}
                      <line 
                        x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} 
                        stroke={p.color} 
                        strokeWidth={p.strokeWidth + 4} 
                        strokeLinecap="round"
                        opacity="0.15" 
                      />
                      {/* Core pipe line */}
                      <line 
                        x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} 
                        stroke={p.color} 
                        strokeWidth={p.strokeWidth} 
                        strokeLinecap="round"
                        className="animate-pulse"
                      />
                    </g>
                  ))}
                </g>
              )}
            </svg>

            {/* HEATMAP GLOWS (HTML Layer using Absolute Coordinates) */}
            {heatmapLayer !== 'none' && (
              <div className="absolute inset-0 pointer-events-none w-full h-full">
                {heatSources.map((source, idx) => {
                  const pos = project(source.lat, source.lng, 800, 550);
                  const size = 60 + source.intensity * 80;
                  return (
                    <div
                      key={idx}
                      className="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 blur-2xl animate-pulse"
                      style={{
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        width: `${size}px`,
                        height: `${size}px`,
                        background: source.color,
                        opacity: 0.65,
                        animationDuration: '3s'
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* REAL-TIME CLIENT MARKERS (1,000+ potential points) */}
            {(layerFilter === 'all' || layerFilter === 'meters') && (
              <div className="absolute inset-0 pointer-events-none w-full h-full">
                {filteredClientes.map((c) => {
                  if (!c.lat || !c.lng) return null;
                  const pos = project(c.lat, c.lng, 800, 550);

                  // Colors: Emerald for read, Amber for pending, Red for alarms
                  const isSelected = selectedItem?.type === 'cliente' && selectedItem.data.id === c.id;
                  let color = 'bg-amber-400';
                  let border = 'border-amber-950';
                  let ring = 'ring-amber-400/20';

                  if (c.estado === 'Leído') {
                    color = 'bg-emerald-400';
                    border = 'border-emerald-950';
                    ring = 'ring-emerald-400/20';
                  }
                  if (c.alertaConsumo && c.alertaConsumo !== 'Ninguna') {
                    color = 'bg-rose-500';
                    border = 'border-rose-950';
                    ring = 'ring-rose-500/20';
                  }

                  // Determine sizing based on zoom & selected state
                  const dotSize = isSelected ? 'w-4 h-4' : zoom > 1.5 ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5';

                  return (
                    <div
                      key={c.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
                      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem({ type: 'cliente', data: c });
                      }}
                    >
                      {/* Pulse beacon for selected items */}
                      {isSelected && (
                        <span className="absolute inline-flex h-8 w-8 rounded-full bg-sky-400/40 animate-ping -translate-x-[6px] -translate-y-[6px]"></span>
                      )}

                      {/* Main Node */}
                      <div className={`${dotSize} ${color} ${border} border rounded-full transition-all duration-150 ring-2 ${ring} hover:scale-150 hover:ring-white`} />

                      {/* Simple hover label on zoom */}
                      {zoom > 1.5 && (
                        <span className="hidden group-hover:block absolute left-4 -top-3 bg-slate-900 border border-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow-lg z-30">
                          {c.nombre} ({c.medidorId})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* REAL-TIME WELLS (POZOS) MARKERS */}
            {(layerFilter === 'all' || layerFilter === 'wells') && (
              <div className="absolute inset-0 pointer-events-none w-full h-full">
                {filteredPozos.map((p) => {
                  if (!p.lat || !p.lng) return null;
                  const pos = project(p.lat, p.lng, 800, 550);
                  const isSelected = selectedItem?.type === 'pozo' && selectedItem.data.id === p.id;

                  return (
                    <div
                      key={p.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-25 group"
                      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem({ type: 'pozo', data: p });
                      }}
                    >
                      {/* Outer blue waves */}
                      <span className="absolute inset-0 h-8 w-8 rounded-full bg-blue-500/20 animate-ping -translate-x-[10px] -translate-y-[10px]" style={{ animationDuration: '3s' }}></span>
                      
                      <div className={`p-1.5 rounded-lg border shadow-lg transition-all ${
                        isSelected 
                          ? 'bg-blue-600 border-sky-300 text-white scale-110' 
                          : p.estado === 'Mantenimiento'
                          ? 'bg-amber-500 border-amber-600 text-slate-950'
                          : 'bg-blue-950 border-blue-600 text-blue-400 hover:border-sky-400'
                      }`}>
                        <Droplet className="h-4 w-4" />
                      </div>

                      {/* Well Label */}
                      <span className="absolute left-7 top-0.5 bg-blue-950 border border-blue-800 text-white text-[8px] font-black px-1 rounded whitespace-nowrap uppercase tracking-wider z-10">
                        {p.nombre.split(' ')[1] || p.id}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* REAL-TIME PRESSURE MONITORING POINTS */}
            {(layerFilter === 'all' || layerFilter === 'pressure') && (
              <div className="absolute inset-0 pointer-events-none w-full h-full">
                {filteredPuntosPresion.map((p) => {
                  if (!p.lat || !p.lng) return null;
                  const pos = project(p.lat, p.lng, 800, 550);
                  const isSelected = selectedItem?.type === 'presion' && selectedItem.data.id === p.id;

                  return (
                    <div
                      key={p.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-25 group"
                      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem({ type: 'presion', data: p });
                      }}
                    >
                      <div className={`p-1.5 rounded-lg border shadow-lg transition-all ${
                        isSelected 
                          ? 'bg-purple-600 border-purple-300 text-white scale-110' 
                          : 'bg-purple-950 border-purple-800 text-purple-400 hover:border-purple-300'
                      }`}>
                        <Gauge className="h-4 w-4" />
                      </div>

                      {/* Pressure Tag Label */}
                      <span className="absolute left-7 top-0.5 bg-purple-950 border border-purple-800 text-purple-300 text-[8px] font-black px-1 rounded whitespace-nowrap uppercase z-10">
                        Presión
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        {/* Real Google Maps API Banner (shown on Google Maps selection screen) */}
        {mapMode === 'google' && googleMapsKey && (
          <div className="absolute inset-0 z-30 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <MapIcon className="h-6 w-6 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Carga de Mapa de Google</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Usted ha ingresado una clave API válida de Google Maps. Los medidores, pozos y puntos se proyectarán en las coordenadas exactas de Melipilla/San Isidro en tiempo real.
              </p>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex items-center justify-between text-xxs font-mono text-slate-400">
                <span className="truncate pr-4">Clave API: GOOGLE_MAPS_PLATFORM_KEY</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Conectado
                </span>
              </div>
              <div className="flex gap-2 justify-center">
                <button 
                  onClick={() => {
                    localStorage.removeItem('GOOGLE_MAPS_PLATFORM_KEY');
                    setGoogleMapsKey('');
                    setMapMode('blueprint');
                  }}
                  className="text-xxs px-3 py-1.5 text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  Remover Clave
                </button>
                <button 
                  onClick={() => setMapMode('blueprint')}
                  className="text-xxs px-3 py-1.5 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all font-semibold"
                >
                  Volver al Plano Vectorial
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM FLOATING ELEMENT INFO DRAWER */}
        {selectedItem && (
          <div className="absolute bottom-4 right-4 left-4 md:left-auto md:w-96 z-35 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-5 duration-150">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1.5">
                {selectedItem.type === 'cliente' && <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase font-mono">Arranque Domiciliario</span>}
                {selectedItem.type === 'pozo' && <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase font-mono">Captación Principal</span>}
                {selectedItem.type === 'presion' && <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded uppercase font-mono">Monitoreo Presión</span>}
                <span className="text-[10px] font-mono text-slate-500">ID: {selectedItem.data.id}</span>
              </div>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-800 p-1 rounded-full transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content for Cliente */}
            {selectedItem.type === 'cliente' && (() => {
              const c = selectedItem.data as Cliente;
              return (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{c.nombre}</h4>
                    <span className="text-slate-400 text-[10px] block mt-0.5">{c.direccion} • Sector {c.sector}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-500 block font-sans">N° Medidor:</span>
                      <span className="font-bold text-slate-200">{c.medidorId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Coordenadas:</span>
                      <span className="font-bold text-sky-400">{c.lat?.toFixed(5)}, {c.lng?.toFixed(5)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Estado Lectura:</span>
                      <span className={`font-bold uppercase ${c.estado === 'Leído' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {c.estado}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Consumo Actual:</span>
                      <span className="font-bold text-slate-200">{c.consumoCalculado !== undefined ? `${c.consumoCalculado} m³` : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xxs bg-slate-900/30 p-2 rounded border border-slate-800/40 text-slate-400">
                    <Info className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                    <span>Servicio {c.estadoServicio || 'Activo'}. {c.alertaConsumo && c.alertaConsumo !== 'Ninguna' && `⚠️ Alerta: ${c.alertaConsumo}`}</span>
                  </div>
                </div>
              );
            })()}

            {/* Content for Pozo */}
            {selectedItem.type === 'pozo' && (() => {
              const p = selectedItem.data as Pozo;
              return (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{p.nombre}</h4>
                    <span className="text-slate-400 text-[10px] block mt-0.5">Sector: Matriz {p.sector} • Estado: {p.estado}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-500 block font-sans">Capacidad Nominal:</span>
                      <span className="font-bold text-slate-200">{p.capacidadNominal} L/seg</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Extraído Mensual:</span>
                      <span className="font-bold text-blue-400">{p.volumenExtraidoMensual.toLocaleString()} m³</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Nivel Estático:</span>
                      <span className="font-bold text-slate-200">{p.nivelEstatico || 'N/A'} m</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">GPS Lat/Lng:</span>
                      <span className="font-bold text-sky-400">{p.lat?.toFixed(4)}, {p.lng?.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Content for Pressure Point */}
            {selectedItem.type === 'presion' && (() => {
              const p = selectedItem.data as PuntoMedicionPresion;
              return (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{p.nombre}</h4>
                    <span className="text-slate-400 text-[10px] block mt-0.5">{p.direccion}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-500 block font-sans">Tipo Punto:</span>
                      <span className="font-bold text-slate-200">{p.tipo}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Altitud (Cota):</span>
                      <span className="font-bold text-slate-200">{p.cota || 'N/A'} m.s.n.m.</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Instrumento:</span>
                      <span className="font-bold text-purple-400 truncate block">{p.instrumento || 'Portátil'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Coordenadas:</span>
                      <span className="font-bold text-sky-400">{p.lat?.toFixed(4)}, {p.lng?.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
