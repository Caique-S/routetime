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

const INTERVALO_POLLING = 10000; // 10s

// Interface simplificada para o frontend (alinhada com ICarregamento)
interface MotoristaKanban {
  motoristaId: string;
  nome: string;
  destino: string;
  doca?: string;
  status: StatusCarregamento;
  timestamps?: Record<string, string>; // ISO
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

// Formata segundos em HH:MM:SS
function formatarSegundos(segundos: number): string {
  const h = Math.floor(segundos / 3600).toString().padStart(2, "0");
  const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, "0");
  const s = (segundos % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Calcula tempo decorrido em uma etapa ou tempo total (liberado)
function calcularTempo(
  status: StatusCarregamento,
  timestamps?: Record<string, string>
): string {
  if (!timestamps) return "00:00:00";

  if (status === "liberado") {
    const inicio = timestamps.aguardando;
    const fim = timestamps.liberado;
    if (!inicio || !fim) return "—";
    const diffSeg = Math.max(
      0,
      Math.floor((new Date(fim).getTime() - new Date(inicio).getTime()) / 1000)
    );
    return formatarSegundos(diffSeg);
  }

  const inicio = timestamps[status];
  if (!inicio) return "00:00:00";
  const diffSeg = Math.max(
    0,
    Math.floor((Date.now() - new Date(inicio).getTime()) / 1000)
  );
  return formatarSegundos(diffSeg);
}

// Componente de Card individual (estilo similar ao MotoristaCard)
function KanbanCard({ motorista, columnStatus }: { motorista: MotoristaKanban; columnStatus: StatusCarregamento }) {
  const destinoNome = getNomeDestino(motorista.destino);
  const tempo = calcularTempo(columnStatus, motorista.timestamps);
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {destinoNome}
        </div>

        {/* Doca */}
        {motorista.doca && (
          <Badge variant="outline" className="text-xs">
            Doca {motorista.doca}
          </Badge>
        )}

        {/* Timer ao vivo */}
        <div className="flex items-center gap-1 text-xs mt-1">
          <Clock className="h-3 w-3" />
          <span className="tabular-nums font-mono font-bold text-base">{tempo}</span>
        </div>

        {/* Carga (se disponível) */}
        {temCarga && (
          <div className="grid grid-cols-3 gap-1 text-center bg-muted/30 rounded-md p-2 mt-1">
            <div className="flex flex-col items-center">
              <Package className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-semibold">{motorista.carga!.gaiolas}</span>
              <span className="text-[10px] text-muted-foreground">Gaiolas</span>
            </div>
            <div className="flex flex-col items-center">
              <Box className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-semibold">{motorista.carga!.volumosos}</span>
              <span className="text-[10px] text-muted-foreground">Volumosos</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold">{motorista.carga!.manga}</span>
              <span className="text-[10px] text-muted-foreground">Manga</span>
            </div>
          </div>
        )}

        {/* Linha do tempo (horários) */}
        {motorista.timestamps && (
          <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground border-t pt-1.5">
            {motorista.timestamps.aguardando && (
              <p>🕒 Chegada: {formatarHoraBrasil(motorista.timestamps.aguardando)}</p>
            )}
            {motorista.timestamps.emDoca && (
              <p>📥 Em doca: {formatarHoraBrasil(motorista.timestamps.emDoca)}</p>
            )}
            {motorista.timestamps.carregando && (
              <p>🚛 Início carreg.: {formatarHoraBrasil(motorista.timestamps.carregando)}</p>
            )}
            {motorista.timestamps.liberado && (
              <p>✅ Liberado: {formatarHoraBrasil(motorista.timestamps.liberado)}</p>
            )}
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
  const [, setTick] = useState(0); // força re-render a cada segundo

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
            timestamps: c.timestamps,
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

  // Ticker para atualizar os contadores ao vivo a cada 1s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

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