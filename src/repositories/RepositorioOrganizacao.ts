import { prisma, checkDatabaseConnection } from "../config/prisma";
import { memDb, MemOrganizacao, MemContrato } from "./inMemoryDb";
import { ConflitoError, NaoEncontradoError } from "../domain/errors/AppError";

export interface DadosCriarContrato {
  dataInicio: Date;
  dataVencimento: Date;
  valorTotal: number;
  renovacaoAutomatica?: boolean;
}

export interface DadosCriarOrganizacao {
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  enderecoCompleto: string;
  telefone: string;
  email: string;
  contrato?: DadosCriarContrato;
}

export interface DadosAtualizarOrganizacao {
  razaoSocial?: string;
  inscricaoEstadual?: string;
  enderecoCompleto?: string;
  telefone?: string;
  email?: string;
  ativo?: boolean;
}

export interface OrganizacaoComRelacoes extends MemOrganizacao {
  contrato?: MemContrato | null;
  lotes?: unknown[];
}

export class RepositorioOrganizacao {
  async buscarPorId(id: string): Promise<OrganizacaoComRelacoes | null> {
    if (await checkDatabaseConnection()) {
      const record = await prisma.organizacao.findUnique({
        where: { id },
        include: { contrato: true, lotes: true }
      });
      return record as OrganizacaoComRelacoes | null;
    }

    const org = memDb.organizacoes.find((o) => o.id === id);
    if (!org) return null;
    const contrato = memDb.contratos.find((c) => c.organizacaoId === id) || null;
    const lotes = memDb.lotes.filter((l) => l.organizacaoId === id);
    return { ...org, contrato, lotes };
  }

  async buscarPorCnpj(cnpj: string): Promise<OrganizacaoComRelacoes | null> {
    const limpo = cnpj.replace(/\D/g, "");
    if (await checkDatabaseConnection()) {
      const record = await prisma.organizacao.findUnique({
        where: { cnpj: limpo },
        include: { contrato: true }
      });
      return record as OrganizacaoComRelacoes | null;
    }

    const org = memDb.organizacoes.find((o) => o.cnpj.replace(/\D/g, "") === limpo);
    if (!org) return null;
    const contrato = memDb.contratos.find((c) => c.organizacaoId === org.id) || null;
    return { ...org, contrato };
  }

  async criar(dados: DadosCriarOrganizacao): Promise<OrganizacaoComRelacoes> {
    const cnpjLimpo = dados.cnpj.replace(/\D/g, "");
    const existente = await this.buscarPorCnpj(cnpjLimpo);
    if (existente) {
      throw new ConflitoError("CNPJ já cadastrado no sistema.");
    }

    if (await checkDatabaseConnection()) {
      return prisma.$transaction(async (tx) => {
        const org = await tx.organizacao.create({
          data: {
            razaoSocial: dados.razaoSocial,
            cnpj: cnpjLimpo,
            inscricaoEstadual: dados.inscricaoEstadual,
            enderecoCompleto: dados.enderecoCompleto,
            telefone: dados.telefone,
            email: dados.email,
            versao: 1
          }
        });

        let contratoCriado: MemContrato | null = null;
        if (dados.contrato) {
          const c = await tx.contrato.create({
            data: {
              organizacaoId: org.id,
              dataInicio: new Date(dados.contrato.dataInicio),
              dataVencimento: new Date(dados.contrato.dataVencimento),
              valorTotal: dados.contrato.valorTotal,
              renovacaoAutomatica: dados.contrato.renovacaoAutomatica ?? false,
              versao: 1
            }
          });
          contratoCriado = c as MemContrato;
        }

        return { ...org, contrato: contratoCriado } as OrganizacaoComRelacoes;
      });
    }

    const agora = new Date();
    const novaOrg: MemOrganizacao = {
      id: memDb.gerarId(),
      razaoSocial: dados.razaoSocial,
      cnpj: cnpjLimpo,
      inscricaoEstadual: dados.inscricaoEstadual,
      enderecoCompleto: dados.enderecoCompleto,
      telefone: dados.telefone,
      email: dados.email,
      ativo: true,
      versao: 1,
      criadoEm: agora,
      atualizadoEm: agora
    };
    memDb.organizacoes.push(novaOrg);

    let contratoCriado: MemContrato | null = null;
    if (dados.contrato) {
      contratoCriado = {
        id: memDb.gerarId(),
        organizacaoId: novaOrg.id,
        dataInicio: new Date(dados.contrato.dataInicio),
        dataVencimento: new Date(dados.contrato.dataVencimento),
        valorTotal: dados.contrato.valorTotal,
        renovacaoAutomatica: dados.contrato.renovacaoAutomatica ?? false,
        versao: 1,
        criadoEm: agora,
        atualizadoEm: agora
      };
      memDb.contratos.push(contratoCriado);
    }

    return { ...novaOrg, contrato: contratoCriado, lotes: [] };
  }

  async atualizar(
    id: string,
    versaoEsperada: number,
    dados: DadosAtualizarOrganizacao
  ): Promise<OrganizacaoComRelacoes> {
    const atual = await this.buscarPorId(id);
    if (!atual) {
      throw new NaoEncontradoError("Organização não encontrada.");
    }

    if (atual.versao !== versaoEsperada) {
      throw new ConflitoError(
        `Conflito de concorrência: versão esperada ${versaoEsperada}, mas a versão atual é ${atual.versao}.`
      );
    }

    if (await checkDatabaseConnection()) {
      const atualizado = await prisma.organizacao.update({
        where: { id },
        data: {
          ...dados,
          versao: { increment: 1 }
        },
        include: { contrato: true, lotes: true }
      });
      return atualizado as OrganizacaoComRelacoes;
    }

    const index = memDb.organizacoes.findIndex((o) => o.id === id);
    if (index === -1) throw new NaoEncontradoError("Organização não encontrada.");

    const item = memDb.organizacoes[index];
    const atualizado: MemOrganizacao = {
      ...item,
      ...dados,
      versao: item.versao + 1,
      atualizadoEm: new Date()
    };
    memDb.organizacoes[index] = atualizado;
    return { ...atualizado, contrato: atual.contrato, lotes: atual.lotes };
  }

  async listar(filtros?: { ativo?: boolean }): Promise<OrganizacaoComRelacoes[]> {
    if (await checkDatabaseConnection()) {
      const lista = await prisma.organizacao.findMany({
        where: filtros?.ativo !== undefined ? { ativo: filtros.ativo } : undefined,
        include: { contrato: true, lotes: true },
        orderBy: { criadoEm: "desc" }
      });
      return lista as OrganizacaoComRelacoes[];
    }

    let resultado = [...memDb.organizacoes];
    if (filtros?.ativo !== undefined) {
      resultado = resultado.filter((o) => o.ativo === filtros.ativo);
    }
    return resultado.map((org) => {
      const contrato = memDb.contratos.find((c) => c.organizacaoId === org.id) || null;
      const lotes = memDb.lotes.filter((l) => l.organizacaoId === org.id);
      return { ...org, contrato, lotes };
    });
  }

  async vincularContrato(
    organizacaoId: string,
    dados: DadosCriarContrato
  ): Promise<MemContrato> {
    const org = await this.buscarPorId(organizacaoId);
    if (!org) {
      throw new NaoEncontradoError("Organização não encontrada.");
    }

    if (await checkDatabaseConnection()) {
      return prisma.contrato.upsert({
        where: { organizacaoId },
        create: {
          organizacaoId,
          dataInicio: new Date(dados.dataInicio),
          dataVencimento: new Date(dados.dataVencimento),
          valorTotal: dados.valorTotal,
          renovacaoAutomatica: dados.renovacaoAutomatica ?? false,
          versao: 1
        },
        update: {
          dataInicio: new Date(dados.dataInicio),
          dataVencimento: new Date(dados.dataVencimento),
          valorTotal: dados.valorTotal,
          renovacaoAutomatica: dados.renovacaoAutomatica ?? false,
          versao: { increment: 1 }
        }
      }) as Promise<MemContrato>;
    }

    const indexExistente = memDb.contratos.findIndex((c) => c.organizacaoId === organizacaoId);
    const agora = new Date();

    if (indexExistente >= 0) {
      const existente = memDb.contratos[indexExistente];
      const atualizado: MemContrato = {
        ...existente,
        dataInicio: new Date(dados.dataInicio),
        dataVencimento: new Date(dados.dataVencimento),
        valorTotal: dados.valorTotal,
        renovacaoAutomatica: dados.renovacaoAutomatica ?? false,
        versao: existente.versao + 1,
        atualizadoEm: agora
      };
      memDb.contratos[indexExistente] = atualizado;
      return atualizado;
    }

    const novo: MemContrato = {
      id: memDb.gerarId(),
      organizacaoId,
      dataInicio: new Date(dados.dataInicio),
      dataVencimento: new Date(dados.dataVencimento),
      valorTotal: dados.valorTotal,
      renovacaoAutomatica: dados.renovacaoAutomatica ?? false,
      versao: 1,
      criadoEm: agora,
      atualizadoEm: agora
    };
    memDb.contratos.push(novo);
    return novo;
  }
}
