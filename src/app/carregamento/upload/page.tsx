'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, FileUp, AlertCircle, Filter, Loader2 } from 'lucide-react';
import { parse } from 'papaparse'
import Link from 'next/link';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Estados para os filtros
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [columnValues, setColumnValues] = useState<string[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('');

  // Estado para controlar o carregamento dos valores da coluna
  const [loadingColumnValues, setLoadingColumnValues] = useState(false);

  // Ref para o input de arquivo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quando o arquivo mudar, ler s cabeçalhos
  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Fazer parse apenas para obter os cabeçalhos
        const { data, errors } = parse(content, {
          preview: 1, // Apenas a primeira linha (cabeçalho)
        });

        if (errors.length > 0) {
          setMessage({ type: 'error', text: 'Erro ao ler o arquivo CSV' });
          return;
        }

        if (data && data.length > 0) {
          // A primeira linha é o cabeçalho
          setHeaders(data[0] as string[]);
        }
      };
      reader.readAsText(file);
    } else {
      setHeaders([]);
      setSelectedColumn('');
      setColumnValues([]);
      setSelectedValue('');
    }
  }, [file]);

  // Quando a coluna selecionada mudar, buscar os valores únicos da coluna
  useEffect(() => {
    if (!file || !selectedColumn) {
      setColumnValues([]);
      return;
    }

    setLoadingColumnValues(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const { data, errors } = parse(content, {
        header: true,
        skipEmptyLines: true,
      });

      if (errors.length > 0) {
        setMessage({ type: 'error', text: 'Erro ao ler os valores da coluna' });
        setLoadingColumnValues(false);
        return;
      }

      // Extrair valores únicos da coluna selecionada
      const values = (data as any[]).map(row => row[selectedColumn]).filter(Boolean);
      const uniqueValues = Array.from(new Set(values)).slice(0, 100); // Limitar a 100 valores para não sobrecarregar a UI

      setColumnValues(uniqueValues.map(v => String(v)));
      setLoadingColumnValues(false);
    };
    reader.readAsText(file);
  }, [file, selectedColumn]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setSelectedColumn('');
      setSelectedValue('');
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setMessage({ type: 'error', text: 'Por favor, selecione um arquivo CSV' });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setMessage({ type: 'error', text: 'Apenas arquivos CSV são permitidos' });
      return;
    }

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    if (selectedColumn) formData.append('filterColumn', selectedColumn);
    if (selectedValue) formData.append('filterValue', selectedValue);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Arquivo processado com sucesso! ${data.data.processedRecords} registros gravados.`
        });
        // Resetar o formulário
        setFile(null);
        setHeaders([]);
        setSelectedColumn('');
        setColumnValues([]);
        setSelectedValue('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao fazer upload' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão com o servidor' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen mt-12 bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-green-600 hover:text-green-700 mb-4">
            ← Voltar
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">Upload de CSV</h2>
          <p className="mt-2 text-gray-600">
            Faça upload de um arquivo CSV para processamento
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  <p className="text-xs text-gray-500">
                    Apenas arquivos CSV até 10MB
                  </p>
                </div>
              </div>
              {file && (
                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <div className="flex items-center">
                    <FileUp className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Filtros */}
            {file && headers.length > 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Configuração de Filtro (Opcional)
                  </label>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Selecione a Coluna para Filtrar
                      </label>
                      <select
                        value={selectedColumn}
                        onChange={(e) => setSelectedColumn(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      >
                        <option value="">Selecione uma coluna</option>
                        {headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedColumn && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Valor da Coluna para Filtrar
                        </label>
                        {loadingColumnValues ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                            <span className="ml-2 text-sm text-gray-500">Carregando valores...</span>
                          </div>
                        ) : (
                          <>
                            <select
                              value={selectedValue}
                              onChange={(e) => setSelectedValue(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                            >
                              <option value="">Selecione um valor (ou deixe em branco para todos)</option>
                              {columnValues.map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                              {columnValues.length === 100 ? 'Mostrando até 100 valores. Selecione um valor específico para filtrar.' : 'Selecione um valor para filtrar.'}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Se nenhum valor for selecionado, todos os registros serão importados.
                  </p>
                </div>
              </div>
            )}

            {message && (
              <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center">
                  <AlertCircle className={`h-5 w-5 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'} mr-2`} />
                  <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {message.text}
                  </p>
                </div>
              </div>
            )}

            <div>
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
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Processar CSV
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Informações importantes:</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <div className="shrink-0 h-5 w-5 text-green-500">✓</div>
                <span className="ml-2">O arquivo deve estar no formato CSV</span>
              </li>
              <li className="flex items-start">
                <div className="shrink-0 h-5 w-5 text-green-500">✓</div>
                <span className="ml-2">A primeira linha deve conter os cabeçalhos</span>
              </li>
              <li className="flex items-start">
                <div className="shrink-0 h-5 w-5 text-green-500">✓</div>
                <span className="ml-2">Os dados serão filtrados conforme a coluna e valor selecionados</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
