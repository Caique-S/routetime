// app/painel/view/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Motorista } from "../../types/motorista";
import { useLiveTimer } from "@/app/hooks/useLiveTimer";
import { formatarTempo } from "../components/MotoristaCard";
import Link from "next/link";

// ─── Componente de card (mantido igual ao original, sem botões de ação) ──────────
const MotoristaCardExibicao = ({
  motorista,
  posicao,
}: {
  motorista: Motorista;
  posicao?: number;
}) => {
  // (mesmo código do original, não alterado)
  const tempoFilaAoVivo = useLiveTimer(
    motorista.status === "em_fila" ? motorista.timestampChegada : null,
  );
  const tempoDescargaAoVivo = useLiveTimer(
    motorista.status === "descarregando"
      ? motorista.timestampInicioDescarga
      : null,
  );

  const tempoFilaExibido =
    motorista.status === "em_fila"
      ? tempoFilaAoVivo
      : (motorista.tempoFila ?? 0);

  const tempoDescargaExibido =
    motorista.status === "descarregando"
      ? tempoDescargaAoVivo
      : motorista.status === "descarregado"
        ? (motorista.tempoDescarga ?? 0)
        : 0;

  const tempoTotal =
    motorista.status === "descarregado"
      ? (motorista.tempoFila ?? 0) + (motorista.tempoDescarga ?? 0)
      : null;

  const temProducao =
    motorista.gaiolas != null &&
    motorista.palets != null &&
    motorista.mangas != null;

  const cfg = {
    em_fila: {
      border: "border-amber-400",
      badge: "bg-amber-100 text-amber-800",
      label: "⏳ Aguardando",
      timerCor: "text-amber-600",
    },
    descarregando: {
      border: "border-blue-500",
      badge: "bg-blue-100 text-blue-800",
      label: "🚛 Descarregando",
      timerCor: "text-blue-600",
    },
    descarregado: {
      border: "border-green-500",
      badge: "bg-green-100 text-green-800",
      label: "✅ Finalizado",
      timerCor: "text-green-600",
    },
  }[motorista.status as "em_fila" | "descarregando" | "descarregado"] ?? {
    border: "border-gray-300",
    badge: "bg-gray-100 text-gray-600",
    label: motorista.status,
    timerCor: "text-gray-600",
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border-l-4 ${cfg.border} p-4 hover:shadow-md transition`}
    >
      {/* Cabeçalho: nome + badge de status */}
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {posicao !== undefined && (
              <span className="text-xs font-bold bg-gray-100 text-gray-500 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                #{posicao}
              </span>
            )}
            <h3 className="font-bold text-gray-900 text-base truncate">
              {motorista.nome}
            </h3>
          </div>

          {/* Destino/cidade */}
          <div className="flex flex-wrap gap-x-3 mt-1">
            {motorista.destino && (
              <span className="text-sm text-gray-700 font-medium">
                📍 {motorista.destino}
              </span>
            )}
            {motorista.retorno && (
              <span className="text-sm text-gray-500">
                ↩ {motorista.retorno}
              </span>
            )}
          </div>

          {/* Chegada e doca */}
          <div className="flex flex-wrap gap-x-3 mt-0.5">
            <span className="text-xs text-gray-400">
              Chegada: {motorista.dataChegada} {motorista.horaChegada}
            </span>
            {motorista.doca && (
              <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                Doca: {motorista.doca}
                {motorista.docaNotifiedAt && (
                  <span className="text-gray-500 font-normal text-[13px]">
                    (às{" "}
                    {new Date(motorista.docaNotifiedAt).toLocaleTimeString(
                      "pt-BR",
                      { hour: "2-digit", minute: "2-digit", second: "2-digit" },
                    )}
                    )
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        <span
          className={`px-2.5 py-1 text-xs font-semibold rounded-full shrink-0 ${cfg.badge}`}
        >
          {cfg.label}
        </span>
      </div>

      {/* Timers */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-500 mb-0.5">⏱ Tempo em fila</p>
          <p
            className={`font-mono font-bold text-xl tabular-nums ${motorista.status === "em_fila" ? cfg.timerCor : "text-gray-500"
              }`}
          >
            {formatarTempo(tempoFilaExibido)}
          </p>
        </div>

        {(motorista.status === "descarregando" ||
          motorista.status === "descarregado") && (
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs text-gray-500 mb-0.5">🚛 Descarga</p>
              <p
                className={`font-mono font-bold text-xl tabular-nums ${motorista.status === "descarregando"
                    ? cfg.timerCor
                    : "text-gray-500"
                  }`}
              >
                {formatarTempo(tempoDescargaExibido)}
              </p>
            </div>
          )}
      </div>

      {/* Tempo total */}
      {tempoTotal !== null && (
        <div className="bg-green-50 rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">🏁 Tempo total</span>
          <span className="font-mono font-bold text-green-700">
            {formatarTempo(tempoTotal)}
          </span>
        </div>
      )}

      {/* Produção */}
      {temProducao && (
        <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Gaiolas", val: motorista.gaiolas },
            { label: "Palets", val: motorista.palets },
            { label: "Mangas", val: motorista.mangas },
          ].map(({ label, val }) => (
            <div key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="font-bold text-blue-700 text-lg">{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Horários detalhados */}
      {motorista.timestampInicioDescarga && (
        <p className="text-xs text-gray-400 mb-0.5">
          Início descarga:{" "}
          {new Date(motorista.timestampInicioDescarga).toLocaleTimeString(
            "pt-BR",
          )}
        </p>
      )}
      {motorista.timestampFimDescarga && (
        <p className="text-xs text-gray-400 mb-3">
          Término:{" "}
          {new Date(motorista.timestampFimDescarga).toLocaleTimeString("pt-BR")}
        </p>
      )}

      {/* Tempo entre notificação e início */}
      {motorista.docaNotifiedAt && motorista.timestampInicioDescarga && (
        <div className="bg-yellow-50 rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            ⏱️ Tempo até início (notif → início)
          </span>
          <span className="font-mono font-bold text-yellow-700">
            {(() => {
              const diffSegundos = Math.max(
                0,
                Math.floor(
                  (new Date(motorista.timestampInicioDescarga).getTime() -
                    new Date(motorista.docaNotifiedAt).getTime()) /
                  1000,
                ),
              );
              const h = Math.floor(diffSegundos / 3600)
                .toString()
                .padStart(2, "0");
              const m = Math.floor((diffSegundos % 3600) / 60)
                .toString()
                .padStart(2, "0");
              const s = Math.floor(diffSegundos % 60)
                .toString()
                .padStart(2, "0");
              return `${h}:${m}:${s}`;
            })()}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Coluna (agora usando o card de exibição) ───────────────────────────────
const Coluna = ({
  titulo,
  motoristas,
  cor,
}: {
  titulo: string;
  motoristas: Motorista[];
  cor: string;
}) => (
  <div className="w-full sm:flex-1 sm:min-w-70 bg-gray-50 rounded-xl p-4 border border-gray-200">
    <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-gray-700">
      <span className={`w-3 h-3 rounded-full shrink-0 ${cor}`} />
      {titulo}
      <span className="ml-auto bg-white border border-gray-200 text-gray-500 text-xs font-bold rounded-full px-2 py-0.5">
        {motoristas.length}
      </span>
    </h2>
    <div className="space-y-3">
      {motoristas.map((m, i) => (
        <MotoristaCardExibicao
          key={m.id}
          motorista={m}
          posicao={m.status === "em_fila" ? i + 1 : undefined}
        />
      ))}
      {motoristas.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <p className="text-2xl mb-1">—</p>
          <p className="text-sm">Nenhum motorista</p>
        </div>
      )}
    </div>
  </div>
);

// ─── Página principal ─────────────────────────────────────────────────────
export default function PainelPage() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Estado do período
  const hoje = new Date().toISOString().split("T")[0];
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);

  const fetchMotoristas = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("tipo", "gaiolas");
        params.append("dataInicio", dataInicio);
        params.append("dataFim", dataFim);

        const url = `/api/melicage/motoristas/filadescarga?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.erro || "Erro desconhecido");

        const ordenados = [...json.data].sort((a: Motorista, b: Motorista) => {
          const ord = { em_fila: 0, descarregando: 1, descarregado: 2 };
          const d =
            (ord[a.status as keyof typeof ord] ?? 3) -
            (ord[b.status as keyof typeof ord] ?? 3);
          if (d !== 0) return d;
          return (
            new Date(a.timestampChegada ?? 0).getTime() -
            new Date(b.timestampChegada ?? 0).getTime()
          );
        });

        setMotoristas(ordenados);
        setUltimaAtualizacao(new Date());
      } catch (err: any) {
        setError(err.message);
        if (!silent) toast.error("Erro ao buscar motoristas: " + err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [dataInicio, dataFim],
  );

  useEffect(() => {
    fetchMotoristas();
  }, [fetchMotoristas]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchMotoristas(true), 10000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchMotoristas]);

  const exportarCSV = () => {
    const cabecalhos = [
      "Data",
      "Motorista",
      "Retorno",
      "Chegada",
      "Doca",
      "Motorista Notificado",
      "Inicio de Descarga",
      "Término de Descarga",
      "Tempo em Fila",
      "Tempo em Doca (Notif -> Início)",
      "Gaiolas",
      "Pallets",
      "Manga Pallets",
    ];

    const formatarHHMMSS = (segundosTotais: number) => {
      const s = Math.max(0, Math.floor(segundosTotais));
      const h = Math.floor(s / 3600)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((s % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const seg = Math.floor(s % 60)
        .toString()
        .padStart(2, "0");
      return `${h}:${m}:${seg}`;
    };

    const linhas = motoristas.map((m) => {
      const dataChegada = m.timestampChegada
        ? new Date(m.timestampChegada).toLocaleDateString("pt-BR")
        : "";

      const horaChegada = m.timestampChegada
        ? new Date(m.timestampChegada).toLocaleTimeString("pt-BR")
        : "";

      const horaNotificado = m.docaNotifiedAt
        ? new Date(m.docaNotifiedAt).toLocaleTimeString("pt-BR")
        : "";

      const horaInicio = m.timestampInicioDescarga
        ? new Date(m.timestampInicioDescarga).toLocaleTimeString("pt-BR")
        : "";

      const horaFim = m.timestampFimDescarga
        ? new Date(m.timestampFimDescarga).toLocaleTimeString("pt-BR")
        : "";

      let tempoAteInicio = "";
      if (m.docaNotifiedAt && m.timestampInicioDescarga) {
        const diffSeg =
          (new Date(m.timestampInicioDescarga).getTime() -
            new Date(m.docaNotifiedAt).getTime()) /
          1000;
        tempoAteInicio = formatarHHMMSS(diffSeg);
      }

      const tempoFilaFormatado = m.tempoFila ? formatarHHMMSS(m.tempoFila) : "";

      return [
        dataChegada,
        m.nome || "",
        m.destino || "",
        horaChegada,
        m.doca || "",
        horaNotificado,
        horaInicio,
        horaFim,
        tempoFilaFormatado,
        tempoAteInicio,
        m.gaiolas ?? "",
        m.palets ?? "",
        m.mangas ?? "",
      ];
    });

    const csvContent = [cabecalhos, ...linhas]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `relatorio_descarga_${dataInicio}_a_${dataFim}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const emFila = motoristas.filter((m) => m.status === "em_fila");
  const descarregando = motoristas.filter((m) => m.status === "descarregando");
  const finalizados = motoristas.filter((m) => m.status === "descarregado");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center gap-3 flex-wrap">
          <div>
            <div className="flex flex-row gap-8 flex-nowrap w-100">
              <Link
                href="/carregamento/operacoes"
                className="text-gray-400 hover:text-gray-600 text-sm transition"
              >
                ← Voltar
              </Link>
              <h1 className="text-lg sm:text-xl self-center font-bold text-gray-900">
                🚚 Controle de Descarga
              </h1>
            </div>
            <p className="text-xs text-gray-500">
              {motoristas.length} motorista{motoristas.length !== 1 ? "s" : ""}{" "}
              •{" "}
              {ultimaAtualizacao
                ? `Atualizado às ${ultimaAtualizacao.toLocaleTimeString("pt-BR")}`
                : "Carregando..."}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro de período */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">
                De:
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500"
              />
              <label className="text-xs text-gray-500 whitespace-nowrap">
                Até:
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={exportarCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition"
            >
              📥 Exportar CSV
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${autoRefresh
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
                }`}
            >
              {autoRefresh ? "🔄 Auto (10s)" : "⏸️ Pausado"}
            </button>
            <button
              onClick={() => fetchMotoristas()}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold disabled:opacity-50 transition"
            >
              <span className={loading ? "animate-spin inline-block" : ""}>
                ↻
              </span>{" "}
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>

        {/* Badges de resumo */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 pb-3 flex flex-wrap gap-2">
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            ⏳ {emFila.length} em fila
          </span>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            🚛 {descarregando.length} descarregando
          </span>
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
            ✅ {finalizados.length} finalizados
          </span>
          <Link
            href="/painel/inspecionar"
            className=" flex flex-row text-gray-400 hover:text-indigo-500 gap-1 transition-colors px-2 py-1"
            title="Inspecionar dados"
          > 
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            inspecionar
          </Link>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-screen-2xl mx-auto p-4 sm:p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
          <Coluna titulo="Em Fila" motoristas={emFila} cor="bg-amber-400" />
          <Coluna
            titulo="Descarregando"
            motoristas={descarregando}
            cor="bg-blue-500"
          />
          <Coluna
            titulo="Finalizados"
            motoristas={finalizados}
            cor="bg-green-500"
          />
        </div>
      </div>
    </div>
  );
}