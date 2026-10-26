import {
  RepositorioEquipamento,
  DadosCriarEquipamento
} from "../repositories/RepositorioEquipamento";
import { RepositorioLote } from "../repositories/RepositorioLote";
import { RepositorioJournal } from "../repositories/RepositorioJournal";
import { EstadoFisico } from "../domain/enums/EstadoFisico";
import { StatusRastreamento } from "../domain/enums/StatusRastreamento";
import { TipoEquipamento } from "../domain/enums/TipoEquipamento";
import { Equipamento } from "../domain/entities/Equipamento";
import { RequisicaoInvalidaError, NaoEncontradoError } from "../domain/errors/AppError";

export class ServicoEquipamento {
  constructor(
    private repoEquipamento: RepositorioEquipamento = new RepositorioEquipamento(),
    private repoLote: RepositorioLote = new RepositorioLote(),
    private repoJournal: RepositorioJournal = new RepositorioJournal()
  ) {}

  async cadastrarEquipamento(dados: DadosCriarEquipamento, operador: string, ipOrigem?: string) {
    const lote = await this.repoLote.buscarPorId(dados.loteId);
    if (!lote) {
      throw new NaoEncontradoError("Lote informado não existe.");
    }

    if (!dados.codigoBarrasInterno || !dados.codigoBarrasInterno.trim()) {
      throw new RequisicaoInvalidaError("Código de barras interno é obrigatório.");
    }
    if (dados.pesoKg <= 0) {
      throw new RequisicaoInvalidaError("Peso do equipamento deve ser maior que zero.");
    }

    const criado = await this.repoEquipamento.criar(dados);

    await this.repoEquipamento.registrarMovimentacao({
      equipamentoId: criado.id,
      origem: "Entrada Fornecedor",
      destino: "Almoxarifado Geral",
      responsavel: operador,
      observacoes: `Equipamento recebido no lote ${lote.numeroLote}`
    });

    await this.repoJournal.registrar({
      operacao: "CRIAR_EQUIPAMENTO",
      entidade: "Equipamento",
      operador,
      ipOrigem,
      dadosAntes: null,
      dadosDepois: criado,
      sucesso: true
    });

    return this.repoEquipamento.buscarPorId(criado.id);
  }

  async atualizarEstadoFisico(
    id: string,
    versaoEsperada: number,
    novoEstado: EstadoFisico,
    justificativa: string | undefined,
    operador: string,
    ipOrigem?: string
  ) {
    const atual = await this.repoEquipamento.buscarPorId(id);
    if (!atual) throw new NaoEncontradoError("Equipamento não encontrado.");

    try {
      const eqEntidade = new Equipamento(
        atual.id,
        atual.codigoBarrasInterno,
        atual.tipo,
        atual.marca,
        atual.modelo,
        atual.pesoKg,
        atual.estadoFisico,
        atual.precificacaoEstimada,
        atual.status,
        atual.loteId,
        atual.versao,
        atual.anoFabricacao,
        atual.posicaoNoLote
      );

      eqEntidade.atualizarEstadoFisico(novoEstado, justificativa);
    } catch (err: any) {
      throw new RequisicaoInvalidaError(err.message);
    }

    return this.repoEquipamento.atualizarEstadoFisicoTransacional(
      id,
      versaoEsperada,
      novoEstado,
      `Estado: ${atual.estadoFisico}`,
      `Estado: ${novoEstado}`,
      operador,
      justificativa,
      ipOrigem
    );
  }

  async transitarStatus(
    id: string,
    versaoEsperada: number,
    novoStatus: StatusRastreamento,
    origem: string,
    destino: string,
    operador: string,
    observacoes?: string,
    ipOrigem?: string
  ) {
    const atual = await this.repoEquipamento.buscarPorId(id);
    if (!atual) throw new NaoEncontradoError("Equipamento não encontrado.");

    try {
      const eqEntidade = new Equipamento(
        atual.id,
        atual.codigoBarrasInterno,
        atual.tipo,
        atual.marca,
        atual.modelo,
        atual.pesoKg,
        atual.estadoFisico,
        atual.precificacaoEstimada,
        atual.status,
        atual.loteId,
        atual.versao,
        atual.anoFabricacao,
        atual.posicaoNoLote
      );

      eqEntidade.atualizarStatus(novoStatus, observacoes);
    } catch (err: any) {
      throw new RequisicaoInvalidaError(err.message);
    }

    return this.repoEquipamento.transitarStatusTransacional(
      id,
      versaoEsperada,
      novoStatus,
      origem,
      destino,
      operador,
      observacoes,
      ipOrigem
    );
  }

  async obterPorId(id: string) {
    const eq = await this.repoEquipamento.buscarPorId(id);
    if (!eq) throw new NaoEncontradoError("Equipamento não encontrado.");
    return eq;
  }

  async obterPorCodigoBarras(codigoBarras: string) {
    const eq = await this.repoEquipamento.buscarPorCodigoBarras(codigoBarras);
    if (!eq) throw new NaoEncontradoError("Equipamento não encontrado com o código de barras informado.");
    return eq;
  }

  async listar(filtros?: {
    loteId?: string;
    status?: StatusRastreamento;
    tipo?: TipoEquipamento;
  }) {
    return this.repoEquipamento.listar(filtros);
  }

  async calcularDepreciacao(id: string) {
    const eq = await this.obterPorId(id);
    const entidade = new Equipamento(
      eq.id,
      eq.codigoBarrasInterno,
      eq.tipo,
      eq.marca,
      eq.modelo,
      eq.pesoKg,
      eq.estadoFisico,
      eq.precificacaoEstimada,
      eq.status,
      eq.loteId,
      eq.versao,
      eq.anoFabricacao,
      eq.posicaoNoLote
    );

    const valorAposDepreciacao = entidade.calcularDepreciacao();
    const depreciacaoTotal = Number((eq.precificacaoEstimada - valorAposDepreciacao).toFixed(2));

    return {
      equipamentoId: eq.id,
      codigoBarrasInterno: eq.codigoBarrasInterno,
      estadoFisico: eq.estadoFisico,
      precificacaoOriginal: eq.precificacaoEstimada,
      valorDepreciado: valorAposDepreciacao,
      descontoDepreciacao: depreciacaoTotal
    };
  }
}
