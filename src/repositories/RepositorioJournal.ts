import { prisma, checkDatabaseConnection } from "../config/prisma";
import { memDb, MemJournal } from "./inMemoryDb";

export interface DadosCriarJournal {
  operacao: string;
  entidade: string;
  operador: string;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  ipOrigem?: string | null;
  sucesso?: boolean;
}

export class RepositorioJournal {
  async registrar(dados: DadosCriarJournal): Promise<MemJournal> {
    const dadosFormatadosAntes =
      dados.dadosAntes !== undefined ? JSON.parse(JSON.stringify(dados.dadosAntes)) : null;
    const dadosFormatadosDepois =
      dados.dadosDepois !== undefined ? JSON.parse(JSON.stringify(dados.dadosDepois)) : null;

    if (await checkDatabaseConnection()) {
      const j = await prisma.journalTransacao.create({
        data: {
          operacao: dados.operacao,
          entidade: dados.entidade,
          operador: dados.operador,
          dadosAntes: dadosFormatadosAntes,
          dadosDepois: dadosFormatadosDepois,
          ipOrigem: dados.ipOrigem ?? null,
          sucesso: dados.sucesso ?? true
        }
      });
      return j as unknown as MemJournal;
    }

    const novo: MemJournal = {
      id: memDb.gerarId(),
      timestamp: new Date(),
      operacao: dados.operacao,
      entidade: dados.entidade,
      operador: dados.operador,
      dadosAntes: dadosFormatadosAntes,
      dadosDepois: dadosFormatadosDepois,
      ipOrigem: dados.ipOrigem ?? null,
      sucesso: dados.sucesso ?? true
    };
    memDb.journals.push(novo);
    return novo;
  }

  async listar(filtros?: { entidade?: string; operador?: string }): Promise<MemJournal[]> {
    if (await checkDatabaseConnection()) {
      const lista = await prisma.journalTransacao.findMany({
        where: {
          entidade: filtros?.entidade,
          operador: filtros?.operador
        },
        orderBy: { timestamp: "desc" }
      });
      return lista as unknown as MemJournal[];
    }

    let resultado = [...memDb.journals];
    if (filtros?.entidade) {
      resultado = resultado.filter((j) => j.entidade.toLowerCase() === filtros.entidade!.toLowerCase());
    }
    if (filtros?.operador) {
      resultado = resultado.filter((j) => j.operador.toLowerCase() === filtros.operador!.toLowerCase());
    }
    return resultado.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
