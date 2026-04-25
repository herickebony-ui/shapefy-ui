import { useState, useEffect, useRef } from 'react'
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { importarDaBiblioteca, listarBibliotecaDisponivel } from '../api/biblioteca'
import { Modal, Button, Input, Spinner, EmptyState } from './ui'

const PAGE_SIZE = 100

export default function ExplorarBibliotecaModal({
  isOpen,
  onClose,
  titulo,
  doctype,
  colunas,
  onImportado,
}) {
  const [busca, setBusca] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selecionados, setSelecionados] = useState(new Set())
  const [importando, setImportando] = useState(false)
  const [importados, setImportados] = useState(new Set())
  const debounceRef = useRef(null)
  const reqIdRef = useRef(0)

  const carregar = async ({ busca: b, page: p }) => {
    const reqId = ++reqIdRef.current
    setLoading(true)
    try {
      const res = await listarBibliotecaDisponivel({ doctype, busca: b, page: p, pageSize: PAGE_SIZE })
      if (reqId !== reqIdRef.current) return
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      if (reqId !== reqIdRef.current) return
      console.error(e)
      setItems([])
      setTotal(0)
    } finally {
      if (reqId === reqIdRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setBusca('')
    setPage(1)
    setSelecionados(new Set())
    setImportados(new Set())
    carregar({ busca: '', page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      carregar({ busca, page: 1 })
    }, 400)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])

  const goToPage = (p) => {
    setPage(p)
    carregar({ busca, page: p })
  }

  const toggleSelecionado = (name) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const visiveis = items.filter(r => !importados.has(r.name))
  const todosSelecionados = visiveis.length > 0 && visiveis.every(r => selecionados.has(r.name))

  const toggleTodos = () => {
    if (todosSelecionados) setSelecionados(new Set())
    else setSelecionados(new Set(visiveis.map(r => r.name)))
  }

  const handleImportar = async () => {
    if (selecionados.size === 0) return
    setImportando(true)
    try {
      const names = [...selecionados]
      await importarDaBiblioteca(doctype, names)
      setImportados(prev => new Set([...prev, ...names]))
      setSelecionados(new Set())
      onImportado?.()
      await carregar({ busca, page })
      setImportados(new Set())
    } catch (e) {
      console.error(e)
      alert('Erro ao importar itens.')
    } finally {
      setImportando(false)
    }
  }

  const inicio = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const fim = Math.min(page * PAGE_SIZE, total)
  const temAnterior = page > 1
  const temProxima = page * PAGE_SIZE < total
  const mostrarPaginacao = total > PAGE_SIZE

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titulo}
      subtitle="Selecione os itens para importar para seu catálogo pessoal"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button
            variant="primary"
            icon={Download}
            onClick={handleImportar}
            loading={importando}
            disabled={selecionados.size === 0}
          >
            {selecionados.size > 0 ? `Importar (${selecionados.size})` : 'Importar'}
          </Button>
        </>
      }
    >
      <div className="p-4 space-y-3">
        <Input
          value={busca}
          onChange={setBusca}
          placeholder="Buscar na biblioteca..."
          icon={Search}
        />

        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState
            title={busca ? 'Nenhum item encontrado' : 'Você já importou tudo'}
            description={busca ? 'Tente buscar por outro termo.' : 'A biblioteca não tem mais itens disponíveis para importar.'}
          />
        ) : (
          <div className="rounded-lg border border-[#323238] overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2 bg-[#222226] border-b border-[#323238]">
              <input
                type="checkbox"
                checked={todosSelecionados}
                onChange={toggleTodos}
                className="w-4 h-4 accent-[#2563eb] cursor-pointer shrink-0"
              />
              {colunas.map((col, i) => (
                <span
                  key={i}
                  className={`text-[10px] uppercase tracking-wider text-gray-500 font-medium ${i === 0 ? 'flex-1' : ''} ${col.headerClass || ''}`}
                >
                  {col.label}
                </span>
              ))}
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-[#323238]">
              {items.map(row => {
                const jaImportado = importados.has(row.name)
                const selecionado = selecionados.has(row.name)
                return (
                  <div
                    key={row.name}
                    onClick={() => !jaImportado && toggleSelecionado(row.name)}
                    className={`flex items-center gap-3 px-3 py-2.5 transition-colors
                      ${jaImportado ? 'opacity-50 cursor-default' : 'cursor-pointer hover:bg-[#29292e]'}
                      ${selecionado ? 'bg-[#2563eb]/10' : ''}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={selecionado}
                      disabled={jaImportado}
                      onChange={() => toggleSelecionado(row.name)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 accent-[#2563eb] cursor-pointer shrink-0"
                    />
                    {colunas.map((col, i) => (
                      <span key={i} className={`text-sm min-w-0 ${i === 0 ? 'flex-1 truncate' : ''} ${col.cellClass || ''}`}>
                        {col.render(row)}
                      </span>
                    ))}
                    {jaImportado && (
                      <span className="text-green-400 text-xs shrink-0">✓ Importado</span>
                    )}
                  </div>
                )
              })}
            </div>

            {mostrarPaginacao && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-[#323238] bg-[#222226]">
                <span className="text-xs text-gray-500 tabular-nums">
                  {inicio}–{fim} de {total}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={ChevronLeft}
                    disabled={!temAnterior || loading}
                    onClick={() => goToPage(page - 1)}
                  />
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={ChevronRight}
                    disabled={!temProxima || loading}
                    onClick={() => goToPage(page + 1)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
