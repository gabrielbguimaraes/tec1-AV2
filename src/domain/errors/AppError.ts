export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 400) {
    super(message);
    this.name = "AppError";
  }
}

export class RequisicaoInvalidaError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = "RequisicaoInvalidaError";
  }
}

export class NaoAutorizadoError extends AppError {
  constructor(message: string = "Credenciais inválidas ou token ausente.") {
    super(message, 401);
    this.name = "NaoAutorizadoError";
  }
}

export class AcessoNegadoError extends AppError {
  constructor(message: string = "Acesso negado para o papel do usuário.") {
    super(message, 403);
    this.name = "AcessoNegadoError";
  }
}

export class NaoEncontradoError extends AppError {
  constructor(message: string = "Recurso não encontrado.") {
    super(message, 404);
    this.name = "NaoEncontradoError";
  }
}

export class ConflitoError extends AppError {
  constructor(message: string = "Conflito de versão ou recurso duplicado.") {
    super(message, 409);
    this.name = "ConflitoError";
  }
}
