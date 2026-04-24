import { useState, useEffect, useRef } from 'react'
import { Search, Download } from 'lucide-react'
import { importarDaBiblioteca } from '../api/biblioteca'
import { Modal, Button, Input, Spinner, EmptyState } from './ui'

export default function ExplorarBibliotecaModal({
  isOpen,
  onClose,
  titulo,
  doctype,
  buscarFn,
  colunas,
  onImportado,
}) {
  const [busca, setBusca] = useState('')
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)
  const [selecionados, setSelecionados] = useState(new Set())
  const [importando, setImportando] = useState(false)
  const [importados, setImportados] = useState(new Set())
  const debounceRef = useRef(null)

  const buscar = async (q) => {
    setLoading(true)
    try {
      const result = await buscarFn(q)
      setLista(Array.isArray(result) ? result : (result.list || []))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setBusca('')
      setSelecionados(new Set())
      setImportados(new Set())
      buscar('')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscar(busca), 400)
    return () => clearTimeout(debounceRef.current)
  }, [busca])

  const toggleSelecionado = (name) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const disponiveis = lista.filter(r => !importados.has(r.name))
  const todosSelecionados = disponiveis.length > 0 && disponiveis.every(r => selecionados.has(r.name))

  const toggleTodos = () => {
    if (todosSelecionados) setSelecionados(new Set())
    else setSelecionados(new Set(disponiveis.map(r => r.name)))
  }

  const handleImportar = async () => {
    if (selecionados.size === 0) return
    setImportando(true)
    try {
      const names = [...selecionados]
      await importarDaBiblioteca(doctype, names)
      setImportados(prev => new Set([...prev, ...names]))
      setSelecionados(new Set())
      onImportado()
    } catch (e) {
      console.error(e)
      alert('Erro ao importar itens.')
    } finally {
      setImportando(false)
    }
  }

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
        ) : lista.length === 0 ? (
          <EmptyState title="Nenhum item encontrado" description="Tente buscar por outro termo." />
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
              {lista.map(row => {
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
          </div>
        )}
      </div>
    </Modal>
  )
}
