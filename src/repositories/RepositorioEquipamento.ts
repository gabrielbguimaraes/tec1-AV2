import { prisma, checkDatabaseConnection } from "../config/prisma";
import { memDb, MemEquipamento, MemMovimentacao, MemJournal } from "./inMemoryDb";
import { ConflitoError, NaoEncontradoError } from "../domain/errors/AppError";
import { TipoEquipamento } from "../domain/enums/TipoEquipamento";
import { EstadoFisico } from "../domain/enums/EstadoFisico";
import { StatusRastreamento } from "../domain/enums/StatusRastreamento";

export interface DadosCriarEquipamento {
  loteId: string;
  codigoBarrasInterno: string;
  tipo: TipoEquipamento;
  marca: string;
  modelo: string;
  pesoKg: number;
  estadoFisico: EstadoFisico;
  precificacaoEstimada: number;
  status?: StatusRastreamento;
  anoFabricacao?: number;
  posicaoNoLote?: number;
}

export interface DadosAtualizarEquipamento {
  estadoFisico?: EstadoFisico;
  status?: StatusRastreamento;
  precificacaoEstimada?: number;
  pesoKg?: number;
}

export interface DadosCriarMovimentacao {
  equipamentoId: string;
  origem: string;
  destino: string;
  responsavel: string;
  observacoes?: string | null;
}

export interface EquipamentoComRelacoes extends MemEquipamento {
  lote?: unknown;
  movimentacoes: MemMovimentacao[];
}

export class RepositorioEquipamento {
  async buscarPorId(id: string): Promise<EquipamentoComRelacoes | null> {
    if (await checkDatabaseConnection()) {
      const record = await prisma.equipamento.findUnique({
        where: { id },
        include: { lote: true, movimentacoes: { orderBy: { dataHora: "asc" } } }
      });
      return record as unknown as EquipamentoComRelacoes | null;
    }

    const eq = memDb.equipamentos.find((e) => e.id === id);
    if (!eq) return null;
    const lote = memDb.lotes.find((l) => l.id === eq.loteId);
    const movimentacoes = memDb.movimentacoes.filter((m) => m.equipamentoId === id);
    return { ...eq, lote, movimentacoes };
  }

  async buscarPorCodigoBarras(codigoBarrasInterno: string): Promise<EquipamentoComRelacoes | null> {
    if (await checkDatabaseConnection()) {
      const record = await prisma.equipamento.findUnique({
        where: { codigoBarrasInterno },
        include: { lote: true, movimentacoes: { orderBy: { dataHora: "asc" } } }
      });
      return record as unknown as EquipamentoComRelacoes | null;
    }

    const eq = memDb.equipamentos.find((e) => e.codigoBarrasInterno === codigoBarrasInterno);
    if (!eq) return null;
    const lote = memDb.lotes.find((l) => l.id === eq.loteId);
    const movimentacoes = memDb.movimentacoes.filter((m) => m.equipamentoId === eq.id);
    return { ...eq, lote, movimentacoes };
  }

  async criar(dados: DadosCriarEquipamento): Promise<EquipamentoComRelacoes> {
    const existente = await this.buscarPorCodigoBarras(dados.codigoBarrasInterno);
    if (existente) {
      throw new ConflitoError("Código de barras interno já cadastrado.");
    }

    if (await checkDatabaseConnection()) {
      const criado = await prisma.equipamento.create({
        data: {
          loteId: dados.loteId,
          codigoBarrasInterno: dados.codigoBarrasInterno,
          tipo: dados.tipo,
          marca: dados.marca,
          modelo: dados.modelo,
          pesoKg: dados.pesoKg,
          estadoFisico: dados.estadoFisico,
          precificacaoEstimada: dados.precificacaoEstimada,
          status: dados.status ?? StatusRastreamento.AGUARDANDO_TRIAGEM,
          anoFabricacao: dados.anoFabricacao ?? 2022,
          posicaoNoLote: dados.posicaoNoLote ?? 1,
          versao: 1
        },
        include: { lote: true, movimentacoes: true }
      });
      return criado as unknown as EquipamentoComRelacoes;
    }

    const agora = new Date();
    const novo: MemEquipamento = {
      id: memDb.gerarId(),
      loteId: dados.loteId,
      codigoBarrasInterno: dados.codigoBarrasInterno,
      tipo: dados.tipo,
      marca: dados.marca,
      modelo: dados.modelo,
      pesoKg: dados.pesoKg,
      estadoFisico: dados.estadoFisico,
      precificacaoEstimada: dados.precificacaoEstimada,
      status: dados.status ?? StatusRastreamento.AGUARDANDO_TRIAGEM,
      anoFabricacao: dados.anoFabricacao ?? 2022,
      posicaoNoLote: dados.posicaoNoLote ?? 1,
      versao: 1,
      criadoEm: agora,
      atualizadoEm: agora
    };
    memDb.equipamentos.push(novo);
    return { ...novo, movimentacoes: [] };
  }

  async atualizar(
    id: string,
    versaoEsperada: number,
    dados: DadosAtualizarEquipamento
  ): Promise<EquipamentoComRelacoes> {
    const atual = await this.buscarPorId(id);
    if (!atual) {
      throw new NaoEncontradoError("Equipamento não encontrado.");
    }

    if (atual.versao !== versaoEsperada) {
      throw new ConflitoError(
        `Conflito de concorrência: versão esperada ${versaoEsperada}, mas a versão atual é ${atual.versao}.`
      );
    }

    if (await checkDatabaseConnection()) {
      const atualizado = await prisma.equipamento.update({
        where: { id },
        data: {
          ...dados,
          versao: { increment: 1 }
        },
        include: { lote: true, movimentacoes: true }
      });
      return atualizado as unknown as EquipamentoComRelacoes;
    }

    const index = memDb.equipamentos.findIndex((e) => e.id === id);
    if (index === -1) throw new NaoEncontradoError("Equipamento não encontrado.");

    const item = memDb.equipamentos[index];
    const atualizado: MemEquipamento = {
      ...item,
      ...dados,
      versao: item.versao + 1,
      atualizadoEm: new Date()
    };
    memDb.equipamentos[index] = atualizado;
    return { ...atualizado, lote: atual.lote, movimentacoes: atual.movimentacoes };
  }

  async registrarMovimentacao(dados: DadosCriarMovimentacao): Promise<MemMovimentacao> {
    if (await checkDatabaseConnection()) {
      const mov = await prisma.movimentacao.create({
        data: {
          equipamentoId: dados.equipamentoId,
          origem: dados.origem,
          destino: dados.destino,
          responsavel: dados.responsavel,
          observacoes: dados.observacoes ?? null
        }
      });
      return mov as MemMovimentacao;
    }

    const novaMov: MemMovimentacao = {
      id: memDb.gerarId(),
      equipamentoId: dados.equipamentoId,
      dataHora: new Date(),
      origem: dados.origem,
      destino: dados.destino,
      responsavel: dados.responsavel,
      observacoes: dados.observacoes ?? null
    };
    memDb.movimentacoes.push(novaMov);
    return novaMov;
  }

  async atualizarEstadoFisicoTransacional(
    id: string,
    versaoEsperada: number,
    novoEstado: EstadoFisico,
    origem: string,
    destino: string,
    responsavel: string,
    justificativa?: string,
    ipOrigem?: string
  ): Promise<EquipamentoComRelacoes> {
    const atual = await this.buscarPorId(id);
    if (!atual) throw new NaoEncontradoError("Equipamento não encontrado.");

    if (atual.versao !== versaoEsperada) {
      throw new ConflitoError(
        `Conflito de concorrência: versão esperada ${versaoEsperada}, mas a versão atual é ${atual.versao}.`
      );
    }

    const obs = justificativa ? `Reclassificação de estado: ${justificativa}` : "Reclassificação de estado físico";

    if (await checkDatabaseConnection()) {
      return prisma.$transaction(async (tx) => {
        const atualizado = await tx.equipamento.update({
          where: { id },
          data: {
            estadoFisico: novoEstado,
            versao: { increment: 1 }
          },
          include: { lote: true, movimentacoes: true }
        });

        await tx.movimentacao.create({
          data: {
            equipamentoId: id,
            origem,
            destino,
            responsavel,
            observacoes: obs
          }
        });

        await tx.journalTransacao.create({
          data: {
            operacao: "ATUALIZAR_ESTADO_FISICO",
            entidade: "Equipamento",
            operador: responsavel,
            ipOrigem: ipOrigem ?? null,
            dadosAntes: atual as any,
            dadosDepois: atualizado as any,
            sucesso: true
          }
        });

        return atualizado as unknown as EquipamentoComRelacoes;
      });
    }

    const index = memDb.equipamentos.findIndex((e) => e.id === id);
    if (index === -1) throw new NaoEncontradoError("Equipamento não encontrado.");

    const item = memDb.equipamentos[index];
    const atualizado: MemEquipamento = {
      ...item,
      estadoFisico: novoEstado,
      versao: item.versao + 1,
      atualizadoEm: new Date()
    };
    memDb.equipamentos[index] = atualizado;

    const novaMov: MemMovimentacao = {
      id: memDb.gerarId(),
      equipamentoId: id,
      dataHora: new Date(),
      origem,
      destino,
      responsavel,
      observacoes: obs
    };
    memDb.movimentacoes.push(novaMov);

    const novoJournal: MemJournal = {
      id: memDb.gerarId(),
      timestamp: new Date(),
      operacao: "ATUALIZAR_ESTADO_FISICO",
      entidade: "Equipamento",
      operador: responsavel,
      ipOrigem: ipOrigem ?? null,
      dadosAntes: atual,
      dadosDepois: atualizado,
      sucesso: true
    };
    memDb.journals.push(novoJournal);

    return { ...atualizado, lote: atual.lote, movimentacoes: [...atual.movimentacoes, novaMov] };
  }

  async transitarStatusTransacional(
    id: string,
    versaoEsperada: number,
    novoStatus: StatusRastreamento,
    origem: string,
    destino: string,
    responsavel: string,
    observacoes?: string,
    ipOrigem?: string
  ): Promise<EquipamentoComRelacoes> {
    const atual = await this.buscarPorId(id);
    if (!atual) throw new NaoEncontradoError("Equipamento não encontrado.");

    if (atual.versao !== versaoEsperada) {
      throw new ConflitoError(
        `Conflito de concorrência: versão esperada ${versaoEsperada}, mas a versão atual é ${atual.versao}.`
      );
    }

    const obs = observacoes ?? `Transição de status para ${novoStatus}`;

    if (await checkDatabaseConnection()) {
      return prisma.$transaction(async (tx) => {
        const atualizado = await tx.equipamento.update({
          where: { id },
          data: {
            status: novoStatus,
            versao: { increment: 1 }
          },
          include: { lote: true, movimentacoes: true }
        });

        await tx.movimentacao.create({
          data: {
            equipamentoId: id,
            origem,
            destino,
            responsavel,
            observacoes: obs
          }
        });

        await tx.journalTransacao.create({
          data: {
            operacao: "TRANSITAR_STATUS_EQUIPAMENTO",
            entidade: "Equipamento",
            operador: responsavel,
            ipOrigem: ipOrigem ?? null,
            dadosAntes: atual as any,
            dadosDepois: atualizado as any,
            sucesso: true
          }
        });

        return atualizado as unknown as EquipamentoComRelacoes;
      });
    }

    const index = memDb.equipamentos.findIndex((e) => e.id === id);
    if (index === -1) throw new NaoEncontradoError("Equipamento não encontrado.");

    const item = memDb.equipamentos[index];
    const atualizado: MemEquipamento = {
      ...item,
      status: novoStatus,
      versao: item.versao + 1,
      atualizadoEm: new Date()
    };
    memDb.equipamentos[index] = atualizado;

    const novaMov: MemMovimentacao = {
      id: memDb.gerarId(),
      equipamentoId: id,
      dataHora: new Date(),
      origem,
      destino,
      responsavel,
      observacoes: obs
    };
    memDb.movimentacoes.push(novaMov);

    const novoJournal: MemJournal = {
      id: memDb.gerarId(),
      timestamp: new Date(),
      operacao: "TRANSITAR_STATUS_EQUIPAMENTO",
      entidade: "Equipamento",
      operador: responsavel,
      ipOrigem: ipOrigem ?? null,
      dadosAntes: atual,
      dadosDepois: atualizado,
      sucesso: true
    };
    memDb.journals.push(novoJournal);

    return { ...atualizado, lote: atual.lote, movimentacoes: [...atual.movimentacoes, novaMov] };
  }

  async listar(filtros?: {
    loteId?: string;
    status?: StatusRastreamento;
    tipo?: TipoEquipamento;
  }): Promise<EquipamentoComRelacoes[]> {
    if (await checkDatabaseConnection()) {
      const lista = await prisma.equipamento.findMany({
        where: {
          loteId: filtros?.loteId,
          status: filtros?.status,
          tipo: filtros?.tipo
        },
        include: { lote: true, movimentacoes: true },
        orderBy: { criadoEm: "desc" }
      });
      return lista as unknown as EquipamentoComRelacoes[];
    }

    let resultado = [...memDb.equipamentos];
    if (filtros?.loteId) resultado = resultado.filter((e) => e.loteId === filtros.loteId);
    if (filtros?.status) resultado = resultado.filter((e) => e.status === filtros.status);
    if (filtros?.tipo) resultado = resultado.filter((e) => e.tipo === filtros.tipo);

    return resultado.map((eq) => {
      const lote = memDb.lotes.find((l) => l.id === eq.loteId);
      const movimentacoes = memDb.movimentacoes.filter((m) => m.equipamentoId === eq.id);
      return { ...eq, lote, movimentacoes };
    });
  }
}
