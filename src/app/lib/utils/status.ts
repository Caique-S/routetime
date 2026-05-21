/**
 * status.ts
 *
 * Fonte única para todos os status de carregamento, suas transições
 * válidas e metadados de exibição.
 *
 * Anteriormente redefinido em pelo menos 3 arquivos diferentes:
 *   - app/api/carregamento/etapa/route.ts
 *   - app/api/carregamento/[id]/status/route.ts
 *   - app/lib/useEtapaCarregamento.ts (agora carregamentoStorage.ts)
 */

// ─── Tipo ────────────────────────────────────────────────────────────────────

export type StatusCarregamento =
  | 'aguardando'    // criado via upload; visível no Kanban
  | 'emDoca'        // doca selecionada e salva
  | 'carregando'    // 2º input do modal de tempo preenchido e salvo
  | 'liberado'      // "saída liberada" + "lacre traseiro" preenchidos e salvos
  | 'not_used';     // cancelamento sem exclusão; badge vermelho na coluna aguardando

// ─── Lista de status aceitos pela API ────────────────────────────────────────

export const STATUS_VALIDOS: StatusCarregamento[] = [
  'aguardando',
  'emDoca',
  'carregando',
  'liberado',
  'not_used',
];

// ─── Regras de transição ─────────────────────────────────────────────────────

/**
 * Mapa de transições válidas.
 * A chave é o status atual e o valor é o conjunto de próximos status permitidos.
 *
 * Uso: TRANSICOES_VALIDAS['aguardando'].has('emDoca') → true
 */
export const TRANSICOES_VALIDAS: Record<StatusCarregamento, Set<StatusCarregamento>> = {
  aguardando: new Set(['emDoca', 'not_used']),
  emDoca:     new Set(['carregando', 'not_used']),
  carregando: new Set(['liberado', 'not_used']),
  liberado:   new Set(),   // status terminal
  not_used:   new Set(),   // status terminal
};

/**
 * Valida se uma transição de status é permitida.
 * Retorna null se válida, ou uma mensagem de erro se inválida.
 */
export function validarTransicao(
  statusAtual: StatusCarregamento,
  novoStatus: StatusCarregamento
): string | null {
  if (!STATUS_VALIDOS.includes(novoStatus)) {
    return `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}`;
  }
  if (!TRANSICOES_VALIDAS[statusAtual].has(novoStatus)) {
    return `Transição não permitida: "${statusAtual}" → "${novoStatus}"`;
  }
  return null;
}

// ─── Metadados de exibição ───────────────────────────────────────────────────

export const STATUS_LABELS: Record<StatusCarregamento, string> = {
  aguardando: 'Aguardando',
  emDoca:     'Em Doca',
  carregando: 'Carregando',
  liberado:   'Liberado',
  not_used:   'Not Used',
};

export const STATUS_CORES: Record<StatusCarregamento, string> = {
  aguardando: 'bg-yellow-100 text-yellow-800',
  emDoca:     'bg-blue-100 text-blue-800',
  carregando: 'bg-orange-100 text-orange-800',
  liberado:   'bg-green-100 text-green-800',
  not_used:   'bg-red-100 text-red-800',
};