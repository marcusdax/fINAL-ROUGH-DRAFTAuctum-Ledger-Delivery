import { useTranslation } from 'react-i18next'
import type { CurriculumTrack } from '../types/api'

/**
 * Local mirror of GET /education/tracks (server returns the same static
 * curriculum). Track names/descriptions resolve through the `curriculum`
 * i18n namespace; module titles are domain content (not translated).
 */
export const FALLBACK_TRACKS: CurriculumTrack[] = [
  {
    id: 'track-quality',
    key: 'quality',
    region: 'Global',
    level: 'Intermediate',
    modules: [
      { id: 'q1', title: 'SCA Cupping Protocol & Calibration', lessons: 6, duration_minutes: 180, progress: 1, status: 'completed' },
      { id: 'q2', title: 'Defect Identification in Green Coffee', lessons: 5, duration_minutes: 150, progress: 0.6, status: 'in_progress' },
      { id: 'q3', title: 'Sensory Lexicon & Flavor Notes', lessons: 4, duration_minutes: 120, progress: 0, status: 'not_started' },
    ],
  },
  {
    id: 'track-compliance',
    key: 'compliance',
    region: 'EU / US',
    level: 'Advanced',
    modules: [
      { id: 'c1', title: 'EUDR Traceability & Geodata', lessons: 5, duration_minutes: 160, progress: 0.4, status: 'in_progress' },
      { id: 'c2', title: 'Phytosanitary Certificates & Customs', lessons: 4, duration_minutes: 110, progress: 0, status: 'not_started' },
    ],
  },
  {
    id: 'track-finance',
    key: 'finance',
    region: 'Global',
    level: 'Intermediate',
    modules: [
      { id: 'f1', title: 'True Price Floor & Farm Budgets', lessons: 4, duration_minutes: 130, progress: 0.2, status: 'in_progress' },
      { id: 'f2', title: 'C-Market Futures & Differential Pricing', lessons: 5, duration_minutes: 150, progress: 0, status: 'locked' },
    ],
  },
  {
    id: 'track-logistics',
    key: 'logistics',
    region: 'Origin ports',
    level: 'Foundational',
    modules: [
      { id: 'l1', title: 'Post-Harvest Handling & Resting', lessons: 3, duration_minutes: 90, progress: 1, status: 'completed' },
      { id: 'l2', title: 'Container Shipping & GrainPro Storage', lessons: 4, duration_minutes: 120, progress: 0.75, status: 'in_progress' },
    ],
  },
]

/** Human-facing status label keys under curriculum.progress.* */
export const MODULE_STATUS_KEY: Record<string, string> = {
  not_started: 'progress.notStarted',
  in_progress: 'progress.inProgress',
  completed: 'progress.completed',
  locked: 'progress.locked',
}

export function useTrackCopy() {
  const { t } = useTranslation('curriculum')
  return {
    title: (track: CurriculumTrack) => t(`tracks.${track.key}`),
    description: (track: CurriculumTrack) => t(`trackDesc.${track.key}`),
  }
}
