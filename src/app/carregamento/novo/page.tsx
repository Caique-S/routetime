'use client';

import { Suspense } from 'react';
import { Calendar, ClipboardCheck, Loader2, TruckElectric, Users2 } from 'lucide-react';
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  MapPin,
  Building,
  Truck,
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

// Função para obter a data atual no formato YYYY-MM-DD (considerando fuso do navegador)
const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

function NovoCarregamento() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const facility = searchParams?.get("facility") || "SBA4";


  const [loading, setLoading] = useState(true);
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [destinos, setDestinos] = useState<DestinoInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facilityAtual, setFacilityAtual] = useState(facility)

  useEffect(() => {
    fetchUploadData();
  }, [facility]);

  const fetchUploadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const today = getTodayDateString();
      const responseAll = await fetch(`/api/upload?&date=${today}&limit=1`);
      const resultAll = await responseAll.json();

      if (!responseAll.ok) {
        throw new Error(resultAll.error || "Erro ao buscar dados");
      }

      let facilitySearch = facility

         if (resultAll.success && resultAll.data.length > 0) {
        const ultimoUpload = resultAll.data[0];
        if (ultimoUpload.filterValue) {
          facilitySearch = ultimoUpload.filterValue; // usa o filterValue do upload
        }
      }

      setFacilityAtual(facilitySearch)

      const response = await fetch(`/api/upload?facility=${encodeURIComponent(facilitySearch)}&date=${today}&limit=1`);
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        const latestUpload = result.data[0];
        setUploadData(latestUpload);

        localStorage.setItem("ExpedicaoEditavel", JSON.stringify(latestUpload))

        const destinosMap = new Map<string, DestinoInfo>();

        latestUpload.data.forEach((item: any) => {
          const destinoCodigo = item.Destino || item.destino;
          const itemFacility = item.Facility || item.facility || latestUpload.filterValue || facility;

          if (destinoCodigo) {
            const nomeAmigavel = getNomeDestino(destinoCodigo);
            if (!destinosMap.has(destinoCodigo)) {
              destinosMap.set(destinoCodigo, {
                nome: nomeAmigavel,
                codigo: destinoCodigo,
                facility: itemFacility,
                motoristasCount: 1,
                veiculosCount: item["Tipo de veículo"] ? 1 : 0,
                atribuicao: item["Data de início"] || new Date().toISOString(),
              });
            } else {
              const existing = destinosMap.get(destinoCodigo)!;
              destinosMap.set(destinoCodigo, {
                ...existing,
                motoristasCount: existing.motoristasCount + 1,
                veiculosCount: existing.veiculosCount + (item["Tipo de veículo"] ? 1 : 0),
              });
            }
          }
        });
        const destinosArray = Array.from(destinosMap.values());
        setDestinos(destinosArray);
      } else {
        setUploadData(null);
        setDestinos([]);
      }
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      setError(error.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUploadData();
  };

  const handleSelectDestino = (destino: DestinoInfo & { codigo?: string } ) => {
    const codigoDestino = destino.codigo || getCodigoDestino(destino.nome);
    router.push(
      `/carregamento/destino/${encodeURIComponent(codigoDestino)}?facility=${encodeURIComponent(destino.facility)}`
    );
  };

  const handleBack = () => {
    router.push("/dispatch");
  };

  const handleGoToUpload = () => {
    router.push("/carregamento/upload");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Carregando destinos...</p>
        </div>
      </div>
    );
  }

  const formatDateToBR = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
};

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 safe-area">
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200/50 pt-safe-top">
        <div className="px-4 h-16 flex items-center justify-between">
          <button onClick={handleBack} className="flex items-center gap-2 text-gray-700 hover:text-gray-900 active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full shadow-sm">
              <Building className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">{facility}</span>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
              aria-label="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 text-gray-700 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="px-4 pb-3 sm:hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full shadow-sm">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Operação: {facility}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="mb-6">
          <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center shrink-0 border border-blue-200/50">
                <ClipboardCheck className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 mb-1">Finalizar Operação {facility}</h2>
                <p className="text-sm text-gray-600">
                  {destinos.length > 0
                    ? ""
                    : "Nenhum destino encontrado para hoje. Faça upload do arquivo do dia."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {destinos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200/50 shadow-sm">
              <AlertCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Nenhum destino encontrado para hoje</h3>
            <p className="text-gray-600 mb-6">
              Não há upload para a data de hoje ({formatDateToBR(getTodayDateString())})  para a facility {facility}.
              <br />
              Faça o upload do arquivo do dia.
            </p>
            <button
              onClick={handleGoToUpload}
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-full hover:from-blue-700 hover:to-blue-800 active:scale-95 transition-all shadow-md hover:shadow-lg"
            >
              Ir para Upload
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {destinos.map((destino, index) => (
              <div
                key={index}
                onClick={() => handleSelectDestino(destino)}
                className="group bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-200/50 hover:border-blue-300 hover:shadow-md active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center border border-blue-200/50">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{destino.nome}</h3>
                      <div className="flex items-center gap-1 text-xs">
                        <Building className="w-3 h-3 text-gray-600" />
                        <span className="text-gray-600">{destino.facility}</span>
                        <span className="mx-1 text-gray-400">•</span>
                        <span className="text-gray-500 font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{destino.codigo}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
  
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/50 rounded-lg border border-gray-200/50">
                    {/* <Truck className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{destino.veiculosCount}</div>
                      <div className="text-xs text-gray-600">Veículos</div>
                    </div> */}
                  </div>
                </div>
                {destino.atribuicao && (
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Atribuído:{destino.atribuicao}
                      </span>
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>
                        {destino.veiculosCount} Veículos
                      </span>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {uploadData && (
          <div className="mt-8 pt-6 border-t border-gray-300/50">
            <div className="text-center">
              <p className="text-xs text-gray-600">
                Dados carregados de:{" "}
                <span className="font-medium text-gray-800">{uploadData.fileName}</span>
                <br />
              <span className="text-xs font-medium text-blue-700">
                Operação: {uploadData.filterValue}
              </span>
               <br />
                Data do upload:{" "}
                <span className="font-medium text-gray-800">
                  {new Date(uploadData.uploadDate).toLocaleDateString("pt-BR")}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de fallback para o Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
        <p className="text-gray-600">Carregando destinos...</p>
      </div>
    </div>
  );
}

// Componente principal da página (Server Component)
export default function NovoCarregamentoPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NovoCarregamento />
    </Suspense>
  );
}