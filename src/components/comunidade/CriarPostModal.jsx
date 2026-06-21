import { useState, useRef } from 'react'
import { Image as ImageIcon, X, Upload } from 'lucide-react'
import { Modal, Button, Spinner } from '../ui'
import { uploadImagemComunidade } from '../../api/comunidade'
import { toRenderableImage } from '../../utils/heicToJpeg'
import useErrorModal from '../../hooks/useErrorModal'

export default function CriarPostModal({ isOpen, onClose, onSubmit, asyncMode }) {
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)
  const errorModal = useErrorModal()

  const handleFile = async (f) => {
    if (!f) return
    const ehImagem = f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name || '')
    if (!ehImagem) {
      errorModal.show({ type: 'validation', title: 'Arquivo inválido', messages: ['Envie apenas imagens (PNG, JPG, WEBP, HEIC).'], statusCode: 0 }, 'Upload')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      errorModal.show({ type: 'validation', title: 'Arquivo muito grande', messages: ['Máximo 10MB.'], statusCode: 0 }, 'Upload')
      return
    }
    const preparado = await toRenderableImage(f)
    setFile(preparado)
    setPreview(URL.createObjectURL(preparado))
  }

  const removeImage = () => {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
  }

  const handleSubmit = async () => {
    if (!caption.trim() && !file) return

    if (asyncMode && file) {
      const captionTrimmed = caption.trim()
      const rawFile = file
      setCaption('')
      removeImage()
      onClose()
      onSubmit({ caption: captionTrimmed, file: rawFile })
      return
    }

    setSubmitting(true)
    try {
      let imageUrl = null
      if (file) {
        setUploading(true)
        imageUrl = await uploadImagemComunidade(file)
        setUploading(false)
      }
      await onSubmit({ caption: caption.trim(), imagem: imageUrl })
      setCaption('')
      removeImage()
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
            loading={submitting} disabled={(!caption.trim() && !file) || submitting}>
            Publicar
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

        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preview" className="max-h-64 rounded-lg border border-[#323238] w-full object-cover" />
            <button onClick={removeImage}
              className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-[#29292e] border border-[#323238] hover:border-[#2563eb]/60 text-sm text-gray-300 transition-colors">
            {uploading ? <Spinner size="sm" /> : <ImageIcon size={16} />}
            Adicionar foto
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif" className="hidden"
          onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} />

        <p className="text-gray-600 text-[10px] text-right">{caption.length}/2000</p>
      </div>
    </Modal>
  )
}
