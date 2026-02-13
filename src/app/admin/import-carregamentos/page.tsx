'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileUp,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Edit,
  Save,
  X,
  Calendar,
  Clock,
  User,
  Truck,
  MapPin,
  Tag,
  Box,
  DoorClosed,
  Hash,
  BookType,
} from 'lucide-react';
import { Tab } from '@headlessui/react';

// Interfaces
interface MotoristaData {
  nome: string;
  tipoVeiculo: string;
  veiculoTracao: string;
  veiculoCarga: string;
  travelId: number | string;
  placa: string;
  transportadora: string;
  dataInicio: string;
}

interface CarregamentoManual {
  // Gerais
  destino: string;
  facility: string;
  doca: string;
  status: 'emFila' | 'carregando' | 'liberado';
  posicaoVeiculo?: number;
  operador: string;
  numero?: string; // opcional, será gerado se não informado

  // Motorista
  motorista: MotoristaData;

  // Horários
  horarios: {
    encostadoDoca: string;
    inicioCarregamento: string;
    terminoCarregamento: string;
    saidaLiberada: string;
    previsaoChegada: string;
  };

  // Carga
  carga: {
    gaiolas: string;
    volumosos: string;
    manga: string;
  };

  // Lacres
  lacres: {
    traseiro: string;
    lateral1: string;
    lateral2: string;
  };

  // Datas retroativas
  timestamp: string;          // ISO string
  dataCriacao: string;        // ISO string
  dataEnvio?: string;         // ISO string
  dataAtualizacao?: string;   // ISO string

  // Mensagens (opcionais, se não preenchidas serão geradas)
  mensagemDespacho?: string;
  mensagemXPT?: string;
}

// Mapeamento destino código -> nome
const getNomeDestino = (codigo: string): string => {
  const mapa: Record<string, string> = {
    EBA14: 'Serrinha',
    EBA4: 'Santo Antônio de Jesus',
    EBA19: 'Itaberaba',
    EBA3: 'Jacobina',
    EBA2: 'Pombal',
    EBA16: 'Senhor do Bonfim',
    EBA21: 'Seabra',
    EBA6: 'Juazeiro',
    EBA29: 'Valença',
  };
  return mapa[codigo] || codigo;
};

// Geração automática da mensagem de despacho
const gerarMensagemDespacho = (data: CarregamentoManual): string => {
  const destinoNome = getNomeDestino(data.destino);
  const pos = data.posicaoVeiculo?.toString().padStart(2, '0') || '??';
  return `Veiculo ${destinoNome} (${pos}) saindo nesse exato momento. Obs: ${data.carga.gaiolas} Gaiolas, ${data.carga.volumosos} Volumosos e ${data.carga.manga} Manga Palets.`;
};

// Geração automática da mensagem XPT
const gerarMensagemXPT = (data: CarregamentoManual): string => {
  const destinoNome = getNomeDestino(data.destino);
  const pos = data.posicaoVeiculo?.toString().padStart(2, '0') || '??';
  const tipoVeiculo = data.motorista.tipoVeiculo || 'Veículo';

  let msg = `*ID:* ${data.motorista.travelId}\n`;
  msg += `*Doca:* (${data.doca || 'Não definida'})\n`;
  msg += `*${tipoVeiculo}:* ${destinoNome} (${pos})\n`;
  msg += `*Condutor:* ${data.motorista.nome}\n`;
  msg += `*Placa Tração:* ${data.motorista.veiculoTracao}\n`;
  if (data.motorista.veiculoCarga && data.motorista.veiculoCarga !== 'Não especificado') {
    msg += `*Placa Carga:* ${data.motorista.veiculoCarga}\n`;
  }
  msg += `\n*Encostado na doca:* ${data.horarios.encostadoDoca || 'Não registrado'}\n`;
  msg += `*Início carregamento:* ${data.horarios.inicioCarregamento || 'Não registrado'}\n`;
  msg += `*Término carregamento:* ${data.horarios.terminoCarregamento || 'Não registrado'}\n`;
  msg += `*Saída liberada:* ${data.horarios.saidaLiberada || 'Não registrado'}\n`;
  msg += `*Previsão de chegada:* ${data.horarios.previsaoChegada || 'Não calculado'}\n`;
  msg += `\n*Lacre Traseiro:* ${data.lacres.traseiro || ''}\n`;
  msg += `*Lacre Lateral 1:* ${data.lacres.lateral1 || ''}\n`;
  msg += `*Lacre Lateral 2:* ${data.lacres.lateral2 || ''}\n`;
  msg += `\n*Total de gaiolas:* ${data.carga.gaiolas}\n`;
  msg += `*Total de volumosos:* ${data.carga.volumosos}\n`;
  msg += `*Total de manga palete:* ${data.carga.manga}`;
  return msg;
};

// Função para calcular previsão de chegada com base na saída e destino
const calcularPrevisao = (saida: string, destinoCodigo: string): string => {
  if (!saida) return '';
  const [h, m] = saida.split(':').map(Number);
  let horasAdicionais = 0;
  switch (destinoCodigo) {
    case 'EBA14':
    case 'EBA19':
      horasAdicionais = 2;
      break;
    case 'EBA4':
    case 'EBA29':
      horasAdicionais = 3;
      break;
    case 'EBA2':
      horasAdicionais = 4;
      break;
    case 'EBA3':
    case 'EBA16':
      horasAdicionais = 5;
      break;
    case 'EBA21':
      horasAdicionais = 6;
      break;
    case 'EBA6':
      horasAdicionais = 7;
      break;
    default:
      horasAdicionais = 0;
  }
  const data = new Date();
  data.setHours(h + horasAdicionais, m);
  return data.getHours().toString().padStart(2, '0') + ':' + data.getMinutes().toString().padStart(2, '0');
};

export default function ImportCarregamentosPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0); // 0 = upload, 1 = manual

  // Estados para upload
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);

  // Estado para formulário manual
  const [formData, setFormData] = useState<CarregamentoManual>({
    destino: 'EBA2',
    facility: 'SBA4',
    doca: '',
    status: 'liberado',
    posicaoVeiculo: 1,
    operador: '',
    motorista: {
      nome: '',
      tipoVeiculo: 'Carreta',
      veiculoTracao: '',
      veiculoCarga: '',
      travelId: '',
      placa: '',
      transportadora: 'BRJTransportes',
      dataInicio: new Date().toISOString().split('T')[0], // apenas data
    },
    horarios: {
      encostadoDoca: '',
      inicioCarregamento: '',
      terminoCarregamento: '',
      saidaLiberada: '',
      previsaoChegada: '',
    },
    carga: {
      gaiolas: '',
      volumosos: '',
      manga: '',
    },
    lacres: {
      traseiro: '',
      lateral1: '',
      lateral2: '',
    },
    timestamp: new Date().toISOString().slice(0, 16), // datetime-local formato
    dataCriacao: new Date().toISOString().slice(0, 16),
    dataEnvio: new Date().toISOString().slice(0, 16),
    dataAtualizacao: new Date().toISOString().slice(0, 16),
    mensagemDespacho: '',
    mensagemXPT: '',
  });

  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualResult, setManualResult] = useState<{ success: boolean; message: string } | null>(null);

  // Handlers para upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const json = JSON.parse(content);
        if (Array.isArray(json)) {
          setPreview(json.slice(0, 3));
        } else {
          setPreview(null);
          alert('O arquivo deve conter um array de carregamentos.');
        }
      } catch {
        setPreview(null);
        alert('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const carregamentos = JSON.parse(content);
        if (!Array.isArray(carregamentos)) throw new Error('Array inválido');

        const response = await fetch('/api/carregamentos/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ carregamentos }),
        });

        const data = await response.json();
        if (response.ok) {
          setResult({ success: true, message: data.message });
          setFile(null);
          setPreview(null);
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        } else {
          setResult({ success: false, message: data.error || 'Erro na importação.' });
        }
      } catch (error: any) {
        setResult({ success: false, message: error.message });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsText(file);
  };

  // Handlers para formulário manual
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    // names compostos: motorista.nome, horarios.encostadoDoca, etc.
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof CarregamentoManual] as any),
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Atualiza previsão de chegada quando saidaLiberada ou destino mudam
  const handleSaidaChange = (value: string) => {
    setFormData((prev) => {
      const horarios = { ...prev.horarios, saidaLiberada: value };
      const previsao = calcularPrevisao(value, prev.destino);
      horarios.previsaoChegada = previsao;
      return { ...prev, horarios };
    });
  };

  const handleDestinoChange = (value: string) => {
    setFormData((prev) => {
      const previsao = calcularPrevisao(prev.horarios.saidaLiberada, value);
      return {
        ...prev,
        destino: value,
        horarios: { ...prev.horarios, previsaoChegada: previsao },
      };
    });
  };

  // Gerar mensagens automaticamente
  const generateMessages = () => {
    const despacho = gerarMensagemDespacho(formData);
    const xpt = gerarMensagemXPT(formData);
    setFormData((prev) => ({
      ...prev,
      mensagemDespacho: despacho,
      mensagemXPT: xpt,
    }));
  };

  // Submissão manual
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualSubmitting(true);
    setManualResult(null);

    // Gerar mensagens se estiverem vazias
    if (!formData.mensagemDespacho || !formData.mensagemXPT) {
      generateMessages();
    }

    // Preparar payload: converter campos de data para ISO string
    const payload = {
      ...formData,
      // Converter datetime-local para ISO
      timestamp: new Date(formData.timestamp).toISOString(),
      dataCriacao: new Date(formData.dataCriacao).toISOString(),
      dataEnvio: formData.dataEnvio ? new Date(formData.dataEnvio).toISOString() : undefined,
      dataAtualizacao: formData.dataAtualizacao ? new Date(formData.dataAtualizacao).toISOString() : undefined,
      motorista: {
        ...formData.motorista,
        travelId: Number(formData.motorista.travelId) || formData.motorista.travelId,
        dataInicio: formData.motorista.dataInicio, // já string
      },
    };

    try {
      const response = await fetch('/api/carregamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) {
        setManualResult({ success: true, message: 'Carregamento criado com sucesso!' });
        // Limpar formulário ou resetar parcialmente
        // (opcional) recarregar a página ou limpar
      } else {
        setManualResult({ success: false, message: data.error || 'Erro ao criar carregamento.' });
      }
    } catch (error: any) {
      setManualResult({ success: false, message: error.message });
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </button>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
            <Tab.List className="flex border-b border-gray-200">
              <Tab
                className={({ selected }) =>
                  `flex-1 px-4 py-3 text-sm font-medium text-center outline-none ${
                    selected
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload em Lote
              </Tab>
              <Tab
                className={({ selected }) =>
                  `flex-1 px-4 py-3 text-sm font-medium text-center outline-none ${
                    selected
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                <Edit className="w-4 h-4 inline mr-2" />
                Entrada Manual
              </Tab>
            </Tab.List>

            <Tab.Panels className="p-6">
              {/* Painel Upload */}
              <Tab.Panel>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Importar Carregamentos Históricos (JSON)
                </h2>
                <p className="text-gray-600 mb-6">
                  Envie um arquivo JSON contendo um array de objetos de carregamento. As datas serão preservadas.
                </p>
                <form onSubmit={handleUploadSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Arquivo JSON
                    </label>
                    <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-500 transition-colors">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                          >
                            <span>Clique para selecionar</span>
                            <input
                              id="file-upload"
                              name="file"
                              type="file"
                              accept=".json,application/json"
                              className="sr-only"
                              onChange={handleFileChange}
                              required
                            />
                          </label>
                          <p className="pl-1">ou arraste e solte</p>
                        </div>
                        <p className="text-xs text-gray-500">Arquivo JSON até 10MB</p>
                      </div>
                    </div>
                  </div>

                  {file && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <div className="flex items-center">
                        <FileUp className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-blue-800">
                          {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </span>
                      </div>
                      {preview && preview.length > 0 && (
                        <div className="mt-3 text-xs text-gray-700">
                          <p className="font-semibold">Preview (primeiros itens):</p>
                          <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-40">
                            {JSON.stringify(preview, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {result && (
                    <div
                      className={`p-4 rounded-md ${
                        result.success ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex items-center">
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                        )}
                        <p
                          className={`text-sm font-medium ${
                            result.success ? 'text-green-800' : 'text-red-800'
                          }`}
                        >
                          {result.message}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!file || uploading}
                      className={`px-4 py-2 rounded-md text-white font-medium ${
                        !file || uploading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {uploading ? 'Importando...' : 'Importar Carregamentos'}
                    </button>
                  </div>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Formato esperado:</h3>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
{`[
  {
    "id": "36421482",
    "doca": "15",
    "carga": { "gaiolas": "00", "volumosos": "20", "manga": "03" },
    "horarios": { "encostadoDoca": "17:03", ... },
    ...
  }
]`}
                  </pre>
                </div>
              </Tab.Panel>

              {/* Painel Manual */}
              <Tab.Panel>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Cadastro Manual de Carregamento Retroativo
                </h2>
                <p className="text-gray-600 mb-6">
                  Preencha os dados abaixo. As mensagens de despacho e XPT serão geradas automaticamente, mas você pode editá-las.
                </p>

                <form onSubmit={handleManualSubmit} className="space-y-8">
                  {/* Seção: Informações Gerais */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                      Informações Gerais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Destino *</label>
                        <select
                          name="destino"
                          value={formData.destino}
                          onChange={(e) => handleDestinoChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="EBA2">Pombal (EBA2)</option>
                          <option value="EBA3">Jacobina (EBA3)</option>
                          <option value="EBA4">Santo Antônio de Jesus (EBA4)</option>
                          <option value="EBA6">Juazeiro (EBA6)</option>
                          <option value="EBA14">Serrinha (EBA14)</option>
                          <option value="EBA16">Senhor do Bonfim (EBA16)</option>
                          <option value="EBA19">Itaberaba (EBA19)</option>
                          <option value="EBA21">Seabra (EBA21)</option>
                          <option value="EBA29">Valença (EBA29)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Facility *</label>
                        <select
                          name="facility"
                          value={formData.facility}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="SBA2">SBA02</option>
                          <option value="SBA4">SBA04</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Doca</label>
                        <input
                          type="text"
                          name="doca"
                          value={formData.doca}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 15"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="emFila">Em Fila</option>
                          <option value="carregando">Carregando</option>
                          <option value="liberado">Liberado</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Posição do Veículo</label>
                        <input
                          type="number"
                          name="posicaoVeiculo"
                          value={formData.posicaoVeiculo || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Operador *</label>
                        <input
                          type="text"
                          name="operador"
                          value={formData.operador}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          required
                          placeholder="Nome do operador"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção: Motorista */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                      <User className="w-5 h-5 mr-2 text-green-600" />
                      Motorista
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                        <input
                          type="text"
                          name="motorista.nome"
                          value={formData.motorista.nome}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Veículo *</label>
                        <select
                          name="motorista.tipoVeiculo"
                          value={formData.motorista.tipoVeiculo}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="Carreta">Carreta</option>
                          <option value="Truck">Truck</option>
                          <option value="Toco">Toco</option>
                          <option value="Bitrem">Bitrem</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Travel ID *</label>
                        <input
                          type="text"
                          name="motorista.travelId"
                          value={formData.motorista.travelId}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Placa Tração *</label>
                        <input
                          type="text"
                          name="motorista.veiculoTracao"
                          value={formData.motorista.veiculoTracao}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Placa Carga</label>
                        <input
                          type="text"
                          name="motorista.veiculoCarga"
                          value={formData.motorista.veiculoCarga}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="Opcional"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Transportadora</label>
                        <input
                          type="text"
                          name="motorista.transportadora"
                          value={formData.motorista.transportadora}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Data de Início</label>
                        <input
                          type="date"
                          name="motorista.dataInicio"
                          value={formData.motorista.dataInicio}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção: Horários */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-orange-600" />
                      Horários
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Encostado na Doca</label>
                        <input
                          type="time"
                          name="horarios.encostadoDoca"
                          value={formData.horarios.encostadoDoca}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Início Carregamento</label>
                        <input
                          type="time"
                          name="horarios.inicioCarregamento"
                          value={formData.horarios.inicioCarregamento}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Término Carregamento</label>
                        <input
                          type="time"
                          name="horarios.terminoCarregamento"
                          value={formData.horarios.terminoCarregamento}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Saída Liberada</label>
                        <input
                          type="time"
                          name="horarios.saidaLiberada"
                          value={formData.horarios.saidaLiberada}
                          onChange={(e) => handleSaidaChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Previsão de Chegada</label>
                        <input
                          type="time"
                          name="horarios.previsaoChegada"
                          value={formData.horarios.previsaoChegada}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção: Carga */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                      <Box className="w-5 h-5 mr-2 text-yellow-600" />
                      Carga
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Gaiolas</label>
                        <input
                          type="number"
                          name="carga.gaiolas"
                          value={formData.carga.gaiolas}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Volumosos</label>
                        <input
                          type="number"
                          name="carga.volumosos"
                          value={formData.carga.volumosos}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Manga Palete</label>
                        <input
                          type="number"
                          name="carga.manga"
                          value={formData.carga.manga}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção: Lacres */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                      <Tag className="w-5 h-5 mr-2 text-purple-600" />
                      Lacres
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Lacre Traseiro</label>
                        <input
                          type="text"
                          name="lacres.traseiro"
                          value={formData.lacres.traseiro}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          maxLength={7}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Lacre Lateral 1</label>
                        <input
                          type="text"
                          name="lacres.lateral1"
                          value={formData.lacres.lateral1}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          maxLength={7}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Lacre Lateral 2</label>
                        <input
                          type="text"
                          name="lacres.lateral2"
                          value={formData.lacres.lateral2}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção: Datas Retroativas */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-red-600" />
                      Datas Retroativas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Timestamp (criação do registro)</label>
                        <input
                          type="datetime-local"
                          name="timestamp"
                          value={formData.timestamp}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Data Criação (dataCriacao)</label>
                        <input
                          type="datetime-local"
                          name="dataCriacao"
                          value={formData.dataCriacao}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Data Envio (opcional)</label>
                        <input
                          type="datetime-local"
                          name="dataEnvio"
                          value={formData.dataEnvio || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Data Atualização (opcional)</label>
                        <input
                          type="datetime-local"
                          name="dataAtualizacao"
                          value={formData.dataAtualizacao || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção: Mensagens */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-md font-semibold text-gray-800 flex items-center">
                        <BookType className="w-5 h-5 mr-2 text-indigo-600" />
                        Mensagens
                      </h3>
                      <button
                        type="button"
                        onClick={generateMessages}
                        className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-200"
                      >
                        Gerar Automaticamente
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mensagem de Despacho</label>
                        <textarea
                          name="mensagemDespacho"
                          value={formData.mensagemDespacho}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="Será gerada automaticamente se vazia"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mensagem XPT</label>
                        <textarea
                          name="mensagemXPT"
                          value={formData.mensagemXPT}
                          onChange={handleInputChange}
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                          placeholder="Será gerada automaticamente se vazia"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resultado da submissão manual */}
                  {manualResult && (
                    <div
                      className={`p-4 rounded-md ${
                        manualResult.success ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex items-center">
                        {manualResult.success ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                        )}
                        <p
                          className={`text-sm font-medium ${
                            manualResult.success ? 'text-green-800' : 'text-red-800'
                          }`}
                        >
                          {manualResult.message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Botões */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        // Reset parcial (opcional)
                        setFormData({
                          ...formData,
                          destino: 'EBA2',
                          facility: 'SBA4',
                          doca: '',
                          motorista: { ...formData.motorista, nome: '', veiculoTracao: '', travelId: '' },
                          horarios: { encostadoDoca: '', inicioCarregamento: '', terminoCarregamento: '', saidaLiberada: '', previsaoChegada: '' },
                          carga: { gaiolas: '', volumosos: '', manga: '' },
                          lacres: { traseiro: '', lateral1: '', lateral2: '' },
                          mensagemDespacho: '',
                          mensagemXPT: '',
                        });
                        setManualResult(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Limpar
                    </button>
                    <button
                      type="submit"
                      disabled={manualSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
                    >
                      {manualSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Carregamento
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </div>
  );
}