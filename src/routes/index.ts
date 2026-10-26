import { FastifyInstance } from "fastify";
import { authRoutes } from "./authRoutes";
import { organizacaoRoutes } from "./organizacaoRoutes";
import { loteRoutes } from "./loteRoutes";
import { equipamentoRoutes } from "./equipamentoRoutes";
import { relatorioRoutes } from "./relatorioRoutes";

export async function appRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "ok",
    servico: "greencode-api",
    timestamp: new Date()
  }));

  app.register(authRoutes, { prefix: "/auth" });
  app.register(organizacaoRoutes, { prefix: "/organizacoes" });
  app.register(loteRoutes, { prefix: "/lotes" });
  app.register(equipamentoRoutes, { prefix: "/equipamentos" });
  app.register(relatorioRoutes, { prefix: "/relatorios" });
}
