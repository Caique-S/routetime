'use client';

import { useEffect, useState } from 'react';
import IniciarDescargaModal from './components/IniciarDescargaModal';
import MotoristaCard from './components/MotoristaCard';
import toast from 'react-hot-toast';
import Ably from 'ably';
import { Motorista } from '../types/motorista';

// Modal de finalização (igual ao original, mas adaptado para TypeScript)
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

// Componente de coluna (pode ser separado, mas incluído aqui para completude)
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

  // Função para buscar motoristas da API
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

  // Configuração do Ably para atualizações em tempo real
  useEffect(() => {
    fetchMotoristas();

    let ablyClient: Ably.Realtime | null = null;
    let filaChannel: Ably.RealtimeChannel | null = null;

    const setupAbly = async () => {
      try {
        const tokenRes = await fetch('/api/ably/token');
        const tokenRequest = await tokenRes.json();
        ablyClient = new Ably.Realtime({ authCallback: (_, cb) => cb(null, tokenRequest) });
        filaChannel = ablyClient.channels.get('fila');
        filaChannel.subscribe('atualizacao-fila', () => {
          console.log('📡 Atualização recebida via Ably');
          fetchMotoristas();
        });
      } catch (err) {
        console.error('❌ Erro ao conectar Ably:', err);
      }
    };

    setupAbly();

    return () => {
      if (filaChannel) {
        filaChannel.unsubscribe();
      }
      if (ablyClient) {
        ablyClient.close();
      }
    };
  }, []);

  // Fallback com setInterval (caso Ably falhe)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchMotoristas, 30000); // 30 segundos
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Handlers
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

  // Separação por status
  const aguardando = motoristas.filter((m) => m.status === 'aguardando');
  const descarregando = motoristas.filter((m) => m.status === 'descarregando');
  const finalizados = motoristas.filter((m) => m.status === 'descarregado');

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">🚚 Painel de Descarga</h1>
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

        {/* Mensagem de erro */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Erro: {error}
          </div>
        )}

        {/* Colunas */}
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

        {/* Modais */}
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