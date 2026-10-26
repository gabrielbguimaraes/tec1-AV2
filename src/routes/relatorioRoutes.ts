import { FastifyInstance } from "fastify";
import { ControllerRelatorio } from "../controllers/ControllerRelatorio";
import { exigirPapel } from "../middlewares/authMiddleware";
import { PapelUsuario } from "../domain/enums/PapelUsuario";

export async function relatorioRoutes(app: FastifyInstance) {
  const controller = new ControllerRelatorio();

  app.get(
    "/geral",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.AUDITOR, PapelUsuario.GESTOR_ALMOXARIFADO)],
      schema: {
        tags: ["Relatórios & Auditoria"],
        summary: "Obter relatório consolidado do fluxo de logística reversa",
        security: [{ bearerAuth: [] }]
      }
    },
    controller.relatorioGeral
  );

  app.get(
    "/rastreabilidade/:codigoBarras",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.AUDITOR, PapelUsuario.GESTOR_ALMOXARIFADO)],
      schema: {
        tags: ["Relatórios & Auditoria"],
        summary: "Obter histórico completo de rastreabilidade de um equipamento",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["codigoBarras"],
          properties: {
            codigoBarras: { type: "string" }
          }
        }
      }
    },
    controller.rastreabilidade
  );

  app.get(
    "/audit-trail",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.AUDITOR)],
      schema: {
        tags: ["Relatórios & Auditoria"],
        summary: "Consultar Journal de auditoria e transações críticas",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            entidade: { type: "string" },
            operador: { type: "string" }
          }
        }
      }
    },
    controller.auditTrail
  );
}
