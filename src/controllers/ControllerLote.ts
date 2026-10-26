import { FastifyRequest, FastifyReply } from "fastify";
import { ServicoLote } from "../services/ServicoLote";
import { DadosCriarLote } from "../repositories/RepositorioLote";
import { StatusLote } from "../domain/enums/StatusLote";
import { TokenPayload } from "../middlewares/authMiddleware";

export class ControllerLote {
  constructor(private servico: ServicoLote = new ServicoLote()) {}

  criar = async (request: FastifyRequest, reply: FastifyReply) => {
    const dados = request.body as DadosCriarLote;
    const user = request.user as TokenPayload | undefined;
    const operador = user?.usuario || "sistema";
    const ip = request.ip;

    const lote = await this.servico.cadastrarLote(dados, operador, ip);
    return reply.status(201).send(lote);
  };

  processarTriagem = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { versao } = request.body as { versao: number };
    const user = request.user as TokenPayload | undefined;
    const operador = user?.usuario || "sistema";
    const ip = request.ip;

    const lote = await this.servico.processarTriagem(id, versao, operador, ip);
    return reply.status(200).send(lote);
  };

  atualizarStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { versao, status } = request.body as { versao: number; status: StatusLote };
    const user = request.user as TokenPayload | undefined;
    const operador = user?.usuario || "sistema";
    const ip = request.ip;

    const atualizado = await this.servico.atualizarStatus(id, versao, status, operador, ip);
    return reply.status(200).send(atualizado);
  };

  obterPorId = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const lote = await this.servico.obterPorId(id);
    return reply.status(200).send(lote);
  };

  listar = async (request: FastifyRequest, reply: FastifyReply) => {
    const { status, organizacaoId } = request.query as {
      status?: StatusLote;
      organizacaoId?: string;
    };
    const lista = await this.servico.listar({ status, organizacaoId });
    return reply.status(200).send(lista);
  };
}
