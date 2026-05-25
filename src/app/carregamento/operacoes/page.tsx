'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  UserCog,
  ClipboardList,
  Settings,
  Route,
  Package,
  Truck,
} from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface LinkCard {
  href:   string;
  icon:   React.ElementType;
  label:  string;
  cor:    string;
}

interface CardConfig {
  id:          number;
  titulo:      string;
  descricao:   string;
  corBorda:    string;
  corRing:     string;
  corIcone:    string;
  gradiente:   string;
  icone:       React.ElementType;
  links:       LinkCard[];
  linkUnico?:  string;
}

// ─── Configuração dos cards ───────────────────────────────────────────────────
//
// Centralizada para facilitar adição/remoção de cards sem tocar no JSX.

const CARDS: CardConfig[] = [
  {
    id:        1,
    titulo:    'Filas',
    descricao: 'Gerencie filas de viagem e gaiolas.',
    corBorda:  'hover:border-blue-300',
    corRing:   'ring-blue-500',
    corIcone:  'from-blue-600 to-blue-700',
    gradiente: 'bg-blue-100',
    icone:     Route,
    links: [
      { href: '/painel/fila-destino', icon: Truck,   label: 'Fila de Viagem',  cor: 'text-blue-600'  },
      { href: '/painel/view',         icon: Package, label: 'Fila de Gaiolas', cor: 'text-green-600' },
    ],
  },
  {
    id:        2,
    titulo:    'Cadastros',
    descricao: 'Gerencie motoristas e operadores do sistema.',
    corBorda:  'hover:border-purple-300',
    corRing:   'ring-purple-500',
    corIcone:  'from-purple-600 to-purple-700',
    gradiente: 'bg-purple-100',
    icone:     Users,
    links: [
      { href: '/admin/cadastro-motoristas', icon: Users,   label: 'Motoristas',  cor: 'text-purple-600' },
      { href: '/admin/operadores',          icon: UserCog, label: 'Operadores',  cor: 'text-purple-600' },
    ],
  },
  {
    id:         3,
    titulo:     'Auditoria de Expedição',
    descricao:  'Visualize logs, históricos e validações das operações de expedição.',
    corBorda:   'hover:border-green-300',
    corRing:    'ring-green-500',
    corIcone:   'from-green-600 to-green-700',
    gradiente:  'bg-green-100',
    icone:      ClipboardList,
    links:      [],
    linkUnico:  '/admin/expedicao',
  },
  {
    id:        4,
    titulo:    'Configurações',
    descricao: 'Ajuste parâmetros do sistema, permissões e preferências.',
    corBorda:  'hover:border-gray-400',
    corRing:   'ring-gray-500',
    corIcone:  'from-gray-600 to-gray-700',
    gradiente: 'bg-gray-100',
    icone:     Settings,
    links:     [],
    linkUnico: '/admin/config/melicage',
  },
];

// ─── Seta decorativa ──────────────────────────────────────────────────────────

function SetaDireita({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ConexoesPage() {
  const router = useRouter();

  // Redireciona para o login se o operador não estiver autenticado
  useEffect(() => {
    const nome  = localStorage.getItem('operador_nome');
    const cargo = localStorage.getItem('operador_cargo');
    if (!nome && !cargo) router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50">

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-4">
            <Link
              href="/dispatch"
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Voltar</span>
            </Link>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-lg rotate-3 opacity-20" />
              <div className="relative bg-linear-to-br from-blue-600 to-blue-700 p-2 rounded-lg shadow-md">
                <Truck className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Gerenciamento do Sistema</h1>
          </div>
        </div>
      </header>

      {/* Grid de cards */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map((card) => {
            const Icone = card.icone;

            const conteudo = (
              <div className={`bg-white rounded-2xl shadow-xl p-6 border border-gray-200/50
                hover:shadow-2xl ${card.corBorda} transition-all duration-300 transform hover:-translate-y-1
                ${card.linkUnico ? 'cursor-pointer' : ''}`}
              >
                {/* Ícone do card */}
                <div className="relative mb-6">
                  <div className={`absolute -top-2 -left-2 w-16 h-16 ${card.gradiente} rounded-2xl rotate-12 opacity-50`} />
                  <div className={`relative w-14 h-14 bg-linear-to-br ${card.corIcone} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icone className="w-7 h-7 text-white" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">{card.titulo}</h3>
                <p className="text-gray-600 mb-4">{card.descricao}</p>

                {/* Links internos (cards com múltiplas rotas) */}
                {card.links.length > 0 && (
                  <div className="space-y-3">
                    {card.links.map((link) => {
                      const LinkIcone = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <LinkIcone className={`w-5 h-5 ${link.cor}`} />
                            <span className="font-medium text-gray-800">{link.label}</span>
                          </div>
                          <SetaDireita className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Link único (card inteiro clicável) */}
                {card.linkUnico && (
                  <div className={`flex items-center gap-2 font-medium`} style={{ color: 'inherit' }}>
                    <span className="text-current">Acessar</span>
                    <SetaDireita className="text-current" />
                  </div>
                )}
              </div>
            );

            return card.linkUnico ? (
              <Link key={card.id} href={card.linkUnico}>
                {conteudo}
              </Link>
            ) : (
              <div key={card.id}>{conteudo}</div>
            );
          })}
        </div>
      </main>
    </div>
  );
}