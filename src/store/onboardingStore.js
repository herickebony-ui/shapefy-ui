import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buscarContagensOnboarding } from '../api/onboarding'

export const THRESHOLDS = {
  alimentos: 10,
  exercicios: 10,
  alongamentos: 10,
  aerobicos: 1,
}

// Só exibir "recomendado N+" nos catálogos que precisam de volume mínimo
export const SHOW_RECOMENDADO = {
  alimentos: true,
  exercicios: true,
  alongamentos: true,
  aerobicos: false,
}

export const MAX_MODAL_APPEARANCES = 3

const useOnboardingStore = create(
  persist(
    (set, get) => ({
      counts: null,
      loading: false,
      lastFetchedAt: 0,
      modalAppearances: 0,
      bannerDismissed: false,

      setCounts: (counts) => set({ counts, lastFetchedAt: Date.now() }),

      refreshCounts: async () => {
        if (get().loading) return
        set({ loading: true })
        try {
          const counts = await buscarContagensOnboarding()
          set({ counts, lastFetchedAt: Date.now() })
          return counts
        } finally {
          set({ loading: false })
        }
      },

      incrementModalAppearance: () => set(s => ({ modalAppearances: s.modalAppearances + 1 })),
      resetModalAppearances: () => set({ modalAppearances: 0 }),

      dismissBanner: () => set({ bannerDismissed: true }),
      resetBanner:   () => set({ bannerDismissed: false }),

      resetOnboarding: () => set({ counts: null, lastFetchedAt: 0, modalAppearances: 0, bannerDismissed: false }),
    }),
    { name: 'shapefy-onboarding' }
  )
)

// Helpers para seleção derivada
export const getModulosPendentes = (counts, modulos) => {
  if (!counts) return []
  const pendentes = []
  if (modulos?.dieta && counts.alimentos < THRESHOLDS.alimentos) {
    pendentes.push({ id: 'alimentos', modulo: 'dieta', label: 'Alimentos', count: counts.alimentos, threshold: THRESHOLDS.alimentos })
  }
  if (modulos?.treino && counts.exercicios < THRESHOLDS.exercicios) {
    pendentes.push({ id: 'exercicios', modulo: 'treino', label: 'Exercícios de treino', count: counts.exercicios, threshold: THRESHOLDS.exercicios })
  }
  if (modulos?.treino && counts.alongamentos < THRESHOLDS.alongamentos) {
    pendentes.push({ id: 'alongamentos', modulo: 'treino', label: 'Alongamentos', count: counts.alongamentos, threshold: THRESHOLDS.alongamentos })
  }
  if (modulos?.treino && counts.aerobicos < THRESHOLDS.aerobicos) {
    pendentes.push({ id: 'aerobicos', modulo: 'treino', label: 'Aeróbicos', count: counts.aerobicos, threshold: THRESHOLDS.aerobicos })
  }
  return pendentes
}

export default useOnboardingStore
