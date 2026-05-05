// Botão + modal de importação de planilha Excel/CSV.
// Reusável para qualquer doctype.
//
// Props:
//   label (default: 'Importar Excel')
//   titulo (do modal, default: 'Importar planilha')
//   colunas: [{ key, label, obrigatoria? }] — key é o nome normalizado (lowercase, sem acento, _ entre palavras)
//   onImportar: async (rows) => { sucesso, ignoradas, erros } — recebe array de objetos já normalizados
//   helpText: texto custom abaixo da listagem de colunas (opcional)
//
// O modal:
//   1) Mostra a especificação de colunas com asterisco vermelho nas obrigatórias
//   2) Dropzone para selecionar .xlsx/.xls/.csv
//   3) Valida colunas obrigatórias
//   4) Mostra preview das primeiras 5 linhas
//   5) Botão "Importar" chama onImportar e mostra resultado
import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle2, HelpCircle, X, Download } from 'lucide-react'
import Button from './Button'
import Modal from './Modal'
import Spinner from './Spinner'
import { parseExcelFile, validarColunas } from '../../utils/excel'

export default function ImportExcelButton({
  label = 'Importar Excel',
  titulo = 'Importar planilha',
  colunas = [],
  onImportar,
  helpText,
  size = 'sm',
  variant = 'secondary',
}) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState([])
  const [erro, setErro] = useState('')
  const [colunasFaltando, setColunasFaltando] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const inputRef = useRef(null)

  const obrigatorias = colunas.filter((c) => c.obrigatoria).map((c) => c.key)

  const baixarModelo = () => {
    const headers = colunas.map((c) => c.key)
    const exemploRow = {}
    headers.forEach((h) => {
      const col = colunas.find((c) => c.key === h)
      exemploRow[h] = col?.exemplo || ''
    })
    const sheet = XLSX.utils.json_to_sheet([exemploRow], { header: headers })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'modelo')
    const slug = (titulo || 'planilha').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    XLSX.writeFile(wb, `modelo-${slug}.xlsx`)
  }

  const reset = () => {
    setRows([])
    setErro('')
    setColunasFaltando([])
    setResultado(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const abrir = () => { reset(); setOpen(true) }
  const fechar = () => { setOpen(false); setTimeout(reset, 200) }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErro('')
    setColunasFaltando([])
    setResultado(null)
    setCarregando(true)
    try {
      const parsed = await parseExcelFile(file)
      if (!parsed.length) {
        setErro('Planilha vazia.')
        setRows([])
        return
      }
      const { valido, faltando } = validarColunas(parsed, obrigatorias)
      if (!valido) {
        setColunasFaltando(faltando)
        setRows(parsed)
        return
      }
      setRows(parsed)
    } catch (err) {
      console.error(err)
      setErro('Erro ao ler planilha: ' + (err.message || err))
    } finally {
      setCarregando(false)
    }
  }

  const importar = async () => {
    if (!rows.length || colunasFaltando.length) return
    setImportando(true)
    try {
      const res = await onImportar(rows)
      setResultado(res || { sucesso: rows.length, ignoradas: 0, erros: [] })
    } catch (err) {
      console.error(err)
      setResultado({ sucesso: 0, ignoradas: 0, erros: [{ linha: 0, mensagem: err.message || String(err) }] })
    } finally {
      setImportando(false)
    }
  }

  const headers = rows.length ? Object.keys(rows[0]) : []
  const previewRows = rows.slice(0, 5)

  return (
    <>
      <Button
        variant={variant}
        size={size}
        icon={FileSpreadsheet}
        onClick={abrir}
      >
        {label}
      </Button>

      <Modal
        isOpen={open}
        onClose={importando ? undefined : fechar}
        title={titulo}
        size="xl"
        closeOnOverlayClick={!importando}
        footer={
          <>
            <Button variant="ghost" onClick={fechar} disabled={importando}>Fechar</Button>
            <Button
              variant="primary"
              icon={Upload}
              onClick={importar}
              loading={importando}
              disabled={!rows.length || colunasFaltando.length > 0 || !!resultado}
            >
              Importar {rows.length > 0 && !resultado ? `(${rows.length})` : ''}
            </Button>
          </>
        }
      >
        <div className="p-4 md:p-5 space-y-4">
          {/* Especificação de colunas */}
          <FormatoEsperado colunas={colunas} helpText={helpText} onBaixarModelo={baixarModelo} />

          {/* Dropzone / file input */}
          {!rows.length && !resultado && (
            <label className="block cursor-pointer">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onFile}
                className="sr-only"
              />
              <div className="border-2 border-dashed border-[#323238] hover:border-[#2563eb]/50 rounded-xl px-6 py-10 text-center transition-colors">
                {carregando ? (
                  <div className="flex flex-col items-center gap-2">
                    <Spinner />
                    <p className="text-gray-400 text-xs">Lendo planilha...</p>
                  </div>
                ) : (
                  <>
                    <Upload size={20} className="mx-auto text-gray-500 mb-2" />
                    <p className="text-white text-sm font-semibold">Clique pra escolher um arquivo</p>
                    <p className="text-gray-500 text-[11px] mt-1">aceita .xlsx, .xls e .csv</p>
                  </>
                )}
              </div>
            </label>
          )}

          {/* Erro genérico */}
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-xs">{erro}</p>
            </div>
          )}

          {/* Colunas obrigatórias faltando */}
          {colunasFaltando.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-300 text-xs font-bold">Faltam colunas obrigatórias na planilha:</p>
                  <ul className="text-red-200/80 text-[11px] mt-1 list-disc list-inside">
                    {colunasFaltando.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                onClick={reset}
                className="text-[11px] font-bold text-red-300 hover:text-white underline"
              >
                Escolher outro arquivo
              </button>
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && !colunasFaltando.length && !resultado && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Preview ({previewRows.length} de {rows.length} linhas)
                </p>
                <button
                  onClick={reset}
                  className="text-[11px] font-semibold text-gray-400 hover:text-white inline-flex items-center gap-1"
                >
                  <X size={11} /> Trocar arquivo
                </button>
              </div>
              <div className="border border-[#323238] rounded-xl overflow-x-auto bg-[#1a1a1a]">
                <table className="w-full text-xs">
                  <thead className="bg-[#111113] border-b border-[#323238]">
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} className={`border-b border-[#323238] last:border-0 ${i % 2 ? 'bg-[#1e1e22]' : 'bg-[#1a1a1a]'}`}>
                        {headers.map((h) => (
                          <td key={h} className="px-3 py-1.5 text-gray-300 whitespace-nowrap max-w-[220px] truncate" title={r[h]}>
                            {String(r[h] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resultado da importação */}
          {resultado && <ResultadoImportacao resultado={resultado} onFechar={fechar} />}
        </div>
      </Modal>
    </>
  )
}

function FormatoEsperado({ colunas, helpText, onBaixarModelo }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2563eb]">
          <HelpCircle size={11} /> Como formatar sua planilha
        </div>
        <button
          onClick={onBaixarModelo}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-300 hover:text-white border border-[#323238] hover:border-[#2563eb]/50 rounded-lg px-2.5 py-1 transition-colors"
        >
          <Download size={12} /> Baixar modelo de planilha
        </button>
      </div>

      <p className="text-gray-300 text-xs">
        A <strong className="text-white">primeira linha</strong> do Excel deve conter <strong className="text-white">exatamente</strong> os nomes destas colunas
        (sem acentos, em minúsculas, espaços trocados por <code className="bg-[#29292e] px-1 rounded text-[11px]">_</code>):
      </p>

      <div className="border border-[#323238] rounded-lg overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-[#29292e] border-b border-[#323238]">
            <tr>
              <th className="text-left px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Coluna</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">O que é</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Exemplo</th>
            </tr>
          </thead>
          <tbody>
            {colunas.map((c) => (
              <tr key={c.key} className="border-b border-[#323238] last:border-0">
                <td className="px-2 py-1.5 align-top">
                  <code className="bg-[#29292e] px-1.5 py-0.5 rounded text-white font-mono text-[11px]">{c.key}</code>
                  {c.obrigatoria && (
                    <span className="ml-1.5 text-red-400 font-bold text-[10px]" title="obrigatória">obrigatória</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-gray-400 align-top">{c.descricao || '—'}</td>
                <td className="px-2 py-1.5 text-gray-500 italic align-top">{c.exemplo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
        <AlertTriangle size={12} className="text-yellow-400 mt-0.5 shrink-0" />
        <div className="text-[11px] text-yellow-200/80 leading-relaxed">
          <strong className="text-yellow-300">Se a planilha estiver no formato errado:</strong> o sistema vai recusar a importação e mostrar exatamente quais colunas estão faltando.
          Linhas com erro são <strong>ignoradas individualmente</strong> (as outras importam normalmente) e os erros aparecem com o número da linha pra você corrigir e tentar de novo.
          {helpText && <div className="mt-1 text-yellow-100/70">{helpText}</div>}
        </div>
      </div>
    </div>
  )
}

function ResultadoImportacao({ resultado, onFechar }) {
  const { sucesso = 0, ignoradas = 0, erros = [] } = resultado
  const houveErros = erros.length > 0
  return (
    <div className={`rounded-xl border px-3 py-3 ${houveErros ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-green-500/5 border-green-500/30'}`}>
      <div className="flex items-start gap-2">
        {houveErros ? (
          <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
        ) : (
          <CheckCircle2 size={14} className="text-green-400 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${houveErros ? 'text-yellow-300' : 'text-green-300'}`}>
            {sucesso} importado{sucesso !== 1 ? 's' : ''} com sucesso.
            {ignoradas > 0 && ` ${ignoradas} ignorada${ignoradas !== 1 ? 's' : ''}.`}
            {houveErros && ` ${erros.length} erro${erros.length !== 1 ? 's' : ''}.`}
          </p>
          {houveErros && (
            <ul className="text-yellow-200/80 text-[11px] mt-1 list-disc list-inside max-h-32 overflow-y-auto">
              {erros.map((e, i) => (
                <li key={i}>
                  {e.linha ? `Linha ${e.linha}: ` : ''}{e.mensagem}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex justify-end mt-3">
        <button
          onClick={onFechar}
          className="text-[11px] font-bold text-gray-300 hover:text-white underline"
        >
          Fechar e ver lista
        </button>
      </div>
    </div>
  )
}
