import SecaoDivider from './SecaoDivider'
import CampoLabel from './CampoLabel'
import CampoTexto from './CampoTexto'
import CampoSelect from './CampoSelect'
import CampoChecks from './CampoChecks'
import CampoRating from './CampoRating'
import CampoInt from './CampoInt'
import CampoImagem from './CampoImagem'
import CampoBlocoHTML from './CampoBlocoHTML'

const isSecao = (t) => t === 'Quebra de Seção' || t === 'Quebra de Sessão' || t === 'Section Break'
const isHTML = (t) => t === 'Bloco HTML' || t === 'HTML'
const isImagem = (t) => t === 'Anexar Imagem' || t === 'Attach Image'
const isSelect = (t) => t === 'Select' || t === 'Seleção'
const isChecks = (t) => t === 'Checks' || t === 'Múltipla Escolha'
const isRating = (t) => t === 'Rating' || t === 'Avaliação'
const isInt = (t) => t === 'Int' || t === 'Número'

// Renderiza uma lista de perguntas (formato child table do Frappe).
// perguntas: array de { pergunta, tipo, opcoes, reqd, conteudo_html, resposta }
// onChange: (idx, valor) => void
// uploadFn: usado pelos campos do tipo Anexar Imagem
export default function FormularioRespostas({ perguntas, onChange, uploadFn }) {
  return (
    <div className="flex flex-col gap-2.5">
      {perguntas.map((item, idx) => {
        if (isSecao(item.tipo)) {
          return <SecaoDivider key={idx} titulo={item.pergunta} />
        }
        if (isHTML(item.tipo)) {
          return <CampoBlocoHTML key={idx} html={item.conteudo_html || item.pergunta} />
        }

        const opcoes = String(item.opcoes || '').split('\n').map(s => s.trim()).filter(Boolean)
        const obrigatoria = Number(item.reqd) === 1

        return (
          <div
            key={idx}
            data-pergunta-idx={idx}
            className="bg-[#0a0a0c] border border-[#1c1c22] rounded-2xl px-4 py-4"
          >
            <CampoLabel obrigatorio={obrigatoria}>{item.pergunta}</CampoLabel>

            {isImagem(item.tipo) ? (
              <CampoImagem
                value={item.resposta}
                onChange={(v) => onChange(idx, v)}
                uploadFn={uploadFn}
              />
            ) : isSelect(item.tipo) ? (
              <CampoSelect value={item.resposta} onChange={(v) => onChange(idx, v)} opcoes={opcoes} />
            ) : isChecks(item.tipo) ? (
              <CampoChecks value={item.resposta} onChange={(v) => onChange(idx, v)} opcoes={opcoes} />
            ) : isRating(item.tipo) ? (
              <CampoRating value={item.resposta} onChange={(v) => onChange(idx, v)} />
            ) : isInt(item.tipo) ? (
              <CampoInt value={item.resposta} onChange={(v) => onChange(idx, v)} />
            ) : (
              <CampoTexto value={item.resposta} onChange={(v) => onChange(idx, v)} />
            )}
          </div>
        )
      })}
    </div>
  )
}

