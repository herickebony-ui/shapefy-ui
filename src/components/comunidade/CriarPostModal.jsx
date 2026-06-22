import { useState, useRef } from 'react'
import { Image as ImageIcon, X, Plus } from 'lucide-react'
import { Modal, Button, Spinner } from '../ui'
import { uploadImagemComunidade } from '../../api/comunidade'
import { toRenderableImage } from '../../utils/heicToJpeg'
import useErrorModal from '../../hooks/useErrorModal'

const MAX_IMAGES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024

export default function CriarPostModal({ isOpen, onClose, onSubmit, asyncMode }) {
  const [caption, setCaption] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)
  const errorModal = useErrorModal()

  const addFiles = async (fileList) => {
    const remaining = MAX_IMAGES - files.length
    if (remaining <= 0) {
      errorModal.show({ type: 'validation', title: 'Limite atingido', messages: [`Máximo ${MAX_IMAGES} fotos por post.`], statusCode: 0 }, 'Upload')
      return
    }
    const toAdd = Array.from(fileList).slice(0, remaining)
    const newFiles = []
    const newPreviews = []
    for (const f of toAdd) {
      const ehImagem = f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name || '')
      if (!ehImagem) continue
      if (f.size > MAX_FILE_SIZE) continue
      const preparado = await toRenderableImage(f)
      newFiles.push(preparado)
      newPreviews.push(URL.createObjectURL(preparado))
    }
    if (newFiles.length) {
      setFiles(prev => [...prev, ...newFiles])
      setPreviews(prev => [...prev, ...newPreviews])
    }
  }

  const removeImage = (idx) => {
    URL.revokeObjectURL(previews[idx])
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const clearAll = () => {
    previews.forEach(p => URL.revokeObjectURL(p))
    setFiles([])
    setPreviews([])
  }

  const handleSubmit = async () => {
    if (!caption.trim() && files.length === 0) return

    if (asyncMode && files.length > 0) {
      const captionTrimmed = caption.trim()
      const rawFiles = [...files]
      setCaption('')
      clearAll()
      onClose()
      onSubmit({ caption: captionTrimmed, files: rawFiles })
      return
    }

    setSubmitting(true)
    try {
      let imageUrls = []
      if (files.length > 0) {
        setUploading(true)
        for (const f of files) {
          const url = await uploadImagemComunidade(f)
          imageUrls.push(url)
        }
        setUploading(false)
      }
      await onSubmit({ caption: caption.trim(), imagens: imageUrls })
      setCaption('')
      clearAll()
      onClose()
    } catch (e) {
      errorModal.show(e, 'Criar post')
    } finally {
      setUploading(false)
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo post" size="md"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit}
            loading={submitting} disabled={(!caption.trim() && files.length === 0) || submitting}>
            {uploading ? 'Enviando fotos...' : 'Publicar'}
          </Button>
        </div>
      }>
      {errorModal.element}
      <div className="p-4 space-y-3">
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="O que você quer compartilhar?"
          maxLength={2000}
          rows={4}
          className="w-full bg-[#29292e] border border-[#323238] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#2563eb] outline-none resize-none transition-colors"
        />

        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square">
                <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-[#323238]" />
                <button onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 h-6 w-6 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors">
                  <X size={12} />
                </button>
              </div>
            ))}
            {files.length < MAX_IMAGES && (
              <button onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-[#323238] hover:border-[#2563eb]/60 flex flex-col items-center justify-center text-gray-500 hover:text-gray-300 transition-colors">
                <Plus size={20} />
                <span className="text-[10px] mt-1">{files.length}/{MAX_IMAGES}</span>
              </button>
            )}
          </div>
        )}

        {previews.length === 0 && (
          <button onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-[#29292e] border border-[#323238] hover:border-[#2563eb]/60 text-sm text-gray-300 transition-colors">
            {uploading ? <Spinner size="sm" /> : <ImageIcon size={16} />}
            Adicionar fotos
          </button>
        )}

        <input ref={inputRef} type="file" multiple accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif" className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = '' }} />

        <p className="text-gray-600 text-[10px] text-right">{caption.length}/2000</p>
      </div>
    </Modal>
  )
}
