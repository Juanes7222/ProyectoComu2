import { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { loginUser } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);

    try {
      if (isRegistering) {
        // Registro (Crear usuario vía SSH)
        const res = await api.register(username, password);
        setMsg(res.message + ". Ahora puedes iniciar sesión.");
        setIsRegistering(false); // volver a login
      } else {
        // Login (IMAP)
        await api.login(username, password);
        loginUser(username, password);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-900">
            {isRegistering ? 'Crear Cuenta Corporativa' : 'Portal Corporativo'}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Proyecto de Comunicaciones II - Postfix & Dovecot
          </p>
        </div>

        {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded">{error}</div>}
        {msg && <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded">{msg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 border-gray-300">Usuario (sin @...):</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="ej. carlos"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 border-gray-300">Contraseña:</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tu contraseña IMAP"
            />
          </div>

          {/* {isRegistering && (
            <div>
              <label className="block text-sm font-medium mb-1 border-gray-300">
                Clave Admin (SSH - sudo juanes):
              </label>
              <input
                type="password"
                required
                value={adminPass}
                onChange={e => setAdminPass(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="requerido para useradd"
              />
            </div>
          )} */}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : (isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => { setIsRegistering(!isRegistering); setError(''); setMsg(''); }}
            className="text-sm text-blue-600 hover:underline"
          >
            {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );
}