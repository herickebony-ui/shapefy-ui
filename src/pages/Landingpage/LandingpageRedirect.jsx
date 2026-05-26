// /landingpage redireciona pro HTML estático em public/landingpage.html.
// O arquivo é HTML cru completo (DOCTYPE, <head>, <style>, <script>) — não
// dá pra render como JSX sem conversão pesada. window.location.replace
// troca a aba e o servidor estático do Vite (em dev) ou nginx (em prod)
// entrega o HTML direto.
import { useEffect } from 'react'

export default function LandingpageRedirect() {
  useEffect(() => {
    window.location.replace('/landingpage.html')
  }, [])
  return null
}
