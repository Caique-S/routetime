const MAPEAMENTO: Record<string, string> = {
  EBA14: "Serrinha",
  EBA4: "Santo Antônio de Jesus",
  EBA19: "Itaberaba",
  EBA3: "Jacobina",
  EBA2: "Pombal",
  EBA16: "Senhor do Bonfim",
  EBA21: "Seabra",
  EBA6: "Juazeiro",
  EBA29: "Valença",
};

export function getNomeDestino(codigo: string): string {
  return MAPEAMENTO[codigo] || codigo;
}