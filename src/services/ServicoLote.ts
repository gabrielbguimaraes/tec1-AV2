import { RepositorioLote, DadosCriarLote } from "../repositories/RepositorioLote";
import { RepositorioEquipamento } from "../repositories/RepositorioEquipamento";
import { RepositorioJournal } from "../repositories/RepositorioJournal";
import { ValidadorDataEntrada } from "../domain/validators/ValidadorDataEntrada";
import { StatusLote } from "../domain/enums/StatusLote";
import { StatusRastreamento } from "../domain/enums/StatusRastreamento";
import { RequisicaoInvalidaError, NaoEncontradoError } from "../domain/errors/AppError";

export class ServicoLote {
  constructor(
    private repoLote: RepositorioLote = new RepositorioLote(),
    private repoEquipamento: RepositorioEquipamento = new RepositorioEquipamento(),
    private repoJournal: RepositorioJournal = new RepositorioJournal(),
    private validadorDataEntrada: ValidadorDataEntrada = new ValidadorDataEntrada()
  ) {}

  async cadastrarLote(dados: DadosCriarLote, operador: string, ipOrigem?: string) {
    if (!this.validadorDataEntrada.validar(dados.dataEntrada)) {
      throw new RequisicaoInvalidaError(this.validadorDataEntrada.obterMensagemErro());
    }

    if (!dados.numeroLote || !dados.numeroLote.trim()) {
      throw new RequisicaoInvalidaError("Número do lote é obrigatório.");
    }
    if (!dados.organizacaoId) {
      throw new RequisicaoInvalidaError("ID da organização é obrigatório.");
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

    const loteAtualizado = await this.repoLote.atualizarStatus(
      id,
      versaoEsperada,
      StatusLote.TRIAGEM_CONCLUIDA
    );

    for (const eq of lote.equipamentos) {
      if (eq.status === StatusRastreamento.AGUARDANDO_TRIAGEM) {
        await this.repoEquipamento.atualizar(eq.id, eq.versao, {
          status: StatusRastreamento.EM_TRIAGEM
        });
        await this.repoEquipamento.registrarMovimentacao({
          equipamentoId: eq.id,
          origem: "Recepção / Almoxarifado",
          destino: "Bancada de Triagem Técnica",
          responsavel: operador,
          observacoes: `Triagem processada no lote ${lote.numeroLote}`
        });
      }
    }

    await this.repoJournal.registrar({
      operacao: "PROCESSAR_TRIAGEM_LOTE",
      entidade: "Lote",
      operador,
      ipOrigem,
      dadosAntes: lote,
      dadosDepois: loteAtualizado,
      sucesso: true
    });

    return this.repoLote.buscarPorId(id);
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
