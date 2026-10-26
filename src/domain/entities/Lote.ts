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
    public notaFiscal: string = "",
    public equipamentos: Equipamento[] = []
  ) {
    if (!this.notaFiscal) {
      this.notaFiscal = `NF-${this.numeroLote}`;
    }
  }

  adicionarEquipamento(equip: Equipamento): void {
    equip.loteId = this.id;
    this.equipamentos.push(equip);
  }

  removerEquipamento(equipId: string): boolean {
    const index = this.equipamentos.findIndex((e) => e.id === equipId);
    if (index === -1) return false;
    this.equipamentos.splice(index, 1);
    return true;
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

  gerarRelatorioTriagem(): string {
    const totalEquipamentos = this.equipamentos.length;
    const pesoTotal = this.calcularPesoTotal();
    return `Relatório de Triagem - Lote ${this.numeroLote} (NF: ${this.notaFiscal}): Status ${this.statusProcessamento}, ${totalEquipamentos} equipamentos, peso total de ${pesoTotal} kg.`;
  }

  garantirJanelaTemporal(): void {
    const validador = new ValidadorDataEntrada();
    if (!validador.validar(this.dataEntrada)) {
      throw new Error(validador.obterMensagemErro());
    }
  }
}
