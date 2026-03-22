/*
export interface Motorista {
  id: string;
  nome: string;
  retorno: string;
  destino: string;        // sempre presente (vem do cadastro)
  status: 'em_fila' | 'descarregando' | 'descarregado';
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

*/

export interface Motorista {
  id: string;
  cpf?: string;                         // CPF do motorista
  nome: string;
  chave_identificacao?: string;
  destino?: string;
  retorno?: string;
  status: 'em_fila' | 'descarregando' | 'descarregado';
  tipo?: string;
  dataChegada?: string;                 // "DD/MM/YYYY"
  horaChegada?: string;                 // "HH:MM:SS"
  timestampChegada?: string | Date;
  timestampInicioDescarga?: string | Date | null;
  timestampFimDescarga?: string | Date | null;
  tempoFila?: number;                   // segundos
  tempoDescarga?: number;               // segundos
  doca?: string | null;
  docaNotifiedAt?: string | Date | null;
  gaiolas?: number | null;
  palets?: number | null;
  mangas?: number | null;
  updatedAt?: string | Date;
}