// app/api/carregamento/etapa/route.ts
//
// PATCH /api/carregamento/etapa
//
// Avança a etapa de um carregamento no Kanban usando motoristaId como chave.
//
// Por que motoristaId e não _id?
//   • motoristaId = `${destino}_${facility}_${nome}_${travelId}`
//     É calculável no frontend sem nenhuma chamada async prévia.
//   • _id só está disponível depois do POST terminar E o resultado ser
//     salvo no localStorage — isso criava race condition.
//   • Com motoristaId não há dependência de localStorage, não há race.
//   • Idempotente: chamar N vezes com o mesmo status apenas atualiza
//     o timestamp — nunca cria duplicata.
//
// Regras de negócio do Kanban:
//   aguardando  → motorista foi adicionado (POST inicial)
//   emDoca      → operador salvou o número da doca
//   carregando  → operador preencheu horario.inicioCarregamento
//   finalizado  → saída liberada + lacre traseiro preenchidos
//
// IMPORTANTE: este arquivo deve exportar APENAS a função PATCH.
// Next.js route files não aceitam outros exports nomeados.

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

type Status = 'aguardando' | 'emDoca' | 'carregando' | 'finalizado';
const STATUS_VALIDOS: Status[] = ['aguardando', 'emDoca', 'carregando', 'finalizado'];
const TZ = 'America/Sao_Paulo';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { motoristaId, status, dadosAdicionais } = body as {
      motoristaId: string;
      status: Status;
      dadosAdicionais?: Record<string, any>;
    };

    if (!motoristaId || typeof motoristaId !== 'string') {
      return NextResponse.json({ error: 'motoristaId é obrigatório' }, { status: 400 });
    }

    if (!status || !STATUS_VALIDOS.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const agora = new Date();
    const agoraISO = agora.toISOString(); // UTC — correto para armazenamento

    // Log com horário de Brasília para facilitar leitura no servidor
    console.log(
      `[PATCH /etapa] ${motoristaId} → ${status}`,
      `| UTC: ${agoraISO}`,
      `| Brasília: ${agora.toLocaleString('pt-BR', { timeZone: TZ })}`
    );

    const setPayload: Record<string, any> = {
      status,
      [`timestamps.${status}`]: agoraISO,
      dataAtualizacao: agora,
    };

    // Mesclar dados extras (ex: doca) sem sobrescrever campos de controle
    if (dadosAdicionais && typeof dadosAdicionais === 'object') {
      for (const [key, value] of Object.entries(dadosAdicionais)) {
        if (!['status', 'timestamps', 'dataAtualizacao', '_id', 'motoristaId'].includes(key)) {
          setPayload[key] = value;
        }
      }
    }

    const result = await db
      .collection('carregamentos')
      .updateOne({ motoristaId }, { $set: setPayload });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: `Carregamento não encontrado: ${motoristaId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { motoristaId, status, timestamp: agoraISO },
    });
  } catch (error) {
    console.error('[PATCH /api/carregamento/etapa]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}