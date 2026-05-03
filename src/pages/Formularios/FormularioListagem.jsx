import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Trash2, Edit } from 'lucide-react'
import {
  listarFormulariosAnamnese, excluirFormularioAnamnese,
  listarFormulariosFeedback, excluirFormularioFeedback,
} from '../../api/formularios'
import { Button, Badge, Tabs, EmptyState } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'

const TABS = [
  { id: 'anamnese', label: 'Anamnese' },
  { id: 'feedback', label: 'Feedback' },
]

const TITULOS = {
  anamnese: { title: 'Formulários de Anamnese', subtitle: 'Templates de anamnese para enviar aos alunos' },
  feedback: { title: 'Formulários de Feedback', subtitle: 'Templates de feedback recorrente para enviar aos alunos' },
}

export default function FormularioListagem({ tipoFixo }) {
  const navigate = useNavigate()
  const [aba, setAba] = useState(tipoFixo || 'anamnese')
  const [listaAnamnese, setListaAnamnese] = useState([])
  const [listaFeedback, setListaFeedback] = useState([])
  const [loading, setLoading] = useState(false)
  const [excluindo, setExcluindo] = useState(null)

  useEffect(() => { if (tipoFixo) setAba(tipoFixo) }, [tipoFixo])

  const carregar = async () => {
    setLoading(true)
    try {
      if (tipoFixo === 'anamnese') {
        setListaAnamnese(await listarFormulariosAnamnese())
      } else if (tipoFixo === 'feedback') {
        setListaFeedback(await listarFormulariosFeedback())
      } else {
        const [a, f] = await Promise.all([
          listarFormulariosAnamnese(),
          listarFormulariosFeedback(),
        ])
        setListaAnamnese(a)
        setListaFeedback(f)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [tipoFixo])

  const handleExcluir = async (tipo, item) => {
    if (!window.confirm(`Excluir "${item.titulo || item.name}"?`)) return
    setExcluindo(item.name)
    try {
      if (tipo === 'anamnese') await excluirFormularioAnamnese(item.name)
      else await excluirFormularioFeedback(item.name)
      await carregar()
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir formulário.')
    } finally {
      setExcluindo(null) }
  }

  const lista = aba === 'anamnese' ? listaAnamnese : listaFeedback

  const { title, subtitle } = tipoFixo
    ? TITULOS[tipoFixo]
    : { title: 'Formulários', subtitle: 'Templates de anamnese e feedback para enviar aos alunos' }

  return (
    <ListPage
      title={title}
      subtitle={subtitle}
      actions={
        <>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate(`/criar-formularios/${aba}/novo`)}
          >
            Novo {aba === 'anamnese' ? 'Formulário' : 'Feedback'}
          </Button>
        </>
      }
      loading={loading}
      empty={lista.length === 0 && !loading ? {
        title: `Sem formulários de ${aba}`,
        description: 'Crie um template para enviar aos alunos',
      } : null}
    >
      {!tipoFixo && (
        <div className="px-4 pb-2 pt-1">
          <Tabs tabs={TABS} active={aba} onChange={setAba} variant="pills" />
        </div>
      )}
      {!loading && lista.length > 0 && (
        <div className="bg-[#29292e] rounded-lg border border-[#323238] divide-y divide-[#323238]/50 mx-4 mb-4">
          {lista.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => navigate(`/criar-formularios/${aba}/${item.name}`)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{item.titulo || item.name}</p>
                {aba === 'feedback' && (
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.enabled
                      ? <Badge variant="success" size="sm">Ativo</Badge>
                      : <Badge variant="default" size="sm">Inativo</Badge>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/criar-formularios/${aba}/${item.name}`)}
                  title="Editar"
                  className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={() => handleExcluir(aba, item)}
                  disabled={excluindo === item.name}
                  title="Excluir"
                  className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors disabled:opacity-40"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ListPage>
  )
}
