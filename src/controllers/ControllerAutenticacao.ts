import { FastifyRequest, FastifyReply } from "fastify";
import { ServicoAutenticacao } from "../services/ServicoAutenticacao";
import { PapelUsuario } from "../domain/enums/PapelUsuario";

export class ControllerAutenticacao {
  constructor(private servico: ServicoAutenticacao = new ServicoAutenticacao()) {}

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const { usuario, senha } = request.body as { usuario: string; senha: string };
    const auth = await this.servico.autenticar(usuario, senha);

    const token = await reply.jwtSign({
      id: auth.id,
      usuario: auth.usuario,
      papel: auth.papel
    });

    return reply.status(200).send({
      mensagem: "Autenticação realizada com sucesso.",
      token,
      usuario: auth
    });
  };

  cadastrar = async (request: FastifyRequest, reply: FastifyReply) => {
    const { usuario, senha, papel } = request.body as {
      usuario: string;
      senha: string;
      papel: PapelUsuario;
    };

    const criado = await this.servico.cadastrarUsuario(usuario, senha, papel);
    return reply.status(201).send({
      mensagem: "Usuário cadastrado com sucesso.",
      usuario: criado
    });
  };

  listar = async (request: FastifyRequest, reply: FastifyReply) => {
    const usuarios = await this.servico.listarUsuarios();
    return reply.status(200).send(usuarios);
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ usuario: request.user });
  };
}
