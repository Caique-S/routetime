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

export function getNomeDestino(codigo: string): string {
  return DESTINO_NOMES[codigo] ?? codigo;
}

export function getCodigoDestino(nome: string): string {
  const entrada = Object.entries(DESTINO_NOMES).find(([, v]) => v === nome);
  return entrada ? entrada[0] : nome;
}

export function getCodigosDestinos(): string[] {
  return Object.keys(DESTINO_NOMES);
}