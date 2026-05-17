import { useState } from 'react';
import { api } from '../services/api';

const Correo = () => {
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('Prueba desde el Portal Web');
  const [body, setBody] = useState('Hola,\n\nEste es un correo de prueba enviado exitosamente a través del servicio de Postfix en el proyecto de Comunicaciones II.\n\nSaludos.');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setStatusMsg('Enviando correo al servidor SMTP (192.168.1.7:25)...');
    try {
      const response = await api.sendTestEmail(toEmail, subject, body);
      setStatusMsg(`✅ Éxito: ${response.message}`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message;
      setStatusMsg(`❌ Error: ${errorMsg}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Servicio de Correo Empesarial</h1>
      <p className="mb-6 text-gray-700">Plataforma soportada nativamente en la infraestructura corporativa usando <strong>Postfix</strong> (envío y enrutamiento SMTP) y <strong>Dovecot</strong> (bandejas de entrada IMAP).</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* PANEL IZQUIERDO: EXPLICACIÓN DE USUARIOS */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="font-bold text-xl mb-3 text-blue-800">👤 1. Gestión de Cuentas y Usuarios</h2>
            <p className="text-sm mb-3">En una configuración clásica de Postfix/Dovecot sin una base de datos externa, los correos electrónicos se rigen por <strong>los usuarios del sistema operativo de Linux</strong>.</p>
            <p className="text-sm mb-3">Para crear <i>"el propio correo del usuario"</i>, debe acceder por terminal a la de Servicios (192.168.1.7) y crear un usuario válido:</p>
            
            <div className="bg-gray-800 text-green-400 p-3 rounded font-mono text-xs overflow-x-auto">
              <span className="text-gray-400"># Crear un nuevo correo (ej. analista@...)</span><br/>
              sudo adduser analista<br/><br/>
              <span className="text-gray-400"># ¡Listo! Ya puede recibir correos.</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="font-bold text-xl mb-3 text-blue-800">💻 2. Conectarse a la cuenta real</h2>
            <p className="text-sm mb-3">Para utilizar la cuenta asignada, abra un cliente como <strong>Thunderbird</strong> o el utilitario de <strong>Windows Mail</strong> y agregue los siguientes parámetros.</p>
            <ul className="text-sm ml-4 mb-3 list-disc space-y-1">
              <li><strong>IP Mail Server:</strong> 192.168.1.7</li>
              <li><strong>E-Mail Address:</strong> el-usuario-linux@correo.com2.local</li>
              <li><strong>Contraseña:</strong> La clave de Linux (asignada al hacer adduser)</li>
              <li><strong>Envíos (SMTP):</strong> Puerto 25 (Sin cifrar o STARTTLS)</li>
              <li><strong>Recibos (IMAP):</strong> Puerto 143 (Sin cifrar o STARTTLS)</li>
            </ul>
          </div>
        </div>

        {/* PANEL DERECHO: HERRAMIENTA DE PRUEBA EN VIVO */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="font-bold text-xl mb-3 text-blue-800">🚀 Herramienta de Prueba en Vivo</h2>
          <p className="text-sm mb-4 text-gray-600">Simule el envío de correos introduciendo un correo destino real (existente en Postfix) a través de nuestra API conectada a la infraestructura.</p>
          
          <form onSubmit={handleSendTest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Para (P.ej. usuario en postfix):</label>
              <input 
                type="text" 
                required
                value={toEmail}
                onChange={e => setToEmail(e.target.value)}
                placeholder="ej: usuario2@correo.com2.local" 
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Asunto:</label>
              <input 
                type="text" 
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mensaje:</label>
              <textarea 
                rows={4}
                required
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={isSending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
            >
              {isSending ? 'Conectando al servidor...' : 'Enviar correo al servidor'}
            </button>

            {statusMsg && (
              <div className={`p-3 rounded mt-4 text-sm font-medium ${statusMsg.includes('✅') ? 'bg-green-100 text-green-800' : statusMsg.includes('❌') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                {statusMsg}
              </div>
            )}
          </form>
        </div>

      </div>
    </div>
  );
};

export default Correo;