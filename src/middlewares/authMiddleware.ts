import { FastifyRequest, FastifyReply } from "fastify";
import { PapelUsuario } from "../domain/enums/PapelUsuario";
import { AcessoNegadoError, NaoAutorizadoError } from "../domain/errors/AppError";

export interface TokenPayload {
  id: string;
  usuario: string;
  papel: PapelUsuario;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}

export async function autenticarJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new NaoAutorizadoError("Token de acesso inválido, expirado ou ausente.");
  }
}

export function exigirPapel(...papeisPermitidos: PapelUsuario[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await autenticarJWT(request, reply);

    const usuario = request.user as TokenPayload;
    if (!usuario || !usuario.papel) {
      throw new NaoAutorizadoError("Informações de autenticação inválidas.");
    }

    if (usuario.papel === PapelUsuario.AUDITOR && request.method !== "GET") {
      throw new AcessoNegadoError("Auditor possui acesso estritamente de leitura (apenas GET).");
    }

    if (usuario.papel === PapelUsuario.ADMINISTRADOR) {
      return;
    }

    if (!papeisPermitidos.includes(usuario.papel)) {
      throw new AcessoNegadoError(`Acesso negado para o perfil ${usuario.papel}.`);
    }
  };
}
