"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Truck,
  Calendar,
  MapPin,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Package,
  Hash,
  Building,
  Clock,
  Tag,
  Box,
  DoorClosed,
  X,
  Scan,
} from "lucide-react";
import QRScanner from "@/app/components/QrScanner";

// Interfaces
interface MotoristaInfo {
  nome: string;
  tipoVeiculo: string;
  veiculoTracao: string;
  veiculoCarga: string;
  travelId: string;
  placa: string;
  transportadora: string;
  dataInicio: string;
}

interface CarregamentoData {
  id: string;
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
    lateral1: string;
    lateral2: string;
  };
  motorista: MotoristaInfo;
  destino: string;
  facility: string;
  timestamp: string;
  status: "emFila" | "carregando" | "liberado";
  posicaoVeiculo: number;
}

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
  const [carregamentoData, setCarregamentoData] =
    useState<CarregamentoData | null>(null);
  const [carregamentos, setCarregamentos] = useState<
    Record<string, CarregamentoData>
  >({});
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [activeQRField, setActiveQRField] = useState<
    keyof CarregamentoData["lacres"] | null
  >(null);

  const facility = searchParams?.get("facility") || "N/A";

  // Carregar dados do localStorage ao iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(
        "carregamentos_" + destinoCodigo + "_" + facility,
      );
      if (saved) {
        setCarregamentos(JSON.parse(saved));
      }
    }
  }, [destinoCodigo, facility]);

  useEffect(() => {
    if (destinoCodigo && facility) {
      fetchDestinoData();
    }
  }, [destinoCodigo, facility]);

  const fetchDestinoData = async () => {
    try {
      setLoading(true);

      const expedicaoEditavel = localStorage.getItem("ExpedicaoEditavel");
      if (!expedicaoEditavel) {
        console.error("❌ Dados não encontrados no localStorage");
        router.push("/carregamento/novo");
        return;
      }

      const csvData = JSON.parse(expedicaoEditavel);
      console.log("📊 Dados recuperados do localStorage:", csvData);

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

      const filteredData = csvData.data.filter((item: any) => {
        const itemDestino = item.destino || item.Destino || item.DESTINO;
        const itemFacility =
          item.Facility || item.facility || csvData.filterValue;
        return itemDestino === destinoCodigo && itemFacility === facility;
      });

      console.log(
        `✅ ${filteredData.length} registros encontrados para ${destinoCodigo}`,
      );

      const motoristasMap = new Map();
      filteredData.forEach((item: any) => {
        const motoristaNome =
          item["Nome do motorista principal"] ||
          item["Motorista"] ||
          item["motorista"] ||
          "Motorista Não Identificado";
        if (!motoristasMap.has(motoristaNome)) {
          motoristasMap.set(motoristaNome, {
            nome: motoristaNome,
            tipoVeiculo:
              item["Tipo de veículo"] ||
              item["Tipo Veículo"] ||
              "Não especificado",
            veiculoTracao:
              item["Veículo de tração"] ||
              item["Veiculo Tração"] ||
              "Não especificado",
            veiculoCarga:
              item["Veículo de carga"] ||
              item["Veiculo Carga"] ||
              "Não especificado",
            travelId:
              item["Travel ID"] || item["TravelID"] || "Não especificado",
            placa:
              item["Placa"] || item["Placa do Cavalo"] || "Não especificado",
            transportadora: item["Transportadora"] || "Não especificada",
            dataInicio:
              item["Data de início"] ||
              item["Data Inicio"] ||
              new Date().toISOString(),
          });
        }
      });

      const motoristasArray = Array.from(motoristasMap.values());
      setMotoristas(motoristasArray);

      setDestinoInfo({
        nome: getNomeDestino(destinoCodigo),
        codigo: destinoCodigo,
        facility: facility,
        totalMotoristas: motoristasArray.length,
        totalVeiculos: motoristasArray.length,
        ultimoCarregamento:
          filteredData[0]?.["Data de início"] || new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Erro ao processar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    router.push("/carregamento/novo");
  };

  const handleOpenModal = (modal: string, motorista: any) => {
    setSelectedMotorista(motorista);
    setActiveModal(modal);

    // Carregar dados existentes para este motorista
    const motoristaId = `${destinoCodigo}_${facility}_${motorista.nome}_${motorista.travelId}`;
    const existingData = carregamentos[motoristaId];

    if (existingData) {
      const statusCorrigido =
        existingData.horarios?.encostadoDoca &&
        existingData.horarios.encostadoDoca.trim() !== ""
          ? "carregando"
          : existingData.status || "emFila";
      setCarregamentoData({
        ...existingData,
        status: statusCorrigido as any,
      });
    } else {
      // Criar novo objeto de carregamento
      setCarregamentoData({
        id: generateId(),
        doca: "",
        carga: { gaiolas: "", volumosos: "", manga: "" },
        horarios: {
          encostadoDoca: "",
          inicioCarregamento: "",
          terminoCarregamento: "",
          saidaLiberada: "",
          previsaoChegada: "",
        },
        lacres: { traseiro: "", lateral1: "", lateral2: "" },
        motorista: motorista,
        destino: destinoCodigo,
        facility: facility,
        timestamp: new Date().toISOString(),
        status: "emFila",
        posicaoVeiculo: 0,
      });
    }
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setSelectedMotorista(null);
    setCarregamentoData(null);
  };

  const handleSaveModal = () => {
    if (!selectedMotorista || !carregamentoData) return;

    const motoristaId = `${destinoCodigo}_${facility}_${selectedMotorista.nome}_${selectedMotorista.travelId}`;

    // Verificar se é o modal de horários e se encostadoDoca está preenchido
    let dadosAtualizados = { ...carregamentoData };

    if (activeModal === "horarios" || activeModal === "carga" || activeModal === "lacres" && carregamentoData.horarios.encostadoDoca) {
      // Atualizar status para "carregando" se encostadoDoca estiver preenchido
      if (
        carregamentoData.horarios.saidaLiberada &&
        carregamentoData.horarios.saidaLiberada.trim() !== ""
      ) {
        dadosAtualizados = {
          ...carregamentoData,
          status: "liberado",
        };
      } else if (
        carregamentoData.horarios.encostadoDoca &&
        carregamentoData.horarios.encostadoDoca.trim() !== ""
      ) {
        dadosAtualizados = {
          ...carregamentoData,
          status: "carregando",
        };
      }
    }

    const updatedCarregamentos = {
      ...carregamentos,
      [motoristaId]: dadosAtualizados,
    };

    setCarregamentos(updatedCarregamentos);
    localStorage.setItem(
      "carregamentos_" + destinoCodigo + "_" + facility,
      JSON.stringify(updatedCarregamentos),
    );
    handleCloseModal();
  };

  const handleDocaChange = (value: string) => {
    if (carregamentoData) {
      setCarregamentoData({
        ...carregamentoData,
        doca: value,
      });
    }
  };

  const handleCargaChange = (
    tipo: "gaiolas" | "volumosos" | "manga",
    value: string,
  ) => {
    if (carregamentoData) {
      const numericValue = value.replace(/\D/g, "").slice(0, 2);
      setCarregamentoData({
        ...carregamentoData,
        carga: {
          ...carregamentoData.carga,
          [tipo]: numericValue === "" ? "" : numericValue,
        },
      });
    }
  };

  const handleHorarioChange = (
    tipo: keyof CarregamentoData["horarios"],
    value: string,
  ) => {
    if (!carregamentoData) return;

    const updatedHorarios = {
      ...carregamentoData.horarios,
      [tipo]: value,
    };

    if (tipo === "saidaLiberada") {
      updatedHorarios.previsaoChegada = calcularPrevisaoChegada(
        value,
        destinoCodigo,
      );

      setCarregamentoData({
        ...carregamentoData,
        horarios: updatedHorarios,
      });

      return;
    }

    setCarregamentoData({
      ...carregamentoData,
      horarios: updatedHorarios,
    });
  };

  const handleLacreChange = (
    tipo: keyof CarregamentoData["lacres"],
    value: string,
  ) => {
    if (carregamentoData) {
      const numericValue = value.replace(/\D/g, "").slice(0, 7);
      setCarregamentoData({
        ...carregamentoData,
        lacres: {
          ...carregamentoData.lacres,
          [tipo]: numericValue === "" ? "" : numericValue,
        },
      });
    }
  };

  const handleQRScan = (result: string) => {
    if (activeQRField && carregamentoData) {
      // Extrair apenas números do QR Code e limitar a 7 dígitos
      const numericResult = result.replace(/\D/g, "").slice(0, 7);

      // Atualizar o campo específico
      handleLacreChange(activeQRField, numericResult);

      // Fechar o scanner
      setShowQRScanner(false);
      setActiveQRField(null);
    }
  };

  const calcularPrevisaoChegada = (
    saidaLiberada: string,
    destinoCodigo: string,
  ): string => {
    if (!saidaLiberada) return "";

    const [hours, minutes] = saidaLiberada.split(":").map(Number);
    let horasAdicionais = 0;

    switch (destinoCodigo) {
      case "EBA14":
      case "EBA19":
        horasAdicionais = 2;
        break;
      case "EBA4":
      case "EBA29":
        horasAdicionais = 3;
        break;
      case "EBA2":
        horasAdicionais = 4;
        break;
      case "EBA3":
      case "EBA16":
        horasAdicionais = 5;
        break;
      case "EBA21":
        horasAdicionais = 6;
        break;
      case "EBA6":
        horasAdicionais = 7;
        break;
      default:
        horasAdicionais = 0;
    }

    const saida = new Date();
    saida.setHours(hours + horasAdicionais, minutes);

    return (
      saida.getHours().toString().padStart(2, "0") +
      ":" +
      saida.getMinutes().toString().padStart(2, "0")
    );
  };

  const generateId = (): string => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  const handleSelecionarMotorista = (motorista: any) => {
    const motoristaId = `${destinoCodigo}_${facility}_${motorista.nome}_${motorista.travelId}`;
    localStorage.setItem("motoristaSelecionadoId", motoristaId);
    localStorage.setItem("MotoristaSelecionado", JSON.stringify(motorista));
    localStorage.setItem("DestinoAtual", JSON.stringify(destinoInfo));

    router.push(`/carregamento/create`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center safe-area">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 border-4 border-blue-200 border-b-transparent rounded-full animate-ping"></div>
          </div>
          <p className="text-gray-600 font-medium">Carregando informações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 safe-area">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 pt-safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleVoltar}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-lg transform rotate-3 opacity-20"></div>
                  <div className="relative bg-linear-to-br from-blue-600 to-blue-700 p-2 rounded-lg shadow">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Destino: {destinoInfo ? destinoInfo.nome : destinoCodigo}
                  </h1>
                  <p className="text-1xl text-gray-500">
                    <Hash className="w-4 h-4 inline mr-1" />
                    Código: {destinoCodigo}
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
        {/* Resumo do Destino */}
        <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 text-white mb-8">
          <div className="text-1sm text-white-600">
            {motoristas.length} motorista(s) encontrado(s)
          </div>
        </div>

        {/* Lista de Motoristas */}
        <div className="mb-8">
          {motoristas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {motoristas.map((motorista, index) => {
                const motoristaId = `${destinoCodigo}_${facility}_${motorista.nome}_${motorista.travelId}`;
                const dadosCarregamento = carregamentos[motoristaId];

                return (
                  <div
                    key={index}
                    className={`bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 p-6 text-left group
                    ${
                      dadosCarregamento?.status === "carregando"
                        ? "border-orange-400"
                        : dadosCarregamento?.status === "liberado"
                          ? "border-green-500"
                          : "border-gray-200"
                    }
                    `}
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => handleSelecionarMotorista(motorista)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                            <Users
                              className={`w-6 h-6 ${
                                dadosCarregamento?.status === "carregando"
                                  ? "text-orange-500"
                                  : dadosCarregamento?.status === "liberado"
                                    ? "text-green-500"
                                    : "text-blue-600"
                              }`}
                            />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">
                              {motorista.nome}
                            </h3>
                            <p className="text-sm text-gray-600">Motorista</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>

                      <div className="space-y-3">
                        {motorista.tipoVeiculo && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Truck className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium">Tipo:</span>
                            <span className="ml-1 text-gray-800">
                              {motorista.tipoVeiculo}
                            </span>
                          </div>
                        )}
                        {motorista.tipoVeiculo === "Carreta" ? (
                          <>
                            <div className="flex items-center text-sm text-gray-600">
                              <Truck className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">Placa Tração:</span>
                              <span className="ml-1 text-gray-800">
                                {motorista.veiculoTracao}
                              </span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Truck className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">Placa Carga:</span>
                              <span className="ml-1 text-gray-800">
                                {motorista.veiculoCarga}
                              </span>
                            </div>
                          </>
                        ) : (
                          motorista.veiculoTracao && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Truck className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">Placa Tração:</span>
                              <span className="ml-1 text-gray-800">
                                {motorista.veiculoTracao}
                              </span>
                            </div>
                          )
                        )}

                        {motorista.travelId && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Hash className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium">Travel ID:</span>
                            <span className="ml-1 text-blue-600 font-mono">
                              {motorista.travelId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      {/* Badge da Doca */}
                      <div className="mb-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal("doca", motorista);
                          }}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                            dadosCarregamento?.doca
                              ? "bg-blue-100 text-blue-700 border border-blue-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          <DoorClosed className="w-4 h-4" />
                          {dadosCarregamento?.doca
                            ? `Doca: ${dadosCarregamento.doca}`
                            : "Escolha a doca"}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal("carga", motorista);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                            dadosCarregamento?.carga
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          <Box className="w-4 h-4" />
                          Carga
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal("horarios", motorista);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                            dadosCarregamento?.horarios?.encostadoDoca
                              ? "bg-orange-100 text-orange-700 border border-orange-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                          Horários
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal("lacres", motorista);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                            dadosCarregamento?.lacres?.traseiro
                              ? "bg-purple-100 text-purple-700 border border-purple-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          <Tag className="w-4 h-4" />
                          Lacres
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
              <p className="text-gray-600 font-medium">
                Nenhum motorista encontrado
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Não há motoristas cadastrados para o destino{" "}
                {destinoInfo ? destinoInfo.nome : destinoCodigo} na operação{" "}
                {facility}
              </p>
              <button
                onClick={handleVoltar}
                className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para destinos</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal Doca */}
      {activeModal === "doca" && selectedMotorista && carregamentoData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <DoorClosed className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold">Selecionar Doca</h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Selecione a doca para: <strong>{selectedMotorista.nome}</strong>
              </p>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => handleDocaChange(num.toString())}
                    className={`p-3 text-center rounded-lg border-2 transition-all ${
                      carregamentoData.doca === num.toString()
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-100 border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar Doca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Carga */}
      {activeModal === "carga" && selectedMotorista && carregamentoData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <Box className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold">Informar Carga</h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total de Gaiolas
                </label>
                <input
                  type="number"
                  value={carregamentoData.carga.gaiolas || ""}
                  onChange={(e) =>
                    handleCargaChange("gaiolas", e.target.value || "")
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total de Volumosos
                </label>
                <input
                  type="number"
                  value={carregamentoData.carga.volumosos || ""}
                  onChange={(e) =>
                    handleCargaChange("volumosos", e.target.value || "")
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total de Manga Palete
                </label>
                <input
                  type="number"
                  value={carregamentoData.carga.manga || ""}
                  onChange={(e) =>
                    handleCargaChange("manga", e.target.value || "")
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModal}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Salvar Carga
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Horários */}
      {activeModal === "horarios" && selectedMotorista && carregamentoData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-bold">Registrar Horários</h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Encostado na Doca
                </label>
                <input
                  type="time"
                  value={carregamentoData.horarios.encostadoDoca || ""}
                  onChange={(e) =>
                    handleHorarioChange("encostadoDoca", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Início de Carregamento
                </label>
                <input
                  type="time"
                  value={carregamentoData.horarios.inicioCarregamento || ""}
                  onChange={(e) =>
                    handleHorarioChange("inicioCarregamento", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Término de Carregamento
                </label>
                <input
                  type="time"
                  value={carregamentoData.horarios.terminoCarregamento || ""}
                  onChange={(e) =>
                    handleHorarioChange("terminoCarregamento", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saída Liberada
                </label>
                <input
                  type="time"
                  value={carregamentoData.horarios.saidaLiberada || ""}
                  onChange={(e) =>
                    handleHorarioChange("saidaLiberada", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Previsão de Chegada
                </label>
                <input
                  type="time"
                  value={carregamentoData.horarios.previsaoChegada || ""}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Calculado automaticamente com base na saída liberada
                </p>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModal}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Salvar Horários
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lacres */}
      {activeModal === "lacres" && selectedMotorista && carregamentoData && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-3">
                  <Tag className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold">Registrar Lacres</h3>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Lacre Traseiro - COM SCANNER */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lacre Traseiro
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={carregamentoData.lacres.traseiro || ""}
                      onChange={(e) =>
                        handleLacreChange("traseiro", e.target.value)
                      }
                      placeholder="Ex: 4476646"
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                        carregamentoData.lacres.traseiro.length === 7
                          ? "border-green-500 bg-green-50"
                          : "border-gray-300"
                      }`}
                      maxLength={7}
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQRField("traseiro");
                        setShowQRScanner(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Scan className="w-5 h-5" />
                      <span className="hidden sm:inline">QR</span>
                    </button>
                  </div>
                  {carregamentoData.lacres.traseiro.length === 7 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      ✓ Lacre válido (7 dígitos)
                    </p>
                  )}
                </div>

                {/* Lacre Lateral 1 - COM SCANNER */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lacre Lateral 1
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={carregamentoData.lacres.lateral1 || ""}
                      onChange={(e) =>
                        handleLacreChange("lateral1", e.target.value)
                      }
                      placeholder="Ex: 4476647"
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                        carregamentoData.lacres.lateral1.length === 7
                          ? "border-green-500 bg-green-50"
                          : "border-gray-300"
                      }`}
                      maxLength={7}
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQRField("lateral1");
                        setShowQRScanner(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Scan className="w-5 h-5" />
                      <span className="hidden sm:inline">QR</span>
                    </button>
                  </div>
                  {carregamentoData.lacres.lateral1.length === 7 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      ✓ Lacre válido (7 dígitos)
                    </p>
                  )}
                </div>

                {/* Lacre Lateral 2 - COM SCANNER */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lacre Lateral 2
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={carregamentoData.lacres.lateral2 || ""}
                      onChange={(e) =>
                        handleLacreChange("lateral2", e.target.value)
                      }
                      placeholder="Ex: 4476649"
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                        carregamentoData.lacres.lateral2.length === 7
                          ? "border-green-500 bg-green-50"
                          : "border-gray-300"
                      }`}
                      maxLength={7}
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQRField("lateral2");
                        setShowQRScanner(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Scan className="w-5 h-5" />
                      <span className="hidden sm:inline">QR</span>
                    </button>
                  </div>
                  {carregamentoData.lacres.lateral2.length === 7 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      ✓ Lacre válido (7 dígitos)
                    </p>
                  )}
                </div>

                {/* Instruções */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <p className="text-xs text-blue-700">
                    <strong>Dica:</strong> Use o botão QR para escanear
                    automaticamente.
                  </p>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveModal}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Salvar Lacres
                </button>
              </div>
            </div>
          </div>

          {/* Scanner QR Code */}
          {showQRScanner && (
            <QRScanner
              onScan={handleQRScan}
              onClose={() => {
                setShowQRScanner(false);
                setActiveQRField(null);
              }}
            />
          )}
        </>
      )}

      {/* Footer */}
      <footer className="mb-4 py-2 border-t border-gray-200 pb-safe-bottom">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="text-gray-500 text-sm">
              <p>
                Sistema de Carregamento • Destino:{" "}
                {destinoInfo ? destinoInfo.nome : destinoCodigo}
              </p>
              <p className="mt-1">
                Operação: {facility} • © {new Date().getFullYear()}
              </p>
            </div>
            <div className="mt-2 md:mt-0">
              <span className="text-xs text-gray-500">
                Motoristas: {motoristas.length} • Dados preenchidos:{" "}
                {
                  Object.keys(carregamentos).filter(
                    (key) =>
                      carregamentos[key]?.doca ||
                      carregamentos[key]?.carga?.gaiolas != "" ||
                      carregamentos[key]?.horarios?.encostadoDoca,
                  ).length
                }
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function DestinoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <DestinoContent />
    </Suspense>
  );
}
