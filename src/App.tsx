import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

const RoomPage = lazy(() => import('./pages/RoomPage').then((m) => ({ default: m.RoomPage })))
const MemoriesPage = lazy(() => import('./pages/MemoriesPage').then((m) => ({ default: m.MemoriesPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-glow border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ProtectedRoute>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<RoomPage />} />
            <Route path="/room/:code" element={<RoomPage />} />
            <Route path="/memories/:roomId" element={<MemoriesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ProtectedRoute>
    </BrowserRouter>
  )
}
