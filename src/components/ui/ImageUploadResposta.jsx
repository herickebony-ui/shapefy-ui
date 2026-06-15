import { useRef, useState } from 'react'
import { Image as ImageIcon, RotateCw, Trash2, Upload } from 'lucide-react'
import useErrorModal from '../../hooks/useErrorModal'
import { toRenderableImage } from '../../utils/heicToJpeg'
import HeicSafeImg from './HeicSafeImg'
import { cropImgStyle } from '../evolucao/ModeloCropper'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

// Drop zone de imagem reutilizável.
// value: file_url salva (ex: "/files/xxx.jpg"); '' / null = sem imagem.
// onChange(file_url|''): chamado após upload OK ou remoção.
// uploadFn(file)=>file_url: função obrigatória que faz o POST e retorna a URL.
// onRotate(): opcional. Se passada, mostra botão de rotacionar.
// label: texto opcional acima do drop zone.
// onMultipleSelected(files[]): opcional. Quando o aluno seleciona varias fotos
//   de uma vez na galeria, dispara esse callback (em vez de usar a primeira).
//   O orquestrador (form) abre um modal de distribuicao das fotos pelos slots.
// O input usa `multiple` por padrao — em iOS isso forca o picker a ir direto na
// galeria (sem opcao de camera), atendendo ao requisito de "so galeria".
export default function ImageUploadResposta({ value, onChange, uploadFn, onRotate, label, disabled, onMultipleSelected, modelo, modeloCrop }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [rotateBust, setRotateBust] = useState(0)
  const inputRef = useRef(null)
  const errorModal = useErrorModal()

  const enviar = async (file) => {
    if (!file) return
    const ehImagem = file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name || '')
    if (!ehImagem) {
      errorModal.show({
        type: 'validation',
        title: 'Arquivo inválido',
        messages: ['Envie apenas arquivos de imagem (PNG, JPG, WEBP, HEIC).'],
        statusCode: 0,
      }, 'Upload de imagem')
      return
    }
    setUploading(true)
    try {
      const preparado = await toRenderableImage(file) // HEIC do iPhone -> JPEG
      const url = await uploadFn(preparado)
      if (url) onChange(url)
      else errorModal.show({
        type: 'server',
        title: 'Upload incompleto',
        messages: ['O servidor não retornou a URL do arquivo.'],
        statusCode: 0,
      }, 'Upload de imagem')
    } catch (err) {
      errorModal.show(err, 'Upload de imagem')
    } finally {
      setUploading(false)
    }
  }

  const handleInput = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    if (files.length > 1 && onMultipleSelected) {
      onMultipleSelected(files)
      return
    }
    await enviar(files[0])
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setDragOver(false)
    if (uploading || disabled) return
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length === 0) return
    if (files.length > 1 && onMultipleSelected) {
      onMultipleSelected(files)
      return
    }
    await enviar(files[0])
  }

  const handleRotate = async () => {
    if (!onRotate || rotating) return
    setRotating(true)
    try {
      await onRotate()
      setRotateBust(Date.now())
    } catch (err) {
      errorModal.show(err, 'Rotação de imagem')
    } finally {
      setRotating(false)
    }
  }

  const preview = value
    ? `${FRAPPE_URL}${encodeURI(value)}${rotateBust ? `?v=${rotateBust}` : ''}`
    : null

  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-xl p-3 space-y-2">
      {errorModal.element}
      {label && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
      )}
      <div
        onClick={() => !uploading && !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!uploading && !disabled) setDragOver(true) }}
        onDragEnter={(e) => { e.preventDefault(); if (!uploading && !disabled) setDragOver(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false) }}
        onDrop={handleDrop}
        className={`relative aspect-square w-full rounded-lg border border-dashed overflow-hidden flex items-center justify-center transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${dragOver
            ? 'border-[#2563eb] bg-[#2563eb]/10'
            : 'border-[#323238] bg-[#0a0a0a] hover:border-[#2563eb]/50'
          }`}
      >
        {uploading ? (
          <span className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
        ) : preview ? (
          <>
            <HeicSafeImg src={preview} alt={label || 'foto'} className="w-full h-full object-cover" />
            {dragOver && (
              <div className="absolute inset-0 bg-[#2563eb]/40 flex items-center justify-center text-white text-xs font-bold uppercase tracking-widest">
                Solte para substituir
              </div>
            )}
          </>
        ) : modelo ? (
          <>
            <img src={`${FRAPPE_URL}${encodeURI(modelo)}`} alt="modelo" draggable={false} style={cropImgStyle(modeloCrop)} className="opacity-75" />
            <div className="absolute inset-0 bg-black/15 flex flex-col items-center justify-center gap-1 text-center px-3">
              <span className="text-yellow-400 text-sm font-extrabold uppercase tracking-widest [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">Modelo</span>
              <span className="text-white text-[11px] leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{dragOver ? 'Solte aqui' : 'Toque para enviar a sua'}</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500 px-4 text-center">
            <ImageIcon size={28} />
            <span className="text-xs leading-tight">
              {dragOver ? 'Solte aqui' : 'Toque para escolher da galeria'}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={uploading || disabled}
          onClick={() => inputRef.current?.click()}
          className="flex-1 h-10 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-300 hover:text-white border border-[#323238] hover:border-[#2563eb] rounded-lg transition-colors disabled:opacity-40"
        >
          <Upload size={13} /> {value ? 'Trocar' : 'Enviar foto'}
        </button>
        {value && onRotate && (
          <button
            type="button"
            disabled={uploading || rotating || disabled}
            onClick={handleRotate}
            title="Rotacionar"
            className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors disabled:opacity-40"
          >
            {rotating
              ? <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <RotateCw size={13} />}
          </button>
        )}
        {value && (
          <button
            type="button"
            disabled={uploading || disabled}
            onClick={() => onChange('')}
            title="Remover foto"
            className="h-10 w-10 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors disabled:opacity-40"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={handleInput}
      />
    </div>
  )
}
