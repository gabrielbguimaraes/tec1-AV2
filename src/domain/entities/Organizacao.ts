import { Contrato } from "./Contrato";
import { Lote } from "./Lote";

export class Organizacao {
  constructor(
    public id: string,
    public razaoSocial: string,
    public cnpj: string,
    public inscricaoEstadual: string,
    public enderecoCompleto: string,
    public telefone: string,
    public email: string,
    public ativo: boolean = true,
    public versao: number = 1,
    public contrato?: Contrato | null,
    public lotes: Lote[] = []
  ) {}

  alterarEndereco(novoEndereco: string): void {
    if (!novoEndereco || !novoEndereco.trim()) {
      throw new Error("Endereço não pode ser vazio.");
    }
    this.enderecoCompleto = novoEndereco.trim();
  }

  desativar(): void {
    this.ativo = false;
  }

  vincularContrato(contrato: Contrato): void {
    this.contrato = contrato;
  }
}
