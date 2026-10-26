import { FastifyRequest, FastifyReply } from "fastify";
import { ServicoOrganizacao } from "../services/ServicoOrganizacao";
import { DadosCriarOrganizacao, DadosAtualizarOrganizacao, DadosCriarContrato } from "../repositories/RepositorioOrganizacao";
import { TokenPayload } from "../middlewares/authMiddleware";

export class ControllerOrganizacao {
  constructor(private servico: ServicoOrganizacao = new ServicoOrganizacao()) {}

  criar = async (request: FastifyRequest, reply: FastifyReply) => {
    const dados = request.body as DadosCriarOrganizacao;
    const user = request.user as TokenPayload | undefined;
    const operador = user?.usuario || "sistema";
    const ip = request.ip;

    const org = await this.servico.cadastrarOrganizacao(dados, operador, ip);
    return reply.status(201).send(org);
  };

  atualizar = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { versao, ...dados } = request.body as DadosAtualizarOrganizacao & { versao: number };
    const user = request.user as TokenPayload | undefined;
    const operador = user?.usuario || "sistema";
    const ip = request.ip;

    const atualizada = await this.servico.atualizarOrganizacao(id, versao, dados, operador, ip);
    return reply.status(200).send(atualizada);
  };

  vincularContrato = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const dadosContrato = request.body as DadosCriarContrato;
    const user = request.user as TokenPayload | undefined;
    const operador = user?.usuario || "sistema";
    const ip = request.ip;

    const contrato = await this.servico.vincularContrato(id, dadosContrato, operador, ip);
    return reply.status(201).send(contrato);
  };

  obterPorId = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const org = await this.servico.obterPorId(id);
    return reply.status(200).send(org);
  };

  listar = async (request: FastifyRequest, reply: FastifyReply) => {
    const { ativo } = request.query as { ativo?: string };
    const filtroAtivo = ativo !== undefined ? ativo === "true" : undefined;
    const lista = await this.servico.listar({ ativo: filtroAtivo });
    return reply.status(200).send(lista);
  };
}
