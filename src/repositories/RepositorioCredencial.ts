import { prisma, checkDatabaseConnection } from "../config/prisma";
import { memDb, MemCredencial } from "./inMemoryDb";
import { ConflitoError } from "../domain/errors/AppError";
import { PapelUsuario } from "../domain/enums/PapelUsuario";

export interface DadosCriarCredencial {
  usuario: string;
  hashSenha: string;
  papel: PapelUsuario;
  salt?: string | null;
}

export class RepositorioCredencial {
  async buscarPorUsuario(usuario: string): Promise<MemCredencial | null> {
    if (await checkDatabaseConnection()) {
      const record = await prisma.credencial.findUnique({ where: { usuario } });
      return record as MemCredencial | null;
    }
    return memDb.credenciais.find((c) => c.usuario.toLowerCase() === usuario.toLowerCase()) || null;
  }

  async buscarPorId(id: string): Promise<MemCredencial | null> {
    if (await checkDatabaseConnection()) {
      const record = await prisma.credencial.findUnique({ where: { id } });
      return record as MemCredencial | null;
    }
    return memDb.credenciais.find((c) => c.id === id) || null;
  }

  async criar(dados: DadosCriarCredencial): Promise<MemCredencial> {
    const existente = await this.buscarPorUsuario(dados.usuario);
    if (existente) {
      throw new ConflitoError("Nome de usuário já cadastrado.");
    }

    if (await checkDatabaseConnection()) {
      const criado = await prisma.credencial.create({
        data: {
          usuario: dados.usuario,
          hashSenha: dados.hashSenha,
          papel: dados.papel,
          salt: dados.salt ?? null
        }
      });
      return criado as MemCredencial;
    }

    const agora = new Date();
    const novo: MemCredencial = {
      id: memDb.gerarId(),
      usuario: dados.usuario,
      hashSenha: dados.hashSenha,
      salt: dados.salt ?? null,
      papel: dados.papel,
      ultimoAcesso: null,
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora
    };
    memDb.credenciais.push(novo);
    return novo;
  }

  async atualizarUltimoAcesso(id: string): Promise<void> {
    const agora = new Date();
    if (await checkDatabaseConnection()) {
      await prisma.credencial.update({
        where: { id },
        data: { ultimoAcesso: agora }
      });
      return;
    }
    const usuario = memDb.credenciais.find((c) => c.id === id);
    if (usuario) {
      usuario.ultimoAcesso = agora;
      usuario.atualizadoEm = agora;
    }
  }

  async listar(): Promise<MemCredencial[]> {
    if (await checkDatabaseConnection()) {
      const lista = await prisma.credencial.findMany({
        orderBy: { criadoEm: "desc" }
      });
      return lista as MemCredencial[];
    }
    return [...memDb.credenciais];
  }
}
