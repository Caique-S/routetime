'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, FileUp, AlertCircle, Loader2 } from 'lucide-react';
import { parse } from 'papaparse';
import { useRouter } from 'next/navigation';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Mensagem {
  tipo:  'sucesso' | 'erro';
  texto: string;
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router       = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file,               setFile]               = useState<File | null>(null);
  const [uploading,          setUploading]          = useState(false);
  const [mensagem,           setMensagem]           = useState<Mensagem | null>(null);
  const [headers,            setHeaders]            = useState<string[]>([]);
  const [selectedColumn,     setSelectedColumn]     = useState('');
  const [columnValues,       setColumnValues]       = useState<string[]>([]);
  const [selectedValue,      setSelectedValue]      = useState('');
  const [loadingColumnValues, setLoadingColumnValues] = useState(false);

  // Lê os cabeçalhos do CSV ao selecionar o arquivo
  useEffect(() => {
    if (!file) {
      setHeaders([]);
      setSelectedColumn('');
      setColumnValues([]);
      setSelectedValue('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const { data, errors } = parse(e.target?.result as string, { preview: 1 });
      if (errors.length > 0) {
        setMensagem({ tipo: 'erro', texto: 'Erro ao ler o arquivo CSV' });
        return;
      }
      if (data.length > 0) setHeaders(data[0] as string[]);
    };
    reader.readAsText(file);
  }, [file]);

  // Carrega valores únicos da coluna selecionada
  useEffect(() => {
    if (!file || !selectedColumn) {
      setColumnValues([]);
      return;
    }

    setLoadingColumnValues(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const { data, errors } = parse(e.target?.result as string, {
        header:         true,
        skipEmptyLines: true,
      });

      if (errors.length > 0) {
        setMensagem({ tipo: 'erro', texto: 'Erro ao ler os valores da coluna' });
        setLoadingColumnValues(false);
        return;
      }

      const uniqueValues = Array.from(
        new Set((data as Record<string, unknown>[]).map((row) => row[selectedColumn]).filter(Boolean))
      )
        .slice(0, 100)
        .map(String);

      setColumnValues(uniqueValues);
      setLoadingColumnValues(false);
    };
    reader.readAsText(file);
  }, [file, selectedColumn]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setSelectedColumn('');
    setSelectedValue('');
    setMensagem(null);
  }

  function resetFormulario() {
    setFile(null);
    setHeaders([]);
    setSelectedColumn('');
    setColumnValues([]);
    setSelectedValue('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setMensagem({ tipo: 'erro', texto: 'Por favor, selecione um arquivo CSV' });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setMensagem({ tipo: 'erro', texto: 'Apenas arquivos CSV são permitidos' });
      return;
    }

    setUploading(true);
    setMensagem(null);

    const formData = new FormData();
    formData.append('file', file);
    if (selectedColumn) formData.append('filterColumn', selectedColumn);
    if (selectedValue)  formData.append('filterValue',  selectedValue);

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data     = await response.json();

      if (response.ok) {
        const { processedRecords, carregamentos } = data.data;
        setMensagem({
          tipo: 'sucesso',
          texto: `Arquivo processado com sucesso! ${processedRecords} registros gravados. ${carregamentos?.criados ?? 0} carregamentos criados no Kanban.`,
        });
        resetFormulario();
      } else {
        setMensagem({ tipo: 'erro', texto: data.error ?? 'Erro ao fazer upload' });
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexão com o servidor' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen mt-12 bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">

        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-green-600 hover:text-green-700 mb-4"
          >
            ← Voltar
          </button>
          <h2 className="text-3xl font-bold text-gray-900">Upload de CSV</h2>
          <p className="mt-2 text-gray-600">Faça upload de um arquivo CSV para processamento</p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Área de seleção de arquivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione o arquivo CSV
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-green-500 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="csv-file"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none"
                    >
                      <span>Clique para selecionar</span>
                      <input
                        id="csv-file"
                        name="file"
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        required
                      />
                    </label>
                    <p className="pl-1">ou arraste e solte</p>
                  </div>
                  <p className="text-xs text-gray-500">Apenas arquivos CSV até 10MB</p>
                </div>
              </div>

              {file && (
                <div className="mt-4 p-3 bg-green-50 rounded-md flex items-center">
                  <FileUp className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            {/* Filtros — visíveis apenas após selecionar o arquivo */}
            {file && headers.length > 0 && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Configuração de Filtro (Opcional)
                </label>

                {/* Seleção de coluna */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Coluna para filtrar
                  </label>
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="">Selecione uma coluna</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Seleção de valor */}
                {selectedColumn && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Valor para filtrar
                    </label>
                    {loadingColumnValues ? (
                      <div className="flex items-center gap-2 p-2">
                        <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                        <span className="text-sm text-gray-500">Carregando valores...</span>
                      </div>
                    ) : (
                      <>
                        <select
                          value={selectedValue}
                          onChange={(e) => setSelectedValue(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        >
                          <option value="">Todos os registros</option>
                          {columnValues.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                        {columnValues.length === 100 && (
                          <p className="mt-1 text-xs text-gray-500">
                            Mostrando até 100 valores.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  Se nenhum valor for selecionado, todos os registros serão importados.
                </p>
              </div>
            )}

            {/* Mensagem de feedback */}
            {mensagem && (
              <div className={`p-4 rounded-md ${mensagem.tipo === 'sucesso' ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center">
                  <AlertCircle className={`h-5 w-5 mr-2 ${mensagem.tipo === 'sucesso' ? 'text-green-400' : 'text-red-400'}`} />
                  <p className={`text-sm font-medium ${mensagem.tipo === 'sucesso' ? 'text-green-800' : 'text-red-800'}`}>
                    {mensagem.texto}
                  </p>
                </div>
              </div>
            )}

            {/* Botão de envio */}
            <button
              type="submit"
              disabled={uploading || !file}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
                ${uploading || !file
                  ? 'bg-green-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Processar CSV
                </>
              )}
            </button>
          </form>

          {/* Instruções */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Informações importantes:</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              {[
                'O arquivo deve estar no formato CSV',
                'A primeira linha deve conter os cabeçalhos',
                'Os dados serão filtrados conforme a coluna e valor selecionados',
                'Cada motorista do CSV gerará automaticamente um card no Kanban',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-green-500 shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}