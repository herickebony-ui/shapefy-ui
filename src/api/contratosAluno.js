import client from './client'

const ENC_DOCTYPE = encodeURIComponent('Contrato Aluno')
const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

/**
 * Lista contratos do profissional. Filtros opcionais: aluno, modalidade, status_manual.
 */
export const listarContratos = async ({ search = '', page = 1, limit = 20, aluno = '', modalidade = '', statusManual = '' } = {}) => {
  const filtros = [['profissional', '=', profissionalLogado()]]
  if (aluno) filtros.push(['aluno', '=', aluno])
  if (modalidade) filtros.push(['modalidade', '=', modalidade])
  if (statusManual !== '') filtros.push(['status_manual', '=', statusManual])

  const params = {
    fields: JSON.stringify([
      'name', 'aluno', 'plano', 'nome_plano_snapshot', 'rotulo_variacao',
      'modalidade', 'metodo_pagamento', 'qtd_parcelas',
      'valor_liquido_total', 'data_inicio', 'data_fim',
      'data_pagamento_principal',
      'status_manual', 'renovacao_de', 'profissional',
    ]),
    filters: JSON.stringify(filtros),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'modified desc',
  }
  const res = await client.get(`/api/resource/${ENC_DOCTYPE}`, { params })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

/**
 * Busca contrato completo com parcelas (child table).
 */
export const buscarContrato = async (contratoId) => {
  const res = await client.get(`/api/resource/${ENC_DOCTYPE}/${encodeURIComponent(contratoId)}`)
  return res.data.data
}

/**
 * Cria contrato.
 *
 * Campos OBRIGATORIOS no `dados`:
 * - aluno, plano, variacao_duracao_meses, modalidade, metodo_pagamento,
 *   qtd_parcelas, valor_liquido_total, profissional
 * - PELO MENOS UM destes: data_inicio OU data_pagamento_principal
 *
 * Caminho A (parcelas customizadas):
 *   passe `parcelas` como array de objetos:
 *   [{ numero_parcela, data_vencimento, valor_parcela }]
 *   Backend valida soma == valor_liquido_total e respeita exato.
 *
 * Caminho B (defaults automaticos):
 *   omita `parcelas`. Backend gera baseado em data_inicio ou
 *   data_pagamento_principal.
 *
 * Pago e nao iniciado:
 *   passe data_pagamento_principal e DEIXE data_inicio/data_fim vazios.
 *   Status do aluno fica 'Pago_e_nao_iniciado'.
 */
export const criarContrato = async (dados) => {
  const payload = {
    profissional: profissionalLogado(),
    ...dados,
  }
  const res = await client.post('/api/method/shapefy.financeiro.api.criar_contrato', { dados: payload })
  return res.data.message
}

/**
 * Sugere parcelas pra preencher o modal antes de salvar.
 * Front chama isso quando o usuario digita qtd, valor total e dia de vencimento,
 * e usa o resultado pra preencher os inputs editaveis.
 *
 * @param {number} qtdParcelas
 * @param {number} valorTotal
 * @param {string} dataBase formato 'YYYY-MM-DD'
 * @param {number} diaVencimento (opcional, 1-31)
 * @returns {Promise<Array<{numero_parcela, data_vencimento, valor_parcela}>>}
 */
export const sugerirParcelas = async (qtdParcelas, valorTotal, dataBase, diaVencimento = null) => {
  const res = await client.post('/api/method/shapefy.financeiro.api.sugerir_parcelas', {
    qtd_parcelas: qtdParcelas,
    valor_total: valorTotal,
    data_base: dataBase,
    dia_vencimento: diaVencimento,
  })
  return res.data.message || []
}

/**
 * Marca uma parcela como paga.
 */
export const darBaixaParcela = async (contratoId, numeroParcela, dataPagamento = null) => {
  const res = await client.post('/api/method/shapefy.financeiro.api.dar_baixa_parcela', {
    contrato_id: contratoId,
    numero_parcela: numeroParcela,
    data_pagamento: dataPagamento,
  })
  return res.data.message
}

export const removerBaixaParcela = async (contratoId, numeroParcela) => {
  const res = await client.post('/api/method/shapefy.financeiro.api.remover_baixa_parcela', {
    contrato_id: contratoId,
    numero_parcela: numeroParcela,
  })
  return res.data.message
}

/**
 * Renova contrato com continuidade perfeita.
 * data_inicio nova = data_fim anterior + 1 dia
 * data_fim nova = data_fim anterior + duracao_meses do plano
 */
export const renovarContrato = async (contratoAnteriorId, dadosOpcionais = {}) => {
  const res = await client.post('/api/method/shapefy.financeiro.api.renovar_contrato', {
    contrato_anterior_id: contratoAnteriorId,
    dados_opcionais: dadosOpcionais,
  })
  return res.data.message
}

export const pausarContrato = async (contratoId) => {
  const res = await client.post('/api/method/shapefy.financeiro.api.pausar_contrato', { contrato_id: contratoId })
  return res.data.message
}

export const retomarContrato = async (contratoId) => {
  const res = await client.post('/api/method/shapefy.financeiro.api.retomar_contrato', { contrato_id: contratoId })
  return res.data.message
}

/**
 * Ativa contrato 'Pago e nao iniciado': preenche data_inicio,
 * calcula data_fim automaticamente (= data_inicio + variacao_duracao_meses),
 * atualiza espelho do Aluno e audita ATIVOU_CONTRATO.
 *
 * Use isso pra um botao dedicado "Ativar contrato" (Forma A na UI).
 * Alternativa: editar via salvarContrato preenchendo data_inicio (Forma B).
 */
export const ativarContrato = async (contratoId, dataInicio) => {
  const res = await client.post('/api/method/shapefy.financeiro.api.ativar_contrato', {
    contrato_id: contratoId,
    data_inicio: dataInicio,
  })
  return res.data.message
}

/**
 * Edita contrato. Parcelas NAO sao regeradas automaticamente.
 *
 * Pra ativar contrato 'Pago e nao iniciado' via edicao comum (Forma B),
 * preencha data_inicio e data_fim aqui. O front deve calcular data_fim
 * a partir de variacao_duracao_meses do plano.
 */
export const salvarContrato = async (contratoId, campos) => {
  const res = await client.put(`/api/resource/${ENC_DOCTYPE}/${encodeURIComponent(contratoId)}`, campos)
  return res.data.data
}

export const excluirContrato = async (contratoId) => {
  await client.delete(`/api/resource/${ENC_DOCTYPE}/${encodeURIComponent(contratoId)}`)
}

/**
 * Retorna status calculado do aluno.
 * @returns {Promise<{status: string, contrato_referencia: string|null, dias_atraso?: number}>}
 *   status: Pausado / Pago_e_nao_iniciado / Nao_renovou / Vencido / Ativo / Sem_plano
 */
export const obterStatusAluno = async (alunoId) => {
  const res = await client.post('/api/method/shapefy.financeiro.api.obter_status_calculado_aluno', {
    aluno_id: alunoId,
  })
  return res.data.message
}

/**
 * Sincroniza vinculos bidirecional. ids deve ser array de IDs de Aluno.
 * Valida que todos sao do mesmo profissional do alunoBase.
 */
export const sincronizarVinculos = async (alunoBaseId, idsVinculados = []) => {
  const res = await client.post('/api/method/shapefy.financeiro.api.sincronizar_vinculos', {
    aluno_base_id: alunoBaseId,
    ids_vinculados: idsVinculados,
  })
  return res.data.message
}
