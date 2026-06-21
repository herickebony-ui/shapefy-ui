// Helpers de drag-and-drop de linhas de <table> com @hello-pangea/dnd.
// Compartilhado entre Fichas (tabelas de treino) e DietaDetalhe (tabela de alimentos).

// Reordena no padrão @hello-pangea/dnd: destination.index já é o índice final.
export const reorderList = (list, from, to) => {
  const a = [...list]
  const [m] = a.splice(from, 1)
  a.splice(to, 0, m)
  return a
}

// Uma <tr> em drag vira position:fixed e as <td> colapsam pra largura do conteúdo.
// Travamos a largura de cada célula ANTES do drag começar (onBeforeDragStart).
export const lockRowWidths = (start) => {
  const row = document.querySelector(`[data-rfd-draggable-id="${start.draggableId}"]`)
  if (!row) return
  Array.from(row.children).forEach(td => {
    const w = td.getBoundingClientRect().width
    td.dataset.dndLock = '1'
    td.style.width = td.style.minWidth = td.style.maxWidth = `${w}px`
  })
}

export const unlockRowWidths = () => {
  document.querySelectorAll('td[data-dnd-lock="1"]').forEach(td => {
    td.style.width = td.style.minWidth = td.style.maxWidth = ''
    delete td.dataset.dndLock
  })
}

// Estilo da <tr> flutuante: mantém o layout de tabela enquanto está sendo arrastada.
// Transição de arraste reduzida a 0.05s pra resposta imediata.
export const dragRowStyle = (provided, snapshot) => {
  if (snapshot.isDropAnimating) {
    // transitionDuration mínimo — não usar 'none': mataria o transitionend e o
    // @hello-pangea/dnd ficaria preso em DROP_ANIMATING, travando o próximo arraste.
    return { ...provided.draggableProps.style, transitionDuration: '0.001s' }
  }
  const base = {
    ...provided.draggableProps.style,
    ...(snapshot.isDragging ? { display: 'table', background: '#202024' } : {}),
  }
  if (typeof base.transition === 'string') {
    base.transition = base.transition.replace(/([\d.]+)s/g, '0.05s')
  }
  return base
}

// Cria o handler de onDragEnd: destrava larguras e aplica a nova ordem.
export const makeOnDragEnd = (list, apply) => (result) => {
  unlockRowWidths()
  if (!result.destination || result.destination.index === result.source.index) return
  apply(reorderList(list, result.source.index, result.destination.index))
}
