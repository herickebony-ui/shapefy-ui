// Template para formulários com stepper opcional
// Props: title, subtitle, steps [{id,label}], activeStep, onStepChange,
//        onSubmit, onCancel, submitLabel, loading, children
import { Button } from '../ui'

function Stepper({ steps, activeIdx }) {
  if (!steps?.length) return null

  return (
    <>
      {/* Desktop: full stepper */}
      <div className="hidden sm:flex items-center gap-0 mb-8">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  i < activeIdx
                    ? 'bg-[#2563eb]/30 border border-[#2563eb] text-[#f87171]'
                    : i === activeIdx
                      ? 'bg-[#2563eb] text-white'
                      : 'bg-[#29292e] border border-[#323238] text-gray-500'
                }`}
              >
                {i < activeIdx ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${i === activeIdx ? 'text-white' : i < activeIdx ? 'text-[#f87171]' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${i < activeIdx ? 'bg-[#2563eb]/40' : 'bg-[#323238]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Mobile: current step indicator */}
      <div className="sm:hidden flex items-center gap-2 mb-6">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === activeIdx ? 'w-6 bg-[#2563eb]' : 'w-1.5 bg-[#323238]'}`}
            />
          ))}
        </div>
        <span className="text-gray-400 text-xs ml-1">
          Passo {activeIdx + 1} de {steps.length}: {steps[activeIdx]?.label}
        </span>
      </div>
    </>
  )
}

export default function FormPage({
  title,
  subtitle,
  steps,
  activeStep,
  onStepChange,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
  loading = false,
  children,
}) {
  const activeIdx = steps ? steps.findIndex(s => s.id === activeStep) : -1
  const isFirst = activeIdx <= 0
  const isLast = !steps || activeIdx >= steps.length - 1

  const handleNext = () => {
    if (isLast) onSubmit?.()
    else onStepChange?.(steps[activeIdx + 1].id)
  }

  const handleBack = () => {
    if (isFirst) onCancel?.()
    else onStepChange?.(steps[activeIdx - 1].id)
  }

  return (
    <div className="p-4 md:p-8 text-white min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
      </div>

      {/* Stepper */}
      {steps && <Stepper steps={steps} activeIdx={activeIdx} />}

      {/* Content */}
      <div className="mb-8">
        {children}
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 border-t border-[#323238] pt-6">
        <Button variant="ghost" onClick={handleBack} disabled={loading}>
          {isFirst ? 'Cancelar' : '← Voltar'}
        </Button>
        <Button variant="primary" onClick={handleNext} loading={loading} fullWidth={false}>
          {isLast ? submitLabel : `Salvar e continuar →`}
        </Button>
      </div>
    </div>
  )
}
