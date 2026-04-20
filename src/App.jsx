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
import AlimentosListagem from './pages/Alimentos/AlimentosListagem'
import RefeicoesProntasListagem from './pages/Dietas/RefeicoesProntasListagem'

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
          <Route path="alimentos" element={<AlimentosListagem />} />
          <Route path="refeicoes-prontas" element={<RefeicoesProntasListagem />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App