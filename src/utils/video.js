// Extrai ID curto de URLs de vídeo (YouTube, Vimeo, Instagram).
// Aceita também IDs já curtos — retorna como veio se não bater nenhuma regex.

const PATTERNS = [
  // YouTube
  { plataforma: 'YouTube',   regex: /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/i },
  // Vimeo
  { plataforma: 'Vimeo',     regex: /vimeo\.com\/(?:video\/)?(\d+)/i },
  // Instagram (reels/posts/tv)
  { plataforma: 'Instagram', regex: /instagram\.com\/(?:reel|p|tv)\/([\w-]+)/i },
]

/**
 * @param {string} url URL ou ID
 * @returns {{ id: string, plataforma: string|null }}
 */
export function extractVideoId(url) {
  if (!url) return { id: '', plataforma: null }
  const trimmed = String(url).trim()
  for (const { plataforma, regex } of PATTERNS) {
    const m = trimmed.match(regex)
    if (m) return { id: m[1], plataforma }
  }
  // Não bateu nenhuma regex: provavelmente já é um ID puro ou URL sem padrão
  return { id: trimmed, plataforma: null }
}
