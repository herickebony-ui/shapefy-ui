import { useState } from 'react'
import { Bookmark, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, FormGroup, Input, Select, Textarea, Modal } from '../../components/ui'
import {
  criarModeloDieta, criarModeloFicha,
  dietaParaSnapshot, fichaParaSnapshot,
  CATEGORIAS_DIETA, CATEGORIAS_FICHA,
} from '../../api/modelos'

/**
 * Modal compartilhado pra salvar uma Dieta ou Ficha como modelo (template).
 *
 * Props:
 *   tipo: 'dieta' | 'ficha'   — define qual API e categorias usar
 *   entidade: o doc completo da Dieta/Ficha atual (com child tables)
 *   isOpen, onClose
 *   onSalvo(modeloCriado): callback após sucesso
 */
export default function ModalSalvarComoModelo({ tipo, entidade, isOpen, onClose, onSalvo }) {
  const navigate = useNavigate()
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const categorias = tipo === 'dieta' ? CATEGORIAS_DIETA : CATEGORIAS_FICHA
  const labelEntidade = tipo === 'dieta' ? 'dieta' : 'ficha'

  const handleSalvar = async () => {
    if (!titulo.trim() || !entidade) return
    setSalvando(true)
    try {
      const snapshot = tipo === 'dieta' ? dietaParaSnapshot(entidade) : fichaParaSnapshot(entidade)
      const camposBase = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria: categoria || null,
        aluno_origem: entidade.aluno || null,
        snapshot_json: JSON.stringify(snapshot),
      }

      let modelo
      if (tipo === 'dieta') {
        modelo = await criarModeloDieta({
          ...camposBase,
          dieta_origem: entidade.name,
          total_calories_ref: entidade.total_calories || 0,
          strategy_ref: entidade.strategy || '',
        })
      } else {
        modelo = await criarModeloFicha({
          ...camposBase,
          ficha_origem: entidade.name,
          objetivo_ref: entidade.objetivo || '',
          nivel_ref: entidade.nivel || '',
          tipo_de_ciclo_ref: entidade.tipo_de_ciclo || '',
        })
      }

      setResultado(modelo)
      if (onSalvo) onSalvo(modelo)
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar modelo: ' + (e?.message || 'desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  const handleVerListagem = () => {
    onClose()
    navigate(tipo === 'dieta' ? '/modelos/dietas' : '/modelos/fichas')
  }

  if (!isOpen) return null

  // Estado pós-sucesso
  if (resultado) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Modelo salvo"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
            <Button variant="primary" icon={ExternalLink} onClick={handleVerListagem}>
              Ver Modelos
            </Button>
          </>
        }
      >
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <Bookmark size={18} className="text-green-400 shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold">"{resultado.titulo}" criado</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Disponível em Modelos de {tipo === 'dieta' ? 'Dieta' : 'Ficha'}
              </p>
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Salvar como modelo"
      subtitle={`Cria um template congelado a partir desta ${labelEntidade}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            icon={Bookmark}
            onClick={handleSalvar}
            loading={salvando}
            disabled={!titulo.trim()}
          >
            Salvar Modelo
          </Button>
        </>
      }
    >
      <div className="p-5 space-y-4">
        <FormGroup label="Título" required>
          <Input
            value={titulo}
            onChange={setTitulo}
            placeholder={tipo === 'dieta' ? 'Ex: Hipertrofia 2500 kcal' : 'Ex: ABC Iniciante 3x/sem'}
          />
        </FormGroup>
        <FormGroup label="Categoria">
          <Select
            value={categoria}
            onChange={setCategoria}
            options={categorias}
            placeholder="Selecione…"
          />
        </FormGroup>
        <FormGroup label="Descrição" hint="Quando e como usar este modelo">
          <Textarea
            value={descricao}
            onChange={setDescricao}
            placeholder="Opcional"
            rows={4}
          />
        </FormGroup>
      </div>
    </Modal>
  )
}
