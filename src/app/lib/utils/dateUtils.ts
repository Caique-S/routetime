/**
 * dateUtils.ts
 *
 * Fonte única para toda lógica de data/hora do projeto.
 *
 * ESTRATÉGIA DE FUSO HORÁRIO:
 *   - ARMAZENAMENTO → sempre em UTC via Date.toISOString()
 *     Ex: "2025-05-08T17:00:00.000Z" = 14:00 no horário de Brasília (UTC-3)
 *   - CÁLCULO DE DURAÇÃO → timezone-agnóstico
 *     new Date(isoUTC).getTime() retorna ms desde epoch — sempre correto
 *   - EXIBIÇÃO → converter para America/Sao_Paulo APENAS no frontend
 *     Usar formatarHoraBrasil() e formatarDataBrasil() abaixo
 */

export const TZ_BRASIL = 'America/Sao_Paulo';

/**
 * Retorna a data atual no formato YYYY-MM-DD no fuso de Brasília.
 * Substitui as implementações espalhadas que usavam new Date() local.
 *
 * Exemplo: "2025-05-08"
 */
export function getTodayBrasilia(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: TZ_BRASIL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .split('/')
    .reverse()
    .join('-');
}

/**
 * Retorna a hora atual formatada HH:MM no fuso de Brasília.
 *
 * Exemplo: "14:00"
 */
export function getHoraAtualBrasilia(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: TZ_BRASIL,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Converte um ISO string UTC para horário de Brasília no formato HH:MM.
 * Usar no frontend para exibir campos de horário das etapas.
 *
 * Exemplo: formatarHoraBrasil("2025-05-08T17:00:00.000Z") → "14:00"
 */
export function formatarHoraBrasil(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      timeZone: TZ_BRASIL,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Converte um ISO string UTC para data de Brasília no formato DD/MM/AAAA.
 *
 * Exemplo: formatarDataBrasil("2025-05-08T03:00:00.000Z") → "08/05/2025"
 */
export function formatarDataBrasil(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ_BRASIL });
  } catch {
    return '—';
  }
}

/**
 * Cria um intervalo { start, end } em UTC a partir de uma data YYYY-MM-DD,
 * cobrindo o dia completo no fuso de Brasília (00:00–23:59:59.999 BRT).
 *
 * Equivalências:
 *   start: YYYY-MM-DDT03:00:00.000Z  (meia-noite em Brasília)
 *   end:   YYYY-MM-DDT02:59:59.999Z  no dia seguinte (23:59:59 BRT)
 */
export function criarIntervaloDia(dataStr: string): { start: Date; end: Date } {
  const [year, month, day] = dataStr.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
  const end   = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));
  return { start, end };
}

/**
 * Atalho: intervalo do dia de hoje no fuso de Brasília.
 */
export function criarIntervaloHoje(): { start: Date; end: Date } {
  return criarIntervaloDia(getTodayBrasilia());
}