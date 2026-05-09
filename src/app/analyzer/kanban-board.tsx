"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MapPin, User } from "lucide-react";

const INTERVALO = 10000;

type StatusCarregamento = "aguardando" | "emDoca" | "carregando" | "finalizado";

interface MotoristaKanban {
  motoristaId: string;
  nome: string;
  destino: string;
  doca?: string;
  status: StatusCarregamento;
  timestamps?: Record<string, string>;
}

const colunas: { status: StatusCarregamento; titulo: string; cor: string }[] = [
  { status: "aguardando", titulo: "🕒 Aguardando", cor: "border-amber-400" },
  { status: "emDoca", titulo: "📥 Em Doca", cor: "border-blue-500" },
  { status: "carregando", titulo: "🚛 Carregando", cor: "border-orange-500" },
  { status: "finalizado", titulo: "✅ Finalizado", cor: "border-green-500" },
];

function calcularTempo(status: StatusCarregamento, timestamps?: Record<string, string>): string {
  if (!timestamps) return "00:00";
  let inicio: string | undefined;
  switch (status) {
    case "aguardando": inicio = timestamps.aguardando; break;
    case "emDoca": inicio = timestamps.emDoca; break;
    case "carregando": inicio = timestamps.carregando; break;
    case "finalizado": return "—";
  }
  if (!inicio) return "00:00";
  const agora = new Date().getTime();
  const inicioMs = new Date(inicio).getTime();
  const diff = Math.max(0, Math.floor((agora - inicioMs) / 1000));
  const h = Math.floor(diff / 3600).toString().padStart(2, '0');
  const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
  const s = (diff % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

interface KanbanBoardProps {
  dataInicio: string;
  dataFim: string;
  facility?: string;
}

export default function KanbanBoard({ dataInicio, dataFim, facility }: KanbanBoardProps) {
  const [motoristas, setMotoristas] = useState<MotoristaKanban[]>([]);

  const buscarDados = async () => {
    try {
      const params = new URLSearchParams({
        limit: "500",
        dataInicio,
        dataFim,
      });
      if (facility) {
        params.append("facility", facility);
      }
      const res = await fetch(`/api/carregamento?${params}`);
      const json = await res.json();
      if (json.success) {
        setMotoristas(
          json.data.map((c: any) => ({
            motoristaId: c.motoristaId,
            nome: c.motorista?.nome || "Não identificado",
            destino: c.destino,
            doca: c.doca,
            status: c.status || "aguardando",
            timestamps: c.timestamps,
          }))
        );
      }
    } catch (error) {
      console.error("Erro ao buscar dados do Kanban", error);
    }
  };

  useEffect(() => {
    buscarDados();
    const id = setInterval(buscarDados, INTERVALO);
    return () => clearInterval(id);
  }, [dataInicio, dataFim, facility]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {colunas.map((col) => {
        const itens = motoristas.filter((m) => m.status === col.status);
        return (
          <div key={col.status} className="bg-muted/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h3
                className={`font-semibold text-sm flex items-center gap-2 border-l-4 pl-2 ${col.cor}`}
              >
                {col.titulo}
              </h3>
              <Badge variant="secondary">{itens.length}</Badge>
            </div>
            <ScrollArea className="h-[500px] pr-2">
              <div className="space-y-2">
                {itens.map((m) => (
                  <Card
                    key={m.motoristaId}
                    className="cursor-default hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{m.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {m.destino}
                      </div>
                      {m.doca && <Badge variant="outline">Doca {m.doca}</Badge>}
                      <div className="flex items-center gap-1 text-xs mt-1">
                        <Clock className="h-3 w-3" />
                        <span className="tabular-nums">
                          {calcularTempo(col.status, m.timestamps)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}