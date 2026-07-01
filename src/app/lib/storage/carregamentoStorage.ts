'use client';

/**
 * carregamentoStorage.ts
 *
 * Funções utilitárias para persistência de estado de carregamentos
 * no localStorage do navegador.
 *
 * RESPONSABILIDADES:
 *   - Leitura e escrita do estado local dos cards do Kanban
 *   - Comunicação com a API via avancarEtapa()
 *   - "Finalizar Carregamento" opera APENAS aqui, sem escrita no banco
 *   - "Not Used" persiste localmente E chama a API
 */

import type { StatusCarregamento } from '@/app/lib/utils/status';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DadosCarregamentoLocal {
  _dbId:           string;
  status?:         StatusCarregamento;
  finalizadoEm?:   string;
  canceladoEm?:    string;
  statusAnterior?: StatusCarregamento;
  [key: string]:   unknown;
}

// ─── Chave do localStorage ────────────────────────────────────────────────────

function montarChave(destino: string, facility: string): string {
  return `carregamentos_${destino}_${facility}`;
}

function lerArmazenamento(destino: string, facility: string): Record<string, DadosCarregamentoLocal> {
  try {
    return JSON.parse(localStorage.getItem(montarChave(destino, facility)) || '{}');
  } catch {
    return {};
  }
}

function escreverArmazenamento(
  destino: string,
  facility: string,
  dados: Record<string, DadosCarregamentoLocal>
): void {
  try {
    localStorage.setItem(montarChave(destino, facility), JSON.stringify(dados));
  } catch (err) {
    console.error('[carregamentoStorage] Erro ao escrever no localStorage:', err);
  }
}

// ─── Leitura ──────────────────────────────────────────────────────────────────

export function getDbId({
  destino, facility, motoristaId,
}: { destino: string; facility: string; motoristaId: string }): string | null {
  return lerArmazenamento(destino, facility)[motoristaId]?._dbId ?? null;
}

export function getDadosMotorista({
  destino, facility, motoristaId,
}: { destino: string; facility: string; motoristaId: string }): DadosCarregamentoLocal | null {
  return lerArmazenamento(destino, facility)[motoristaId] ?? null;
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

/**
 * Salva ou atualiza campos de um motorista no localStorage com merge.
 */
export function salvarDadosMotorista({
  destino, facility, motoristaId, dados,
}: {
  destino: string;
  facility: string;
  motoristaId: string;
  dados: Partial<DadosCarregamentoLocal>;
}): void {
  const armazenado = lerArmazenamento(destino, facility);
  armazenado[motoristaId] = { ...armazenado[motoristaId], ...dados };
  escreverArmazenamento(destino, facility, armazenado);
}

export function salvarDbId({
  destino, facility, motoristaId, dbId,
}: { destino: string; facility: string; motoristaId: string; dbId: string }): void {
  salvarDadosMotorista({ destino, facility, motoristaId, dados: { _dbId: dbId } });
}

// ─── Ações do Kanban ──────────────────────────────────────────────────────────

/**
 * "Finalizar Carregamento"
 *
 * Marca o motorista como liberado APENAS no localStorage.
 * Não faz nenhuma chamada à API.
 * Pré-condição: saidaLiberada e lacreTraseiro já foram preenchidos.
 */
export function finalizarCarregamentoLocal({
  destino, facility, motoristaId,
}: { destino: string; facility: string; motoristaId: string }): void {
  salvarDadosMotorista({
    destino,
    facility,
    motoristaId,
    dados: {
      status:       'liberado',
      finalizadoEm: new Date().toISOString(),
    },
  });
}

/**
 * "Not Used"
 *
 * 1. Persiste status not_used no localStorage com o statusAnterior
 * 2. Chama a API para persistir no banco
 *
 * Retorna true se a API respondeu com sucesso, false caso contrário.
 * O estado local é atualizado independentemente do resultado da API
 * para garantir resposta imediata na UI.
 */
export async function marcarNotUsed({
  destino,
  facility,
  motoristaId,
  carregamentoDbId,
  statusAtual,
  motivoCancelamento,
}: {
  destino: string;
  facility: string;
  motoristaId: string;
  carregamentoDbId: string;
  statusAtual: StatusCarregamento;
  motivoCancelamento?: string;
}): Promise<boolean> {
  // Atualiza o localStorage imediatamente para feedback visual instantâneo
  salvarDadosMotorista({
    destino,
    facility,
    motoristaId,
    dados: {
      status:          'not_used',
      statusAnterior:  statusAtual,
      canceladoEm:     new Date().toISOString(),
    },
  });

  // Persiste no banco em segundo plano
  return avancarEtapa({
    carregamentoDbId,
    status: 'not_used',
    dadosAdicionais: {
      statusAnterior: statusAtual,
      ...(motivoCancelamento ? { motivoCancelamento } : {}),
    },
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
 */
export async function avancarEtapa({
  carregamentoDbId,
  status,
  dadosAdicionais,
}: AvancarEtapaParams): Promise<boolean> {
  try {
    const res = await fetch(`/api/carregamento/${carregamentoDbId}/status`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status, dadosAdicionais }),
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