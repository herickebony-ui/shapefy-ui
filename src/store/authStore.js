import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      modulos: { dieta: true, treino: true, feedback: true, anamnese: true },

      setAuth: (user, token) => {
        localStorage.setItem('frappe_token', token)
        localStorage.setItem('frappe_user', user)
        set({ user, token, isAuthenticated: true })
      },

      setModulos: (modulos) => set({ modulos }),

      clearAuth: () => {
        localStorage.removeItem('frappe_token')
        localStorage.removeItem('frappe_user')
        set({ user: null, token: null, isAuthenticated: false, modulos: { dieta: true, treino: true, feedback: true, anamnese: true } })
      },
    }),
    { name: 'shapefy-auth' }
  )
)

export default useAuthStore