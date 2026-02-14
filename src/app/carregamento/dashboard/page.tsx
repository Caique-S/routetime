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
} from "lucide-react";
import Link from "next/link";
import { Dialog, Transition } from "@headlessui/react";

declare global {
  interface Window {
    Android?: {
      saveCsvFile: (content: string, fileName: string) => void;
    };
  }
}

// ------------------------------------------------------------
// 1. Interface completa de Carregamento
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
  status: "pendente" | "em_andamento" | "concluido" | "cancelado";
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
}

interface DestinoProgresso {
  nome: string;
  total: number;
  concluidos: number;
  progresso: number;
}

// ------------------------------------------------------------
// 2. Componente principal
// ------------------------------------------------------------
export default function DashboardPage() {
  const [allCarregamentos, setAllCarregamentos] = useState<Carregamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: "",
    facility: "SBA4",
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState({ data: "", facility: "SBA4" });

  const filteredCarregamentos = allCarregamentos.filter((c) =>
    filter.status ? c.status === filter.status : true
  );

  const stats = {
    total: filteredCarregamentos.length,
    pendentes: filteredCarregamentos.filter((c) => c.status === "pendente").length,
    emAndamento: filteredCarregamentos.filter((c) => c.status === "em_andamento").length,
    concluidos: filteredCarregamentos.filter((c) => c.status === "concluido").length,
  };

  const destinosProgresso: DestinoProgresso[] = (() => {
    const destinosMap = new Map<string, { total: number; concluidos: number }>();
    allCarregamentos.forEach((c) => {
      const destino = c.destino;
      if (!destinosMap.has(destino)) {
        destinosMap.set(destino, { total: 0, concluidos: 0 });
      }
      const entry = destinosMap.get(destino)!;
      entry.total += 1;
      if (c.status === "concluido") {
        entry.concluidos += 1;
      }
    });
    return Array.from(destinosMap.entries())
      .map(([nome, { total, concluidos }]) => ({
        nome,
        total,
        concluidos,
        progresso: total > 0 ? (concluidos / total) * 100 : 0,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  })();

  const fetchCarregamentos = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filter.facility) queryParams.append("facility", filter.facility);
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
  }, [filter.facility]);

  // ------------------------------------------------------------
  // 3. Função formatDateTime CORRIGIDA
  // ------------------------------------------------------------
  // FIX: Agora retorna a string original se não for uma data válida
  const formatDateTime = (isoString?: string): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString; // preserva o valor original (ex: "21:12")
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // ------------------------------------------------------------
  // 4. Geração do CSV COMPLETAMENTE CORRIGIDA
  // ------------------------------------------------------------
  const generateCSV = async () => {
    try {
      // 1. Buscar carregamentos da facility
      const queryParams = new URLSearchParams();
      queryParams.append("facility", exportFilters.facility);
      const response = await fetch(`/api/carregamento?${queryParams}`);
      const data = await response.json();

      if (!data.success) {
        alert("Erro ao carregar os dados para exportação.");
        return;
      }

      let carregamentos: Carregamento[] = data.data;

      // 2. Filtro por data CORRIGIDO (comparação direta da string ISO)
      if (exportFilters.data) {
  const start = new Date(exportFilters.data + 'T00:00:00').getTime();
  const end = start + 24 * 60 * 60 * 1000;

  carregamentos = carregamentos.filter((c) => {
    const createdAt = new Date(c.dataCriacao).getTime();
    return createdAt >= start && createdAt < end;
  });
      }

      if (carregamentos.length === 0) {
        alert("Nenhum registro encontrado para os filtros selecionados.");
        return;
      }

      // 3. Cabeçalho
      const headers = [
        "Travel ID",
        "Data",
        "Condutor",
        "Categoria",
        "Placa de Tração",
        "Placa de Carga",
        "Destino",
        "Posição de Saída",
        "ID Carregamento",
        "Doca Carregamento",
        "Encostado na Doca",
        "Início do Carregamento",
        "Término de Carregamento",
        "Saída Liberada",
        "Previsão de Chegada",
        "Lacre Traseiro",
        "Lacre Lateral 1",
        "Lacre Lateral 2",
        "Gaiolas",
        "Volumosos",
        "Manga Palets",
        "Operador",
        "Transportadora",
      ];

      // 4. Montar linhas CORRIGIDAS (horários com valor bruto)
      const rows = carregamentos.map((c) => {
        return [
          c.motorista?.travelId ?? "",
          formatDateTime(c.dataCriacao),          // ISO string -> data/hora
          c.motorista?.nome ?? "",
          c.motorista?.tipoVeiculo ?? "",
          c.motorista?.veiculoTracao ?? "",
          c.motorista?.veiculoCarga ?? "",
          c.destino ?? "",
          c.posicaoVeiculo ?? "",
          c._id ?? "",
          c.doca ?? "",
          // FIX: valores brutos, sem formatDateTime
          c.horarios?.encostadoDoca ?? "",
          c.horarios?.inicioCarregamento ?? "",
          c.horarios?.terminoCarregamento ?? "",
          c.horarios?.saidaLiberada ?? "",
          c.horarios?.previsaoChegada ?? "",
          c.lacres?.traseiro ?? "",
          c.lacres?.lateral1 ?? "",
          c.lacres?.lateral2 ?? "",
          c.carga?.gaiolas?.toString() ?? "",
          c.carga?.volumosos?.toString() ?? "",
          c.carga?.manga?.toString() ?? "",
          c.operador ?? "",
          c.motorista?.transportadora ?? "",
        ];
      });

      // 5. Gerar conteúdo CSV
      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) => {
              if (typeof cell === "string" && (cell.includes(",") || cell.includes("\n") || cell.includes('"'))) {
                return `"${cell.replace(/"/g, '""')}"`;
              }
              return cell;
            })
            .join(",")
        ),
      ].join("\n");

    // 6. Download
    const fileName = `relatorio_${exportFilters.facility}_${exportFilters.data || "todos"}.csv`;

    // Verificar se está no WebView (objeto Android existe)
    if (typeof window.Android !== 'undefined' &&  (window as any).Android?.saveCsvFile) {
      (window as any).Android.saveCsvFile(csvContent, fileName);
      setIsExportModalOpen(false);
      return;
    }

    // Fallback para navegador normal
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

  // ------------------------------------------------------------
  // 5. Renderização (IDÊNTICA AO ORIGINAL)
  // ------------------------------------------------------------
  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50">
      {/* Header com efeito glass */}
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
        {/* Cards de estatísticas - MOBILE (2 colunas com ícones) */}
        <div className="grid grid-cols-2 gap-3 mb-6 md:hidden">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-3">
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
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Em Andamento</p>
                <p className="text-xl font-bold text-blue-600">{stats.emAndamento}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-3">
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

        {/* Versão desktop (md+): layout de duas colunas com agrupamento */}
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

        {/* Filtros - apenas Status e Facility */}
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
                  <option value="pendente">Pendentes</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluídos</option>
                  <option value="cancelado">Cancelados</option>
                </select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Truck className="w-4 h-4 text-gray-500 shrink-0" />
                <select
                  value={filter.facility}
                  onChange={(e) => setFilter({ ...filter, facility: e.target.value })}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full sm:w-auto"
                >
                  <option value="SBA4">SBA04</option>
                  <option value="SBA2">SBA02</option>
                </select>
              </div>
            </div>
            <button
              onClick={fetchCarregamentos}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors self-end md:self-auto"
              title="Atualizar"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lista de Destinos com Progresso */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 overflow-hidden">
          <div className="p-5 border-b border-white/20">
            <h2 className="text-lg font-bold text-gray-900">
              Destinos · {filter.facility}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Progresso de carregamentos concluídos por destino
            </p>
          </div>
          {loading ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-3 text-sm text-gray-600">Carregando destinos...</p>
            </div>
          ) : destinosProgresso.length === 0 ? (
            <div className="p-10 text-center">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium text-sm">Nenhum destino encontrado</p>
              <p className="text-xs text-gray-500 mt-1">
                Não há carregamentos para esta facility.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {destinosProgresso.map((destino) => (
                <div key={destino.nome} className="p-5 hover:bg-white/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="font-medium text-gray-900 text-sm wrap-break-word">
                        {destino.nome}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {destino.concluidos}/{destino.total} concluídos
                    </span>
                  </div>
                  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${destino.progresso}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL DE EXPORTAÇÃO CSV (IDÊNTICO AO ORIGINAL) */}
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
                    <div>
                      <label htmlFor="export-date" className="block text-xs font-medium text-gray-600 mb-1">
                        Data dos registros
                      </label>
                      <input
                        type="date"
                        id="export-date"
                        value={exportFilters.data}
                        onChange={(e) => setExportFilters({ ...exportFilters, data: e.target.value })}
                        className="w-full px-3 py-2 bg-white/70 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm backdrop-blur-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Se não informada, todos os registros da facility serão exportados.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="export-facility" className="block text-xs font-medium text-gray-600 mb-1">
                        Facility
                      </label>
                      <select
                        id="export-facility"
                        value={exportFilters.facility}
                        onChange={(e) => setExportFilters({ ...exportFilters, facility: e.target.value })}
                        className="w-full px-3 py-2 bg-white/70 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm backdrop-blur-sm"
                      >
                        <option value="SBA2">SBA02</option>
                        <option value="SBA4">SBA04</option>
                      </select>
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