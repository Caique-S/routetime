
export const TZ_BRASIL = 'America/Sao_Paulo';

export function getTodayBrasilia(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: TZ_BRASIL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .split('/')
    .join('/');
}

export function getHoraAtualBrasilia(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: TZ_BRASIL,
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

export function formatarDataBrasil(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ_BRASIL });
  } catch {
    return '—';
  }
}

export function criarIntervaloDia(dataStr: string): { start: Date; end: Date } {
  const [day, month, year] = dataStr.split('/').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
  const end   = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));
  return { start, end };
}

export function criarIntervaloHoje(): { start: Date; end: Date } {
  return criarIntervaloDia(getTodayBrasilia());
}