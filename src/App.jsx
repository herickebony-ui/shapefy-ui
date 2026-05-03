import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AppLayout from './components/layout/AppLayout'
import HubAlunos from './pages/Alunos/HubAlunos'
import AnamneseListagem from './pages/Anamneses/AnamneseListagem'
import DietaListagem from './pages/Dietas/DietaListagem'
import DietaDetalhe from './pages/Dietas/DietaDetalhe'
import FichaListagem from './pages/Fichas/FichaListagem'
import FichaDetalhe from './pages/Fichas/FichaDetalhe'
import GerenciarTreino from './pages/Exercicios/GerenciarTreino'
import GerenciarAlongamentos from './pages/Exercicios/GerenciarAlongamentos'
import GerenciarAerobicos from './pages/Exercicios/GerenciarAerobicos'
import AlimentosListagem from './pages/Alimentos/AlimentosListagem'
import RefeicoesProntasListagem from './pages/Dietas/RefeicoesProntasListagem'
import FeedbackListagem from './pages/Feedbacks/FeedbackListagem'
import FeedbackDetalhe from './pages/Feedbacks/FeedbackDetalhe'
import CronogramaFeedbacks from './pages/Feedbacks/CronogramaFeedbacks'
import PainelFeedbacks from './pages/Feedbacks/PainelFeedbacks'
import AvaliacaoListagem from './pages/Avaliacoes/AvaliacaoListagem'
import AvaliacaoForm from './pages/Avaliacoes/AvaliacaoForm'
import TreinosRealizados from './pages/Treinos/TreinosRealizados'
import ProgressaoCargas from './pages/Treinos/ProgressaoCargas'
import BancoTextos from './pages/BancoTextos/BancoTextos'
import FormularioListagem from './pages/Formularios/FormularioListagem'
import FormularioBuilder from './pages/Formularios/FormularioBuilder'
import Suporte from './pages/Suporte/Suporte'
import UsuarioHub from './pages/Usuario/UsuarioHub'
import PerfilProfissional from './pages/Perfil/PerfilProfissional'
import MinhaAssinatura from './pages/Assinatura/MinhaAssinatura'
import UpdatePassword from './pages/UpdatePassword'
import ForgotPassword from './pages/ForgotPassword'
import PrescricaoListagem from './pages/Prescricoes/PrescricaoListagem'
import PrescricaoDetalhe from './pages/Prescricoes/PrescricaoDetalhe'
import FinanceiroListagem from './pages/Financeiro/FinanceiroListagem'
import PlanosListagem from './pages/Financeiro/PlanosListagem'

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const hasToken = !!localStorage.getItem('frappe_token')

  if (!isAuthenticated || !hasToken) {
    if (isAuthenticated && !hasToken) clearAuth()
    return <Navigate to="/login" replace />
  }
  return children
}

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

function ModuleRoute({ modulo, children }) {
  const modulos = useAuthStore((s) => s.modulos)
  if (modulos?.[modulo]) return children
  window.location.href = `${FRAPPE_URL}/checkout?subscription_plan=PLANO%20COMPLETO%20MENSAL`
  return null
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />

          {/* anamnese */}
          <Route path="alunos" element={<ModuleRoute modulo="anamnese"><HubAlunos /></ModuleRoute>} />
          <Route path="anamneses" element={<ModuleRoute modulo="anamnese"><AnamneseListagem /></ModuleRoute>} />

          {/* dieta */}
          <Route path="dietas" element={<ModuleRoute modulo="dieta"><DietaListagem /></ModuleRoute>} />
          <Route path="dietas/:id" element={<ModuleRoute modulo="dieta"><DietaDetalhe /></ModuleRoute>} />
          <Route path="alimentos" element={<ModuleRoute modulo="dieta"><AlimentosListagem /></ModuleRoute>} />
          <Route path="refeicoes-prontas" element={<ModuleRoute modulo="dieta"><RefeicoesProntasListagem /></ModuleRoute>} />

          {/* treino */}
          <Route path="fichas" element={<ModuleRoute modulo="treino"><FichaListagem /></ModuleRoute>} />
          <Route path="fichas/:id" element={<ModuleRoute modulo="treino"><FichaDetalhe /></ModuleRoute>} />
          <Route path="exercicios" element={<ModuleRoute modulo="treino"><GerenciarTreino /></ModuleRoute>} />
          <Route path="alongamentos" element={<ModuleRoute modulo="treino"><GerenciarAlongamentos /></ModuleRoute>} />
          <Route path="aerobicos" element={<ModuleRoute modulo="treino"><GerenciarAerobicos /></ModuleRoute>} />
          <Route path="treinos" element={<ModuleRoute modulo="treino"><TreinosRealizados /></ModuleRoute>} />
          <Route path="progressao-cargas" element={<ModuleRoute modulo="treino"><ProgressaoCargas /></ModuleRoute>} />

          {/* feedback (acesso liberado para todos) */}
          <Route path="feedbacks" element={<FeedbackListagem />} />
          <Route path="feedbacks/:id" element={<FeedbackDetalhe />} />
          <Route path="painel-feedbacks" element={<PainelFeedbacks />} />
          <Route path="cronograma-feedbacks" element={<CronogramaFeedbacks />} />
          <Route path="cronograma-feedbacks/aluno/:alunoId" element={<CronogramaFeedbacks />} />

          {/* sem restrição */}
          <Route path="avaliacoes" element={<AvaliacaoListagem />} />
          <Route path="avaliacoes/nova" element={<AvaliacaoForm />} />
          <Route path="banco-textos" element={<BancoTextos />} />
          <Route path="formularios/feedback" element={<FormularioListagem tipoFixo="feedback" />} />
          <Route path="formularios/anamnese" element={<FormularioListagem tipoFixo="anamnese" />} />
          <Route path="criar-formularios" element={<Navigate to="/formularios/anamnese" replace />} />
          <Route path="criar-formularios/:tipo/:id" element={<FormularioBuilder />} />
          <Route path="suporte" element={<Suporte />} />
          <Route path="me" element={<UsuarioHub />} />
          <Route path="perfil" element={<PerfilProfissional />} />
          <Route path="assinatura" element={<MinhaAssinatura />} />
          <Route path="prescricoes" element={<PrescricaoListagem />} />
          <Route path="prescricoes/:id" element={<PrescricaoDetalhe />} />
          <Route path="financeiro" element={<FinanceiroListagem />} />
          <Route path="planos" element={<PlanosListagem />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App