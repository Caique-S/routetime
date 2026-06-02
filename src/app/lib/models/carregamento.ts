import { StatusCarregamento } from "@/app/lib/utils/status"

// Função que gera o 'numero' aleatório do Objeto EX: "CAR-1774948989570-R46B".
// Serve como um indicador único.
export function gerarNumeroCarregamento(): string {
    return `CAR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

export interface ICarregamento {
    codigo: string,
    doca?: string,
    facility: string,
    destino: string,
    motorista?:{
        nome?: string,
        tipoVeiculo?: string,
        veiculoTracao?: string,
        veiculoCarga?: string,
        travelId: string,
        transportadora: string,
        dataInicio: string,
        },
        horarios?:{
            encostadoDoca?: string | null,
            inicioCarregamento?: string | null,
            terminoCarregamento?: string | null,
            saidaLiberada?: string | null,
            previsaoChegada?: string | null,
        },
        carga?:{
            gaiolas?: number,
            volumosos?: number,
            manga?: number,
        },
        lacres?:{
            traseiro?: string,
            lateral1?: string,
            lateral2?: string,
        },
        status: StatusCarregamento,
        posicaoVeiculo?: number,
        motoristaId?: string,
        operador?: string,
        timestamp: {
            aguardando: Date,
            emDoca?: Date,
            carregando?: Date,
        },
        dataCriacao: Date,
        dataEnvio?: Date,
        dataAtualizacao?: Date,
        mensagemDespacho?: string,
        mensagemXPT?: string,
        numero?: string,
}

// Função que cria o objeto completo de carregamento com os dados Disponíveis no CSV

export function criarCarregamentosFromCSV (row: Record<string,unknown>, facilityFallback: string): ICarregamento {
    
    const codigo = String(row['ID'] ?? ''.trim())
    const transportadora = String(row['Transportadora'] ?? ''.trim())
    const facility = String(row['Facility'] ?? ''.trim()) || facilityFallback;
    const tipoVeiculo = String(row['Tipo de veículo'] ?? ''.trim())
    const nome = String(row['Nome do motorista 1'] ?? ''.trim())
    const veiculoTracao = String(row['Veículo de tração'] ?? ''.trim())
    const veiculoCarga = String(row['Veículo de carga'] ?? ''.trim())
    const dataInicio = String(row['Data de início'] ?? ''.trim())
    const destino = String(row['Destino'] ?? ''.trim())
    const travelId = String(row['Travel ID'] ?? ''.trim())
    const motoristaId = `${destino}_${facility}_${nome}_${travelId}`

    return{
        codigo,
        doca: '',
        facility,
        destino,
        motorista:{
            nome,
            tipoVeiculo,
            veiculoTracao,
            veiculoCarga,
            travelId,
            transportadora,
            dataInicio
        },
        horarios:{
            encostadoDoca: null,
            inicioCarregamento: null,
            terminoCarregamento: null,
            saidaLiberada: null,
            previsaoChegada: null,
        },
        carga:{
            gaiolas: 0,
            volumosos: 0,
            manga: 0,
        },
        lacres:{
            traseiro: "",
            lateral1: "",
            lateral2: "",
        },
        status: 'aguardando' as StatusCarregamento,
        posicaoVeiculo: 0,
        motoristaId,
        operador: '',
        timestamp: {
            aguardando: new Date(),
            emDoca: undefined,
            carregando: undefined,
        },
        dataCriacao: new Date(),
        dataEnvio: undefined,
        dataAtualizacao: new Date(),
        mensagemDespacho: '',
        mensagemXPT: '',
        numero: gerarNumeroCarregamento(),

    }
}