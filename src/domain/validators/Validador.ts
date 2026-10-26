export abstract class Validador<T> {
  abstract validar(dado: T): boolean;
  abstract obterMensagemErro(): string;
}
