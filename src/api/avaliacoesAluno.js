import client from './client'

// API de Avaliações da Composição Corporal — área do ALUNO (X-Aluno-Token).
// O backend já entrega tudo calculado e formatado em pt-BR (campos *_fmt).
// Nunca calcular nada no front — só consumir.

// Lista as avaliações do aluno logado (mais recente → mais antiga).
// Backend: { avaliacoes: [{ name, date, weight, weight_fmt, fat_*, bmi*, front_photo_url }], total }
export const listarAvaliacoesAluno = async () => {
  const res = await client.get('/api/method/shapefy.api.aluno.avaliacao_lista')
  return res.data?.message?.avaliacoes || []
}

// Detalhe de uma avaliação: { avaliacao: {...campos..., fotos:[]}, indicadores_saude: [] }
export const buscarAvaliacaoAluno = async (name) => {
  const res = await client.get('/api/method/shapefy.api.aluno.avaliacao_detalhe', {
    params: { name },
  })
  return res.data?.message || null
}

// Compara 1 a 3 avaliações. O backend valida que pertencem ao aluno e ordena por data.
// Retorna hero_kpis, evolucao_matrix, health_indicators, weight_sparkline,
// photo_matrix, measure_tables e charts (formato {labels, datasets}).
export const compararAvaliacoesAluno = async (names) => {
  const res = await client.get('/api/method/shapefy.api.aluno.avaliacao_comparar', {
    params: { names: Array.isArray(names) ? names.join(',') : names },
  })
  return res.data?.message || null
}
