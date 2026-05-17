import React from 'react';

interface ServiceCardProps {
  name: string;
  status: 'active' | 'inactive' | 'unknown' | string;
  description: string;
  port: number;
  link?: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ name, status, description, port, link }) => {
  const isActive = status === 'active';
  const isInactive = status === 'inactive';
  
  const statusColor = isActive ? 'bg-green-500' : isInactive ? 'bg-red-500' : 'bg-gray-400';
  const statusText = isActive ? 'Activo' : isInactive ? 'Inactivo' : 'Desconocido';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{name}</h2>
        <span className={`px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider ${statusColor}`}>
          {statusText}
        </span>
      </div>
      
      <p className="text-gray-600 mb-6 min-h-[48px]">{description}</p>
      
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <span className="text-sm font-mono bg-gray-100 px-3 py-1 rounded text-gray-700 font-medium">Puerto: {port}</span>
        {link && (
          <a href={link} className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
            Conectar <span className="ml-1">&rarr;</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default ServiceCard;