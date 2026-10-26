import { RepositorioLote, DadosCriarLote } from "../repositories/RepositorioLote";
import { RepositorioJournal } from "../repositories/RepositorioJournal";
import { Lote } from "../domain/entities/Lote";
import { Equipamento } from "../domain/entities/Equipamento";
import { StatusLote } from "../domain/enums/StatusLote";
import { RequisicaoInvalidaError, NaoEncontradoError } from "../domain/errors/AppError";

export class ServicoLote {
  constructor(
    private repoLote: RepositorioLote = new RepositorioLote(),
    private repoJournal: RepositorioJournal = new RepositorioJournal()
  ) {}

  async cadastrarLote(dados: DadosCriarLote, operador: string, ipOrigem?: string) {
    if (!dados.numeroLote || !dados.numeroLote.trim()) {
      throw new RequisicaoInvalidaError("Número do lote é obrigatório.");
    }
    if (!dados.organizacaoId) {
      throw new RequisicaoInvalidaError("ID da organização é obrigatório.");
    }

    try {
      const loteEntidade = new Lote(
        "",
        dados.numeroLote,
        dados.organizacaoId,
        new Date(dados.dataEntrada),
        dados.transportadora,
        StatusLote.RECEBIDO,
        dados.observacoes,
        1,
        dados.notaFiscal || ""
      );

      loteEntidade.garantirJanelaTemporal();

      if (dados.equipamentos) {
        for (const eq of dados.equipamentos) {
          const eqEntidade = new Equipamento(
            "",
            eq.codigoBarrasInterno,
            eq.tipo,
            eq.marca,
            eq.modelo,
            eq.pesoKg,
            eq.estadoFisico,
            eq.precificacaoEstimada
          );
          loteEntidade.adicionarEquipamento(eqEntidade);
        }
      }
    } catch (err: any) {
      throw new RequisicaoInvalidaError(err.message);
    }

    const loteCriado = await this.repoLote.criar(dados);

    await this.repoJournal.registrar({
      operacao: "CRIAR_LOTE",
      entidade: "Lote",
      operador,
      ipOrigem,
      dadosAntes: null,
      dadosDepois: loteCriado,
      sucesso: true
    });

    return loteCriado;
  }

  async processarTriagem(id: string, versaoEsperada: number, operador: string, ipOrigem?: string) {
    const lote = await this.repoLote.buscarPorId(id);
    if (!lote) throw new NaoEncontradoError("Lote não encontrado.");

    const loteAtualizado = await this.repoLote.processarTriagemTransacional(id, versaoEsperada, operador);

    await this.repoJournal.registrar({
      operacao: "PROCESSAR_TRIAGEM_LOTE",
      entidade: "Lote",
      operador,
      ipOrigem,
      dadosAntes: lote,
      dadosDepois: loteAtualizado,
      sucesso: true
    });

    return loteAtualizado;
  }

  async atualizarStatus(
    id: string,
    versaoEsperada: number,
    novoStatus: StatusLote,
    operador: string,
    ipOrigem?: string
  ) {
    const anterior = await this.repoLote.buscarPorId(id);
    if (!anterior) throw new NaoEncontradoError("Lote não encontrado.");

    const loteEntidade = new Lote(
      anterior.id,
      anterior.numeroLote,
      anterior.organizacaoId,
      anterior.dataEntrada,
      anterior.transportadora,
      anterior.statusProcessamento,
      anterior.observacoes,
      anterior.versao,
      anterior.notaFiscal
    );

    loteEntidade.atualizarStatus(novoStatus);

    const atualizado = await this.repoLote.atualizarStatus(id, versaoEsperada, novoStatus);

    await this.repoJournal.registrar({
      operacao: "ATUALIZAR_STATUS_LOTE",
      entidade: "Lote",
      operador,
      ipOrigem,
      dadosAntes: anterior,
      dadosDepois: atualizado,
      sucesso: true
    });

    return atualizado;
  }

  async obterPorId(id: string) {
    const lote = await this.repoLote.buscarPorId(id);
    if (!lote) throw new NaoEncontradoError("Lote não encontrado.");
    return lote;
  }

  async listar(filtros?: { status?: StatusLote; organizacaoId?: string }) {
    return this.repoLote.listar(filtros);
  }
}
