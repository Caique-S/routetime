"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Box, Calendar} from "lucide-react";
import {
  formatarHoraBrasil,
  formatarDataBrasil,
  getTodayBrasilia,
  criarIntervaloDia,
} from "../lib/utils/dateUtils";
import { getNomeDestino } from "../lib/utils/destinos";
import { StatusCarregamento, COLUNAS_KANBAN, COLUNA_LABELS, STATUS_BADGE, STATUS_LABELS } from "../lib/utils/status";
import { ICarregamento } from "@/app/lib/models/carregamento"


const INTERVALO_POLLING = 10000; // 10s

const COLUMN_STYLES: Record<StatusCarregamento, { titulo: string; cor: string }> = {
  aguardando: { titulo: "🕒 Aguardando", cor: "border-amber-400" },
  emDoca: { titulo: "📥 Em Doca", cor: "border-blue-500" },
  carregando: { titulo: "🚛 Carregando", cor: "border-orange-500" },
  liberado: { titulo: "✅ Liberado", cor: "border-green-500" },
  not_used: { titulo: "⚠️ Not Used", cor: "border-red-400" },
};



const obterDataLocalSubtraida = (diasParaSubtrair: number) => {

  const hojeBr = getTodayBrasilia(); 
  const [dia, mes, ano] = hojeBr.split("/").map(Number);
  
  const data = new Date(ano, mes - 1, dia, 12, 0, 0);
  data.setDate(data.getDate() - diasParaSubtrair);
  
  const yAno = data.getFullYear();
  const yMes = String(data.getMonth() + 1).padStart(2, "0");
  const yDia = String(data.getDate()).padStart(2, "0");
  
  return `${yAno}-${yMes}-${yDia}`;
};

function KanbanCard({ data }: { data: ICarregamento; }) {
  const destinoNome = getNomeDestino(data.destino);
  const temCarga = data.carga &&
    (data.carga.gaiolas > 0 || data.carga.volumosos > 0 || data.carga.manga > 0);

  const badgeCor = {
    aguardando: "bg-yellow-100 text-yellow-800",
    emDoca: "bg-blue-100 text-blue-800",
    carregando: "bg-orange-100 text-orange-800",
    liberado: "bg-green-100 text-green-800",
    not_used: "bg-red-100 text-red-800",
  }[data.status];

  const borderCor = COLUMN_STYLES[data.status]?.cor ?? "border-gray-300";

  return (
    <Card className={`cursor-default hover:shadow-md transition-shadow border-l-4 ${borderCor}`}>
      <CardContent className="p-3 space-y-2">
        {/* Nome e status */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium font-semibold text-gray-800 text-xs">{data.motorista?.nome ?? "Não identificado"}</span>
          </div>
          <Badge className={badgeCor}>{STATUS_LABELS[data.status]}</Badge>
        </div>

        {/* Destino */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className=" font-mono text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{data.motoristaId.split('_')[0]}</span>
          <span className="mx-1 text-gray-400">•</span>
          {destinoNome}
        </div>

        {/* Doca */}
        {data.doca && (
          <Badge variant="outline" className="font-mono text-xs">
            Doca {data.doca}
          </Badge>
        )}


        {/* Carga (se disponível) */}
        {temCarga && (
          <div className="flex flex-row gap-3 text-center bg-muted/30 rounded-md p-2 mt-1">
            <div className="flex flex-row gap-1 items-center">
              <Box className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-semibold">{data.carga!.gaiolas}{"  |"}</span>
              <span className="text-[10px] text-muted-foreground">Gaiolas</span>
            </div>
            <div className="flex flex-row gap-1 items-center">
              <Box className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-semibold">{data.carga!.volumosos}{"  |"}</span>
              <span className="text-[10px] text-muted-foreground">Volumosos</span>
            </div>
            <div className="flex flex-row gap-1 items-center">
              <Box className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-semibold">{data.carga!.manga}{"  |"}</span>
              <span className="text-[10px] text-muted-foreground">Mangas</span>
            </div>
          </div>
        )}

        {/* Linha do tempo (horários) */}
        {data.timestamp && (
          <div className=" flex justify-start gap-4 text-xs text-muted-foreground  ">
            <div className="flex flex-col gap-1 items-start">
              {data.timestamp.aguardando && (
                <div className="flex flex-row items-start justify-center">
                  <span className="font-mono">{"🕒 Chegada: "}</span>
                  <span>{formatarHoraBrasil(data.timestamp.aguardando)}</span>
                </div>
              )}
              {data.timestamp.emDoca && (
                <div className="flex flex-row items-start justify-center">
                  <span className="font-mono">{"📥 Em doca: "}</span>
                  <span>{formatarHoraBrasil(data.timestamp.emDoca)}</span>
                </div>
              )}
              {data.status === "not_used" && (
                <div className="flex flex-row items-start justify-center">
                  <span className="font-mono">{"⚠️ Não Utilizado : "}</span>
                  <span>{formatarHoraBrasil(data.dataAtualizacao)}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 items-start ">
              {data.timestamp.carregando && (
                <div className="flex flex-row items-start justify-center">
                  <span className="font-mono">{"🚛 Início carreg.: "}</span>
                  <span>{formatarHoraBrasil(data.timestamp.carregando)}</span>
                </div>
              )}
              {data.timestamp.liberado && (
                <div className="flex flex-row items-start justify-center">
                  <span className="font-mono">{"✅ Liberado: "}</span>
                  <span>{formatarHoraBrasil(data.timestamp.liberado)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const dataAtual =() => getTodayBrasilia().split('/').reverse().join('-')
const dataOntem = () => obterDataLocalSubtraida(1)


export default function KanbanBoard() {
  const [periodo, setPeriodo] = useState("hoje");
  const [dataInicio, setDataInicio] = useState(dataAtual())
  const [dataFim, setDataFim] = useState(dataAtual())
  const [kanbanFacility, setKanbanFacility] = useState("todas")
  const [motoristas, setMotoristas] = useState<ICarregamento[]>([]);

  useEffect(() => {
    if (periodo === "hoje") {
      setDataInicio(dataAtual());
      setDataFim(dataAtual());
    } else if (periodo === "ontem") {
      setDataInicio(dataOntem());
      setDataFim(dataOntem());
    }
  }, [periodo]);

  const buscarDados = async () => {

    const mudarFormatoData = (dataStr: string) => {
      const partes = dataStr.split("-");
      if(partes.length !== 3) return "00/00/0000";
      const [ano, mes, dia] = partes
      return `${dia}/${mes}/${ano}`
    }

    const deBr = mudarFormatoData(dataInicio)
    const ateBr = mudarFormatoData(dataFim)
    
    try {
      const params = new URLSearchParams({
        limit: "100",
        dataInicio: deBr,
        dataFim: ateBr,
      });
     
      if (kanbanFacility !== "todas") params.append("facility", kanbanFacility);

      const res = await fetch(`/api/carregamento?${params}`);
      const json = await res.json();
      if (json.success) {
        setMotoristas(
          json.data.map((c: any) => ({
            motoristaId: c.motoristaId,
            dataAtualizacao: c.dataAtualizacao,
            nome: c.motorista?.nome ?? c.nomeMotorista ?? "Não identificado",
            destino: c.destino,
            doca: c.doca,
            status: c.status ?? "aguardando",
            timestamp: c.timestamp,
            carga: c.carga,
            facility: c.facility,
          }))
        );
      }
    } catch (error) {
      console.error("Erro ao buscar dados do Kanban", error);
    }
  };

  useEffect(() => {
    buscarDados();
    const id = setInterval(buscarDados, INTERVALO_POLLING);
    return () => clearInterval(id);
  }, [dataInicio, dataFim, kanbanFacility]);

  const facilitiesDisponiveis = useMemo(() => {
    return Array.from(new Set(motoristas.map(m => m.facility).filter(Boolean))).sort();
  }, [motoristas])

  const motoristasFiltrados = useMemo(() => {
    if (kanbanFacility === "todas") return motoristas;
    return motoristas.filter(m => m.facility === kanbanFacility);
  }, [motoristas, kanbanFacility]);





  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border w-fit shadow-sm">
        {/* Seletor de Facility */}
        <Select value={kanbanFacility} onValueChange={setKanbanFacility}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="Escolha a facility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Facility</SelectItem>
            {facilitiesDisponiveis.map((fac) => (
              <SelectItem key={fac} value={fac}>{fac}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-gray-200 hidden sm:block" />

        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="ontem">Ontem</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {/* Controles de Data internos do Kanban */}
      {periodo === "personalizado" && ( <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            className="h-9 w-32 rounded-md border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <span className="text-muted-foreground text-xs">–</span>
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            className="h-9 w-32 rounded-md border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div> )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUNAS_KANBAN.map((status) => {
          const colStyle = COLUMN_STYLES[status];
          const itens = motoristasFiltrados.filter((m) => {

            if (status === 'aguardando') {
              return (
                m.status === "aguardando" ||
                m.status === "not_used"
              );
            }
            return m.status === status
          })

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
                    <KanbanCard key={m.motoristaId} data={m} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}