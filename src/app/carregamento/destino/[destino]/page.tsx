"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Truck,
  MapPin,
  ChevronRight,
  Loader2,
  Hash,
  Clock,
  Tag,
  Box,
  DoorClosed,
  X,
  Scan,
} from "lucide-react";
import QRScanner from "@/app/components/QrScanner";
import { ICarregamento } from "@/app/lib/models/carregamento";


function DestinoContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const destinoCodigo = params.destino as string;

  const [loading, setLoading] = useState(false);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [destinoInfo, setDestinoInfo] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedMotorista, setSelectedMotorista] = useState<any>(null);
  const [filter, setFilter] = useState<"active" | "finalized">("active");
  const [carregamentoData, setCarregamentoData] = useState<ICarregamento | null>(null);
  const [carregamentos, setCarregamentos] = useState<Record<string, ICarregamento>>({});
  
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [activeQRField, setActiveQRField] = useState<keyof ICarregamento["lacres"] | null>(null);

  const facility = searchParams?.get("facility") || "N/A";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`carregamentos_${destinoCodigo}_${facility}`);
      if (saved) setCarregamentos(JSON.parse(saved));
    }
  }, [destinoCodigo, facility]);

  useEffect(() => {
    if (destinoCodigo && facility) fetchDestinoData();
  }, [destinoCodigo, facility]);

  const fetchDestinoData = async () => {
    try {
      setLoading(true);
      const expedicaoEditavel = localStorage.getItem("ExpedicaoEditavel");
      if (!expedicaoEditavel) {
        router.push("/carregamento/novo");
        return;
      }

      const csvData = JSON.parse(expedicaoEditavel);
      const getNomeDestino = (codigo: string): string => {
        const mapa: Record<string, string> = {
          EBA14: "Serrinha", EBA4: "Santo Antônio de Jesus",
          EBA19: "Itaberaba", EBA3: "Jacobina", EBA2: "Pombal",
          EBA16: "Senhor do Bonfim", EBA21: "Seabra",
          EBA6: "Juazeiro", EBA29: "Valença",
        };
        return mapa[codigo] || codigo;
      };

      const filteredData = csvData.data.filter((item: any) => {
        const itemDestino = item.destino || item.Destino || item.DESTINO;
        const itemFacility = item.Facility || item.facility || csvData.filterValue;
        return itemDestino === destinoCodigo && itemFacility === facility;
      });

      const motoristasMap = new Map();
      filteredData.forEach((item: any) => {
        const nome = item["Nome do motorista 1"] || item["Motorista"] || item["motorista"] || "Motorista Não Identificado";
        if (!motoristasMap.has(nome)) {
          motoristasMap.set(nome, {
            nome,
            tipoVeiculo: item["Tipo de veículo"] || item["Tipo Veículo"] || "Não especificado",
            veiculoTracao: item["Veículo de tração"] || item["Veiculo Tração"] || "Não especificado",
            veiculoCarga: item["Veículo de carga"] || item["Veiculo Carga"] || "Não especificado",
            travelId: item["Travel ID"] || item["TravelID"] || "Não especificado",
            placa: item["Placa"] || item["Placa do Cavalo"] || "Não especificado",
            transportadora: item["Transportadora"] || "Não especificada",
            dataInicio: item["Data de início"] || item["Data Inicio"] || new Date().toISOString(),
          });
        }
      });

      const motoristasArray = Array.from(motoristasMap.values());
      setMotoristas(motoristasArray);
      setDestinoInfo({
        nome: getNomeDestino(destinoCodigo),
        codigo: destinoCodigo,
        facility,
        totalMotoristas: motoristasArray.length,
        ultimoCarregamento: filteredData[0]?.["Data de início"] || new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Erro ao processar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (modal: string, motorista: any) => {
    setSelectedMotorista(motorista);
    setActiveModal(modal);

    const motoristaId = `${destinoCodigo}_${facility}_${motorista.nome}_${motorista.travelId}`;
    const existing = carregamentos[motoristaId];

    if (existing) {
      setCarregamentoData({ ...existing });
    } else {
      setCarregamentoData({
        motoristaId,
        doca: "",
        carga: { gaiolas: "", volumosos: "", manga: "" },
        horarios: {
          encostadoDoca: "", inicioCarregamento: "",
          terminoCarregamento: "", saidaLiberada: "", previsaoChegada: "",
        },
        lacres: { traseiro: "", lateral1: "", lateral2: "" },
        motorista,
        destino: destinoCodigo,
        facility,
        timestamp:{
          aguardando: new Date().toISOString()
        },
        status: "aguardando",
        posicaoVeiculo: 0,
      } as unknown as ICarregamento);
    }
  };

  const enviarIncremental = async ( motoristaId: string, payload: Record<string, any> ) => {
    try {
      const result = await fetch('/api/carregamento',{
        method: 'PATCH',
        headers: {'Content-Type' : 'application/json'},
        body: JSON.stringify({motoristaId, ...payload})
      }); 
      if(!result.ok){
        const errorData = await result.json()
        console.error('[EnviarIncremental] Falha na API', errorData)
      }
    } catch (err) {
      console.error('[EnviarIncremental] Erro de Rede', err)      
    }
  };

  const handleSaveModal = async () => {
    if (!selectedMotorista || !carregamentoData) return;

    const motoristaId = `${destinoCodigo}_${facility}_${selectedMotorista.nome}_${selectedMotorista.travelId}`;
    const agora = new Date().toISOString();

    // 👤 Captura o operador logado do localStorage de forma segura
    const operadorLogado = typeof window !== "undefined" 
      ? (localStorage.getItem("operador_nome") || localStorage.getItem("operatorName") || "Operador Não Identificado")
      : "Operador Não Identificado";

    const dados = { ...carregamentoData };
    dados.timestamp = {...(dados.timestamp || {})}
    
    let payloadParaOBanco: Record<string, any> = {};

    if (activeModal === "doca") {
      if (dados.doca?.trim() && dados.status !== "carregando" && dados.status !== "liberado" && dados.status !== "not_used") {
        dados.status = "emDoca";
        
        if(!dados.timestamp.emDoca){
          dados.timestamp.emDoca = agora
        }
        
        payloadParaOBanco = { 
          doca: dados.doca, 
          status: dados.status,
          timestamp: {
            emDoca: agora
          }
        };
      }else{
        payloadParaOBanco = {
          doca: dados.doca
        }
      }
    } else if (activeModal === "carga") {
      payloadParaOBanco = { carga: dados.carga };
    } else if (activeModal === "horarios") {
      payloadParaOBanco = { horarios: dados.horarios };
      if (dados.horarios?.inicioCarregamento?.trim() && dados.status === "emDoca") {
        dados.status = "carregando";
        if(!dados.timestamp.carregando){
          dados.timestamp.carregando = agora
        }
        payloadParaOBanco.status = "carregando";
        payloadParaOBanco.timestamp = {
          carregando: dados.timestamp.carregando
        }
      }
    } else if (activeModal === "lacres") {
      payloadParaOBanco = { lacres: dados.lacres };
    }

    const temDoca = dados.doca?.trim();
    const temSaida = dados.horarios?.saidaLiberada?.trim();
    const temLacreTraseiro = dados.lacres?.traseiro?.trim();
    const temCargaCompleta = dados.carga?.gaiolas && dados.carga?.volumosos && dados.carga?.manga;

    // Gatilho de Liberação Automática (Todas as informações preenchidas)
    if (temDoca && temSaida && temLacreTraseiro && temCargaCompleta && dados.status !== "liberado") {
      dados.status = "liberado";
      dados.finalizado = true; 
      if(!dados.timestamp.liberado){
        dados.timestamp.liberado = agora
      }
      
      const chave = `carregamentos_${destinoCodigo}_${facility}`;
      const salvos = JSON.parse(localStorage.getItem(chave) || "{}");
      const liberadosCount = Object.entries(salvos).filter(
        ([id, c]: [string, any]) => c.status === "liberado" && id !== motoristaId
      ).length;
      
      dados.posicaoVeiculo = liberadosCount + 1;
      
      payloadParaOBanco = {
        ...payloadParaOBanco,
        
        status: "liberado",
        finalizado: true,
        posicaoVeiculo: dados.posicaoVeiculo,
        
        timestamp: {
          liberado: dados.timestamp.liberado
        }
      }; 
    }

    // 🛠️ Validação e Injeção do Operador para "liberado" ou "not_used"
    if (dados.status === "liberado" || dados.status === "not_used") {
      dados.operador = operadorLogado; // Sincroniza localmente na interface
      payloadParaOBanco.operador = operadorLogado;
    }

    await enviarIncremental(motoristaId, payloadParaOBanco);
    
    const updated = { ...carregamentos, [motoristaId]: dados };
    setCarregamentos(updated);
    localStorage.setItem(
      `carregamentos_${destinoCodigo}_${facility}`,
      JSON.stringify(updated)
    );

    handleCloseModal();
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setSelectedMotorista(null);
    setCarregamentoData(null);
  };

  const handleDocaChange = (value: string) => {
    if (carregamentoData) setCarregamentoData({ ...carregamentoData, doca: value });
  };

  const handleCargaChange = (tipo: "gaiolas" | "volumosos" | "manga", value: string) => {
    if (!carregamentoData) return;
    const num = value.replace(/\D/g, "").slice(0, 2);
    setCarregamentoData({
      ...carregamentoData,
      carga: { ...carregamentoData.carga, [tipo]: num },
    });
  };

  const handleHorarioChange = (tipo: keyof ICarregamento["horarios"], value: string) => {
    if (!carregamentoData) return;
    const horarios = { ...carregamentoData.horarios, [tipo]: value };
    if (tipo === "saidaLiberada") {
      horarios.previsaoChegada = calcularPrevisaoChegada(value, destinoCodigo);
    }
    setCarregamentoData({ ...carregamentoData, horarios });
  };

  const handleLacreChange = (tipo: keyof ICarregamento["lacres"], value: string) => {
    if (!carregamentoData) return;
    const num = value.replace(/\D/g, "").slice(0, 7);
    setCarregamentoData({
      ...carregamentoData,
      lacres: { ...carregamentoData.lacres, [tipo]: num },
    });
  };

  const handleQRScan = (result: string) => {
    if (activeQRField && carregamentoData) {
      handleLacreChange(activeQRField, result.replace(/\D/g, "").slice(0, 7));
      setShowQRScanner(false);
      setActiveQRField(null);
    }
  };

  const calcularPrevisaoChegada = (saidaLiberada: string, dest: string): string => {
    if (!saidaLiberada) return "";
    const [h, m] = saidaLiberada.split(":").map(Number);
    const horas: Record<string, number> = {
      EBA14: 2, EBA4: 2, EBA19: 3, EBA29: 3,
      EBA2: 4, EBA3: 5, EBA16: 5, EBA21: 6, EBA6: 7,
    };
    const saida = new Date();
    saida.setHours(h + (horas[dest] || 0), m);
    return `${saida.getHours().toString().padStart(2, "0")}:${saida.getMinutes().toString().padStart(2, "0")}`;
  };

  const handleSelecionarMotorista = (motorista: any) => {
    const motoristaId = `${destinoCodigo}_${facility}_${motorista.nome}_${motorista.travelId}`;
    localStorage.setItem("motoristaSelecionadoId", motoristaId);
    localStorage.setItem("MotoristaSelecionado", JSON.stringify(motorista));
    localStorage.setItem("DestinoAtual", JSON.stringify(destinoInfo));
    router.push("/carregamento/create");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 font-medium">Carregando informações...</p>
        </div>
      </div>
    );
  }

  const motoristasFiltrados = motoristas.filter((m) => {
    const id = `${destinoCodigo}_${facility}_${m.nome}_${m.travelId}`;
    const d = carregamentos[id];
    return filter === "active" ? !d?.finalizado : d?.finalizado === true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/carregamento/novo")}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg shadow">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {destinoInfo?.nome || destinoCodigo}
                  </h1>
                  <p className="text-sm text-gray-500">
                    <Hash className="w-4 h-4 inline mr-1" />
                    {destinoCodigo}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Operação:</span> {facility}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Filtros */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-4 flex gap-3">
            {(["active", "finalized"] as const).map((f) => {
              const count = motoristas.filter((m) => {
                const id = `${destinoCodigo}_${facility}_${m.nome}_${m.travelId}`;
                const d = carregamentos[id];
                return f === "active" ? !d?.finalizado : d?.finalizado === true;
              }).length;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                    filter === f
                      ? f === "active" ? "bg-blue-600 text-white shadow-md" : "bg-gray-700 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {f === "active" ? "🚛 Pendentes" : "✅ Finalizados"}
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de Motoristas */}
        <div className="mb-8">
          {motoristas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {motoristasFiltrados.map((motorista, index) => {
                const motoristaId = `${destinoCodigo}_${facility}_${motorista.nome}_${motorista.travelId}`;
                const d = carregamentos[motoristaId];
                
                const borderColor =
                  d?.status === "carregando" ? "border-orange-400" :
                  d?.status === "liberado" ? "border-green-500" : 
                  d?.status === "not_used" ? "border-red-600" : "border-gray-200";

                const iconColor =
                  d?.status === "carregando" ? "text-orange-500" :
                  d?.status === "liberado" ? "text-green-500" : 
                  d?.status === "not_used" ? "text-red-500" : "text-blue-600";

                return (
                  <div
                    key={index}
                    className={`bg-white rounded-xl shadow-sm border ${borderColor} hover:shadow-md transition-all duration-200 p-6 group`}
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        if (filter !== "finalized" && !d?.finalizado) {
                          handleSelecionarMotorista(motorista);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Users className={`w-6 h-6 ${iconColor}`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{motorista.nome}</h3>
                            <p className="text-sm text-gray-600">
                              Motorista
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        {motorista.tipoVeiculo && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Truck className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium">Tipo:</span>
                            <span className="ml-1">{motorista.tipoVeiculo}</span>
                          </div>
                        )}
                        {motorista.tipoVeiculo === "Carreta" ? (
                          <>
                            <div className="flex items-center text-sm text-gray-600">
                              <Truck className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">Tração:</span>
                              <span className="ml-1">{motorista.veiculoTracao}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Truck className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">Carga:</span>
                              <span className="ml-1">{motorista.veiculoCarga}</span>
                            </div>
                          </>
                        ) : motorista.veiculoTracao ? (
                          <div className="flex items-center text-sm text-gray-600">
                            <Truck className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium">Placa:</span>
                            <span className="ml-1">{motorista.veiculoTracao}</span>
                          </div>
                        ) : null}
                        {motorista.travelId && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Hash className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium">Travel ID:</span>
                            <span className="ml-1 text-blue-600 font-mono">{motorista.travelId}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <div className="mb-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenModal("doca", motorista); }}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            d?.doca
                              ? "bg-blue-100 text-blue-700 border border-blue-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          <DoorClosed className="w-4 h-4" />
                          {d?.doca ? `Doca: ${d.doca}` : "Escolha a doca"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenModal("carga", motorista); }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            d?.carga?.gaiolas && d?.carga?.volumosos && d?.carga?.manga
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          <Box className="w-4 h-4" /> Carga
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenModal("horarios", motorista); }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            d?.horarios?.encostadoDoca
                              ? "bg-orange-100 text-orange-700 border border-orange-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          <Clock className="w-4 h-4" /> Horários
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenModal("lacres", motorista); }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            d?.lacres?.traseiro
                              ? "bg-purple-100 text-purple-700 border border-purple-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          <Tag className="w-4 h-4" /> Lacres
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Nenhum motorista encontrado</p>
              <p className="text-sm text-gray-500 mt-1">
                Destino: {destinoInfo?.nome || destinoCodigo} • Operação: {facility}
              </p>
              <button
                onClick={() => router.push("/carregamento/novo")}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modais mantidos com as novas referências de dados puras */}
      {activeModal === "doca" && selectedMotorista && carregamentoData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <DoorClosed className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold">Selecionar Doca</h3>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Doca para: <strong>{selectedMotorista.nome}</strong>
              </p>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => handleDocaChange(num.toString())}
                    className={`p-3 text-center rounded-lg border-2 font-semibold transition-all ${
                      carregamentoData.doca === num.toString()
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={handleCloseModal} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
              <button
                onClick={handleSaveModal}
                disabled={!carregamentoData.doca}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar Doca
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "carga" && selectedMotorista && carregamentoData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <Box className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold">Informar Carga</h3>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {(["gaiolas", "volumosos", "manga"] as const).map((tipo) => (
                <div key={tipo}>
                  <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                    {tipo === "manga" ? "Manga Palete" : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </label>
                  <input
                    type="number"
                    value={(carregamentoData.carga as any)?.[tipo] || ""}
                    onChange={(e) => handleCargaChange(tipo, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={handleCloseModal} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
              <button onClick={handleSaveModal} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar Carga</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "horarios" && selectedMotorista && carregamentoData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-bold">Registrar Horários</h3>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {([
                { key: "encostadoDoca", label: "Encostado na Doca" },
                { key: "inicioCarregamento", label: "Início de Carregamento" },
                { key: "terminoCarregamento", label: "Término de Carregamento" },
                { key: "saidaLiberada", label: "Saída Liberada" },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <input
                    type="time"
                    value={(carregamentoData.horarios as any)?.[key] || ""}
                    onChange={(e) => handleHorarioChange(key, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Previsão de Chegada</label>
                <input
                  type="time"
                  value={carregamentoData.horarios?.previsaoChegada || ""}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">Calculado automaticamente</p>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={handleCloseModal} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
              <button onClick={handleSaveModal} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Salvar Horários</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "lacres" && selectedMotorista && carregamentoData && (
        <>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-3">
                  <Tag className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold">Registrar Lacres</h3>
                </div>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                {([
                  { key: "traseiro", label: "Lacre Traseiro" },
                  { key: "lateral1", label: "Lacre Lateral 1" },
                  { key: "lateral2", label: "Lacre Lateral 2" },
                ] as const).map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={(carregamentoData.lacres as any)?.[key] || ""}
                        onChange={(e) => handleLacreChange(key, e.target.value)}
                        placeholder="Ex: 4476646"
                        maxLength={7}
                        inputMode="numeric"
                        className={`flex-1 px-4 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 ${
                          (carregamentoData.lacres as any)?.[key]?.length === 7
                            ? "border-green-500 bg-green-50"
                            : "border-gray-300"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => { setActiveQRField(key); setShowQRScanner(true); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Scan className="w-5 h-5" />
                        <span className="hidden sm:inline">QR</span>
                      </button>
                    </div>
                    {(carregamentoData.lacres as any)?.[key]?.length === 7 && (
                      <p className="text-xs text-green-600 mt-1">✓ Lacre válido (7 dígitos)</p>
                    )}
                  </div>
                ))}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700"><strong>Dica:</strong> Use o botão QR para escanear automaticamente.</p>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={handleCloseModal} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button onClick={handleSaveModal} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Salvar Lacres</button>
              </div>
            </div>
          </div>
          {showQRScanner && (
            <QRScanner
              onScan={handleQRScan}
              onClose={() => { setShowQRScanner(false); setActiveQRField(null); }}
            />
          )}
        </>
      )}

      {/* Footer */}
      <footer className="py-4 border-t border-gray-200 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="text-gray-500 text-sm">
            <p>Sistema de Carregamento • {destinoInfo?.nome || destinoCodigo} • {facility}</p>
          </div>
          <span className="text-xs text-gray-500">
            Motoristas: {motoristas.length} • Preenchidos:{" "}
            {Object.keys(carregamentos).filter((k) =>
              carregamentos[k]?.doca || carregamentos[k]?.horarios?.encostadoDoca
            ).length}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function DestinoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <DestinoContent />
    </Suspense>
  );
}