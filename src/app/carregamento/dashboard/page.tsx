'use client'

import { useState, useEffect, Fragment } from "react";
import {
  Truck,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  RefreshCw,
  MapPin,
  ArrowLeft,
  Download,
  X,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { Dialog, Transition } from "@headlessui/react";
import { criarIntervaloDia, formatarDataBrasil, getTodayBrasilia } from "@/app/lib/utils/dateUtils";
import { DESTINOS } from "@/app/utils/constants"

declare global {
  interface Window {
    Android?: {
      saveCsvFile: (content: string, fileName: string) => void;
    };
  }
}

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
  jornada?: {
    chegadaXpt?: string;
    retornoService?: string;
    chegadaService?: string;
  };
  changeTruck?: {
    hasChanged?: boolean;
    motorista1: string;
    motorista2?: string;
    dateChanged?: string;
  };
}

interface DestinoProgresso {
  id: string;
  nome: string;
  total: number;
  concluidos: number;
  progresso: number;
}

interface CityConfig {
  horarioFixoCarregamento: string; // Ex: "22:00"
  duracaoPercurso: string;          // Ex: "02:30" ou "150" (minutos)
  prevChegada: string;             // Ex: "06:00"
  janelaInicio: string;            // Ex: "13:00"
  janelaFim: string;               // Ex: "15:00"
}

// ------------------------------------------------------------
// Funções auxiliares
// ------------------------------------------------------------

// Converter string de tempo (HH:mm ou ISO) para minutos desde o início do dia ou timestamp
const timeToMinutes = (val?: string): number | null => {
  if (!val) return null;
  // Se for ISO String (contém 'T' ou '-')
  if (val.includes("T") || val.includes("-")) {
    const date = new Date(val);
    if (isNaN(date.getTime())) return null;
    // Retorna minutos locais no dia
    const hours = date.getHours();
    const mins = date.getMinutes();
    return hours * 60 + mins;
  }
  // Se for formato "HH:mm"
  if (val.includes(":")) {
    const [h, m] = val.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }
  // Se já for numérico (minutos puros)
  const num = Number(val);
  return isNaN(num) ? null : num;
};

// Formatar minutos em formato "Xh Ym"
const formatMinutesToHoursMin = (totalMinutes: number): string => {
  if (isNaN(totalMinutes) || totalMinutes < 0) return "0h 0m";
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  return `${hours}h ${mins}m`;
};

// Calcular diferença entre dois tempos (lidando com virada de dia/madrugada)
const calcTimeDiffMinutes = (startVal?: string, endVal?: string): number | null => {
  if (!startVal || !endVal) return null;

  // Se ambos forem ISO strings completas
  if ((startVal.includes("T") || startVal.includes("-")) && (endVal.includes("T") || endVal.includes("-"))) {
    const dStart = new Date(startVal).getTime();
    const dEnd = new Date(endVal).getTime();
    if (isNaN(dStart) || isNaN(dEnd)) return null;
    const diffMs = dEnd - dStart;
    return diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
  }

  // Caso contrário, usa minutos no dia
  const startMin = timeToMinutes(startVal);
  const endMin = timeToMinutes(endVal);

  if (startMin === null || endMin === null) return null;

  let diff = endMin - startMin;
  if (diff < 0) {
    diff += 1440; // Soma 24h se virou a madrugada
  }
  return diff;
};

// Formatar ISO string para HH:mm
const isoToTimeStr = (isoStr?: string): string => {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  } catch {
    return "";
  }
};

// Formatar ISO string/timestamp para dd/mm/aaaa
const isoToDateStr = (isoStr?: string): string => {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return "";
  }
};

// Montar Tipo de Carga (G+V+M)
const formatTipoCarga = (gaiolas?: number, volumosos?: number, manga?: number): string => {
  const partes: string[] = [];
  if (gaiolas && gaiolas > 0) partes.push("G");
  if (volumosos && volumosos > 0) partes.push("V");
  if (manga && manga > 0) partes.push("M");
  return partes.join("+");
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

// ------------------------------------------------------------
// Componente principal
// ------------------------------------------------------------
export default function DashboardPage() {
  const [allCarregamentos, setAllCarregamentos] = useState<Carregamento[]>([]);
  const [uploadDoDia, setUploadDoDia] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [filter, setFilter] = useState({
    status: "",
    facility: "",
    data: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  });

  const [expandedDestino, setExpandedDestino] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    dataInicio: getTodayBrasilia(),
    dataFim: getTodayBrasilia(),
    facility: ""
  });


  // Estados para o Modal de Jornada
  const [isJornadaModalOpen, setIsJornadaModalOpen] = useState(false);
  const [selectedCityCode, setSelectedCityCode] = useState<string>(DESTINOS[0]?.value || "");
  const [cityConfigs, setCityConfigs] = useState<Record<string, CityConfig>>({});

  // Helper para pegar ou inicializar config de uma cidade
  const currentCityConfig: CityConfig = cityConfigs[selectedCityCode] || {
    horarioFixoCarregamento: "",
    duracaoPercurso: "",
    prevChegada: "",
    janelaInicio: "",
    janelaFim: "",
  };

  const handleCityConfigChange = (field: keyof CityConfig, value: string) => {
    setCityConfigs((prev) => ({
      ...prev,
      [selectedCityCode]: {
        ...(prev[selectedCityCode] || {
          horarioFixoCarregamento: "",
          duracaoPercurso: "",
          prevChegada: "",
          janelaInicio: "",
          janelaFim: "",
        }),
        [field]: value,
      },
    }));
  };

  // Função Geradora do Relatório de Controle de Jornada
  const generateJornadaCSV = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (exportFilters.facility.trim() !== "") {
        queryParams.append("facility", exportFilters.facility.trim());
      }
      if (exportFilters.dataInicio && exportFilters.dataFim) {
        queryParams.append("dataInicio", exportFilters.dataInicio);
        queryParams.append("dataFim", exportFilters.dataFim);
      }
      queryParams.append("limit", "1000");

      const response = await fetch(`/api/carregamento?${queryParams}`);
      const data = await response.json();

      if (!data.success) {
        alert("Erro ao carregar os dados para exportação.");
        return;
      }

      let carregamentos: Carregamento[] = data.data;

      if (exportFilters.dataInicio && exportFilters.dataFim) {
        const start = new Date(exportFilters.dataInicio + 'T00:00:00').getTime();
        const end = new Date(exportFilters.dataFim + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000;

        carregamentos = carregamentos.filter((c) => {
          const createdAt = new Date(c.dataCriacao).getTime();
          return createdAt >= start && createdAt < end;
        });
      }

      if (carregamentos.length === 0) {
        alert("Nenhum registro encontrado para os filtros selecionados.");
        return;
      }

      const headers = [
        "Travel ID", "Data", "Origem", "XPT", "Motorista", "Tração", "Baú", "Tip. Veículo", "Cidade",
        "Horario Fixo de Carregamento", "Início do Carregamento", "Atraso no Carregamento", "Fim do Carregamento",
        "Tipo de Carga", "Qtd. Gaiolas", "Qtd Volumosos", "Qtd Manga Pallet",
        "Início de Viagem", "Duração do Percurso", "Prev.Cheg.XPTs", "Chegada no XPT",
        "Tempo de Viagem", "Tempo de Atraso", "Saida do XPT", "Prev.Chegada", "Janela de Devolução",
        "Transferencia de Veiculo", "Tranferido para", "Data Transferência", "Hora transferencia",
        "Chegada ao SVC", "Tempo de Retorno",
        // Cabeçalhos do outro endpoint (Descarga)
        "Inicio da Descarga", "Gaiolas Retornadas", "Pallets Retornados", "Mangas Retornadas", "Fim da Descarga", "Tempo de Descarga",
        "Jornada"
      ];

      const rows = carregamentos.map((c) => {
        const destinoCodigo = c.destino ?? "";
        const nomeCidade = DESTINOS.find((d) => d.value === destinoCodigo)?.label || getNomeDestino(destinoCodigo);
        const configCidade = cityConfigs[destinoCodigo] || {};

        // 1. Atraso no Carregamento
        const horFixo = configCidade.horarioFixoCarregamento || "";
        const horInicioCarregamento = c.horarios?.inicioCarregamento || "";
        const minAtrasoCarregamento = calcTimeDiffMinutes(horFixo, horInicioCarregamento);
        const atrasoCarregamentoStr = (minAtrasoCarregamento !== null && minAtrasoCarregamento > 0)
          ? formatMinutesToHoursMin(minAtrasoCarregamento)
          : "Sem Atrasos";

        // 2. Tipo de Carga
        const tipoCarga = formatTipoCarga(c.carga?.gaiolas, c.carga?.volumosos, c.carga?.manga);

        // 3. Viagem e Atraso
        const inicioViagem = c.horarios?.saidaLiberada || "";
        const chegadaXptIso = c.jornada?.chegadaXpt || "";
        const chegadaXptHora = isoToTimeStr(chegadaXptIso);

        const minTempoViagem = calcTimeDiffMinutes(inicioViagem, chegadaXptIso);
        const tempoViagemStr = minTempoViagem !== null ? formatMinutesToHoursMin(minTempoViagem) : "";

        // Duração percurso estimada em minutos
        const minDuracaoEstimada = timeToMinutes(configCidade.duracaoPercurso);
        const duracaoPercursoStr = configCidade.duracaoPercurso ? (minDuracaoEstimada !== null ? formatMinutesToHoursMin(minDuracaoEstimada) : configCidade.duracaoPercurso) : "";

        // Tempo de Atraso na Pista
        let tempoAtrasoStr = "Sem Atrasos";
        if (minTempoViagem !== null && minDuracaoEstimada !== null) {
          const diffAtraso = minTempoViagem - minDuracaoEstimada;
          if (diffAtraso > 0) {
            tempoAtrasoStr = formatMinutesToHoursMin(diffAtraso);
          }
        }

        // 4. Retorno ao SVC
        const saidaXptIso = c.jornada?.retornoService || "";
        const saidaXptHora = isoToTimeStr(saidaXptIso);
        const chegadaSvcIso = c.jornada?.chegadaService || "";
        const chegadaSvcHora = isoToTimeStr(chegadaSvcIso);

        const minTempoRetorno = calcTimeDiffMinutes(saidaXptIso, chegadaSvcIso);
        const tempoRetornoStr = minTempoRetorno !== null ? formatMinutesToHoursMin(minTempoRetorno) : "";

        // 5. Janela de Devolução
        const janelaDevolucao = (configCidade.janelaInicio && configCidade.janelaFim)
          ? `Das ${configCidade.janelaInicio}h ás ${configCidade.janelaFim}h`
          : "";

        // 6. Transferência
        const teveTransferencia = c.changeTruck?.hasChanged ? "Sim" : "Não";
        const transferidoPara = c.changeTruck?.motorista2 ?? "";
        const dataTransferencia = isoToDateStr(c.changeTruck?.dateChanged);
        const horaTransferencia = isoToTimeStr(c.changeTruck?.dateChanged);

        // 7. Jornada Total
        const minJornada = (minTempoViagem || 0) + (minTempoRetorno || 0);
        const jornadaStr = minJornada > 0 ? formatMinutesToHoursMin(minJornada) : "";

        return [
          c.motorista?.travelId ?? "",
          formatDate(c.dataCriacao),
          c.facility ?? "",
          destinoCodigo,
          c.motorista?.nome ?? "",
          c.motorista?.veiculoTracao ?? "",
          c.motorista?.veiculoCarga ?? "",
          c.motorista?.tipoVeiculo ?? "",
          nomeCidade,
          horFixo,
          horInicioCarregamento,
          atrasoCarregamentoStr,
          c.horarios?.terminoCarregamento ?? "",
          tipoCarga,
          c.carga?.gaiolas?.toString() ?? "0",
          c.carga?.volumosos?.toString() ?? "0",
          c.carga?.manga?.toString() ?? "0",
          inicioViagem,
          duracaoPercursoStr,
          c.horarios?.previsaoChegada ?? "",
          chegadaXptHora,
          tempoViagemStr,
          tempoAtrasoStr,
          saidaXptHora,
          configCidade.prevChegada || "",
          janelaDevolucao,
          teveTransferencia,
          transferidoPara,
          dataTransferencia,
          horaTransferencia,
          chegadaSvcHora,
          tempoRetornoStr,
          // Colunas do próximo endpoint (vazias por enquanto)
          "", "", "", "", "", "",
          jornadaStr
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => {
            if (typeof cell === "string" && (cell.includes(",") || cell.includes("\n") || cell.includes('"'))) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          }).join(",")
        ),
      ].join("\n");

      const facilityName = exportFilters.facility.trim() || "todas_facilities";
      const fileName = `controle_jornada_${facilityName}_${exportFilters.dataInicio}_a_${exportFilters.dataFim}.csv`;

      if (typeof window.Android !== 'undefined' && (window as any).Android?.saveCsvFile) {
        (window as any).Android.saveCsvFile(csvContent, fileName);
        setIsJornadaModalOpen(false);
        return;
      }

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsJornadaModalOpen(false);
    } catch (error) {
      console.error("Erro ao gerar CSV de Jornada:", error);
      alert("Ocorreu um erro ao gerar o relatório de jornada.");
    }
  };


  const facilitiesDisponiveis = Array.from(
    new Set(allCarregamentos.map((c) => c.facility).filter(Boolean))
  ).sort();

  const fetchUploadDoDia = async () => {
    try {
      setLoadingUpload(true);
      const targetDateBr = filter.data.split('-').reverse().join('/');
      const response = await fetch(`/api/upload?date=${targetDateBr}`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        setUploadDoDia(result.data);
      } else {
        setUploadDoDia([]);
      }
    } catch (error) {
      console.error('Erro ao buscar upload do dia:', error);
      setUploadDoDia(null);
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

  const stats = {
    total: filteredCarregamentos.length,
    pendentes: filteredCarregamentos.filter((c) => c.statusNormalizado === "emDoca" || c.statusNormalizado === "aguardando").length,
    emAndamento: filteredCarregamentos.filter((c) => c.statusNormalizado === "carregando").length,
    concluidos: filteredCarregamentos.filter((c) => c.statusNormalizado === "liberado" || c.statusNormalizado === "concluido").length,
  };

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

  const formatDate = (isoString?: string): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString("pt-BR");
  };

  const generateCSV = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (exportFilters.facility.trim() !== "") {
        queryParams.append("facility", exportFilters.facility.trim());
      }
      if (exportFilters.dataInicio && exportFilters.dataFim) {
        queryParams.append("dataInicio", exportFilters.dataInicio);
        queryParams.append("dataFim", exportFilters.dataFim);
      }
      queryParams.append("limit", "1000");

      const response = await fetch(`/api/carregamento?${queryParams}`);
      const data = await response.json();

      if (!data.success) {
        alert("Erro ao carregar os dados para exportação.");
        return;
      }

      let carregamentos: Carregamento[] = data.data;

      if (exportFilters.dataInicio && exportFilters.dataFim) {
        const start = new Date(exportFilters.dataInicio + 'T00:00:00').getTime();
        const end = new Date(exportFilters.dataFim + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000;

        carregamentos = carregamentos.filter((c) => {
          const createdAt = new Date(c.dataCriacao).getTime();
          return createdAt >= start && createdAt < end;
        });
      }

      if (carregamentos.length === 0) {
        alert("Nenhum registro encontrado para os filtros selecionados.");
        return;
      }

      const headers = [
        "Travel ID", "Data", "Condutor", "Categoria", "Placa de Tração", "Placa de Carga",
        "Facility", "Destino", "Status", "Posição de Saída", "ID Carregamento", "Doca Carregamento",
        "Encostado na Doca", "Início do Carregamento", "Término de Carregamento", "Saída Liberada",
        "Previsão de Chegada", "Lacre Traseiro", "Lacre Lateral 1", "Lacre Lateral 2",
        "Gaiolas", "Volumosos", "Manga Palets", "Operador", "Transportadora"
      ];

      const rows = carregamentos.map((c) => [
        c.motorista?.travelId ?? "", formatDate(c.dataCriacao), c.motorista?.nome ?? "",
        c.motorista?.tipoVeiculo ?? "", c.motorista?.veiculoTracao ?? "", c.motorista?.veiculoCarga ?? "",
        c.facility ?? "", c.destino ?? "", c.status ?? "", c.posicaoVeiculo ?? "", c._id ?? "",
        c.doca ?? "", c.horarios?.encostadoDoca ?? "", c.horarios?.inicioCarregamento ?? "",
        c.horarios?.terminoCarregamento ?? "", c.horarios?.saidaLiberada ?? "", c.horarios?.previsaoChegada ?? "",
        c.lacres?.traseiro ?? "", c.lacres?.lateral1 ?? "", c.lacres?.lateral2 ?? "",
        c.carga?.gaiolas?.toString() ?? "", c.carga?.volumosos?.toString() ?? "", c.carga?.manga?.toString() ?? "",
        c.operador ?? "", c.motorista?.transportadora ?? ""
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => {
            if (typeof cell === "string" && (cell.includes(",") || cell.includes("\n") || cell.includes('"'))) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          }).join(",")
        ),
      ].join("\n");

      const facilityName = exportFilters.facility.trim() || "todas_facilities";
      const fileName = `relatorio_${facilityName}_${exportFilters.dataInicio}_a_${exportFilters.dataFim}.csv`;

      if (typeof window.Android !== 'undefined' && (window as any).Android?.saveCsvFile) {
        (window as any).Android.saveCsvFile(csvContent, fileName);
        setIsExportModalOpen(false);
        return;
      }

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExportModalOpen(false);
    } catch (error) {
      console.error("Erro ao gerar CSV:", error);
      alert("Ocorreu um erro ao gerar o relatório.");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-2">
              <Link
                href="/dispatch"
                className="flex items-center gap-1 px-2 py-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Voltar</span>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-lg transform rotate-3 opacity-20"></div>
                  <div className="relative bg-linear-to-br from-blue-600 to-blue-700 p-1.5 rounded-lg shadow-md">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
              </div>
            </div>
            <button
              onClick={() => setIsJornadaModalOpen(true)}
              className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-xs font-medium shadow-xs"
              title="Relatório Completo de Controle de Jornada"
            >
              <Clock className="w-6 h-6" />
              <span>.csv Jornada</span>
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-ls font-medium"
            >
              <Package className="w-6 h-6" />
              <span>.csv</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cards de estatísticas - MOBILE */}
        <div className="flex flex-row gap-3 mb-6 md:hidden">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-3 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pendentes</p>
                <p className="text-xl font-bold text-yellow-600">{stats.pendentes}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-3 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Concluídos</p>
                <p className="text-xl font-bold text-green-600">{stats.concluidos}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Versão desktop */}
        <div className="hidden md:grid md:grid-cols-2 gap-6 mb-8">
          <div className="flex flex-col gap-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Em Andamento</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.emAndamento}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pendentes</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendentes}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Concluídos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.concluidos}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

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
                                  {c.motorista.tipoVeiculo && <p>Tipo: <strong className="text-blue-600 font-semibold">{c.motorista?.tipoVeiculo}</strong></p>}
                                  {c.doca && <p>Doca: <strong className="text-blue-600 font-semibold">{c.doca}</strong></p>}
                                  {c.operador && <p>Operador: <strong className="text-gray-700">{c.operador}</strong></p>}
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
      </main>

      {/* Modal Relatório de Controle de Jornada */}
      <Transition appear show={isJornadaModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsJornadaModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-gray-100">
                  <div className="flex items-center justify-between mb-4 border-b pb-3">
                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Relatório de Controle de Jornada
                    </Dialog.Title>
                    <button
                      onClick={() => setIsJornadaModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Filtros gerais de data */}
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200/60">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Data Inicial</label>
                        <input
                          type="date"
                          value={exportFilters.dataInicio}
                          onChange={(e) => setExportFilters({ ...exportFilters, dataInicio: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Data Final</label>
                        <input
                          type="date"
                          value={exportFilters.dataFim}
                          onChange={(e) => setExportFilters({ ...exportFilters, dataFim: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Seleção de Cidade para Parâmetros */}
                    <div className="border-t border-gray-100 pt-3">
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Selecione a Cidade / XPT para Parametrizar:
                      </label>
                      <select
                        value={selectedCityCode}
                        onChange={(e) => setSelectedCityCode(e.target.value)}
                        className="w-full px-3 py-2 bg-blue-50/50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {DESTINOS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label} ({d.value})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Form de parâmetros específicos da cidade selecionada */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Configuração para: <span className="text-blue-600 font-extrabold">{DESTINOS.find(d => d.value === selectedCityCode)?.label}</span>
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Horário Fixo Carregamento</label>
                          <input
                            type="time"
                            value={currentCityConfig.horarioFixoCarregamento}
                            onChange={(e) => handleCityConfigChange("horarioFixoCarregamento", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Duração do Percurso (Estimada)</label>
                          <input
                            type="time"
                            value={currentCityConfig.duracaoPercurso}
                            onChange={(e) => handleCityConfigChange("duracaoPercurso", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Previsão de Chegada</label>
                          <input
                            type="time"
                            value={currentCityConfig.prevChegada}
                            onChange={(e) => handleCityConfigChange("prevChegada", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Janela Devolução (Início / Fim)</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={currentCityConfig.janelaInicio}
                              onChange={(e) => handleCityConfigChange("janelaInicio", e.target.value)}
                              className="w-1/2 px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-400">às</span>
                            <input
                              type="time"
                              value={currentCityConfig.janelaFim}
                              onChange={(e) => handleCityConfigChange("janelaFim", e.target.value)}
                              className="w-1/2 px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {currentCityConfig.janelaInicio && currentCityConfig.janelaFim && (
                        <p className="text-[11px] text-gray-500 italic">
                          Parâmetros <strong>Atualizados</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3 border-t pt-3">
                    <button
                      type="button"
                      onClick={() => setIsJornadaModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={generateJornadaCSV}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Gerar Relatório Completo
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de Exportação CSV */}
      <Transition appear show={isExportModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsExportModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl p-6 text-left align-middle shadow-xl transition-all border border-white/30">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Download className="w-5 h-5 text-blue-600" />
                      Exportar Relatório
                    </Dialog.Title>
                    <button
                      onClick={() => setIsExportModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="export-date-start" className="block text-xs font-medium text-gray-600 mb-1">
                          Data Inicial
                        </label>
                        <input
                          type="date"
                          lang="pt-BR"
                          id="export-date-start"
                          value={exportFilters.dataInicio}
                          onChange={(e) => setExportFilters({ ...exportFilters, dataInicio: e.target.value })}
                          className="w-full px-3 py-2 bg-white/70 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm backdrop-blur-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="export-date-end" className="block text-xs font-medium text-gray-600 mb-1">
                          Data Final
                        </label>
                        <input
                          type="date"
                          id="export-date-end"
                          value={exportFilters.dataFim}
                          onChange={(e) => setExportFilters({ ...exportFilters, dataFim: e.target.value })}
                          className="w-full px-3 py-2 bg-white/70 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm backdrop-blur-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="export-facility" className="block text-xs font-medium text-gray-600 mb-1">
                        Facility
                      </label>
                      <input
                        type="text"
                        id="export-facility"
                        placeholder="Ex: SBA4"
                        value={exportFilters.facility}
                        onChange={(e) => setExportFilters({ ...exportFilters, facility: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-white/70 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm backdrop-blur-sm uppercase"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Deixe vazio para exportar registros de <strong>todas</strong> as facilities.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsExportModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100/80 hover:bg-gray-200/80 rounded-lg transition-colors backdrop-blur-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={generateCSV}
                      className="px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-sm flex items-center gap-2 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}