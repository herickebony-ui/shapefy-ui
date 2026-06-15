import { useState, useRef } from 'react'
import { Upload, Trash2, Camera } from 'lucide-react'
import client from '../../api/client'
import { cropImgStyle } from './ModeloCropper'
import useErrorModal from '../../hooks/useErrorModal'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

// Upload de foto de um slot (público, sem optimize — qualidade original p/ comparação).
// `modelo`: URL de uma foto de exemplo; quando o slot está vazio, aparece como guia
// (dimmed) pro usuário saber qual pose/ângulo preencher.
export default function FotoSlotUpload({ label, value, onChange, modelo = '', modeloCrop = '' }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)
  const errorModal = useErrorModal()

  const enviarArquivo = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      errorModal.show({ type: 'validation', title: 'Arquivo inválido', messages: ['Envie apenas imagens (PNG, JPG, WEBP).'], statusCode: 0 }, 'Upload de foto')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('is_private', '0')
      fd.append('optimize', '0')
      const res = await client.post('/api/method/upload_file', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const url = res.data?.message?.file_url
      if (url) onChange(url)
    } catch (err) {
      errorModal.show(err, 'Upload de foto')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setDragOver(false)
    if (uploading) return
    await enviarArquivo(e.dataTransfer.files?.[0])
  }

  const preview = value ? `${FRAPPE_URL}${value}` : null
  const modeloUrl = modelo ? `${FRAPPE_URL}${modelo}` : null

  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg p-2 space-y-2">
      {errorModal.element}
      {label && <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 truncate">{label}</p>}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true) }}
        onDragEnter={(e) => { e.preventDefault(); if (!uploading) setDragOver(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false) }}
        onDrop={handleDrop}
        className={`relative aspect-square w-full rounded-lg border border-dashed overflow-hidden cursor-pointer transition-colors flex items-center justify-center
          ${dragOver ? 'border-[#2563eb] bg-[#2563eb]/10' : 'border-[#323238] bg-[#0a0a0a] hover:border-[#2563eb]/50'}`}
      >
        {uploading ? (
          <span className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
        ) : preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            {dragOver && (
              <div className="absolute inset-0 bg-[#2563eb]/40 flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-widest">
                Solte para substituir
              </div>
            )}
          </>
        ) : modeloUrl ? (
          <>
            <img src={modeloUrl} alt="modelo" draggable={false} style={cropImgStyle(modeloCrop)} className="opacity-30" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-300">
              <Camera size={18} />
              <span className="text-[9px] font-bold uppercase tracking-widest bg-black/50 px-1.5 py-0.5 rounded">modelo</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-gray-600 px-2 text-center">
            <Camera size={20} />
            <span className="text-[10px] leading-tight">{dragOver ? 'Solte aqui' : 'Clique ou arraste'}</span>
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
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; enviarArquivo(f) }} />
    </div>
  )
}
