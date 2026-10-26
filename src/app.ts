import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "./config/env";
import { AppError } from "./domain/errors/AppError";
import { appRoutes } from "./routes";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: env.NODE_ENV === "development"
  });

  app.register(cors, {
    origin: true
  });

  app.register(jwt, {
    secret: env.JWT_SECRET
  });

  app.register(swagger, {
    swagger: {
      info: {
        title: "GreenCode - API de Logística Reversa de Resíduos Eletrônicos",
        description: "Documentação da API RESTful monolítica do sistema GreenCode (AV2)",
        version: "1.0.0"
      },
      host: `localhost:${env.PORT}`,
      schemes: ["http"],
      consumes: ["application/json"],
      produces: ["application/json"],
      securityDefinitions: {
        bearerAuth: {
          type: "apiKey",
          name: "Authorization",
          in: "header",
          description: "Digite 'Bearer <token>'"
        }
      }
    }
  });

  app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        erro: error.name,
        mensagem: error.message
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        erro: "ErroValidacao",
        mensagem: error.message,
        detalhes: error.validation
      });
    }

    if ((error as any).statusCode === 401) {
      return reply.status(401).send({
        statusCode: 401,
        erro: "NaoAutorizadoError",
        mensagem: "Token de acesso inválido ou expirado."
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      erro: "ErroInternoServidor",
      mensagem: "Ocorreu um erro interno no servidor."
    });
  });

  app.register(appRoutes);

  return app;
}
