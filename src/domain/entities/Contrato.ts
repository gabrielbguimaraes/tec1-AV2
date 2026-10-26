export class Contrato {
  constructor(
    public id: string,
    public organizacaoId: string,
    public dataInicio: Date,
    public dataVencimento: Date,
    public valorTotal: number,
    public renovacaoAutomatica: boolean = false,
    public versao: number = 1
  ) {}

  estaVigente(): boolean {
    const agora = new Date();
    return agora >= this.dataInicio && agora <= this.dataVencimento;
  }

  renovar(mesesAdicionais: number = 12): void {
    const novaData = new Date(this.dataVencimento);
    novaData.setMonth(novaData.getMonth() + mesesAdicionais);
    this.dataVencimento = novaData;
  }
}
