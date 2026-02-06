'use client';

import { useState } from 'react';
import { QrCode, LogIn } from 'lucide-react';
import OperatorModal from './components/OperatorModal';
import  QRScanner  from './components/QrScanner';

interface OperadorData {
  id: string;
  operador: {
    nome: string;
    cargo: string;
    dataDeCadastro: string;
  };
  registro: {};
}

export default function ExpedicaoPage() {
  const [operadorId, setOperadorId] = useState('');
  const [operadorData, setOperadorData] = useState<OperadorData | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buscarOperador = async (id: string) => {
    if (!id.trim()) {
      setError('Por favor, digite o código do operador');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/expedicao/api/operador?id=${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar operador');
      }

      setOperadorData(data);
      setShowModal(true);
      setOperadorId('');
    } catch (err: any) {
      setError(err.message || 'Operador não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (result: string) => {
    setOperadorId(result);
    buscarOperador(result);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    buscarOperador(operadorId);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          {/* Cabeçalho */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-800 tracking-tight">
              Expedição
            </h1>
            <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
          </div>

          {/* Card do formulário */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 animate-fade-in">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Digite o código do operador
              </label>
              <p className="text-sm text-gray-500">
                O código é o ObjectId gerado automaticamente pelo MongoDB
              </p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  value={operadorId}
                  onChange={(e) => {
                    setOperadorId(e.target.value);
                    setError('');
                  }}
                  placeholder="Ex: 507f1f77bcf86cd799439011"
                  className="w-full px-4 py-3 pl-4 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 placeholder-gray-400"
                />
                
                {/* Botão do QR Code */}
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Escanear QR Code"
                >
                  <QrCode className="w-5 h-5 text-blue-600" />
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg animate-shake">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Validando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    <span>Entrar</span>
                  </>
                )}
              </button>
            </form>

            {/* Informações de ajuda */}
            <div className="pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 text-center">
                Se você não possui um código, entre em contato com o administrador do sistema.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal do Scanner QR Code */}
      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Modal de boas-vindas */}
      <OperatorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        operador={operadorData?.operador || null}
      />

      {/* Estilos de animação */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up-delayed {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          50% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }

        .animate-slide-up-delayed {
          animation: slide-up-delayed 0.8s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-progress {
          animation: progress 2s linear;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </>
  );
}