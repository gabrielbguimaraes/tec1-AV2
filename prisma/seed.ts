import { prisma, checkDatabaseConnection } from "../src/config/prisma";
import { Credencial } from "../src/domain/entities/Credencial";
import { PapelUsuario } from "../src/domain/enums/PapelUsuario";
import { StatusLote } from "../src/domain/enums/StatusLote";
import { TipoEquipamento } from "../src/domain/enums/TipoEquipamento";
import { EstadoFisico } from "../src/domain/enums/EstadoFisico";
import { StatusRastreamento } from "../src/domain/enums/StatusRastreamento";
import { memDb } from "../src/repositories/inMemoryDb";

export async function executarSeed() {
  const hashAdmin = await Credencial.gerarHash("admin123");
  const hashOperador = await Credencial.gerarHash("operador123");
  const hashGestor = await Credencial.gerarHash("gestor123");
  const hashAuditor = await Credencial.gerarHash("auditor123");

  const usuariosSeed = [
    { usuario: "admin", hashSenha: hashAdmin, papel: PapelUsuario.ADMINISTRADOR },
    { usuario: "operador", hashSenha: hashOperador, papel: PapelUsuario.OPERADOR_CADASTRO },
    { usuario: "gestor", hashSenha: hashGestor, papel: PapelUsuario.GESTOR_ALMOXARIFADO },
    { usuario: "auditor", hashSenha: hashAuditor, papel: PapelUsuario.AUDITOR }
  ];

  const cnpjValido1 = "04252011000110";
  const cnpjValido2 = "11222333000181";

  const agora = new Date();
  const dezDiasAtras = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const vinteDiasAtras = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  const dataFimContrato = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const dbOnline = await checkDatabaseConnection();

  if (dbOnline) {
    for (const u of usuariosSeed) {
      await prisma.credencial.upsert({
        where: { usuario: u.usuario },
        update: { hashSenha: u.hashSenha, papel: u.papel, ativo: true },
        create: { usuario: u.usuario, hashSenha: u.hashSenha, papel: u.papel, ativo: true }
      });
    }

    const org1 = await prisma.organizacao.upsert({
      where: { cnpj: cnpjValido1 },
      update: { razaoSocial: "TechRecycle Logística Ambiental S.A." },
      create: {
        razaoSocial: "TechRecycle Logística Ambiental S.A.",
        cnpj: cnpjValido1,
        inscricaoEstadual: "123.456.789.000",
        enderecoCompleto: "Av. das Indústrias Sustentáveis, 1000, Polo Verde",
        telefone: "(11) 3200-1000",
        email: "contato@techrecycle.com.br",
        versao: 1
      }
    });

    await prisma.contrato.upsert({
      where: { organizacaoId: org1.id },
      update: { valorTotal: 150000.0 },
      create: {
        organizacaoId: org1.id,
        dataInicio: vinteDiasAtras,
        dataVencimento: dataFimContrato,
        valorTotal: 150000.0,
        renovacaoAutomatica: true,
        versao: 1
      }
    });

    const org2 = await prisma.organizacao.upsert({
      where: { cnpj: cnpjValido2 },
      update: { razaoSocial: "Inova Eletrônicos Circulares Ltda." },
      create: {
        razaoSocial: "Inova Eletrônicos Circulares Ltda.",
        cnpj: cnpjValido2,
        inscricaoEstadual: "987.654.321.000",
        enderecoCompleto: "Rua do Ecoparque Tecnológico, 500, Bloco C",
        telefone: "(21) 2400-2000",
        email: "logistica@inovaeletronicos.com.br",
        versao: 1
      }
    });

    const lote1 = await prisma.lote.upsert({
      where: { numeroLote: "LOTE-2026-001" },
      update: { statusProcessamento: StatusLote.RECEBIDO },
      create: {
        numeroLote: "LOTE-2026-001",
        organizacaoId: org1.id,
        dataEntrada: dezDiasAtras,
        transportadora: "Transportes EcoRápido",
        statusProcessamento: StatusLote.RECEBIDO,
        observacoes: "Lote inaugural de servidores e notebooks corporativos",
        versao: 1
      }
    });

    const lote2 = await prisma.lote.upsert({
      where: { numeroLote: "LOTE-2026-002" },
      update: { statusProcessamento: StatusLote.TRIAGEM_CONCLUIDA },
      create: {
        numeroLote: "LOTE-2026-002",
        organizacaoId: org2.id,
        dataEntrada: vinteDiasAtras,
        transportadora: "Logística Express Verde",
        statusProcessamento: StatusLote.TRIAGEM_CONCLUIDA,
        observacoes: "Lote de triagem com monitores e fontes",
        versao: 1
      }
    });

    const eq1 = await prisma.equipamento.upsert({
      where: { codigoBarrasInterno: "GC-EQ-2026-0001" },
      update: {},
      create: {
        loteId: lote1.id,
        codigoBarrasInterno: "GC-EQ-2026-0001",
        tipo: TipoEquipamento.SERVIDOR,
        marca: "Dell",
        modelo: "PowerEdge R740",
        pesoKg: 18.5,
        estadoFisico: EstadoFisico.BOM_ESTADO,
        precificacaoEstimada: 4500.0,
        status: StatusRastreamento.AGUARDANDO_TRIAGEM,
        versao: 1
      }
    });

    const eq2 = await prisma.equipamento.upsert({
      where: { codigoBarrasInterno: "GC-EQ-2026-0002" },
      update: {},
      create: {
        loteId: lote2.id,
        codigoBarrasInterno: "GC-EQ-2026-0002",
        tipo: TipoEquipamento.NOTEBOOK,
        marca: "Lenovo",
        modelo: "ThinkPad T480",
        pesoKg: 1.6,
        estadoFisico: EstadoFisico.DESGASTADO,
        precificacaoEstimada: 1200.0,
        status: StatusRastreamento.EM_TRIAGEM,
        versao: 1
      }
    });

    await prisma.movimentacao.createMany({
      data: [
        {
          equipamentoId: eq1.id,
          origem: "Entrada Docas",
          destino: "Almoxarifado A-01",
          responsavel: "gestor",
          observacoes: "Carga recebida sem avarias externas visíveis."
        },
        {
          equipamentoId: eq2.id,
          origem: "Almoxarifado A-02",
          destino: "Bancada Triagem Técnica 03",
          responsavel: "gestor",
          observacoes: "Início do diagnóstico de baterias e periféricos."
        }
      ],
      skipDuplicates: true
    });

    await prisma.journalTransacao.create({
      data: {
        operacao: "SEED_INICIAL",
        entidade: "Sistema",
        operador: "sistema_seed",
        dadosDepois: { status: "Seed populado com sucesso no PostgreSQL" }
      }
    });
    return;
  }

  memDb.limpar();

  for (const u of usuariosSeed) {
    memDb.credenciais.push({
      id: memDb.gerarId(),
      usuario: u.usuario,
      hashSenha: u.hashSenha,
      salt: null,
      papel: u.papel,
      ativo: true,
      ultimoAcesso: null,
      criadoEm: agora,
      atualizadoEm: agora
    });
  }

  const orgId1 = memDb.gerarId();
  const org1 = {
    id: orgId1,
    razaoSocial: "TechRecycle Logística Ambiental S.A.",
    cnpj: cnpjValido1,
    inscricaoEstadual: "123.456.789.000",
    enderecoCompleto: "Av. das Indústrias Sustentáveis, 1000, Polo Verde",
    telefone: "(11) 3200-1000",
    email: "contato@techrecycle.com.br",
    ativo: true,
    versao: 1,
    criadoEm: agora,
    atualizadoEm: agora
  };
  memDb.organizacoes.push(org1);

  memDb.contratos.push({
    id: memDb.gerarId(),
    organizacaoId: orgId1,
    dataInicio: vinteDiasAtras,
    dataVencimento: dataFimContrato,
    valorTotal: 150000.0,
    renovacaoAutomatica: true,
    versao: 1,
    criadoEm: agora,
    atualizadoEm: agora
  });

  const orgId2 = memDb.gerarId();
  memDb.organizacoes.push({
    id: orgId2,
    razaoSocial: "Inova Eletrônicos Circulares Ltda.",
    cnpj: cnpjValido2,
    inscricaoEstadual: "987.654.321.000",
    enderecoCompleto: "Rua do Ecoparque Tecnológico, 500, Bloco C",
    telefone: "(21) 2400-2000",
    email: "logistica@inovaeletronicos.com.br",
    ativo: true,
    versao: 1,
    criadoEm: agora,
    atualizadoEm: agora
  });

  const loteId1 = memDb.gerarId();
  memDb.lotes.push({
    id: loteId1,
    numeroLote: "LOTE-2026-001",
    organizacaoId: orgId1,
    dataEntrada: dezDiasAtras,
    transportadora: "Transportes EcoRápido",
    statusProcessamento: StatusLote.RECEBIDO,
    observacoes: "Lote inaugural de servidores e notebooks corporativos",
    versao: 1,
    criadoEm: agora,
    atualizadoEm: agora
  });

  const loteId2 = memDb.gerarId();
  memDb.lotes.push({
    id: loteId2,
    numeroLote: "LOTE-2026-002",
    organizacaoId: orgId2,
    dataEntrada: vinteDiasAtras,
    transportadora: "Logística Express Verde",
    statusProcessamento: StatusLote.TRIAGEM_CONCLUIDA,
    observacoes: "Lote de triagem com monitores e fontes",
    versao: 1,
    criadoEm: agora,
    atualizadoEm: agora
  });

  const eqId1 = memDb.gerarId();
  memDb.equipamentos.push({
    id: eqId1,
    loteId: loteId1,
    codigoBarrasInterno: "GC-EQ-2026-0001",
    tipo: TipoEquipamento.SERVIDOR,
    marca: "Dell",
    modelo: "PowerEdge R740",
    pesoKg: 18.5,
    estadoFisico: EstadoFisico.BOM_ESTADO,
    precificacaoEstimada: 4500.0,
    status: StatusRastreamento.AGUARDANDO_TRIAGEM,
    versao: 1,
    criadoEm: agora,
    atualizadoEm: agora
  });

  const eqId2 = memDb.gerarId();
  memDb.equipamentos.push({
    id: eqId2,
    loteId: loteId2,
    codigoBarrasInterno: "GC-EQ-2026-0002",
    tipo: TipoEquipamento.NOTEBOOK,
    marca: "Lenovo",
    modelo: "ThinkPad T480",
    pesoKg: 1.6,
    estadoFisico: EstadoFisico.DESGASTADO,
    precificacaoEstimada: 1200.0,
    status: StatusRastreamento.EM_TRIAGEM,
    versao: 1,
    criadoEm: agora,
    atualizadoEm: agora
  });

  memDb.movimentacoes.push(
    {
      id: memDb.gerarId(),
      equipamentoId: eqId1,
      dataHora: agora,
      origem: "Entrada Docas",
      destino: "Almoxarifado A-01",
      responsavel: "gestor",
      observacoes: "Carga recebida sem avarias externas visíveis."
    },
    {
      id: memDb.gerarId(),
      equipamentoId: eqId2,
      dataHora: agora,
      origem: "Almoxarifado A-02",
      destino: "Bancada Triagem Técnica 03",
      responsavel: "gestor",
      observacoes: "Início do diagnóstico de baterias e periféricos."
    }
  );

  memDb.journals.push({
    id: memDb.gerarId(),
    timestamp: agora,
    operacao: "SEED_INICIAL",
    entidade: "Sistema",
    operador: "sistema_seed",
    dadosAntes: null,
    dadosDepois: { status: "Seed populado em memória" },
    ipOrigem: null,
    sucesso: true
  });
}

if (require.main === module) {
  executarSeed()
    .then(() => {
      console.log("Seed executado com sucesso!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Erro ao executar seed:", err);
      process.exit(1);
    });
}
