import { Route, Routes, Navigate } from 'react-router'
import ChatPage from './pages/ChatPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import { useAuthStore } from './store/useAuthStore.js'  
import { useEffect } from 'react'
import PageLoader from './components/PageLoader.jsx'
import MonitoringPage from './pages/MonitoringPage.jsx'
import { useLocation } from 'react-router'

import { Toaster } from 'react-hot-toast'

function App() {
  const location = useLocation();
  const isMonitoringRoute = location.pathname.startsWith('/monitoring');
  const authUser = useAuthStore((s) => s.authUser);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  

  useEffect(() => {
    if (!isMonitoringRoute) {
      checkAuth()
    }
  }, [checkAuth, isMonitoringRoute])

  console.log({"Auth User": authUser})

  if (isCheckingAuth && !isMonitoringRoute) {
    return <PageLoader />
  }

  return (
    <div className="min-h-screen bg-slate-900 relative flex items-center justify-center p-4 overflow-hidden">
      {/* DECORATORS - GRID BG & GLOW SHAPES */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
      <div className="absolute top-0 -left-4 size-96 bg-pink-500 opacity-20 blur-[100px]" />
      <div className="absolute bottom-0 -right-4 size-96 bg-cyan-500 opacity-20 blur-[100px]" />


      <Routes>
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/" element={authUser ? <ChatPage /> : <Navigate to={"/login"} />} /> {/*If user is authenticated, show the ChatPage, otherwise show the LoginPage */} 
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to={"/"} />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to={"/"} />} />
      </Routes>

      <Toaster/>
    </div>
  )
}

export default App