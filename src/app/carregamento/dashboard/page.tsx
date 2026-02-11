'use client';

import { useState, useEffect } from 'react';
import { 
  Truck, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  Filter,
  Search,
  RefreshCw,
  Calendar,
  User,
  MapPin
} from 'lucide-react';
import Link from 'next/link';

interface Carregamento {
  _id: string;
  numero: string;
  destino: string;
  motorista: string;
  facility: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';
  dataCriacao: string;
  pesoEstimado?: string;
  observacoes?: string;
  tipoVeiculo?: string;
  veiculoTracao?: string;
}

export default function DashboardPage() {
  const [carregamentos, setCarregamentos] = useState<Carregamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    emAndamento: 0,
    concluidos: 0
  });
  
  const [filter, setFilter] = useState({
    status: '',
    facility: 'SBA04',
    search: ''
  });

  const fetchCarregamentos = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filter.status) queryParams.append('status', filter.status);
      if (filter.facility) queryParams.append('facility', filter.facility);
      
      const response = await fetch(`/api/carregamento?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setCarregamentos(data.data);
        
        // Calcular estatísticas
        const total = data.data.length;
        const pendentes = data.data.filter((c: Carregamento) => c.status === 'pendente').length;
        const emAndamento = data.data.filter((c: Carregamento) => c.status === 'em_andamento').length;
        const concluidos = data.data.filter((c: Carregamento) => c.status === 'concluido').length;
        
        setStats({ total, pendentes, emAndamento, concluidos });
      }
    } catch (error) {
      console.error('Erro ao buscar carregamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarregamentos();
  }, [filter.status, filter.facility]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock className="w-4 h-4" />;
      case 'em_andamento': return <Truck className="w-4 h-4" />;
      case 'concluido': return <CheckCircle className="w-4 h-4" />;
      case 'cancelado': return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50">
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
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-xs text-gray-500">Monitoramento de Carregamentos</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/dispatch"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                <span>Relatório</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendentes}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Em Andamento</p>
                <p className="text-3xl font-bold text-blue-600">{stats.emAndamento}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Concluídos</p>
                <p className="text-3xl font-bold text-green-600">{stats.concluidos}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filter.status}
                  onChange={(e) => setFilter({...filter, status: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Todos os Status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluídos</option>
                  <option value="cancelado">Cancelados</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                <select
                  value={filter.facility}
                  onChange={(e) => setFilter({...filter, facility: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="SBA04">SBA04</option>
                  <option value="SBA03">SBA03</option>
                  <option value="SBA02">SBA02</option>
                  <option value="SBA01">SBA01</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={filter.search}
                  onChange={(e) => setFilter({...filter, search: e.target.value})}
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
                />
              </div>
              
              <button
                onClick={fetchCarregamentos}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Atualizar"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Carregamentos */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Carregamentos Recentes</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando carregamentos...</p>
            </div>
          ) : carregamentos.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Nenhum carregamento encontrado</p>
              <p className="text-sm text-gray-500 mt-1">
                Crie seu primeiro carregamento para começar
              </p>
              <Link
                href="/carregamento/novo"
                className="mt-4 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Criar Carregamento
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destino/Motorista
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {carregamentos.map((carregamento) => (
                    <tr key={carregamento._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{carregamento.numero}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Truck className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{carregamento.destino}</div>
                            <div className="flex items-center text-sm text-gray-500">
                              <User className="w-3 h-3 mr-1" />
                              {carregamento.motorista}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(carregamento.status)}`}>
                          {getStatusIcon(carregamento.status)}
                          {carregamento.status === 'em_andamento' ? 'Em Andamento' : 
                           carregamento.status === 'pendente' ? 'Pendente' :
                           carregamento.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(carregamento.dataCriacao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="font-medium">{carregamento.facility}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}