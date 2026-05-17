'use client';

import { useLiveTimer } from '@/app/hooks/useLiveTimer';
import { Motorista } from '../../types/motorista';

// Timezone do Brasil para todos os displays de data/hora
const TZ = 'America/Sao_Paulo';

export const formatarTempo = (segundos: number): string => {
  if (!segundos || segundos < 0) return '00:00:00';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};

// Formata hora de um ISO  string em horário de Brasília
const formatarHoraBrasil = (iso: string | Date | null | undefined): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

export default function MotoristaCard({
  motorista,
  posicao,
  onIniciar,
  onFinalizar,
}: {
  motorista: Motorista;
  posicao?: number;
  onIniciar: (motorista: Motorista) => void;
  onFinalizar: (id: string, nome: string) => void;
}) {
  // Timers ao vivo — usam diferença de ms entre agora e o timestamp,
  // portanto são corretos independente de fuso (ambos em UTC internamente)
  const tempoFilaAoVivo = useLiveTimer(
    motorista.status === 'em_fila' ? motorista.timestampChegada : null
  );
  const tempoDescargaAoVivo = useLiveTimer(
    motorista.status === 'descarregando' ? motorista.timestampInicioDescarga : null
  );

  const tempoFilaExibido =
    motorista.status === 'em_fila' ? tempoFilaAoVivo : (motorista.tempoFila ?? 0);

  const tempoDescargaExibido =
    motorista.status === 'descarregando' ? tempoDescargaAoVivo
    : motorista.status === 'descarregado' ? (motorista.tempoDescarga ?? 0)
    : 0;

  const tempoTotal =
    motorista.status === 'descarregado'
      ? (motorista.tempoFila ?? 0) + (motorista.tempoDescarga ?? 0)
      : null;

  const temProducao =
    motorista.gaiolas != null && motorista.palets != null && motorista.mangas != null;

  const cfg = {
    em_fila:      { border: 'border-amber-400', badge: 'bg-amber-100 text-amber-800',  label: '⏳ Aguardando',    timerCor: 'text-amber-600' },
    descarregando:{ border: 'border-blue-500',  badge: 'bg-blue-100 text-blue-800',    label: '🚛 Descarregando', timerCor: 'text-blue-600'  },
    descarregado: { border: 'border-green-500', badge: 'bg-green-100 text-green-800',  label: '✅ Finalizado',    timerCor: 'text-green-600' },
  }[motorista.status as 'em_fila' | 'descarregando' | 'descarregado'] ?? {
    border: 'border-gray-300', badge: 'bg-gray-100 text-gray-600', label: motorista.status, timerCor: 'text-gray-600',
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${cfg.border} p-4 hover:shadow-md transition`}>
      {/* Cabeçalho: nome + badge de status */}
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {posicao !== undefined && (
              <span className="text-xs font-bold bg-gray-100 text-gray-500 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                #{posicao}
              </span>
            )}
            <h3 className="font-bold text-gray-900 text-base truncate">{motorista.nome}</h3>
          </div>

          {/* Destino/cidade */}
          <div className="flex flex-wrap gap-x-3 mt-1">
            {motorista.destino && (
              <span className="text-sm text-gray-700 font-medium">📍 {motorista.destino}</span>
            )}
            {motorista.retorno && (
              <span className="text-sm text-gray-500">↩ {motorista.retorno}</span>
            )}
          </div>

          {/* Chegada e doca */}
          <div className="flex flex-wrap gap-x-3 mt-0.5">
            <span className="text-xs text-gray-400">
              {/* dataChegada e horaChegada já foram salvos em horário de Brasília pelo backend */}
              Chegada: {motorista.dataChegada} {motorista.horaChegada}
            </span>
            {motorista.doca && (
              <span className="text-xs font-bold text-blue-600">Doca: {motorista.doca}</span>
            )}
          </div>
        </div>

        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full shrink-0 ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* Timers */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-500 mb-0.5">⏱ Tempo em fila</p>
          <p className={`font-mono font-bold text-xl tabular-nums ${
            motorista.status === 'em_fila' ? cfg.timerCor : 'text-gray-500'
          }`}>
            {formatarTempo(tempoFilaExibido)}
          </p>
        </div>

        {(motorista.status === 'descarregando' || motorista.status === 'descarregado') && (
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-xs text-gray-500 mb-0.5">🚛 Descarga</p>
            <p className={`font-mono font-bold text-xl tabular-nums ${
              motorista.status === 'descarregando' ? cfg.timerCor : 'text-gray-500'
            }`}>
              {formatarTempo(tempoDescargaExibido)}
            </p>
          </div>
        )}
      </div>

      {/* Tempo total */}
      {tempoTotal !== null && (
        <div className="bg-green-50 rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">🏁 Tempo total</span>
          <span className="font-mono font-bold text-green-700">{formatarTempo(tempoTotal)}</span>
        </div>
      )}

      {/* Produção */}
      {temProducao && (
        <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3 grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Gaiolas', val: motorista.gaiolas },
            { label: 'Palets',  val: motorista.palets  },
            { label: 'Mangas',  val: motorista.mangas  },
          ].map(({ label, val }) => (
            <div key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="font-bold text-blue-700 text-lg">{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Horários detalhados — exibidos em horário de Brasília */}
      {motorista.timestampInicioDescarga && (
        <p className="text-xs text-gray-400 mb-0.5">
          Início descarga: {formatarHoraBrasil(motorista.timestampInicioDescarga)}
        </p>
      )}
      {motorista.timestampFimDescarga && (
        <p className="text-xs text-gray-400 mb-3">
          Término: {formatarHoraBrasil(motorista.timestampFimDescarga)}
        </p>
      )}

      {/* Ações */}
      {motorista.status === 'em_fila' && (
        <button
          onClick={() => onIniciar(motorista)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition text-sm mt-1"
        >
          🚛 Iniciar Descarga
        </button>
      )}
      {motorista.status === 'descarregando' && (
        <button
          onClick={() => onFinalizar(motorista.id, motorista.nome)}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg transition text-sm mt-1"
        >
          ✅ Finalizar Descarga
        </button>
      )}
    </div>
  );
}
