'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Save, Users, Eye, Edit, Trash2 } from 'lucide-react';

interface Operador {
  _id: string;
  id?: string;
  nome: string;
  cargo: string;
  codigo: string;
  cpf?: string;
  matricula?: string;
  email: string;
  telefone: string;
  ativo: boolean;
  dataDeCadastro: string;
}

export default function AdminOperadoresPage() {
  const [formData, setFormData] = useState({
    nome: '',
    cargo: 'Operador',
    codigo: '',
    cpf: '',
    email: '',
    telefone: '',
    ativo: true,
    permissoes: ['expedicao', 'visualizacao']
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [operadoresLoading, setOperadoresLoading] = useState(true);

  // Carregar operadores ao iniciar
  useEffect(() => {
    fetchOperadores();
  }, []);

  const fetchOperadores = async () => {
    try {
      setOperadoresLoading(true);
      const response = await fetch('/api/operador/list');
      const data = await response.json();
      if (data.success) {
        setOperadores(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar operadores:', error);
    } finally {
      setOperadoresLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Preparar dados para envio
      const dadosParaEnviar = {
        ...formData,
        // Se CPF foi preenchido, enviar como matricula também
        matricula: formData.cpf || '',
        // Se código não foi preenchido, enviar como null para gerar automaticamente
        codigo: formData.codigo || null
      };

      const response = await fetch('/api/operador', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosParaEnviar),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Operador ${data.data.nome} criado com sucesso! ID: ${data.id}`
        });
        
        // Resetar formulário
        setFormData({
          nome: '',
          cargo: 'Operador',
          codigo: '',
          cpf: '',
          email: '',
          telefone: '',
          ativo: true,
          permissoes: ['expedicao', 'visualizacao']
        });
        
        // Atualizar lista de operadores
        fetchOperadores();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao criar operador'
        });
      }
    } catch (error) {
      console.error('Erro:', error);
      setMessage({
        type: 'error',
        text: 'Erro de conexão com o servidor'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const formatarCPF = (cpf: string) => {
    if (!cpf) return '';
    cpf = cpf.replace(/\D/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);
    
    // Formatar CPF
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    
    setFormData(prev => ({ ...prev, cpf: value }));
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Formatar telefone
    if (value.length === 11) {
      value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length === 10) {
      value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (value.length > 6) {
      value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }
    
    setFormData(prev => ({ ...prev, telefone: value }));
  };

  const copiarID = (id: string) => {
    navigator.clipboard.writeText(id)
      .then(() => {
        setMessage({
          type: 'success',
          text: 'ID copiado para a área de transferência!'
        });
      })
      .catch(err => {
        setMessage({
          type: 'error',
          text: 'Erro ao copiar ID'
        });
      });
  };

  const gerarQRCode = (id: string, nome: string) => {
    // Em um sistema real, aqui você geraria um QR Code com o ID
    // Para teste, vamos apenas copiar o ID
    copiarID(id);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cadastrar Operador</h1>
              <p className="text-gray-600">Adicione um novo operador ao sistema</p>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cargo
                </label>
                <select
                  name="cargo"
                  value={formData.cargo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="Operador">Operador</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Coordenador">Coordenador</option>
                  <option value="Gerente">Gerente</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código do Operador
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="OP001 (deixe em branco para gerar automaticamente)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF *
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleCPFChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="joao@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleTelefoneChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="ativo"
                  checked={formData.ativo}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  id="ativo"
                />
                <label htmlFor="ativo" className="ml-2 text-sm text-gray-700">
                  Operador ativo
                </label>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading || !formData.nome || !formData.cpf}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Cadastrar Operador</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Lista de operadores existentes */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">Operadores Cadastrados</h2>
            </div>
            <button
              onClick={fetchOperadores}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Atualizar Lista
            </button>
          </div>

          {operadoresLoading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-600">Carregando operadores...</p>
            </div>
          ) : operadores.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>Nenhum operador cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID / Código</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nome</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cargo</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">CPF</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {operadores.map((operador) => (
                    <tr key={operador._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {operador.codigo || 'Sem código'}
                          </div>
                          <div className="text-xs text-gray-500 font-mono truncate max-w-50" title={operador._id}>
                            ID: {operador._id.substring(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{operador.nome}</div>
                        {operador.email && (
                          <div className="text-xs text-gray-500">{operador.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{operador.cargo}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {formatarCPF(operador.cpf || operador.matricula || '') || 'Não informado'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${operador.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {operador.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copiarID(operador._id)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Copiar ID para login"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => gerarQRCode(operador._id, operador.nome)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Gerar QR Code"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Desativar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Informações importantes */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Como funciona o login dos operadores?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-1 mr-3 shrink-0"></span>
              Cada operador recebe um <strong className="font-mono">ID único</strong> gerado automaticamente pelo MongoDB
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-1 mr-3 shrink-0"></span>
              Para fazer login, o operador deve digitar ou escanear este ID na tela de expedição
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-1 mr-3 shrink-0"></span>
              Você pode copiar o ID de cada operador usando o botão "👁️" na lista acima
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-1 mr-3 shrink-0"></span>
              Os primeiros 8 caracteres do ID são mostrados na tabela para fácil identificação
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}