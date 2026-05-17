import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Correo from './pages/Correo';
import Chat from './pages/Chat';
import Topologia from './pages/Topologia';

function App() {
  return (
    <BrowserRouter>
      <nav className="bg-blue-600 p-4">
        <div className="container mx-auto">
          <ul className="flex space-x-6 text-white font-semibold">
            <li><Link to="/" className="hover:underline">Dashboard</Link></li>
            <li><Link to="/correo" className="hover:underline">Correo</Link></li>
            <li><Link to="/chat" className="hover:underline">Chat</Link></li>
            <li><Link to="/topologia" className="hover:underline">Topología</Link></li>
          </ul>
        </div>
      </nav>
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/correo" element={<Correo />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/topologia" element={<Topologia />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
