'use client'

import { useState, useEffect } from "react";
import {
  Truck,
  Clock,
  CheckCircle,
  Filter,
  RefreshCw,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { criarIntervaloDia } from "@/app/lib/utils/dateUtils";

// ------------------------------------------------------------
// Interfaces 
// ------------------------------------------------------------
interface Carregamento {
  _id: string;
  numero: string;
  destino: string;
  motorista: {
    travelId?: string;
    nome?: string;
    tipoVeiculo?: string;
    veiculoTracao?: string;
    veiculoCarga?: string;
    transportadora?: string;
  };
  facility: string;
  status?: "em_fila" | "carregando" | "liberado";
  dataCriacao: string;
  pesoEstimado?: string;
  observacoes?: string;
  tipoVeiculo?: string;
  veiculoTracao?: string;
  posicaoVeiculo?: number;
  doca?: string;
  operador?: string;
  horarios?: {
    encostadoDoca?: string;
    inicioCarregamento?: string;
    terminoCarregamento?: string;
    saidaLiberada?: string;
    previsaoChegada?: string;
  };
  lacres?: {
    traseiro?: string;
    lateral1?: string;
    lateral2?: string;
  };
  carga?: {
    gaiolas?: number;
    volumosos?: number;
    manga?: number;
  };
}

interface DestinoProgresso {
  id: string;
  nome: string;
  total: number;
  concluidos: number;
  progresso: number;
}

// ------------------------------------------------------------
// Funções auxiliares
// ------------------------------------------------------------
const getNomeDestino = (codigo: string): string => {
  const mapeamento: Record<string, string> = {
    EBA14: "Serrinha",
    EBA4: "Santo Antônio de Jesus",
    EBA19: "Itaberaba",
    EBA3: "Jacobina",
    EBA2: "Pombal",
    EBA16: "Senhor do Bonfim",
    EBA21: "Seabra",
    EBA6: "Juazeiro",
    EBA29: "Valença",
  };
  return mapeamento[codigo] || codigo;
};

// ------------------------------------------------------------
// Componente Principal
// ------------------------------------------------------------
export default function PainelOperacionalPage() {
  // Estados da Aplicação
  const [allCarregamentos, setAllCarregamentos] = useState<Carregamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [expandedDestino, setExpandedDestino] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    status: "",
    facility: "",
    data: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  });

  // Lista única de facilities para o select
  const facilitiesDisponiveis = Array.from(
    new Set(allCarregamentos.map((c) => c.facility).filter(Boolean))
  ).sort();

  // Chamadas de API
  const fetchUploadDoDia = async () => {
    try {
      setLoadingUpload(true);
      const targetDateBr = filter.data.split('-').reverse().join('/');
      await fetch(`/api/upload?date=${targetDateBr}`);
      // Apenas mantemos a chamada por questões de coerência, se houver lógica vinculada na API.
    } catch (error) {
      console.error('Erro ao buscar upload do dia:', error);
    } finally {
      setLoadingUpload(false);
    }
  };

  const fetchCarregamentos = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      const hoje = filter.data.split('-').reverse().join('/');

      queryParams.append("dataInicio", hoje);
      queryParams.append("dataFim", hoje);
      queryParams.append("limit", "1000");

      const response = await fetch(`/api/carregamento?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setAllCarregamentos(data.data);
      }
    } catch (error) {
      console.error("Erro ao buscar carregamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarregamentos();
    fetchUploadDoDia();
  }, [filter.data]);

  // Processamento e Filtragem de Dados
  const dataFormatadaBr = filter.data.split('-').reverse().join('/');
  const hojeStr = criarIntervaloDia(dataFormatadaBr);

  const carregamentosDoDia = allCarregamentos.filter((c) => {
    const createdAt = new Date(c.dataCriacao).getTime();
    return createdAt >= hojeStr.start.getTime() && createdAt < hojeStr.end.getTime();
  });

  const carregamentosNormalizados = carregamentosDoDia.map(c => ({
    ...c,
    statusNormalizado: c.status === 'liberado' ? 'concluido' : c.status
  }));

  const filteredCarregamentos = carregamentosNormalizados.filter((c) => {
    const matchStatus = filter.status ? c.statusNormalizado === filter.status : true;
    const matchFacility = filter.facility ? c.facility === filter.facility : true;
    return matchStatus && matchFacility;
  });

  const destinosProgresso: DestinoProgresso[] = (() => {
    const carregamentosDaFacility = carregamentosNormalizados.filter((c) =>
      filter.facility ? c.facility === filter.facility : true
    );

    if (carregamentosDaFacility.length === 0) return [];

    const mapeamentoDestinos = new Map<string, { total: number; concluidos: number }>();

    carregamentosDaFacility.forEach((c) => {
      const destinoId = c.destino;
      if (!destinoId) return;

      const atual = mapeamentoDestinos.get(destinoId) || { total: 0, concluidos: 0 };
      
      atual.total += 1;
      if (c.status === 'liberado' || c.statusNormalizado === 'concluido') {
        atual.concluidos += 1;
      }

      mapeamentoDestinos.set(destinoId, atual);
    });

    const destinosArray: DestinoProgresso[] = [];
    
    mapeamentoDestinos.forEach((valores, destinoId) => {
      destinosArray.push({
        id: destinoId,
        nome: getNomeDestino(destinoId) || destinoId,
        total: valores.total,
        concluidos: valores.concluidos,
        progresso: valores.total > 0 ? (valores.concluidos / valores.total) * 100 : 0,
      });
    });

    return destinosArray.sort((a, b) => a.nome.localeCompare(b.nome));
  })();

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Filtros */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-gray-500 shrink-0" />
                <select
                  value={filter.status}
                  onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full sm:w-auto"
                >
                  <option value="">Todos os Status</option>
                  <option value="aguardando">Pendentes</option>
                  <option value="carregando">Em Carregamento</option>
                  <option value="concluido">Concluídos</option>
                </select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Truck className="w-4 h-4 text-gray-500 shrink-0" />
                <select
                  value={filter.facility}
                  onChange={(e) => setFilter({ ...filter, facility: e.target.value })}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full sm:w-auto"
                >
                  <option value="">Todas</option>
                  {facilitiesDisponiveis.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  lang="pt-BR"
                  value={filter.data}
                  onChange={(e) => setFilter({ ...filter, data: e.target.value })}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full sm:w-auto font-medium text-gray-700"
                />
              </div>
            </div>
            <button
              onClick={() => {
                fetchCarregamentos();
                fetchUploadDoDia();
              }}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors self-end md:self-auto"
              title="Atualizar"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LISTA DE DESTINOS COM MENU SANFONA (ACCORDION) */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 overflow-hidden">
          <div className="p-5 border-b border-white/20">
            <h2 className="text-lg font-bold text-gray-900">
              Destinos · {filter.facility || "Geral"} · {filter.data.split('-').reverse().join('/')}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Clique em um destino para expandir e verificar os detalhes operacionais dos veículos.
            </p>
          </div>

          {loading || loadingUpload ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-3 text-sm text-gray-600">Carregando destinos...</p>
            </div>
          ) : destinosProgresso.length === 0 ? (
            <div className="p-10 text-center">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium text-sm">Nenhum destino encontrado</p>
              <p className="text-xs text-gray-500 mt-1">
                Não há carregamentos programados para esta facility.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {destinosProgresso.map((destino) => {
                const isExpanded = expandedDestino === destino.id;

                const carregamentosFiltradosPorDestino = filteredCarregamentos.filter(
                  (c) => c.destino === destino.id
                );

                return (
                  <div key={destino.id} className="transition-colors duration-200">
                    <button
                      onClick={() => setExpandedDestino(isExpanded ? null : destino.id)}
                      className={`w-full text-left p-5 flex flex-col transition-all duration-200 outline-none ${isExpanded ? 'bg-blue-50/40' : 'bg-white/10 hover:bg-white/40'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 w-full mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="font-semibold text-gray-900 text-sm">
                            {destino.nome} <span className="text-xs font-normal text-gray-400">({destino.id})</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-600 bg-white/80 border border-gray-200 px-2.5 py-1 rounded-full shadow-xs">
                            {destino.concluidos}/{destino.total} concluídos
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                        </div>
                      </div>

                      <div className="w-full h-1.5 bg-gray-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${destino.progresso}%` }}
                        />
                      </div>
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out bg-gray-50/40 ${isExpanded ? 'max-h-[1200px] border-t border-gray-100 p-4' : 'max-h-0'
                        }`}
                    >
                      {carregamentosFiltradosPorDestino.length === 0 ? (
                        <div className="py-4 text-center text-xs text-gray-400 font-medium">
                          Nenhum veículo em pátio ou carregando com este filtro aplicado no momento.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {carregamentosFiltradosPorDestino.map((c) => (
                            <div
                              key={c._id}
                              className="bg-white border border-gray-200/70 p-3.5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gray-300 transition-colors"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex flex-wrap items-center mb-2 gap-2">
                                  <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                                    Travel ID • {c.motorista?.travelId || "S/N"}
                                  </span>
                                  <h4 className="text-sm font-semibold text-gray-800">
                                    {c.motorista?.nome || "Motorista não identificado"}
                                  </h4>
                                </div>
                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                  <p>Placa Tração: <strong className="text-gray-700 px-2 py-0.5 rounded-md border border-blue-100 ">{c.motorista?.veiculoTracao || "---"}</strong></p>
                                  {c.doca && <p>Doca: <strong className="text-blue-600 font-semibold">{c.doca}</strong></p>}
                                  {c.operador && <p>Operador: <strong className="text-gray-700">{c.operador}</strong></p>}
                                  {c.motorista?.transportadora && (
                                    <p className="col-span-2 sm:col-span-1">Transportadora: <strong className="text-gray-600 font-normal">{c.motorista.transportadora}</strong></p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                {c.horarios?.inicioCarregamento && (
                                  <div className="flex gap-x-2 text-xs text-gray-500 mr-6 ">
                                    {c.horarios.inicioCarregamento && <p> Início de Carregamento: <strong className=" font-semibold text-blue-600 hidden md:inline">{c.horarios.inicioCarregamento}</strong></p>}
                                    {c.horarios.saidaLiberada && <p> Saída Liberada: <strong className=" font-semibold text-blue-600 hidden md:inline">{c.horarios.saidaLiberada}</strong></p>}
                                  </div>
                                )}
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5 ${c.status === 'liberado' ? 'bg-green-50 text-green-700 border border-green-200' :
                                  c.status === 'carregando' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                  {c.status === 'liberado' && <CheckCircle className="w-3.5 h-3.5" />}
                                  {c.status === 'carregando' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                  {c.status === 'em_fila' && <Clock className="w-3.5 h-3.5" />}
                                  {c.status === 'liberado' ? 'Concluído' : c.status === 'carregando' ? 'Carregando' : 'Em Fila'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}