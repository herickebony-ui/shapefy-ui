import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import useOnboardingStore from './onboardingStore'

const MODULOS_DEFAULT = { dieta: true, treino: true, feedback: true, anamnese: true }

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      modulos: { ...MODULOS_DEFAULT },
      tipo: 'profissional',
      aluno: null,
      profissional: null,
      isFuncionario: false,
      funcPermissoes: null,

      setAuth: (user, token) => {
        localStorage.setItem('frappe_token', token)
        localStorage.setItem('frappe_user', user)
        localStorage.removeItem('aluno_token')
        set({ user, token, isAuthenticated: true, tipo: 'profissional', aluno: null, profissional: null })
      },

      setAuthAluno: (aluno, token, profissional = null) => {
        localStorage.setItem('aluno_token', token)
        localStorage.removeItem('frappe_token')
        localStorage.removeItem('frappe_user')
        set({
          user: aluno.name,
          token: null,
          isAuthenticated: true,
          tipo: 'aluno',
          aluno,
          profissional,
        })
      },

      setModulos: (modulos) => set({ modulos: { ...MODULOS_DEFAULT, ...modulos } }),

      setFuncPermissoes: (permissoes) => set({
        isFuncionario: true,
        funcPermissoes: permissoes,
      }),

      clearAuth: () => {
        localStorage.removeItem('frappe_token')
        localStorage.removeItem('frappe_user')
        localStorage.removeItem('frappe_professional')
        localStorage.removeItem('aluno_token')
        localStorage.removeItem('shapefy-jornada-dismissed')
        useOnboardingStore.getState().resetOnboarding()
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          tipo: 'profissional',
          aluno: null,
          profissional: null,
          modulos: { ...MODULOS_DEFAULT },
          isFuncionario: false,
          funcPermissoes: null,
        })
      },
    }),
    {
      name: 'shapefy-auth',
      version: 4,
      migrate: (state, version) => {
        if (!state) return state
        if (!state.modulos || version < 1) {
          state.modulos = { ...MODULOS_DEFAULT, ...(state.modulos || {}) }
        }
        if (version < 2) {
          state.modulos = {
            ...(state.modulos || {}),
            anamnese: true,
            feedback: true,
          }
        }
        if (version < 3) {
          state.tipo = state.tipo || 'profissional'
          state.aluno = state.aluno || null
        }
        if (version < 4) {
          state.isFuncionario = state.isFuncionario || false
          state.funcPermissoes = state.funcPermissoes || null
        }
        return state
      },
      merge: (persisted, current) => {
        const persistedModulos = { ...(persisted?.modulos || {}) }
        if (persistedModulos.anamnese === false) persistedModulos.anamnese = true
        if (persistedModulos.feedback === false) persistedModulos.feedback = true
        return {
          ...current,
          ...persisted,
          modulos: { ...MODULOS_DEFAULT, ...persistedModulos },
          tipo: persisted?.tipo || 'profissional',
          aluno: persisted?.aluno || null,
          isFuncionario: persisted?.isFuncionario || false,
          funcPermissoes: persisted?.funcPermissoes || null,
        }
      },
    }
  )
)

export default useAuthStore
