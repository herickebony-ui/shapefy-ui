import { ImageUploadResposta } from '../../ui'

// Wrapper do ImageUploadResposta com tamanho compacto (180x180) centralizado,
// pra não ocupar a tela toda em formulários longos.
export default function CampoImagem({ value, onChange, uploadFn }) {
  return (
    <div className="flex justify-start">
      <div className="w-44 max-w-full">
        <ImageUploadResposta value={value || ''} onChange={onChange} uploadFn={uploadFn} />
      </div>
    </div>
  )
}
