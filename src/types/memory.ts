export interface MovieMemory {
  id: string
  roomId: string
  title: string
  originalUrl: string
  watchMode: string
  date: number
  durationWatchedSec: number
  ratingHost: number | null
  ratingPartner: number | null
  note: string
  createdBy: string
}

export interface RoomStats {
  movieNightsCount: number
  totalWatchTimeSec: number
  moviesCompletedCount: number
  lastMovieNightAt: number | null
}
