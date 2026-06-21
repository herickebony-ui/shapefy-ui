import { useState, useEffect, useCallback } from 'react'
import { Send, EyeOff, Pencil, Trash2, X, Check } from 'lucide-react'
import { Spinner } from '../ui'
import useAuthSrc from '../../hooks/useAuthSrc'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const fmtTempo = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function CommentAvatar({ foto, nome }) {
  const src = useAuthSrc(foto ? `${FRAPPE_URL}${foto}` : null)
  if (src) return <img src={src} alt="" className="w-7 h-7 rounded-full object-cover border border-[#323238] shrink-0" />
  return (
    <div className="w-7 h-7 rounded-full bg-[#29292e] flex items-center justify-center text-gray-400 text-[10px] font-bold shrink-0">
      {(nome || '?')[0].toUpperCase()}
    </div>
  )
}

export default function ComentarioSection({ postName, onComment, onHideComment, onEditComment, onDeleteComment, commentApi }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  const load = useCallback(async (nextCursor) => {
    setLoading(true)
    try {
      const res = await commentApi(postName, { cursor: nextCursor, limit: 20 })
      if (nextCursor) {
        setComments(prev => [...prev, ...(res.comments || [])])
      } else {
        setComments(res.comments || [])
      }
      setHasMore(res.has_more || false)
      if (res.comments?.length) {
        setCursor(res.comments[res.comments.length - 1].creation)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [postName, commentApi])

  useEffect(() => { load(null) }, [load])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await onComment(text.trim())
      setText('')
      load(null)
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  const handleHide = async (commentName) => {
    if (!onHideComment) return
    try {
      await onHideComment(commentName)
      setComments(prev => prev.filter(c => c.name !== commentName))
    } catch { /* ignore */ }
  }

  const handleEditSave = async (commentName) => {
    if (!editText.trim() || !onEditComment) return
    try {
      await onEditComment(commentName, editText.trim())
      setComments(prev => prev.map(c => c.name === commentName ? { ...c, text: editText.trim() } : c))
      setEditingId(null)
    } catch { /* ignore */ }
  }

  const handleDeleteComment = async (commentName) => {
    if (!confirm('Excluir este comentário?') || !onDeleteComment) return
    try {
      await onDeleteComment(commentName)
      setComments(prev => prev.filter(c => c.name !== commentName))
    } catch { /* ignore */ }
  }

  return (
    <div className="border-t border-[#323238]/50">
      {loading && comments.length === 0 ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          {comments.map(c => (
            <div key={c.name} className="flex gap-2.5 px-4 py-2 group">
              <CommentAvatar foto={c.author_foto} nome={c.author_nome} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-white text-xs font-semibold">{c.author_nome}</span>
                  <span className="text-gray-600 text-[10px]">{fmtTempo(c.creation)}</span>
                  <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {c.is_mine && onEditComment && (
                      <button onClick={() => { setEditingId(c.name); setEditText(c.text) }}
                        className="text-gray-600 hover:text-gray-300" title="Editar">
                        <Pencil size={11} />
                      </button>
                    )}
                    {c.is_mine && onDeleteComment && (
                      <button onClick={() => handleDeleteComment(c.name)}
                        className="text-gray-600 hover:text-red-400" title="Excluir">
                        <Trash2 size={11} />
                      </button>
                    )}
                    {onHideComment && !c.is_mine && (
                      <button onClick={() => handleHide(c.name)}
                        className="text-gray-600 hover:text-red-400" title="Ocultar">
                        <EyeOff size={11} />
                      </button>
                    )}
                  </div>
                </div>
                {editingId === c.name ? (
                  <div className="mt-1">
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEditSave(c.name)}
                      className="w-full bg-[#29292e] border border-[#323238] rounded px-2 py-1 text-xs text-white focus:border-[#2563eb] outline-none"
                      maxLength={1000}
                      autoFocus
                    />
                    <div className="flex gap-1 mt-1 justify-end">
                      <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white"><X size={12} /></button>
                      <button onClick={() => handleEditSave(c.name)} className="text-[#2563eb] hover:text-blue-300"><Check size={12} /></button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300 text-xs leading-relaxed mt-0.5">{c.text}</p>
                )}
              </div>
            </div>
          ))}
          {hasMore && (
            <button onClick={() => load(cursor)}
              className="w-full text-center py-2 text-[#2563eb] text-xs font-medium hover:underline">
              Carregar mais
            </button>
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[#323238]/50">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Escreva um comentário..."
          className="flex-1 bg-[#29292e] border border-[#323238] rounded-lg px-3 h-9 text-sm text-white placeholder-gray-500 focus:border-[#2563eb] outline-none transition-colors"
          maxLength={1000}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#2563eb] text-white disabled:opacity-40 transition-opacity shrink-0">
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
