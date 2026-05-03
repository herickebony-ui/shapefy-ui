import { useCallback, useEffect, useState } from 'react'
import { Spinner } from '../../components/ui'
import { listarPlanos } from '../../api/planosShapefy'
import PlanosManager from './PlanosManager'

/**
 * Tela dedicada de gerenciamento de planos — reusa o PlanosManager (mesmo
 * componente do modal "Gerenciar planos") em modo página.
 */
export default function PlanosListagem() {
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarPlanos({ limit: 200 })
      setPlanos(res.list || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="p-4 md:p-8 text-white min-h-screen bg-[#0a0a0a]">
      <div className="mb-6">
        <h1 className="text-[18px] md:text-xl font-bold tracking-tight">Planos</h1>
        <p className="text-gray-400 text-xs md:text-sm mt-1">
          Catálogo de planos e variações usados nos pagamentos
        </p>
      </div>

      <div className="bg-[#29292e] border border-[#323238] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : (
          <PlanosManager planos={planos} onMutate={carregar} active={!loading} />
        )}
      </div>
    </div>
  )
}
