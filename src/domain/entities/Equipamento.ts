import { TipoEquipamento } from "../enums/TipoEquipamento";
import { EstadoFisico, calcularDiferencaEstadoFisico } from "../enums/EstadoFisico";
import { StatusRastreamento } from "../enums/StatusRastreamento";
import { Movimentacao } from "./Movimentacao";

export class Equipamento {
  constructor(
    public id: string,
    public codigoBarrasInterno: string,
    public tipo: TipoEquipamento,
    public marca: string,
    public modelo: string,
    public pesoKg: number,
    public estadoFisico: EstadoFisico,
    public precificacaoEstimada: number,
    public status: StatusRastreamento = StatusRastreamento.AGUARDANDO_TRIAGEM,
    public loteId: string = "",
    public versao: number = 1,
    public anoFabricacao: number = 2022,
    public posicaoNoLote: number = 1,
    public movimentacoes: Movimentacao[] = []
  ) {}

  atualizarStatus(novoStatus: StatusRastreamento, justificativa?: string): void {
    if (
      (novoStatus === StatusRastreamento.AGUARDANDO_DESMONTE || novoStatus === StatusRastreamento.EM_DESMONTE) &&
      this.status === StatusRastreamento.AGUARDANDO_TRIAGEM
    ) {
      throw new Error("Equipamento deve passar por triagem antes de transitar para desmonte.");
    }
    this.status = novoStatus;
  }

  transitarPara(novoStatus: StatusRastreamento): void {
    this.atualizarStatus(novoStatus);
  }

  atualizarEstadoFisico(novoEstado: EstadoFisico, justificativa?: string): void {
    const diferenca = calcularDiferencaEstadoFisico(this.estadoFisico, novoEstado);

    if (diferenca >= 2 && (!justificativa || !justificativa.trim())) {
      throw new Error("Degradação severa de estado físico requer justificativa obrigatória.");
    }

    this.estadoFisico = novoEstado;
  }

  registrarMovimentacao(
    origem: string,
    destino: string,
    responsavel: string,
    observacao?: string
  ): Movimentacao {
    const mov = new Movimentacao(
      "",
      this.id,
      new Date(),
      origem,
      destino,
      responsavel,
      observacao
    );
    this.movimentacoes.push(mov);
    return mov;
  }

  calcularDepreciacao(): number {
    const fatores: Record<EstadoFisico, number> = {
      [EstadoFisico.NOVO]: 0.0,
      [EstadoFisico.BOM_ESTADO]: 0.1,
      [EstadoFisico.USADO_LEVE]: 0.25,
      [EstadoFisico.USADO_MODERADO]: 0.45,
      [EstadoFisico.DANIFICADO_LEVE]: 0.65,
      [EstadoFisico.DANIFICADO_GRAVE]: 0.85,
      [EstadoFisico.INSERVIVEL]: 0.98
    };

    const depreciacao = fatores[this.estadoFisico] ?? 0;
    return Number((this.precificacaoEstimada * (1 - depreciacao)).toFixed(2));
  }
}
