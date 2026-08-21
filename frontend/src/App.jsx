import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout        from './layouts/Layout'
import Dashboard     from './pages/Dashboard'
import SensorData    from './pages/SensorData'
import ActionHistory from './pages/ActionHistory'
import Profile       from './pages/Profile'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sensors"   element={<SensorData />} />
          <Route path="history"   element={<ActionHistory />} />
          <Route path="profile"   element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
