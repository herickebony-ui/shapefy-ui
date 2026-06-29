import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { User, Ruler, Dumbbell, Check, RefreshCw, Image as ImageIcon, Upload, Trash2, Camera } from 'lucide-react'
import client from '../../api/client'
import { criarAvaliacao, salvarAvaliacao, buscarAvaliacao } from '../../api/avaliacoes'
import { listarAlunos, buscarAluno } from '../../api/alunos'
import { listarConjuntos, buscarConjunto, conjuntoPadraoAtual } from '../../api/conjuntos'
import { normalizarAlturaCm } from '../../api/dietas'
import {
  Button, FormGroup, Input, Select, Autocomplete, Spinner,
} from '../../components/ui'
import DetailPage from '../../components/templates/DetailPage'
import useErrorModal from '../../hooks/useErrorModal'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const SEXO_OPTS = [
  { value: 'Feminino', label: 'Feminino' },
  { value: 'Masculino', label: 'Masculino' },
]

const emptyForm = () => ({
  aluno: '', nome_completo: '',
  date: new Date().toISOString().split('T')[0],
  sex: 'Feminino', height: '', age: '', weight: '',
  neck_circumference: '', shoulder_circumference: '', chest_circumference: '',
  waist_circumference: '', abdomen_circumference: '', hip_circumference: '',
  left_arm_relaxed: '', left_arm_flexed: '', left_forearm: '',
  right_arm_relaxed: '', right_arm_flexed: '', right_forearm: '',
  left_thigh: '', left_calf: '', right_thigh: '', right_calf: '',
  wrist_circumference: '', ankle_circumference: '',
  skinfold_triceps: '', skinfold_subscapular: '', skinfold_suprailiac: '',
  skinfold_abdominal: '', skinfold_chest: '', skinfold_midaxillary: '', skinfold_thigh: '',
  conjunto_fotos: '',
})

function SecaoForm({ icon: Icon, title, children }) {
  return (
    <div className="bg-[#222226] border border-[#323238] rounded-lg p-5">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Icon size={14} className="text-[#2563eb]" /> {title}
      </h3>
      {children}
    </div>
  )
}

function FotoUpload({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)
  const errorModal = useErrorModal()

  const enviarArquivo = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      errorModal.show({
        type: 'validation',
        title: 'Arquivo inválido',
        messages: ['Envie apenas arquivos de imagem (PNG, JPG, WEBP).'],
        statusCode: 0,
      }, 'Upload de foto')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      // is_private=0: arquivo público (URL acessível direto).
      // Não passa 'optimize': string '0' é truthy em Python e ativaria
      // optimize_image (resize 1024×768, quality 85) ao invés de desativar.
      fd.append('is_private', '0')
      const res = await client.post('/api/method/upload_file', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data?.message?.file_url
      if (url) onChange(url)
      else errorModal.show({
        type: 'server',
        title: 'Upload incompleto',
        messages: ['O upload concluiu mas o servidor não retornou a URL do arquivo.'],
        statusCode: 0,
      }, 'Upload de foto')
    } catch (err) {
      errorModal.show(err, 'Upload de foto')
    } finally {
      setUploading(false)
    }
  }

  const handleInput = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    await enviarArquivo(file)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setDragOver(false)
    if (uploading) return
    const file = e.dataTransfer.files?.[0]
    await enviarArquivo(file)
  }

  const preview = value ? `${FRAPPE_URL}${value}` : null

  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg p-2 space-y-2">
      {errorModal.element}
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true) }}
        onDragEnter={(e) => { e.preventDefault(); if (!uploading) setDragOver(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false) }}
        onDrop={handleDrop}
        className={`relative aspect-square w-full rounded-lg border border-dashed overflow-hidden cursor-pointer transition-colors flex items-center justify-center
          ${dragOver
            ? 'border-[#2563eb] bg-[#2563eb]/10'
            : 'border-[#323238] bg-[#0a0a0a] hover:border-[#2563eb]/50'
          }`}
      >
        {uploading ? (
          <span className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
        ) : preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            {dragOver && (
              <div className="absolute inset-0 bg-[#2563eb]/40 flex items-center justify-center text-white text-[11px] font-bold uppercase tracking-widest">
                Solte para substituir
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-gray-600 px-2 text-center">
            <Camera size={20} />
            <span className="text-[10px] leading-tight">
              {dragOver ? 'Solte aqui' : 'Clique ou arraste a foto'}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex-1 h-7 flex items-center justify-center gap-1 text-[10px] text-gray-400 hover:text-white border border-[#323238] hover:border-blue-500 rounded transition-colors disabled:opacity-40"
        >
          <Upload size={10} /> {value ? 'Trocar' : 'Enviar'}
        </button>
        {value && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => onChange('')}
            title="Remover foto"
            className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded transition-colors disabled:opacity-40"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleInput} />
    </div>
  )
}

export default function AvaliacaoForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const editando = !!id
  const preAluno = location.state?.aluno || null

  const [form, setForm] = useState(() => {
    const f = emptyForm()
    if (preAluno) { f.aluno = preAluno.aluno || ''; f.nome_completo = preAluno.nome_completo || '' }
    return f
  })
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(editando)
  const errorModal = useErrorModal()

  // Fotos da avaliação agora vêm de um Conjunto de Fotos (mesmos slots dos feedbacks).
  const [conjuntos, setConjuntos] = useState([])
  const [conjuntoSlots, setConjuntoSlots] = useState([])
  const [fotosSlots, setFotosSlots] = useState({}) // { slot_id: url }

  const carregarSlots = useCallback(async (conjuntoId) => {
    if (!conjuntoId) { setConjuntoSlots([]); return }
    try {
      const doc = await buscarConjunto(conjuntoId)
      setConjuntoSlots((doc?.slots || []).slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0)))
    } catch { setConjuntoSlots([]) }
  }, [])

  useEffect(() => {
    listarConjuntos({ limit: 100 }).then(({ list }) => setConjuntos(list || [])).catch(() => {})
    if (!editando) {
      conjuntoPadraoAtual().then((padrao) => {
        if (padrao) { setForm(prev => ({ ...prev, conjunto_fotos: padrao })); carregarSlots(padrao) }
      }).catch(() => {})
    }
  }, [editando, carregarSlots])

  useEffect(() => {
    if (!editando) return
    let cancelado = false
    setCarregando(true)
    buscarAvaliacao(id)
      .then(d => {
        if (cancelado || !d) return
        // Frappe devolve número 0 quando não preenchido — converte pra string vazia
        // pra não poluir o input. Mantém só valores significativos.
        const limpo = {}
        Object.keys(emptyForm()).forEach(k => {
          const v = d[k]
          if (v == null) { limpo[k] = ''; return }
          if (typeof v === 'number' && v === 0) { limpo[k] = ''; return }
          limpo[k] = String(v).split(' ')[0]
        })
        setForm(prev => ({ ...prev, ...limpo }))
        // Novo formato: conjunto + fotos por slot (mapa slot_id->url).
        const mapaFotos = {}
        ;(d.fotos || []).forEach(f => { if (f.slot_id) mapaFotos[f.slot_id] = f.url || '' })
        setFotosSlots(mapaFotos)
        if (d.conjunto_fotos) carregarSlots(d.conjunto_fotos)
      })
      .catch(e => {
        errorModal.show(e, 'Carregar avaliação')
        navigate('/avaliacoes')
      })
      .finally(() => { if (!cancelado) setCarregando(false) })
    return () => { cancelado = true }
  }, [id, editando, navigate, carregarSlots])

  const set = (campo) => (val) => setForm(prev => ({ ...prev, [campo]: val }))

  const handleSelectAluno = useCallback(async (item) => {
    setForm(prev => ({ ...prev, aluno: item.name, nome_completo: item.nome_completo || '' }))
    try {
      const d = await buscarAluno(item.name)
      setForm(prev => ({
        ...prev,
        // Sempre cm — aceita aluno legado em metros
        height: d.height ? String(normalizarAlturaCm(d.height)) : prev.height,
        age: d.age ? String(d.age) : prev.age,
        sex: d.sexo || d.sex || prev.sex,
        weight: d.weight ? String(d.weight) : prev.weight,
      }))
    } catch (e) { console.warn('Auto-fill falhou:', e.message) }
  }, [])

  const handleSalvar = async () => {
    if (!form.aluno || !form.weight || !form.date) {
      const faltando = []
      if (!form.aluno) faltando.push('Campo obrigatório: Aluno')
      if (!form.date) faltando.push('Campo obrigatório: Data')
      if (!form.weight) faltando.push('Campo obrigatório: Peso')
      errorModal.show({
        type: 'mandatory',
        title: 'Campos obrigatórios não preenchidos',
        messages: faltando,
        statusCode: 0,
      }, editando ? 'Salvar avaliação' : 'Criar avaliação')
      return
    }
    setSalvando(true)
    try {
      const payload = { ...form }
      payload.conjunto_fotos = form.conjunto_fotos || null
      // Garante altura sempre em cm antes da coerção numérica genérica abaixo
      if (payload.height !== '' && payload.height != null) {
        payload.height = String(normalizarAlturaCm(payload.height))
      }
      Object.keys(payload).forEach(k => {
        if (k === 'conjunto_fotos') return
        if (payload[k] === '') payload[k] = 0
        else if (!isNaN(Number(payload[k])) && k !== 'aluno' && k !== 'nome_completo' && k !== 'date' && k !== 'sex')
          payload[k] = Number(payload[k])
      })
      // Fotos do conjunto → child table `fotos` (slot_id/rotulo/ordem/url).
      payload.fotos = conjuntoSlots
        .map((s, i) => ({ slot_id: s.slot_id, rotulo: s.rotulo, ordem: s.ordem || i + 1, url: fotosSlots[s.slot_id] || '' }))
        .filter(f => f.url)
      if (editando) {
        // Frappe não aceita alterar `aluno` em update direto sem cuidados — mantém os campos editáveis.
        const { aluno: _aluno, nome_completo: _nome, ...editavel } = payload
        await salvarAvaliacao(id, editavel)
      } else {
        await criarAvaliacao(payload)
      }
      navigate('/avaliacoes')
    } catch (e) {
      errorModal.show(e, editando ? 'Salvar avaliação' : 'Criar avaliação')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <DetailPage
      title={editando ? 'Editar Avaliação' : 'Nova Avaliação'}
      subtitle="Composição Corporal"
      backHref="/avaliacoes"
      footer={
        <>
          <Button variant="ghost" onClick={() => navigate('/avaliacoes')}>Cancelar</Button>
          <Button variant="primary" icon={salvando ? RefreshCw : Check} loading={salvando} onClick={handleSalvar}>
            {editando ? 'Salvar Alterações' : 'Salvar Avaliação'}
          </Button>
        </>
      }
    >
      <div className="p-4 space-y-5 max-w-4xl">

        {/* Dados do Aluno */}
        <SecaoForm icon={User} title="Dados do Aluno">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormGroup
                label="Aluno"
                required
                hint={editando ? 'O aluno não pode ser alterado depois de criada a avaliação.' : undefined}
              >
                {editando ? (
                  <Input value={form.nome_completo} onChange={() => {}} disabled />
                ) : (
                  <Autocomplete
                    value={form.nome_completo}
                    onChange={set('nome_completo')}
                    onSelect={handleSelectAluno}
                    searchFn={async (q) => {
                      const res = await listarAlunos({ search: q, limit: 20 })
                      return res.list
                    }}
                    renderItem={(item) => (
                      <div>
                        <p className="text-white text-sm font-medium">{item.nome_completo}</p>
                        <p className="text-gray-500 text-xs">{item.email}</p>
                      </div>
                    )}
                    placeholder="Buscar aluno pelo nome..."
                  />
                )}
              </FormGroup>
            </div>
            <FormGroup label="Data da Avaliação" required>
              <Input value={form.date} onChange={set('date')} type="date" />
            </FormGroup>
            <FormGroup label="Sexo">
              <Select value={form.sex} onChange={set('sex')} options={SEXO_OPTS} />
            </FormGroup>
            <FormGroup label="Altura (cm)" required>
              <Input value={form.height} onChange={set('height')} type="number" placeholder="Ex: 164" />
            </FormGroup>
            <FormGroup label="Idade">
              <Input value={form.age} onChange={set('age')} type="number" placeholder="Ex: 25" />
            </FormGroup>
            <FormGroup label="Peso (kg)" required>
              <Input value={form.weight} onChange={set('weight')} type="number" placeholder="Ex: 65.5" />
            </FormGroup>
          </div>
        </SecaoForm>

        {/* Circunferências */}
        <SecaoForm icon={Ruler} title="Circunferências (cm)">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
            {[
              { label: 'Pescoço', campo: 'neck_circumference' },
              { label: 'Ombros', campo: 'shoulder_circumference' },
              { label: 'Peito/Tórax', campo: 'chest_circumference' },
              { label: 'Cintura', campo: 'waist_circumference' },
              { label: 'Abdômen', campo: 'abdomen_circumference' },
              { label: 'Quadril', campo: 'hip_circumference' },
              { label: 'Braço Direito Relaxado', campo: 'right_arm_relaxed' },
              { label: 'Antebraço Direito', campo: 'right_forearm' },
              { label: 'Braço Direito Contraído', campo: 'right_arm_flexed' },
              { label: 'Coxa Direita', campo: 'right_thigh' },
              { label: 'Panturrilha Direita', campo: 'right_calf' },
              { label: 'Braço Esquerdo Relaxado', campo: 'left_arm_relaxed' },
              { label: 'Antebraço Esquerdo', campo: 'left_forearm' },
              { label: 'Braço Esquerdo Contraído', campo: 'left_arm_flexed' },                            
              { label: 'Coxa Esquerda', campo: 'left_thigh' },              
              { label: 'Panturrilha Esquerda', campo: 'left_calf' },              
              { label: 'Punho', campo: 'wrist_circumference' },
              { label: 'Tornozelo', campo: 'ankle_circumference' },
            ].map(({ label, campo }) => (
              <FormGroup key={campo} label={label}>
                <Input value={form[campo]} onChange={set(campo)} type="number" placeholder="0" />
              </FormGroup>
            ))}
          </div>
        </SecaoForm>

        {/* Dobras */}
        <SecaoForm icon={Dumbbell} title="Dobras Cutâneas (mm)">
          <p className="text-xs text-gray-500 mb-4">
            Ordem de coleta. Deixe em branco se não coletado — o Frappe calcula os percentuais automaticamente.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
            {[
              { label: 'Subescapular', campo: 'skinfold_subscapular' },
              { label: 'Tríceps', campo: 'skinfold_triceps' },
              { label: 'Axilar Média', campo: 'skinfold_midaxillary' },
              { label: 'Suprailíaca', campo: 'skinfold_suprailiac' },
              { label: 'Abdominal', campo: 'skinfold_abdominal' },
              { label: 'Coxa', campo: 'skinfold_thigh' },
              { label: 'Peitoral', campo: 'skinfold_chest' },
            ].map(({ label, campo }) => (
              <FormGroup key={campo} label={label}>
                <Input value={form[campo]} onChange={set(campo)} type="number" placeholder="0" />
              </FormGroup>
            ))}
          </div>
        </SecaoForm>

        {/* Fotos (Conjunto) */}
        <SecaoForm icon={ImageIcon} title="Fotos">
          <div className="mb-4 max-w-md">
            <FormGroup label="Conjunto de Fotos" hint="Define os ângulos a registrar. As fotos entram na evolução do aluno (mesmos slots dos feedbacks).">
              <Select
                value={form.conjunto_fotos}
                onChange={(v) => { set('conjunto_fotos')(v); carregarSlots(v) }}
                options={conjuntos.map(c => ({ value: c.name, label: c.titulo }))}
                placeholder="Selecionar conjunto..."
              />
            </FormGroup>
          </div>
          {conjuntoSlots.length > 0 ? (
            <>
              <p className="text-xs text-gray-500 mb-4">
                Clique no quadro ou arraste a imagem. As fotos sobem em qualidade original (sem compressão) e ficam públicas — disponíveis pras comparações e PDFs.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {conjuntoSlots.map((s) => (
                  <FotoUpload
                    key={s.slot_id}
                    label={s.rotulo}
                    value={fotosSlots[s.slot_id] || ''}
                    onChange={(url) => setFotosSlots(prev => ({ ...prev, [s.slot_id]: url || '' }))}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-600 italic">Selecione um conjunto de fotos pra registrar as imagens.</p>
          )}
        </SecaoForm>

      </div>
      {errorModal.element}
    </DetailPage>
  )
}
