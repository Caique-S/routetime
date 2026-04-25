// app/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  RefreshCw,
  Filter,
  Calendar,
  BarChart3,
  Clock,
  AlertCircle,
  TrendingUp,
  Truck,
  Package,
  Box,
  Gauge,
  Route,
  CheckCircle,
  Loader2,
  ArrowUpDown,
  Info,
  ClipboardList,
} from 'lucide-react';

// Interfaces (mantidas das outras páginas)
interface CarregamentoData {
  id: string;
  motoristaId?: string;
  doca: string;
  carga: {
    gaiolas: string;
    volumosos: string;
    manga: string;
  };
  horarios: {
    encostadoDoca: string;
    inicioCarregamento: string;
    terminoCarregamento: string;
    saidaLiberada: string;
    previsaoChegada: string;
  };
  lacres: {
    traseiro: string;
    lateral1?: string;
    lateral2?: string;
  };
  motorista: {
    nome: string;
    tipoVeiculo: string;
    veiculoTracao: string;
    veiculoCarga: string;
    travelId: string;
    placa: string;
    transportadora: string;
    dataInicio: string;
  };
  status?: 'emFila' | 'carregando' | 'liberado' | 'not_used' | '';
  posicaoVeiculo?: number;
  destino: string;
  facility: string;
  timestamp: string;
  finalizado?: boolean;
  dataCriacao?: string;
}

interface DestinoInfo {
  nome: string;
  codigo: string;
  facility: string;
  motoristasCount: number;
  veiculosCount: number;
}

type StatusFilter = 'todos' | 'emFila' | 'carregando' | 'liberado' | 'finalizado';

// Mapeamento de nomes de destinos (igual às outras páginas)
const getNomeDestino = (codigo: string): string => {
  const mapeamento: Record<string, string> = {
    EBA14: 'Serrinha',
    EBA4: 'Santo Antônio de Jesus',
    EBA19: 'Itaberaba',
    EBA3: 'Jacobina',
    EBA2: 'Pombal',
    EBA16: 'Senhor do Bonfim',
    EBA21: 'Seabra',
    EBA6: 'Juazeiro',
    EBA29: 'Valença',
  };
  return mapeamento[codigo] || codigo;
};

// Funções utilitárias
const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateToBR = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
};

const formatTime = (time: string): string => {
  if (!time) return '--:--';
  if (time.includes('T')) {
    // Formato ISO
    return new Date(time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  // Já está em HH:MM
  return time.substring(0, 5);
};

const parseTimeToMinutes = (time: string): number | null => {
  if (!time) return null;
  const cleaned = time.includes('T') ? new Date(time).toISOString().substring(11, 16) : time.substring(0, 5);
  const [hours, minutes] = cleaned.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const calcularDiferencaHoras = (inicio: string, fim: string): number | null => {
  const minInicio = parseTimeToMinutes(inicio);
  const minFim = parseTimeToMinutes(fim);
  if (minInicio === null || minFim === null) return null;
  let diff = minFim - minInicio;
  if (diff < 0) diff += 24 * 60; // considera virada de dia
  return diff;
};

export default function DashboardPage() {
  const router = useRouter();
  const [carregamentos, setCarregamentos] = useState<CarregamentoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<string>(getTodayDateString());
  const [facilitySelecionada, setFacilitySelecionada] = useState<string>('todas');
  const [statusFiltro, setStatusFiltro] = useState<StatusFilter>('todos');
  const [facilitiesDisponiveis, setFacilitiesDisponiveis] = useState<string[]>([]);

  // Buscar dados combinados (API + localStorage)
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar carregamentos da API (banco) - com filtro de data e facility
      const params = new URLSearchParams();
      params.append('limit', '500'); // Buscar bastante
      if (facilitySelecionada !== 'todas') {
        params.append('facility', facilitySelecionada);
      }
      // A API pode não ter filtro de data; faremos no cliente
      const response = await fetch(`/api/carregamento?${params.toString()}`);
      const apiData = await response.json();

      let carregamentosApi: CarregamentoData[] = [];
      if (apiData.success && apiData.data) {
        // Filtrar por data (campo dataCriacao ou timestamp)
        carregamentosApi = apiData.data.filter((c: CarregamentoData) => {
          const dataCar = c.dataCriacao || c.timestamp || '';
          return dataCar.startsWith(dataSelecionada);
        }).map((c: any) => ({
          ...c,
          finalizado: true, // os que vêm da API estão finalizados
        }));
      }

      // 2. Coletar carregamentos do localStorage (não finalizados/ativos)
      const carregamentosLocal: CarregamentoData[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('carregamentos_')) {
          try {
            const dataStr = localStorage.getItem(key);
            if (!dataStr) continue;
            const data = JSON.parse(dataStr);
            // A chave contém vários carregamentos indexados por motoristaId
            for (const motoristaId in data) {
              const car = data[motoristaId];
              // Consideramos apenas os não finalizados (ativos)
              if (car && !car.finalizado) {
                // Adicionar campos que podem faltar
                carregamentosLocal.push({
                  ...car,
                  motoristaId: motoristaId,
                  finalizado: false,
                });
              }
            }
          } catch (e) {
            console.warn('Erro ao parsear localStorage key:', key, e);
          }
        }
      }

      // 3. Combinar listas (evitando duplicatas por motoristaId, priorizando localStorage)
      const localIds = new Set(carregamentosLocal.map(c => c.motoristaId));
      const apiFiltrada = carregamentosApi.filter(c => !localIds.has(c.motoristaId));
      const todos = [...carregamentosLocal, ...apiFiltrada];

      // 4. Extrair facilities únicas
      const facilities = new Set<string>();
      todos.forEach(c => {
        if (c.facility) facilities.add(c.facility);
      });
      setFacilitiesDisponiveis(Array.from(facilities).sort());

      // 5. Aplicar filtro de data também aos locais (embora devam ser de hoje, por segurança)
      const carregamentosFiltrados = todos.filter(c => {
        const dataCar = c.dataCriacao || c.timestamp || '';
        // Se não tiver data, considerar como hoje (local)
        if (!dataCar) return true;
        return dataCar.startsWith(dataSelecionada);
      });

      setCarregamentos(carregamentosFiltrados);

    } catch (err: any) {
      console.error('Erro ao buscar dados do dashboard:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dataSelecionada, facilitySelecionada]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Estatísticas calculadas
  const stats = {
    total: carregamentos.length,
    ativos: carregamentos.filter(c => !c.finalizado).length,
    finalizados: carregamentos.filter(c => c.finalizado).length,
    emFila: carregamentos.filter(c => c.status === 'emFila').length,
    carregando: carregamentos.filter(c => c.status === 'carregando').length,
    liberados: carregamentos.filter(c => c.status === 'liberado').length,
    notUsed: carregamentos.filter(c => c.status === 'not_used').length,
    
    // Volumes (apenas carregamentos com dados de carga)
    totalGaiolas: carregamentos.reduce((sum, c) => sum + (parseInt(c.carga?.gaiolas) || 0), 0),
    totalVolumosos: carregamentos.reduce((sum, c) => sum + (parseInt(c.carga?.volumosos) || 0), 0),
    totalManga: carregamentos.reduce((sum, c) => sum + (parseInt(c.carga?.manga) || 0), 0),
    
    // Tempos médios (em minutos)
    tempoMedioCarregamento: null as number | null,
    tempoMedioEsperaDoca: null as number | null,
    
    // Destinos únicos
    destinosUnicos: new Set(carregamentos.map(c => c.destino)).size,
    
    // Veículos (tipo)
    tiposVeiculo: {} as Record<string, number>,
  };

  // Calcular tempos médios
  let somaTempoCarregamento = 0;
  let countTempoCarregamento = 0;
  let somaTempoEspera = 0;
  let countTempoEspera = 0;

  carregamentos.forEach(c => {
    // Tempo de carregamento: inícioCarregamento -> términoCarregamento
    if (c.horarios?.inicioCarregamento && c.horarios?.terminoCarregamento) {
      const diff = calcularDiferencaHoras(c.horarios.inicioCarregamento, c.horarios.terminoCarregamento);
      if (diff !== null) {
        somaTempoCarregamento += diff;
        countTempoCarregamento++;
      }
    }
    // Tempo de espera: encostadoDoca -> inícioCarregamento
    if (c.horarios?.encostadoDoca && c.horarios?.inicioCarregamento) {
      const diff = calcularDiferencaHoras(c.horarios.encostadoDoca, c.horarios.inicioCarregamento);
      if (diff !== null) {
        somaTempoEspera += diff;
        countTempoEspera++;
      }
    }
  });

  stats.tempoMedioCarregamento = countTempoCarregamento > 0 ? Math.round(somaTempoCarregamento / countTempoCarregamento) : null;
  stats.tempoMedioEsperaDoca = countTempoEspera > 0 ? Math.round(somaTempoEspera / countTempoEspera) : null;

  // Contar tipos de veículo
  carregamentos.forEach(c => {
    const tipo = c.motorista?.tipoVeiculo || 'Não especificado';
    stats.tiposVeiculo[tipo] = (stats.tiposVeiculo[tipo] || 0) + 1;
  });

  // Filtrar carregamentos conforme status selecionado
  const carregamentosFiltrados = statusFiltro === 'todos' 
    ? carregamentos 
    : statusFiltro === 'finalizado'
      ? carregamentos.filter(c => c.finalizado)
      : carregamentos.filter(c => c.status === statusFiltro);

  // Ordenar por timestamp mais recente
  const carregamentosOrdenados = [...carregamentosFiltrados].sort((a, b) => {
    const dateA = a.timestamp || a.dataCriacao || '';
    const dateB = b.timestamp || b.dataCriacao || '';
    return dateB.localeCompare(dateA);
  });

  // Funções auxiliares
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Componente de métrica (card pequeno)
  const MetricCard = ({ 
    icon, 
    label, 
    value, 
    sublabel, 
    colorClass 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    value: string | number; 
    sublabel?: string;
    colorClass: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-start space-x-4">
      <div className={`p-2 rounded-lg ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
      </div>
    </div>
  );

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard de Expedição</h1>
                <p className="text-sm text-gray-500">
                  {formatDateToBR(dataSelecionada)} • {facilitySelecionada === 'todas' ? 'Todas as operações' : facilitySelecionada}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                title="Atualizar dados"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={facilitySelecionada}
                onChange={(e) => setFacilitySelecionada(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todas">Todas as Facilities</option>
                {facilitiesDisponiveis.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
                {/* Se não houver facilities na lista, manter as que aparecem no código original */}
                {facilitiesDisponiveis.length === 0 && (
                  <>
                    <option value="SBA4">SBA4</option>
                    <option value="SBA2">SBA2</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['todos', 'emFila', 'carregando', 'liberado', 'finalizado'] as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFiltro(s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    statusFiltro === s
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {s === 'todos' ? 'Todos' :
                   s === 'emFila' ? 'Em Fila' :
                   s === 'carregando' ? 'Carregando' :
                   s === 'liberado' ? 'Liberados' : 'Finalizados'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Métricas Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <MetricCard 
            icon={<ClipboardList className="w-5 h-5 text-white" />}
            label="Total Viagens"
            value={stats.total}
            colorClass="bg-blue-500"
          />
          <MetricCard 
            icon={<AlertCircle className="w-5 h-5 text-white" />}
            label="Em Andamento"
            value={stats.ativos}
            sublabel={`Fila: ${stats.emFila} | Carregando: ${stats.carregando}`}
            colorClass="bg-yellow-500"
          />
          <MetricCard 
            icon={<CheckCircle className="w-5 h-5 text-white" />}
            label="Finalizados"
            value={stats.finalizados}
            sublabel={`Liberados: ${stats.liberados}`}
            colorClass="bg-green-500"
          />
          <MetricCard 
            icon={<Box className="w-5 h-5 text-white" />}
            label="Gaiolas"
            value={stats.totalGaiolas}
            colorClass="bg-purple-500"
          />
          <MetricCard 
            icon={<Package className="w-5 h-5 text-white" />}
            label="Volumosos"
            value={stats.totalVolumosos}
            colorClass="bg-indigo-500"
          />
          <MetricCard 
            icon={<Box className="w-5 h-5 text-white" />}
            label="Manga P."
            value={stats.totalManga}
            colorClass="bg-pink-500"
          />
        </div>

        {/* Segunda linha: Tempos, Destinos, Veículos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Tempos Médios */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Tempos Médios
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-700">Carregamento</span>
                <span className="font-bold text-lg">
                  {stats.tempoMedioCarregamento !== null 
                    ? `${Math.floor(stats.tempoMedioCarregamento / 60)}h ${stats.tempoMedioCarregamento % 60}min` 
                    : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">Espera na Doca</span>
                <span className="font-bold text-lg">
                  {stats.tempoMedioEsperaDoca !== null 
                    ? `${Math.floor(stats.tempoMedioEsperaDoca / 60)}h ${stats.tempoMedioEsperaDoca % 60}min` 
                    : '--'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                * Tempos calculados com base nos horários preenchidos
              </div>
            </div>
          </div>

          {/* Destinos e Tipos de Veículo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Route className="w-5 h-5 text-purple-600" />
              Destinos ({stats.destinosUnicos})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(
                carregamentos.reduce((acc, c) => {
                  const nome = getNomeDestino(c.destino);
                  acc[nome] = (acc[nome] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              )
                .sort((a, b) => b[1] - a[1])
                .map(([nome, count]) => (
                  <div key={nome} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-800">{nome}</span>
                    <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-600" />
              Tipos de Veículo
            </h3>
            <div className="space-y-2">
              {Object.entries(stats.tiposVeiculo).map(([tipo, count]) => (
                <div key={tipo} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-800">{tipo}</span>
                  <span className="text-sm bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela de Carregamentos Recentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Carregamentos Recentes ({carregamentosOrdenados.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motorista</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doca</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horário Saída</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Previsão Chegada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {carregamentosOrdenados.slice(0, 50).map((c, idx) => {
                  const statusColor = 
                    c.status === 'liberado' ? 'bg-green-100 text-green-700' :
                    c.status === 'carregando' ? 'bg-yellow-100 text-yellow-700' :
                    c.status === 'emFila' ? 'bg-gray-100 text-gray-700' :
                    c.status === 'not_used' ? 'bg-red-100 text-red-700' :
                    c.finalizado ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700';

                  const statusLabel =
                    c.status === 'liberado' ? 'Liberado' :
                    c.status === 'carregando' ? 'Carregando' :
                    c.status === 'emFila' ? 'Em Fila' :
                    c.status === 'not_used' ? 'Not Used' :
                    c.finalizado ? 'Finalizado' : 'Pendente';

                  return (
                    <tr key={c.id || c.motoristaId || idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">
                        {c.motorista?.travelId || c.id?.substring(0, 8) || '--'}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {getNomeDestino(c.destino)}
                      </td>
                      <td className="px-4 py-3">{c.motorista?.nome || '--'}</td>
                      <td className="px-4 py-3">{c.motorista?.tipoVeiculo || '--'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">{c.doca || '--'}</td>
                      <td className="px-4 py-3">{formatTime(c.horarios?.saidaLiberada || '')}</td>
                      <td className="px-4 py-3">{formatTime(c.horarios?.previsaoChegada || '')}</td>
                    </tr>
                  );
                })}
                {carregamentosOrdenados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      Nenhum carregamento encontrado para os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <footer className="bg-white border-t border-gray-200 mt-8 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          Sistema de Expedição • Dashboard gerencial • {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}