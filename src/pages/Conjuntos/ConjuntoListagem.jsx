import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Edit, Trash2, Images, Star } from 'lucide-react'
import ListPage from '../../components/templates/ListPage'
import { Button, BotaoTutoriais } from '../../components/ui'
import { TUTORIAIS_CONJUNTOS_FOTOS } from '../../data/tutoriais'
import { listarConjuntos, excluirConjunto, conjuntoPadraoAtual, definirConjuntoPadrao } from '../../api/conjuntos'
import useErrorModal from '../../hooks/useErrorModal'

export default function ConjuntoListagem() {
  const navigate = useNavigate()
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [padrao, setPadrao] = useState(null)
  const errorModal = useErrorModal()

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ list }, pad] = await Promise.all([listarConjuntos({ busca }), conjuntoPadraoAtual()])
      setLista(list)
      setPadrao(pad)
    } catch (e) {
      errorModal.show(e, 'Carregar conjuntos')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])

  const togglePadrao = async (name) => {
    try {
      const novo = await definirConjuntoPadrao(name === padrao ? null : name)
      setPadrao(novo)
    } catch (e) {
      errorModal.show(e, 'Definir padrão')
    }
  }

  useEffect(() => {
    const t = setTimeout(carregar, 300)
    return () => clearTimeout(t)
  }, [carregar])

  const handleExcluir = async (name) => {
    if (!window.confirm('Excluir este conjunto de fotos?')) return
    try {
      await excluirConjunto(name)
      const { list } = await listarConjuntos({ busca })
      setLista(list)
    } catch (e) {
      errorModal.show(e, 'Excluir conjunto')
    }
  }

  return (
    <ListPage
      title="Conjuntos de Fotos"
      subtitle="Templates de ângulos de foto reutilizáveis nos feedbacks"
      actions={
        <>
          <BotaoTutoriais videos={TUTORIAIS_CONJUNTOS_FOTOS} />
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/conjuntos-fotos/novo')}>
            Novo Conjunto
          </Button>
        </>
      }
      filters={[{ type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar conjunto...' }]}
      loading={loading}
      empty={
        lista.length === 0 && !loading
          ? { title: 'Nenhum conjunto de fotos', description: 'Crie um conjunto pra padronizar os ângulos das fotos no feedback.' }
          : null
      }
    >
      {!loading && lista.length > 0 && (
        <div className="space-y-2">
          {lista.map((c) => (
            <div
              key={c.name}
              onClick={() => navigate(`/conjuntos-fotos/${c.name}`)}
              className="flex items-center gap-3 bg-[#29292e] border border-[#323238] rounded-xl px-4 py-3 cursor-pointer hover:border-[#2563eb]/50 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-[#2563eb]/10 border border-[#2563eb]/30 flex items-center justify-center shrink-0">
                <Images size={16} className="text-[#60A5FA]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate flex items-center gap-2">
                  {c.titulo}
                  {c.name === padrao && (
                    <span className="text-[9px] uppercase tracking-wider text-yellow-400 border border-yellow-400/40 rounded px-1.5 py-0.5 shrink-0">Padrão</span>
                  )}
                </p>
                <p className={`text-xs ${c.enabled ? 'text-green-400' : 'text-gray-500'}`}>{c.enabled ? 'Ativo' : 'Inativo'}</p>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => togglePadrao(c.name)}
                  title={c.name === padrao ? 'Remover como padrão' : 'Definir como padrão (usado nos feedbacks)'}
                  className={`h-7 w-7 flex items-center justify-center border rounded-lg transition-colors ${c.name === padrao ? 'text-yellow-400 border-yellow-400/40 hover:bg-yellow-600 hover:text-white' : 'text-gray-400 border-[#323238] hover:border-yellow-400/50 hover:text-yellow-400'}`}
                >
                  <Star size={12} fill={c.name === padrao ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => navigate(`/conjuntos-fotos/${c.name}`)}
                  title="Editar"
                  className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={() => handleExcluir(c.name)}
                  title="Excluir"
                  className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {errorModal.element}
    </ListPage>
  )
}
