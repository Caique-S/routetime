'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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


  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-100">

    </div>
  );
}