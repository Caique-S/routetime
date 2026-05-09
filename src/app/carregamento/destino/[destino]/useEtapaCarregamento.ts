'use client';

export type StatusCarregamento =
  | 'aguardando'
  | 'emDoca'
  | 'carregando'
  | 'finalizado';

interface AvancarEtapaParams {
  /** _id do documento no MongoDB (salvo como _dbId no localStorage) */
  carregamentoDbId: string;
  /** Próxima etapa */
  status: StatusCarregamento;
  /** Campos extras para gravar junto (ex: doca, carga, lacres, horarios) */
  dadosAdicionais?: Record<string, any>;
}

/**
 * Avança uma etapa do carregamento via PATCH e registra o timestamp no banco.
 *
 * Uso:
 *   const ok = await avancarEtapa({ carregamentoDbId: dbId, status: 'emDoca', dadosAdicionais: { doca: '12' } });
 *
 * Retorna true se bem-sucedido, false em caso de erro.
 */
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

/**
 * Lê o _dbId de um carregamento no localStorage.
 *
 * Uso:
 *   const dbId = getDbId({ destino: 'EBA14', facility: 'XPT', motoristaId: '...' });
 */
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

/**
 * Salva o _dbId retornado pelo banco no localStorage junto aos dados do carregamento.
 */
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