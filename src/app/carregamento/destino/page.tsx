'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Users, 
  Truck, 
  Calendar, 
  MapPin,
  ChevronRight,
  Download,
  FileText,
  Loader2
} from 'lucide-react';

// Componente que usa useSearchParams, envolto em Suspense
function DestinoContent() {
  const router = useRouter();
  const params = useParams();
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const destino = params.destino as string;
  
  const [loading, setLoading] = useState(true);
  const [csvData, setCsvData] = useState<any>(null);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  
  // Obter query params de forma segura
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setSearchParams(params);
    }
  }, []);
  
  const facility = searchParams?.get('facility') || 'SBA04';

  useEffect(() => {
    if (destino && searchParams) {
      fetchDestinoData();
    }
  }, [destino, facility, searchParams]);

  const fetchDestinoData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/upload?limit=1');
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        const latestUpload = result.data[0];
        setCsvData(latestUpload);

        // Filtrar dados para este destino e facility
        const filteredData = latestUpload.data.filter((item: any) => 
          item.Facility === facility && item.destino === destino
        );

        // Agrupar motoristas únicos com informações adicionais
        const motoristasMap = new Map();
        filteredData.forEach((item: any) => {
          const motorista = item['Nome do motorista principal'];
          if (motorista && !motoristasMap.has(motorista)) {
            motoristasMap.set(motorista, {
              nome: motorista,
              tipoVeiculo: item['Tipo de veículo'],
              veiculoTracao: item['Veículo de tração'],
              dataInicio: item['Data de início']
            });
          }
        });

        const motoristasArray = Array.from(motoristasMap.values());
        setMotoristas(motoristasArray);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    router.push('/carregamento/novo');
  };

  const handleSelecionarMotorista = (motorista: string) => {
    router.push(`/carregamento/create?destino=${destino}&motorista=${encodeURIComponent(motorista)}&facility=${facility}`);
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
                  <h1 className="text-xl font-bold text-gray-900">Destino: {destino}</h1>
                  <p className="text-xs text-gray-500">Selecione um motorista</p>
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
              <h2 className="text-2xl font-bold mb-2">{destino}</h2>
              <p className="opacity-90">Motoristas disponíveis para este destino</p>
              <div className="flex items-center space-x-4 mt-3">
                <span className="text-sm opacity-90">
                  <Users className="w-4 h-4 inline mr-1" />
                  {motoristas.length} motorista(s)
                </span>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="text-sm opacity-90">
                Operação: <span className="font-bold">{facility}</span>
              </div>
              {csvData && (
                <div className="text-xs opacity-75 mt-1">
                  Arquivo: {csvData.fileName}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Motoristas */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Motoristas Disponíveis</h2>
            <div className="text-sm text-gray-600">
              {motoristas.length} motorista(s) encontrado(s)
            </div>
          </div>

          {motoristas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {motoristas.map((motorista, index) => (
                <button
                  key={index}
                  onClick={() => handleSelecionarMotorista(motorista.nome)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 p-6 text-left group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{motorista.nome}</h3>
                        <p className="text-sm text-gray-600">Motorista Principal</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  
                  <div className="space-y-3">
                    {motorista.tipoVeiculo && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Truck className="w-4 h-4 mr-2 text-gray-400" />
                        <span>Tipo: {motorista.tipoVeiculo}</span>
                      </div>
                    )}
                    {motorista.veiculoTracao && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Truck className="w-4 h-4 mr-2 text-gray-400" />
                        <span>Veículo: {motorista.veiculoTracao}</span>
                      </div>
                    )}
                    {motorista.dataInicio && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        <span>Data: {motorista.dataInicio}</span>
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
              <p className="text-gray-600 font-medium">Nenhum motorista encontrado</p>
              <p className="text-sm text-gray-500 mt-1">
                Não há motoristas cadastrados para o destino {destino} na operação {facility}
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

        {/* Informações Adicionais */}
        {csvData && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Arquivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">Arquivo:</span>
                </div>
                <p className="text-gray-900">{csvData.fileName}</p>
              </div>
              <div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Último upload:</span>
                </div>
                <p className="text-gray-900">
                  {new Date(csvData.uploadDate).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Total de registros:</span> {csvData.totalRecords}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Registros processados:</span> {csvData.processedRecords}
                </div>
              </div>
              <div>
                {csvData.filterColumn && csvData.filterValue && (
                  <>
                    <div className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Filtro aplicado:</span> {csvData.filterColumn}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Valor do filtro:</span> {csvData.filterValue}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 py-6 border-t border-gray-200 pb-safe-bottom">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="text-gray-500 text-sm">
              <p>Sistema de Carregamento • Destino: {destino}</p>
              <p className="mt-1">Operação: {facility} • © {new Date().getFullYear()}</p>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <button className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <DestinoContent />
    </Suspense>
  );
}