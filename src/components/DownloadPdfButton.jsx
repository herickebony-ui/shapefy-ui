import { FileDown } from 'lucide-react'
import { Button } from './ui'

const PRINT_BASE = 'https://shapefy.online/print'

const PATH_BY_ENTITY = {
  ficha: 'ficha',
  dieta: 'dieta',
  prescricao: 'prescricao',
}

export default function DownloadPdfButton({ entity, name, size = 'sm', children = 'Baixar PDF' }) {
  if (!name) return null
  const path = PATH_BY_ENTITY[entity]
  if (!path) return null

  const url = `${PRINT_BASE}/${path}?name=${encodeURIComponent(name)}`
  const open = () => window.open(url, '_blank', 'noopener,noreferrer')

  return (
    <Button variant="secondary" size={size} icon={FileDown} onClick={open}>
      {children}
    </Button>
  )
}
