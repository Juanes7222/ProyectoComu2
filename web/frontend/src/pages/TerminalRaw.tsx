import { useState, useEffect } from 'react';

export default function TerminalRaw() {
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const terminalUrl = 'http://192.168.1.7:7681';

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await fetch(terminalUrl, { mode: 'no-cors' });
        setConnectionError(null);
      } catch {
        setConnectionError(
          'No se pudo conectar con el servidor de terminal. Asegúrate de que ttyd esté ejecutándose en 192.168.1.7:7681'
        );
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <h1 className="text-white text-2xl font-bold">
          Terminal del Cliente C (Raw)
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Interfaz nativa del cliente de chat en C ejecutándose en la VM Linux
        </p>
      </div>

      {connectionError ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-red-900 border border-red-700 rounded p-6 max-w-md text-center">
            <h2 className="text-white font-bold text-lg mb-2">
              Error de Conexión
            </h2>
            <p className="text-red-100 text-sm">{connectionError}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-black overflow-hidden">
          <iframe
            src={terminalUrl}
            title="Terminal Web"
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}
    </div>
  );
}