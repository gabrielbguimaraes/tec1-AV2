import { Validador } from "./Validador";

export class ValidadorDataEntrada extends Validador<Date | string> {
  private mensagemErro = "";

  validar(data: Date | string): boolean {
    if (!data) {
      this.mensagemErro = "Data de entrada não informada.";
      return false;
    }

    const dataEntrada = data instanceof Date ? data : new Date(data);

    if (isNaN(dataEntrada.getTime())) {
      this.mensagemErro = "Data de entrada inválida.";
      return false;
    }

    const agora = new Date();
    if (dataEntrada.getTime() > agora.getTime()) {
      this.mensagemErro = "A data de entrada do lote não pode estar no futuro.";
      return false;
    }

    const noventaDiasEmMs = 90 * 24 * 60 * 60 * 1000;
    const limitePassado = agora.getTime() - noventaDiasEmMs;

    if (dataEntrada.getTime() < limitePassado) {
      this.mensagemErro = "A data de entrada do lote não pode ser anterior a 90 dias.";
      return false;
    }

    this.mensagemErro = "";
    return true;
  }

  obterMensagemErro(): string {
    return this.mensagemErro;
  }
}
