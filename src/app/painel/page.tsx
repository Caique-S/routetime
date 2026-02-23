'use client';

import { useEffect, useState } from 'react';
import IniciarDescargaModal from './components/IniciarDescargaModal';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

interface Motorista {
  id: string;
  nome: string;
  retorno: string;
  status: 'aguardando' | 'descarregando' | 'descarregado';
  dataChegada: string;
  horaChegada: string;
  timestampChegada: string;
  tempoFila: number;
  tempoDescarga: number;
  timestampInicioDescarga?: string;
  timestampFimDescarga?: string;
  gaiolas?: number;
  palets?: number;
  mangas?: number;
}

// Modal de finalização (igual ao original)
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
  onConfirm: (id: string, gaiolas: number, palets: number, mangas: number) => void;
}) => {
  const [gaiolas, setGaiolas] = useState('');
  const [palets, setPalets] = useState('');
  const [mangas, setMangas] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setGaiolas('');
      setPalets('');
      setMangas('');
      setError('');
    }
  }, [visible]);

  const handleConfirm = () => {
    if (gaiolas.trim() === '' || palets.trim() === '' || mangas.trim() === '') {
      setError('Todos os campos são obrigatórios');
      return;
    }

    const g = Number(gaiolas);
    const p = Number(palets);
    const m = Number(mangas);

    if (isNaN(g) || isNaN(p) || isNaN(m) || g < 0 || p < 0 || m < 0) {
      setError('Todos os campos devem ser números válidos e não negativos');
      return;
    }

    if (motoristaId) {
      onConfirm(motoristaId, g, p, m);
      onClose();
    }
  };

  if (!visible || !motoristaId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Finalizar Descarga</h2>
        <p className="mb-4 text-gray-600">
          Motorista: <span className="font-semibold">{motoristaNome}</span>
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gaiolas <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={gaiolas}
              onChange={(e) => setGaiolas(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Quantidade de gaiolas"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Palets <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={palets}
              onChange={(e) => setPalets(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Quantidade de palets"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mangas <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={mangas}
              onChange={(e) => setMangas(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Quantidade de mangas"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Card do motorista
const MotoristaCard = ({
  motorista,
  onIniciar,
  onFinalizar,
}: {
  motorista: Motorista;
  onIniciar: (motorista: Motorista) => void;
  onFinalizar: (id: string, nome: string) => void;
}) => {
  const formatarTempo = (segundos: number) => {
    const hrs = Math.floor(segundos / 3600);
    const mins = Math.floor((segundos % 3600) / 60);
    const secs = segundos % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calcularTempoTotal = (): string | null => {
    if (motorista.status !== 'descarregado' || !motorista.timestampFimDescarga) return null;
    const chegada = new Date(motorista.timestampChegada).getTime();
    const fim = new Date(motorista.timestampFimDescarga).getTime();
    const totalSeg = Math.floor((fim - chegada) / 1000);
    return formatarTempo(totalSeg);
  };

  const tempoTotal = calcularTempoTotal();
  const temProducao = motorista.gaiolas !== undefined && motorista.palets !== undefined && motorista.mangas !== undefined;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 hover:shadow-lg transition">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{motorista.nome}</h3>
          <p className="text-sm text-gray-600">
            Retorno: {motorista.retorno} • Chegada: {motorista.dataChegada} {motorista.horaChegada}
          </p>
          {motorista.timestampInicioDescarga && (
            <p className="text-xs text-gray-500">
              Início descarga: {new Date(motorista.timestampInicioDescarga).toLocaleTimeString('pt-BR')}
            </p>
          )}
          {motorista.timestampFimDescarga && (
            <p className="text-xs text-gray-500">
              Término: {new Date(motorista.timestampFimDescarga).toLocaleTimeString('pt-BR')}
            </p>
          )}
          {temProducao && (
            <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
              <span className="font-medium">Devolução:</span>{' '}
              Gaiolas {motorista.gaiolas} | Palets {motorista.palets} | Mangas {motorista.mangas}
            </div>
          )}
          {tempoTotal && (
            <p className="text-xs font-semibold text-gray-700 mt-1">⏱️ Tempo total: {tempoTotal}</p>
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
          <span className="ml-1 font-mono">{formatarTempo(motorista.tempoFila)}</span>
        </div>
        {motorista.status !== 'aguardando' && (
          <div>
            <span className="text-gray-500">Descarga:</span>
            <span className="ml-1 font-mono">{formatarTempo(motorista.tempoDescarga)}</span>
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
};

// Coluna
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
  onIniciar: (motorista: Motorista) => void;
  onFinalizar: (id: string, nome: string) => void;
}) => (
  <div className="flex-1 min-w-75 bg-gray-50 rounded-lg p-4">
    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${cor}`}></span>
      {titulo} <span className="text-gray-500 text-sm ml-2">({motoristas.length})</span>
    </h2>
    <div className="space-y-3">
      {motoristas.map((m) => (
        <MotoristaCard key={m.id} motorista={m} onIniciar={onIniciar} onFinalizar={onFinalizar} />
      ))}
      {motoristas.length === 0 && (
        <p className="text-gray-400 text-center py-8">Nenhum motorista</p>
      )}
    </div>
  </div>
);

export default function PainelPage() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Controle dos modais
  const [modalIniciarAberto, setModalIniciarAberto] = useState(false);
  const [motoristaParaIniciar, setMotoristaParaIniciar] = useState<Motorista | null>(null);

  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [motoristaParaFinalizar, setMotoristaParaFinalizar] = useState<{ id: string; nome: string } | null>(null);

  const fetchMotoristas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/melicages/motoristas');
      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
      const json = await response.json();
      if (!json.success) throw new Error(json.erro || 'Erro desconhecido');
      setMotoristas(json.data);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao buscar motoristas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMotoristas();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchMotoristas, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleIniciarDescarga = async (id: string, doca: number) => {
    try {
      const response = await fetch(`/api/melicages/motoristas/${id}/iniciar-descarga`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doca }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.erro || 'Erro ao iniciar descarga');
      }
      setMotoristas((prev) => prev.map((m) => (m.id === id ? { ...m, ...json.data } : m)));
      toast.success('Descarga iniciada com sucesso!');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const handleFinalizarDescarga = async (id: string, gaiolas: number, palets: number, mangas: number) => {
    try {
      const response = await fetch(`/api/melicages/motoristas/${id}/finalizar-descarga`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gaiolas, palets, mangas }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.erro || 'Erro ao finalizar descarga');
      }
      setMotoristas((prev) => prev.map((m) => (m.id === id ? { ...m, ...json.data } : m)));
      toast.success('Descarga finalizada com sucesso!');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const aguardando = motoristas.filter((m) => m.status === 'aguardando');
  const descarregando = motoristas.filter((m) => m.status === 'descarregando');
  const finalizados = motoristas.filter((m) => m.status === 'descarregado');

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">🚚 Gaiolas</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded ${
                autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'
              }`}
            >
              {autoRefresh ? '🔄 Auto-Atualizar' : '⏸️ Auto-Atualizar Desligado'}
            </button>
            <button
              onClick={fetchMotoristas}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Atualizando...' : '↻ Atualizar Agora'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Erro: {error}
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <Coluna
            titulo="Aguardando"
            motoristas={aguardando}
            cor="bg-yellow-500"
            onIniciar={(motorista) => {
              setMotoristaParaIniciar(motorista);
              setModalIniciarAberto(true);
            }}
            onFinalizar={(id, nome) => {
              setMotoristaParaFinalizar({ id, nome });
              setModalFinalizarAberto(true);
            }}
          />
          <Coluna
            titulo="Descarregando"
            motoristas={descarregando}
            cor="bg-blue-500"
            onIniciar={(motorista) => {
              setMotoristaParaIniciar(motorista);
              setModalIniciarAberto(true);
            }}
            onFinalizar={(id, nome) => {
              setMotoristaParaFinalizar({ id, nome });
              setModalFinalizarAberto(true);
            }}
          />
          <Coluna
            titulo="Finalizados"
            motoristas={finalizados}
            cor="bg-green-500"
            onIniciar={(motorista) => {
              setMotoristaParaIniciar(motorista);
              setModalIniciarAberto(true);
            }}
            onFinalizar={(id, nome) => {
              setMotoristaParaFinalizar({ id, nome });
              setModalFinalizarAberto(true);
            }}
          />
        </div>

        {/* Modal de Iniciar Descarga */}
        {modalIniciarAberto && motoristaParaIniciar && (
          <IniciarDescargaModal
            motorista={{ id: motoristaParaIniciar.id, nome: motoristaParaIniciar.nome }}
            onClose={() => {
              setModalIniciarAberto(false);
              setMotoristaParaIniciar(null);
            }}
            onConfirm={handleIniciarDescarga}
          />
        )}

        {/* Modal de Finalizar Descarga */}
        <FinalizarModal
          visible={modalFinalizarAberto}
          motoristaId={motoristaParaFinalizar?.id || null}
          motoristaNome={motoristaParaFinalizar?.nome || ''}
          onClose={() => {
            setModalFinalizarAberto(false);
            setMotoristaParaFinalizar(null);
          }}
          onConfirm={handleFinalizarDescarga}
        />
      </div>
    </div>
  );
}