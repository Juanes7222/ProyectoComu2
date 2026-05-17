const Topologia = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Topología de Red</h1>
      <p className="mb-4">Diagrama de la red empresarial formada por LANs regionales y enrutamiento central con Cisco.</p>
      
      <div className="bg-gray-100 p-8 flex flex-col items-center justify-center rounded-lg border border-gray-300 min-h-[300px]">
        <span className="text-gray-500 italic mb-4">[ Espacio reservado para imagen de topología ]</span>
        <p className="text-sm text-gray-500 text-center max-w-md">
          Coloca aquí la captura del Cisco Packet Tracer exportada como /public/topology-diagram.png
        </p>
      </div>

      <h3 className="font-bold text-xl mt-8 mb-4">Direccionamiento</h3>
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="py-2 px-4 border-b text-left">Segmento / LAN</th>
            <th className="py-2 px-4 border-b text-left">Rango IP / VLAN</th>
            <th className="py-2 px-4 border-b text-left">Propósito</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-2 px-4 border-b">LAN Servidores</td>
            <td className="py-2 px-4 border-b">192.168.10.0/24</td>
            <td className="py-2 px-4 border-b">Aloja VM Web y VM Servicios</td>
          </tr>
          <tr className="bg-gray-50">
            <td className="py-2 px-4 border-b">LAN Usuarios</td>
            <td className="py-2 px-4 border-b">192.168.20.0/24</td>
            <td className="py-2 px-4 border-b">Red de equipos cliente Windows</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Topologia;