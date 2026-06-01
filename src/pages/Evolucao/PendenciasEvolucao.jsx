import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Check, AlertTriangle } from 'lucide-react'
import ListPage from '../../components/templates/ListPage'
import { Button } from '../../components/ui'
import { listarPendenciasPeso, salvarRegistro } from '../../api/evolucao'
import useErrorModal from '../../hooks/useErrorModal'

const fmtData = (d) => {
  if (!d || d === 'None') return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}

function LinhaPendencia({ item, onResolvido, onErro }) {
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    const peso = parseFloat(String(valor).replace(',', '.'))
    if (!peso || peso < 20 || peso > 400) {
      onErro('Informe um peso válido em kg (entre 20 e 400).')
      return
    }
    setSalvando(true)
    try {
      await salvarRegistro(item.registro, { peso })
      onResolvido(item.registro)
    } catch (e) {
      onErro(e)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#29292e] border border-[#323238] rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{item.nome_completo || item.aluno}</p>
        <p className="text-gray-500 text-xs">{fmtData(item.data)}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-orange-300 font-bold">respondeu</span>
        <span className="text-amber-400 text-sm font-medium bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 max-w-[180px] truncate" title={item.valor_cru}>
          "{item.valor_cru}"
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="kg"
          className="w-24 h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60"
        />
        <Button variant="success" size="sm" icon={Check} loading={salvando} onClick={salvar}>
          Corrigir
        </Button>
      </div>
    </div>
  )
}

export default function PendenciasEvolucao() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const errorModal = useErrorModal()

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      setLista(await listarPendenciasPeso())
    } catch (e) {
      errorModal.show(e, 'Carregar pendências')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const resolvido = (registro) => setLista((p) => p.filter((x) => x.registro !== registro))
  const erro = (e) => (typeof e === 'string' ? errorModal.show({ message: e }, 'Pendência') : errorModal.show(e, 'Corrigir peso'))

  return (
    <ListPage
      title="Pendências de Peso"
      subtitle="Pesos de feedback que não deu pra interpretar — revise e corrija o valor em kg"
      actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />}
      loading={loading}
      empty={
        lista.length === 0 && !loading
          ? { title: 'Nenhuma pendência 🎉', description: 'Todos os pesos foram interpretados ou já corrigidos.' }
          : null
      }
    >
      {!loading && lista.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-amber-300 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-3">
            <AlertTriangle size={14} />
            <span>{lista.length} feedback(s) com peso não interpretado. O valor cru é o que o aluno digitou.</span>
          </div>
          <div className="space-y-2">
            {lista.map((item) => (
              <LinhaPendencia key={item.registro} item={item} onResolvido={resolvido} onErro={erro} />
            ))}
          </div>
        </>
      )}
      {errorModal.element}
    </ListPage>
  )
}
