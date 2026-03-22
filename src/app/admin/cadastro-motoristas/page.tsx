'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DESTINOS } from '@/app/utils/constants';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';

// ─── Types ───────────────────────────────────────────────────────────────────
interface MotoristaCadastro {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  origem: string;
  destino_xpt: string;
  createdAt?: string;
}

interface OrigemOption {
  label: string;
  value: string;
}

const ORIGENS: OrigemOption[] = [
  { label: 'Feira de Santana', value: 'NONECO' },
];

const EMPTY_FORM = {
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  origem: ORIGENS[0].value,
  destino_xpt: '',
};

// ─── Helper: formata CPF ───────────────────────────────────────────────────
const formatCpf = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

// ─── Helper: iniciais do nome ──────────────────────────────────────────────
const initials = (nome: string) =>
  nome
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

// ─── Avatar colors ─────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
];
const avatarColor = (nome: string) =>
  AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length];

// ─── DeleteConfirmModal ────────────────────────────────────────────────────
function DeleteConfirmModal({
  motorista,
  onCancel,
  onConfirm,
  loading,
}: {
  motorista: MotoristaCadastro;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn">
        <div className="bg-red-600 px-6 py-5 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Confirmar exclusão</h2>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-600 mb-1">Tem certeza que deseja excluir o motorista</p>
          <p className="font-bold text-gray-900 text-lg mb-1">{motorista.nome}</p>
          <p className="text-sm text-gray-500 mb-6">CPF: {motorista.cpf}</p>
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-6">
            ⚠️ Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : null}
              Sim, excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EditModal ─────────────────────────────────────────────────────────────
function EditModal({
  motorista,
  onCancel,
  onSave,
  loading,
}: {
  motorista: MotoristaCadastro;
  onCancel: () => void;
  onSave: (id: string, data: Partial<MotoristaCadastro>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    nome: motorista.nome,
    cpf: motorista.cpf,
    telefone: motorista.telefone,
    email: motorista.email,
    origem: motorista.origem,
    destino_xpt: motorista.destino_xpt ?? '',
  });

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: name === 'cpf' ? formatCpf(value) : value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Editar Motorista</h2>
            <p className="text-blue-100 text-sm mt-0.5">{motorista.nome}</p>
          </div>
          <button onClick={onCancel} className="text-blue-200 hover:text-white transition p-1 rounded-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {[
            { label: 'Nome completo', name: 'nome', type: 'text', required: true },
            { label: 'CPF', name: 'cpf', type: 'text', required: true, placeholder: '000.000.000-00' },
            { label: 'Telefone', name: 'telefone', type: 'text', required: true, placeholder: '(00) 00000-0000' },
            { label: 'E-mail', name: 'email', type: 'email', required: true },
          ].map(({ label, name, type, required, placeholder }) => (
            <div key={name}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={type}
                name={name}
                value={(form as any)[name]}
                onChange={handle}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Origem <span className="text-red-500">*</span>
            </label>
            <select
              name="origem"
              value={form.origem}
              onChange={handle}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 bg-white"
            >
              {ORIGENS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Destino XPT <span className="text-gray-400 font-normal text-xs">(opcional)</span>
            </label>
            <select
              name="destino_xpt"
              value={form.destino_xpt}
              onChange={handle}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 bg-white"
            >
              <option value="">— Sem destino definido —</option>
              {DESTINOS.map((d: any) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-white transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(motorista.id, form)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DriverCard ────────────────────────────────────────────────────────────
function DriverCard({
  m,
  onEdit,
  onDelete,
}: {
  m: MotoristaCadastro;
  onEdit: (m: MotoristaCadastro) => void;
  onDelete: (m: MotoristaCadastro) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-xl ${avatarColor(m.nome)} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm`}>
            {initials(m.nome)}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{m.nome}</h3>
            <p className="text-sm text-gray-500 mt-0.5 font-mono">{m.cpf}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="mt-4 space-y-2">
          <DetailRow icon="📱" label="Telefone" value={m.telefone} />
          <DetailRow icon="✉️" label="E-mail" value={m.email} />
          <DetailRow icon="📍" label="Origem" value={ORIGENS.find(o => o.value === m.origem)?.label ?? m.origem} />
          {m.destino_xpt && (
            <DetailRow
              icon="🏁"
              label="Destino XPT"
              value={(DESTINOS as any[]).find((d) => d.value === m.destino_xpt)?.label ?? m.destino_xpt}
            />
          )}
          {m.createdAt && (
            <DetailRow
              icon="📅"
              label="Cadastrado"
              value={new Date(m.createdAt).toLocaleDateString('pt-BR')}
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 flex">
        <button
          onClick={() => onEdit(m)}
          className="flex-1 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
        <div className="w-px bg-gray-100" />
        <button
          onClick={() => onDelete(m)}
          className="flex-1 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Excluir
        </button>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      <span className="text-gray-400 shrink-0">{label}:</span>
      <span className="text-gray-700 font-medium truncate">{value}</span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function CadastroMotoristaPage() {
  const router = useRouter();

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [motoristaCadastrado, setMotoristaCadastrado] = useState<{ id: string; nome: string } | null>(null);

  // List state
  const [motoristas, setMotoristas] = useState<MotoristaCadastro[]>([]);
  const [loadingMotoristas, setLoadingMotoristas] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit state
  const [editingMotorista, setEditingMotorista] = useState<MotoristaCadastro | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Delete state
  const [deletingMotorista, setDeletingMotorista] = useState<MotoristaCadastro | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // ── Fetch list ────────────────────────────────────────────────────────────
  const fetchMotoristas = async () => {
    setLoadingMotoristas(true);
    try {
      const res = await fetch('/api/melicages/motoristas/cadastro');
      const data = await res.json();
      if (!data.success) throw new Error(data.erro || 'Erro ao buscar motoristas');
      setMotoristas(data.data ?? []);
    } catch (err: any) {
      toast.error('Erro ao carregar motoristas: ' + err.message);
    } finally {
      setLoadingMotoristas(false);
    }
  };

  useEffect(() => { fetchMotoristas(); }, []);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const motoristasFiltered = motoristas.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.nome.toLowerCase().includes(q) ||
      m.cpf.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      m.email.toLowerCase().includes(q)
    );
  });

  // ── Register new ──────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'cpf' ? formatCpf(value) : value }));
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
      fetchMotoristas(); // atualiza a lista
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleSaveEdit = async (id: string, data: Partial<MotoristaCadastro>) => {
    setLoadingEdit(true);
    try {
      const res = await fetch(`/api/melicages/motoristas/cadastro/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.erro || 'Erro ao atualizar');
      toast.success('Motorista atualizado!');
      setEditingMotorista(null);
      fetchMotoristas();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingEdit(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deletingMotorista) return;
    setLoadingDelete(true);
    try {
      const res = await fetch(`/api/melicages/motoristas/cadastro/${deletingMotorista.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.erro || 'Erro ao excluir');
      toast.success('Motorista excluído!');
      setDeletingMotorista(null);
      fetchMotoristas();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingDelete(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>

      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Cadastro de Motoristas</h1>
                <p className="text-xs text-gray-500">{motoristas.length} motorista{motoristas.length !== 1 ? 's' : ''} cadastrado{motoristas.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* ── Left: Form ──────────────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                <div className="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-5">
                  <h2 className="text-lg font-bold text-white">
                    {motoristaCadastrado ? '✅ Motorista Cadastrado' : '➕ Novo Motorista'}
                  </h2>
                  <p className="text-blue-100 text-sm mt-0.5">
                    {motoristaCadastrado ? 'QR Code gerado com sucesso' : 'Preencha os dados para cadastrar'}
                  </p>
                </div>

                {/* ── QR Code View ─────────────────────────────────────── */}
                {motoristaCadastrado ? (
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-bold text-gray-900 text-xl mb-1">{motoristaCadastrado.nome}</p>
                    <p className="text-sm text-gray-500 mb-6">Cadastrado com sucesso</p>

                    <div className="flex justify-center p-4 bg-gray-50 rounded-2xl mb-4 border border-gray-100">
                      <QRCode value={motoristaCadastrado.id} size={180} />
                    </div>
                    <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                      Este QR Code deve ser usado pelo motorista no app para iniciar a descarga.
                    </p>

                    <button
                      onClick={() => { setMotoristaCadastrado(null); setForm(EMPTY_FORM); }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition"
                    >
                      Cadastrar outro motorista
                    </button>
                  </div>
                ) : (
                  /* ── Registration Form ─────────────────────────────── */
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <FormField label="Nome completo" name="nome" value={form.nome} onChange={handleChange} required placeholder="Nome completo do motorista" />
                    <FormField label="CPF" name="cpf" value={form.cpf} onChange={handleChange} required placeholder="000.000.000-00" />
                    <FormField label="Telefone" name="telefone" value={form.telefone} onChange={handleChange} required placeholder="(00) 00000-0000" />
                    <FormField label="E-mail" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="email@exemplo.com" />

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Origem <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="origem"
                        value={form.origem}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 bg-white text-sm"
                      >
                        {ORIGENS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Destino XPT
                        <span className="text-gray-400 font-normal text-xs ml-1">(opcional)</span>
                      </label>
                      <select
                        name="destino_xpt"
                        value={form.destino_xpt}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 bg-white text-sm"
                      >
                        <option value="">— Sem destino definido —</option>
                        {(DESTINOS as any[]).map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                    >
                      {loading ? (
                        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      )}
                      {loading ? 'Cadastrando...' : 'Cadastrar Motorista'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* ── Right: List ──────────────────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-5">
              {/* Search + header */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar pelo CPF"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm shadow-sm"
                  />
                </div>
                <button
                  onClick={fetchMotoristas}
                  disabled={loadingMotoristas}
                  className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
                  title="Atualizar lista"
                >
                  <svg className={`w-5 h-5 text-gray-500 ${loadingMotoristas ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {/* List */}
              {loadingMotoristas ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4" style={{ borderWidth: 3 }} />
                  <p className="text-sm">Carregando motoristas...</p>
                </div>
              ) : motoristasFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-gray-500">
                    {searchQuery ? 'Nenhum motorista encontrado' : 'Nenhum motorista cadastrado'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchQuery ? 'Tente outro termo de busca' : 'Use o formulário ao lado para cadastrar'}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-400 px-1">
                    {motoristasFiltered.length} de {motoristas.length} motorista{motoristas.length !== 1 ? 's' : ''}
                    {searchQuery ? ` para "${searchQuery}"` : ''}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {motoristasFiltered.map((m) => (
                      <DriverCard
                        key={m.id}
                        m={m}
                        onEdit={setEditingMotorista}
                        onDelete={setDeletingMotorista}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {editingMotorista && (
        <EditModal
          motorista={editingMotorista}
          onCancel={() => setEditingMotorista(null)}
          onSave={handleSaveEdit}
          loading={loadingEdit}
        />
      )}
      {deletingMotorista && (
        <DeleteConfirmModal
          motorista={deletingMotorista}
          onCancel={() => setDeletingMotorista(null)}
          onConfirm={handleConfirmDelete}
          loading={loadingDelete}
        />
      )}
    </>
  );
}

// ─── Reusable FormField ────────────────────────────────────────────────────
function FormField({
  label, name, value, onChange, required, placeholder, type = 'text',
}: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 text-sm placeholder:text-gray-400"
      />
    </div>
  );
}