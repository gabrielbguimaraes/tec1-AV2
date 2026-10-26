export enum EstadoFisico {
  NOVO = "NOVO",
  BOM_ESTADO = "BOM_ESTADO",
  DESGASTADO = "DESGASTADO",
  ESTADO_RUIM = "ESTADO_RUIM",
  DANIFICADO_LEVE = "DANIFICADO_LEVE",
  DANIFICADO_GRAVE = "DANIFICADO_GRAVE",
  SUCATA_DEFINITIVA = "SUCATA_DEFINITIVA"
}

export const ORDEM_ESTADO_FISICO: EstadoFisico[] = [
  EstadoFisico.NOVO,
  EstadoFisico.BOM_ESTADO,
  EstadoFisico.DESGASTADO,
  EstadoFisico.ESTADO_RUIM,
  EstadoFisico.DANIFICADO_LEVE,
  EstadoFisico.DANIFICADO_GRAVE,
  EstadoFisico.SUCATA_DEFINITIVA
];

export function calcularDiferencaEstadoFisico(anterior: EstadoFisico, novo: EstadoFisico): number {
  const indexAnterior = ORDEM_ESTADO_FISICO.indexOf(anterior);
  const indexNovo = ORDEM_ESTADO_FISICO.indexOf(novo);
  return indexNovo - indexAnterior;
}
