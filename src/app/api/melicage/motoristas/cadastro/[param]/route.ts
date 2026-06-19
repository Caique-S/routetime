import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';

function buildFilter(param: string, transportadoraId: string) {
  const filter: any = { $or: [] };

  const ownFilter: any = { transportadora_id: transportadoraId };
  const legacyFilter: any = { transportadora_id: { $exists: false } };

  if (/^[a-f\d]{24}$/i.test(param)) {
    ownFilter._id = new ObjectId(param);
    legacyFilter._id = new ObjectId(param);
  } else {
    ownFilter.cpf = param.replace(/\D/g, '');
    legacyFilter.cpf = param.replace(/\D/g, '');
  }

  filter.$or = [ownFilter, legacyFilter];
  return filter;
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ param: string }> }
) {
  try {
    const { param } = await params;
    const db = await getDatabase();
    const isCpf = /^\d{11}$/.test(param.replace(/\D/g, ''));
    const isObjectId = /^[a-f\d]{24}$/i.test(param);

    if (isCpf) {
      const cpfLimpo = param.replace(/\D/g, '');
      const motorista = await db.collection('melicages_motoristas_cadastro').findOne({ cpf: cpfLimpo });
      let nomeTransportadoraResolvido = "Não Informado";


      if (motorista?.transportadora_id) {
        const transportadoraDoc = await db
          .collection('melicages_transportadoras')
          .findOne({ _id: motorista.transportadora_id });

        if (transportadoraDoc && transportadoraDoc.nome) {
          nomeTransportadoraResolvido = transportadoraDoc.nome;
        }
      }

      if (!motorista) {
        return NextResponse.json(
          { success: false, erro: 'Motorista não encontrado' },
          { status: 404 }
        );
      }

      const data = {
        id: motorista._id.toString(),
        ...motorista,
        transportadora: nomeTransportadoraResolvido
      };

      return NextResponse.json({ success: true, data });
    }

    const transportadoraId = request.headers.get('x-transportadora-id');
    if (!transportadoraId) {
      return NextResponse.json(
        { success: false, erro: 'Não autenticado' },
        { status: 401 }
      );
    }

    if (!isObjectId) {
      return NextResponse.json(
        { success: false, erro: 'Parâmetro inválido' },
        { status: 400 }
      );
    }

    const motorista = await db
      .collection('melicages_motoristas_cadastro')
      .findOne(buildFilter(param, transportadoraId));

    if (!motorista) {
      return NextResponse.json(
        { success: false, erro: 'Motorista não encontrado' },
        { status: 404 }
      );
    }

    let nomeTransportadoraResolvido = "Não Informado";
    if (motorista.transportadora_id) {
      const transportadoraDoc = await db
        .collection('melicages_transportadoras')
        .findOne({ _id: motorista.transportadora_id });

      if (transportadoraDoc && transportadoraDoc.nome) {
        nomeTransportadoraResolvido = transportadoraDoc.nome;
      }
    }

    const data = {
      id: motorista._id.toString(),
      ...motorista,
      transportadora: nomeTransportadoraResolvido
    };

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('[API] GET /motoristas/cadastro/[param] error:', error);
    return NextResponse.json(
      { success: false, erro: 'Erro interno' },
      { status: 500 }
    );
  }
}

// PUT /api/.../[param] – atualiza motorista
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ param: string }> }
) {
  const transportadoraId = request.headers.get('x-transportadora-id');
  if (!transportadoraId) {
    return NextResponse.json({ success: false, erro: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { param } = await params;
    const body = await request.json();
    const { nome, telefone, email, origem, destino_xpt, cpf, transportadora_id } = body;

    const cpfNovo = cpf ? cpf.replace(/\D/g, '') : undefined;

    const update: Record<string, any> = {};
    if (nome !== undefined) update.nome = nome;
    if (cpfNovo !== undefined) update.cpf = cpfNovo;
    if (telefone !== undefined) update.telefone = telefone;
    if (email !== undefined) update.email = email;
    if (origem !== undefined) update.origem = origem;
    if (destino_xpt !== undefined) update.destino_xpt = destino_xpt;

    // Se o frontend enviar transportadora_id, usamos; senão, mantemos a original
    if (transportadora_id !== undefined) {
      update.transportadora_id = transportadora_id;
    } else {
      // Garantir que motoristas antigos recebam a transportadora logada
      // (isso é feito mais adiante, após encontrar o documento)
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, erro: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection('melicages_motoristas_cadastro');

    // Buscar o motorista atual (para saber se é antigo)
    const currentMotorista = await collection.findOne(buildFilter(param, transportadoraId));
    if (!currentMotorista) {
      return NextResponse.json({ success: false, erro: 'Motorista não encontrado' }, { status: 404 });
    }

    // Se o motorista é antigo (não tem transportadora_id), forçamos a atribuição da logada
    if (!currentMotorista.transportadora_id) {
      update.transportadora_id = transportadoraId;
    }

    // Se CPF está sendo alterado, verifica duplicidade na mesma transportadora
    if (cpfNovo && cpfNovo !== currentMotorista.cpf) {
      const existing = await collection.findOne({
        cpf: cpfNovo,
        transportadora_id: update.transportadora_id || currentMotorista.transportadora_id,
        _id: { $ne: currentMotorista._id }
      });
      if (existing) {
        return NextResponse.json(
          { success: false, erro: 'CPF já cadastrado nesta transportadora' },
          { status: 409 }
        );
      }
    }

    // Atualiza
    const result = await collection.updateOne(
      { _id: currentMotorista._id },
      { $set: { ...update, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, erro: 'Motorista não encontrado' }, { status: 404 });
    }

    const updated = await collection.findOne({ _id: currentMotorista._id });
    const { _id, ...rest } = updated!;
    return NextResponse.json({ success: true, data: { id: _id.toString(), ...rest } });
  } catch (error: any) {
    console.error('[API] PUT /motoristas/cadastro/[param] error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}

// DELETE /api/.../[param] – exclui motorista
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ param: string }> }
) {
  const transportadoraId = request.headers.get('x-transportadora-id');
  if (!transportadoraId) {
    return NextResponse.json({ success: false, erro: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { param } = await params;
    const db = await getDatabase();

    // Primeiro encontra o motorista para verificar permissão
    const motorista = await db.collection('melicages_motoristas_cadastro').findOne(buildFilter(param, transportadoraId));
    if (!motorista) {
      return NextResponse.json({ success: false, erro: 'Motorista não encontrado' }, { status: 404 });
    }

    // Permite exclusão se o motorista pertence à transportadora logada OU é antigo (sem transportadora_id)
    if (motorista.transportadora_id && motorista.transportadora_id !== transportadoraId) {
      return NextResponse.json(
        { success: false, erro: 'Você não tem permissão para excluir este motorista' },
        { status: 403 }
      );
    }

    // Exclui
    const result = await db
      .collection('melicages_motoristas_cadastro')
      .deleteOne({ _id: motorista._id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, erro: 'Motorista não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Motorista excluído com sucesso' });
  } catch (error: any) {
    console.error('[API] DELETE /motoristas/cadastro/[param] error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}