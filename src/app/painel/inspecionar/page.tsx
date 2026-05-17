"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  TrendingUp,
  Clock,
  MapPin,
  BarChart2,
  X,
  Table,
} from "lucide-react";

// Tipos (simplificado)
interface Motorista {
  mangas: String;
  palets: string;
  gaiolas: string;
  id: string;
  nome: string;
  destino?: string;
  retorno?: string;
  timestampChegada: string;
  status: string;
  tempoFila?: number;
  tempoDescarga?: number;
  doca?: string;
  docaNotifiedAt?: string;
  timestampInicioDescarga?: string;
  timestampFimDescarga?: string;
}

// Função para formatar segundos em HH:MM:SS
const formatarSegundos = (segundos: number) => {
  const h = Math.floor(segundos / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((segundos % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(segundos % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
};

// Extrai hora do dia (0-23) a partir de uma data ISO
const getHora = (isoString: string) => {
  const date = new Date(isoString);
  return date.getHours();
};

export default function InspecionarPage() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoje = new Date().toISOString().split("T")[0];
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);

  // Detalhes de clique
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [detalheTipo, setDetalheTipo] = useState<"motorista" | "cidade" | null>(null);
  const [detalheValor, setDetalheValor] = useState<string>("");
  const [detalheDados, setDetalheDados] = useState<Motorista[]>([]);

  const fetchMotoristas = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("tipo", "gaiolas");
      params.append("dataInicio", dataInicio);
      params.append("dataFim", dataFim);

      const res = await fetch(`/api/melicage/motoristas/filadescarga?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.erro || "Erro desconhecido");
      setMotoristas(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMotoristas();
  }, [dataInicio, dataFim]);

  // Handlers de detalhe
  const abrirDetalheMotorista = (nomeMotorista: string) => {
    const dados = motoristas.filter((m) => m.nome === nomeMotorista);
    setDetalheTipo("motorista");
    setDetalheValor(nomeMotorista);
    setDetalheDados(dados);
    setDetalheAberto(true);
  };

  const abrirDetalheCidade = (cidade: string) => {
    const dados = motoristas.filter(
      (m) => (m.destino || m.retorno || "Não informado") === cidade
    );
    setDetalheTipo("cidade");
    setDetalheValor(cidade);
    setDetalheDados(dados);
    setDetalheAberto(true);
  };

  const fecharDetalhe = () => {
    setDetalheAberto(false);
    setDetalheTipo(null);
    setDetalheValor("");
    setDetalheDados([]);
  };

  // ─── Análises ──────────────────────────────────────────────

  // 1. Ranking de chegada antecipada (top 10 motoristas que chegaram mais cedo)
  const rankingCedo = useMemo(() => {
    return [...motoristas]
      .map((m) => ({
        nome: m.nome,
        retorno: m.destino || m.retorno || "N/I",
        hora: getHora(m.timestampChegada),
        timestamp: m.timestampChegada,
      }))
      .sort(
        (a, b) =>
          a.hora - b.hora ||
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      .slice(0, 10);
  }, [motoristas]);

  // 2. Horário médio de chegada por cidade
  const mediaPorCidade = useMemo(() => {
    const map = new Map<string, { soma: number; count: number }>();
    motoristas.forEach((m) => {
      const cidade = m.destino || m.retorno || "Não informado";
      const hora = getHora(m.timestampChegada);
      if (!map.has(cidade)) map.set(cidade, { soma: 0, count: 0 });
      const entry = map.get(cidade)!;
      entry.soma += hora;
      entry.count++;
    });
    return Array.from(map.entries())
      .map(([cidade, { soma, count }]) => ({
        cidade,
        media: soma / count,
        total: count,
      }))
      .sort((a, b) => a.media - b.media);
  }, [motoristas]);

  // 3. Distribuição horária (mapa de calor) – sem clique
  const distribuicaoHoraria = useMemo(() => {
    const horas = Array(24).fill(0);
    motoristas.forEach((m) => {
      const h = getHora(m.timestampChegada);
      horas[h]++;
    });
    const max = Math.max(...horas);
    return horas.map((qtd, hora) => ({
      hora,
      qtd,
      percent: max > 0 ? qtd / max : 0,
    }));
  }, [motoristas]);

  // 4. Tempo médio de fila e descarga por cidade
  const tempoMedioPorCidade = useMemo(() => {
    const map = new Map<
      string,
      { fila: number[]; descarga: number[]; count: number }
    >();
    motoristas.forEach((m) => {
      const cidade = m.destino || m.retorno || "Não informado";
      if (!map.has(cidade))
        map.set(cidade, { fila: [], descarga: [], count: 0 });
      const entry = map.get(cidade)!;
      if (m.tempoFila != null) entry.fila.push(m.tempoFila);
      if (m.tempoDescarga != null) entry.descarga.push(m.tempoDescarga);
      entry.count++;
    });
    return Array.from(map.entries())
      .map(([cidade, dados]) => {
        const mediaFila =
          dados.fila.length > 0
            ? dados.fila.reduce((a, b) => a + b, 0) / dados.fila.length
            : null;
        const mediaDescarga =
          dados.descarga.length > 0
            ? dados.descarga.reduce((a, b) => a + b, 0) / dados.descarga.length
            : null;
        return { cidade, mediaFila, mediaDescarga, total: dados.count };
      })
      .sort(
        (a, b) => (a.mediaFila ?? Number.MAX_VALUE) - (b.mediaFila ?? Number.MAX_VALUE)
      );
  }, [motoristas]);

  // ─── Renderizações auxiliares para detalhes ─────────────────

  const tabelaDetalhes = detalheAberto && detalheDados.length > 0 && (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Table className="w-5 h-5 text-indigo-600" />
          {detalheTipo === "motorista"
            ? `Registros de ${detalheValor}`
            : `Registros da cidade "${detalheValor}"`}
          <span className="text-xs text-gray-500 font-normal">
            ({detalheDados.length} ocorrência{detalheDados.length !== 1 ? "s" : ""})
          </span>
        </h3>
        <button
          onClick={fecharDetalhe}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
              <th className="pb-2 pr-3">Data</th>
              <th className="pb-2 pr-3">Motorista</th>
              <th className="pb-2 pr-3">Retorno</th>
              <th className="pb-2 pr-3">Chegada</th>
              <th className="pb-2 pr-3">Doca</th>
              <th className="pb-2 pr-3">Notificado</th>
              <th className="pb-2 pr-3">Início Descarga</th>
              <th className="pb-2 pr-3">Término Descarga</th>
              <th className="pb-2 pr-3">Fila</th>
              <th className="pb-2 pr-3">Notif→Início</th>
              <th className="pb-2 pr-3">Gaiolas</th>
              <th className="pb-2 pr-3">Pallets</th>
              <th className="pb-2 pr-3">Manga</th>
            </tr>
          </thead>
          <tbody>
            {detalheDados.map((m) => {
              const dataChegada = m.timestampChegada
                ? new Date(m.timestampChegada).toLocaleDateString("pt-BR")
                : "";
              const horaChegada = m.timestampChegada
                ? new Date(m.timestampChegada).toLocaleTimeString("pt-BR")
                : "";
              const notificado = m.docaNotifiedAt
                ? new Date(m.docaNotifiedAt).toLocaleTimeString("pt-BR")
                : "";
              const inicio = m.timestampInicioDescarga
                ? new Date(m.timestampInicioDescarga).toLocaleTimeString("pt-BR")
                : "";
              const fim = m.timestampFimDescarga
                ? new Date(m.timestampFimDescarga).toLocaleTimeString("pt-BR")
                : "";
              const tempoAteInicio =
                m.docaNotifiedAt && m.timestampInicioDescarga
                  ? formatarSegundos(
                      Math.max(
                        0,
                        (new Date(m.timestampInicioDescarga).getTime() -
                          new Date(m.docaNotifiedAt).getTime()) /
                          1000
                      )
                    )
                  : "";
              const tempoFila = m.tempoFila
                ? formatarSegundos(m.tempoFila)
                : "";

              return (
                <tr
                  key={m.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-1.5 pr-3">{dataChegada}</td>
                  <td className="py-1.5 pr-3 font-medium">{m.nome}</td>
                  <td className="py-1.5 pr-3">{m.destino || m.retorno || ""}</td>
                  <td className="py-1.5 pr-3">{horaChegada}</td>
                  <td className="py-1.5 pr-3">{m.doca || ""}</td>
                  <td className="py-1.5 pr-3">{notificado}</td>
                  <td className="py-1.5 pr-3">{inicio}</td>
                  <td className="py-1.5 pr-3">{fim}</td>
                  <td className="py-1.5 pr-3">{tempoFila}</td>
                  <td className="py-1.5 pr-3">{tempoAteInicio}</td>
                  <td className="py-1.5 pr-3">{m.gaiolas ?? ""}</td>
                  <td className="py-1.5 pr-3">{m.palets ?? ""}</td>
                  <td className="py-1.5 pr-3">{m.mangas ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <Link
              href="/painel/view"
              className="text-gray-400 hover:text-gray-600 text-sm transition flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600" />
              Inspeção de Dados
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-gray-500">De:</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-indigo-500 focus:border-indigo-500"
            />
            <label className="text-xs text-gray-500">Até:</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={fetchMotoristas}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition"
            >
              {loading ? "Carregando..." : "Analisar"}
            </button>
          </div>
        </div>
        {error && (
          <div className="max-w-screen-2xl mx-auto px-4 pb-3">
            <p className="text-red-600 text-xs">⚠️ {error}</p>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <main className="max-w-screen-2xl mx-auto p-4 sm:p-6 space-y-6">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Analisando dados...</p>
          </div>
        )}

        {!loading && motoristas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhum dado encontrado no período.
          </div>
        )}

        {!loading && motoristas.length > 0 && (
          <>
            {/* Cards resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500">Total de registros</p>
                <p className="text-2xl font-bold text-gray-900">
                  {motoristas.length}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500">Cidades únicas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(motoristas.map((m) => m.destino || m.retorno)).size}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500">Tempo médio de fila (geral)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(() => {
                    const tempos = motoristas
                      .filter((m) => m.tempoFila != null)
                      .map((m) => m.tempoFila!);
                    if (tempos.length === 0) return "N/A";
                    const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
                    return formatarSegundos(media);
                  })()}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500">Tempo médio de descarga (geral)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(() => {
                    const tempos = motoristas
                      .filter((m) => m.tempoDescarga != null)
                      .map((m) => m.tempoDescarga!);
                    if (tempos.length === 0) return "N/A";
                    const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
                    return formatarSegundos(media);
                  })()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Ranking de chegada mais cedo */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                  Top 10 mais cedo
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase">
                        <th className="pb-2">#</th>
                        <th className="pb-2">Motorista</th>
                        <th className="pb-2">Cidade</th>
                        <th className="pb-2 text-right">Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingCedo.map((m, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="py-1.5 text-gray-400">{i + 1}</td>
                          <td className="py-1.5">
                            <button
                              onClick={() => abrirDetalheMotorista(m.nome)}
                              className="font-medium text-gray-800 hover:text-indigo-600 hover:underline cursor-pointer"
                            >
                              {m.nome}
                            </button>
                          </td>
                          <td className="py-1.5 text-gray-600">{m.retorno}</td>
                          <td className="py-1.5 text-right tabular-nums">{m.hora}:00</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Clique no nome do motorista para ver todos os registros dele no período.
                </p>
              </div>

              {/* Média de chegada por cidade */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Horário médio de chegada por cidade
                </h2>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {mediaPorCidade.map((item) => (
                    <div
                      key={item.cidade}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors"
                      onClick={() => abrirDetalheCidade(item.cidade)}
                      title="Clique para ver registros desta cidade"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {item.cidade}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.total} motorista(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-gray-900">
                          {Math.floor(item.media)}:
                          {Math.round((item.media % 1) * 60)
                            .toString()
                            .padStart(2, "0")}
                        </p>
                        <p className="text-xs text-gray-500">média</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Clique em uma cidade para ver os registros detalhados.
                </p>
              </div>

              {/* Mapa de calor - sem clique */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-red-500" />
                  Distribuição de chegadas por hora
                </h2>
                <div className="grid grid-cols-24 gap-0.5">
                  {distribuicaoHoraria.map((h) => (
                    <div key={h.hora} className="flex flex-col items-center">
                      <div className="text-xs text-gray-400 mb-1">{h.hora}</div>
                      <div
                        className="w-6 rounded-sm"
                        style={{
                          height: `${h.percent * 80}px`,
                          minHeight: "4px",
                          backgroundColor: `hsl(${Math.round(
                            (1 - h.percent) * 240
                          )}, 70%, 60%)`,
                        }}
                        title={`${h.qtd} chegada(s) às ${h.hora}:00`}
                      ></div>
                      <div className="text-xs font-mono mt-1">{h.qtd}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>0h</span>
                  <span>6h</span>
                  <span>12h</span>
                  <span>18h</span>
                  <span>23h</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * Azul = baixa, Vermelho = alta concentração
                </p>
              </div>

              {/* Tempo médio de fila/descarga por cidade */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  Tempos médios por cidade
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase">
                        <th className="pb-2">Cidade</th>
                        <th className="pb-2 text-right">Fila (média)</th>
                        <th className="pb-2 text-right">Descarga (média)</th>
                        <th className="pb-2 text-right">Qtd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tempoMedioPorCidade.map((item) => (
                        <tr
                          key={item.cidade}
                          className="border-t border-gray-100 hover:bg-indigo-50 cursor-pointer transition-colors"
                          onClick={() => abrirDetalheCidade(item.cidade)}
                          title="Clique para ver registros desta cidade"
                        >
                          <td className="py-1.5 font-medium text-gray-800">
                            {item.cidade}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">
                            {item.mediaFila != null
                              ? formatarSegundos(item.mediaFila)
                              : "—"}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">
                            {item.mediaDescarga != null
                              ? formatarSegundos(item.mediaDescarga)
                              : "—"}
                          </td>
                          <td className="py-1.5 text-right text-gray-500">
                            {item.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Clique em uma cidade para ver os registros detalhados.
                </p>
              </div>
            </div>

            {/* Painel de detalhes */}
            {tabelaDetalhes}

            {/* Rodapé */}
            <p className="text-xs text-gray-400 text-center">
              Análise baseada em {motoristas.length} registros de {dataInicio} a{" "}
              {dataFim}.
            </p>
          </>
        )}
      </main>
    </div>
  );
}