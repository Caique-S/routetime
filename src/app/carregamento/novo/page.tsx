'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  MapPin,
  Building,
  Truck,
  ChevronRight,
  AlertCircle,
  Calendar,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';

import { getNomeDestino, getCodigoDestino } from '@/app/lib/utils/destinos';
import { getTodayBrasilia, formatarDataBrasil, getHoraAtualBrasilia } from '@/app/lib/utils/dateUtils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UploadData {
  _id:          string;
  fileName:     string;
  uploadDate:   string;
  data:         Record<string, unknown>[];
  filterColumn?: string;
  filterValue?:  string;
}

interface DestinoInfo {
  nome:            string;
  codigo:          string;
  facility:        string;
  motoristasCount: number;
  veiculosCount:   number;
  atribuicao?:     string;
}

// ─── Componente interno (requer Suspense pelo useSearchParams) ────────────────

function NovoCarregamento() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const facilityParam = searchParams?.get('facility') ?? '';

  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [uploadData,    setUploadData]    = useState<UploadData | null>(null);
  const [destinos,      setDestinos]      = useState<DestinoInfo[]>([]);
  const [facilityAtual, setFacilityAtual] = useState(facilityParam);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    fetchUploadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityParam]);

  async function fetchUploadData() {
    try {
      setLoading(true);
      setError(null);

      const today = getTodayBrasilia();

      // Busca o upload mais recente do dia para detectar o filterValue (facility)
      const resAll    = await fetch(`/api/upload?date=${today}&limit=1`);
      const resultAll = await resAll.json();

      if (!resAll.ok) throw new Error(resultAll.error ?? 'Erro ao buscar dados');

      // Usa o filterValue do upload se disponível; caso contrário, usa o param da URL
      let facilityBusca = facilityParam;
      if (resultAll.success && resultAll.data.length > 0 && resultAll.data[0].filterValue) {
        facilityBusca = resultAll.data[0].filterValue;
      }
      setFacilityAtual(facilityBusca);

      // Busca o upload filtrado pela facility detectada
      const res    = await fetch(`/api/upload?facility=${encodeURIComponent(facilityBusca)}&date=${today}&limit=1`);
      const result = await res.json();

      if (result.success && result.data.length > 0) {
        const latestUpload: UploadData = result.data[0];
        setUploadData(latestUpload);

        localStorage.setItem('ExpedicaoEditavel', JSON.stringify(latestUpload));

        // Agrupa linhas do CSV por destino
        const destinosMap = new Map<string, DestinoInfo>();

        for (const item of latestUpload.data as Record<string, any>[]) {
          const codigo  = String(item.Destino ?? item.destino ?? '').trim();
          if (!codigo) continue;

          const itemFacility = String(
            item.Facility ?? item.facility ?? latestUpload.filterValue ?? facilityBusca
          ).trim();

          if (destinosMap.has(codigo)) {
            const existing = destinosMap.get(codigo)!;
            destinosMap.set(codigo, {
              ...existing,
              motoristasCount: existing.motoristasCount + 1,
              veiculosCount:   existing.veiculosCount + (item['Tipo de veículo'] ? 1 : 0),
            });
          } else {
            destinosMap.set(codigo, {
              nome:            getNomeDestino(codigo),
              codigo,
              facility:        itemFacility,
              motoristasCount: 1,
              veiculosCount:   item['Tipo de veículo'] ? 1 : 0,
              atribuicao:      String(item['Data de início'] ?? new Date().toISOString()),
            });
          }
        }

        setDestinos(Array.from(destinosMap.values()));
      } else {
        setUploadData(null);
        setDestinos([]);
      }
    } catch (err: any) {
      console.error('[NovoCarregamento] Erro ao buscar dados:', err);
      setError(err.message ?? 'Erro ao carregar dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    fetchUploadData();
  }

  function handleSelectDestino(destino: DestinoInfo) {
    const codigo = destino.codigo || getCodigoDestino(destino.nome);
    router.push(
      `/carregamento/destino/${encodeURIComponent(codigo)}?facility=${encodeURIComponent(destino.facility)}`
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Carregando destinos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 safe-area">

      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200/50 pt-safe-top">
        <div className="px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push('/dispatch')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full shadow-sm">
              <Building className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">{facilityAtual}</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
              aria-label="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 text-gray-700 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Facility badge mobile */}
        <div className="px-4 pb-3 sm:hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full shadow-sm">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Operação: {facilityAtual}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">

        {/* Título da operação */}
        <div className="mb-6">
          <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center shrink-0 border border-blue-200/50">
                <ClipboardCheck className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <div onClick = {() => router.push('/analyzer')}>
                  <h2 className="font-bold text-gray-900 mb-1">Acompanhamento da Operação {facilityAtual}
                  
                  </h2>
                </div>
                {destinos.length === 0 && (
                  <p className="text-sm text-gray-600">
                    Nenhum destino encontrado para hoje. Faça upload do arquivo do dia.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Estado vazio */}
        {destinos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200/50 shadow-sm">
              <AlertCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Nenhum destino encontrado para hoje</h3>
            <p className="text-gray-600 mb-6">
              Não há upload para {getTodayBrasilia()} {getHoraAtualBrasilia()}.<br />
              Faça o upload do arquivo do dia.
            </p>
            <button
              onClick={() => router.push('/carregamento/upload')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-full hover:from-blue-700 hover:to-blue-800 active:scale-95 transition-all shadow-md"
            >
              Ir para Upload
            </button>
          </div>
        ) : (
          /* Lista de destinos */
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
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                          {destino.codigo}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>

                {destino.atribuicao && (
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Atribuído: {destino.atribuicao}</span>
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>{destino.veiculosCount} Veículos</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Rodapé com info do upload */}
        {uploadData && (
          <div className="mt-8 pt-6 border-t border-gray-300/50 text-center">
            <p className="text-xs text-gray-600">
              Dados de:{' '}
              <span className="font-medium text-gray-800">{uploadData.fileName}</span>
              <br />
              <span className="text-xs font-medium text-blue-700">
                Operação: {uploadData.filterValue}
              </span>
              <br />
              Upload em:{' '}
              <span className="font-medium text-gray-800">
                {formatarDataBrasil(uploadData.uploadDate)}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fallback do Suspense ─────────────────────────────────────────────────────

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

// ─── Página principal ─────────────────────────────────────────────────────────

export default function NovoCarregamentoPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NovoCarregamento />
    </Suspense>
  );
}