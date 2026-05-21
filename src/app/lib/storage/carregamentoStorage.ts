'use client';

/**
 * carregamentoStorage.ts
 *
 * Funções utilitárias para persistência de estado de carregamentos
 * no localStorage do navegador.
 *
 * RENOMEADO de useEtapaCarregamento.ts:
 *   - O arquivo original tinha nome de hook React mas não usava nenhum hook.
 *   - Mantido como módulo utilitário puro ('use client' para Next.js).
 *
 * IMPORTANTE:
 *   - O localStorage é a fonte de verdade para o estado visual do Kanban.
 *   - "Finalizar Carregamento" opera APENAS aqui, sem escrita no banco.
 *   - Somente avancarEtapa() se comunica com a API.
 */

import type { StatusCarregamento } from '../utils/status';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DadosCarregamentoLocal {
  _dbId: string;
  status?: StatusCarregamento;
  [key: string]: unknown;
}

// ─── Chave do localStorage ────────────────────────────────────────────────────

function montarChave(destino: string, facility: string): string {
  return `carregamentos_${destino}_${facility}`;
}

// ─── Leitura ──────────────────────────────────────────────────────────────────

/**
 * Retorna o _id do MongoDB de um motorista salvo no localStorage.
 * Retorna null se não encontrado ou em caso de erro de parse.
 */
export function getDbId({
  destino,
  facility,
  motoristaId,
}: {
  destino: string;
  facility: string;
  motoristaId: string;
}): string | null {
  try {
    const chave = montarChave(destino, facility);
    const dados: Record<string, DadosCarregamentoLocal> = JSON.parse(
      localStorage.getItem(chave) || '{}'
    );
    return dados[motoristaId]?._dbId ?? null;
  } catch {
    return null;
  }
}

/**
 * Retorna todos os dados de um motorista salvos no localStorage.
 * Retorna null se não encontrado.
 */
export function getDadosMotorista({
  destino,
  facility,
  motoristaId,
}: {
  destino: string;
  facility: string;
  motoristaId: string;
}): DadosCarregamentoLocal | null {
  try {
    const chave = montarChave(destino, facility);
    const dados: Record<string, DadosCarregamentoLocal> = JSON.parse(
      localStorage.getItem(chave) || '{}'
    );
    return dados[motoristaId] ?? null;
  } catch {
    return null;
  }
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

/**
 * Salva ou atualiza campos de um motorista no localStorage.
 * Faz merge com os dados existentes (não sobrescreve o objeto inteiro).
 */
export function salvarDadosMotorista({
  destino,
  facility,
  motoristaId,
  dados,
}: {
  destino: string;
  facility: string;
  motoristaId: string;
  dados: Partial<DadosCarregamentoLocal>;
}): void {
  try {
    const chave = montarChave(destino, facility);
    const armazenado: Record<string, DadosCarregamentoLocal> = JSON.parse(
      localStorage.getItem(chave) || '{}'
    );
    armazenado[motoristaId] = { ...armazenado[motoristaId], ...dados };
    localStorage.setItem(chave, JSON.stringify(armazenado));
  } catch (err) {
    console.error('[carregamentoStorage] Erro ao salvar dados do motorista:', err);
  }
}

/**
 * Atalho: salva apenas o _dbId de um motorista.
 */
export function salvarDbId({
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
  salvarDadosMotorista({ destino, facility, motoristaId, dados: { _dbId: dbId } });
}

/**
 * Marca um motorista como finalizado APENAS no localStorage.
 * Não faz nenhuma chamada à API — comportamento do botão "Finalizar Carregamento".
 */
export function finalizarCarregamentoLocal({
  destino,
  facility,
  motoristaId,
}: {
  destino: string;
  facility: string;
  motoristaId: string;
}): void {
  salvarDadosMotorista({
    destino,
    facility,
    motoristaId,
    dados: { status: 'liberado', finalizadoEm: new Date().toISOString() },
  });
}

// ─── Comunicação com a API ────────────────────────────────────────────────────

interface AvancarEtapaParams {
  carregamentoDbId: string;
  status: StatusCarregamento;
  dadosAdicionais?: Record<string, unknown>;
}

/**
 * Avança a etapa de um carregamento na API.
 * Retorna true em caso de sucesso, false em caso de falha.
 *
 * NOTA: Após chamar esta função, salvar o novo status no localStorage
 * via salvarDadosMotorista() para manter o estado local sincronizado.
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