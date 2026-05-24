import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code,
  Link as LinkIcon, Undo2, Redo2, Eraser, Palette,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import FormGroup from './FormGroup'
import Input from './Input'

// Extensão custom de tamanho de fonte (marca inline).
// Estende TextStyle pra adicionar atributo `fontSize` — aplica em <span style="font-size:...">
// só na seleção do usuário (sem virar bloco).
const TextStyleWithFontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: el => el.style.fontSize?.replace(/['"]+/g, '') || null,
        renderHTML: attrs => {
          if (!attrs.fontSize) return {}
          return { style: `font-size: ${attrs.fontSize}` }
        },
      },
    }
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setFontSize: (fontSize) => ({ chain }) =>
        chain().setMark(this.name, { fontSize }).run(),
      unsetFontSize: () => ({ chain }) =>
        chain().setMark(this.name, { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
})

const TAMANHOS = [
  { value: '12px', label: 'Pequeno' },
  { value: '14px', label: 'Normal' },
  { value: '18px', label: 'Médio' },
  { value: '24px', label: 'Grande' },
  { value: '32px', label: 'Enorme' },
]

const ToolbarButton = ({ onClick, active, disabled, title, children }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors shrink-0
      ${active
        ? 'bg-[#2563eb] text-white shadow-[0_0_8px_rgba(37,99,235,0.4)]'
        : 'text-gray-400 hover:text-white hover:bg-[#323238]'
      }
      disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400
    `}
  >
    {children}
  </button>
)

const ToolbarSep = () => <div className="w-px h-5 bg-[#323238] mx-1 shrink-0" />

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Digite o conteúdo...',
  minHeight = 200,
}) {
  const updatingFromEditor = useRef(false)

  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const colorInputRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyleWithFontSize,
      Color.configure({ types: ['textStyle'] }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-[#60a5fa] underline', target: '_blank', rel: 'noopener noreferrer' },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      updatingFromEditor.current = true
      const html = editor.getHTML()
      onChange?.(html === '<p></p>' ? '' : html)
      queueMicrotask(() => { updatingFromEditor.current = false })
    },
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none px-3 py-2.5 text-sm text-white min-w-0',
        style: `min-height: ${minHeight}px;`,
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    if (updatingFromEditor.current) return
    const current = editor.getHTML()
    const incoming = value || ''
    if (incoming !== current && incoming !== '<p></p>') {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  const abrirModalLink = () => {
    const previous = editor.getAttributes('link').href || ''
    const selecionado = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ')
    setLinkUrl(previous || 'https://')
    setLinkText(selecionado || '')
    setLinkOpen(true)
  }

  const confirmarLink = () => {
    if (!linkUrl || linkUrl === 'https://') {
      setLinkOpen(false)
      return
    }
    let url = linkUrl.trim()
    if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
      url = `https://${url}`
    }
    const chain = editor.chain().focus().extendMarkRange('link')
    if (editor.state.selection.empty && linkText) {
      chain.insertContent(`<a href="${url}">${linkText.replace(/[<>]/g, '')}</a>`).run()
    } else {
      chain.setLink({ href: url }).run()
    }
    setLinkOpen(false)
    setLinkUrl('')
    setLinkText('')
  }

  const removerLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkOpen(false)
  }

  const aplicarCor = (cor) => {
    editor.chain().focus().setColor(cor).run()
  }

  const aplicarTamanho = (size) => {
    if (!size) editor.chain().focus().unsetFontSize().run()
    else editor.chain().focus().setFontSize(size).run()
  }

  const corAtual = editor.getAttributes('textStyle')?.color || '#ffffff'
  const tamanhoAtual = editor.getAttributes('textStyle')?.fontSize || ''

  return (
    <>
      <div className="border border-[#323238] rounded-lg bg-[#1a1a1a] overflow-hidden focus-within:border-[#2563eb]/60 focus-within:shadow-[0_0_12px_rgba(37,99,235,0.15)] transition-all">
        <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-[#323238] bg-[#222226]">
          {/* Tamanho da fonte — select nativo, browser cuida do posicionamento */}
          <select
            value={tamanhoAtual}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => aplicarTamanho(e.target.value)}
            title="Tamanho do texto"
            className="h-8 px-2 text-xs font-medium rounded-md bg-transparent text-gray-300 hover:text-white hover:bg-[#323238] border-0 outline-none cursor-pointer transition-colors"
          >
            <option value="">Tamanho</option>
            {TAMANHOS.map(t => (
              <option key={t.value} value={t.value}>{t.label} ({t.value})</option>
            ))}
          </select>

          <ToolbarSep />

          {/* Marcações */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Negrito"
          ><Bold size={14} /></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Itálico"
          ><Italic size={14} /></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Sublinhado"
          ><UnderlineIcon size={14} /></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Tachado"
          ><Strikethrough size={14} /></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Código inline"
          ><Code size={14} /></ToolbarButton>

          <ToolbarSep />

          {/* Alinhamento */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Esquerda"
          ><AlignLeft size={14} /></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Centro"
          ><AlignCenter size={14} /></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Direita"
          ><AlignRight size={14} /></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            active={editor.isActive({ textAlign: 'justify' })}
            title="Justificado"
          ><AlignJustify size={14} /></ToolbarButton>

          <ToolbarSep />

          {/* Listas */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Lista com marcadores"
          ><List size={14} /></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Lista numerada"
          ><ListOrdered size={14} /></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Citação"
          ><Quote size={14} /></ToolbarButton>

          <ToolbarSep />

          {/* Cor */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => colorInputRef.current?.click()}
            title="Cor do texto"
            className="relative h-8 w-8 flex flex-col items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-[#323238] transition-colors shrink-0"
          >
            <Palette size={12} />
            <span
              className="block w-4 h-1 rounded-sm mt-0.5 border border-white/20"
              style={{ background: corAtual }}
            />
            <input
              ref={colorInputRef}
              type="color"
              value={corAtual}
              onChange={(e) => aplicarCor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              tabIndex={-1}
            />
          </button>
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetColor().run()}
            title="Remover cor"
          ><span className="text-[10px] font-bold">A</span></ToolbarButton>

          <ToolbarSep />

          {/* Link */}
          <ToolbarButton
            onClick={abrirModalLink}
            active={editor.isActive('link')}
            title="Inserir/editar link"
          ><LinkIcon size={14} /></ToolbarButton>

          {/* Limpar */}
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            title="Limpar formatação"
          ><Eraser size={14} /></ToolbarButton>

          <div className="ml-auto flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Desfazer"
            ><Undo2 size={14} /></ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Refazer"
            ><Redo2 size={14} /></ToolbarButton>
          </div>
        </div>

        <EditorContent editor={editor} placeholder={placeholder} />
      </div>

      {linkOpen && (
        <Modal
          isOpen
          onClose={() => setLinkOpen(false)}
          title="Inserir link"
          size="sm"
          footer={
            <>
              {editor.isActive('link') && (
                <Button variant="ghost" onClick={removerLink}>Remover link</Button>
              )}
              <Button variant="ghost" onClick={() => setLinkOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={confirmarLink}>Inserir</Button>
            </>
          }
        >
          <div className="p-4 space-y-3">
            <FormGroup label="URL" required>
              <Input
                value={linkUrl}
                onChange={setLinkUrl}
                placeholder="https://exemplo.com"
                autoFocus
              />
            </FormGroup>
            <FormGroup label="Texto do link" hint="Opcional. Se vazio, usa o texto selecionado.">
              <Input
                value={linkText}
                onChange={setLinkText}
                placeholder="Clique aqui"
              />
            </FormGroup>
          </div>
        </Modal>
      )}
    </>
  )
}
