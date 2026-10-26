import { randomUUID } from "crypto";
import { PapelUsuario } from "../domain/enums/PapelUsuario";
import { StatusLote } from "../domain/enums/StatusLote";
import { TipoEquipamento } from "../domain/enums/TipoEquipamento";
import { EstadoFisico } from "../domain/enums/EstadoFisico";
import { StatusRastreamento } from "../domain/enums/StatusRastreamento";

export interface MemCredencial {
  id: string;
  usuario: string;
  hashSenha: string;
  salt: string | null;
  papel: PapelUsuario;
  ultimoAcesso: Date | null;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface MemContrato {
  id: string;
  organizacaoId: string;
  dataInicio: Date;
  dataVencimento: Date;
  valorTotal: number;
  renovacaoAutomatica: boolean;
  clausulas: string[] | unknown;
  versao: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface MemOrganizacao {
  id: string;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  enderecoCompleto: string;
  telefone: string;
  email: string;
  ativo: boolean;
  versao: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface MemLote {
  id: string;
  numeroLote: string;
  notaFiscal: string;
  organizacaoId: string;
  dataEntrada: Date;
  transportadora: string;
  statusProcessamento: StatusLote;
  observacoes: string | null;
  versao: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface MemEquipamento {
  id: string;
  codigoBarrasInterno: string;
  tipo: TipoEquipamento;
  marca: string;
  modelo: string;
  pesoKg: number;
  estadoFisico: EstadoFisico;
  precificacaoEstimada: number;
  status: StatusRastreamento;
  anoFabricacao: number;
  posicaoNoLote: number;
  loteId: string;
  versao: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface MemMovimentacao {
  id: string;
  equipamentoId: string;
  dataHora: Date;
  origem: string;
  destino: string;
  responsavel: string;
  observacoes: string | null;
}

export interface MemJournal {
  id: string;
  timestamp: Date;
  operacao: string;
  entidade: string;
  dadosAntes: unknown;
  dadosDepois: unknown;
  operador: string;
  ipOrigem: string | null;
  sucesso: boolean;
}

class InMemoryDatabase {
  credenciais: MemCredencial[] = [];
  organizacoes: MemOrganizacao[] = [];
  contratos: MemContrato[] = [];
  lotes: MemLote[] = [];
  equipamentos: MemEquipamento[] = [];
  movimentacoes: MemMovimentacao[] = [];
  journals: MemJournal[] = [];

  limpar(): void {
    this.credenciais = [];
    this.organizacoes = [];
    this.contratos = [];
    this.lotes = [];
    this.equipamentos = [];
    this.movimentacoes = [];
    this.journals = [];
  }

  gerarId(): string {
    return randomUUID();
  }
}

export const memDb = new InMemoryDatabase();
