import { FastifyRequest, FastifyReply } from "fastify";
import { ServicoEquipamento } from "../services/ServicoEquipamento";
import { DadosCriarEquipamento } from "../repositories/RepositorioEquipamento";
import { EstadoFisico } from "../domain/enums/EstadoFisico";
import { StatusRastreamento } from "../domain/enums/StatusRastreamento";
import { TipoEquipamento } from "../domain/enums/TipoEquipamento";
import { TokenPayload } from "../middlewares/authMiddleware";

export class ControllerEquipamento {
  constructor(private servico: ServicoEquipamento = new ServicoEquipamento()) {}

  criar = async (request: FastifyRequest, reply: FastifyReply) => {
    const dados = request.body as DadosCriarEquipamento;
    const user = request.user as TokenPayload | undefined;
    const operador = user?.usuario || "sistema";
    const ip = request.ip;

    const criado = await this.servico.cadastrarEquipamento(dados, operador, ip);
    return reply.status(201).send(criado);
  };

  atualizarEstadoFisico = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { versao, estadoFisico, justificativa } = request.body as {
      versao: number;
      estadoFisico: EstadoFisico;
      justificativa?: string;
    };
    const user = request.user as TokenPayload | undefined;
    const operador = user?.usuario || "sistema";
    const ip = request.ip;

    const atualizado = await this.servico.atualizarEstadoFisico(
      id,
      versao,
      estadoFisico,
      justificativa,
      operador,
      ip
    );
    return reply.status(200).send(atualizado);
  };

  transitarStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { versao, status, origem, destino, observacoes } = request.body as {
      versao: number;
      status: StatusRastreamento;
      origem: string;
      destino: string;
      observacoes?: string;
    };
    const user = request.user as TokenPayload | undefined;
    const operador = user?.usuario || "sistema";
    const ip = request.ip;

    const atualizado = await this.servico.transitarStatus(
      id,
      versao,
      status,
      origem,
      destino,
      operador,
      observacoes,
      ip
    );
    return reply.status(200).send(atualizado);
  };

  obterPorId = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const eq = await this.servico.obterPorId(id);
    return reply.status(200).send(eq);
  };

  obterPorCodigoBarras = async (request: FastifyRequest, reply: FastifyReply) => {
    const { codigoBarras } = request.params as { codigoBarras: string };
    const eq = await this.servico.obterPorCodigoBarras(codigoBarras);
    return reply.status(200).send(eq);
  };

  listar = async (request: FastifyRequest, reply: FastifyReply) => {
    const { loteId, status, tipo } = request.query as {
      loteId?: string;
      status?: StatusRastreamento;
      tipo?: TipoEquipamento;
    };
    const lista = await this.servico.listar({ loteId, status, tipo });
    return reply.status(200).send(lista);
  };

  calcularDepreciacao = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const depreciacao = await this.servico.calcularDepreciacao(id);
    return reply.status(200).send(depreciacao);
  };
}
