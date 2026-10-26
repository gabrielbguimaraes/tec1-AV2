export interface Autenticavel {
  autenticar(senhaInformada: string): Promise<boolean>;
  obterIdentificador(): string;
}
