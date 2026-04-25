import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, List, ListOrdered, Quote, Code,
  Link as LinkIcon, Undo2, Redo2, Eraser, Palette,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const PALETTE = [
  ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'],
  ['#ffffff', '#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff'],
  ['#d1d5db', '#fca5a5', '#fdba74', '#fde047', '#86efac', '#93c5fd', '#d8b4fe'],
  ['#6b7280', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#9333ea'],
  ['#374151', '#7f1d1d', '#9a3412', '#854d0e', '#166534', '#1e40af', '#6b21a8'],
]

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
  const [colorOpen, setColorOpen] = useState(false)
  const colorRef = useRef(null)

  useEffect(() => {
    if (!colorOpen) return
    const handler = (e) => { if (!colorRef.current?.contains(e.target)) setColorOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colorOpen])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
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

        <div className="relative" ref={colorRef}>
          <button
            type="button"
            onClick={() => setColorOpen(v => !v)}
            title="Cor do texto"
            className={`h-7 w-7 flex flex-col items-center justify-center rounded transition-colors shrink-0
              ${colorOpen ? 'bg-[#323238]' : 'text-gray-400 hover:text-white hover:bg-[#323238]'}
            `}
          >
            <Palette size={11} className="text-gray-300" />
            <span
              className="block w-4 h-1 rounded-sm mt-0.5"
              style={{ background: editor.getAttributes('textStyle')?.color || '#ffffff' }}
            />
          </button>
          {colorOpen && (
            <div className="absolute top-full left-0 mt-1 z-20 p-2 bg-[#1a1a1a] border border-[#323238] rounded-lg shadow-xl">
              <div className="space-y-1">
                {PALETTE.map((row, ri) => (
                  <div key={ri} className="flex gap-1">
                    {row.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          editor.chain().focus().setColor(c).run()
                          setColorOpen(false)
                        }}
                        title={c}
                        className="w-5 h-5 rounded border border-[#323238] hover:scale-110 transition-transform"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetColor().run()
                  setColorOpen(false)
                }}
                className="mt-2 w-full text-[10px] uppercase tracking-wider text-gray-400 hover:text-white py-1 px-2 border border-[#323238] hover:border-gray-500 rounded transition-colors"
              >
                Cor padrão
              </button>
            </div>
          )}
        </div>

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
