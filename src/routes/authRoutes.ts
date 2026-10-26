import { FastifyInstance } from "fastify";
import { ControllerAutenticacao } from "../controllers/ControllerAutenticacao";
import { exigirPapel } from "../middlewares/authMiddleware";
import { PapelUsuario } from "../domain/enums/PapelUsuario";

export async function authRoutes(app: FastifyInstance) {
  const controller = new ControllerAutenticacao();

  app.post(
    "/login",
    {
      schema: {
        tags: ["Autenticação"],
        summary: "Login de usuário no sistema",
        body: {
          type: "object",
          required: ["usuario", "senha"],
          properties: {
            usuario: { type: "string" },
            senha: { type: "string" }
          }
        }
      }
    },
    controller.login
  );

  app.post(
    "/usuarios",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR)],
      schema: {
        tags: ["Autenticação"],
        summary: "Cadastrar novo usuário (Apenas Administrador)",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["usuario", "senha", "papel"],
          properties: {
            usuario: { type: "string", minLength: 3 },
            senha: { type: "string", minLength: 6 },
            papel: {
              type: "string",
              enum: Object.values(PapelUsuario)
            }
          }
        }
      }
    },
    controller.cadastrar
  );

  app.get(
    "/usuarios",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR)],
      schema: {
        tags: ["Autenticação"],
        summary: "Listar usuários do sistema (Apenas Administrador)",
        security: [{ bearerAuth: [] }]
      }
    },
    controller.listar
  );

  app.get(
    "/me",
    {
      preHandler: [exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR)],
      schema: {
        tags: ["Autenticação"],
        summary: "Obter dados do usuário autenticado",
        security: [{ bearerAuth: [] }]
      }
    },
    controller.me
  );
}
