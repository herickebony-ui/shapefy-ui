import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AppLayout from './components/layout/AppLayout'
import HubAlunos from './pages/Alunos/HubAlunos'
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
import AvaliacaoListagem from './pages/Avaliacoes/AvaliacaoListagem'
import AvaliacaoForm from './pages/Avaliacoes/AvaliacaoForm'
import TreinosRealizados from './pages/Treinos/TreinosRealizados'
import BancoTextos from './pages/BancoTextos/BancoTextos'
import FormularioListagem from './pages/Formularios/FormularioListagem'
import FormularioBuilder from './pages/Formularios/FormularioBuilder'
import Suporte from './pages/Suporte/Suporte'
import UsuarioHub from './pages/Usuario/UsuarioHub'
import PerfilProfissional from './pages/Perfil/PerfilProfissional'
import MinhaAssinatura from './pages/Assinatura/MinhaAssinatura'
import PrescricaoListagem from './pages/Prescricoes/PrescricaoListagem'
import PrescricaoDetalhe from './pages/Prescricoes/PrescricaoDetalhe'

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="alunos" element={<HubAlunos />} />
          <Route path="dietas" element={<DietaListagem />} />
<Route path="dietas/:id" element={<DietaDetalhe />} />
          <Route path="fichas" element={<FichaListagem />} />
          <Route path="fichas/:id" element={<FichaDetalhe />} />
          <Route path="exercicios" element={<GerenciarTreino />} />
          <Route path="alongamentos" element={<GerenciarAlongamentos />} />
          <Route path="aerobicos" element={<GerenciarAerobicos />} />
          <Route path="alimentos" element={<AlimentosListagem />} />
          <Route path="refeicoes-prontas" element={<RefeicoesProntasListagem />} />
          <Route path="feedbacks" element={<FeedbackListagem />} />
          <Route path="feedbacks/:id" element={<FeedbackDetalhe />} />
          <Route path="avaliacoes" element={<AvaliacaoListagem />} />
          <Route path="avaliacoes/nova" element={<AvaliacaoForm />} />
          <Route path="treinos" element={<TreinosRealizados />} />
          <Route path="banco-textos" element={<BancoTextos />} />
          <Route path="criar-formularios" element={<FormularioListagem />} />
          <Route path="criar-formularios/:tipo/:id" element={<FormularioBuilder />} />
          <Route path="suporte" element={<Suporte />} />
          <Route path="me" element={<UsuarioHub />} />
          <Route path="perfil" element={<PerfilProfissional />} />
          <Route path="assinatura" element={<MinhaAssinatura />} />
          <Route path="prescricoes" element={<PrescricaoListagem />} />
          <Route path="prescricoes/:id" element={<PrescricaoDetalhe />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App