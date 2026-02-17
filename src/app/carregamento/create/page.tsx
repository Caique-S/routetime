"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Truck,
  User,
  Hash,
  MapPin,
  Clock,
  Tag,
  DoorClosed,
  Box,
  CheckCircle,
  AlertCircle,
  BookType,
  CornerDownRight,
} from "lucide-react";

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
  status?: "emFila" | "carregando" | "liberado" | "";
  posicaoVeiculo?: number;
  destino: string;
  facility: string;
  timestamp: string;
}

export default function CreatePage() {
  const router = useRouter();
  const [carregamento, setCarregamento] = useState<CarregamentoData | null>(
    null,
  );
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
      const destinoData = localStorage.getItem("DestinoAtual");
      let destinoInfoLocal = null;
      if (destinoData) {
        destinoInfoLocal = JSON.parse(destinoData);
        setDestinoInfo(destinoInfoLocal);
      }

      // 2. Carregar informações do motorista
      const motoristaData = localStorage.getItem("MotoristaSelecionado");
      let motorista = null;
      if (motoristaData) {
        motorista = JSON.parse(motoristaData);
      }

      // 3. Carregar ID do motorista selecionado
      const motoristaId = localStorage.getItem("motoristaSelecionadoId");

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
          if (key && key.startsWith("carregamentos_")) {
            const dataStr = localStorage.getItem(key);
            if (dataStr) {
              const data = JSON.parse(dataStr);
              // Verificar se esta chave contém o motoristaId
              if (data[motoristaId]) {
                carregamentosData = data;
                // Tentar extrair destino e facility da chave
                const parts = key.split("_");
                if (parts.length >= 3 && !destinoInfoLocal) {
                  setDestinoInfo({
                    codigo: parts[1],
                    facility: parts[2],
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
          dadosCarregamento.motorista = {
            ...dadosCarregamento.motorista,
            ...motorista,
          };
        }

        // Se o destino não foi carregado do localStorage, usar o do carregamento
        if (!destinoInfoLocal && dadosCarregamento.destino) {
          setDestinoInfo({
            codigo: dadosCarregamento.destino,
            facility: dadosCarregamento.facility,
          });
        }

        setCarregamento(dadosCarregamento);
        checkCompletion(dadosCarregamento);
      } else if (motorista && destinoInfoLocal) {
        // Se não encontrou dados, mas temos motorista e destino, criar um novo
        console.log("⚠️ Criando novo carregamento com dados do motorista");

        const motoristaId = `${destinoInfoLocal.codigo}_${destinoInfoLocal.facility}_${motorista.nome}_${motorista.travelId}`;
        const chaveBase = `carregamentos_${destinoInfoLocal.codigo}_${destinoInfoLocal.facility}`;

        const newCarregamento: CarregamentoData = {
          id: Math.floor(10000000 + Math.random() * 90000000).toString(),
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
          destino: destinoInfoLocal.codigo,
          facility: destinoInfoLocal.facility,
          timestamp: new Date().toISOString(),
          status: "emFila", // <- adicionado
          posicaoVeiculo: 0, // <- adicionado
        };

        // Persistir no localStorage
        const carregamentosExistentes = localStorage.getItem(chaveBase);
        const carregamentosObj = carregamentosExistentes
          ? JSON.parse(carregamentosExistentes)
          : {};
        carregamentosObj[motoristaId] = newCarregamento;
        localStorage.setItem(chaveBase, JSON.stringify(carregamentosObj));

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
    // 1. Doca: deve estar preenchida
    const hasDoca = !!data.doca && data.doca.trim() !== "";

    // 2. Carga: todos os campos devem ter valores numéricos (incluindo 0)
    // Convertendo para número e verificando se não é NaN
    const gaiolas = Number(data.carga.gaiolas);
    const volumosos = Number(data.carga.volumosos);
    const manga = Number(data.carga.manga);

    const hasCarga = !isNaN(gaiolas) && !isNaN(volumosos) && !isNaN(manga);

    // 3. Horários: todos os campos devem estar preenchidos
    const hasHorarios =
      !!data.horarios.encostadoDoca &&
      data.horarios.encostadoDoca.trim() !== "" &&
      !!data.horarios.inicioCarregamento &&
      data.horarios.inicioCarregamento.trim() !== "" &&
      !!data.horarios.terminoCarregamento &&
      data.horarios.terminoCarregamento.trim() !== "" &&
      !!data.horarios.saidaLiberada &&
      data.horarios.saidaLiberada.trim() !== "" &&
      !!data.horarios.previsaoChegada &&
      data.horarios.previsaoChegada.trim() !== "";

    // 4. Lacres: apenas o traseiro é obrigatório
    const hasLacres =
      !!data.lacres.traseiro && data.lacres.traseiro.trim() !== "";

    const hasStatus = data.status === "liberado";

    console.log("Verificação de completude:", {
      hasDoca,
      hasCarga,
      hasHorarios,
      hasLacres,
      hasStatus,
      carga: data.carga,
      horarios: data.horarios,
      lacres: data.lacres,
    });

    setIsComplete(hasDoca && hasCarga && hasHorarios && hasLacres && hasStatus);
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
      console.error("Erro ao copiar para área de transferência:", err);

      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        return true;
      } catch (fallbackErr) {
        console.error("Fallback também falhou:", fallbackErr);
        return false;
      }
    }
  };

  const fetchCarregamentoFromDB = async (motoristaId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/carregamento?motoristaId=${encodeURIComponent(motoristaId)}`,
      );
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        // Pega o primeiro registro (deve ser único)
        const dbData = result.data[0];

        // Converte _id para id e remove _id (para manter compatibilidade)
        const { _id, ...rest } = dbData;
        const carregamentoData = {
          ...rest,
          id: _id,
          // Garante que posicaoVeiculo seja número, se existir
          posicaoVeiculo: dbData.posicaoVeiculo,
        };

        setCarregamento(carregamentoData);
        checkCompletion(carregamentoData);
        return carregamentoData;
      }
    } catch (error) {
      console.error("Erro ao buscar carregamento do banco:", error);
    } finally {
      setLoading(false);
    }
    return null;
  };

  const handleDespachar = async () => {
    // Tenta usar o carregamento já carregado no estado
    let data = carregamento;

    // Se não existir ou não tiver posição, busca do banco
    if (!data || !data.posicaoVeiculo) {
      const motoristaId = localStorage.getItem("motoristaSelecionadoId");
      if (motoristaId) {
        data = await fetchCarregamentoFromDB(motoristaId);
      }
    }

    if (!data) {
      alert(
        "Não foi possível carregar os dados do carregamento. Tente novamente.",
      );
      return;
    }

    const posicao = data.posicaoVeiculo?.toString().padStart(2, "0") || "";
    const mensagem = `Veiculo ${getNomeDestino(data.destino)} (${posicao}) saindo nesse exato momento. Obs: ${data.carga.gaiolas} Gaiolas, ${data.carga.volumosos} Volumosos e ${data.carga.manga} Manga Palets.`;

    const copiadoComSucesso = await copyToClipboard(mensagem);

    if (copiadoComSucesso) {
      setCopiado("despachar");
      setTimeout(() => {
        setCopiado(null);
        window.open(
          "https://chat.whatsapp.com/G5PEe8GbLZWAavzBkpSuKE",
          "_blank",
        );
      }, 1000);
    } else {
      alert("Não foi possível copiar a mensagem. Tente novamente.");
    }
  };

  const handleInformacoesXPT = async () => {
    let data = carregamento;

    if (!data || !data.posicaoVeiculo) {
      const motoristaId = localStorage.getItem("motoristaSelecionadoId");
      if (motoristaId) {
        data = await fetchCarregamentoFromDB(motoristaId);
      }
    }

    if (!data) {
      alert(
        "Não foi possível carregar os dados do carregamento. Tente novamente.",
      );
      return;
    }

    const posicao = data.posicaoVeiculo?.toString().padStart(2, "0") || "";
    const content = `*ID:* ${data.motorista.travelId}
*Doca:* (${data.doca || "Não definida"})
*${data.motorista.tipoVeiculo}:* ${getNomeDestino(data.destino)} (${posicao})
*Condutor:* ${data.motorista.nome}
*Placa Tração:* ${data.motorista.veiculoTracao}
${data.motorista.veiculoCarga && data.motorista.veiculoCarga !== "Não especificado" ? `*Placa Carga:* ${data.motorista.veiculoCarga}` : ""}

*Encostado na doca:* ${data.horarios.encostadoDoca || "Não registrado"}
*Início carregamento:* ${data.horarios.inicioCarregamento || "Não registrado"}
*Término carregamento:* ${data.horarios.terminoCarregamento || "Não registrado"}
*Saída liberada:* ${data.horarios.saidaLiberada || "Não registrado"}
*Previsão de chegada:* ${data.horarios.previsaoChegada || "Não calculado"}

*Lacre Traseiro:* ${data.lacres.traseiro || ""}
*Lacre Lateral 1:* ${data.lacres.lateral1 || ""}
*Lacre Lateral 2:* ${data.lacres.lateral2 || ""}

*Total de gaiolas:* ${data.carga.gaiolas}
*Total de volumosos:* ${data.carga.volumosos}
*Total de manga palete:* ${data.carga.manga}`;

    const copiadoComSucesso = await copyToClipboard(content);

    if (copiadoComSucesso) {
      setCopiado("xpt");
      setTimeout(() => {
        setCopiado(null);
        window.open(
          "https://chat.whatsapp.com/KgobWakeXIx1M0VCGki5dN",
          "_blank",
        );
      }, 1000);
    } else {
      alert("Não foi possível copiar as informações. Tente novamente.");
    }
  };

  const handleVoltar = async () => {
    router.back();
  };

  const handleFinalizar = async () => {
    // Validar novamente antes de finalizar
    if (!carregamento) return;

    checkCompletion(carregamento);

    const enviado = await enviarParaBanco(carregamento);

    if (enviado) {
      localStorage.removeItem("motoristaSelecionadoId");
      localStorage.removeItem("MotoristaSelecionado");
      localStorage.removeItem("DestinoAtual");
      router.push(
        `/carregamento/destino/${carregamento.destino}?facility=${carregamento.facility}`,
      );
    } else {
      alert("Erro ao salvar no banco de dados. Tente novamente.");
    }
  };

  const handleNotUsed = async () => {
    if (!carregamento) return;

    const mensagem = `Not Used
ID: ${carregamento.motorista.travelId}
${carregamento.motorista.tipoVeiculo} : ${getNomeDestino(carregamento.destino)}
Placa Tração: ${carregamento.motorista.veiculoTracao}
Condutor: ${carregamento.motorista.nome}`;

    const copiadoComSucesso = await copyToClipboard(mensagem);

    if (copiadoComSucesso) {
      setCopiado("notused");
      const enviado = await enviarNotUsedParaBanco(carregamento);
      if (enviado) {
        setTimeout(() => {
          setCopiado(null);
          window.open(
            "https://chat.whatsapp.com/KgobWakeXIx1M0VCGki5dN",
            "_blank",
          );
        }, 1000);
      } else {
        alert("Erro ao registrar. Tente novamente.");
        setCopiado(null);
      }
    } else {
      alert("Não foi possível copiar a mensagem.");
    }
  };

  const enviarParaBanco = async (carregamentoData: CarregamentoData) => {
    try {
      // 1. Gerar motoristaId
      const motoristaId = `${carregamentoData.destino}_${carregamentoData.facility}_${carregamentoData.motorista.nome}_${carregamentoData.motorista.travelId}`;
      const chaveBase = `carregamentos_${carregamentoData.destino}_${carregamentoData.facility}`;

      // 2. Preparar payload para o banco
      const dadosParaBanco = {
        ...carregamentoData,
        motoristaId, // <-- enviar também para o banco
        operador: localStorage.getItem("operador_nome") || "Não identificado",
        dataCriacao: carregamentoData.timestamp,
        dataEnvio: new Date().toISOString(),
        mensagemDespacho: `Veiculo ${getNomeDestino(carregamentoData.destino)} (${carregamentoData.posicaoVeiculo?.toString().padStart(2, "0")}) saindo nesse exato momento. Obs: ${carregamentoData.carga.gaiolas} Gaiolas, ${carregamentoData.carga.volumosos} Volumosos e ${carregamentoData.carga.manga} Manga Palets.`,
        mensagemXPT: `*ID:* ${carregamentoData.motorista.travelId}
*Doca:* (${carregamentoData.doca || "Não definida"})
*${carregamentoData.motorista.tipoVeiculo}:* ${getNomeDestino(carregamentoData.destino)} (${carregamentoData.posicaoVeiculo?.toString().padStart(2, "0")})
*Condutor:* ${carregamentoData.motorista.nome}
*Placa Tração:* ${carregamentoData.motorista.veiculoTracao}
${carregamentoData.motorista.veiculoCarga && carregamentoData.motorista.veiculoCarga !== "Não especificado" ? `*Placa Carga:* ${carregamentoData.motorista.veiculoCarga}` : ""}

*Encostado na doca:* ${carregamentoData.horarios.encostadoDoca || "Não registrado"}
*Início carregamento:* ${carregamentoData.horarios.inicioCarregamento || "Não registrado"}
*Término carregamento:* ${carregamentoData.horarios.terminoCarregamento || "Não registrado"}
*Saída liberada:* ${carregamentoData.horarios.saidaLiberada || "Não registrado"}
*Previsão de chegada:* ${carregamentoData.horarios.previsaoChegada || "Não calculado"}

*Lacre Traseiro:* ${carregamentoData.lacres.traseiro || ""}
*Lacre Lateral 1:* ${carregamentoData.lacres.lateral1 || ""}
*Lacre Lateral 2:* ${carregamentoData.lacres.lateral2 || ""}

*Total de gaiolas:* ${carregamentoData.carga.gaiolas}
*Total de volumosos:* ${carregamentoData.carga.volumosos}
*Total de manga palete:* ${carregamentoData.carga.manga}`,
      };

      // 3. Enviar para o banco
      const response = await fetch("/api/carregamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosParaBanco),
      });

      if (response.ok) {
        // ✅ 4. Marcar como finalizado no localStorage
        const carregamentosStr = localStorage.getItem(chaveBase);
        if (carregamentosStr) {
          const carregamentos = JSON.parse(carregamentosStr);
          if (carregamentos[motoristaId]) {
            carregamentos[motoristaId] = {
              ...carregamentos[motoristaId],
              finalizado: true, // <-- flag de finalizado
            };
            localStorage.setItem(chaveBase, JSON.stringify(carregamentos));
          }
        }

        // 5. Limpeza das chaves temporárias
        localStorage.removeItem("motoristaSelecionadoId");
        localStorage.removeItem("MotoristaSelecionado");
        localStorage.removeItem("DestinoAtual");

        return true;
      } else {
        console.error("Erro ao enviar para o banco:", await response.json());
        return false;
      }
    } catch (error) {
      console.error("Erro ao enviar para o banco:", error);
      return false;
    }
  };
  const enviarNotUsedParaBanco = async (carregamentoData: CarregamentoData) => {
    try {
      const motoristaId = `${carregamentoData.destino}_${carregamentoData.facility}_${carregamentoData.motorista.nome}_${carregamentoData.motorista.travelId}`;
      const chaveBase = `carregamentos_${carregamentoData.destino}_${carregamentoData.facility}`;

      const dadosParaBanco = {
        ...carregamentoData,
        // Limpar campos não utilizados
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
        status: "not_used",
        finalizado: true,
        motoristaId,
        operador: localStorage.getItem("operador_nome") || "Não identificado",
        dataCriacao: carregamentoData.timestamp,
        dataEnvio: new Date().toISOString(),
      };

      const response = await fetch("/api/carregamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosParaBanco),
      });

      if (response.ok) {
        // Marcar como finalizado no localStorage
        const carregamentosStr = localStorage.getItem(chaveBase);
        if (carregamentosStr) {
          const carregamentos = JSON.parse(carregamentosStr);
          if (carregamentos[motoristaId]) {
            carregamentos[motoristaId] = {
              ...carregamentos[motoristaId],
              finalizado: true,
              status: "not_used",
            };
            localStorage.setItem(chaveBase, JSON.stringify(carregamentos));
          }
        }

        // Limpar dados temporários
        localStorage.removeItem("motoristaSelecionadoId");
        localStorage.removeItem("MotoristaSelecionado");
        localStorage.removeItem("DestinoAtual");

        return true;
      } else {
        console.error("Erro ao enviar not used:", await response.json());
        return false;
      }
    } catch (error) {
      console.error("Erro ao enviar not used:", error);
      return false;
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
          <p className="text-gray-600 font-medium">
            Nenhum carregamento encontrado
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Volte à página de destinos e selecione um motorista.
          </p>
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
        <div
          className={`mb-8 p-4 rounded-2xl ${isComplete ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}
        >
          <div className="flex items-center gap-3">
            {isComplete ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            )}
            <div>
              <h3 className="font-bold text-gray-900">
                {isComplete ? "Veículo Liberado" : "Encostado na Doca"}
              </h3>
              <p className="text-sm text-gray-600">
                {isComplete
                  ? "Todas informações completas, pronto para viagem."
                  : "Informações pendentes para liberar o Veículo."}
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
                  ID: {carregamento.id} •{" "}
                  {new Date(carregamento.timestamp).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex gap-3">
                <button
                  onClick={handleDespachar}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors relative"
                  disabled={!!copiado}
                >
                  <Truck className="w-4 h-4" />
                  {copiado === "despachar" ? "Copiado!" : "Despachar"}
                </button>
                <button
                  onClick={handleInformacoesXPT}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors relative"
                  disabled={!!copiado}
                >
                  <BookType className="w-4 h-4" />
                  {copiado === "xpt" ? "Copiado!" : "Informações XPT"}
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
                        <div className="font-semibold text-gray-900">
                          ({carregamento.doca || "Não definida"})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Veículo</div>
                        <div className="font-semibold text-gray-900">
                          {carregamento.motorista.tipoVeiculo}:{" "}
                          {getNomeDestino(carregamento.destino)}
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
                        <div className="font-semibold text-gray-900">
                          {carregamento.motorista.nome}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">
                          Placa Tração
                        </div>
                        <div className="font-semibold text-gray-900">
                          {carregamento.motorista.veiculoTracao}
                        </div>
                      </div>
                    </div>

                    {carregamento.motorista.veiculoCarga &&
                      carregamento.motorista.veiculoCarga !==
                        "Não especificado" && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <Truck className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">
                              Placa Carga
                            </div>
                            <div className="font-semibold text-gray-900">
                              {carregamento.motorista.veiculoCarga}
                            </div>
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
                      <span className="text-sm text-gray-600">
                        Encostado na Doca
                      </span>
                      <span className="font-semibold text-gray-900">
                        {carregamento.horarios.encostadoDoca ||
                          "Não registrado"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm text-gray-600">
                        Início Carregamento
                      </span>
                      <span className="font-semibold text-gray-900">
                        {carregamento.horarios.inicioCarregamento ||
                          "Não registrado"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm text-gray-600">
                        Término Carregamento
                      </span>
                      <span className="font-semibold text-gray-900">
                        {carregamento.horarios.terminoCarregamento ||
                          "Não registrado"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm text-gray-600">
                        Saída Liberada
                      </span>
                      <span className="font-semibold text-gray-900">
                        {carregamento.horarios.saidaLiberada ||
                          "Não registrado"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-gray-600">
                        Previsão de Chegada
                      </span>
                      <span className="font-semibold text-green-700">
                        {carregamento.horarios.previsaoChegada ||
                          "Não calculado"}
                      </span>
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
                          {getNomeDestino(carregamento.destino)} (
                          {carregamento.destino})
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Hash className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Código</div>
                        <div className="font-semibold text-gray-900">
                          {carregamento.destino}
                        </div>
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
                    <span className="text-sm text-gray-600">
                      Total de Gaiolas
                    </span>
                    <span className="font-semibold text-gray-900 text-xl">
                      {carregamento.carga.gaiolas || ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm text-gray-600">
                      Total de Volumosos
                    </span>
                    <span className="font-semibold text-gray-900 text-xl">
                      {carregamento.carga.volumosos || ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm text-gray-600">
                      Total de Manga Palete
                    </span>
                    <span className="font-semibold text-gray-900 text-xl">
                      {carregamento.carga.manga || ""}
                    </span>
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
                    <span className="text-sm text-gray-600">
                      Lacre Traseiro
                    </span>
                    <span className="font-semibold text-gray-900">
                      {carregamento.lacres.traseiro || "Não registrado"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm text-gray-600">
                      Lacre Lateral 1
                    </span>
                    <span className="font-semibold text-gray-900">
                      {carregamento.lacres.lateral1 || "Não registrado"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm text-gray-600">
                      Lacre Lateral 2
                    </span>
                    <span className="font-semibold text-gray-900">
                      {carregamento.lacres.lateral2 || "Não registrado"}
                    </span>
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
                <p className="mt-1">
                  Gerado em:{" "}
                  {new Date(carregamento.timestamp).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  disabled={isComplete}
                  onClick={handleNotUsed}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isComplete
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-red-500 text-white "
                  }`}
                >
                  {copiado === "notused" ? "Copiado!" : "Not Used"}
                </button>
                <button
                  onClick={handleFinalizar}
                  disabled={!isComplete}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isComplete
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
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
            <p>
              Sistema de Expedição • Carregamento ID: {carregamento.id} •{" "}
              {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>

      {/* Estilos para impressão */}
      <style jsx global>{`
        @media print {
          header,
          footer,
          button {
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
