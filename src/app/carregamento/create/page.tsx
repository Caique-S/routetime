'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Truck,
  User,
  Calendar,
  MapPin,
  Building,
  Download,
  Printer
} from 'lucide-react';

export default function CreateCarregamentoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [carregamentoData, setCarregamentoData] = useState<any>(null);

  useEffect(() => {
    const destino = searchParams.get('destino');
    const motoristaNome = searchParams.get('motorista');
    const facility = searchParams.get('facility');

    if (destino && motoristaNome && facility) {
      // 1. Recuperar dados do localStorage
      const expedicaoEditavel = JSON.parse(localStorage.getItem('ExpedicaoEditavel') || '{}');
      const motoristaSelecionado = JSON.parse(localStorage.getItem('MotoristaSelecionado') || '{}');
      const destinoAtual = JSON.parse(localStorage.getItem('DestinoAtual') || '{}');

      // 2. Buscar dados do operador
      const operadorData = JSON.parse(localStorage.getItem('operador_data') || '{}');

      // 3. Montar objeto final do carregamento
      const carregamentoFinal = {
        id: `CAR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        dataCriacao: new Date().toISOString(),
        status: 'pendente',
        
        // Dados do destino
        destino: destinoAtual.nome || destino,
        destinoCodigo: destinoAtual.codigo || destino,
        facility: destinoAtual.facility || facility,
        
        // Dados do motorista
        motorista: motoristaSelecionado.nome || motoristaNome,
        tipoVeiculo: motoristaSelecionado.tipoVeiculo,
        veiculoTracao: motoristaSelecionado.veiculoTracao,
        veiculoCarga: motoristaSelecionado.veiculoCarga,
        travelId: motoristaSelecionado.travelId,
        placa: motoristaSelecionado.placa,
        transportadora: motoristaSelecionado.transportadora,
        
        // Dados do operador
        operador: operadorData.nome || 'Operador',
        operadorCargo: operadorData.cargo || 'Dispatch',
        
        // Informações adicionais do CSV
        csvSource: expedicaoEditavel.fileName,
        csvUploadDate: expedicaoEditavel.uploadDate
      };

      setCarregamentoData(carregamentoData);
      
      // 4. Salvar no histórico de carregamentos
      const historico = JSON.parse(localStorage.getItem('HistoricoCarregamentos') || '[]');
      historico.push(carregamentoFinal);
      localStorage.setItem('HistoricoCarregamentos', JSON.stringify(historico));
      
      // 5. Enviar para API (opcional)
      enviarParaAPI(carregamentoFinal);
    }
    
    setLoading(false);
  }, [searchParams]);

  const enviarParaAPI = async (data: any) => {
    try {
      const response = await fetch('/api/carregamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        console.log('✅ Carregamento salvo na API');
      }
    } catch (error) {
      console.error('❌ Erro ao enviar para API:', error);
    }
  };

  const handleGerarRelatorio = () => {
    // Gerar PDF ou documento do relatório
    const relatorio = {
      ...carregamentoData,
      dataEmissao: new Date().toISOString(),
      numeroRelatorio: `REL-${Date.now()}`
    };
    
    // Salvar relatório
    localStorage.setItem('UltimoRelatorio', JSON.stringify(relatorio));
    
    // Abrir em nova janela para impressão
    const janelaRelatorio = window.open('', '_blank');
    if (janelaRelatorio) {
      janelaRelatorio.document.write(`
        <html>
          <head>
            <title>Relatório de Carregamento - ${relatorio.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 40px; }
              .section { margin-bottom: 30px; }
              .field { margin: 10px 0; }
              .label { font-weight: bold; color: #555; }
              .value { color: #333; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📋 Relatório de Carregamento</h1>
              <p>Número: ${relatorio.id}</p>
              <p>Data: ${new Date(relatorio.dataEmissao).toLocaleDateString('pt-BR')}</p>
            </div>
            
            <div class="section">
              <h2>🚚 Dados do Transporte</h2>
              <div class="field">
                <span class="label">Destino:</span>
                <span class="value"> ${relatorio.destino} (${relatorio.destinoCodigo})</span>
              </div>
              <div class="field">
                <span class="label">Motorista:</span>
                <span class="value"> ${relatorio.motorista}</span>
              </div>
              <div class="field">
                <span class="label">Veículos:</span>
                <span class="value"> ${relatorio.veiculoTracao} + ${relatorio.veiculoCarga}</span>
              </div>
              <div class="field">
                <span class="label">Travel ID:</span>
                <span class="value"> ${relatorio.travelId}</span>
              </div>
            </div>
            
            <div class="section">
              <h2>🏢 Dados da Operação</h2>
              <div class="field">
                <span class="label">Facility:</span>
                <span class="value"> ${relatorio.facility}</span>
              </div>
              <div class="field">
                <span class="label">Operador:</span>
                <span class="value"> ${relatorio.operador}</span>
              </div>
              <div class="field">
                <span class="label">Data/Hora:</span>
                <span class="value"> ${new Date(relatorio.dataCriacao).toLocaleString('pt-BR')}</span>
              </div>
            </div>
            
            <div style="margin-top: 50px; text-align: center; color: #666;">
              <p>Relatório gerado automaticamente pelo Dispatch Center</p>
              <p>© ${new Date().getFullYear()} - Sistema de Expedição</p>
            </div>
            
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-100">
      {/* Interface de criação de carregamento */}
      {/* Similar às outras páginas, com formulário para dados adicionais */}
    </div>
  );
}