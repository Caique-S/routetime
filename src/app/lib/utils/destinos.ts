/**
 * destinos.ts
 *
 * Fonte única para mapeamento entre códigos de rota (ex: "EBA14")
 * e nomes amigáveis de cidades (ex: "Serrinha").
 *
 * Anteriormente duplicado em:
 *   - app/api/fila-destino/route.ts  (DESTINO_NOMES)
 *   - app/carregamento/page.tsx      (getNomeDestino / getCodigoDestino)
 */

export const DESTINO_NOMES: Record<string, string> = {
  EBA14: 'Serrinha',
  EBA4:  'Santo Antônio de Jesus',
  EBA19: 'Itaberaba',
  EBA3:  'Jacobina',
  EBA2:  'Pombal',
  EBA16: 'Senhor do Bonfim',
  EBA21: 'Seabra',
  EBA6:  'Juazeiro',
  EBA29: 'Valença',
};

/**
 * Retorna o nome amigável de um destino a partir do código de rota.
 * Se o código não for encontrado, retorna o próprio código como fallback.
 *
 * Exemplo: getNomeDestino("EBA14") → "Serrinha"
 */
export function getNomeDestino(codigo: string): string {
  return DESTINO_NOMES[codigo] ?? codigo;
}

/**
 * Retorna o código de rota a partir do nome amigável.
 * Se o nome não for encontrado, retorna o próprio nome como fallback.
 *
 * Exemplo: getCodigoDestino("Serrinha") → "EBA14"
 */
export function getCodigoDestino(nome: string): string {
  const entrada = Object.entries(DESTINO_NOMES).find(([, v]) => v === nome);
  return entrada ? entrada[0] : nome;
}

/**
 * Retorna todos os códigos de destino cadastrados.
 */
export function getCodigosDestinos(): string[] {
  return Object.keys(DESTINO_NOMES);
}