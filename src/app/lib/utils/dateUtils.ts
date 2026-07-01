
export const TZ_BRASIL = 'America/Sao_Paulo';

export function getTodayBrasilia(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: TZ_BRASIL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function getHoraAtualBrasilia(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: TZ_BRASIL,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatarHoraBrasil(iso: string | Date | null | undefined): string {
  if (!iso) return '0'
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      timeZone: TZ_BRASIL,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '99:99';
  }
}

export function formatarDataBrasil(iso: string | Date | null | undefined): string {
  if (!iso) return 'Data não Informada!';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
        timeZone: TZ_BRASIL,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
  } catch {
    return '00/00/0000';
  }
}

export function criarIntervaloDia(dataStr: string): { start: Date; end: Date } {
  if (!dataStr) {
    const agora = new Date();
    return { start: agora, end: agora };
  }

  let year: number, month: number, day: number;
  // Detecta o formato enviado pelo componente
  if (dataStr.includes('-')) {
    // Formato: YYYY-MM-DD (Padrão de inputs HTML5)
    [year, month, day] = dataStr.split('-').map(Number);
  } else {
    // Formato: DD/MM/YYYY (Padrão pt-BR manual)
    [day, month, year] = dataStr.split('/').map(Number);
  }
  
  const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day +1, 2, 59, 58, 990));
  return { start, end };
}

export function criarIntervaloHoje(): { start: Date; end: Date } {
  return criarIntervaloDia(getTodayBrasilia());
}