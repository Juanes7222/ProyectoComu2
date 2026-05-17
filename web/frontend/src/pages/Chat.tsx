const Chat = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Servicio de Chat</h1>
      <p className="mb-4">El servicio de chat funciona mediante un servidor alojado en Linux y clientes de terminal en C.</p>
      
      <div className="bg-gray-100 p-4 rounded-lg my-4">
        <h3 className="font-bold text-lg mb-2">Instrucciones de Uso (Cliente):</h3>
        <p className="mb-2">Para conectarse al chat desde Windows, necesitará compilar y ejecutar el cliente C provisto en el proyecto.</p>
        
        <div className="bg-gray-800 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto mt-2">
          gcc client.c -o chat-client.exe<br/>
          ./chat-client.exe &lt;IP-Servidor&gt; &lt;Puerto&gt;
        </div>
      </div>
      
      <p className="mt-4">El servidor ya se encuentra en ejecución en la máquina virtual principal. Verifique la dirección IP asignada a la VLAN correspondiente para conectarse.</p>
    </div>
  );
};

export default Chat;