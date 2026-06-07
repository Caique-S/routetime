"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription,  CardHeader,  CardTitle,} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle,} from "@/components/ui/drawer";
import {Table, TableBody, TableCell,TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,} from "recharts";
import {ChartContainer,ChartTooltip,ChartTooltipContent,ChartLegend,ChartLegendContent,} from "@/components/ui/chart";
import {RefreshCw,Calendar,AlertCircle,CheckCircle,Clock,Truck,Box,BarChart3,Activity,X,} from "lucide-react";
import KanbanBoard from "./kanban-board";
import { getNomeDestino } from "../lib/utils/destinos";
import { formatarHoraBrasil, formatarDataBrasil, getTodayBrasilia } from "../lib/utils/dateUtils";
import { StatusCarregamento } from "../lib/utils/status";
import { ICarregamento } from "@/app/lib/models/carregamento"

const parseTimeToMinutes = (time: string): number | null => {
  if (!time) return null;
  const cleaned = time.includes("T")
    ? new Date(time).toISOString().substring(11, 16)
    : time.substring(0, 5);
  const [h, m] = cleaned.split(":").map(Number);
  return isNaN(h) || isNaN(m) ? null : h * 60 + m;
};

const calcularDiferencaHoras = (inicio: string, fim: string): number | null => {
  const a = parseTimeToMinutes(inicio);
  const b = parseTimeToMinutes(fim);
  if (a === null || b === null) return null;
  let diff = b - a;
  if (diff < 0) diff += 24 * 60;
  return diff;
};

const hoje = new Date();
const getTodayStr = () => hoje.toISOString().split("T")[0];
const getYesterdayStr = () => {
  const o = new Date(hoje);
  o.setDate(o.getDate() - 1);
  return o.toISOString().split("T")[0];
};

// ---------- Componente Principal ----------
export default function AnalyserPage() {
  const [carregamentos, setCarregamentos] = useState<ICarregamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [periodoPredefinido, setPeriodoPredefinido] = useState("hoje");
  const [dataInicio, setDataInicio] = useState(getTodayStr());
  const [dataFim, setDataFim] = useState(getTodayStr());
  const [facilitySelecionada, setFacilitySelecionada] = useState("");
  const [kanbanFacility, setKanbanFacility] = useState<string>("todas");

  const [activeTab, setActiveTab] = useState("kanban");

  // Drawer único (controlado)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerData, setDrawerData] = useState<ICarregamento[]>([]);

  // Filtro de facility para o gráfico de liberados
  const [chartFacility, setChartFacility] = useState("todas");

  // Atualiza datas conforme período
  useEffect(() => {
    const hojeStr = getTodayStr();
    const ontemStr = getYesterdayStr();
    switch (periodoPredefinido) {
      case "hoje":
        setDataInicio(hojeStr);
        setDataFim(hojeStr);
        break;
      case "ontem":
        setDataInicio(ontemStr);
        setDataFim(ontemStr);
        break;
      case "ultimos7":
        const d7 = new Date(hoje);
        d7.setDate(d7.getDate() - 6);
        setDataInicio(d7.toISOString().split("T")[0]);
        setDataFim(hojeStr);
        break;
      case "ultimos30":
        const d30 = new Date(hoje);
        d30.setDate(d30.getDate() - 29);
        setDataInicio(d30.toISOString().split("T")[0]);
        setDataFim(hojeStr);
        break;
      case "personalizado":
        break;
    }
  }, [periodoPredefinido]);

  // Busca dados (API + localStorage)
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ limit: "10000" });
      let carregamentosApi: ICarregamento[] = [];
      try {
        const res = await fetch(`/api/carregamento?${params}`);
        const json = await res.json();
        if (json.success && json.data) {
          const inicio = new Date(`${dataInicio}T00:00:00-03:00`).getTime();
          const fim = new Date(`${dataFim}T23:59:59-03:00`).getTime();
          carregamentosApi = json.data.filter((c: ICarregamento) => {
            const d = c.dataCriacao || c.timestamp || "";
            if (!d) return false;

            const ts = new Date()

            return ts >= inicio && ts <= fim;
          })
            .map((c: any) => ({ ...c, finalizado: true }));
        }
      } catch (e) {
        console.error("Erro ao buscar da API:", e);
      }

      const carregamentosLocal: ICarregamento[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("carregamentos_")) {
          try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const data = JSON.parse(raw);
            for (const mid in data) {
              const car = data[mid];
              if (car && !car.finalizado) {
                carregamentosLocal.push({ ...car, motoristaId: mid, finalizado: false });
              }
            }
          } catch { }
        }
      }

      const localIds = new Set(carregamentosLocal.map((c) => c.motoristaId));
      setCarregamentos([...carregamentosLocal, ...carregamentosApi.filter(c => !localIds.has(c.motoristaId))]);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // Métricas
  const stats = useMemo(() => {
    const emDoca = carregamentos.filter(c => c.status === "emDoca").length;
    const aguardando = carregamentos.filter(c => c.status === "aguardando").length;
    const carregando = carregamentos.filter(c => c.status === "carregando").length;
    const liberados = carregamentos.filter(c => c.status === "liberado").length;
    const finalizados = carregamentos.filter(c => c.finalizado).length;

    const gaiolas = carregamentos.reduce((s, c) => s + c.carga?.gaiolas || 0, 0);
    const volumosos = carregamentos.reduce((s, c) => s + c.carga?.volumosos || 0, 0);
    const manga = carregamentos.reduce((s, c) => s + c.carga?.manga || 0, 0);

    let somaCar = 0, ctCar = 0, somaEsp = 0, ctEsp = 0;
    carregamentos.forEach(c => {
      if (c.horarios?.inicioCarregamento && c.horarios?.terminoCarregamento) {
        const d = calcularDiferencaHoras(c.horarios.inicioCarregamento, c.horarios.terminoCarregamento);
        if (d !== null) { somaCar += d; ctCar++; }
      }
      if (c.horarios?.encostadoDoca && c.horarios?.inicioCarregamento) {
        const d = calcularDiferencaHoras(c.horarios.encostadoDoca, c.horarios.inicioCarregamento);
        if (d !== null) { somaEsp += d; ctEsp++; }
      }
    });

    const destinosMap: Record<string, number> = {};
    const veiculosMap: Record<string, number> = {};
    carregamentos.forEach(c => {
      const nome = getNomeDestino(c.destino);
      destinosMap[nome] = (destinosMap[nome] || 0) + 1;
      const tipo = c.motorista?.tipoVeiculo || "Não especificado";
      veiculosMap[tipo] = (veiculosMap[tipo] || 0) + 1;
    });

    return {
      total: carregamentos.length,
      emDoca,
      aguardando,
      carregando,
      liberados,
      finalizados,
      gaiolas,
      volumosos,
      manga,
      tempoCar: ctCar > 0 ? Math.round(somaCar / ctCar) : null,
      tempoEsp: ctEsp > 0 ? Math.round(somaEsp / ctEsp) : null,
      destinosMap,
      veiculosMap,
      destinosUnicos: Object.keys(destinosMap).length,
    };
  }, [carregamentos]);

  // Abre Drawer com os registros filtrados
  const abrirDetalhes = (titulo: string, dados: ICarregamento[]) => {
    setDrawerTitle(titulo);
    setDrawerData(dados);
    setDrawerOpen(true);
  };

  // Dados para gráficos
  const statusData = [
    { name: "Em Doca", value: stats.emDoca, color: "#f59e0b" },
    { name: "Carregando", value: stats.carregando, color: "#3b82f6" },
    { name: "Liberados", value: stats.liberados, color: "#10b981" },
  ];

  const destinosPie = Object.entries(stats.destinosMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const trendData = useMemo(() => {
    // Removi a trava de dataInicio === dataFim para que o gráfico 
    // mostre o ponto único caso o usuário filtre apenas um dia.
    const map: Record<string, number> = {};

    carregamentos.forEach(c => {
      const rawDate = c.dataCriacao || c.timestamp;
      if (!rawDate) return;

      // Converte a string (UTC ou local) para um objeto Date
      const dateObj = new Date(rawDate);

      // Extrai a data no formato YYYY-MM-DD respeitando o fuso local.
      // Isso evita que registros após as 21h pulem para o dia seguinte.
      const d = dateObj.toLocaleDateString("en-CA");

      if (d) {
        map[d] = (map[d] || 0) + 1;
      }
    });

    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [carregamentos]);

  // ---- NOVA SEÇÃO: Dados para o gráfico de liberados por facility ----
  const facilitiesDisponiveis = useMemo(
    () => Array.from(new Set(carregamentos.map(c => c.facility))).sort(),
    [carregamentos]
  );

  const chartLiberadosData = useMemo(() => {
    // Agrupa liberados por data (YYYY-MM-DD) e facility
    const agrupado: Record<string, Record<string, number>> = {};
    carregamentos
      .filter(c => c.status && ["liberado", "not_used"].includes(c.status))
      .forEach(c => {
        const rawDate = c.dataCriacao;
        if (!rawDate) return;

        // Converte a string (independente de ser UTC) para o fuso local do navegador
        const date = formatarDataBrasil(rawDate);

       if (!agrupado[date]) agrupado[date] = {};
        const fac = c.facility || "Desconhecido";
        agrupado[date][fac] = (agrupado[date][fac] || 0) + 1;
      });

    // Cria array de objetos com todas as facilities
    const datas = Object.keys(agrupado).sort();
    return datas.map(date => {
      const entry: any = { date };
      facilitiesDisponiveis.forEach(fac => {
        entry[fac] = agrupado[date][fac] || 0;
      });
      return entry;
    });
  }, [carregamentos, facilitiesDisponiveis]);

  // Config dinâmica para o ChartContainer
  const liberadosChartConfig = useMemo(() => {
    const cores = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];
    const config: any = {};
    facilitiesDisponiveis.forEach((fac, i) => {
      config[fac] = {
        label: fac,
        color: cores[i % cores.length],
      };
    });
    return config;
  }, [facilitiesDisponiveis]);

  // Filtro para exibir apenas a facility selecionada (ou todas)
  const filteredChartData = useMemo(() => {
    if (chartFacility === "todas") return chartLiberadosData;
    return chartLiberadosData.map(entry => ({
      date: entry.date,
      [chartFacility]: entry[chartFacility] || 0,
    }));
  }, [chartLiberadosData, chartFacility]);

  // Áreas que devem aparecer
  const areasAtivas = chartFacility === "todas" ? facilitiesDisponiveis : [chartFacility];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="space-y-4 text-center">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Analyser</h1>
              <p className="text-xs text-muted-foreground">
                {carregamentos.length} registros encontrados
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={periodoPredefinido} onValueChange={setPeriodoPredefinido}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="ontem">Ontem</SelectItem>
                <SelectItem value="ultimos7">Últimos 7 dias</SelectItem>
                <SelectItem value="ultimos30">Últimos 30 dias</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {periodoPredefinido === "personalizado" && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-9 w-32 rounded-md border bg-background px-2 text-sm" />
                <span className="text-muted-foreground">–</span>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-9 w-32 rounded-md border bg-background px-2 text-sm" />
              </div>
            )}

            <Button variant="outline" size="icon" onClick={fetchDashboardData} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 py-6 space-y-6">
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="flex items-center gap-2 py-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Cards de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total" value={stats.total} subtitle="viagens" icon={<Activity className="h-5 w-5" />} onClick={() => abrirDetalhes("Todas as viagens", carregamentos)} />
          <MetricCard title="Em Andamento" value={stats.emDoca + stats.carregando} subtitle={`${stats.emDoca} Doca, ${stats.carregando} carregando`} icon={<Truck className="h-5 w-5" />} onClick={() => abrirDetalhes("Em andamento", carregamentos.filter(c => !c.finalizado))} />
          <MetricCard title="Concluídos" value={stats.finalizados} subtitle={`${stats.liberados} liberados`} icon={<CheckCircle className="h-5 w-5" />} onClick={() => abrirDetalhes("Concluídos", carregamentos.filter(c => c.finalizado))} />
          <MetricCard title="Gaiolas" value={stats.gaiolas} subtitle={`${stats.volumosos} vol. / ${stats.manga} manga`} icon={<Box className="h-5 w-5" />} onClick={() => abrirDetalhes("Com carga", carregamentos.filter(c => c.carga?.gaiolas > 0))} />
        </div>

        {/* ---- NOVO: Gráfico interativo de liberados por facility ---- */}
        <Card>
          <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
            <div className="grid flex-1 gap-1">
              <CardTitle>Liberações diárias por Facility</CardTitle>
              <CardDescription>
                {chartFacility === "todas"
                  ? "Veículos liberados por dia (todas as facilities)"
                  : `Veículos liberados por dia - ${chartFacility}`}
              </CardDescription>
            </div>
            <Select value={chartFacility} onValueChange={setChartFacility}>
              <SelectTrigger className="w-[180px] rounded-lg sm:ml-auto">
                <SelectValue placeholder="Selecione a facility" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="todas" className="rounded-lg">Todas</SelectItem>
                {facilitiesDisponiveis.map(fac => (
                  <SelectItem key={fac} value={fac} className="rounded-lg">{fac}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={liberadosChartConfig} className="aspect-auto h-[250px] w-full">
              <AreaChart data={filteredChartData}>
                <defs>
                  {areasAtivas.map(fac => (
                    <linearGradient key={fac} id={`fill-${fac}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={`var(--color-${fac})`} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={`var(--color-${fac})`} stopOpacity={0.0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value + "T00:00:00-03:00");
                    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        const date = new Date(value + "T00:00:00-03:00");
                        return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
                      }}
                      indicator="dot"
                    />
                  }
                />
                {areasAtivas.map(fac => (
                  <Area
                    key={fac}
                    dataKey={fac}
                    type="natural"
                    fill={`url(#fill-${fac})`}
                    stroke={`var(--color-${fac})`}
                  />
                ))}
                {chartFacility === "todas" && <ChartLegend content={<ChartLegendContent />} />}
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full max-w-md mb-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="expedition">Tempo Médio</TabsTrigger>
            <TabsTrigger value="kanban">📋 Expedição</TabsTrigger>
            <TabsTrigger value="distribution">Destinos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Distribuição de Status</CardTitle><CardDescription>Visão atual do fluxo</CardDescription></CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" name="Viagens">
                          {statusData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {trendData.length > 1 && (
                <Card>
                  <CardHeader><CardTitle>Tendência Diária</CardTitle><CardDescription>Viagens por dia no período</CardDescription></CardHeader>
                  <CardContent>
                    <ChartContainer config={{}} className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date"
                            tickFormatter={(value) => {
                              const [year, month, day] = value.split("-");
                              return `${day}/${month}`;
                            }} />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} name="Viagens" />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="expedition" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Tempo Médio de Carregamento</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.tempoCar !== null ? `${Math.floor(stats.tempoCar / 60)}h ${stats.tempoCar % 60}m` : "--"}</div>
                  <p className="text-sm text-muted-foreground mt-1">Baseado em {carregamentos.filter(c => c.horarios?.inicioCarregamento && c.horarios?.terminoCarregamento).length} registros</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Tempo Médio de Espera</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.tempoEsp !== null ? `${Math.floor(stats.tempoEsp / 60)}h ${stats.tempoEsp % 60}m` : "--"}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="kanban">
            <div className="flex items-center gap-4 mb-4">
              <Select value={kanbanFacility} onValueChange={setKanbanFacility}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Escolha a facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {facilitiesDisponiveis.map((fac) => (
                    <SelectItem key={fac} value={fac}>{fac}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <KanbanBoard
              dataInicio={dataInicio}
              dataFim={dataFim}
              facility={kanbanFacility === "todas" ? "" : kanbanFacility} />
          </TabsContent>

          <TabsContent value="distribution" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Destinos</CardTitle><CardDescription>Clique na fatia para detalhar</CardDescription></CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={destinosPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label
                          onClick={(e) => abrirDetalhes(`Destino: ${e.name}`, carregamentos.filter(c => getNomeDestino(c.destino) === e.name))}>
                          {destinosPie.map((_, i) => (<Cell key={i} fill={`hsl(${i * 40}, 70%, 60%)`} />))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Tipos de Veículo</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(stats.veiculosMap).map(([t, v]) => ({ tipo: t, qtd: v }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="tipo" />
                        <YAxis allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="qtd" fill="#f97316" name="Viagens" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Últimos Carregamentos</CardTitle>
                <CardDescription>
                  {carregamentos.length} registros no período
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Travel ID</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Posição</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead>Previsão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Ordena pelo destino e posição do veículo */}
                    {carregamentos
                      .slice()
                      .sort((a, b) => {
                        const destinoA = getNomeDestino(a.destino).toLowerCase();
                        const destinoB = getNomeDestino(b.destino).toLowerCase();
                        if (destinoA < destinoB) return -1;
                        if (destinoA > destinoB) return 1;
                        const posA = a.posicaoVeiculo ?? Number.MAX_SAFE_INTEGER;
                        const posB = b.posicaoVeiculo ?? Number.MAX_SAFE_INTEGER;
                        return posA - posB;
                      })
                      .slice(0, 50)
                      .map((c) => (
                        <TableRow key={c.motoristaId}>
                          <TableCell className="font-mono text-xs">
                            {c.motorista?.travelId}
                          </TableCell>
                          <TableCell>{getNomeDestino(c.destino)}</TableCell>
                          <TableCell>{c.motorista?.nome}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                c.status === "liberado"
                                  ? "default"
                                  : c.status === "carregando"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {c.status === "liberado"
                                ? "Liberado"
                                : c.status === "not_used"
                                  ? "Not_Used"
                                  : c.status === "carregando"
                                    ? "Carregando"
                                    : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell>{c.posicaoVeiculo}</TableCell>
                          <TableCell>
                            {formatarHoraBrasil(c.horarios?.saidaLiberada || "")}
                          </TableCell>
                          <TableCell>
                            {formatarHoraBrasil(c.horarios?.previsaoChegada || "")}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </main>

      {/* Drawer único (sem hook use-mobile) */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="h-[85vh] max-h-[85vh] flex flex-col">
          <DrawerHeader className="flex items-center justify-between border-b pb-3">
            <div>
              <DrawerTitle>{drawerTitle}</DrawerTitle>
              <DrawerDescription>{drawerData.length} registro{drawerData.length !== 1 ? "s" : ""}</DrawerDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>
          <div className="p-4 overflow-auto flex-1">
            <DetailTable data={drawerData} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

// ---------- Componente de cartão de métrica ----------
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-1.5 rounded-md bg-primary/10 text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// ---------- Tabela de detalhes (reutilizável no Drawer) ----------
function DetailTable({ data }: { data: ICarregamento[] }) {
  // Ordena primeiro por destino, depois por posição
  const sortedData = [...data].sort((a, b) => {
    const destinoA = getNomeDestino(a.destino).toLowerCase();
    const destinoB = getNomeDestino(b.destino).toLowerCase();
    if (destinoA < destinoB) return -1;
    if (destinoA > destinoB) return 1;
    // Mesmo destino → ordena pela posição (valores nulos vão para o fim)
    const posA = a.posicaoVeiculo ?? Number.MAX_SAFE_INTEGER;
    const posB = b.posicaoVeiculo ?? Number.MAX_SAFE_INTEGER;
    return posA - posB;
  });

  return (
    <div className="rounded-md border overflow-auto max-h-[60vh]">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead>Motorista</TableHead>
            <TableHead>Destino</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Posição</TableHead>
            <TableHead>Doca</TableHead>
            <TableHead>Saída</TableHead>
            <TableHead>Gaiolas</TableHead>
            <TableHead>Volumosos</TableHead>
            <TableHead>Manga</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((c) => (
            <TableRow key={c.motoristaId}>
              <TableCell className="font-medium">{c.motorista?.nome}</TableCell>
              <TableCell>{getNomeDestino(c.destino)}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    c.status === "liberado"
                      ? "default"
                      : c.status === "carregando"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {c.status === "liberado"
                    ? "Liberado"
                    : c.status === "not_used"
                      ? "Not_Used"
                      : c.status === "carregando"
                        ? "Carregando"
                        : "Pendente"}
                </Badge>
              </TableCell>
              <TableCell>{c.posicaoVeiculo}</TableCell>
              <TableCell>{c.doca}</TableCell>
              <TableCell>
                {formatarHoraBrasil(c.horarios?.saidaLiberada || "")}
              </TableCell>
              <TableCell>{c.carga.gaiolas}</TableCell>
              <TableCell>{c.carga.volumosos}</TableCell>
              <TableCell>{c.carga.manga}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}