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

      setAuth: (user, token) => {
        localStorage.setItem('frappe_token', token)
        localStorage.setItem('frappe_user', user)
        set({ user, token, isAuthenticated: true })
      },

      setModulos: (modulos) => set({ modulos: { ...MODULOS_DEFAULT, ...modulos } }),

      clearAuth: () => {
        localStorage.removeItem('frappe_token')
        localStorage.removeItem('frappe_user')
        localStorage.removeItem('shapefy-jornada-dismissed')
        useOnboardingStore.getState().resetOnboarding()
        set({ user: null, token: null, isAuthenticated: false, modulos: { ...MODULOS_DEFAULT } })
      },
    }),
    {
      name: 'shapefy-auth',
      version: 2,
      migrate: (state, version) => {
        if (!state) return state
        if (!state.modulos || version < 1) {
          state.modulos = { ...MODULOS_DEFAULT, ...(state.modulos || {}) }
        }
        if (version < 2) {
          // anamnese e feedback nunca existiram como flag no Plano de Assinatura;
          // antes do fix do login eles eram persistidos como false. Forçar default.
          state.modulos = {
            ...(state.modulos || {}),
            anamnese: true,
            feedback: true,
          }
        }
        return state
      },
      merge: (persisted, current) => {
        const persistedModulos = { ...(persisted?.modulos || {}) }
        // Sanity: garante que flags universais sempre fiquem true mesmo se vieram
        // como false de versões anteriores que ainda não migraram.
        if (persistedModulos.anamnese === false) persistedModulos.anamnese = true
        if (persistedModulos.feedback === false) persistedModulos.feedback = true
        return {
          ...current,
          ...persisted,
          modulos: { ...MODULOS_DEFAULT, ...persistedModulos },
        }
      },
    }
  )
)

export default useAuthStore