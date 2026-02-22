'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DESTINOS } from '@/app/utils/constants'; // ajuste o caminho
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';

interface OrigemOption {
  label: string;
  value: string;
}

const ORIGENS: OrigemOption[] = [
  { label: 'CDD Norte', value: 'CDD_Norte' },
  { label: 'CDD Sul', value: 'CDD_Sul' },
  { label: 'Externo', value: 'Externo' },
];

export default function CadastroMotoristaPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    origem: ORIGENS[0].value,
    destino_xpt: DESTINOS[0].value,
  });
  const [loading, setLoading] = useState(false);
  const [motoristaCadastrado, setMotoristaCadastrado] = useState<{ id: string; nome: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/melicages/motoristas/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.erro);
      setMotoristaCadastrado({ id: data.data.id, nome: data.data.nome });
      toast.success('Motorista cadastrado com sucesso!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Cadastro de Motorista</h1>

        {!motoristaCadastrado ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
              <input
                type="text"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
              <input
                type="text"
                name="cpf"
                value={form.cpf}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
              <input
                type="text"
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origem *</label>
              <select
                name="origem"
                value={form.origem}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {ORIGENS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destino XPT *</label>
              <select
                name="destino_xpt"
                value={form.destino_xpt}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {DESTINOS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Motorista'}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Motorista cadastrado!</h2>
            <p className="mb-4">Nome: {motoristaCadastrado.nome}</p>
            <div className="flex justify-center mb-4">
              <QRCode value={motoristaCadastrado.id} size={200} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Este QR Code deve ser usado pelo motorista no app para iniciar a descarga.
            </p>
            <button
              onClick={() => {
                setMotoristaCadastrado(null);
                setForm({
                  nome: '',
                  cpf: '',
                  telefone: '',
                  email: '',
                  origem: ORIGENS[0].value,
                  destino_xpt: DESTINOS[0].value,
                });
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Cadastrar outro motorista
            </button>
          </div>
        )}
      </div>
    </div>
  );
}