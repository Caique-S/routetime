'use client';

import Link from 'next/link';
import { ArrowLeft, Users, UserCog, ClipboardList, Settings, Route, Package, Truck } from 'lucide-react';
import { useState , useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ConexoesPage() {

  const router = useRouter()
  const [activeCard, setActiveCard] = useState<number | null>(null);

  const handleCardHover = (cardId: number) => setActiveCard(cardId);
  const handleCardLeave = () => setActiveCard(null);

    useEffect(() => {
      const operadorNome = localStorage.getItem("operador_nome");
      const operadorCargo = localStorage.getItem("operador_cargo");
  
      if (!operadorNome && !operadorCargo) {
        router.push("/dispatch");
      }
    }, [router]);

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <Link
                href="/dispatch"
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Voltar</span>
              </Link>
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-lg transform rotate-3 opacity-20"></div>
                <div className="relative bg-linear-to-br from-blue-600 to-blue-700 p-2 rounded-lg shadow-md">
                  <Truck className="w-6 h-6 text-white" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Gerenciamento do Sistema</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card: Filas */}
          <div
            className={`bg-white rounded-2xl shadow-xl p-6 border border-gray-200/50 hover:shadow-2xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1 ${activeCard === 1 ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
            onMouseEnter={() => handleCardHover(1)}
            onMouseLeave={handleCardLeave}
          >
            <div className="relative mb-6">
              <div className="absolute -top-2 -left-2 w-16 h-16 bg-blue-100 rounded-2xl transform rotate-12 opacity-50"></div>
              <div className="relative w-14 h-14 bg-linear-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Route className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Filas</h3>
            <p className="text-gray-600 mb-4">Gerencie filas de viagem e gaiolas.</p>
            <div className="space-y-3">
              <Link
                href="/painel/fila-destino"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-800">Fila de Viagem</span>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/painel/view"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-800">Fila de Gaiolas</span>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Card: Cadastros (Motoristas e Operadores) */}
          <div
            className={`bg-white rounded-2xl shadow-xl p-6 border border-gray-200/50 hover:shadow-2xl hover:border-purple-300 transition-all duration-300 transform hover:-translate-y-1 ${activeCard === 2 ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}`}
            onMouseEnter={() => handleCardHover(2)}
            onMouseLeave={handleCardLeave}
          >
            <div className="relative mb-6">
              <div className="absolute -top-2 -left-2 w-16 h-16 bg-purple-100 rounded-2xl transform rotate-12 opacity-50"></div>
              <div className="relative w-14 h-14 bg-linear-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Cadastros</h3>
            <p className="text-gray-600 mb-4">Gerencie motoristas e operadores do sistema.</p>
            <div className="space-y-3">
              <Link
                href="/admin/cadastro-motoristas"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-800">Motoristas</span>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/admin/operadores"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <UserCog className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-800">Operadores</span>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Card: Auditoria de Expedição */}
          <Link href="/admin/expedicao" passHref>
            <div
              className={`bg-white rounded-2xl shadow-xl p-6 border border-gray-200/50 hover:shadow-2xl hover:border-green-300 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${activeCard === 3 ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
              onMouseEnter={() => handleCardHover(3)}
              onMouseLeave={handleCardLeave}
            >
              <div className="relative mb-6">
                <div className="absolute -top-2 -left-2 w-16 h-16 bg-green-100 rounded-2xl transform rotate-12 opacity-50"></div>
                <div className="relative w-14 h-14 bg-linear-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                  <ClipboardList className="w-7 h-7 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Auditoria de Expedição</h3>
              <p className="text-gray-600 mb-6">
                Visualize logs, históricos e validações das operações de expedição.
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

          {/* Card: Configurações */}
          <Link href="/admin/config/melicages" passHref>
            <div
              className={`bg-white rounded-2xl shadow-xl p-6 border border-gray-200/50 hover:shadow-2xl hover:border-gray-400 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${activeCard === 4 ? 'ring-2 ring-gray-500 ring-opacity-50' : ''}`}
              onMouseEnter={() => handleCardHover(4)}
              onMouseLeave={handleCardLeave}
            >
              <div className="relative mb-6">
                <div className="absolute -top-2 -left-2 w-16 h-16 bg-gray-100 rounded-2xl transform rotate-12 opacity-50"></div>
                <div className="relative w-14 h-14 bg-linear-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Settings className="w-7 h-7 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Configurações</h3>
              <p className="text-gray-600 mb-6">
                Ajuste parâmetros do sistema, permissões e preferências.
              </p>
              <div className="flex items-center text-gray-600 font-medium">
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
    </div>
  );
}