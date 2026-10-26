import { prisma, checkDatabaseConnection } from "../config/prisma";
import { memDb, MemLote, MemEquipamento } from "./inMemoryDb";
import { ConflitoError, NaoEncontradoError } from "../domain/errors/AppError";
import { StatusLote } from "../domain/enums/StatusLote";
import { TipoEquipamento } from "../domain/enums/TipoEquipamento";
import { EstadoFisico } from "../domain/enums/EstadoFisico";
import { StatusRastreamento } from "../domain/enums/StatusRastreamento";

export interface DadosCriarEquipamentoLote {
  codigoBarrasInterno: string;
  tipo: TipoEquipamento;
  marca: string;
  modelo: string;
  pesoKg: number;
  estadoFisico: EstadoFisico;
  precificacaoEstimada: number;
  anoFabricacao?: number;
  posicaoNoLote?: number;
}

export interface DadosCriarLote {
  numeroLote: string;
  notaFiscal?: string;
  organizacaoId: string;
  dataEntrada: Date | string;
  transportadora: string;
  observacoes?: string | null;
  equipamentos?: DadosCriarEquipamentoLote[];
}

export interface LoteComRelacoes extends MemLote {
  organizacao?: unknown;
  equipamentos: MemEquipamento[];
}

export class RepositorioLote {
  async buscarPorId(id: string): Promise<LoteComRelacoes | null> {
    if (await checkDatabaseConnection()) {
      const record = await prisma.lote.findUnique({
        where: { id },
        include: { organizacao: true, equipamentos: { include: { movimentacoes: true } } }
      });
      return record as unknown as LoteComRelacoes | null;
    }

    const lote = memDb.lotes.find((l) => l.id === id);
    if (!lote) return null;
    const org = memDb.organizacoes.find((o) => o.id === lote.organizacaoId);
    const equipamentos = memDb.equipamentos.filter((e) => e.loteId === id);
    return { ...lote, organizacao: org, equipamentos };
  }

  async buscarPorNumero(numeroLote: string): Promise<LoteComRelacoes | null> {
    if (await checkDatabaseConnection()) {
      const record = await prisma.lote.findUnique({
        where: { numeroLote },
        include: { equipamentos: true }
      });
      return record as unknown as LoteComRelacoes | null;
    }

    const lote = memDb.lotes.find((l) => l.numeroLote === numeroLote);
    if (!lote) return null;
    const equipamentos = memDb.equipamentos.filter((e) => e.loteId === lote.id);
    return { ...lote, equipamentos };
  }

  async criar(dados: DadosCriarLote): Promise<LoteComRelacoes> {
    const existente = await this.buscarPorNumero(dados.numeroLote);
    if (existente) {
      throw new ConflitoError("Número de lote já cadastrado.");
    }

    const notaFiscal = dados.notaFiscal || `NF-${dados.numeroLote}`;

    if (await checkDatabaseConnection()) {
      return prisma.$transaction(async (tx) => {
        const lote = await tx.lote.create({
          data: {
            numeroLote: dados.numeroLote,
            notaFiscal,
            organizacaoId: dados.organizacaoId,
            dataEntrada: new Date(dados.dataEntrada),
            transportadora: dados.transportadora,
            observacoes: dados.observacoes ?? null,
            statusProcessamento: StatusLote.RECEBIDO,
            versao: 1
          }
        });

        const equipamentosCriados: MemEquipamento[] = [];
        if (dados.equipamentos && dados.equipamentos.length > 0) {
          let pos = 1;
          for (const eq of dados.equipamentos) {
            const criado = await tx.equipamento.create({
              data: {
                loteId: lote.id,
                codigoBarrasInterno: eq.codigoBarrasInterno,
                tipo: eq.tipo,
                marca: eq.marca,
                modelo: eq.modelo,
                pesoKg: eq.pesoKg,
                estadoFisico: eq.estadoFisico,
                precificacaoEstimada: eq.precificacaoEstimada,
                anoFabricacao: eq.anoFabricacao ?? 2022,
                posicaoNoLote: eq.posicaoNoLote ?? pos++,
                status: StatusRastreamento.AGUARDANDO_TRIAGEM,
                versao: 1
              }
            });
            equipamentosCriados.push(criado as MemEquipamento);
          }
        }

        return { ...lote, equipamentos: equipamentosCriados } as LoteComRelacoes;
      });
    }

    const agora = new Date();
    const novoLote: MemLote = {
      id: memDb.gerarId(),
      numeroLote: dados.numeroLote,
      notaFiscal,
      organizacaoId: dados.organizacaoId,
      dataEntrada: new Date(dados.dataEntrada),
      transportadora: dados.transportadora,
      statusProcessamento: StatusLote.RECEBIDO,
      observacoes: dados.observacoes ?? null,
      versao: 1,
      criadoEm: agora,
      atualizadoEm: agora
    };
    memDb.lotes.push(novoLote);

    const equipamentosCriados: MemEquipamento[] = [];
    if (dados.equipamentos && dados.equipamentos.length > 0) {
      let pos = 1;
      for (const eq of dados.equipamentos) {
        if (memDb.equipamentos.some((e) => e.codigoBarrasInterno === eq.codigoBarrasInterno)) {
          throw new ConflitoError(`Código de barras duplicado: ${eq.codigoBarrasInterno}`);
        }
        const novoEq: MemEquipamento = {
          id: memDb.gerarId(),
          loteId: novoLote.id,
          codigoBarrasInterno: eq.codigoBarrasInterno,
          tipo: eq.tipo,
          marca: eq.marca,
          modelo: eq.modelo,
          pesoKg: eq.pesoKg,
          estadoFisico: eq.estadoFisico,
          precificacaoEstimada: eq.precificacaoEstimada,
          anoFabricacao: eq.anoFabricacao ?? 2022,
          posicaoNoLote: eq.posicaoNoLote ?? pos++,
          status: StatusRastreamento.AGUARDANDO_TRIAGEM,
          versao: 1,
          criadoEm: agora,
          atualizadoEm: agora
        };
        memDb.equipamentos.push(novoEq);
        equipamentosCriados.push(novoEq);
      }
    }

    return { ...novoLote, equipamentos: equipamentosCriados };
  }

  async processarTriagemTransacional(
    id: string,
    versaoEsperada: number,
    operador: string
  ): Promise<LoteComRelacoes> {
    const atual = await this.buscarPorId(id);
    if (!atual) throw new NaoEncontradoError("Lote não encontrado.");

    if (atual.versao !== versaoEsperada) {
      throw new ConflitoError(
        `Conflito de concorrência: versão esperada ${versaoEsperada}, mas a versão atual é ${atual.versao}.`
      );
    }

    if (await checkDatabaseConnection()) {
      return prisma.$transaction(async (tx) => {
        const loteAtualizado = await tx.lote.update({
          where: { id },
          data: {
            statusProcessamento: StatusLote.TRIAGEM_CONCLUIDA,
            versao: { increment: 1 }
          }
        });

        const equips = await tx.equipamento.findMany({ where: { loteId: id } });
        for (const eq of equips) {
          if (eq.status === StatusRastreamento.AGUARDANDO_TRIAGEM) {
            await tx.equipamento.update({
              where: { id: eq.id },
              data: {
                status: StatusRastreamento.EM_TRIAGEM,
                versao: { increment: 1 }
              }
            });
            await tx.movimentacao.create({
              data: {
                equipamentoId: eq.id,
                origem: "Recepção / Almoxarifado",
                destino: "Bancada de Triagem Técnica",
                responsavel: operador,
                observacoes: `Triagem técnica processada no lote ${loteAtualizado.numeroLote}`
              }
            });
          }
        }

        const loteFinal = await tx.lote.findUnique({
          where: { id },
          include: { organizacao: true, equipamentos: { include: { movimentacoes: true } } }
        });
        return loteFinal as unknown as LoteComRelacoes;
      });
    }

    const index = memDb.lotes.findIndex((l) => l.id === id);
    if (index === -1) throw new NaoEncontradoError("Lote não encontrado.");

    const item = memDb.lotes[index];
    item.statusProcessamento = StatusLote.TRIAGEM_CONCLUIDA;
    item.versao += 1;
    item.atualizadoEm = new Date();

    const equips = memDb.equipamentos.filter((e) => e.loteId === id);
    for (const eq of equips) {
      if (eq.status === StatusRastreamento.AGUARDANDO_TRIAGEM) {
        eq.status = StatusRastreamento.EM_TRIAGEM;
        eq.versao += 1;
        eq.atualizadoEm = new Date();
        memDb.movimentacoes.push({
          id: memDb.gerarId(),
          equipamentoId: eq.id,
          dataHora: new Date(),
          origem: "Recepção / Almoxarifado",
          destino: "Bancada de Triagem Técnica",
          responsavel: operador,
          observacoes: `Triagem técnica processada no lote ${item.numeroLote}`
        });
      }
    }

    return (await this.buscarPorId(id))!;
  }

  async atualizarStatus(
    id: string,
    versaoEsperada: number,
    novoStatus: StatusLote
  ): Promise<LoteComRelacoes> {
    const atual = await this.buscarPorId(id);
    if (!atual) {
      throw new NaoEncontradoError("Lote não encontrado.");
    }

    if (atual.versao !== versaoEsperada) {
      throw new ConflitoError(
        `Conflito de concorrência: versão esperada ${versaoEsperada}, mas a versão atual é ${atual.versao}.`
      );
    }

    if (await checkDatabaseConnection()) {
      const atualizado = await prisma.lote.update({
        where: { id },
        data: {
          statusProcessamento: novoStatus,
          versao: { increment: 1 }
        },
        include: { organizacao: true, equipamentos: true }
      });
      return atualizado as unknown as LoteComRelacoes;
    }

    const index = memDb.lotes.findIndex((l) => l.id === id);
    if (index === -1) throw new NaoEncontradoError("Lote não encontrado.");

    const item = memDb.lotes[index];
    const atualizado: MemLote = {
      ...item,
      statusProcessamento: novoStatus,
      versao: item.versao + 1,
      atualizadoEm: new Date()
    };
    memDb.lotes[index] = atualizado;
    return { ...atualizado, organizacao: atual.organizacao, equipamentos: atual.equipamentos };
  }

  async listar(filtros?: {
    status?: StatusLote;
    organizacaoId?: string;
  }): Promise<LoteComRelacoes[]> {
    if (await checkDatabaseConnection()) {
      const lista = await prisma.lote.findMany({
        where: {
          statusProcessamento: filtros?.status,
          organizacaoId: filtros?.organizacaoId
        },
        include: { organizacao: true, equipamentos: true },
        orderBy: { criadoEm: "desc" }
      });
      return lista as unknown as LoteComRelacoes[];
    }

    let resultado = [...memDb.lotes];
    if (filtros?.status) {
      resultado = resultado.filter((l) => l.statusProcessamento === filtros.status);
    }
    if (filtros?.organizacaoId) {
      resultado = resultado.filter((l) => l.organizacaoId === filtros.organizacaoId);
    }

    return resultado.map((lote) => {
      const org = memDb.organizacoes.find((o) => o.id === lote.organizacaoId);
      const equipamentos = memDb.equipamentos.filter((e) => e.loteId === lote.id);
      return { ...lote, organizacao: org, equipamentos };
    });
  }
}
