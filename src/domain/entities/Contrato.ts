export class Contrato {
  constructor(
    public id: string,
    public organizacaoId: string,
    public dataInicio: Date,
    public dataVencimento: Date,
    public valorTotal: number,
    public renovacaoAutomatica: boolean = false,
    public versao: number = 1,
    public clausulas: string[] = []
  ) {}

  estaVigente(): boolean {
    const agora = new Date();
    return agora >= this.dataInicio && agora <= this.dataVencimento;
  }

  renovar(novoVencimento: Date): void {
    if (novoVencimento <= this.dataVencimento) {
      throw new Error("Novo vencimento deve ser posterior ao vencimento atual.");
    }
    this.dataVencimento = novoVencimento;
  }
}
