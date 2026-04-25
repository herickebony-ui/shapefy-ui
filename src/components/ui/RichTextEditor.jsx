import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, List, ListOrdered, Quote, Code,
  Link as LinkIcon, Undo2, Redo2, Eraser,
} from 'lucide-react'
import { useEffect } from 'react'

const ToolbarButton = ({ onClick, active, disabled, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`h-7 w-7 flex items-center justify-center rounded transition-colors shrink-0
      ${active
        ? 'bg-[#2563eb] text-white'
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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-[#60a5fa] underline' },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html === '<p></p>' ? '' : html)
    },
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none px-3 py-2.5 text-sm text-white min-w-0',
        style: `min-height: ${minHeight}px;`,
      },
    },
  })

  // Sync external value changes (ex: load existing form)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const incoming = value || ''
    if (incoming !== current && incoming !== '<p></p>') {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  const addLink = () => {
    const previous = editor.getAttributes('link').href
    const url = window.prompt('URL do link:', previous || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="border border-[#323238] rounded-lg bg-[#1a1a1a] overflow-hidden focus-within:border-[#2563eb]/60 transition-colors">
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-[#323238] bg-[#222226]">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Título 1"
        ><Heading1 size={13} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Título 2"
        ><Heading2 size={13} /></ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Negrito"
        ><Bold size={13} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Itálico"
        ><Italic size={13} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Sublinhado"
        ><UnderlineIcon size={13} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Tachado"
        ><Strikethrough size={13} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Código inline"
        ><Code size={13} /></ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Lista com marcadores"
        ><List size={13} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Lista numerada"
        ><ListOrdered size={13} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Citação"
        ><Quote size={13} /></ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          onClick={addLink}
          active={editor.isActive('link')}
          title="Inserir link"
        ><LinkIcon size={13} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Limpar formatação"
        ><Eraser size={13} /></ToolbarButton>

        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Desfazer"
          ><Undo2 size={13} /></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Refazer"
          ><Redo2 size={13} /></ToolbarButton>
        </div>
      </div>

      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  )
}
