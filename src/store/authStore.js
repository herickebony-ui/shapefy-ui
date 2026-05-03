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
        useOnboardingStore.getState().resetOnboarding()
        set({ user: null, token: null, isAuthenticated: false, modulos: { ...MODULOS_DEFAULT } })
      },
    }),
    {
      name: 'shapefy-auth',
      version: 1,
      migrate: (state, version) => {
        if (state && (!state.modulos || version < 1)) {
          state.modulos = { ...MODULOS_DEFAULT, ...(state.modulos || {}) }
        }
        return state
      },
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        modulos: { ...MODULOS_DEFAULT, ...(persisted?.modulos || {}) },
      }),
    }
  )
)

export default useAuthStore