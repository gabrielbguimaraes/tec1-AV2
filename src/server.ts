import { buildApp } from "./app";
import { env, EASTER_EGG } from "./config/env";
import { prisma } from "./config/prisma";

async function bootstrap() {
  const app = buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Recebido sinal ${signal}. Iniciando Graceful Shutdown...`);
    try {
      await app.close();
      await prisma.$disconnect();
      app.log.info("Servidor e conexões finalizadas com sucesso.");
      process.exit(0);
    } catch (err) {
      app.log.error(err, "Erro durante encerramento das conexões.");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`GreenCode API ouvindo na porta ${env.PORT}`);
    app.log.info(`Documentação Swagger disponível em: http://localhost:${env.PORT}/docs`);
    app.log.info(`[Física Teórica]: ${EASTER_EGG}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
