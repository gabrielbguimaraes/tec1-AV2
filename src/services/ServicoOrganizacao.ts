import {
  RepositorioOrganizacao,
  DadosCriarOrganizacao,
  DadosAtualizarOrganizacao,
  DadosCriarContrato
} from "../repositories/RepositorioOrganizacao";
import { RepositorioJournal } from "../repositories/RepositorioJournal";
import { ValidadorCNPJ } from "../domain/validators/ValidadorCNPJ";
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

    if (!dados.razaoSocial || !dados.razaoSocial.trim()) {
      throw new RequisicaoInvalidaError("Razão social é obrigatória.");
    }

    if (dados.contrato) {
      if (new Date(dados.contrato.dataVencimento) <= new Date(dados.contrato.dataInicio)) {
        throw new RequisicaoInvalidaError("Data de vencimento do contrato deve ser posterior à data de início.");
      }
      if (dados.contrato.valorTotal < 0) {
        throw new RequisicaoInvalidaError("Valor total do contrato não pode ser negativo.");
      }
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
    if (new Date(dadosContrato.dataVencimento) <= new Date(dadosContrato.dataInicio)) {
      throw new RequisicaoInvalidaError("Data de vencimento do contrato deve ser posterior à data de início.");
    }

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
