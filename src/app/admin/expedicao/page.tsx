"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

interface CarregamentoRaw {
  _id: string;
  id?: string;
  doca?: string;
  carga?: {
    gaiolas?: string;
    volumosos?: string;
    manga?: string;
  };
  horarios?: {
    encostadoDoca?: string;
    inicioCarregamento?: string;
    terminoCarregamento?: string;
    saidaLiberada?: string;
    previsaoChegada?: string;
  };
  lacres?: {
    traseiro?: string;
    lateral1?: string;
    lateral2?: string;
  };
  motorista?: {
    travelId?: number;
    nome?: string;
    tipoVeiculo?: string;
    veiculoTracao?: string;
    veiculoCarga?: string;
    transportadora?: string;
  };
  destino?: string;
  facility?: string;
  status?: string;
  posicaoVeiculo?: number;
  operador?: string;
  dataCriacao?: string;
}

interface CarregamentoFlat {
  _id: string;
  travelId: string;
  dataCriacao: string;
  condutor: string;
  categoria: string;
  placaTracao: string;
  placaCarga: string;
  facility: string;
  destino: string;
  status: string;
  posicaoSaida: number;
  idCarregamento: string;
  docaCarregamento: string;
  encostadoDoca: string;
  inicioCarregamento: string;
  terminoCarregamento: string;
  saidaLiberada: string;
  previsaoChegada: string;
  lacreTraseiro: string;
  lacreLateral1: string;
  lacreLateral2: string;
  gaiolas: string;
  volumosos: string;
  mangaPalets: string;
  operador: string;
  transportadora: string;
}

export default function CarregamentosPage() {
  const [dataSelecionada, setDataSelecionada] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split("T")[0];
  });
  const [facilitySelecionada, setFacilitySelecionada] = useState("");
  const [statusSelecionado, setStatusSelecionado] = useState("");
  const [todosRaw, setTodosRaw] = useState<CarregamentoRaw[]>([]);
  const [carregamentosFiltrados, setCarregamentosFiltrados] = useState<
    CarregamentoFlat[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CarregamentoFlat | null>(null);

  const flatten = (raw: CarregamentoRaw): CarregamentoFlat => ({
    _id: raw._id,
    travelId: raw.motorista?.travelId?.toString() ?? "",
    dataCriacao: raw.dataCriacao ?? "",
    condutor: raw.motorista?.nome ?? "",
    categoria: raw.motorista?.tipoVeiculo ?? "",
    placaTracao: raw.motorista?.veiculoTracao ?? "",
    placaCarga: raw.motorista?.veiculoCarga ?? "",
    facility: raw.facility ?? "",
    destino: raw.destino ?? "",
    status: raw.status ?? "",
    posicaoSaida: raw.posicaoVeiculo ?? 0,
    idCarregamento: raw.id ?? "",
    docaCarregamento: raw.doca ?? "",
    encostadoDoca: raw.horarios?.encostadoDoca ?? "",
    inicioCarregamento: raw.horarios?.inicioCarregamento ?? "",
    terminoCarregamento: raw.horarios?.terminoCarregamento ?? "",
    saidaLiberada: raw.horarios?.saidaLiberada ?? "",
    previsaoChegada: raw.horarios?.previsaoChegada ?? "",
    lacreTraseiro: raw.lacres?.traseiro ?? "",
    lacreLateral1: raw.lacres?.lateral1 ?? "",
    lacreLateral2: raw.lacres?.lateral2 ?? "",
    gaiolas: raw.carga?.gaiolas ?? "",
    volumosos: raw.carga?.volumosos ?? "",
    mangaPalets: raw.carga?.manga ?? "",
    operador: raw.operador ?? "",
    transportadora: raw.motorista?.transportadora ?? "",
  });

  const toRaw = (flat: CarregamentoFlat): CarregamentoRaw => ({
    _id: flat._id,
    id: flat.idCarregamento,
    doca: flat.docaCarregamento,
    carga: {
      gaiolas: flat.gaiolas,
      volumosos: flat.volumosos,
      manga: flat.mangaPalets,
    },
    horarios: {
      encostadoDoca: flat.encostadoDoca,
      inicioCarregamento: flat.inicioCarregamento,
      terminoCarregamento: flat.terminoCarregamento,
      saidaLiberada: flat.saidaLiberada,
      previsaoChegada: flat.previsaoChegada,
    },
    lacres: {
      traseiro: flat.lacreTraseiro,
      lateral1: flat.lacreLateral1,
      lateral2: flat.lacreLateral2,
    },
    motorista: {
      travelId: flat.travelId ? Number(flat.travelId) : undefined,
      nome: flat.condutor,
      tipoVeiculo: flat.categoria,
      veiculoTracao: flat.placaTracao,
      veiculoCarga: flat.placaCarga,
      transportadora: flat.transportadora,
    },
    destino: flat.destino,
    facility: flat.facility,
    status: flat.status,
    posicaoVeiculo: flat.posicaoSaida,
    operador: flat.operador,
    dataCriacao: flat.dataCriacao,
  });

  const fetchCarregamentos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expedicao");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTodosRaw(data);
      } else {
        toast.error("Formato de resposta inválido");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  // Extrair valores únicos para os filtros
  const facilities = [
    ...new Set(todosRaw.map((r) => r.facility).filter(Boolean)),
  ];
  const statuses = [...new Set(todosRaw.map((r) => r.status).filter(Boolean))];

  // Aplicar filtros
  useEffect(() => {
    const filtrados = todosRaw
      .filter((raw) => {
        if (!raw.dataCriacao) return false;
        const dataObj = new Date(raw.dataCriacao);
        const dataStr = dataObj.toLocaleDateString("sv");
        if (dataSelecionada && dataStr !== dataSelecionada) return false;
        if (facilitySelecionada && raw.facility !== facilitySelecionada)
          return false;
        if (statusSelecionado && raw.status !== statusSelecionado) return false;
        return true;
      })
      .map(flatten);
    setCarregamentosFiltrados(filtrados);
  }, [dataSelecionada, facilitySelecionada, statusSelecionado, todosRaw]);

  useEffect(() => {
    fetchCarregamentos();
  }, [fetchCarregamentos]);

  // Ordenar por destino e posição
  const carregamentosOrdenados = [...carregamentosFiltrados].sort((a, b) => {
    if (a.destino !== b.destino) {
      return a.destino.localeCompare(b.destino);
    }
    return a.posicaoSaida - b.posicaoSaida;
  });

  // Cores para cada destino (adicionar/ajustar conforme necessário)
  const getDestinoColor = (destino: string) => {
    const colors: Record<string, string> = {
      EBA2: "bg-blue-100",
      EBA3: "bg-green-100",
      EBA4: "bg-yellow-100",
      EBA6: "bg-purple-100",
      EBA16: "bg-pink-100",
      EBA21: "bg-orange-100",
      EBA14: "bg-indigo-100",
      EBA19: "bg-teal-100",
      EBA29: "bg-cyan-100",
    };
    return colors[destino] || "bg-white";
  };

  const handleEdit = (carregamento: CarregamentoFlat) => {
    setEditing(carregamento);
  };

  const handleSaveEdit = async (updated: CarregamentoFlat) => {
    try {
      const rawData = toRaw(updated);
      const res = await fetch(`/api/expedicao/${updated._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rawData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Carregamento atualizado!");
        setEditing(null);
        setTodosRaw((prev) =>
          prev.map((item) => (item._id === updated._id ? rawData : item)),
        );
      } else {
        toast.error(data.error || "Erro ao atualizar");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este carregamento?")) return;
    try {
      const res = await fetch(`/api/expedicao/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Carregamento excluído!");
        setTodosRaw((prev) => prev.filter((c) => c._id !== id));
      } else {
        toast.error(data.error || "Erro ao excluir");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir");
    }
  };

  const exportarCSV = () => {
    const cabecalhos = [
      "Travel ID",
      "Data",
      "Condutor",
      "Categoria",
      "Placa de Tração",
      "Placa de Carga",
      "Facility",
      "Destino",
      "Status",
      "Posição de Saída",
      "ID Carregamento",
      "Doca Carregamento",
      "Encostado na Doca",
      "Início do Carregamento",
      "Término de Carregamento",
      "Saída Liberada",
      "Previsão de Chegada",
      "Lacre Traseiro",
      "Lacre Lateral 1",
      "Lacre Lateral 2",
      "Gaiolas",
      "Volumosos",
      "Manga Palets",
      "Operador",
      "Transportadora",
    ];

    const linhas = carregamentosFiltrados.map((c) => [
      c.travelId,
      new Date(c.dataCriacao).toLocaleDateString("pt-BR"),
      c.condutor,
      c.categoria,
      c.placaTracao,
      c.placaCarga,
      c.facility,
      c.destino,
      c.status,
      c.posicaoSaida,
      c.idCarregamento,
      c.docaCarregamento,
      c.encostadoDoca,
      c.inicioCarregamento,
      c.terminoCarregamento,
      c.saidaLiberada,
      c.previsaoChegada,
      c.lacreTraseiro,
      c.lacreLateral1,
      c.lacreLateral2,
      c.gaiolas,
      c.volumosos,
      c.mangaPalets,
      c.operador,
      c.transportadora,
    ]);

    const csvContent = [cabecalhos, ...linhas]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `carregamentos_${dataSelecionada}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatarHora = (hora: string) => {
    if (!hora) return "";
    if (/^\d{2}:\d{2}$/.test(hora)) return hora;
    return hora;
  };

  const limparFiltros = () => {
    setFacilitySelecionada("");
    setStatusSelecionado("");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4">
                                <Link
              href="/carregamento/operacoes"
              className="text-blue-400 self-center hover:text-blue-600 text-lg transition"
            >
              Voltar
            </Link>
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                📦 Carregamentos
              </h1>
              <p className="text-sm text-gray-500">
                {carregamentosFiltrados.length} registro(s)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <select
                value={facilitySelecionada}
                onChange={(e) => setFacilitySelecionada(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Todas Facilities</option>
                {facilities.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select
                value={statusSelecionado}
                onChange={(e) => setStatusSelecionado(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Todos Status</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={limparFiltros}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Limpar Filtros
              </button>
              <button
                onClick={exportarCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                📥 Exportar CSV
              </button>
              <button
                onClick={fetchCarregamentos}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition flex items-center gap-1"
              >
                {loading && (
                  <span className="animate-spin inline-block">↻</span>
                )}
                {loading ? "Carregando..." : "Atualizar"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && carregamentosFiltrados.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">
              Nenhum carregamento encontrado com os filtros selecionados.
            </p>
          </div>
        )}

        {!loading && carregamentosFiltrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-xl shadow-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Travel ID",
                    "Data",
                    "Condutor",
                    "Categoria",
                    "Placa Tração",
                    "Placa Carga",
                    "Facility",
                    "Destino",
                    "Status",
                    "Pos.",
                    "ID Carreg.",
                    "Doca",
                    "Encostado",
                    "Início",
                    "Término",
                    "Saída",
                    "Previsão",
                    "Lacre Traseiro",
                    "Lacre Lat.1",
                    "Lacre Lat.2",
                    "Gaiolas",
                    "Volumosos",
                    "Manga",
                    "Operador",
                    "Transportadora",
                    "Ações",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase border-b"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carregamentosOrdenados.map((c) => (
                  <tr
                    key={c._id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${getDestinoColor(c.destino)}`}
                  >
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.travelId}{" "}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {new Date(c.dataCriacao).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {c.condutor}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.categoria}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {c.placaTracao}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {c.placaCarga}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.facility}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.destino}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.status === "liberado"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.posicaoSaida}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.idCarregamento}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.docaCarregamento}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {formatarHora(c.encostadoDoca)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {formatarHora(c.inicioCarregamento)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {formatarHora(c.terminoCarregamento)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {formatarHora(c.saidaLiberada)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {formatarHora(c.previsaoChegada)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.lacreTraseiro}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.lacreLateral1}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.lacreLateral2}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.gaiolas}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.volumosos}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.mangaPalets}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {c.operador}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {c.transportadora}
                    </td>
                    <td className="px-3 py-2 text-sm whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(c)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(c._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                Editar Carregamento
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Condutor
                  </label>
                  <input
                    type="text"
                    value={editing.condutor}
                    onChange={(e) =>
                      setEditing({ ...editing, condutor: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={editing.categoria}
                    onChange={(e) =>
                      setEditing({ ...editing, categoria: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Placa Tração
                  </label>
                  <input
                    type="text"
                    value={editing.placaTracao}
                    onChange={(e) =>
                      setEditing({ ...editing, placaTracao: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Placa Carga
                  </label>
                  <input
                    type="text"
                    value={editing.placaCarga}
                    onChange={(e) =>
                      setEditing({ ...editing, placaCarga: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Facility
                  </label>
                  <input
                    type="text"
                    value={editing.facility}
                    onChange={(e) =>
                      setEditing({ ...editing, facility: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Destino
                  </label>
                  <input
                    type="text"
                    value={editing.destino}
                    onChange={(e) =>
                      setEditing({ ...editing, destino: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={editing.status}
                    onChange={(e) =>
                      setEditing({ ...editing, status: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="liberado">Liberado</option>
                    <option value="emFila">Em fila</option>
                    <option value="carregando">Carregando</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Posição de Saída
                  </label>
                  <input
                    type="number"
                    value={editing.posicaoSaida}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        posicaoSaida: Number(e.target.value),
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ID Carregamento
                  </label>
                  <input
                    type="text"
                    value={editing.idCarregamento}
                    onChange={(e) =>
                      setEditing({ ...editing, idCarregamento: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Doca
                  </label>
                  <input
                    type="text"
                    value={editing.docaCarregamento}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        docaCarregamento: e.target.value,
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Encostado na Doca
                  </label>
                  <input
                    type="text"
                    value={editing.encostadoDoca}
                    onChange={(e) =>
                      setEditing({ ...editing, encostadoDoca: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Início Carregamento
                  </label>
                  <input
                    type="text"
                    value={editing.inicioCarregamento}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        inicioCarregamento: e.target.value,
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Término Carregamento
                  </label>
                  <input
                    type="text"
                    value={editing.terminoCarregamento}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        terminoCarregamento: e.target.value,
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Saída Liberada
                  </label>
                  <input
                    type="text"
                    value={editing.saidaLiberada}
                    onChange={(e) =>
                      setEditing({ ...editing, saidaLiberada: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Previsão de Chegada
                  </label>
                  <input
                    type="text"
                    value={editing.previsaoChegada}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        previsaoChegada: e.target.value,
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Lacre Traseiro
                  </label>
                  <input
                    type="text"
                    value={editing.lacreTraseiro}
                    onChange={(e) =>
                      setEditing({ ...editing, lacreTraseiro: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Lacre Lateral 1
                  </label>
                  <input
                    type="text"
                    value={editing.lacreLateral1}
                    onChange={(e) =>
                      setEditing({ ...editing, lacreLateral1: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Lacre Lateral 2
                  </label>
                  <input
                    type="text"
                    value={editing.lacreLateral2}
                    onChange={(e) =>
                      setEditing({ ...editing, lacreLateral2: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gaiolas
                  </label>
                  <input
                    type="text"
                    value={editing.gaiolas}
                    onChange={(e) =>
                      setEditing({ ...editing, gaiolas: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Volumosos
                  </label>
                  <input
                    type="text"
                    value={editing.volumosos}
                    onChange={(e) =>
                      setEditing({ ...editing, volumosos: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Manga Palets
                  </label>
                  <input
                    type="text"
                    value={editing.mangaPalets}
                    onChange={(e) =>
                      setEditing({ ...editing, mangaPalets: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Operador
                  </label>
                  <input
                    type="text"
                    value={editing.operador}
                    onChange={(e) =>
                      setEditing({ ...editing, operador: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Transportadora
                  </label>
                  <input
                    type="text"
                    value={editing.transportadora}
                    onChange={(e) =>
                      setEditing({ ...editing, transportadora: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveEdit(editing)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
