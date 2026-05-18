import client from './client'

// Catálogo de DocTypes que referenciam o Aluno via campo `aluno`.
//
// `excluivel` separa o que o profissional PODE apagar (documentos clínicos
// que ele mesmo cria) do histórico PROTEGIDO (treinos realizados, feedbacks,
// contratos, notificações — tudo que tem valor de prova e/ou é gerado pelo
// próprio aluno via app). Quando há QUALQUER vínculo protegido, a UI só
// oferece desativar (enabled=0) ao invés de excluir.
//
// `order` controla a ordem de exclusão em cascata (filhos primeiro).
const CATEGORIAS = [
  // Protegidos — só desativar (histórico legal/comercial)
  { key: 'notificacoes',         label: 'Notificações',               doctype: 'Notificacao Aluno',                  order: 1, excluivel: false },
  { key: 'feedbacksAgendados',   label: 'Feedbacks agendados',        doctype: 'Feedback Agendado',                  order: 1, excluivel: false },
  { key: 'feedbacks',            label: 'Feedbacks respondidos',      doctype: 'Feedback',                           order: 2, excluivel: false },
  { key: 'avaliacoes',           label: 'Avaliações corporais',       doctype: 'Avaliacao da Composicao Corporal',   order: 2, excluivel: false },
  { key: 'prescricoes',          label: 'Prescrições',                doctype: 'Prescricao Paciente',                order: 2, excluivel: false },
  { key: 'contratos',            label: 'Contratos',                  doctype: 'Contrato Aluno',                     order: 3, excluivel: false },
  // Excluíveis pelo profissional (clínicos/operacionais)
  { key: 'treinosRealizados',    label: 'Treinos realizados',         doctype: 'Treino Realizado',                   order: 1, excluivel: true,  sensivel: true },
  { key: 'aerobicosRealizados',  label: 'Aeróbicos realizados',       doctype: 'Aerobico Realizado',                 order: 1, excluivel: true,  sensivel: true },
  { key: 'anamneses',            label: 'Anamneses',                  doctype: 'Anamnese',                           order: 2, excluivel: true },
  { key: 'dietas',               label: 'Dietas',                     doctype: 'Dieta',                              order: 4, excluivel: true },
  { key: 'fichas',               label: 'Fichas de treino',           doctype: 'Ficha',                              order: 4, excluivel: true },
]

const enc = (s) => encodeURIComponent(s)

const listarNames = async (doctype, alunoId, limite = 500) => {
  const res = await client.get(`/api/resource/${enc(doctype)}`, {
    params: {
      fields: JSON.stringify(['name']),
      filters: JSON.stringify([['aluno', '=', alunoId]]),
      limit: limite,
      limit_start: 0,
    },
  })
  return (res.data?.data || []).map(r => r.name)
}

// Lista todos os vínculos do aluno em paralelo.
// Retorna:
//   { categorias: [{key,label,doctype,items[],total,excluivel}],
//     total, totalProtegidos, totalExcluiveis, temProtegidos, podeExcluir }
// `podeExcluir = true` quando o aluno só tem vínculos excluíveis (ou nenhum).
export const listarVinculosAluno = async (alunoId) => {
  if (!alunoId) {
    return { categorias: [], total: 0, totalProtegidos: 0, totalExcluiveis: 0, temProtegidos: false, podeExcluir: true }
  }
  const resultados = await Promise.all(
    CATEGORIAS.map(async (cat) => {
      try {
        const items = await listarNames(cat.doctype, alunoId)
        return { ...cat, items, total: items.length }
      } catch (e) {
        return { ...cat, items: [], total: 0, error: e?.response?.status || 'erro' }
      }
    })
  )
  const totalProtegidos = resultados.filter(c => !c.excluivel).reduce((a, c) => a + c.total, 0)
  const totalExcluiveis = resultados.filter(c => c.excluivel).reduce((a, c) => a + c.total, 0)
  return {
    categorias: resultados,
    total: totalProtegidos + totalExcluiveis,
    totalProtegidos,
    totalExcluiveis,
    temProtegidos: totalProtegidos > 0,
    podeExcluir: totalProtegidos === 0,
  }
}

const extrairMensagemErro = (e) => {
  const exc = e?.response?.data?.exception || ''
  const limpo = exc.replace(/^[\w.]+:\s*/, '').trim()
  return limpo || e?.message || 'erro desconhecido'
}

// Exclui em cascata apenas os vínculos EXCLUÍVEIS (Dieta, Ficha, Anamnese).
// Recusa-se a rodar se houver qualquer vínculo protegido — UI já bloqueia
// nesse caso, mas dupla checagem aqui evita exclusão acidental.
// Retorna { ok, falhas: [{doctype,label,name,erro}], total }.
export const excluirVinculosExcluiveis = async (alunoId, onProgress) => {
  const { categorias, temProtegidos, totalExcluiveis } = await listarVinculosAluno(alunoId)
  if (temProtegidos) {
    return { ok: false, falhas: [], total: 0, bloqueado: true }
  }

  const falhas = []
  let done = 0
  const niveis = [...new Set(categorias.filter(c => c.excluivel).map(c => c.order))].sort((a, b) => a - b)

  for (const nivel of niveis) {
    const cats = categorias.filter(c => c.excluivel && c.order === nivel && c.items.length > 0)
    const tarefas = cats.flatMap(cat =>
      cat.items.map(nome => async () => {
        try {
          await client.delete(`/api/resource/${enc(cat.doctype)}/${encodeURIComponent(nome)}`)
        } catch (e) {
          console.error(`[cascade] delete falhou ${cat.doctype}/${nome}`, e?.response?.data || e)
          falhas.push({ doctype: cat.doctype, label: cat.label, name: nome, erro: extrairMensagemErro(e) })
        }
        done += 1
        onProgress?.({ done, total: totalExcluiveis, current: { doctype: cat.doctype, label: cat.label, name: nome } })
      })
    )
    await runPool(tarefas, 5)
  }

  return { ok: falhas.length === 0, falhas, total: totalExcluiveis }
}

const runPool = async (tarefas, concorrencia) => {
  const fila = [...tarefas]
  const workers = Array.from({ length: Math.min(concorrencia, fila.length) }, async () => {
    while (fila.length) {
      const t = fila.shift()
      if (t) await t()
    }
  })
  await Promise.all(workers)
}
