'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function CadastroTransportadoraPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', senha: '', confirmSenha: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.senha !== form.confirmSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/melicage/transportadoras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome, senha: form.senha }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.erro);
      toast.success('Transportadora cadastrada com sucesso!');
      router.push('/admin/cadastro-transportadoras'); // ou voltar para a lista
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Cadastrar Transportadora</h1>
        <p className="text-gray-500 mb-6">Crie uma nova transportadora para acesso ao sistema.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nome da transportadora <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              required
              placeholder="Ex: Transportadora Expresso"
              className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Senha <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="senha"
              value={form.senha}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Confirmar senha <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="confirmSenha"
              value={form.confirmSenha}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              'Cadastrar Transportadora'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}