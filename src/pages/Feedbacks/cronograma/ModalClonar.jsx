import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Modal, Button, Input, Avatar, Spinner } from '../../../components/ui'
import { listarAlunos } from '../../../api/alunos'
import { listarContratos } from '../../../api/contratosAluno'
import { listarPlanos } from '../../../api/planosShapefy'
import { todayISO } from './utils'

/**
 * Modal de "Clonar Cronograma de Outro Aluno":
 *  - subtitle dinâmico explicando que as datas serão copiadas pro aluno
 *    atual e que a vigência do plano atual é mantida.
 *  - lista de alunos com Plano · Status do contrato (igual ao print do
 *    legacy que a Hérick mandou).
 *  - busca server-side via listarAlunos.search pra achar antigos.
 */
export default function ModalClonar({
  alunoIdAtual,
  nomeAlunoAtual,
  onSelecionar,
  onClose,
}) {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [loadingLista, setLoadingLista] = useState(true)
  const [contratosPorAluno, setContratosPorAluno] = useState({})
  const [planosByName, setPlanosByName] = useState({})

  // Carrega lista inicial (recentes) + contratos + planos
  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const [alunosRes, contratosRes, planosRes] = await Promise.all([
          listarAlunos({ limit: 30 }),
          listarContratos({ limit: 1000 }).catch(() => ({ list: [] })),
          listarPlanos({ limit: 100 }).catch(() => ({ list: [] })),
        ])
        if (cancel) return
        setResultados(alunosRes.list || [])
        const hojeISO = todayISO()
        const map = {}
        ;(contratosRes.list || []).forEach((c) => {
          if (!c.aluno || c.status_manual === 'Pausado') return
          const cur = map[c.aluno]
          const fim = (c.data_fim || '').slice(0, 10)
          const inicio = (c.data_inicio || '').slice(0, 10)
          const dp = (c.data_pagamento_principal || '').slice(0, 10)
          const ehVigente = inicio && fim && inicio <= hojeISO && hojeISO <= fim
          const ehPago = !inicio && !!dp
          const score = ehVigente ? 3 : ehPago ? 2 : 1
          const curScore = cur?._score || 0
          if (score > curScore || (score === curScore && fim > (cur?.data_fim || ''))) {
            map[c.aluno] = { ...c, _score: score }
          }
        })
        setContratosPorAluno(map)
        const pm = {}
        ;(planosRes.list || []).forEach(p => { pm[p.name] = p })
        setPlanosByName(pm)
      } catch (e) { console.error(e) }
      finally { if (!cancel) setLoadingLista(false) }
    })()
    return () => { cancel = true }
  }, [])

  // Busca server-side com debounce
  useEffect(() => {
    if (!busca || busca.length < 2) return
    let cancel = false
    setLoadingLista(true)
    const timer = setTimeout(async () => {
      try {
        const res = await listarAlunos({ search: busca, limit: 50 })
        if (!cancel) setResultados(res.list || [])
      } catch (e) { console.error(e) }
      finally { if (!cancel) setLoadingLista(false) }
    }, 250)
    return () => { cancel = true; clearTimeout(timer) }
  }, [busca])

  const lista = useMemo(() => {
    return (resultados || [])
      .filter(a => a.name !== alunoIdAtual)
      .map((a) => {
        const c = contratosPorAluno[a.name]
        const planoNome = c?.nome_plano_snapshot || planosByName[c?.plano]?.nome_do_plano || c?.plano || null
        const hojeISO = todayISO()
        let status = null
        if (c) {
          const ini = (c.data_inicio || '').slice(0, 10)
          const fim = (c.data_fim || '').slice(0, 10)
          if (ini && fim && ini <= hojeISO && hojeISO <= fim) status = 'Ativo'
          else if (!ini && c.data_pagamento_principal) status = 'Pago · não iniciado'
          else if (fim && fim < hojeISO) status = 'Expirado'
          else status = 'Cadastrado'
        }
        return { ...a, _planoNome: planoNome, _status: status }
      })
  }, [resultados, contratosPorAluno, planosByName, alunoIdAtual])

  return (
    <Modal isOpen onClose={onClose}
      title="Clonar Cronograma de Outro Aluno"
      size="md"
      footer={<Button variant="ghost" onClick={onClose}>Cancelar</Button>}>
      <div className="p-4 space-y-3">
        <p className="text-gray-400 text-xs leading-relaxed">
          As <span className="text-white font-bold">datas</span> serão copiadas para{' '}
          <span className="text-white font-bold">{nomeAlunoAtual || 'este aluno'}</span>.
          A vigência do plano atual é mantida.
        </p>
        <Input value={busca} onChange={setBusca}
          icon={Search} placeholder="Buscar aluno de origem..." />
        {loadingLista ? (
          <div className="py-6 flex justify-center"><Spinner /></div>
        ) : lista.length === 0 ? (
          <p className="text-gray-500 text-xs italic text-center py-6">
            {busca ? `Sem resultados para "${busca}".` : 'Nenhum aluno encontrado.'}
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto flex flex-col gap-1">
            {lista.map(a => (
              <li key={a.name}>
                <button onClick={() => onSelecionar(a.name)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#323238] hover:border-[#444] hover:bg-[#1f1f24] text-left transition-colors">
                  <Avatar nome={a.nome_completo} foto={a.foto} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">{a.nome_completo}</p>
                    <p className="text-gray-500 text-[11px] truncate">
                      {a._planoNome
                        ? `${a._planoNome}${a._status ? ` · ${a._status}` : ''}`
                        : <span className="italic">Sem contrato</span>}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
