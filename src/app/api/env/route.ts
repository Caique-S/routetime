import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Use GET nomeado, não export default
export async function GET() {
  const resultados = {
    sucesso: false,
    mensagem: '',
    variavelEncontrada: false,
    arquivosEncontrados: [] as string[],
    caminhosVerificados: [] as string[],
    diretorioAtual: process.cwd(),
    conteudoParcial: null as string | null,
    sugestoes: [] as string[]
  };

  try {
    // 1. Verificar se a variável MONGODB_URI está disponível
    resultados.variavelEncontrada = !!process.env.MONGODB_URI;
    
    if (resultados.variavelEncontrada) {
      const uriPreview = process.env.MONGODB_URI?.substring(0, 30);
      resultados.mensagem = `✅ Variável MONGODB_URI encontrada! Início: ${uriPreview}...`;
      resultados.sucesso = true;
      
      return NextResponse.json(resultados, { status: 200 });
    }

    // 2. Se não encontrou, vamos procurar arquivos .env
    const raizProjeto = process.cwd();
    resultados.diretorioAtual = raizProjeto;
    
    // Lista de possíveis nomes de arquivo
    const possiveisNomes = [
      '.env.local',
      '.env',
      '.env.development',
      '.env.local.backup',
      'env.local'
    ];
    
    // Diretórios para verificar
    const diretoriosParaVerificar = [
      raizProjeto,
      path.join(raizProjeto, 'src'),
      path.join(raizProjeto, 'app'),
      path.join(raizProjeto, '..'),
    ];
    
    // Verificar cada diretório
    for (const dir of diretoriosParaVerificar) {
      if (fs.existsSync(dir)) {
        resultados.caminhosVerificados.push(dir);
        
        for (const nomeArquivo of possiveisNomes) {
          const caminhoCompleto = path.join(dir, nomeArquivo);
          
          if (fs.existsSync(caminhoCompleto)) {
            resultados.arquivosEncontrados.push(caminhoCompleto);
            
            if (nomeArquivo === '.env.local' || nomeArquivo === '.env') {
              try {
                const conteudo = fs.readFileSync(caminhoCompleto, 'utf-8');
                const linhas = conteudo.split('\n').slice(0, 5);
                const linhasFiltradas = linhas.map(linha => {
                  if (linha.startsWith('MONGODB_URI=')) {
                    const valor = linha.split('=')[1];
                    return `MONGODB_URI=${valor?.substring(0, 20)}...`;
                  }
                  return linha;
                });
                resultados.conteudoParcial = linhasFiltradas.join('\n');
              } catch (err) {
                resultados.conteudoParcial = 'Erro ao ler arquivo';
              }
            }
          }
        }
      }
    }
    
    // 3. Gerar sugestões
    if (resultados.arquivosEncontrados.length > 0) {
      resultados.sugestoes.push(
        `📁 Arquivo(s) .env encontrado(s) em: ${resultados.arquivosEncontrados.join(', ')}`,
        `💡 O arquivo deve estar na raiz do projeto: ${raizProjeto}`,
        `🔄 Copie o arquivo para: ${path.join(raizProjeto, '.env.local')}`,
        `🔄 Depois de copiar, REINICIE o servidor (Ctrl+C e npm run dev)`
      );
      
      if (!resultados.arquivosEncontrados.some(arq => arq.includes(raizProjeto))) {
        resultados.sugestoes.push(
          `⚠️ Nenhum arquivo .env.local encontrado na raiz do projeto!`,
          `📋 Execute no terminal:`,
          `   copy "${resultados.arquivosEncontrados[0]}" "${path.join(raizProjeto, '.env.local')}"`
        );
      }
    } else {
      resultados.sugestoes.push(
        `❌ Nenhum arquivo .env encontrado em nenhum local verificado!`,
        `📝 Crie o arquivo .env.local na raiz do projeto: ${raizProjeto}`,
        `📋 Exemplo de conteúdo:`,
        `   MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/seu_banco`
      );
    }
    
    resultados.mensagem = '❌ Variável MONGODB_URI NÃO encontrada no ambiente ';
    
  } catch (error) {
    resultados.mensagem = `Erro durante diagnóstico: ${error}`;
  }
  
  return NextResponse.json(resultados, { status: 200 });
}