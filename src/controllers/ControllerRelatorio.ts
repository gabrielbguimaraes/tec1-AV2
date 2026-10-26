import { FastifyRequest, FastifyReply } from "fastify";
import { ServicoRelatorio } from "../services/ServicoRelatorio";

export class ControllerRelatorio {
  constructor(private servico: ServicoRelatorio = new ServicoRelatorio()) {}

  relatorioGeral = async (request: FastifyRequest, reply: FastifyReply) => {
    const relatorio = await this.servico.gerarRelatorioGeral();
    return reply.status(200).send(relatorio);
  };

  rastreabilidade = async (request: FastifyRequest, reply: FastifyReply) => {
    const { codigoBarras } = request.params as { codigoBarras: string };
    const rastreamento = await this.servico.gerarRastreabilidade(codigoBarras);
    if (!rastreamento) {
      return reply.status(404).send({ mensagem: "Equipamento não localizado para rastreabilidade." });
    }
    return reply.status(200).send(rastreamento);
  };

  auditTrail = async (request: FastifyRequest, reply: FastifyReply) => {
    const { entidade, operador } = request.query as { entidade?: string; operador?: string };
    const journals = await this.servico.obterAuditTrail({ entidade, operador });
    return reply.status(200).send(journals);
  };
}
