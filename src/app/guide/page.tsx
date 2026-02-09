'use client';

import { Smartphone, Camera, Shield, Download, RefreshCw } from 'lucide-react';

export default function PermissionsGuide() {
  const isWebView = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return /wv/.test(userAgent) || /android.*wv/.test(userAgent);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Configuração de Permissões</h1>
          </div>

          {isWebView() ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Smartphone className="w-6 h-6 text-blue-600" />
                  <h3 className="font-bold text-blue-900">Modo Aplicativo Detectado</h3>
                </div>
                <p className="text-blue-800">
                  Você está usando o sistema através de um aplicativo.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg text-gray-900">Siga estes passos:</h3>
                
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Permissões do Aplicativo</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Vá para Configurações → Aplicativos → Expedição → Permissões
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Habilitar Câmera</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Ative a permissão de câmera para escanear QR Codes
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Habilitar Armazenamento</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Ative o acesso a arquivos para fazer upload de CSV
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Reiniciar Aplicativo</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Feche e abra novamente o aplicativo após configurar as permissões
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <RefreshCw className="w-5 h-5" />
                  Recarregar após configurar permissões
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">
                Você está usando o sistema em um navegador web padrão.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                As permissões são solicitadas automaticamente quando necessário.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}