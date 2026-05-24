import client from './client'

// Lista as fichas de treino ativas do aluno logado.
// Retorna { fichas: [{name, nome_completo, data_de_inicio, data_de_fim,
// objetivo, aluno, nivel, numero_do_treino_para_aquele_aluno, dias_info}] }
// Backend pode retornar 403 (PermissionError) se aluno nao tem modulo treino.
export const listarTreinos = async () => {
  const res = await client.get('/api/method/shapefy.api.aluno.treino_lista')
  return res.data?.message?.fichas || []
}

// Detalhe de uma ficha: ficha, dias_da_semana, treino_do_dia, ultimo_treino,
// periodizacao (com flag atual), execucoes_por_treino, labels, orientacoes,
// treinos_disponiveis. Usado na tela intermediaria antes de iniciar o treino.
export const buscarFichaTreino = async (name) => {
  const res = await client.get('/api/method/shapefy.api.aluno.treino_ficha', {
    params: { name },
  })
  return res.data?.message || null
}

// Detalhe de um treino especifico (Treino A..F): ficha resumida, treino_label,
// orientacoes, alongamentos, exercicios (simples ou combinado), historico_series.
// Usado na tela de execucao.
export const buscarTreinoDetalhe = async (ficha, treino) => {
  const res = await client.get('/api/method/shapefy.api.aluno.treino_detalhe', {
    params: { ficha, treino },
  })
  return res.data?.message || null
}

// Verifica se o aluno ja registrou esse treino hoje. Usado pra impedir
// duplicacao quando ele recarrega a tela apos finalizar.
// Retorna { finalizado: boolean, name?: string }
export const verificarTreinoFinalizado = async (ficha, treino) => {
  const res = await client.get('/api/method/shapefy.api.aluno.treino_verificar_finalizado', {
    params: { ficha, treino },
  })
  return res.data?.message || { finalizado: false }
}

// Finaliza o treino e persiste no backend (cria Treino Realizado).
// Payload:
//   ficha, treino, inicio_ms, fim_ms, exercicios (objeto JSON serializado),
//   intensidade ('Muito leve' | 'Leve' | 'Moderado' | 'Intenso' |
//                'Muito intenso' | 'Exaustivo'), feedback (string opcional).
// Retorna { name, tempo_total, treino_label }
export const finalizarTreino = async ({ ficha, treino, inicio_ms, fim_ms, exercicios, intensidade, feedback }) => {
  const res = await client.post('/api/method/shapefy.api.aluno.treino_finalizar', {
    ficha,
    treino,
    inicio_ms,
    fim_ms,
    exercicios: typeof exercicios === 'string' ? exercicios : JSON.stringify(exercicios),
    intensidade,
    feedback: feedback || '',
  })
  return res.data?.message || null
}
