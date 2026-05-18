import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Correo from './pages/Correo';
import Chat from './pages/Chat';
import Topologia from './pages/Topologia';
import TerminalRaw from './pages/TerminalRaw';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, logoutUser } = useAuth();

  if (!user) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <nav className="bg-blue-600 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <ul className="flex space-x-6 text-white font-semibold">
            <li><Link to="/" className="hover:underline">Dashboard</Link></li>
            <li><Link to="/correo" className="hover:underline">Correo</Link></li>
            <li><Link to="/chat" className="hover:underline">Chat</Link></li>
            <li><Link to="/topologia" className="hover:underline">Topología</Link></li>
            <li><Link to="/terminal" className="hover:underline">Terminal</Link></li>
          </ul>
          <div className="flex items-center space-x-4 text-white">
            <span className="text-sm">Hola, {user.username}</span>
            <button onClick={logoutUser} className="text-sm bg-blue-800 px-3 py-1 rounded hover:bg-blue-700">
              Salir
            </button>
          </div>
        </div>
      </nav>
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/correo" element={<Correo />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/topologia" element={<Topologia />} />
          <Route path="/terminal" element={<TerminalRaw />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
