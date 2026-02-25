export interface Motorista {
  id: string;
  nome: string;
  retorno: string;
  destino: string;        // sempre presente (vem do cadastro)
  status: 'aguardando' | 'descarregando' | 'descarregado';
  dataChegada: string;
  horaChegada: string;
  timestampChegada: string;
  tempoFila: number;
  tempoDescarga: number;
  timestampInicioDescarga?: string;
  timestampFimDescarga?: string;
  gaiolas?: number;
  palets?: number;
  mangas?: number;
  doca?: number | null;
}