const Correo = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Servicio de Correo</h1>
      <p className="mb-4">Este proyecto incluye un servidor de correo implementado con Postfix (SMTP) y Dovecot (IMAP/POP3).</p>
      
      <div className="bg-gray-100 p-4 rounded-lg my-4">
        <h3 className="font-bold text-lg mb-2">Datos de Conexión:</h3>
        <ul className="list-disc list-inside ml-4">
          <li><strong>Dirección IP del servidor:</strong> (IP del servidor de servicios)</li>
          <li><strong>Puerto SMTP:</strong> 25 / 587</li>
          <li><strong>Puerto IMAP:</strong> 143 / 993</li>
        </ul>
      </div>

      <h3 className="font-bold text-lg mt-6 mb-2">Instrucciones de configuración:</h3>
      <p>Puede utilizar un cliente de correo como Thunderbird o Outlook. Configure la cuenta usando IMAP y el servidor SMTP sin encriptación SSL/TLS si está dentro de la red del laboratorio (o acepte el certificado autofirmado si habilitó TLS).</p>
    </div>
  );
};

export default Correo;