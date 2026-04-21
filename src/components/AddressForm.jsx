import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { buscarAddress, criarAddress, salvarAddress } from '../api/address'
import { FormGroup, Input, Select } from './ui'

const ADDRESS_TYPE_OPTS = [
  { value: 'Billing',  label: 'Cobrança' },
  { value: 'Shipping', label: 'Entrega' },
  { value: 'Personal', label: 'Pessoal' },
  { value: 'Office',   label: 'Escritório' },
]

async function fetchViaCep(cep) {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  const data = await res.json()
  return data.erro ? null : data
}

// Props:
//   addressName   — name do doc Address existente (ou null se novo)
//   linkDoctype   — ex: "Profissional"
//   linkName      — ex: "herickebony@gmail.com"
//   title         — título do endereço (ex: "Hérick - PF")
//   addressType   — padrão "Billing"
//   onSaved(name) — callback chamado após salvar com o name do Address

const AddressForm = forwardRef(function AddressForm({ addressName, linkDoctype, linkName, title, addressType = 'Billing', onSaved }, ref) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')

  const [type, setType] = useState(addressType)
  const [cep, setCep] = useState('')
  const [line1, setLine1] = useState('')
  const [numero, setNumero] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  useEffect(() => {
    if (!addressName) return
    setLoading(true)
    buscarAddress(addressName)
      .then((data) => {
        if (!data) return
        setType(data.address_type || addressType)
        setCep(data.pincode || '')
        // line1 pode conter "Rua X, nº 123" — separa no ", nº "
        const [rua, num] = (data.address_line1 || '').split(', nº ')
        setLine1(rua || '')
        setNumero(num || '')
        setLine2(data.address_line2 || '')
        setCity(data.city || '')
        setState(data.state || '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [addressName])

  const handleCep = async (raw) => {
    const masked = raw.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9)
    setCep(masked)
    setCepError('')
    if (masked.replace(/\D/g, '').length === 8) {
      setCepLoading(true)
      try {
        const data = await fetchViaCep(masked)
        if (data) {
          setLine1(data.logradouro || '')
          setLine2(data.bairro || '')
          setCity(data.localidade || '')
          setState(data.uf || '')
        } else {
          setCepError('CEP não encontrado')
        }
      } catch { setCepError('Erro ao buscar CEP') }
      finally { setCepLoading(false) }
    }
  }

  const save = async () => {
    if (!linkName || !line1 || !city) return
    const payload = {
      address_title: title || `${linkName}-${type}`,
      address_type: type,
      address_line1: numero ? `${line1}, nº ${numero}` : line1,
      address_line2: line2,
      city,
      state,
      pincode: cep.replace(/\D/g, ''),
      country: 'Brazil',
      links: [{ link_doctype: linkDoctype, link_name: linkName }],
    }
    const saved = addressName
      ? await salvarAddress(addressName, payload)
      : await criarAddress(payload)
    onSaved?.(saved.name)
  }

  useImperativeHandle(ref, () => ({ save }))

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <span className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CEP */}
        <FormGroup label="CEP" hint="Auto-preenche o endereço" error={cepError}>
          <div className="relative">
            <Input value={cep} onChange={handleCep} placeholder="00000-000" />
            {cepLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </FormGroup>

        {/* Tipo */}
        <FormGroup label="Tipo de Endereço">
          <Select value={type} onChange={setType} options={ADDRESS_TYPE_OPTS} />
        </FormGroup>

        {/* Número */}
        <FormGroup label="Número">
          <Input value={numero} onChange={setNumero} placeholder="123" />
        </FormGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Logradouro */}
        <FormGroup label="Logradouro" required>
          <Input value={line1} onChange={setLine1} placeholder="Rua, Avenida, Travessa..." />
        </FormGroup>

        {/* Complemento / Bairro */}
        <FormGroup label="Bairro / Complemento">
          <Input value={line2} onChange={setLine2} placeholder="Bairro, Apto, Sala..." />
        </FormGroup>

        {/* Cidade */}
        <FormGroup label="Cidade" required>
          <Input value={city} onChange={setCity} placeholder="Cidade" />
        </FormGroup>

        {/* Estado */}
        <FormGroup label="Estado (UF)" required>
          <Input value={state} onChange={setState} placeholder="BA" />
        </FormGroup>
      </div>

    </div>
  )
})

export default AddressForm
