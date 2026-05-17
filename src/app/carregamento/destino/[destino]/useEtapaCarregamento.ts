'use client';

export type StatusCarregamento =
  | 'aguardando'
  | 'emDoca'
  | 'carregando'
  | 'finalizado';

interface AvancarEtapaParams {
  carregamentoDbId: string;
  status: StatusCarregamento;
  dadosAdicionais?: Record<string, any>;
}

export async function avancarEtapa({
  carregamentoDbId,
  status,
  dadosAdicionais,
}: AvancarEtapaParams): Promise<boolean> {
  try {
    const res = await fetch(`/api/carregamento/${carregamentoDbId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, dadosAdicionais }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[avancarEtapa] Falha ao avançar para "${status}":`, err);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[avancarEtapa] Erro de rede ao avançar para "${status}":`, err);
    return false;
  }
}

export function getDbIdFromLocalStorage({
  destino,
  facility,
  motoristaId,
}: {
  destino: string;
  facility: string;
  motoristaId: string;
}): string | null {
  try {
    const chave = `carregamentos_${destino}_${facility}`;
    const dados = JSON.parse(localStorage.getItem(chave) || '{}');
    return dados[motoristaId]?._dbId ?? null;
  } catch {
    return null;
  }
}

export function salvarDbIdNoLocalStorage({
  destino,
  facility,
  motoristaId,
  dbId,
}: {
  destino: string;
  facility: string;
  motoristaId: string;
  dbId: string;
}): void {
  try {
    const chave = `carregamentos_${destino}_${facility}`;
    const dados = JSON.parse(localStorage.getItem(chave) || '{}');
    dados[motoristaId] = { ...dados[motoristaId], _dbId: dbId };
    localStorage.setItem(chave, JSON.stringify(dados));
  } catch (err) {
    console.error('[salvarDbId] Erro:', err);
  }
}