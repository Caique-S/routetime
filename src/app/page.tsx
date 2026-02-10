'use client'

import { useState, useEffect } from "react";
import { QrCode, LogIn, Truck, Scan } from "lucide-react";
import OperatorModal from "./components/OperatorModal";
import QRScanner from "../app/components/QrScanner";
import { useRouter } from "next/navigation";

interface OperadorData {
  id: string;
  operador: {
    nome: string;
    cargo: string;
    dataDeCadastro: string;
  };
  registro: {};
}

export default function Home() {
  const router = useRouter();
  const [operadorId, setOperadorId] = useState("");
  const [operadorData, setOperadorData] = useState<OperadorData | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const operadorNome = localStorage.getItem("operador_nome");
    const operadorCargo = localStorage.getItem("operador_cargo");

    if (operadorNome && operadorCargo) {
      router.push("/dispatch");
    }
    setIsAnimating(true);
  }, [router]);

  // Animação de entrada
  // useEffect(() => {
  // setIsAnimating(true);
  // }, []);

  const buscarOperador = async (id: string) => {
    if (!id.trim()) {
      setError("Por favor, digite o código do operador");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/operador?id=${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar operador");
      }

      setOperadorData(data);

      if (data.operador) {
        localStorage.setItem("operador_nome", data.operador.nome);
        localStorage.setItem("operador_cargo", data.operador.cargo);
        localStorage.setItem("operador_data", JSON.stringify(data.operador));
      }

      setShowModal(true);
      setOperadorId("");
    } catch (err: any) {
      setError(err.message || "Operador não encontrado");
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
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div
        className={`max-w-md w-full space-y-8 z-10 transition-all duration-700 ${isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-lg transform rotate-6 opacity-20"></div>
              <div className="relative bg-blue-600 p-3 rounded-lg shadow-lg">
                <Truck className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Expedição
            </h1>
          </div>
          <p className="text-gray-600 text-sm">
            Sistema de Controle de Operações
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 space-y-6 border border-gray-200/50">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Código do Operador
            </label>
            <p className="text-xs text-gray-500">
              Digite o código único ou escaneie o QR Code
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <input
                type="text"
                value={operadorId}
                onChange={(e) => {
                  setOperadorId(e.target.value);
                  setError("");
                }}
                placeholder="Ex: 507f1f77bcf86cd799439011"
                className="w-full px-4 py-3 pl-4 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-900 placeholder-gray-400 bg-white/50 backdrop-blur-sm group-hover:border-blue-400"
              />

              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 hover:bg-blue-50 rounded-lg transition-colors group/scan"
                title="Escanear QR Code"
              >
                <Scan className="w-5 h-5 text-blue-600 group-hover/scan:scale-110 transition-transform" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl animate-shake">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group shadow-lg hover:shadow-xl disabled:shadow"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span>Acessar Sistema</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">Sistema Online</span>
              </div>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-500">
                v1.0 • {new Date().getFullYear()}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Help */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Precisa de ajuda?{" "}
            <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
              Contate o administrador
            </button>
          </p>
        </div>
      </div>

      {/* Scanner */}
      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Welcome Modal */}
      <OperatorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        operador={operadorData?.operador || null}
      />

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-5px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(5px);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
