'use client';

// app/painel/fila-destino/page.tsx
//
// Painel de Filas por Destino
//
// Exibe, para cada destino presente no último upload CSV, a fila ordenada de
// motoristas. A posição de cada um é calculada pelo horário de prontidão:
//   - Veículo vazio   → horário de chegada
//   - Pós-descarga    → horário de término de descarga
//
// Atualização automática a cada 30 segundos.

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface MotoristaFila {
  posicao: number | null;
  nome: string;
  status: string;
  statusTexto: string;
  readinessHora: string | null;
  timestampChegada: string | null;
  timestampFimDescarga: string | null;
  pronto: boolean;
  id: string | null;
}

interface FilaDestino {
  codigo: string;
  nome: string;
  totalProntos: number;
  totalPendentes: number;
  total: number;
  motoristas: MotoristaFila[];
}

interface ApiResponse {
  success: boolean;
  uploadDate: string | null;
  totalDestinos: number;
  data: FilaDestino[];
  message?: string;
  error?: string;
}

// ─── Helpers visuais ─────────────────────────────────────────────────────────

const INTERVALO_REFRESH_MS = 30_000; // 30 segundos

function formatarDataHora(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatarHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// Badge de status com cor semântica
function StatusBadge({ status, texto }: { status: string; texto: string }) {
  const cfg: Record<string, string> = {
    aguardando_carregamento: 'bg-green-100 text-green-800 border-green-200',
    descarregado: 'bg-blue-100 text-blue-800 border-blue-200',
    descarregando: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    em_fila: 'bg-orange-100 text-orange-800 border-orange-200',
    a_caminho: 'bg-purple-100 text-purple-800 border-purple-200',
    nao_chegou: 'bg-gray-100 text-gray-500 border-gray-200',
  };

  const cls = cfg[status] ?? 'bg-gray-100 text-gray-500 border-gray-200';

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls} whitespace-nowrap`}>
      {texto}
    </span>
  );
}

// Linha de um motorista dentro do card de destino
function LinhaMotorista({ motorista }: { motorista: MotoristaFila }) {
  const isPronto = motorista.pronto;
  const isVazio = motorista.status === 'aguardando_carregamento';

  // Determina o tooltip da hora de prontidão
  const tooltipHora = isVazio
    ? `Chegada: ${formatarHora(motorista.timestampChegada)}`
    : `Fim descarga: ${formatarHora(motorista.timestampFimDescarga)}`;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        isPronto
          ? 'bg-white hover:bg-gray-50 border border-gray-100'
          : 'bg-gray-50 border border-dashed border-gray-200 opacity-70'
      }`}
    >
      {/* Posição */}
      <div className="shrink-0 w-8 h-8 flex items-center justify-center">
        {isPronto ? (
          <span className="text-sm font-bold text-gray-700 bg-gray-100 rounded-full w-7 h-7 flex items-center justify-center">
            {motorista.posicao}
          </span>
        ) : (
          <span className="text-gray-300 text-lg">–</span>
        )}
      </div>

      {/* Nome */}
      <span
        className={`text-sm flex-1 truncate font-medium ${
          isPronto ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        {motorista.nome}
      </span>

      {/* Horário de prontidão */}
      {isPronto && motorista.readinessHora && (
        <span
          className="text-xs text-gray-400 shrink-0 tabular-nums"
          title={tooltipHora}
        >
          {motorista.readinessHora}
        </span>
      )}

      {/* Badge de status */}
      <StatusBadge status={motorista.status} texto={motorista.statusTexto} />
    </div>
  );
}

// Card de um destino
function CardDestino({ destino }: { destino: FilaDestino }) {
  const [expandido, setExpandido] = useState(true);

  const temProntos = destino.totalProntos > 0;
  const temPendentes = destino.totalPendentes > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      {/* Cabeçalho do destino */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-900">{destino.nome}</span>
          <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
            {destino.codigo}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Contadores */}
          {temProntos && (
            <span className="text-xs font-bold bg-green-100 text-green-700 rounded-full px-2.5 py-1">
              ✓ {destino.totalProntos} pronto{destino.totalProntos !== 1 ? 's' : ''}
            </span>
          )}
          {temPendentes && (
            <span className="text-xs font-bold bg-orange-100 text-orange-600 rounded-full px-2.5 py-1">
              ⏳ {destino.totalPendentes}
            </span>
          )}
          <span className="text-gray-400 text-sm ml-1">{expandido ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Lista de motoristas */}
      {expandido && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {/* Separador visual entre prontos e pendentes */}
          {destino.motoristas.map((m, i) => {
            const anteriorEraPronto = i > 0 && destino.motoristas[i - 1].pronto;
            const esteEhPendente = !m.pronto;
            const mostraSeparador = esteEhPendente && anteriorEraPronto && destino.totalProntos > 0;

            return (
              <div key={`${m.nome}-${i}`}>
                {mostraSeparador && (
                  <div className="flex items-center gap-2 my-1">
                    <div className="flex-1 border-t border-dashed border-gray-200" />
                    <span className="text-xs text-gray-400">Ainda não prontos</span>
                    <div className="flex-1 border-t border-dashed border-gray-200" />
                  </div>
                )}
                <LinhaMotorista motorista={m} />
              </div>
            );
          })}

          {destino.motoristas.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              Nenhum motorista atribuído a este destino.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FilaDestinoPainelPage() {
  const [dados, setDados] = useState<FilaDestino[]>([]);
  const [uploadDate, setUploadDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [contadorRefresh, setContadorRefresh] = useState(INTERVALO_REFRESH_MS / 1000);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const timerRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerContadorRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buscarDados = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setErro(null);

    try {
      const res = await fetch('/api/melicages/fila-destino', { cache: 'no-store' });
      const json: ApiResponse = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? json.message ?? `Erro HTTP ${res.status}`);
      }

      setDados(json.data ?? []);
      setUploadDate(json.uploadDate ?? null);
      setUltimaAtualizacao(new Date());
      setContadorRefresh(INTERVALO_REFRESH_MS / 1000);
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao carregar dados');
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, []);

  // Busca inicial
  useEffect(() => {
    buscarDados();
  }, [buscarDados]);

  // Auto-refresh
  useEffect(() => {
    if (timerRefreshRef.current) clearInterval(timerRefreshRef.current);
    if (timerContadorRef.current) clearInterval(timerContadorRef.current);

    if (!autoRefresh) return;

    timerRefreshRef.current = setInterval(() => {
      buscarDados(true);
    }, INTERVALO_REFRESH_MS);

    timerContadorRef.current = setInterval(() => {
      setContadorRefresh((prev) => (prev <= 1 ? INTERVALO_REFRESH_MS / 1000 : prev - 1));
    }, 1000);

    return () => {
      if (timerRefreshRef.current) clearInterval(timerRefreshRef.current);
      if (timerContadorRef.current) clearInterval(timerContadorRef.current);
    };
  }, [autoRefresh, buscarDados]);

  // ── Resumo agregado ──────────────────────────────────────────────────────
  const totalProntos = dados.reduce((s, d) => s + d.totalProntos, 0);
  const totalPendentes = dados.reduce((s, d) => s + d.totalPendentes, 0);
  const totalMotoristas = dados.reduce((s, d) => s + d.total, 0);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior fixa */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Título e metadados */}
            <div>
              <div className="flex items-center gap-3">
                <Link href="/painel" className="text-gray-400 hover:text-gray-600 text-sm transition">
                  ← Painel
                </Link>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  🗺️ Filas por Destino
                </h1>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {uploadDate
                  ? `Escala carregada em ${formatarDataHora(uploadDate)}`
                  : 'Nenhum upload encontrado'}
                {ultimaAtualizacao && (
                  <> &middot; Atualizado às {ultimaAtualizacao.toLocaleTimeString('pt-BR')}</>
                )}
              </p>
            </div>

            {/* Controles */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Badges resumo */}
              <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                ✓ {totalProntos} prontos
              </span>
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                ⏳ {totalPendentes} pendentes
              </span>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {totalMotoristas} total
              </span>

              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  autoRefresh
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {autoRefresh ? `🔄 ${contadorRefresh}s` : '⏸️ Pausado'}
              </button>

              {/* Atualizar manualmente */}
              <button
                onClick={() => buscarDados()}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition"
              >
                <span className={loading ? 'animate-spin inline-block' : ''}>↻</span>{' '}
                {loading ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-screen-2xl mx-auto p-4 sm:p-6">
        {/* Estado de carregamento inicial */}
        {loading && dados.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">↻</div>
              <p className="text-gray-500">Calculando filas por destino...</p>
            </div>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
            ⚠️ {erro}
          </div>
        )}

        {/* Sem upload */}
        {!loading && !erro && dados.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-4xl mb-4">📂</p>
            <p className="text-lg font-semibold text-gray-700 mb-2">
              Nenhuma escala carregada
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Faça o upload de um arquivo CSV com a escala do dia para visualizar as filas.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition"
            >
              ↑ Fazer Upload
            </Link>
          </div>
        )}

        {/* Legenda */}
        {dados.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-5 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400" />
              Pronto (vazio)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400" />
              Pronto (descarregado)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400" />
              Descarregando
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400" />
              Aguardando descarga
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" />
              Não chegou
            </span>
            <span className="ml-auto text-gray-400">
              A hora exibida ao lado de cada motorista é o horário de prontidão (chegada ou fim de descarga).
            </span>
          </div>
        )}

        {/*
          Grid responsivo de destinos:
          - Mobile:  1 coluna
          - Tablet:  2 colunas
          - Desktop: 3 colunas (ou 4 se houver muitos destinos)
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dados.map((destino) => (
            <CardDestino key={destino.codigo} destino={destino} />
          ))}
        </div>
      </div>
    </div>
  );
}