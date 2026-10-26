import { StatusLote } from "../enums/StatusLote";
import { Equipamento } from "./Equipamento";
import { ValidadorDataEntrada } from "../validators/ValidadorDataEntrada";

export class Lote {
  constructor(
    public id: string,
    public numeroLote: string,
    public organizacaoId: string,
    public dataEntrada: Date,
    public transportadora: string,
    public statusProcessamento: StatusLote = StatusLote.RECEBIDO,
    public observacoes?: string | null,
    public versao: number = 1,
    public equipamentos: Equipamento[] = []
  ) {}

  adicionarEquipamento(equip: Equipamento): void {
    equip.loteId = this.id;
    this.equipamentos.push(equip);
  }

  atualizarStatus(novoStatus: StatusLote): boolean {
    this.statusProcessamento = novoStatus;
    return true;
  }

  calcularPesoTotal(): number {
    return Number(
      this.equipamentos.reduce((acc, eq) => acc + (eq.pesoKg || 0), 0).toFixed(2)
    );
  }

  garantirJanelaTemporal(): void {
    const validador = new ValidadorDataEntrada();
    if (!validador.validar(this.dataEntrada)) {
      throw new Error(validador.obterMensagemErro());
    }
  }
}
