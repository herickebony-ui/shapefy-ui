import { useState, useEffect, useRef, useCallback } from 'react'
import { Save, ImageIcon, Upload } from 'lucide-react'
import client from '../../api/client'
import { buscarProfissional, salvarProfissional } from '../../api/profissional'
import { Button, FormGroup, Input, Select, Spinner } from '../../components/ui'
import DetailPage from '../../components/templates/DetailPage'
import AddressForm from '../../components/AddressForm'

const TIPO_OPTS = [
  { value: 'Pessoa Fisica',   label: 'Pessoa Física' },
  { value: 'Pessoa Juridica', label: 'Pessoa Jurídica' },
]
const THEME_MODE_OPTS = [
  { value: 'light', label: 'Claro' },
  { value: 'dark',  label: 'Escuro' },
]

const BASE = import.meta.env.VITE_FRAPPE_URL || ''

// ─── Upload de imagem ─────────────────────────────────────────────────────────

function ImageUploadField({ label, hint, value, fieldname, docname, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('doctype', 'Profissional')
      formData.append('docname', docname)
      formData.append('fieldname', fieldname)
      formData.append('is_private', '0')
      const res = await client.post('/api/method/upload_file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data?.message?.file_url
      if (url) onUploaded(url)
    } catch (err) {
      console.error(err)
      alert('Erro ao fazer upload da imagem.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const preview = value ? `${BASE}${value}` : null

  return (
    <FormGroup label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="relative w-16 h-16 rounded-lg border border-[#323238] bg-[#1a1a1a] overflow-hidden cursor-pointer hover:border-brand/60 transition-colors flex items-center justify-center flex-shrink-0"
        >
          {uploading ? (
            <span className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          ) : preview ? (
            <img src={preview} alt={label} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={20} className="text-gray-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 text-xs truncate">{value || 'Nenhuma imagem'}</p>
          <button
            type="button"
            onClick={() => !uploading && inputRef.current?.click()}
            disabled={uploading}
            className="mt-1.5 flex items-center gap-1.5 text-xs text-brand hover:text-brand-hover transition-colors disabled:opacity-50"
          >
            <Upload size={11} />
            {uploading ? 'Enviando...' : 'Trocar imagem'}
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </FormGroup>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerfilProfissional() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [docname, setDocname] = useState(null)
  const addressPfRef = useRef(null)
  const addressPjRef = useRef(null)

  const [tipo, setTipo] = useState('Pessoa Fisica')
  const [telefone, setTelefone] = useState('')

  // PF
  const [nomePf, setNomePf] = useState('')
  const [cpfPf, setCpfPf] = useState('')
  const [rgPf, setRgPf] = useState('')
  const [nascPf, setNascPf] = useState('')
  const [naoBrasileiroPf, setNaoBrasileiroPf] = useState(false)
  const [enderecoPfName, setEnderecoPfName] = useState(null)

  // PJ
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telEmpresa, setTelEmpresa] = useState('')
  const [enderecoPjName, setEnderecoPjName] = useState(null)

  // Identidade visual
  const [instagram, setInstagram] = useState('')
  const [areaAtuacao, setAreaAtuacao] = useState('')
  const [foto, setFoto] = useState('')
  const [banner, setBanner] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [professionalLogo, setProfessionalLogo] = useState('')
  const [themeColor, setThemeColor] = useState('#2563eb')
  const [themeMode, setThemeMode] = useState('light')

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      try {
        const data = await buscarProfissional()
        if (data) {
          setDocname(data.name)
          setTipo(data.tipo || 'Pessoa Fisica')
          setTelefone(data.telefone || '')
          setNomePf(data.nome_completo_pf || '')
          setCpfPf(data.cpf_pf || '')
          setRgPf(data.rg_pf || '')
          setNascPf(data.data_de_nascimento_pf || '')
          setNaoBrasileiroPf(!!data.nao_sou_brasileiro_pf)
          setEnderecoPfName(data.endereco_pf || null)
          setRazaoSocial(data.razao_social_pj || '')
          setNomeFantasia(data.nome_fantasia_pj || '')
          setCnpj(data.cnpj_pj || '')
          setTelEmpresa(data.telefone_da_empresa || '')
          setEnderecoPjName(data.endereco_da_empresa_pj || null)
          setInstagram(data.instagram || '')
          setAreaAtuacao(data.area_atuacao || '')
          setFoto(data.foto || '')
          setBanner(data.banner || '')
          setCoverImage(data.cover_image || '')
          setProfessionalLogo(data.professional_logo || '')
          setThemeColor(data.theme_color || '#2563eb')
          setThemeMode(data.theme_mode || 'light')
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    carregar()
  }, [])

  const handleAddressSaved = (field, name) => {
    if (field === 'endereco_pf') setEnderecoPfName(name)
    if (field === 'endereco_da_empresa_pj') setEnderecoPjName(name)
  }

  const handleSave = async () => {
    if (!docname) return
    setSaving(true)
    try {
      // salva endereços em paralelo (só se tiver campos preenchidos)
      await Promise.allSettled([
        addressPfRef.current?.save(),
        addressPjRef.current?.save(),
      ])
      await salvarProfissional(docname, {
        tipo,
        telefone,
        nome_completo_pf: nomePf,
        cpf_pf: cpfPf,
        rg_pf: rgPf,
        data_de_nascimento_pf: nascPf || null,
        nao_sou_brasileiro_pf: naoBrasileiroPf ? 1 : 0,
        razao_social_pj: razaoSocial,
        nome_fantasia_pj: nomeFantasia,
        cnpj_pj: cnpj,
        telefone_da_empresa: telEmpresa,
        instagram,
        area_atuacao: areaAtuacao,
        foto,
        banner,
        cover_image: coverImage,
        professional_logo: professionalLogo,
        theme_color: themeColor,
        theme_mode: themeMode,
      })
    } catch (e) {
      console.error('Frappe save error:', e.response?.data)
      const serverMsgs = e.response?.data?._server_messages
      let msg = 'Erro ao salvar perfil.'
      if (serverMsgs) {
        try {
          const parsed = JSON.parse(serverMsgs)
          const first = typeof parsed[0] === 'string' ? JSON.parse(parsed[0]) : parsed[0]
          msg = first.message || msg
        } catch { /* ignora */ }
      } else if (e.response?.data?.message) {
        msg = e.response.data.message
      } else if (e.response?.data?.exception) {
        msg = e.response.data.exception
      }
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const isPF = tipo === 'Pessoa Fisica'

  return (
    <DetailPage
      title="Perfil Profissional"
      subtitle="Dados cadastrais e identidade visual para geração de PDFs"
      backHref="/me"
      footer={
        <div className="flex justify-end gap-2 px-4 md:px-8 py-4 border-t border-[#323238] bg-[#0a0a0a]">
          <Button variant="primary" icon={Save} onClick={handleSave} loading={saving}>Salvar</Button>
        </div>
      }
    >
      <div className="px-4 md:px-8 pb-6 space-y-6">

        {/* Dados gerais */}
        <div className="bg-[#29292e] border border-[#323238] rounded-lg p-5 space-y-4">
          <p className="text-white font-semibold text-sm">Dados Gerais</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup label="Tipo" required>
              <Select value={tipo} onChange={setTipo} options={TIPO_OPTS} />
            </FormGroup>
            <FormGroup label="Telefone">
              <Input value={telefone} onChange={setTelefone} placeholder="(00) 00000-0000" />
            </FormGroup>
          </div>
        </div>

        {/* Pessoa Física */}
        {isPF && (
          <div className="bg-[#29292e] border border-[#323238] rounded-lg p-5 space-y-4">
            <p className="text-white font-semibold text-sm">Pessoa Física</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="Nome Completo" required>
                <Input value={nomePf} onChange={setNomePf} placeholder="Nome completo" />
              </FormGroup>
              <FormGroup label="Data de Nascimento">
                <Input type="date" value={nascPf} onChange={setNascPf} />
              </FormGroup>
              <FormGroup label="CPF">
                <Input value={cpfPf} onChange={setCpfPf} placeholder="000.000.000-00" />
              </FormGroup>
              <FormGroup label="RG">
                <Input value={rgPf} onChange={setRgPf} placeholder="Documento de identidade" />
              </FormGroup>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={naoBrasileiroPf}
                onChange={(e) => setNaoBrasileiroPf(e.target.checked)}
                className="w-4 h-4 accent-brand" />
              <span className="text-gray-300 text-sm">Não sou brasileiro</span>
            </label>

            {docname && (
              <div className="border-t border-[#323238] pt-4 space-y-3">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Endereço</p>
                <AddressForm
                  ref={addressPfRef}
                  addressName={enderecoPfName}
                  linkDoctype="Profissional"
                  linkName={docname}
                  title={`${nomePf || docname} - PF`}
                  addressType="Billing"
                  onSaved={(name) => handleAddressSaved('endereco_pf', name)}
                />
              </div>
            )}
          </div>
        )}

        {/* Pessoa Jurídica */}
        {!isPF && (
          <div className="bg-[#29292e] border border-[#323238] rounded-lg p-5 space-y-4">
            <p className="text-white font-semibold text-sm">Pessoa Jurídica</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="Razão Social" required>
                <Input value={razaoSocial} onChange={setRazaoSocial} placeholder="Razão Social" />
              </FormGroup>
              <FormGroup label="Nome Fantasia">
                <Input value={nomeFantasia} onChange={setNomeFantasia} placeholder="Nome Fantasia" />
              </FormGroup>
              <FormGroup label="CNPJ">
                <Input value={cnpj} onChange={setCnpj} placeholder="00.000.000/0001-00" />
              </FormGroup>
              <FormGroup label="Telefone da Empresa">
                <Input value={telEmpresa} onChange={setTelEmpresa} placeholder="(00) 00000-0000" />
              </FormGroup>
            </div>

            {docname && (
              <div className="border-t border-[#323238] pt-4 space-y-3">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Endereço da Empresa</p>
                <AddressForm
                  ref={addressPjRef}
                  addressName={enderecoPjName}
                  linkDoctype="Profissional"
                  linkName={docname}
                  title={`${razaoSocial || docname} - PJ`}
                  addressType="Office"
                  onSaved={(name) => handleAddressSaved('endereco_da_empresa_pj', name)}
                />
              </div>
            )}
          </div>
        )}

        {/* Identidade visual */}
        <div className="bg-[#29292e] border border-[#323238] rounded-lg p-5 space-y-4">
          <div>
            <p className="text-white font-semibold text-sm">Identidade Visual</p>
            <p className="text-gray-600 text-xs mt-0.5">Imagens e cores aplicadas nos PDFs gerados pelo sistema</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup label="Instagram">
              <Input value={instagram} onChange={setInstagram} placeholder="@seuperfil" />
            </FormGroup>
            <FormGroup label="Área de Atuação">
              <Input value={areaAtuacao} onChange={setAreaAtuacao} placeholder="Ex: Personal Trainer" />
            </FormGroup>
          </div>

          {docname && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              <ImageUploadField
                label="Foto de Perfil"
                hint="1080 × 1080 px — cabeçalho dos PDFs"
                value={foto} fieldname="foto" docname={docname} onUploaded={setFoto}
              />
              <ImageUploadField
                label="Logo Profissional"
                hint="PNG transparente recomendado"
                value={professionalLogo} fieldname="professional_logo" docname={docname} onUploaded={setProfessionalLogo}
              />
              <ImageUploadField
                label="Banner"
                hint="1920 × 250 px — faixa no topo dos PDFs"
                value={banner} fieldname="banner" docname={docname} onUploaded={setBanner}
              />
              <ImageUploadField
                label="Capa de Impressão"
                hint="2480 × 3508 px (A4) — página de capa"
                value={coverImage} fieldname="cover_image" docname={docname} onUploaded={setCoverImage}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <FormGroup label="Cor do Tema de Impressão">
              <div className="flex items-center gap-3 h-10">
                <input
                  type="color"
                  value={themeColor || '#2563eb'}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="h-9 w-14 rounded-lg border border-[#323238] bg-[#1a1a1a] cursor-pointer p-1"
                />
                <Input value={themeColor} onChange={setThemeColor} placeholder="#2563eb" />
              </div>
            </FormGroup>
            <FormGroup label="Tema de Impressão">
              <Select value={themeMode} onChange={setThemeMode} options={THEME_MODE_OPTS} />
            </FormGroup>
          </div>
        </div>

      </div>
    </DetailPage>
  )
}
