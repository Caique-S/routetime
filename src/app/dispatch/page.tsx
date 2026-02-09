"use client";

import { useState, useEffect } from "react";
import {
  Truck,
  ChartBarBig,
  Upload,
  Package,
  LogOut,
  User,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OperadorData {
  nome: string;
  cargo: string;
  dataDeCadastro: string;
}

export default function Home() {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);
  const [operadorNome, setOperadorNome] = useState("Operador");
  const [operadorCargo, setOperadorCargo] = useState("");
  const [operadorData, setOperadorData] = useState<OperadorData | null>(null);
  const [activeCard, setActiveCard] = useState<number | null>(null);

  useEffect(() => {
    setIsAnimating(true);
    // Buscar nome do operador logado do localStorage
    const operadorNomeStorage = localStorage.getItem("operador_nome");
    const operadorCargoStorage = localStorage.getItem("operador_cargo");
    const operadorDataStorage = localStorage.getItem("operador_data");

    if (operadorNomeStorage) {
      setOperadorNome(operadorNomeStorage);
    }

    if (operadorCargoStorage) {
      setOperadorCargo(operadorCargoStorage);
    }

    if (operadorDataStorage) {
      try {
        console.log("OperadorDataStorage sem o Parse: " + operadorDataStorage);
        const parsedData = JSON.parse(operadorDataStorage);
        console.log("Data depois do Parse: " + parsedData);
        setOperadorData(parsedData);

        if (!operadorNomeStorage && parsedData.nome) {
          setOperadorNome(parsedData.nome);
        }
      } catch (e) {
        console.log("Erro ao Parsear dados do Operador", e);
      }
    }

    if (!operadorNomeStorage) {
      router.push("/");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("operador_nome");
    localStorage.removeItem("operador_cargo");
    localStorage.removeItem("operador_data");

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("operador_")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    router.push("/");
  };

  const handleCardHover = (index: number) => {
    setActiveCard(index);
  };

  const handleCardLeave = () => {
    setActiveCard(null);
  };

  const handlePermissionGuide = () => {
    router.push("/permissions-guide");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-lg transform rotate-3 opacity-20"></div>
                <div className="relative bg-linear-to-br from-blue-600 to-blue-700 p-2 rounded-lg shadow">
                  <Truck className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Dispatch Center
                </h1>
                <p className="text-xs text-gray-500">
                  Sistema de Gerenciamento
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handlePermissionGuide}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="hidden md:flex items-center space-x-3">
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{operadorNome}</p>
                  <p className="text-xs text-gray-500">Operador Logístico</p>
                </div>
                <div className="relative group">
                  <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center border border-blue-200">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2
            className={`text-4xl md:text-5xl font-bold text-gray-900 mb-4 transition-all duration-700 ${isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            Bem-vindo <span className="text-blue-600">{operadorNome}</span>
          </h2>
          <p
            className={`text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-300 ${isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            Sistema de Expedição - Controle de Operações
          </p>
        </div>

        {/* Main Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Card Novo Carregamento */}
          <Link href="/carregamento/novo" passHref>
            <div
              className={`bg-white rounded-2xl shadow-xl p-8 border border-gray-200/50 hover:shadow-2xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${activeCard === 0 ? "ring-2 ring-blue-500 ring-opacity-50" : ""}`}
              onMouseEnter={() => handleCardHover(0)}
              onMouseLeave={handleCardLeave}
            >
              <div className="relative mb-6">
                <div className="absolute -top-2 -left-2 w-16 h-16 bg-blue-100 rounded-2xl transform rotate-12 opacity-50"></div>
                <div className="relative w-14 h-14 bg-linear-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Package className="w-7 h-7 text-white" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Expedição
              </h3>
              <p className="text-gray-600 mb-6">Carregamento</p>

              <div className="flex items-center text-blue-600 font-medium">
                <span>Acessar</span>
                <div className="ml-2 transform group-hover:translate-x-2 transition-transform">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Card Dashboard */}
          <Link href="/carregamento/dashboard" passHref>
            <div
              className={`bg-white rounded-2xl shadow-xl p-8 border border-gray-200/50 hover:shadow-2xl hover:border-green-300 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${activeCard === 1 ? "ring-2 ring-green-500 ring-opacity-50" : ""}`}
              onMouseEnter={() => handleCardHover(1)}
              onMouseLeave={handleCardLeave}
            >
              <div className="relative mb-6">
                <div className="absolute -top-2 -left-2 w-16 h-16 bg-green-100 rounded-2xl transform rotate-12 opacity-50"></div>
                <div className="relative w-14 h-14 bg-linear-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                  <ChartBarBig className="w-7 h-7 text-white" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Dashboard
              </h3>
              <p className="text-gray-600 mb-6">
                Visualize métricas detalhadas das operações. Acompanhe o
                desempenho em tempo real.
              </p>

              <div className="flex items-center text-green-600 font-medium">
                <span>Acessar</span>
                <div className="ml-2 transform group-hover:translate-x-2 transition-transform">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Card Upload CSV */}
          <Link href="/carregamento/upload" passHref>
            <div
              className={`bg-white rounded-2xl shadow-xl p-8 border border-gray-200/50 hover:shadow-2xl hover:border-purple-300 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${activeCard === 2 ? "ring-2 ring-purple-500 ring-opacity-50" : ""}`}
              onMouseEnter={() => handleCardHover(2)}
              onMouseLeave={handleCardLeave}
            >
              <div className="relative mb-6">
                <div className="absolute -top-2 -left-2 w-16 h-16 bg-purple-100 rounded-2xl transform rotate-12 opacity-50"></div>
                <div className="relative w-14 h-14 bg-linear-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Upload className="w-7 h-7 text-white" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Upload de CSV
              </h3>
              <p className="text-gray-600 mb-6">
                Faça upload de arquivos CSV para processar dados
                automaticamente.
              </p>

              <div className="flex items-center text-purple-600 font-medium">
                <span>Acessar</span>
                <div className="ml-2 transform group-hover:translate-x-2 transition-transform">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-16 py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 text-sm">
            <p>Dispatch Center • Sistema de Expedição v2.0</p>
            <p className="mt-1">
              Operador: {operadorNome} • © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>

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

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
}
