import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button, FormGroup, Input, Select, Textarea, Modal } from '../../components/ui'
import {
  criarModeloDieta, criarModeloFicha,
  CATEGORIAS_DIETA, CATEGORIAS_FICHA,
} from '../../api/modelos'

/**
 * Modal pra criar um modelo de Dieta/Ficha do zero (snapshot vazio) e já abrir
 * o editor. O editor reusa DietaDetalhe/FichaDetalhe em modo template, que
 * tratam snapshot `{}` (Ficha cai nos defaults de novaFicha; Dieta abre em
 * branco e o usuário adiciona refeições).
 *
 * Props: tipo ('dieta' | 'ficha'), isOpen, onClose.
 */
export default function ModalCriarModeloDoZero({ tipo, isOpen, onClose }) {
  const navigate = useNavigate()
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [salvando, setSalvando] = useState(false)

  const isDieta = tipo === 'dieta'
  const categorias = isDieta ? CATEGORIAS_DIETA : CATEGORIAS_FICHA

  const handleCriar = async () => {
    if (!titulo.trim()) return
    setSalvando(true)
    try {
      const campos = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria: categoria || null,
        snapshot_json: '{}',
      }
      const modelo = isDieta ? await criarModeloDieta(campos) : await criarModeloFicha(campos)
      navigate(isDieta ? `/modelos/dietas/${modelo.name}` : `/modelos/fichas/${modelo.name}`)
    } catch (e) {
      console.error(e)
      alert('Erro ao criar modelo: ' + (e?.message || 'desconhecido'))
      setSalvando(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Criar modelo de ${isDieta ? 'dieta' : 'ficha'} do zero`}
      subtitle="Cria um modelo vazio e abre o editor pra você montar do zero."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Plus} onClick={handleCriar} loading={salvando} disabled={!titulo.trim()}>
            Criar e abrir editor
          </Button>
        </>
      }
    >
      <div className="p-5 space-y-4">
        <FormGroup label="Título" required>
          <Input
            value={titulo}
            onChange={setTitulo}
            placeholder={isDieta ? 'Ex: Hipertrofia 2500 kcal' : 'Ex: ABC Iniciante 3x/sem'}
          />
        </FormGroup>
        <FormGroup label="Categoria">
          <Select value={categoria} onChange={setCategoria} options={categorias} placeholder="Selecione…" />
        </FormGroup>
        <FormGroup label="Descrição" hint="Quando e como usar este modelo">
          <Textarea value={descricao} onChange={setDescricao} placeholder="Opcional" rows={4} />
        </FormGroup>
      </div>
    </Modal>
  )
}
