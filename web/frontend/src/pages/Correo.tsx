import { useState } from 'react';
import { api, EmailMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Correo = () => {
  const { user } = useAuth();
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('Prueba desde el Portal Web');
  const [body, setBody] = useState('Hola,\n\nEste es un correo de prueba enviado exitosamente a través del servicio de Postfix en el proyecto de Comunicaciones II.\n\nSaludos.');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Estados para IMAP
  const [inbox, setInbox] = useState<EmailMessage[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [imapMsg, setImapMsg] = useState('');
  const [showCompose, setShowCompose] = useState(false);

  const selectedEmail = inbox.find(e => e.id === selectedEmailId);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setStatusMsg('Enviando correo...');
    try {
      const fromEmail = `${user?.username}@correo.com2.local`;
      const response = await api.sendTestEmail(toEmail, subject, body, fromEmail);
      setStatusMsg(`✅ ${response.message}`);
      setToEmail('');
      setSubject('Prueba desde el Portal Web');
      setBody('Hola,\n\nEste es un correo de prueba...');
      setShowCompose(false);
      setTimeout(() => handleFetchInbox(), 2000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message;
      setStatusMsg(`❌ Error: ${errorMsg}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleFetchInbox = async () => {
    if (!user) return;
    setIsFetching(true);
    setImapMsg('Conectando a IMAP...');
    try {
      const response = await api.getInbox(user.username, user.pass);
      setInbox(response.emails);
      setSelectedEmailId(null);
      setImapMsg(`✅ ${response.emails.length} correos`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message;
      setImapMsg(`❌ Error: ${errorMsg}`);
      setInbox([]);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Correo Corporativo</h1>
          <p className="text-gray-600">Conectado como <span className="font-semibold text-blue-600">{user?.username}@correo.com2.local</span></p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[80vh]">
          
          {/* LEFT PANEL: Inbox */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex justify-between items-center">
              <h2 className="text-white font-bold text-lg">📥 Bandeja</h2>
              <button
                onClick={handleFetchInbox}
                disabled={isFetching}
                className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-50 transition disabled:opacity-50"
              >
                {isFetching ? '⟳ Actualizando...' : '⟳ Actualizar'}
              </button>
            </div>

            {imapMsg && (
              <div className={`p-3 text-sm ${imapMsg.includes('❌') ? 'bg-red-50 text-red-700 border-b border-red-200' : 'bg-green-50 text-green-700 border-b border-green-200'}`}>
                {imapMsg}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {inbox.length === 0 ? (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center h-full">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm">No hay correos en tu bandeja</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {inbox.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => setSelectedEmailId(email.id)}
                      className={`w-full p-4 text-left transition-all hover:bg-blue-50 ${
                        selectedEmailId === email.id ? 'bg-blue-100 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                          {getInitials(email.from)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{email.from}</p>
                          <p className="text-gray-700 text-sm truncate">{email.subject}</p>
                          <p className="text-gray-400 text-xs mt-1">{formatDate(email.date)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Email Detail or Compose */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
            {selectedEmail ? (
              /* Email Detail View */
              <div className="flex flex-col h-full">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white flex items-center justify-center font-bold">
                      {getInitials(selectedEmail.from)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{selectedEmail.subject}</h3>
                      <p className="text-gray-600 text-sm mt-1">De: <span className="font-semibold">{selectedEmail.from}</span></p>
                      <p className="text-gray-500 text-sm">{formatDate(selectedEmail.date)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-6 overflow-y-auto bg-white">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedEmail.body || 'Sin contenido disponible'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Compose View */
              <div className="flex flex-col h-full">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 flex justify-between items-center">
                  <h2 className="text-white font-bold text-lg">✉️ Redactar Nuevo</h2>
                  {showCompose && (
                    <button
                      onClick={() => setShowCompose(false)}
                      className="text-white hover:bg-white hover:text-purple-600 px-3 py-1 rounded text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                <form onSubmit={handleSendTest} className="flex-1 flex flex-col p-6 overflow-y-auto">
                  <div className="space-y-4 flex-1">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Para:</label>
                      <input
                        type="email"
                        required
                        value={toEmail}
                        onChange={(e) => setToEmail(e.target.value)}
                        placeholder="usuario@correo.com2.local"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">De:</label>
                      <input
                        type="text"
                        disabled
                        value={`${user?.username}@correo.com2.local`}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Asunto:</label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Asunto del correo"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Mensaje:</label>
                      <textarea
                        required
                        rows={8}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Escribe tu mensaje aquí..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
                      />
                    </div>
                  </div>

                  {statusMsg && (
                    <div className={`p-4 rounded-lg mt-4 text-sm font-medium ${
                      statusMsg.includes('✅') 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {statusMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSending}
                    className="mt-6 w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50"
                  >
                    {isSending ? '📤 Enviando...' : '📤 Enviar Correo'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => {
            setSelectedEmailId(null);
            setShowCompose(!showCompose);
          }}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center text-2xl"
        >
          ✉️
        </button>
      </div>
    </div>
  );
};

export default Correo;