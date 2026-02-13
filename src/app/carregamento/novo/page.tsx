'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  MapPin,
  Building,
  Users,
  Truck,
  Calendar,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface UploadData {
  _id: string;
  fileName: string;
  uploadDate: string;
  data: any[];
  filterColumn?: string;
  filterValue?: string;
}

interface DestinoInfo {
  nome: string;
  codigo: string;
  facility: string;
  motoristasCount: number;
  veiculosCount: number;
  atribuicao?: string;
}
// Função para mapear códigos de destino para nomes amigáveis
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
    // Adicione outros mapeamentos conforme necessário
  };

  return mapeamento[codigo] || codigo;
};

// Função para obter o código do destino do nome (para URL e lógica interna)
const getCodigoDestino = (nomeAmigavel: string): string => {
  const mapeamentoReverso: Record<string, string> = {
    Serrinha: "EBA14",
    "Santo Antônio de Jesus": "EBA4",
    Itaberaba: "EBA19",
    Jacobina: "EBA3",
    Pombal: "EBA2",
    "Senhor do Bonfim": "EBA16",
    Seabra: "EBA21",
    Juazeiro: "EBA6",
    Valença: "EBA29",
  };

  return mapeamentoReverso[nomeAmigavel] || nomeAmigavel;
};

export default function NovoCarregamentoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [destinos, setDestinos] = useState<DestinoInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUploadData();
  }, []);

  const fetchUploadData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/upload?limit=1");
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        const latestUpload = result.data[0];
        setUploadData(latestUpload);

        localStorage.setItem("ExpedicaoEditavel", JSON.stringify(latestUpload))
        // Extrair destinos únicos do CSV
        const destinosMap = new Map<string, DestinoInfo>();

        latestUpload.data.forEach((item: any) => {
          const destinoCodigo = item.destino || item.Destino;
          const facility =
            item.Facility || item.facility || latestUpload.filterValue || "N/A";

          if (destinoCodigo) {
            const nomeAmigavel = getNomeDestino(destinoCodigo);
            if (!destinosMap.has(destinoCodigo)) {
              destinosMap.set(destinoCodigo, {
                nome: nomeAmigavel,
                codigo: destinoCodigo,
                facility: facility,
                motoristasCount: 1,
                veiculosCount: item["Tipo de veículo"] ? 1 : 0,
                atribuicao:
                  item["Data de início"] || new Date().toISOString(),
              });
            } else {
              const existing = destinosMap.get(destinoCodigo)!;
              destinosMap.set(destinoCodigo, {
                ...existing,
                motoristasCount: existing.motoristasCount + 1,
                veiculosCount:
                  existing.veiculosCount + (item["Tipo de veículo"] ? 1 : 0),
              });
            }
          }
        });

        const destinosArray = Array.from(destinosMap.values());
        setDestinos(destinosArray);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUploadData();
  };

  const handleSelectDestino = (destino: DestinoInfo & { codigo?: string }) => {
    const codigoDestino = destino.codigo || getCodigoDestino(destino.nome);
    router.push(
      `/carregamento/destino/${encodeURIComponent(codigoDestino)}?facility=${encodeURIComponent(destino.facility)}`,
    );
  };

  const handleBack = () => {
    router.push("/dispatch");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 safe-area">
        {/* Header Skeleton */}
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200/50 pt-safe-top">
          <div className="px-4 h-16 flex items-center justify-between">
            <div className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="px-4 py-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-200/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex gap-4">
                    <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatarData = (dataStr: string) => {
  if (!dataStr) return '';
  
  // Se já for ISO (ex: 2025-02-13T10:30:00.000Z)
  if (dataStr.includes('T')) {
    return new Date(dataStr).toLocaleDateString('pt-BR');
  }
  
  // Tenta interpretar como MM/DD/YYYY (formato comum em CSVs)
  const partes = dataStr.split(/[\/\-]/);
  if (partes.length === 3) {
    const [mes, dia, ano] = partes;
    // Verifica se ano tem 4 dígitos
    if (ano.length === 4 && !isNaN(Number(mes)) && !isNaN(Number(dia))) {
      const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
      if (!isNaN(data.getTime())) {
        return data.toLocaleDateString('pt-BR');
      }
    }
  }
  
  // Fallback: retorna a string original
  return dataStr;
};

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 safe-area">
      {/* Header Fixo */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200/50 pt-safe-top">
        <div className="px-4 h-16 flex items-center justify-between">
          {/* Botão Voltar */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar</span>
          </button>

          {/* Título e Badge de Facility */}
          <div className="flex items-center gap-3">
            {uploadData?.filterValue && (
              <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full shadow-sm">
                <Building className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {uploadData.filterValue}
                </span>
              </div>
            )}

            {/* Botão Atualizar */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
              aria-label="Atualizar dados"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-700 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Badge de Facility Mobile */}
        {uploadData?.filterValue && (
          <div className="px-4 pb-3 sm:hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full shadow-sm">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">
                Operação: {uploadData.filterValue}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div className="px-4 py-6">
        {/* Banner Informativo */}
        <div className="mb-6">
          <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center shrink-0 border border-blue-200/50">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 mb-1">
                  Rotas Encontradas
                </h2>
                <p className="text-sm text-gray-600">
                  {destinos.length > 0
                    ? `${destinos.length} rotas disponíveis para carregamento`
                    : "Nenhum destino encontrado. Faça upload de um arquivo CSV primeiro."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Destinos */}
        {destinos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200/50 shadow-sm">
              <AlertCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">
              Nenhum destino encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              Faça upload de um arquivo CSV com dados de carregamento primeiro.
            </p>
            <button
              onClick={() => router.push("/carregamento/upload")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-full hover:from-blue-700 hover:to-blue-800 active:scale-95 transition-all shadow-md hover:shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Ir para Upload
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {destinos.map((destino, index) => {
              // Verificar se temos um código no destino (da nova interface)
              const codigoDestino =
                (destino as any).codigo || getCodigoDestino(destino.nome);
              const nomeAmigavel = getNomeDestino(codigoDestino);

              return (
                <div
                  key={index}
                  onClick={() =>
                    handleSelectDestino({ ...destino, codigo: codigoDestino })
                  }
                  className="group bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-200/50 hover:border-blue-300 hover:shadow-md active:scale-[0.99] transition-all cursor-pointer"
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center border border-blue-200/50">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {nomeAmigavel}
                        </h3>
                        <div className="flex items-center gap-1 text-xs">
                          <Building className="w-3 h-3 text-gray-600" />
                          <span className="text-gray-600">
                            {destino.facility}
                          </span>
                          <span className="mx-1 text-gray-400">•</span>
                          <span className="text-gray-500 font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {codigoDestino}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Informações do Destino */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/50 rounded-lg border border-gray-200/50">
                      <Users className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {destino.motoristasCount}
                        </div>
                        <div className="text-xs text-gray-600">Motoristas</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/50 rounded-lg border border-gray-200/50">
                      <Truck className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {destino.veiculosCount}
                        </div>
                        <div className="text-xs text-gray-600">Veículos</div>
                      </div>
                    </div>
                  </div>

                  {/* Data do Último Carregamento */}
                  {/* {destino.atribuicao && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Atribuído:{formatarData(destino.atribuicao)}
                      </span>
                    </div>
                  )} */}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-300/50">
          <div className="text-center">
            <p className="text-xs text-gray-600">
              {uploadData ? (
                <>
                  Dados carregados de:{" "}
                  <span className="font-medium text-gray-800">
                    {uploadData.fileName}
                  </span>
                  <br />
                  Última atualização:{" "}
                  <span className="font-medium text-gray-800">
                    {new Date(uploadData.uploadDate).toLocaleTimeString(
                      "pt-BR",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </span>
                </>
              ) : (
                "Faça upload de um arquivo CSV para ver os destinos disponíveis"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Estilos Mobile-Specific */}
      <style jsx global>{`
        /* Melhorias para touch em dispositivos móveis */
        @media (max-width: 640px) {
          .safe-area {
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
          }
        }

        /* Prevenir zoom em inputs em iOS */
        @media screen and (max-width: 767px) {
          input,
          select,
          textarea {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
