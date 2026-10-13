// Portuguese labels for fiscal parameter fields and known codes (presentation only).
export const camposParametro: { key: string; label: string; tipo?: 'bool' }[] = [
  { key: 'nome', label: 'Nome do parâmetro' },
  { key: 'c_trib_nac', label: 'Código de Tributação Nacional' },
  { key: 'c_trib_mun', label: 'Código de Tributação Municipal' },
  { key: 'nbs', label: 'NBS (Nomenclatura Brasileira de Serviços)' },
  { key: 'nbs_descricao', label: 'Descrição da NBS' },
  { key: 'c_ind_op', label: 'Indicador da operação (IBS/CBS)' },
  { key: 'municipio_incidencia_ibge', label: 'Município de incidência (IBGE)' },
  { key: 'trib_issqn', label: 'Tributação do ISSQN' },
  { key: 'regime_especial', label: 'Regime especial de tributação' },
  { key: 'exigibilidade_suspensa', label: 'Exigibilidade suspensa', tipo: 'bool' },
  { key: 'iss_retido', label: 'ISS retido pelo tomador', tipo: 'bool' },
  { key: 'beneficio_municipal', label: 'Benefício municipal', tipo: 'bool' },
  { key: 'pis_cofins_cst', label: 'CST de PIS/COFINS' },
  { key: 'pis_cofins_csll_retencao', label: 'Retenção de PIS/COFINS/CSLL' },
  { key: 'ibscbs_cst', label: 'CST do IBS/CBS' },
  { key: 'ibscbs_class_trib', label: 'Classificação tributária do IBS/CBS' },
  { key: 'valor_aprox_tributos_modo', label: 'Valor aproximado dos tributos' },
];
const codigos: Record<string, Record<string, string>> = {
  c_trib_nac: { '04.03.03': 'Clínicas, sanatórios, manicômios, casas de saúde, prontos-socorros, ambulatórios e congêneres' },
  c_trib_mun: { '04.03.03.001': 'Clínicas e congêneres — Belo Horizonte' },
  municipio_incidencia_ibge: { '3106200': 'Belo Horizonte/MG' },
  trib_issqn: { operacao_tributavel: 'Operação tributável', imunidade: 'Imunidade', exportacao: 'Exportação de serviço', nao_incidencia: 'Não incidência' },
  regime_especial: { nenhum: 'Nenhum' },
  pis_cofins_cst: { '00': 'Nenhum (Simples Nacional)' },
  pis_cofins_csll_retencao: { '0': 'Sem retenção' },
  ibscbs_cst: { '410': 'Imunidade e não incidência' },
  ibscbs_class_trib: { '410999': 'Operações não onerosas sem previsão de tributação' },
  c_ind_op: { '050103': 'Serviço prestado fisicamente sobre bem móvel material — endereço do destinatário' },
  valor_aprox_tributos_modo: { aliquota_simples: 'Pela alíquota do Simples do mês' },
};
export const rotuloCodigo = (campo: string, valor: unknown) => (typeof valor === 'string' ? codigos[campo]?.[valor] : undefined);
export const regimes: Record<string, string> = { simples_me_epp: 'Simples Nacional — ME/EPP', mei: 'MEI', lucro_presumido: 'Lucro presumido', lucro_real: 'Lucro real' };
