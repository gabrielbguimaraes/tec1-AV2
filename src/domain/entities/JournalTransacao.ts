export class JournalTransacao {
  constructor(
    public id: string,
    public timestamp: Date,
    public operacao: string,
    public entidade: string,
    public operador: string,
    public dadosAntes?: unknown,
    public dadosDepois?: unknown,
    public ipOrigem?: string | null,
    public sucesso: boolean = true
  ) {}
}
