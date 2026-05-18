// Hook utilitário para mostrar erros do Frappe num modal padrão.
//
// Uso:
//   const errorModal = useErrorModal()
//   try { await salvarDieta(id, payload) }
//   catch (err) { errorModal.show(err, 'Salvar dieta') }
//
//   return (
//     <>
//       ...
//       {errorModal.element}
//     </>
//   )
import { useCallback, useState, createElement } from 'react'
import ErrorModal from '../components/ui/ErrorModal'
import { parseFrappeErrorDetail } from '../utils/frappeErrors'

export default function useErrorModal() {
  const [state, setState] = useState({ open: false, detail: null, context: '' })

  const show = useCallback((errorOrDetail, context = '') => {
    // Aceita tanto um Error do axios quanto um detail já parseado
    const detail = errorOrDetail?.messages && errorOrDetail?.type
      ? errorOrDetail
      : parseFrappeErrorDetail(errorOrDetail)
    // Sempre logar pra debug — não substitui o console.error do dev
    console.error(`[${context || 'erro'}]`, errorOrDetail, detail)
    setState({ open: true, detail, context })
  }, [])

  const close = useCallback(() => {
    setState(s => ({ ...s, open: false }))
  }, [])

  const element = createElement(ErrorModal, {
    open: state.open,
    onClose: close,
    detail: state.detail,
    context: state.context,
  })

  return { show, close, element, isOpen: state.open }
}
