import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";
import { executarSeed } from "../prisma/seed";
import { PapelUsuario } from "../src/domain/enums/PapelUsuario";
import { StatusLote } from "../src/domain/enums/StatusLote";
import { StatusRastreamento } from "../src/domain/enums/StatusRastreamento";
import { EstadoFisico } from "../src/domain/enums/EstadoFisico";
import { TipoEquipamento } from "../src/domain/enums/TipoEquipamento";

describe("GreenCode API - Testes de Integração e Regras de Negócio da AV2", () => {
  let app: FastifyInstance;
  let tokenAdmin: string;
  let tokenOperador: string;
  let tokenGestor: string;
  let tokenAuditor: string;

  beforeAll(async () => {
    await executarSeed();
    app = buildApp();
    await app.ready();

    const resAdmin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { usuario: "admin", senha: "admin123" }
    });
    tokenAdmin = JSON.parse(resAdmin.body).token;

    const resOp = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { usuario: "operador", senha: "operador123" }
    });
    tokenOperador = JSON.parse(resOp.body).token;

    const resGestor = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { usuario: "gestor", senha: "gestor123" }
    });
    tokenGestor = JSON.parse(resGestor.body).token;

    const resAuditor = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { usuario: "auditor", senha: "auditor123" }
    });
    tokenAuditor = JSON.parse(resAuditor.body).token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("1. Autenticação e JWT Stateless", () => {
    it("deve autenticar os 4 perfis de usuários com sucesso", () => {
      expect(tokenAdmin).toBeDefined();
      expect(tokenOperador).toBeDefined();
      expect(tokenGestor).toBeDefined();
      expect(tokenAuditor).toBeDefined();
    });

    it("deve rejeitar login com senha incorreta com HTTP 401", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { usuario: "admin", senha: "senhaErrada123" }
      });
      expect(res.statusCode).toBe(401);
    });

    it("deve bloquear acesso a rota protegida sem token JWT com HTTP 401", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/auth/me"
      });
      expect(res.statusCode).toBe(401);
    });

    it("deve permitir obter dados do próprio usuário com token válido", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { authorization: `Bearer ${tokenAdmin}` }
      });
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.usuario.usuario).toBe("admin");
      expect(data.usuario.papel).toBe(PapelUsuario.ADMINISTRADOR);
    });
  });

  describe("2. RBAC (Controle de Acesso Baseado em Papel)", () => {
    it("ADMINISTRADOR pode cadastrar novos usuários", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/usuarios",
        headers: { authorization: `Bearer ${tokenAdmin}` },
        payload: {
          usuario: "novo_auditor_teste",
          senha: "password123",
          papel: PapelUsuario.AUDITOR
        }
      });
      expect(res.statusCode).toBe(201);
    });

    it("OPERADOR_CADASTRO não pode cadastrar usuários (HTTP 403)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/usuarios",
        headers: { authorization: `Bearer ${tokenOperador}` },
        payload: {
          usuario: "hacker",
          senha: "password123",
          papel: PapelUsuario.ADMINISTRADOR
        }
      });
      expect(res.statusCode).toBe(403);
    });

    it("OPERADOR_CADASTRO não pode cadastrar lotes (HTTP 403)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/lotes",
        headers: { authorization: `Bearer ${tokenOperador}` },
        payload: {
          numeroLote: "LOTE-INV-001",
          organizacaoId: "some-id",
          dataEntrada: new Date().toISOString(),
          transportadora: "Trans"
        }
      });
      expect(res.statusCode).toBe(403);
    });

    it("GESTOR_ALMOXARIFADO não pode cadastrar organização (HTTP 403)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/organizacoes",
        headers: { authorization: `Bearer ${tokenGestor}` },
        payload: {
          razaoSocial: "Invasao Ltda",
          cnpj: "45997418000153",
          inscricaoEstadual: "111",
          enderecoCompleto: "Rua X",
          telefone: "123",
          email: "x@y.com"
        }
      });
      expect(res.statusCode).toBe(403);
    });

    it("AUDITOR possui acesso somente de leitura (bloqueado com HTTP 403 em POST/PUT/PATCH)", async () => {
      const resPost = await app.inject({
        method: "POST",
        url: "/organizacoes",
        headers: { authorization: `Bearer ${tokenAuditor}` },
        payload: {
          razaoSocial: "Auditoria Tentando Criar",
          cnpj: "45997418000153",
          inscricaoEstadual: "111",
          enderecoCompleto: "Rua X",
          telefone: "123",
          email: "audit@test.com"
        }
      });
      expect(resPost.statusCode).toBe(403);

      const resGet = await app.inject({
        method: "GET",
        url: "/relatorios/geral",
        headers: { authorization: `Bearer ${tokenAuditor}` }
      });
      expect(resGet.statusCode).toBe(200);
    });
  });

  describe("3. Regras de Negócio de Organização e CNPJ (Módulo 11)", () => {
    it("deve rejeitar cadastro com CNPJ matematicamente inválido (HTTP 400)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/organizacoes",
        headers: { authorization: `Bearer ${tokenOperador}` },
        payload: {
          razaoSocial: "Empresa Falsa S.A.",
          cnpj: "11.111.111/1111-11",
          inscricaoEstadual: "123456",
          enderecoCompleto: "Rua Ficticia, 123",
          telefone: "(11) 9999-9999",
          email: "contato@empresa.com"
        }
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).mensagem).toContain("CNPJ não pode conter todos os dígitos iguais");
    });

    it("deve cadastrar organização com CNPJ válido e contrato vinculado em transação", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/organizacoes",
        headers: { authorization: `Bearer ${tokenOperador}` },
        payload: {
          razaoSocial: "EcoTech Soluções Reversas",
          cnpj: "45.997.418/0001-53",
          inscricaoEstadual: "ISENTO",
          enderecoCompleto: "Av Paulista 1000",
          telefone: "(11) 3100-0000",
          email: "financeiro@ecotech.com.br",
          contrato: {
            dataInicio: new Date().toISOString(),
            dataVencimento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            valorTotal: 50000.0,
            renovacaoAutomatica: true
          }
        }
      });
      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res.body);
      expect(data.razaoSocial).toBe("EcoTech Soluções Reversas");
      expect(data.contrato).toBeDefined();
      expect(data.contrato.valorTotal).toBe(50000.0);
    });

    it("deve barrar CNPJ duplicado com HTTP 409", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/organizacoes",
        headers: { authorization: `Bearer ${tokenOperador}` },
        payload: {
          razaoSocial: "Empresa Clone",
          cnpj: "45.997.418/0001-53",
          inscricaoEstadual: "ISENTO",
          enderecoCompleto: "Rua B",
          telefone: "(11) 3100-0000",
          email: "clone@ecotech.com.br"
        }
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe("4. Regras de Negócio de Lote e Janela Temporal (90 dias)", () => {
    let orgId: string;

    beforeAll(async () => {
      const res = await app.inject({
        method: "GET",
        url: "/organizacoes",
        headers: { authorization: `Bearer ${tokenOperador}` }
      });
      const orgs = JSON.parse(res.body);
      orgId = orgs[0].id;
    });

    it("deve barrar lote com data no futuro com HTTP 400", async () => {
      const dataFutura = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const res = await app.inject({
        method: "POST",
        url: "/lotes",
        headers: { authorization: `Bearer ${tokenGestor}` },
        payload: {
          numeroLote: "LOTE-FUTURO",
          organizacaoId: orgId,
          dataEntrada: dataFutura,
          transportadora: "Transportes Futuro"
        }
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).mensagem).toContain("futuro");
    });

    it("deve barrar lote com data com mais de 90 dias no passado com HTTP 400", async () => {
      const dataAntiga = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString();
      const res = await app.inject({
        method: "POST",
        url: "/lotes",
        headers: { authorization: `Bearer ${tokenGestor}` },
        payload: {
          numeroLote: "LOTE-PASSADO",
          organizacaoId: orgId,
          dataEntrada: dataAntiga,
          transportadora: "Transportes Passado"
        }
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).mensagem).toContain("90 dias");
    });

    it("deve cadastrar lote válido com data dentro da janela temporal de 90 dias", async () => {
      const dataValida = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const res = await app.inject({
        method: "POST",
        url: "/lotes",
        headers: { authorization: `Bearer ${tokenGestor}` },
        payload: {
          numeroLote: "LOTE-VALIDO-001",
          organizacaoId: orgId,
          dataEntrada: dataValida,
          transportadora: "Transportadora Rápida",
          equipamentos: [
            {
              codigoBarrasInterno: "EQ-TEST-001",
              tipo: TipoEquipamento.NOTEBOOK,
              marca: "Dell",
              modelo: "Latitude 5400",
              pesoKg: 1.8,
              estadoFisico: EstadoFisico.BOM_ESTADO,
              precificacaoEstimada: 1500.0
            }
          ]
        }
      });
      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res.body);
      expect(data.numeroLote).toBe("LOTE-VALIDO-001");
      expect(data.equipamentos.length).toBe(1);
    });
  });

  describe("5. Máquina de Estados e Degradação Severa de Equipamento", () => {
    let equipamentoId: string;
    let loteId: string;

    beforeAll(async () => {
      const resLote = await app.inject({
        method: "GET",
        url: "/lotes",
        headers: { authorization: `Bearer ${tokenGestor}` }
      });
      const lotes = JSON.parse(resLote.body);
      const loteAlvo = lotes.find((l: any) => l.numeroLote === "LOTE-2026-001" || l.numeroLote === "LOTE-VALIDO-001");
      loteId = loteAlvo.id;
      equipamentoId = loteAlvo.equipamentos[0].id;
    });

    it("deve bloquear desmonte antes da realização da triagem (HTTP 400)", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/equipamentos/${equipamentoId}/status`,
        headers: { authorization: `Bearer ${tokenGestor}` },
        payload: {
          versao: 1,
          status: StatusRastreamento.AGUARDANDO_DESMONTE,
          origem: "Almoxarifado",
          destino: "Bancada Desmonte"
        }
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).mensagem).toContain("passar por triagem");
    });

    it("deve processar a triagem do lote e transitar equipamentos para EM_TRIAGEM", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/lotes/${loteId}/triagem`,
        headers: { authorization: `Bearer ${tokenGestor}` },
        payload: { versao: 1 }
      });
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.statusProcessamento).toBe(StatusLote.TRIAGEM_CONCLUIDA);
    });

    it("deve permitir transição para desmonte após triagem realizada", async () => {
      const resEq = await app.inject({
        method: "GET",
        url: `/equipamentos/${equipamentoId}`,
        headers: { authorization: `Bearer ${tokenGestor}` }
      });
      const eq = JSON.parse(resEq.body);

      const res = await app.inject({
        method: "PATCH",
        url: `/equipamentos/${equipamentoId}/status`,
        headers: { authorization: `Bearer ${tokenGestor}` },
        payload: {
          versao: eq.versao,
          status: StatusRastreamento.AGUARDANDO_DESMONTE,
          origem: "Triagem Técnica",
          destino: "Setor de Desmonte de Placas"
        }
      });
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.status).toBe(StatusRastreamento.AGUARDANDO_DESMONTE);
    });

    it("deve bloquear degradação física severa (>= 2 níveis) SEM justificativa com HTTP 400", async () => {
      const resEq = await app.inject({
        method: "GET",
        url: `/equipamentos/${equipamentoId}`,
        headers: { authorization: `Bearer ${tokenGestor}` }
      });
      const eq = JSON.parse(resEq.body);

      const res = await app.inject({
        method: "PATCH",
        url: `/equipamentos/${equipamentoId}/estado-fisico`,
        headers: { authorization: `Bearer ${tokenGestor}` },
        payload: {
          versao: eq.versao,
          estadoFisico: EstadoFisico.DANIFICADO_GRAVE
        }
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).mensagem).toContain("justificativa");
    });

    it("deve permitir degradação física severa quando acompanhada de justificativa", async () => {
      const resEq = await app.inject({
        method: "GET",
        url: `/equipamentos/${equipamentoId}`,
        headers: { authorization: `Bearer ${tokenGestor}` }
      });
      const eq = JSON.parse(resEq.body);

      const res = await app.inject({
        method: "PATCH",
        url: `/equipamentos/${equipamentoId}/estado-fisico`,
        headers: { authorization: `Bearer ${tokenGestor}` },
        payload: {
          versao: eq.versao,
          estadoFisico: EstadoFisico.DANIFICADO_GRAVE,
          justificativa: "Placa-mãe trincada e carcaça rompida durante transporte"
        }
      });
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.estadoFisico).toBe(EstadoFisico.DANIFICADO_GRAVE);
    });

    it("deve calcular depreciação correta conforme estado físico", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/equipamentos/${equipamentoId}/depreciacao`,
        headers: { authorization: `Bearer ${tokenGestor}` }
      });
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.precificacaoOriginal).toBeGreaterThan(0);
      expect(data.descontoDepreciacao).toBeGreaterThan(0);
      expect(data.valorDepreciado).toBeLessThan(data.precificacaoOriginal);
    });
  });

  describe("6. Versionamento Otimista e Conflito de Concorrência (HTTP 409)", () => {
    it("deve lançar HTTP 409 caso a versão informada na atualização seja desatualizada", async () => {
      const resOrgs = await app.inject({
        method: "GET",
        url: "/organizacoes",
        headers: { authorization: `Bearer ${tokenOperador}` }
      });
      const org = JSON.parse(resOrgs.body)[0];

      const resConflito = await app.inject({
        method: "PUT",
        url: `/organizacoes/${org.id}`,
        headers: { authorization: `Bearer ${tokenOperador}` },
        payload: {
          versao: 9999,
          enderecoCompleto: "Tentativa com versao antiga"
        }
      });
      expect(resConflito.statusCode).toBe(409);
      expect(JSON.parse(resConflito.body).mensagem).toContain("Conflito de concorrência");
    });
  });

  describe("7. Relatórios, Rastreabilidade e Auditoria", () => {
    it("deve gerar relatório geral consolidado com sucesso", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/relatorios/geral",
        headers: { authorization: `Bearer ${tokenAuditor}` }
      });
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.totalOrganizacoes).toBeGreaterThan(0);
      expect(data.totalLotes).toBeGreaterThan(0);
      expect(data.totalEquipamentos).toBeGreaterThan(0);
      expect(data.pesoTotalProcessadoKg).toBeGreaterThan(0);
    });

    it("deve retornar rastreabilidade completa por código de barras interno", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/relatorios/rastreabilidade/GC-EQ-2026-0001",
        headers: { authorization: `Bearer ${tokenAuditor}` }
      });
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.equipamento.codigoBarrasInterno).toBe("GC-EQ-2026-0001");
      expect(data.historicoMovimentacoes.length).toBeGreaterThan(0);
      expect(data.loteOrigem).toBeDefined();
    });

    it("deve listar audit trail (Journal de Transações)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/relatorios/audit-trail",
        headers: { authorization: `Bearer ${tokenAuditor}` }
      });
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });
  });
});
