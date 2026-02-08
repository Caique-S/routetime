"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Truck,
  User,
  Package,
  Hash,
  MapPin,
  Clock,
  Tag,
  DoorClosed,
  Box,
  Printer,
  Download,
  CheckCircle,
  AlertCircle,
  BookType,
  FileUp,
  CornerDownRight,
} from "lucide-react";

interface CarregamentoData {
  id: string;
  doca: string;
  carga: {
    gaiolas: number;
    volumosos: number;
    manga: number;
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
  destino: string;
  facility: string;
  timestamp: string;
}

export default function CreatePage() {
  const router = useRouter();
  const [carregamento, setCarregamento] = useState<CarregamentoData | null>(null);
  const [destinoInfo, setDestinoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    loadCarregamentoData();
  }, []);

  const loadCarregamentoData = () => {
    try {
      // 1. Carregar informações do destino
      const destinoData = localStorage.getItem('DestinoAtual');
      let destinoInfoLocal = null;
      if (destinoData) {
        destinoInfoLocal = JSON.parse(destinoData);
        setDestinoInfo(destinoInfoLocal);
      }

      // 2. Carregar informações do motorista
      const motoristaData = localStorage.getItem('MotoristaSelecionado');
      let motorista = null;
      if (motoristaData) {
        motorista = JSON.parse(motoristaData);
      }

      // 3. Carregar ID do motorista selecionado
      const motoristaId = localStorage.getItem('motoristaSelecionadoId');
      
      if (!motoristaId) {
        console.error("❌ Nenhum motorista selecionado encontrado");
        return;
      }

      // 4. Construir a chave do localStorage para buscar os dados do carregamento
      let carregamentosData = null;
      
      // Primeiro, tentar usar o destinoInfo para construir a chave
      if (destinoInfoLocal) {
        const chaveCarregamentos = `carregamentos_${destinoInfoLocal.codigo}_${destinoInfoLocal.facility}`;
        const carregamentosStr = localStorage.getItem(chaveCarregamentos);
        if (carregamentosStr) {
          carregamentosData = JSON.parse(carregamentosStr);
        }
      }
      
      // Se não encontrou, tentar buscar no localStorage todas as chaves que começam com "carregamentos_"
      if (!carregamentosData) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('carregamentos_')) {
            const dataStr = localStorage.getItem(key);
            if (dataStr) {
              const data = JSON.parse(dataStr);
              // Verificar se esta chave contém o motoristaId
              if (data[motoristaId]) {
                carregamentosData = data;
                // Tentar extrair destino e facility da chave
                const parts = key.split('_');
                if (parts.length >= 3 && !destinoInfoLocal) {
                  setDestinoInfo({
                    codigo: parts[1],
                    facility: parts[2]
                  });
                }
                break;
              }
            }
          }
        }
      }

      // 5. Combinar os dados
      if (carregamentosData && carregamentosData[motoristaId]) {
        const dadosCarregamento = carregamentosData[motoristaId];
        
        // Se temos dados do motorista separados, mesclar
        if (motorista) {
          dadosCarregamento.motorista = motorista;
        }
        
        // Se o destino não foi carregado do localStorage, usar o do carregamento
        if (!destinoInfoLocal && dadosCarregamento.destino) {
          setDestinoInfo({
            codigo: dadosCarregamento.destino,
            facility: dadosCarregamento.facility
          });
        }
        
        setCarregamento(dadosCarregamento);
        checkCompletion(dadosCarregamento);
      } else if (motorista && destinoInfoLocal) {
        // Se não encontrou dados, mas temos motorista e destino, criar um novo
        console.log("⚠️ Criando novo carregamento com dados do motorista");
        const newCarregamento: CarregamentoData = {
          id: Math.floor(10000000 + Math.random() * 90000000).toString(),
          doca: "",
          carga: { gaiolas: 0, volumosos: 0, manga: 0 },
          horarios: { encostadoDoca: "", inicioCarregamento: "", terminoCarregamento: "", saidaLiberada: "", previsaoChegada: "" },
          lacres: { traseiro: "", lateral1: "", lateral2: "" },
          motorista: motorista,
          destino: destinoInfoLocal.codigo,
          facility: destinoInfoLocal.facility,
          timestamp: new Date().toISOString()
        };
        setCarregamento(newCarregamento);
        checkCompletion(newCarregamento);
      } else {
        console.error("❌ Não foi possível carregar dados do carregamento");
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkCompletion = (data: CarregamentoData) => {
    const hasDoca = !!data.doca && data.doca !== "";
    const hasCarga = data.carga.gaiolas > 0 || data.carga.volumosos > 0 || data.carga.manga > 0;
    const hasHorarios = !!data.horarios.encostadoDoca && data.horarios.encostadoDoca !== "";
    const hasLacres = !!data.lacres.traseiro && data.lacres.traseiro !== "";
    
    setIsComplete(hasDoca && hasCarga && hasHorarios && hasLacres);
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Erro ao copiar para área de transferência:', err);
      
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (fallbackErr) {
        console.error('Fallback também falhou:', fallbackErr);
        return false;
      }
    }
  };

  const handleDespachar = async () => {
    if (!carregamento) return;

    const mensagem = `Veiculo *${getNomeDestino(carregamento.destino)}* saindo nesse exato momento. Obs: *${carregamento.carga.gaiolas}* Gaiolas, *${carregamento.carga.volumosos}* Volumosos e *${carregamento.carga.manga}* Manga Palets.`;

    const copiadoComSucesso = await copyToClipboard(mensagem);
    
    if (copiadoComSucesso) {
      setCopiado('despachar');
      
      setTimeout(() => {
        setCopiado(null);
        window.open('https://chat.whatsapp.com/G5PEe8GbLZWAavzBkpSuKE?mode=gi_t', '_blank');
      }, 1000);
    } else {
      alert('Não foi possível copiar a mensagem. Tente novamente.');
    }
  };

  const handleInformacoesXPT = async () => {
    if (!carregamento) return;

    const content = `*ID:* ${carregamento.motorista.travelId}
*Doca:* (${carregamento.doca || "Não definida"})
*${carregamento.motorista.tipoVeiculo}:* ${getNomeDestino(carregamento.destino)} 
*Condutor:* ${carregamento.motorista.nome}
*Placa Tração:* ${carregamento.motorista.veiculoTracao}
${carregamento.motorista.veiculoCarga && carregamento.motorista.veiculoCarga !== "Não especificado" ? `*Placa Carga:* ${carregamento.motorista.veiculoCarga}` : ''}

*Encostado na doca:* ${carregamento.horarios.encostadoDoca || "Não registrado"}
*Início carregamento:* ${carregamento.horarios.inicioCarregamento || "Não registrado"}
*Término carregamento:* ${carregamento.horarios.terminoCarregamento || "Não registrado"}
*Saída liberada:* ${carregamento.horarios.saidaLiberada || "Não registrado"}
*Previsão de chegada:* ${carregamento.horarios.previsaoChegada || "Não calculado"}

*Lacre Traseiro:* ${carregamento.lacres.traseiro || "Não registrado"}
*Lacre Lateral 1:* ${carregamento.lacres.lateral1 || "Não registrado"}
*Lacre Lateral 2:* ${carregamento.lacres.lateral2 || "Não registrado"}

*Total de gaiolas:* ${carregamento.carga.gaiolas}
*Total de volumosos:* ${carregamento.carga.volumosos}
*Total de manga palete:* ${carregamento.carga.manga}`;

    const copiadoComSucesso = await copyToClipboard(content);
    
    if (copiadoComSucesso) {
      setCopiado('xpt');
      
      setTimeout(() => {
        setCopiado(null);
        window.open('https://chat.whatsapp.com/KgobWakeXIx1M0VCGki5dN?mode=gi_t', '_blank');
      }, 1000);
    } else {
      alert('Não foi possível copiar as informações. Tente novamente.');
    }
  };

  const handleVoltar = () => {
    router.back();
  };

  const handleFinalizar = () => {
    alert("Carregamento finalizado e salvo com sucesso!");
    
    localStorage.removeItem('motoristaSelecionadoId');
    localStorage.removeItem('MotoristaSelecionado');
    localStorage.removeItem('DestinoAtual');
    
    router.push("/carregamento/novo");
  };

  const handleEditar = () => {
    if (destinoInfo && carregamento) {
      router.push(`/carregamento/destino/${carregamento.destino}?facility=${carregamento.facility}`);
    } else {
      router.push("/carregamento/novo");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
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

  if (!carregamento) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <p className="text-gray-600 font-medium">Nenhum carregamento encontrado</p>
          <p className="text-sm text-gray-500 mb-4">Volte à página de destinos e selecione um motorista.</p>
          <button
            onClick={() => router.push("/carregamento/novo")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar para Destinos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={handleVoltar}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>
            <div className="flex items-center gap-3">
              {isComplete && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Completo
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner de Status */}
        <div className={`mb-8 p-4 rounded-2xl ${isComplete ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center gap-3">
            {isComplete ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            )}
            <div>
              <h3 className="font-bold text-gray-900">
                {isComplete ? 'Veículo Liberado' : 'Encostado na Doca'}
              </h3>
              <p className="text-sm text-gray-600">
                {isComplete 
                  ? 'Todas informações completas, pronto para viagem.'
                  : 'Informações pendentes para liberar o Veículo.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          {/* Cabeçalho do Card */}
          <div className="bg-linear-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <p className="text-blue-100 mt-1">
                  ID: {carregamento.id} • {new Date(carregamento.timestamp).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex gap-3">
                <button
                  onClick={handleDespachar}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors relative"
                  disabled={!!copiado}
                >
                  <Truck className="w-4 h-4" />
                  {copiado === 'despachar' ? 'Copiado!' : 'Despachar'}
                </button>
                <button
                  onClick={handleInformacoesXPT}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors relative"
                  disabled={!!copiado}
                >
                  <BookType className="w-4 h-4" />
                  {copiado === 'xpt' ? 'Copiado!' : 'Informações XPT'}
                </button>
              </div>
            </div>
          </div>

          {/* Conteúdo do Relatório */}
          <div className="p-6 md:p-8">
            {/* Grid com as informações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Coluna 1: Informações Básicas */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CornerDownRight className="w-5 h-5 text-blue-600" />
                    Informações Gerais
                  </h3>
                  <div className="space-y-3">

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <DoorClosed className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Doca</div>
                        <div className="font-semibold text-gray-900">({carregamento.doca || "Não definida"})</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Veículo</div>
                        <div className="font-semibold text-gray-900">
                          {carregamento.motorista.tipoVeiculo}: {getNomeDestino(carregamento.destino)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-green-600" />
                    Motorista
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Condutor</div>
                        <div className="font-semibold text-gray-900">{carregamento.motorista.nome}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Placa Tração</div>
                        <div className="font-semibold text-gray-900">{carregamento.motorista.veiculoTracao}</div>
                      </div>
                    </div>

                    {carregamento.motorista.veiculoCarga && carregamento.motorista.veiculoCarga !== "Não especificado" && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Truck className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Placa Carga</div>
                          <div className="font-semibold text-gray-900">{carregamento.motorista.veiculoCarga}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna 2: Horários e Destino */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Horários
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm text-gray-600">Encostado na Doca</span>
                      <span className="font-semibold text-gray-900">{carregamento.horarios.encostadoDoca || "Não registrado"}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm text-gray-600">Início Carregamento</span>
                      <span className="font-semibold text-gray-900">{carregamento.horarios.inicioCarregamento || "Não registrado"}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm text-gray-600">Término Carregamento</span>
                      <span className="font-semibold text-gray-900">{carregamento.horarios.terminoCarregamento || "Não registrado"}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm text-gray-600">Saída Liberada</span>
                      <span className="font-semibold text-gray-900">{carregamento.horarios.saidaLiberada || "Não registrado"}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-gray-600">Previsão de Chegada</span>
                      <span className="font-semibold text-green-700">{carregamento.horarios.previsaoChegada || "Não calculado"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-600" />
                    Destino
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Local</div>
                        <div className="font-semibold text-gray-900">
                          {getNomeDestino(carregamento.destino)} ({carregamento.destino})
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Hash className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Código</div>
                        <div className="font-semibold text-gray-900">{carregamento.destino}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Linha Divisória */}
            <div className="my-8 border-t border-gray-200"></div>

            {/* Carga e Lacres */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Carga */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Box className="w-5 h-5 text-yellow-600" />
                  Carga
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm text-gray-600">Total de Gaiolas</span>
                    <span className="font-semibold text-gray-900 text-xl">{carregamento.carga.gaiolas}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm text-gray-600">Total de Volumosos</span>
                    <span className="font-semibold text-gray-900 text-xl">{carregamento.carga.volumosos}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm text-gray-600">Total de Manga Palete</span>
                    <span className="font-semibold text-gray-900 text-xl">{carregamento.carga.manga}</span>
                  </div>
                </div>
              </div>

              {/* Lacres */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-600" />
                  Lacres
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm text-gray-600">Lacre Traseiro</span>
                    <span className="font-semibold text-gray-900">{carregamento.lacres.traseiro || "Não registrado"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm text-gray-600">Lacre Lateral 1</span>
                    <span className="font-semibold text-gray-900">{carregamento.lacres.lateral1 || "Não registrado"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm text-gray-600">Lacre Lateral 2</span>
                    <span className="font-semibold text-gray-900">{carregamento.lacres.lateral2 || "Não registrado"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer do Card */}
          <div className="bg-gray-50 p-6 border-t border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                <p>Sistema de Expedição • Operação: {carregamento.facility}</p>
                <p className="mt-1">Gerado em: {new Date(carregamento.timestamp).toLocaleString('pt-BR')}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleEditar}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Editar Dados
                </button>
                <button
                  onClick={handleFinalizar}
                  disabled={!isComplete}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isComplete
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Finalizar Carregamento
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-8 py-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 text-sm">
            <p>Sistema de Expedição • Carregamento ID: {carregamento.id} • {new Date().getFullYear()}</p>
          </div>
        </div>
      </footer>

      {/* Estilos para impressão */}
      <style jsx global>{`
        @media print {
          header, footer, button {
            display: none !important;
          }
          .bg-white {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}