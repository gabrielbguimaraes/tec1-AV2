import { FastifyInstance } from "fastify";
import { ControllerEquipamento } from "../controllers/ControllerEquipamento";
import { exigirPapel } from "../middlewares/authMiddleware";
import { PapelUsuario } from "../domain/enums/PapelUsuario";
import { TipoEquipamento } from "../domain/enums/TipoEquipamento";
import { EstadoFisico } from "../domain/enums/EstadoFisico";
import { StatusRastreamento } from "../domain/enums/StatusRastreamento";

export async function equipamentoRoutes(app: FastifyInstance) {
  const controller = new ControllerEquipamento();

  app.post(
    "/",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO)],
      schema: {
        tags: ["Equipamentos"],
        summary: "Cadastrar equipamento individual vinculado a um lote",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["loteId", "codigoBarrasInterno", "tipo", "marca", "modelo", "pesoKg", "estadoFisico", "precificacaoEstimada"],
          properties: {
            loteId: { type: "string" },
            codigoBarrasInterno: { type: "string" },
            tipo: { type: "string", enum: Object.values(TipoEquipamento) },
            marca: { type: "string" },
            modelo: { type: "string" },
            pesoKg: { type: "number", minimum: 0.01 },
            estadoFisico: { type: "string", enum: Object.values(EstadoFisico) },
            precificacaoEstimada: { type: "number", minimum: 0 },
            status: { type: "string", enum: Object.values(StatusRastreamento) }
          }
        }
      }
    },
    controller.criar
  );

  app.patch(
    "/:id/estado-fisico",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO)],
      schema: {
        tags: ["Equipamentos"],
        summary: "Atualizar estado físico (exige justificativa se degradação >= 2 níveis)",
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
          required: ["versao", "estadoFisico"],
          properties: {
            versao: { type: "integer", minimum: 1 },
            estadoFisico: { type: "string", enum: Object.values(EstadoFisico) },
            justificativa: { type: "string" }
          }
        }
      }
    },
    controller.atualizarEstadoFisico
  );

  app.patch(
    "/:id/status",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO)],
      schema: {
        tags: ["Equipamentos"],
        summary: "Transitar status de rastreabilidade e registrar movimentação",
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
          required: ["versao", "status", "origem", "destino"],
          properties: {
            versao: { type: "integer", minimum: 1 },
            status: { type: "string", enum: Object.values(StatusRastreamento) },
            origem: { type: "string" },
            destino: { type: "string" },
            observacoes: { type: "string" }
          }
        }
      }
    },
    controller.transitarStatus
  );

  app.get(
    "/",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR)],
      schema: {
        tags: ["Equipamentos"],
        summary: "Listar equipamentos com filtros opcionais",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            loteId: { type: "string" },
            status: { type: "string", enum: Object.values(StatusRastreamento) },
            tipo: { type: "string", enum: Object.values(TipoEquipamento) }
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
        tags: ["Equipamentos"],
        summary: "Obter detalhes de equipamento por ID",
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

  app.get(
    "/codigo/:codigoBarras",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR)],
      schema: {
        tags: ["Equipamentos"],
        summary: "Buscar equipamento por código de barras interno",
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
    controller.obterPorCodigoBarras
  );

  app.get(
    "/:id/depreciacao",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR)],
      schema: {
        tags: ["Equipamentos"],
        summary: "Calcular depreciação estimada conforme estado físico",
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
    controller.calcularDepreciacao
  );
}
