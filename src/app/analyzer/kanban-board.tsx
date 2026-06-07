"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MapPin, User, Package, Box } from "lucide-react";
import {
  formatarHoraBrasil,
  formatarDataBrasil,
} from "../lib/utils/dateUtils";
import { getNomeDestino } from "../lib/utils/destinos";
import { StatusCarregamento, COLUNAS_KANBAN, COLUNA_LABELS, STATUS_BADGE, STATUS_LABELS } from "../lib/utils/status";
import { useLiveTimer } from "../hooks/useLiveTimer";
const INTERVALO_POLLING = 10000; // 10s

// Interface simplificada para o frontend (alinhada com ICarregamento)
interface MotoristaKanban {
  motoristaId: string;
  nome: string;
  destino: string;
  doca?: string;
  status: StatusCarregamento;
  timestamp?: Record<string, string>; // ISO
  carga?: {
    gaiolas: number;
    volumosos: number;
    manga: number;
  };
}

// Estilos visuais para cada coluna
const COLUMN_STYLES: Record<StatusCarregamento, { titulo: string; cor: string }> = {
  aguardando: { titulo: "🕒 Aguardando", cor: "border-amber-400" },
  emDoca:     { titulo: "📥 Em Doca",    cor: "border-blue-500" },
  carregando: { titulo: "🚛 Carregando", cor: "border-orange-500" },
  liberado:   { titulo: "✅ Liberado",   cor: "border-green-500" },
  not_used:   { titulo: "⚠️ Not Used",  cor: "border-red-400" },
};

// Componente de Card individual (estilo similar ao MotoristaCard)
function KanbanCard({ motorista, columnStatus }: { motorista: MotoristaKanban; columnStatus: StatusCarregamento }) {
  const destinoNome = getNomeDestino(motorista.destino);
  const temCarga = motorista.carga &&
    (motorista.carga.gaiolas > 0 || motorista.carga.volumosos > 0 || motorista.carga.manga > 0);

  // Cores do badge conforme status.ts
  const badgeCor = {
    aguardando: "bg-yellow-100 text-yellow-800",
    emDoca:     "bg-blue-100 text-blue-800",
    carregando: "bg-orange-100 text-orange-800",
    liberado:   "bg-green-100 text-green-800",
    not_used:   "bg-red-100 text-red-800",
  }[columnStatus];

 /* const formatarTempo = (segundos: number): string => {
  if (!segundos || segundos < 0) return '00:00:00';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};
*/

  const borderCor = COLUMN_STYLES[columnStatus]?.cor ?? "border-gray-300";

  return (
    <Card className={`cursor-default hover:shadow-md transition-shadow border-l-4 ${borderCor}`}>
      <CardContent className="p-3 space-y-2">
        {/* Nome e status */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{motorista.nome}</span>
          </div>
          <Badge className={badgeCor}>{STATUS_LABELS[columnStatus] || columnStatus}</Badge>
        </div>

        {/* Destino */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className=" font-mono text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{motorista.motoristaId.split('_')[0]}</span>
          <span className="mx-1 text-gray-400">•</span>
          {destinoNome}
        </div>

        {/* Doca */}
        {motorista.doca && (
          <Badge variant="outline" className="font-mono text-xs">
            Doca {motorista.doca}
          </Badge>
        )}

        {/* Timer ao vivo 
        <div className="flex items-center gap-1 text-xs mt-1">
          <Clock className="h-3 w-3" />
          <span className=" font-mono text-xs">{formatarTempo(useLiveTimer(
            motorista.timestamp?.aguardando))}</span>
        </div>
              
        */}

        {/* Carga (se disponível) */}
        {temCarga && (
          <div className="flex flex-row gap-3 text-center bg-muted/30 rounded-md p-2 mt-1">
            <div className="flex flex-row gap-1 items-center">
              <Box className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-semibold">{motorista.carga!.gaiolas}{"  |"}</span>
              <span className="text-[10px] text-muted-foreground">Gaiolas</span>
            </div>
            <div className="flex flex-row gap-1 items-center">
              <Box className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-semibold">{motorista.carga!.volumosos}{"  |"}</span>
              <span className="text-[10px] text-muted-foreground">Volumosos</span>
            </div>
            <div className="flex flex-row gap-1 items-center">
              <Box className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-semibold">{motorista.carga!.manga}{"  |"}</span>
              <span className="text-[10px] text-muted-foreground">Mangas</span>
            </div>
          </div>
        )}

        {/* Linha do tempo (horários) */}
        {motorista.timestamp && (
          <div className=" flex justify-start gap-4 text-xs text-muted-foreground  ">
            <div className="flex flex-col gap-1 items-start">
            {motorista.timestamp.aguardando && (
              <div className="flex flex-row items-start justify-center">
                <span className="font-mono">{"🕒 Chegada: "}</span>
                <span>{formatarHoraBrasil(motorista.timestamp.aguardando)}</span>
              </div>
            )}
            {motorista.timestamp.emDoca && (
              <div className="flex flex-row items-start justify-center">
                <span className="font-mono">{"📥 Em doca: "}</span>
                <span>{formatarHoraBrasil(motorista.timestamp.emDoca)}</span> 
                </div>
            )}
            </div>
            <div className="flex flex-col gap-1 items-start ">
            {motorista.timestamp.carregando && (
              <div className="flex flex-row items-start justify-center">
                <span className="font-mono">{"🚛 Início carreg.: "}</span>
                <span>{formatarHoraBrasil(motorista.timestamp.carregando)}</span>
              </div>
            )}
            {motorista.timestamp.liberado && (
              <div className="flex flex-row items-start justify-center">
                <span className="font-mono">{"✅ Liberado: "}</span>
                <span>{formatarHoraBrasil(motorista.timestamp.liberado)}</span>
              </div>
            )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente principal KanbanBoard
interface KanbanBoardProps {
  dataInicio: string; // YYYY-MM-DD
  dataFim: string;
  facility?: string;
}

export default function KanbanBoard({ dataInicio, dataFim, facility }: KanbanBoardProps) {
  const [motoristas, setMotoristas] = useState<MotoristaKanban[]>([]);

  const buscarDados = async () => {
    try {
      // Converte datas de YYYY-MM-DD para DD/MM/YYYY para a API
      const dataInicioBR = formatarDataBrasil(dataInicio);
      const dataFimBR = formatarDataBrasil(dataFim);

      const params = new URLSearchParams({
        limit: "500",
        dataInicioBR,
        dataFimBR,
      });
      if (facility) params.append("facility", facility);

      const res = await fetch(`/api/carregamento?${params}`);
      const json = await res.json();
      if (json.success) {
        setMotoristas(
          json.data.map((c: any) => ({
            motoristaId: c.motoristaId,
            nome: c.motorista?.nome ?? c.nomeMotorista ?? "Não identificado",
            destino: c.destino,
            doca: c.doca,
            status: c.status ?? "aguardando",
            timestamp: c.timestamp,
            carga: c.carga,
          }))
        );
      }
    } catch (error) {
      console.error("Erro ao buscar dados do Kanban", error);
    }
  };

  // Polling a cada 10s
  useEffect(() => {
    buscarDados();
    const id = setInterval(buscarDados, INTERVALO_POLLING);
    return () => clearInterval(id);
  }, [dataInicio, dataFim, facility]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUNAS_KANBAN.map((status) => {
        const colStyle = COLUMN_STYLES[status];
        const itens = motoristas.filter((m) => m.status === status);
        return (
          <div key={status} className="bg-muted/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold text-sm flex items-center gap-2 border-l-4 pl-2 ${colStyle.cor}`}>
                {colStyle.titulo}
              </h3>
              <Badge variant="secondary">{itens.length}</Badge>
            </div>
            <ScrollArea className="h-[500px] pr-2">
              <div className="space-y-2">
                {itens.map((m) => (
                  <KanbanCard key={m.motoristaId} motorista={m} columnStatus={status} />
                ))}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}