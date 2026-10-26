import { RepositorioEquipamento } from "../repositories/RepositorioEquipamento";
import { RepositorioLote } from "../repositories/RepositorioLote";
import { RepositorioOrganizacao } from "../repositories/RepositorioOrganizacao";
import { RepositorioJournal } from "../repositories/RepositorioJournal";

export class ServicoRelatorio {
  constructor(
    private repoEquipamento: RepositorioEquipamento = new RepositorioEquipamento(),
    private repoLote: RepositorioLote = new RepositorioLote(),
    private repoOrganizacao: RepositorioOrganizacao = new RepositorioOrganizacao(),
    private repoJournal: RepositorioJournal = new RepositorioJournal()
  ) {}

  async gerarRelatorioGeral() {
    const organizacoes = await this.repoOrganizacao.listar();
    const lotes = await this.repoLote.listar();
    const equipamentos = await this.repoEquipamento.listar();

    const lotesPorStatus = lotes.reduce<Record<string, number>>((acc, l) => {
      acc[l.statusProcessamento] = (acc[l.statusProcessamento] || 0) + 1;
      return acc;
    }, {});

    const equipamentosPorStatus = equipamentos.reduce<Record<string, number>>((acc, eq) => {
      acc[eq.status] = (acc[eq.status] || 0) + 1;
      return acc;
    }, {});

    const equipamentosPorEstado = equipamentos.reduce<Record<string, number>>((acc, eq) => {
      acc[eq.estadoFisico] = (acc[eq.estadoFisico] || 0) + 1;
      return acc;
    }, {});

    const pesoTotalKg = Number(
      equipamentos.reduce((acc, eq) => acc + (eq.pesoKg || 0), 0).toFixed(2)
    );

    const valorTotalEstimado = Number(
      equipamentos.reduce((acc, eq) => acc + (eq.precificacaoEstimada || 0), 0).toFixed(2)
    );

    return {
      totalOrganizacoes: organizacoes.length,
      totalLotes: lotes.length,
      totalEquipamentos: equipamentos.length,
      pesoTotalProcessadoKg: pesoTotalKg,
      valorTotalEstimado,
      distribuicaoLotesPorStatus: lotesPorStatus,
      distribuicaoEquipamentosPorStatus: equipamentosPorStatus,
      distribuicaoEquipamentosPorEstadoFisico: equipamentosPorEstado,
      geradoEm: new Date()
    };
  }

  async gerarRastreabilidade(codigoBarras: string) {
    const eq = await this.repoEquipamento.buscarPorCodigoBarras(codigoBarras);
    if (!eq) return null;

    const lote = eq.loteId ? await this.repoLote.buscarPorId(eq.loteId) : null;
    const org = lote && (lote as any).organizacaoId
      ? await this.repoOrganizacao.buscarPorId((lote as any).organizacaoId)
      : null;

    const journals = await this.repoJournal.listar({ entidade: "Equipamento" });
    const journalsDoEquipamento = journals.filter(
      (j) => (j.dadosDepois as any)?.id === eq.id || (j.dadosAntes as any)?.id === eq.id
    );

    return {
      equipamento: {
        id: eq.id,
        codigoBarrasInterno: eq.codigoBarrasInterno,
        tipo: eq.tipo,
        marca: eq.marca,
        modelo: eq.modelo,
        pesoKg: eq.pesoKg,
        estadoFisico: eq.estadoFisico,
        status: eq.status,
        precificacaoEstimada: eq.precificacaoEstimada,
        versao: eq.versao
      },
      loteOrigem: lote
        ? {
            id: lote.id,
            numeroLote: lote.numeroLote,
            dataEntrada: lote.dataEntrada,
            transportadora: lote.transportadora,
            status: lote.statusProcessamento
          }
        : null,
      organizacaoCliente: org
        ? {
            id: org.id,
            razaoSocial: org.razaoSocial,
            cnpj: org.cnpj
          }
        : null,
      historicoMovimentacoes: eq.movimentacoes || [],
      auditoriaTransacoes: journalsDoEquipamento
    };
  }

  async obterAuditTrail(filtros?: { entidade?: string; operador?: string }) {
    return this.repoJournal.listar(filtros);
  }
}
