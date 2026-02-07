'use client'

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
} from "lucide-react";

// ALTERE O COMPONENTE DestinoContent:
function DestinoContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const destinoCodigo = params.destino as string;

  const [loading, setLoading] = useState(false);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [destinoInfo, setDestinoInfo] = useState<any>(null);

  const facility = searchParams?.get("facility") || "N/A";

  useEffect(() => {
    if (destinoCodigo && facility) {
      fetchDestinoData();
    }
  }, [destinoCodigo, facility]);

  const fetchDestinoData = async () => {
    try {
      setLoading(true);

      // 1. BUSCAR DADOS DO LOCALSTORAGE (ExpedicaoEditavel)
      const expedicaoEditavel = localStorage.getItem("ExpedicaoEditavel");

      if (!expedicaoEditavel) {
        console.error("❌ Dados não encontrados no localStorage");
        router.push("/carregamento/novo");
        return;
      }

      const csvData = JSON.parse(expedicaoEditavel);
      console.log("📊 Dados recuperados do localStorage:", csvData);

      // 2. FUNÇÃO PARA BUSCAR NOME AMIGÁVEL DO DESTINO (igual na primeira página)
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

      // 3. FILTRAR DADOS PARA ESTE DESTINO
      const filteredData = csvData.data.filter((item: any) => {
        // Verifica múltiplos possíveis nomes de coluna
        const itemDestino = item.destino || item.Destino || item.DESTINO;
        const itemFacility =
          item.Facility || item.facility || csvData.filterValue;

        return itemDestino === destinoCodigo && itemFacility === facility;
      });

      console.log(
        `✅ ${filteredData.length} registros encontrados para ${destinoCodigo}`,
      );

      if (filteredData.length === 0) {
        console.warn("⚠️ Nenhum dado encontrado com os filtros aplicados");
      }

      // 4. AGRUPAR MOTORISTAS ÚNICOS COM INFORMAÇÕES COMPLETAS
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
            // Adicione outros campos que precisar
          });
        }
      });

      const motoristasArray = Array.from(motoristasMap.values());
      setMotoristas(motoristasArray);

      // 5. DEFINIR INFORMAÇÕES DO DESTINO
      setDestinoInfo({
        nome: getNomeDestino(destinoCodigo),
        codigo: destinoCodigo,
        facility: facility,
        totalMotoristas: motoristasArray.length,
        totalVeiculos: motoristasArray.length, // Assumindo 1 veículo por motorista
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

  const handleSelecionarMotorista = (motorista: any) => {
    // Salvar dados do motorista no localStorage para uso posterior
    localStorage.setItem("MotoristaSelecionado", JSON.stringify(motorista));
    localStorage.setItem("DestinoAtual", JSON.stringify(destinoInfo));

    // Redirecionar para criação de carregamento
    router.push(
      `/carregamento/create?destino=${destinoCodigo}&motorista=${encodeURIComponent(motorista.nome)}&facility=${facility}`,
    );
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
                  {/* ALTERAÇÃO AQUI: Usar destinoInfo.nome ou destinoCodigo */}
                  <h1 className="text-xl font-bold text-gray-900">
                    Destino: {destinoInfo ? destinoInfo.nome : destinoCodigo}
                  </h1>
                  <p className="text-xs text-gray-500">
                    Selecione um motorista
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Resumo do Destino */}
        <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 text-white mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              {/* ALTERAÇÃO AQUI: Usar destinoInfo.nome */}
              <h2 className="text-2xl font-bold mb-2">
                {destinoInfo ? destinoInfo.nome : destinoCodigo}
              </h2>
              <p className="opacity-90">
                Motoristas disponíveis para este destino
              </p>
              <div className="flex items-center space-x-4 mt-3">
                <span className="text-sm opacity-90">
                  <Users className="w-4 h-4 inline mr-1" />
                  {motoristas.length} motorista(s)
                </span>
                {/* Adicione contagem de veículos se disponível */}
                {destinoInfo && (
                  <span className="text-sm opacity-90">
                    <Truck className="w-4 h-4 inline mr-1" />
                    {destinoInfo.totalVeiculos} veículo(s)
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="text-sm opacity-90">
                Operação: <span className="font-bold">{facility}</span>
              </div>
              <div className="text-xs opacity-75 mt-1">
                Código: {destinoCodigo}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Motoristas */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Motoristas Disponíveis
            </h2>
            <div className="text-sm text-gray-600">
              {motoristas.length} motorista(s) encontrado(s)
            </div>
          </div>

          {motoristas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {motoristas.map((motorista, index) => (
                <button
                  key={index}
                  // ALTERAÇÃO AQUI: Passar o objeto motorista completo
                  onClick={() => handleSelecionarMotorista(motorista)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 p-6 text-left group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {motorista.nome}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Motorista Principal
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>

                  <div className="space-y-3">
                    {/* ADICIONAR MAIS INFORMAÇÕES AQUI */}
                    {motorista.tipoVeiculo && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Truck className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">Tipo:</span>
                        <span className="ml-1 text-gray-800">
                          {motorista.tipoVeiculo}
                        </span>
                      </div>
                    )}
                    {motorista.veiculoTracao && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Truck className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">Tração:</span>
                        <span className="ml-1 text-gray-800">
                          {motorista.veiculoTracao}
                        </span>
                      </div>
                    )}
                    {motorista.veiculoCarga && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Truck className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">Carga:</span>
                        <span className="ml-1 text-gray-800">
                          {motorista.veiculoCarga}
                        </span>
                      </div>
                    )}
                    {motorista.travelId && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Hash className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">Travel ID:</span>
                        <span className="ml-1 text-gray-800 font-mono">
                          {motorista.travelId}
                        </span>
                      </div>
                    )}
                    {motorista.dataInicio && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">Data Prevista:</span>
                        <span className="ml-1 text-gray-800">
                          {new Date(motorista.dataInicio).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="inline-flex items-center text-blue-600 text-sm font-medium">
                      <span>Selecionar este motorista</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </button>
              ))}
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

        {/* Informações Adicionais - SUBSTITUIR csvData POR INFORMAÇÕES DO DESTINO */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Informações da Operação
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">Destino:</span>
              </div>
              <p className="text-gray-900">
                {destinoInfo ? destinoInfo.nome : destinoCodigo} (
                {destinoCodigo})
              </p>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                <Building className="w-4 h-4" />
                <span className="font-medium">Operação (Facility):</span>
              </div>
              <p className="text-gray-900">{facility}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Total de Motoristas:</span>{" "}
                {motoristas.length}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total de Veículos:</span>{" "}
                {destinoInfo ? destinoInfo.totalVeiculos : motoristas.length}
              </div>
            </div>
            <div>
              {destinoInfo && destinoInfo.ultimoCarregamento && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Último Carregamento:</span>{" "}
                  {new Date(destinoInfo.ultimoCarregamento).toLocaleDateString(
                    "pt-BR",
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 py-6 border-t border-gray-200 pb-safe-bottom">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="text-gray-500 text-sm">
              {/* ALTERAÇÃO AQUI: Usar destinoInfo.nome */}
              <p>
                Sistema de Carregamento • Destino:{" "}
                {destinoInfo ? destinoInfo.nome : destinoCodigo}
              </p>
              <p className="mt-1">
                Operação: {facility} • © {new Date().getFullYear()}
              </p>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <button
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                onClick={() => {
                  // Função para exportar dados do localStorage
                  const dataToExport = {
                    destino: destinoInfo,
                    motoristas: motoristas,
                    timestamp: new Date().toISOString(),
                  };
                  const dataStr = JSON.stringify(dataToExport, null, 2);
                  const dataBlob = new Blob([dataStr], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `carregamento_${destinoCodigo}_${new Date().toISOString().split("T")[0]}.json`;
                  link.click();
                }}
              >
                <Download className="w-4 h-4" />
                <span>Exportar Dados</span>
              </button>
              <button
                onClick={handleVoltar}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Componente principal que envolve o conteúdo em Suspense
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
