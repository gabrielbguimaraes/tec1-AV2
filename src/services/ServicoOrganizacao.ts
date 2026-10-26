import {
  RepositorioOrganizacao,
  DadosCriarOrganizacao,
  DadosAtualizarOrganizacao,
  DadosCriarContrato
} from "../repositories/RepositorioOrganizacao";
import { RepositorioJournal } from "../repositories/RepositorioJournal";
import { ValidadorCNPJ } from "../domain/validators/ValidadorCNPJ";
import { Organizacao } from "../domain/entities/Organizacao";
import { Contrato } from "../domain/entities/Contrato";
import { RequisicaoInvalidaError, NaoEncontradoError } from "../domain/errors/AppError";

export class ServicoOrganizacao {
  constructor(
    private repoOrganizacao: RepositorioOrganizacao = new RepositorioOrganizacao(),
    private repoJournal: RepositorioJournal = new RepositorioJournal(),
    private validadorCNPJ: ValidadorCNPJ = new ValidadorCNPJ()
  ) {}

  async cadastrarOrganizacao(dados: DadosCriarOrganizacao, operador: string, ipOrigem?: string) {
    if (!this.validadorCNPJ.validar(dados.cnpj)) {
      throw new RequisicaoInvalidaError(this.validadorCNPJ.obterMensagemErro());
    }

    try {
      const orgEntidade = new Organizacao(
        "",
        dados.razaoSocial,
        dados.cnpj,
        dados.inscricaoEstadual,
        dados.enderecoCompleto,
        dados.telefone,
        dados.email
      );

      if (dados.contrato) {
        const dataInicio = new Date(dados.contrato.dataInicio || dados.contrato.dataAssinatura || new Date());
        const dataVencimento = new Date(dados.contrato.dataVencimento);
        const valorTotal = dados.contrato.valorTotal ?? dados.contrato.valorMensal ?? 0;

        if (dataVencimento <= dataInicio) {
          throw new Error("Data de vencimento do contrato deve ser posterior à data de início.");
        }
        if (valorTotal < 0) {
          throw new Error("Valor total do contrato não pode ser negativo.");
        }

        const contratoEntidade = new Contrato(
          "",
          "",
          dataInicio,
          dataVencimento,
          valorTotal,
          dados.contrato.renovacaoAutomatica ?? false,
          1,
          dados.contrato.clausulas ?? []
        );
        orgEntidade.vincularContrato(contratoEntidade);
      }
    } catch (err: any) {
      throw new RequisicaoInvalidaError(err.message);
    }

    const orgCriada = await this.repoOrganizacao.criar(dados);

    await this.repoJournal.registrar({
      operacao: "CRIAR_ORGANIZACAO",
      entidade: "Organizacao",
      operador,
      ipOrigem,
      dadosAntes: null,
      dadosDepois: orgCriada,
      sucesso: true
    });

    return orgCriada;
  }

  async atualizarOrganizacao(
    id: string,
    versaoEsperada: number,
    dados: DadosAtualizarOrganizacao,
    operador: string,
    ipOrigem?: string
  ) {
    if (typeof versaoEsperada !== "number" || versaoEsperada < 1) {
      throw new RequisicaoInvalidaError("Versão esperada é obrigatória para controle de concorrência.");
    }

    const anterior = await this.repoOrganizacao.buscarPorId(id);
    if (!anterior) {
      throw new NaoEncontradoError("Organização não encontrada.");
    }

    const orgEntidade = new Organizacao(
      anterior.id,
      anterior.razaoSocial,
      anterior.cnpj,
      anterior.inscricaoEstadual,
      anterior.enderecoCompleto,
      anterior.telefone,
      anterior.email,
      anterior.ativo,
      anterior.versao
    );

    if (dados.enderecoCompleto) {
      try {
        orgEntidade.alterarEndereco(dados.enderecoCompleto);
      } catch (err: any) {
        throw new RequisicaoInvalidaError(err.message);
      }
    }
    if (dados.ativo === false) {
      orgEntidade.desativar();
    }

    const atualizada = await this.repoOrganizacao.atualizar(id, versaoEsperada, dados);

    await this.repoJournal.registrar({
      operacao: "ATUALIZAR_ORGANIZACAO",
      entidade: "Organizacao",
      operador,
      ipOrigem,
      dadosAntes: anterior,
      dadosDepois: atualizada,
      sucesso: true
    });

    return atualizada;
  }

  async vincularContrato(
    organizacaoId: string,
    dadosContrato: DadosCriarContrato,
    operador: string,
    ipOrigem?: string
  ) {
    const dataInicio = new Date(dadosContrato.dataInicio || dadosContrato.dataAssinatura || new Date());
    const dataVencimento = new Date(dadosContrato.dataVencimento);
    const valorTotal = dadosContrato.valorTotal ?? dadosContrato.valorMensal ?? 0;

    if (dataVencimento <= dataInicio) {
      throw new RequisicaoInvalidaError("Data de vencimento do contrato deve ser posterior à data de início.");
    }

    const contratoEntidade = new Contrato(
      "",
      organizacaoId,
      dataInicio,
      dataVencimento,
      valorTotal,
      dadosContrato.renovacaoAutomatica ?? false,
      1,
      dadosContrato.clausulas ?? []
    );

    const contrato = await this.repoOrganizacao.vincularContrato(organizacaoId, dadosContrato);

    await this.repoJournal.registrar({
      operacao: "VINCULAR_CONTRATO",
      entidade: "Contrato",
      operador,
      ipOrigem,
      dadosAntes: null,
      dadosDepois: contrato,
      sucesso: true
    });

    return contrato;
  }

  async obterPorId(id: string) {
    const org = await this.repoOrganizacao.buscarPorId(id);
    if (!org) throw new NaoEncontradoError("Organização não encontrada.");
    return org;
  }

  async listar(filtros?: { ativo?: boolean }) {
    return this.repoOrganizacao.listar(filtros);
  }
}
