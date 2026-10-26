import { FastifyInstance } from "fastify";
import { ControllerLote } from "../controllers/ControllerLote";
import { exigirPapel } from "../middlewares/authMiddleware";
import { PapelUsuario } from "../domain/enums/PapelUsuario";
import { StatusLote } from "../domain/enums/StatusLote";
import { TipoEquipamento } from "../domain/enums/TipoEquipamento";
import { EstadoFisico } from "../domain/enums/EstadoFisico";

export async function loteRoutes(app: FastifyInstance) {
  const controller = new ControllerLote();

  app.post(
    "/",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO)],
      schema: {
        tags: ["Lotes"],
        summary: "Cadastrar novo lote de descarte com equipamentos opcionais",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["numeroLote", "organizacaoId", "dataEntrada", "transportadora"],
          properties: {
            numeroLote: { type: "string" },
            organizacaoId: { type: "string" },
            dataEntrada: { type: "string" },
            transportadora: { type: "string" },
            observacoes: { type: "string" },
            equipamentos: {
              type: "array",
              items: {
                type: "object",
                required: ["codigoBarrasInterno", "tipo", "marca", "modelo", "pesoKg", "estadoFisico", "precificacaoEstimada"],
                properties: {
                  codigoBarrasInterno: { type: "string" },
                  tipo: { type: "string", enum: Object.values(TipoEquipamento) },
                  marca: { type: "string" },
                  modelo: { type: "string" },
                  pesoKg: { type: "number", minimum: 0.01 },
                  estadoFisico: { type: "string", enum: Object.values(EstadoFisico) },
                  precificacaoEstimada: { type: "number", minimum: 0 }
                }
              }
            }
          }
        }
      }
    },
    controller.criar
  );

  app.post(
    "/:id/triagem",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO)],
      schema: {
        tags: ["Lotes"],
        summary: "Processar triagem técnica do lote e atualizar equipamentos",
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
            versao: { type: "integer", minimum: 1 }
          }
        }
      }
    },
    controller.processarTriagem
  );

  app.patch(
    "/:id/status",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO)],
      schema: {
        tags: ["Lotes"],
        summary: "Atualizar status do lote (com versionamento otimista)",
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
          required: ["versao", "status"],
          properties: {
            versao: { type: "integer", minimum: 1 },
            status: { type: "string", enum: Object.values(StatusLote) }
          }
        }
      }
    },
    controller.atualizarStatus
  );

  app.get(
    "/",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR)],
      schema: {
        tags: ["Lotes"],
        summary: "Listar lotes com filtros opcionais",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            status: { type: "string", enum: Object.values(StatusLote) },
            organizacaoId: { type: "string" }
          }
        }
      }
    },
    controller.listar
  );

  app.get(
    "/:id",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR)],
      schema: {
        tags: ["Lotes"],
        summary: "Obter detalhes de um lote por ID",
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
