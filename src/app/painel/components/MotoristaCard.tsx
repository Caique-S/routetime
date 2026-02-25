'use client';

import { useLiveTimer } from '@/app/hooks/useLiveTimer';
import { Motorista } from '../../types/Motorista';

const formatarTempo = (segundos: number) => {
  const hrs = Math.floor(segundos / 3600);
  const mins = Math.floor((segundos % 3600) / 60);
  const secs = segundos % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function MotoristaCard({
  motorista,
  onIniciar,
  onFinalizar,
}: {
  motorista: Motorista;
  onIniciar: (motorista: Motorista) => void;
  onFinalizar: (id: string, nome: string) => void;
}) {
  const tempoFilaAoVivo = useLiveTimer(
    motorista.status === 'aguardando' ? motorista.timestampChegada : null
  );
  const tempoDescargaAoVivo = useLiveTimer(
    motorista.status === 'descarregando' ? motorista.timestampInicioDescarga : null
  );

  const tempoFilaExibido =
    motorista.status === 'aguardando'
      ? tempoFilaAoVivo
      : motorista.tempoFila;

  const tempoDescargaExibido =
    motorista.status === 'descarregando'
      ? tempoDescargaAoVivo
      : motorista.status === 'descarregado'
      ? motorista.tempoDescarga
      : 0;

  const calcularTempoTotal = (): string | null => {
    if (motorista.status !== 'descarregado' || !motorista.timestampFimDescarga) return null;
    const chegada = new Date(motorista.timestampChegada).getTime();
    const fim = new Date(motorista.timestampFimDescarga).getTime();
    const totalSeg = Math.floor((fim - chegada) / 1000);
    return formatarTempo(totalSeg);
  };

  const tempoTotal = calcularTempoTotal();
  const temProducao =
    motorista.gaiolas !== undefined &&
    motorista.palets !== undefined &&
    motorista.mangas !== undefined;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 hover:shadow-lg transition">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{motorista.nome}</h3>
          <p className="text-sm text-gray-600">
            Retorno: {motorista.retorno} • Destino: {motorista.destino} • Chegada: {motorista.dataChegada} {motorista.horaChegada}
          </p>
          {motorista.timestampInicioDescarga && (
            <p className="text-xs text-gray-500">
              Início descarga:{' '}
              {new Date(motorista.timestampInicioDescarga).toLocaleTimeString('pt-BR')}
            </p>
          )}
          {motorista.timestampFimDescarga && (
            <p className="text-xs text-gray-500">
              Término: {new Date(motorista.timestampFimDescarga).toLocaleTimeString('pt-BR')}
            </p>
          )}
          {temProducao && (
            <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
              <span className="font-medium">Devolução:</span> Gaiolas {motorista.gaiolas} | Palets{' '}
              {motorista.palets} | Mangas {motorista.mangas}
            </div>
          )}
          {tempoTotal && (
            <p className="text-xs font-semibold text-gray-700 mt-1">
              ⏱️ Tempo total: {tempoTotal}
            </p>
          )}
          {motorista.doca && (
            <p className="text-xs font-semibold text-blue-600 mt-1">Doca: {motorista.doca}</p>
          )}
        </div>
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            motorista.status === 'aguardando'
              ? 'bg-yellow-100 text-yellow-800'
              : motorista.status === 'descarregando'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-green-100 text-green-800'
          }`}
        >
          {motorista.status === 'aguardando'
            ? '⏳ Aguardando'
            : motorista.status === 'descarregando'
            ? '📦 Descarregando'
            : '✅ Finalizado'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Fila:</span>
          <span className="ml-1 font-mono">{formatarTempo(tempoFilaExibido)}</span>
        </div>
        {(motorista.status === 'descarregando' || motorista.status === 'descarregado') && (
          <div>
            <span className="text-gray-500">Descarga:</span>
            <span className="ml-1 font-mono">{formatarTempo(tempoDescargaExibido)}</span>
          </div>
        )}
      </div>

      {motorista.status === 'aguardando' && (
        <button
          onClick={() => onIniciar(motorista)}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
        >
          Iniciar Descarga
        </button>
      )}

      {motorista.status === 'descarregando' && (
        <button
          onClick={() => onFinalizar(motorista.id, motorista.nome)}
          className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition"
        >
          Finalizar Descarga
        </button>
      )}
    </div>
  );
}