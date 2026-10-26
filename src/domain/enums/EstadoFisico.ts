export enum EstadoFisico {
  NOVO = "NOVO",
  BOM_ESTADO = "BOM_ESTADO",
  USADO_LEVE = "USADO_LEVE",
  USADO_MODERADO = "USADO_MODERADO",
  DANIFICADO_LEVE = "DANIFICADO_LEVE",
  DANIFICADO_GRAVE = "DANIFICADO_GRAVE",
  INSERVIVEL = "INSERVIVEL"
}

export const ORDEM_ESTADO_FISICO: EstadoFisico[] = [
  EstadoFisico.NOVO,
  EstadoFisico.BOM_ESTADO,
  EstadoFisico.USADO_LEVE,
  EstadoFisico.USADO_MODERADO,
  EstadoFisico.DANIFICADO_LEVE,
  EstadoFisico.DANIFICADO_GRAVE,
  EstadoFisico.INSERVIVEL
];

export function calcularDiferencaEstadoFisico(anterior: EstadoFisico, novo: EstadoFisico): number {
  const indexAnterior = ORDEM_ESTADO_FISICO.indexOf(anterior);
  const indexNovo = ORDEM_ESTADO_FISICO.indexOf(novo);
  return indexNovo - indexAnterior;
}
