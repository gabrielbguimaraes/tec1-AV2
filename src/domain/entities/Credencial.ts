import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Autenticavel } from "../interfaces/Autenticavel";
import { PapelUsuario } from "../enums/PapelUsuario";

export class Credencial implements Autenticavel {
  constructor(
    public id: string,
    public usuario: string,
    public hashSenha: string,
    public papel: PapelUsuario,
    public ativo: boolean = true,
    public ultimoAcesso?: Date | null,
    public salt?: string | null
  ) {}

  async autenticar(senhaInformada: string): Promise<boolean> {
    if (!this.ativo) return false;
    return bcrypt.compare(senhaInformada, this.hashSenha);
  }

  obterIdentificador(): string {
    return this.id;
  }

  renovarToken(): string {
    return `session_${this.id}_${randomUUID()}`;
  }

  atualizarUltimoAcesso(): void {
    this.ultimoAcesso = new Date();
  }

  static async gerarHash(senhaPlana: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(senhaPlana, salt);
  }
}
