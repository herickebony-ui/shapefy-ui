/**
 * excluirEmLote — exclui vários itens chamando `excluirFn(id)` em chunks
 * (Promise.allSettled), pra não estourar o rate limit do Frappe. Não aborta no
 * primeiro erro: tenta todos e devolve o resumo.
 *
 * @param {(id:string)=>Promise} excluirFn  função de exclusão individual (ex: excluirAlimento)
 * @param {string[]} ids                     ids a excluir
 * @param {{chunk?:number}} [opts]
 * @returns {Promise<{ok:number, fail:number, erros:{id:string, erro:any}[]}>}
 */
export async function excluirEmLote(excluirFn, ids, { chunk = 5 } = {}) {
  let ok = 0
  const erros = []
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk)
    const resultados = await Promise.allSettled(slice.map((id) => excluirFn(id)))
    resultados.forEach((r, j) => {
      if (r.status === 'fulfilled') ok += 1
      else erros.push({ id: slice[j], erro: r.reason })
    })
  }
  return { ok, fail: erros.length, erros }
}
