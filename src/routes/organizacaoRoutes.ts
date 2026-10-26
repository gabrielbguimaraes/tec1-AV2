import { FastifyInstance } from "fastify";
import { ControllerOrganizacao } from "../controllers/ControllerOrganizacao";
import { exigirPapel } from "../middlewares/authMiddleware";
import { PapelUsuario } from "../domain/enums/PapelUsuario";

export async function organizacaoRoutes(app: FastifyInstance) {
  const controller = new ControllerOrganizacao();

  app.post(
    "/",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO)],
      schema: {
        tags: ["Organizações"],
        summary: "Cadastrar nova organização parceira",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["razaoSocial", "cnpj", "inscricaoEstadual", "enderecoCompleto", "telefone", "email"],
          properties: {
            razaoSocial: { type: "string" },
            cnpj: { type: "string" },
            inscricaoEstadual: { type: "string" },
            enderecoCompleto: { type: "string" },
            telefone: { type: "string" },
            email: { type: "string", format: "email" },
            contrato: {
              type: "object",
              required: ["dataVencimento"],
              properties: {
                dataInicio: { type: "string" },
                dataAssinatura: { type: "string" },
                dataVencimento: { type: "string" },
                valorTotal: { type: "number" },
                valorMensal: { type: "number" },
                renovacaoAutomatica: { type: "boolean" },
                clausulas: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          }
        }
      }
    },
    controller.criar
  );

  app.put(
    "/:id",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO)],
      schema: {
        tags: ["Organizações"],
        summary: "Atualizar organização (com versionamento otimista)",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" }
          }
        },
        body: {
          type: "object",
          required: ["versao"],
          properties: {
            versao: { type: "integer", minimum: 1 },
            razaoSocial: { type: "string" },
            inscricaoEstadual: { type: "string" },
            enderecoCompleto: { type: "string" },
            telefone: { type: "string" },
            email: { type: "string" },
            ativo: { type: "boolean" }
          }
        }
      }
    },
    controller.atualizar
  );

  app.post(
    "/:id/contrato",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO)],
      schema: {
        tags: ["Organizações"],
        summary: "Vincular ou renovar contrato de uma organização",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" }
          }
        },
        body: {
          type: "object",
          required: ["dataVencimento"],
          properties: {
            dataInicio: { type: "string" },
            dataAssinatura: { type: "string" },
            dataVencimento: { type: "string" },
            valorTotal: { type: "number" },
            valorMensal: { type: "number" },
            renovacaoAutomatica: { type: "boolean" },
            clausulas: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      }
    },
    controller.vincularContrato
  );

  app.get(
    "/",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO, PapelUsuario.AUDITOR)],
      schema: {
        tags: ["Organizações"],
        summary: "Listar organizações cadastradas",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            ativo: { type: "string" }
          }
        }
      }
    },
    controller.listar
  );

  app.get(
    "/:id",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO, PapelUsuario.AUDITOR)],
      schema: {
        tags: ["Organizações"],
        summary: "Obter detalhes de uma organização por ID",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" }
          }
        }
      }
    },
    controller.obterPorId
  );
}
