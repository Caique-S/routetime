"use client";

import { useEffect, useState, useCallback } from "react";
import IniciarDescargaModal from "./components/IniciarDescargaModal";
import MotoristaCard, { formatarTempo } from "./components/MotoristaCard";
import toast from "react-hot-toast";
import { Motorista } from "../types/motorista";

// ─── Modal de Finalização  ─────────────────────────────────────────────────────
const FinalizarModal = ({
  visible,
  motoristaId,
  motoristaNome,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  motoristaId: string | null;
  motoristaNome: string;
  onClose: () => void;
  onConfirm: (
    id: string,
    gaiolas: number,
    palets: number,
    mangas: number,
  ) => void;
}) => {
  const [gaiolas, setGaiolas] = useState("");
  const [palets, setPalets] = useState("");
  const [mangas, setMangas] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setGaiolas("");
      setPalets("");
      setMangas("");
      setError("");
    }
  }, [visible]);

  const handleConfirm = () => {
    if (!gaiolas.trim() || !palets.trim() || !mangas.trim()) {
      setError("Todos os campos são obrigatórios");
      return;
    }
    const g = Number(gaiolas),
      p = Number(palets),
      m = Number(mangas);
    if (isNaN(g) || isNaN(p) || isNaN(m) || g < 0 || p < 0 || m < 0) {
      setError("Valores devem ser números não negativos");
      return;
    }
    if (motoristaId) {
      onConfirm(motoristaId, g, p, m);
      onClose();
    }
  };

  if (!visible || !motoristaId) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-green-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Finalizar Descarga</h2>
          <p className="text-green-100 text-sm mt-0.5">{motoristaNome}</p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Informe as quantidades devolvidas:
          </p>
          {[
            { label: "Gaiolas", value: gaiolas, onChange: setGaiolas },
            { label: "Palets", value: palets, onChange: setPalets },
            { label: "Mangas", value: mangas, onChange: setMangas },
          ].map(({ label, value, onChange }) => (
            <div key={label}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {label} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                  setError("");
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-lg font-mono focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder={`Quantidade de ${label.toLowerCase()}`}
              />
            </div>
          ))}
          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
            >
              ✓ Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Coluna = ({
  titulo,
  motoristas,
  cor,
  onIniciar,
  onFinalizar,
}: {
  titulo: string;
  motoristas: Motorista[];
  cor: string;
  onIniciar: (m: Motorista) => void;
  onFinalizar: (id: string, nome: string) => void;
}) => (
  // w-full em mobile, flex-1 com min-w em desktop
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
        <MotoristaCard
          key={m.id}
          motorista={m}
          posicao={m.status === "em_fila" ? i + 1 : undefined}
          onIniciar={onIniciar}
          onFinalizar={onFinalizar}
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

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PainelPage() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dataSelecionada, setDataSelecionada] = useState(() => {
    const hoje = new Date();
    const year = hoje.getFullYear();
    const month = String(hoje.getMonth() + 1).padStart(2, "0");
    const day = String(hoje.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const [modalIniciarAberto, setModalIniciarAberto] = useState(false);
  const [motoristaParaIniciar, setMotoristaParaIniciar] =
    useState<Motorista | null>(null);
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [motoristaParaFinalizar, setMotoristaParaFinalizar] = useState<{
    id: string;
    nome: string;
  } | null>(null);

  const fetchMotoristas = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/melicage/motoristas?tipo=gaiolas&data=${dataSelecionada}`,
        );
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
    [dataSelecionada],
  );

  // Busca inicial
  useEffect(() => {
    fetchMotoristas();
  }, [fetchMotoristas]);

  // Auto-refresh a cada 10s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchMotoristas(true), 25000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchMotoristas]);

  const handleIniciarDescarga = async (id: string, doca: string) => {
    try {
      const res = await fetch(
        `/api/melicage/motoristas/${id}/iniciar-descarga`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doca }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.erro || "Erro ao iniciar descarga");
      setMotoristas((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...json.data } : m)),
      );
      toast.success(`Descarga iniciada — Doca ${doca}`);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleFinalizarDescarga = async (
    id: string,
    gaiolas: number,
    palets: number,
    mangas: number,
  ) => {
    try {
      const res = await fetch(
        `/api/melicage/motoristas/${id}/finalizar-descarga`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gaiolas, palets, mangas }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.erro || "Erro ao finalizar descarga");
      setMotoristas((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...json.data } : m)),
      );
      toast.success("Descarga finalizada!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const emFila = motoristas.filter((m) => m.status === "em_fila");
  const descarregando = motoristas.filter((m) => m.status === "descarregando");
  const finalizados = motoristas.filter((m) => m.status === "descarregado");

  const handlers = {
    onIniciar: (m: Motorista) => {
      setMotoristaParaIniciar(m);
      setModalIniciarAberto(true);
    },
    onFinalizar: (id: string, nome: string) => {
      setMotoristaParaFinalizar({ id, nome });
      setModalFinalizarAberto(true);
    },
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              🚚 Controle de Descarga
            </h1>
            <p className="text-xs text-gray-500">
              {motoristas.length} motorista{motoristas.length !== 1 ? "s" : ""}{" "}
              •{" "}
              {ultimaAtualizacao
                ? `Atualizado às ${ultimaAtualizacao.toLocaleTimeString("pt-BR")}`
                : "Carregando..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                autoRefresh
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
          <Coluna
            titulo="Em Fila"
            motoristas={emFila}
            cor="bg-amber-400"
            {...handlers}
          />
          <Coluna
            titulo="Descarregando"
            motoristas={descarregando}
            cor="bg-blue-500"
            {...handlers}
          />
          <Coluna
            titulo="Finalizados"
            motoristas={finalizados}
            cor="bg-green-500"
            {...handlers}
          />
        </div>
      </div>

      {/* Modais */}
      {modalIniciarAberto && motoristaParaIniciar && (
        <IniciarDescargaModal
          motorista={{
            id: motoristaParaIniciar.id,
            nome: motoristaParaIniciar.nome,
            doca: motoristaParaIniciar.doca ?? undefined,
          }}
          onClose={() => {
            setModalIniciarAberto(false);
            setMotoristaParaIniciar(null);
          }}
          onConfirm={handleIniciarDescarga}
        />
      )}
      <FinalizarModal
        visible={modalFinalizarAberto}
        motoristaId={motoristaParaFinalizar?.id ?? null}
        motoristaNome={motoristaParaFinalizar?.nome ?? ""}
        onClose={() => {
          setModalFinalizarAberto(false);
          setMotoristaParaFinalizar(null);
        }}
        onConfirm={handleFinalizarDescarga}
      />
    </div>
  );
}
