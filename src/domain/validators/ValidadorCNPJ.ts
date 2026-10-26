import { Validador } from "./Validador";

export class ValidadorCNPJ extends Validador<string> {
  private mensagemErro = "";

  validar(cnpj: string): boolean {
    if (!cnpj) {
      this.mensagemErro = "CNPJ não informado.";
      return false;
    }

    const limpo = cnpj.replace(/\D/g, "");

    if (limpo.length !== 14) {
      this.mensagemErro = "CNPJ deve conter 14 dígitos numéricos.";
      return false;
    }

    if (/^(\d)\1{13}$/.test(limpo)) {
      this.mensagemErro = "CNPJ não pode conter todos os dígitos iguais.";
      return false;
    }

    const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma1 = 0;
    for (let i = 0; i < 12; i++) {
      soma1 += parseInt(limpo[i], 10) * pesos1[i];
    }
    const resto1 = soma1 % 11;
    const digito1 = resto1 < 2 ? 0 : 11 - resto1;

    if (digito1 !== parseInt(limpo[12], 10)) {
      this.mensagemErro = "Primeiro dígito verificador do CNPJ inválido.";
      return false;
    }

    const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma2 = 0;
    for (let i = 0; i < 13; i++) {
      soma2 += parseInt(limpo[i], 10) * pesos2[i];
    }
    const resto2 = soma2 % 11;
    const digito2 = resto2 < 2 ? 0 : 11 - resto2;

    if (digito2 !== parseInt(limpo[13], 10)) {
      this.mensagemErro = "Segundo dígito verificador do CNPJ inválido.";
      return false;
    }

    this.mensagemErro = "";
    return true;
  }

  obterMensagemErro(): string {
    return this.mensagemErro;
  }
}
