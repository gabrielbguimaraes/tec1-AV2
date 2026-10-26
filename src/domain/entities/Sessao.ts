import { PapelUsuario } from "../enums/PapelUsuario";

export class Sessao {
  constructor(
    public token: string,
    public usuario: string,
    public papel: PapelUsuario,
    public criadoEm: Date = new Date(),
    public expiraEm: Date = new Date(Date.now() + 8 * 60 * 60 * 1000)
  ) {}

  estaAtiva(): boolean {
    return new Date() < this.expiraEm;
  }

  renovar(horas: number = 8): void {
    this.expiraEm = new Date(Date.now() + horas * 60 * 60 * 1000);
  }
}
