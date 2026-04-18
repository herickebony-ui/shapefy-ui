import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        localStorage.setItem('frappe_token', token)
        localStorage.setItem('frappe_user', user)
        set({ user, token, isAuthenticated: true })
      },

      clearAuth: () => {
        localStorage.removeItem('frappe_token')
        localStorage.removeItem('frappe_user')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'shapefy-auth' }
  )
)

export default useAuthStore