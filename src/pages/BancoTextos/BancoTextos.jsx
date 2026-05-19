import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, RefreshCw, Pencil, Copy, Trash2, ToggleLeft, ToggleRight, Check, X } from 'lucide-react'
import {
  CATEGORIAS,
  GRUPOS_CATEGORIA,
  listarTodosTextos,
  criarTexto,
  editarTexto,
  toggleTexto,
  excluirTexto,
} from '../../api/bancoTextos'
import { Button, Tabs, FormGroup, Input, Modal, EmptyState } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import { FileText } from 'lucide-react'
import useErrorModal from '../../hooks/useErrorModal'

export default function BancoTextos() {
  const [abaSelecionada, setAbaSelecionada] = useState(CATEGORIAS[0].id)
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [mostrarDesativados, setMostrarDesativados] = useState(false)

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [campoTexto, setCampoTexto] = useState('')
  const [campoExtra, setCampoExtra] = useState('')
  const [salvando, setSalvando] = useState(false)

  const errorModal = useErrorModal()
  const debounceRef = useRef(null)

  const categoria = CATEGORIAS.find((c) => c.id === abaSelecionada)
  const grupoAtivo = categoria?.grupo || GRUPOS_CATEGORIA[0].id
  const categoriasDoGrupo = CATEGORIAS.filter((c) => c.grupo === grupoAtivo)

  const carregar = useCallback(async () => {
    if (!categoria) return
    setLoading(true)
    try {
      const dados = await listarTodosTextos(categoria.doctype, categoria.campo, {
        busca: busca || null,
        extra: categoria.extra,
      })
      setLista(dados)
    } catch (e) {
      console.error('Erro ao carregar banco de textos:', e.message)
    } finally {
      setLoading(false)
    }
  }, [categoria, busca])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(carregar, 400)
    return () => clearTimeout(debounceRef.current)
  }, [carregar])

  useEffect(() => {
    setBusca('')
    setLista([])
  }, [abaSelecionada])

  const abrirNovo = () => {
    setEditando(null)
    setCampoTexto('')
    setCampoExtra('')
    setModalAberto(true)
  }

  const abrirEdicao = (item) => {
    setEditando(item)
    setCampoTexto(item[categoria.campo] || '')
    setCampoExtra(categoria.extra ? item[categoria.extra] || '' : '')
    setModalAberto(true)
  }

  const abrirDuplicar = (item) => {
    // Pré-preenche o modal de criação com o conteúdo do item de origem.
    // Para DocTypes com unique no campo (ex.: Repeticao Treino, Descanso Treino),
    // o usuário precisa editar antes de salvar; senão o Frappe rejeita.
    setEditando(null)
    setCampoTexto(item[categoria.campo] || '')
    setCampoExtra(categoria.extra ? item[categoria.extra] || '' : '')
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setEditando(null)
  }

  const handleSalvar = async () => {
    if (!campoTexto.trim()) return
    setSalvando(true)
    try {
      const extra = categoria.extra ? { [categoria.extra]: campoExtra } : {}
      if (editando) {
        await editarTexto(categoria.doctype, editando.name, {
          [categoria.campo]: campoTexto.trim(),
          ...extra,
        })
      } else {
        await criarTexto(categoria.doctype, categoria.campo, campoTexto.trim(), extra)
      }
      fecharModal()
      carregar()
    } catch (e) {
      errorModal.show(e, `Salvar ${categoria?.label || 'texto'}`)
    } finally {
      setSalvando(false)
    }
  }

  const handleToggle = async (item) => {
    try {
      await toggleTexto(categoria.doctype, item.name, !item.enabled)
      setLista((prev) =>
        prev.map((i) => (i.name === item.name ? { ...i, enabled: item.enabled ? 0 : 1 } : i)),
      )
    } catch (e) {
      console.error('Erro ao alternar status:', e.message)
    }
  }

  const handleExcluir = async (item) => {
    if (!confirm(`Excluir este texto permanentemente?\n\n"${item[categoria.campo]}"`)) return
    try {
      await excluirTexto(categoria.doctype, item.name)
      setLista((prev) => prev.filter((i) => i.name !== item.name))
    } catch (e) {
      errorModal.show(e, `Excluir ${categoria?.label || 'texto'}`)
    }
  }

  const listaFiltrada = mostrarDesativados
    ? lista
    : lista.filter((i) => i.enabled !== 0)

  const tabsDoGrupo = categoriasDoGrupo.map((c) => ({ id: c.id, label: c.label }))

  const trocarGrupo = (novoGrupoId) => {
    const primeira = CATEGORIAS.find((c) => c.grupo === novoGrupoId)
    if (primeira) setAbaSelecionada(primeira.id)
  }

  return (
    <>
      <ListPage
        title="Banco de Textos"
        subtitle="Sugestões reutilizáveis para fichas, dietas e planos"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
            <button
              onClick={() => setMostrarDesativados((v) => !v)}
              title={mostrarDesativados ? 'Ocultar desativados' : 'Mostrar desativados'}
              className={`h-7 w-7 flex items-center justify-center border rounded-lg transition-colors text-xs font-bold
                ${mostrarDesativados
                  ? 'bg-[#2563eb] border-[#2563eb] text-white'
                  : 'text-gray-400 border-[#323238] hover:border-gray-500 hover:text-white'
                }`}
            >
              {mostrarDesativados ? '●' : '○'}
            </button>
            <Button variant="primary" size="sm" icon={Plus} onClick={abrirNovo}>
              Novo Texto
            </Button>
          </>
        }
        filters={[
          { type: 'search', value: busca, onChange: setBusca, placeholder: 'Filtrar textos...' },
        ]}
        loading={loading}
        empty={
          !loading && listaFiltrada.length === 0
            ? {
                title: 'Nenhum texto cadastrado',
                description: 'Clique em "Novo Texto" para adicionar o primeiro.',
              }
            : null
        }
      >
        {/* Navegação em 2 níveis: Grupo (pílulas) + Tabs do grupo (sublinhado) */}
        <div className="px-4 pt-2 pb-0 space-y-2">
          {/* Grupos — pílulas que cabem em mobile sem scroll horizontal */}
          <div className="flex flex-wrap gap-1.5">
            {GRUPOS_CATEGORIA.map((g) => {
              const ativo = g.id === grupoAtivo
              return (
                <button
                  key={g.id}
                  onClick={() => trocarGrupo(g.id)}
                  className={`h-8 px-3 text-xs font-semibold rounded-lg border transition-colors
                    ${ativo
                      ? 'bg-[#2563eb] border-[#2563eb] text-white'
                      : 'bg-transparent border-[#323238] text-gray-400 hover:text-white hover:border-gray-500'
                    }`}
                >
                  {g.label}
                </button>
              )
            })}
          </div>
          {/* Tabs do grupo selecionado */}
          {tabsDoGrupo.length > 1 && (
            <Tabs
              tabs={tabsDoGrupo}
              active={abaSelecionada}
              onChange={(id) => setAbaSelecionada(id)}
              variant="underline"
            />
          )}
        </div>

        {/* Tabela */}
        {!loading && listaFiltrada.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-[#222226] border border-[#323238] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#323238]">
                    {categoria?.extra && (
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-40">
                        {categoria.extraLabel || categoria.extra}
                      </th>
                    )}
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {categoria?.campoLabel || 'Texto'}
                    </th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">
                      Status
                    </th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-32">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listaFiltrada.map((item, idx) => (
                    <tr
                      key={item.name}
                      className={`border-b border-[#323238]/50 last:border-0 transition-colors
                        ${item.enabled === 0 ? 'opacity-40' : 'hover:bg-[#29292e]'}`}
                    >
                      {categoria?.extra && (
                        <td className="px-4 py-3 text-gray-400 text-xs align-top">
                          {item[categoria.extra] || '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-white text-sm leading-relaxed">
                        {item[categoria.campo]}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleToggle(item)}
                          title={item.enabled ? 'Desativar' : 'Ativar'}
                          className={`h-7 w-7 flex items-center justify-center border rounded-lg transition-colors mx-auto
                            ${item.enabled
                              ? 'text-green-400 border-green-500/30 hover:bg-green-700 hover:border-green-700 hover:text-white'
                              : 'text-gray-500 border-[#323238] hover:border-gray-500 hover:text-white'
                            }`}
                        >
                          {item.enabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        </button>
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => abrirEdicao(item)}
                            title="Editar"
                            className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => abrirDuplicar(item)}
                            title="Duplicar"
                            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-600 border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={() => handleExcluir(item)}
                            title="Excluir"
                            className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-600 mt-2 text-right">
              {listaFiltrada.length} {listaFiltrada.length === 1 ? 'texto' : 'textos'}
              {mostrarDesativados && ` (${lista.filter((i) => i.enabled === 0).length} desativados)`}
            </p>
          </div>
        )}
      </ListPage>

      {/* Modal novo/editar */}
      {modalAberto && (
        <Modal
          title={editando ? 'Editar Texto' : 'Novo Texto'}
          subtitle={categoria?.label}
          onClose={fecharModal}
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={fecharModal}>Cancelar</Button>
              <Button
                variant="primary"
                icon={salvando ? RefreshCw : Check}
                loading={salvando}
                onClick={handleSalvar}
                disabled={!campoTexto.trim()}
              >
                Salvar
              </Button>
            </>
          }
        >
          <div className="p-4 space-y-4">
            <FormGroup label={categoria?.campoLabel || 'Texto'} required>
              {categoria?.campoMultiline === false ? (
                <Input
                  autoFocus
                  value={campoTexto}
                  onChange={setCampoTexto}
                  placeholder={categoria?.campoPlaceholder || 'Digite...'}
                />
              ) : (
                <textarea
                  autoFocus
                  value={campoTexto}
                  onChange={(e) => setCampoTexto(e.target.value)}
                  rows={4}
                  placeholder={categoria?.campoPlaceholder || 'Digite o texto...'}
                  className="w-full bg-[#1a1a1a] border border-[#323238] focus:border-[#2563eb]/60 text-white text-sm rounded-lg px-3 py-2 outline-none resize-none leading-relaxed transition-colors placeholder-gray-600"
                />
              )}
            </FormGroup>

            {categoria?.extra && (
              <FormGroup
                label={categoria.extraLabel || categoria.extra}
                hint={categoria.extraHint || 'Identificador do texto (opcional)'}
              >
                <Input
                  value={campoExtra}
                  onChange={setCampoExtra}
                  placeholder={categoria.extraPlaceholder || ''}
                />
              </FormGroup>
            )}
          </div>
        </Modal>
      )}

      {errorModal.element}
    </>
  )
}
