import { useState } from 'react'
import { Save, Archive } from 'lucide-react'
import { Button, Input, Textarea } from '../../components/ui'
import useErrorModal from '../../hooks/useErrorModal'
import { atualizarComunidade, arquivarComunidade } from '../../api/comunidade'
import { useNavigate } from 'react-router-dom'

export default function ComunidadeConfiguracoes({ community, comunidade, onUpdate }) {
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const [titulo, setTitulo] = useState(comunidade.titulo || '')
  const [descricao, setDescricao] = useState(comunidade.descricao || '')
  const [status, setStatus] = useState(comunidade.status || 'Ativa')
  const [maxPins, setMaxPins] = useState(comunidade.max_posts_fixados ?? 3)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const handleSalvar = async () => {
    setSalvando(true)
    setSalvo(false)
    try {
      await atualizarComunidade(community, { titulo, descricao, status, max_posts_fixados: maxPins })
      setSalvo(true)
      onUpdate?.()
    } catch (e) {
      errorModal.show(e, 'Salvar configurações')
    } finally {
      setSalvando(false)
    }
  }

  const handleArchive = async () => {
    if (!confirm('Tem certeza que deseja arquivar esta comunidade? Os alunos não poderão mais acessá-la.')) return
    try {
      await arquivarComunidade(community)
      navigate('/comunidade')
    } catch (e) {
      errorModal.show(e, 'Arquivar comunidade')
    }
  }

  return (
    <div className="space-y-5">
      {errorModal.element}

      <div className="bg-[#1a1a1a] border border-[#323238] rounded-xl p-4 space-y-4">
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1 block">Nome da comunidade</label>
          <Input value={titulo} onChange={(v) => { setTitulo(v); setSalvo(false) }} placeholder="Título" />
        </div>
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1 block">Descrição</label>
          <Textarea value={descricao} onChange={(v) => { setDescricao(v); setSalvo(false) }}
            placeholder="Sobre a comunidade..." rows={3} />
        </div>
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1 block">Status</label>
          <div className="flex gap-2">
            {['Ativa', 'Inativa'].map(s => (
              <button key={s} onClick={() => { setStatus(s); setSalvo(false) }}
                className={`px-4 h-9 rounded-lg border text-sm font-medium transition-colors ${
                  status === s
                    ? 'bg-[#2563eb]/10 border-[#2563eb]/50 text-white'
                    : 'bg-[#29292e] border-[#323238] text-gray-400 hover:border-gray-500'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1 block">Máximo de posts fixados</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1} max={10}
              value={maxPins}
              onChange={e => { setMaxPins(Number(e.target.value)); setSalvo(false) }}
              className="flex-1 accent-[#2563eb]"
            />
            <span className="text-white text-sm font-bold w-6 text-center">{maxPins}</span>
          </div>
        </div>
        <Button variant="primary" icon={Save} onClick={handleSalvar} loading={salvando}>
          {salvo ? 'Salvo' : 'Salvar'}
        </Button>
      </div>

      {/* Danger zone */}
      <div className="bg-[#1a1a1a] border border-red-500/20 rounded-xl p-4">
        <h3 className="text-red-400 text-sm font-bold mb-2">Zona de perigo</h3>
        <p className="text-gray-500 text-xs mb-3">
          Ao arquivar, a comunidade ficará invisível para os alunos. Posts e membros serão preservados.
        </p>
        <Button variant="secondary" size="sm" icon={Archive} onClick={handleArchive}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10">
          Arquivar comunidade
        </Button>
      </div>
    </div>
  )
}
