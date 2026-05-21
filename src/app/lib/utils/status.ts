/**
 * status.ts
 *
 * Fonte única para todos os status de carregamento, suas transições
 * válidas e metadados de exibição usados no Kanban.
 */

// ─── Tipo ─────────────────────────────────────────────────────────────────────

export type StatusCarregamento =
  | 'aguardando'   // criado via upload; visível no Kanban
  | 'emDoca'       // doca selecionada e salva
  | 'carregando'   // 2º input do modal de tempo preenchido e salvo
  | 'liberado'     // "saída liberada" + "lacre traseiro" preenchidos e salvos
  | 'not_used';    // cancelamento sem exclusão; badge vermelho na coluna aguardando

// ─── Lista aceita pela API ────────────────────────────────────────────────────

export const STATUS_VALIDOS: StatusCarregamento[] = [
  'aguardando',
  'emDoca',
  'carregando',
  'liberado',
  'not_used',
];

// ─── Regras de transição ──────────────────────────────────────────────────────

/**
 * Define quais próximos status são permitidos a partir de cada status atual.
 *
 * Uso:  TRANSICOES_VALIDAS['aguardando'].has('emDoca') → true
 *       TRANSICOES_VALIDAS['liberado'].has('carregando') → false
 */
export const TRANSICOES_VALIDAS: Record<StatusCarregamento, Set<StatusCarregamento>> = {
  aguardando: new Set(['emDoca',     'not_used']),
  emDoca:     new Set(['carregando', 'not_used']),
  carregando: new Set(['liberado',   'not_used']),
  liberado:   new Set(),   // status terminal
  not_used:   new Set(),   // status terminal
};

/**
 * Valida se a transição de statusAtual → novoStatus é permitida.
 * Retorna null se válida, ou uma mensagem de erro se inválida.
 */
export function validarTransicao(
  statusAtual: StatusCarregamento,
  novoStatus: StatusCarregamento
): string | null {
  if (!STATUS_VALIDOS.includes(novoStatus)) {
    return `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}`;
  }
  if (!TRANSICOES_VALIDAS[statusAtual]?.has(novoStatus)) {
    return `Transição não permitida: "${statusAtual}" → "${novoStatus}"`;
  }
  return null;
}

/**
 * Retorna true se o status é terminal (não pode mais avançar).
 */
export function isStatusTerminal(status: StatusCarregamento): boolean {
  return TRANSICOES_VALIDAS[status].size === 0;
}

// ─── Metadados de exibição (Kanban) ──────────────────────────────────────────

export const STATUS_LABELS: Record<StatusCarregamento, string> = {
  aguardando: 'Aguardando',
  emDoca:     'Em Doca',
  carregando: 'Carregando',
  liberado:   'Liberado',
  not_used:   'Not Used',
};

/**
 * Classes Tailwind para o badge de status de cada card do Kanban.
 */
export const STATUS_BADGE: Record<StatusCarregamento, string> = {
  aguardando: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  emDoca:     'bg-blue-100   text-blue-800   border-blue-200',
  carregando: 'bg-orange-100 text-orange-800 border-orange-200',
  liberado:   'bg-green-100  text-green-800  border-green-200',
  not_used:   'bg-red-100    text-red-800    border-red-200',
};

/**
 * Título das colunas do Kanban.
 * not_used não tem coluna própria — aparece como badge na coluna aguardando.
 */
export const COLUNAS_KANBAN: Exclude<StatusCarregamento, 'not_used'>[] = [
  'aguardando',
  'emDoca',
  'carregando',
  'liberado',
];

export const COLUNA_LABELS: Record<Exclude<StatusCarregamento, 'not_used'>, string> = {
  aguardando: 'Aguardando',
  emDoca:     'Em Doca',
  carregando: 'Carregando',
  liberado:   'Liberado',
};

// ─── Lógica do botão "Not Used" ───────────────────────────────────────────────

/**
 * Retorna true se o botão "Not Used" deve estar disponível para o status atual.
 * Disponível enquanto o carregamento não for terminal.
 */
export function podeMarcarNotUsed(status: StatusCarregamento): boolean {
  return !isStatusTerminal(status);
}

// ─── Lógica do botão "Finalizar Carregamento" ─────────────────────────────────

/**
 * Retorna true se o botão "Finalizar Carregamento" deve estar disponível.
 * Disponível apenas quando "saída liberada" e "lacre traseiro" estiverem preenchidos
 * e o status atual for "carregando".
 *
 * A ação em si é feita apenas no localStorage (sem chamada à API).
 */
export function podeFinalizar({
  status,
  saidaLiberada,
  lacreTraseiro,
}: {
  status: StatusCarregamento;
  saidaLiberada: string | null | undefined;
  lacreTraseiro: string | null | undefined;
}): boolean {
  return status === 'carregando' && !!saidaLiberada && !!lacreTraseiro;
}