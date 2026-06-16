import { ImageUploadResposta } from '../../ui'

// Wrapper do ImageUploadResposta com tamanho compacto (180x180) centralizado,
// pra não ocupar a tela toda em formulários longos.
// onMultipleSelected: opcional — quando o aluno seleciona varias fotos de uma
// vez, o orquestrador (FormularioRespostas) abre um modal de distribuicao.
export default function CampoImagem({ value, onChange, uploadFn, onMultipleSelected, modelo, modeloCrop, fullWidth }) {
  return (
    <div className="flex justify-start">
      <div className={fullWidth ? 'w-full' : 'w-44 max-w-full'}>
        <ImageUploadResposta
          value={value || ''}
          onChange={onChange}
          uploadFn={uploadFn}
          onMultipleSelected={onMultipleSelected}
          modelo={modelo}
          modeloCrop={modeloCrop}
        />
      </div>
    </div>
  )
}
