import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: 'received' | 'sent' | 'system';
}

const Chat = () => {
  const { user } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeRoom, setActiveRoom] = useState<string>('');
  const [users, setUsers] = useState<string[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [showUserForm, setShowUserForm] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const clientIdRef = useRef<string>(`client_${Date.now()}_${Math.random()}`);
  const messageCounterRef = useRef<number>(0);

  const generateMessageId = (prefix: string = 'msg'): string => {
    messageCounterRef.current += 1;
    return `${prefix}_${Date.now()}_${messageCounterRef.current}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectToChat = (userName: string) => {
    if (!userName.trim()) return;

    setUsername(userName);
    setShowUserForm(false);
    setConnectionStatus('connecting');

    try {
      let wsUrl: string;

      if (import.meta.env.VITE_BACKEND_URL) {
        // Production: usar URL configurada
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        wsUrl = `${backendUrl.replace(/^http/, 'ws')}/api/chat/ws/${clientIdRef.current}`;
        console.log('[WebSocket] DEV: URL configurada por VITE_BACKEND_URL:', wsUrl);
      } else {
        // Development: conectar directamente al backend (evitar proxy problemas de Vite)
        wsUrl = `ws://127.0.0.1:5000/api/chat/ws/${clientIdRef.current}`;
        console.log('[WebSocket] DEV: Conectando directamente a backend:', wsUrl);
      }

      console.log('[WebSocket] Abriendo WebSocket...', { clientId: clientIdRef.current });
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setConnectionStatus('connected');
        setIsConnected(true);
        
        addSystemMessage(`Conectado como "${userName}"`);
        
        setTimeout(() => {
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            sendMessage(userName);
          }
        }, 300);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message') {
            const messageText = data.data;
            
            if (messageText.startsWith('[#')) {
              parseRoomMessage(messageText);
            } else if (messageText.includes(': ')) {
              parsePeerMessage(messageText);
            } else if (messageText.startsWith('[') && messageText.includes(']')) {
              addSystemMessage(messageText);
            } else {
              addReceivedMessage('Server', messageText);
            }
          } else if (data.type === 'error') {
            addSystemMessage(`⚠️ Error: ${data.data}`);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        addSystemMessage('❌ Error de conexión');
      };

      ws.current.onclose = () => {
        setConnectionStatus('disconnected');
        setIsConnected(false);
        addSystemMessage('Desconectado del servidor');
      };
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('disconnected');
      addSystemMessage(`❌ Error al conectar: ${error}`);
    }
  };

  const parseRoomMessage = (messageText: string) => {
    const roomMatch = messageText.match(/\[#(\w+)\]/);
    const roomName = roomMatch ? roomMatch[1] : 'unknown';
    
    const restOfMessage = messageText.substring(messageText.indexOf(']') + 2);
    const colonIndex = restOfMessage.indexOf(': ');
    
    if (colonIndex > -1) {
      const sender = restOfMessage.substring(0, colonIndex);
      const content = restOfMessage.substring(colonIndex + 2);
      
      if (activeRoom !== roomName) {
        setActiveRoom(roomName);
      }
      
      addReceivedMessage(`${sender} [#${roomName}]`, content);
    } else {
      addSystemMessage(`[#${roomName}] ${restOfMessage}`);
    }
  };

  const parsePeerMessage = (messageText: string) => {
    const colonIndex = messageText.indexOf(': ');
    if (colonIndex > -1) {
      const sender = messageText.substring(0, colonIndex);
      const content = messageText.substring(colonIndex + 2);
      addReceivedMessage(sender, content);
    }
  };

  const addReceivedMessage = (sender: string, content: string) => {
    const newMessage: ChatMessage = {
      id: generateMessageId(),
      sender,
      content,
      timestamp: new Date(),
      type: 'received',
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const addSystemMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: generateMessageId('sys'),
      sender: 'System',
      content,
      timestamp: new Date(),
      type: 'system',
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const sendMessage = (message: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      addSystemMessage('❌ No conectado al servidor');
      return;
    }

    try {
      ws.current.send(JSON.stringify({ message }));

      if (!message.startsWith('/')) {
        const newMessage: ChatMessage = {
          id: generateMessageId(),
          sender: 'Tú',
          content: message,
          timestamp: new Date(),
          type: 'sent',
        };
        setMessages((prev) => [...prev, newMessage]);
      } else {
        addSystemMessage(`Comando: ${message}`);
      }
    } catch (error) {
      console.error('Send error:', error);
      addSystemMessage(`❌ Error al enviar: ${error}`);
    }
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleCommandClick = (command: string) => {
    sendMessage(command);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isConnected) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-3xl font-bold mb-2 text-blue-600">Chat Empresarial</h1>
          <p className="text-gray-600 mb-6">Conecta con otros usuarios en tiempo real</p>
          
          <div className="space-y-4">
            {showUserForm ? (
              <>
                <input
                  type="text"
                  placeholder="Ingresa tu nombre de usuario"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      connectToChat((e.target as HTMLInputElement).value);
                    }
                  }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => connectToChat(username)}
                  disabled={!username.trim()}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {connectionStatus === 'connecting' ? 'Conectando...' : 'Conectar'}
                </button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 mb-4">Conectando como <strong>{username}</strong>...</p>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Comandos Disponibles:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li><code>/list</code> - Listar usuarios conectados</li>
                <li><code>/rooms</code> - Listar salas disponibles</li>
                <li><code>/join sala</code> - Unirse a una sala</li>
                <li><code>/leave</code> - Salir de la sala actual</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Chat</h1>
            <p className="text-sm text-gray-600">
              Usuario: <span className="font-semibold">{username}</span>
              {activeRoom && <span className="ml-4">Sala: <span className="font-semibold">#{activeRoom}</span></span>}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">{isConnected ? 'Conectado' : 'Desconectado'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">COMANDOS RÁPIDOS</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleCommandClick('/list')}
                className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium transition"
              >
                📋 Listar Usuarios
              </button>
              <button
                onClick={() => handleCommandClick('/rooms')}
                className="w-full text-left px-3 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-sm font-medium transition"
              >
                🏠 Listar Salas
              </button>
              {activeRoom && (
                <button
                  onClick={() => handleCommandClick('/leave')}
                  className="w-full text-left px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm font-medium transition"
                >
                  🚪 Salir de Sala
                </button>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">SALA ACTIVA</h3>
            {activeRoom ? (
              <div className="px-3 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-semibold">
                #{activeRoom}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">Sin sala activa</p>
            )}
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">INFORMACIÓN</h3>
            <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
              Escribe mensajes normalmente o usa comandos con <code className="bg-gray-200 px-1 rounded">/</code>
            </p>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p>No hay mensajes aún. ¡Comienza la conversación!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.type === 'sent'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : msg.type === 'system'
                        ? 'bg-gray-200 text-gray-800 text-center max-w-md italic'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    {msg.type !== 'sent' && msg.type !== 'system' && (
                      <p className="text-xs font-semibold mb-1 text-gray-700">{msg.sender}</p>
                    )}
                    <p className="text-sm break-words">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.type === 'sent' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex space-x-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe un mensaje o comando..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isConnected}
              />
              <button
                onClick={handleSendMessage}
                disabled={!isConnected || !inputValue.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;