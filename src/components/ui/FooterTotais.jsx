// Props: variant ('groups'|'inline'), sticky,
//        leftGroup  {label, items: [{label, shortLabel?, value, highlight?}]}
//        rightGroup {label, items: [{label, shortLabel?, value, shortLabel?}]}
// Mobile: 2 linhas (leftGroup / rightGroup). Desktop: 1 linha com separador.
export default function FooterTotais({
  variant = 'groups',
  leftGroup,
  rightGroup,
  sticky = true,
}) {
  if (variant === 'groups') {
    const renderItem = (item, i, muted = false) =>
      item.highlight ? (
        <span key={i} className="bg-[rgba(133,0,0,0.15)] border border-[rgba(133,0,0,0.3)] rounded-md px-2 py-0.5 text-[10px] md:text-[11px]">
          <strong className="text-[#f87171]">
            <span className="hidden md:inline">{item.label}</span>
            <span className="md:hidden">{item.shortLabel || item.label}</span>
            : {item.value}
          </strong>
        </span>
      ) : (
        <span key={i} className={`text-[10px] md:text-[11px] ${muted ? 'text-gray-400' : 'text-gray-300'}`}>
          <strong className="text-white">
            <span className="hidden md:inline">{item.label}</span>
            <span className="md:hidden">{item.shortLabel || item.label}</span>:
          </strong>{' '}{item.value}
        </span>
      )

    return (
      <div className={`bg-[#0a0a0a] border border-[#323238] rounded-lg w-fit mx-auto ${sticky ? 'sticky bottom-4 z-30' : ''}`}>
        {/* Mobile: 2 linhas */}
        <div className="md:hidden px-4 py-2 space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            {leftGroup?.label && (
              <span className="text-gray-500 font-bold tracking-wider uppercase text-[9px]">{leftGroup.label}:</span>
            )}
            {leftGroup?.items?.map((item, i) => renderItem(item, i))}
          </div>
          {rightGroup && (
            <div className="flex items-center gap-2.5 flex-wrap">
              {rightGroup?.label && (
                <span className="text-gray-500 font-bold tracking-wider uppercase text-[9px]">{rightGroup.label}:</span>
              )}
              {rightGroup?.items?.map((item, i) => renderItem(item, i, true))}
            </div>
          )}
        </div>

        {/* Desktop: 1 linha */}
        <div className="hidden md:flex items-center gap-4 px-5 py-3 whitespace-nowrap">
          <div className="flex items-center gap-4">
            {leftGroup?.label && (
              <span className="text-gray-500 font-bold tracking-wider uppercase text-[10px]">{leftGroup.label}</span>
            )}
            {leftGroup?.items?.map((item, i) => renderItem(item, i))}
          </div>
          {rightGroup && (
            <>
              <div className="w-px h-4 bg-[#323238] shrink-0" />
              <div className="flex items-center gap-4">
                {rightGroup?.label && (
                  <span className="text-gray-500 font-bold tracking-wider uppercase text-[10px]">{rightGroup.label}</span>
                )}
                {rightGroup?.items?.map((item, i) => renderItem(item, i, true))}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // variant="inline" — aguardando print da ficha de treino
  return null
}
