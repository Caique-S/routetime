"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MapPin, User } from "lucide-react";


const TZ_BRASIL = "America/Sao_Paulo";

function formatarHoraBrasil(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      timeZone: TZ_BRASIL,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

const INTERVALO = 10000;

type StatusCarregamento = "aguardando" | "emDoca" | "carregando" | "liberado";

interface MotoristaKanban {
  motoristaId: string;
  nome: string;
  destino: string;
  doca?: string;
  status: StatusCarregamento;
  timestamps?: Record<string, string>; // valores em UTC ISO
}

const colunas: { status: StatusCarregamento; titulo: string; cor: string }[] = [
  { status: "aguardando",  titulo: "🕒 Aguardando", cor: "border-amber-400"  },
  { status: "emDoca",      titulo: "📥 Em Doca",    cor: "border-blue-500"   },
  { status: "carregando",  titulo: "🚛 Carregando", cor: "border-orange-500" },
  { status: "liberado",  titulo: "✅ Liberado",  cor: "border-green-500"  },
];

function calcularTempo(
  status: StatusCarregamento,
  timestamps?: Record<string, string>
): string {
  if (!timestamps) return "00:00:00";

  // Para "liberado", mostra o tempo total (aguardando → liberado)
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

  // Para etapas ativas, tempo desde o início da etapa atual até agora
  const inicio = timestamps[status];
  if (!inicio) return "00:00:00";

  const diffSeg = Math.max(
    0,
    Math.floor((Date.now() - new Date(inicio).getTime()) / 1000)
  );
  return formatarSegundos(diffSeg);
}

function formatarSegundos(segundos: number): string {
  const h = Math.floor(segundos / 3600).toString().padStart(2, "0");
  const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, "0");
  const s = (segundos % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ─────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  dataInicio: string;  // "YYYY-MM-DD" — filtro de data
  dataFim: string;     // "YYYY-MM-DD"
  facility?: string;
}

export default function KanbanBoard({ dataInicio, dataFim, facility }: KanbanBoardProps) {
  const [motoristas, setMotoristas] = useState<MotoristaKanban[]>([]);
  // ticker para forçar re-render a cada segundo nos timers ao vivo
  const [, setTick] = useState(0);

  const buscarDados = async () => {
    try {
      const params = new URLSearchParams({ limit: "500", dataInicio, dataFim });
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
          }))
        );
      }
    } catch (error) {
      console.error("Erro ao buscar dados do Kanban", error);
    }
  };

  // Polling de dados a cada 10s
  useEffect(() => {
    buscarDados();
    const id = setInterval(buscarDados, INTERVALO);
    return () => clearInterval(id);
  }, [dataInicio, dataFim, facility]);

  // Ticker a cada 1s para atualizar os contadores ao vivo
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {colunas.map((col) => {
        const itens = motoristas.filter((m) => m.status === col.status);
        return (
          <div key={col.status} className="bg-muted/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold text-sm flex items-center gap-2 border-l-4 pl-2 ${col.cor}`}>
                {col.titulo}
              </h3>
              <Badge variant="secondary">{itens.length}</Badge>
            </div>

            <ScrollArea className="h-[500px] pr-2">
              <div className="space-y-2">
                {itens.map((m) => (
                  <Card key={m.motoristaId} className="cursor-default hover:shadow-md transition-shadow">
                    <CardContent className="p-3 space-y-1.5">
                      {/* Nome */}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{m.nome}</span>
                      </div>

                      {/* Destino */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {m.destino}
                      </div>

                      {/* Doca */}
                      {m.doca && <Badge variant="outline">Doca {m.doca}</Badge>}

                      {/* Timer ao vivo — duração na etapa atual */}
                      <div className="flex items-center gap-1 text-xs mt-1">
                        <Clock className="h-3 w-3" />
                        <span className="tabular-nums font-mono">
                          {calcularTempo(col.status, m.timestamps)}
                        </span>
                      </div>

                      {/* Horários das etapas em Brasília (UTC-3) */}
                      {m.timestamps && (
                        <div className="mt-2 space-y-0.5 text-xs text-muted-foreground border-t pt-1.5">
                          {m.timestamps.aguardando && (
                            <p>🕒 Chegada: {formatarHoraBrasil(m.timestamps.aguardando)}</p>
                          )}
                          {m.timestamps.emDoca && (
                            <p>📥 Em doca: {formatarHoraBrasil(m.timestamps.emDoca)}</p>
                          )}
                          {m.timestamps.carregando && (
                            <p>🚛 Início: {formatarHoraBrasil(m.timestamps.carregando)}</p>
                          )}
                          {m.timestamps.liberado && (
                            <p>✅ Fim: {formatarHoraBrasil(m.timestamps.liberado)}</p>
                          )}
                        </div>
                      )}
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