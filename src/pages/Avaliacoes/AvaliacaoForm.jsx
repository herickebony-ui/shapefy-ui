import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { User, Ruler, Dumbbell, Check, RefreshCw } from 'lucide-react'
import { criarAvaliacao } from '../../api/avaliacoes'
import { listarAlunos, buscarAluno } from '../../api/alunos'
import {
  Button, FormGroup, Input, Select, Autocomplete,
} from '../../components/ui'
import DetailPage from '../../components/templates/DetailPage'

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
})

function SecaoForm({ icon: Icon, title, children }) {
  return (
    <div className="bg-[#222226] border border-[#323238] rounded-lg p-5">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Icon size={14} className="text-[#850000]" /> {title}
      </h3>
      {children}
    </div>
  )
}

export default function AvaliacaoForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const preAluno = location.state?.aluno || null

  const [form, setForm] = useState(() => {
    const f = emptyForm()
    if (preAluno) { f.aluno = preAluno.aluno || ''; f.nome_completo = preAluno.nome_completo || '' }
    return f
  })
  const [salvando, setSalvando] = useState(false)

  const set = (campo) => (val) => setForm(prev => ({ ...prev, [campo]: val }))

  const handleSelectAluno = useCallback(async (item) => {
    setForm(prev => ({ ...prev, aluno: item.name, nome_completo: item.nome_completo || '' }))
    try {
      const d = await buscarAluno(item.name)
      setForm(prev => ({
        ...prev,
        height: d.height ? String(d.height) : prev.height,
        age: d.age ? String(d.age) : prev.age,
        sex: d.sexo || d.sex || prev.sex,
        weight: d.weight ? String(d.weight) : prev.weight,
      }))
    } catch (e) { console.warn('Auto-fill falhou:', e.message) }
  }, [])

  const handleSalvar = async () => {
    if (!form.aluno || !form.weight || !form.date) {
      alert('Preencha os campos obrigatórios: Aluno, Data e Peso.')
      return
    }
    setSalvando(true)
    try {
      const payload = { ...form }
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = 0
        else if (!isNaN(Number(payload[k])) && k !== 'aluno' && k !== 'nome_completo' && k !== 'date' && k !== 'sex')
          payload[k] = Number(payload[k])
      })
      await criarAvaliacao(payload)
      navigate('/avaliacoes')
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar avaliação.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <DetailPage
      title="Nova Avaliação"
      subtitle="Composição Corporal"
      backHref="/avaliacoes"
      footer={
        <>
          <Button variant="ghost" onClick={() => navigate('/avaliacoes')}>Cancelar</Button>
          <Button variant="primary" icon={salvando ? RefreshCw : Check} loading={salvando} onClick={handleSalvar}>
            Salvar Avaliação
          </Button>
        </>
      }
    >
      <div className="p-4 space-y-5 max-w-4xl">

        {/* Dados do Aluno */}
        <SecaoForm icon={User} title="Dados do Aluno">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormGroup label="Aluno" required>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Pescoço', campo: 'neck_circumference' },
              { label: 'Ombros', campo: 'shoulder_circumference' },
              { label: 'Peito/Tórax', campo: 'chest_circumference' },
              { label: 'Cintura', campo: 'waist_circumference' },
              { label: 'Abdômen', campo: 'abdomen_circumference' },
              { label: 'Quadril', campo: 'hip_circumference' },
              { label: 'Braço Esq. Rel.', campo: 'left_arm_relaxed' },
              { label: 'Braço Esq. Cont.', campo: 'left_arm_flexed' },
              { label: 'Braço Dir. Rel.', campo: 'right_arm_relaxed' },
              { label: 'Braço Dir. Cont.', campo: 'right_arm_flexed' },
              { label: 'Antebraço Esq.', campo: 'left_forearm' },
              { label: 'Antebraço Dir.', campo: 'right_forearm' },
              { label: 'Coxa Esq.', campo: 'left_thigh' },
              { label: 'Coxa Dir.', campo: 'right_thigh' },
              { label: 'Panturrilha Esq.', campo: 'left_calf' },
              { label: 'Panturrilha Dir.', campo: 'right_calf' },
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

        {/* Fotos — placeholder */}
        <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg p-4 text-center">
          <p className="text-gray-500 text-sm">📷 Upload de fotos em breve</p>
          <p className="text-gray-600 text-xs mt-1">Após salvar a avaliação, adicione as fotos diretamente no Frappe.</p>
        </div>

      </div>
    </DetailPage>
  )
}
