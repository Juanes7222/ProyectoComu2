import { useState, useEffect } from 'react'
import { api, ServiceStatus } from '../services/api'
import ServiceCard from '../components/ServiceCard'

function Dashboard() {
  const [services, setServices] = useState<Record<string, ServiceStatus>>({})
  const [serverInfo, setServerInfo] = useState<any>(null)

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const [status, info] = await Promise.all([
          api.getServicesStatus(),
          api.getServerInfo()
        ])
        setServices(status)
        setServerInfo(info)
      } catch (error) {
        console.error('Error cargando estado:', error)
      }
    }
    
    // Carga inicial
    loadStatus()
    
    // Configurar intervalo de actualización
    const interval = setInterval(loadStatus, 30000) // Actualizar cada 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="mb-4">Bienvenido al portal del Proyecto de Comunicaciones II.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <ServiceCard
          name="Postfix (SMTP)"
          status={services['postfix']?.status || 'unknown'}
          description={services['postfix']?.description || 'Servicio de correo saliente (SMTP)'}
          port={services['postfix']?.port || 25}
          link={`mailto:admin@${serverInfo?.server_ip || 'servidor'}`}
        />
        
        <ServiceCard
          name="Dovecot (IMAP)"
          status={services['dovecot']?.status || 'unknown'}
          description={services['dovecot']?.description || 'Servicio de correo entrante (IMAP/POP3)'}
          port={services['dovecot']?.port || 143}
        />
        
        <ServiceCard
          name="Servidor de Chat"
          status={services['chat-service']?.status || 'unknown'}
          description={services['chat-service']?.description || 'Cliente de chat en la LAN'}
          port={services['chat-service']?.port || 5000}
          link="/chat"
        />
      </div>

      {serverInfo && (
        <div className="bg-gray-100 rounded-lg p-6 mt-8 border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Información de Red de la VM</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <p className="font-mono text-sm"><strong>IP del Servidor:</strong> {serverInfo.server_ip}</p>
            <p className="font-mono text-sm"><strong>Chat Target:</strong> {serverInfo.chat_server}:{serverInfo.chat_port}</p>
            <p className="font-mono text-sm"><strong>Mail MX:</strong> {serverInfo.mail_server}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard;