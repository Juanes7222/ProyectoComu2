import { useState, useEffect, useRef } from 'react';
import connected from '../assets/hugeicons--connect.svg';
import disconnected from '../assets/ix--disconnected.svg';
import users from '../assets/mdi--users.svg';
import rooms from '../assets/cbi--rooms-other.svg';
import lists from '../assets/ep--list.svg';
import idea from '../assets/flat-color-icons--idea.svg';
import confif from '../assets/icon-park--config.svg';
import send from '../assets/fluent-color--send-16.svg';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: 'received' | 'sent' | 'system';
}

const Chat = () => {
  const [username, setUsername] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeRoom, setActiveRoom] = useState<string>('');
  const [showUserForm, setShowUserForm] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const clientIdRef = useRef<string | null>(null);
  const messageCounterRef = useRef<number>(0);

  useEffect(() => {
    if (clientIdRef.current === null) {
      clientIdRef.current = `client_${Date.now()}_${Math.random()}`;
    }
  }, []);

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
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        wsUrl = `${backendUrl.replace(/^http/, 'ws')}/api/chat/ws/${clientIdRef.current}`;
      } else {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${wsProtocol}//${window.location.host}/api/chat/ws/${clientIdRef.current}`;
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
        <div className="w-72 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 p-5 overflow-y-auto flex flex-col">
          {/* Mi usuario */}
          <div className="mb-6 pb-4 border-b-2 border-gray-200">
            <div className="flex items-center space-x-3 bg-blue-600 text-white rounded-lg p-3.5">
              <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center font-bold text-lg">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{username}</p>
                <p className="text-xs text-blue-100">
                  {isConnected ? <img src={connected} alt="Conectado" className="w-4 h-4 mr-1 inline" /> : <img src={disconnected} alt="Desconectado" className="w-4 h-4 mr-1 inline" />}
                  {/* {isConnected ? 'En línea' : '🔴 Desconectado'} */}
                </p>
              </div>
            </div>
          </div>

          {/* Usuarios conectados */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3 pl-1"><img src={users} alt="Usuarios" className="w-4 h-4 mr-1 inline" /> Usuarios</h3>
            <div className="space-y-1.5">
              {messages
                .filter((msg) => msg.type === 'received' && msg.sender && !msg.sender.includes('[#'))
                .map((msg) => msg.sender.split('[#')[0])
                .filter((value, index, self) => self.indexOf(value) === index && value !== 'System')
                .slice(0, 10)
                .map((user) => (
                  <div
                    key={user}
                    className="flex items-center space-x-2.5 p-2.5 hover:bg-gray-200 rounded-lg cursor-pointer transition duration-200 group"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 group-hover:animate-pulse"></div>
                    <span className="text-sm text-gray-700 font-medium truncate group-hover:font-semibold">
                      {user}
                    </span>
                  </div>
                ))}
              {messages.filter((msg) => msg.type === 'received' && msg.sender).length === 0 && (
                <p className="text-xs text-gray-500 italic p-2">Esperando otros usuarios...</p>
              )}
            </div>
          </div>

          {/* Salas */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3 pl-1">🏠 Salas</h3>
            {activeRoom ? (
              <div className="px-3 py-2.5 bg-purple-100 text-purple-900 rounded-lg text-sm font-semibold border-l-4 border-purple-500">
                #{activeRoom}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic p-2">Sin sala activa</p>
            )}
          </div>

          {/* Comandos */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3 pl-1"><img src={confif} alt="Configuración" className="w-4 h-4 mr-1 inline" /> Comandos</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleCommandClick('/list')}
                className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-sm transition duration-200 flex items-center space-x-2"
              >
                <span><img src={lists} alt="Lista" className="w-4 h-4 mr-1 inline" /></span>
                <span>/list</span>
              </button>
              <button
                onClick={() => handleCommandClick('/rooms')}
                className="w-full text-left px-3 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium text-sm transition duration-200 flex items-center space-x-2"
              >
                <span><img src={rooms} alt="Salas" className="w-4 h-4 mr-1 inline" /></span>
                <span>/rooms</span>
              </button>
              {activeRoom && (
                <button
                  onClick={() => handleCommandClick('/leave')}
                  className="w-full text-left px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium text-sm transition duration-200 flex items-center space-x-2"
                >
                  <span><img src={disconnected} alt="Salir" className="w-4 h-4 mr-1 inline" /></span>
                  <span>/leave</span>
                </button>
              )}
            </div>
          </div>

          <div className="mb-6">
            <a href="/downloads/chat-client" download="chat-client">
             Descargar cliente Linux
            </a>
            <a href="/downloads/chat_client.exe" download="chat_client.exe">
              Descargar cliente Windows
            </a>
          </div>

          {/* Info */}
          <div className="mt-auto pt-4 border-t border-gray-200">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-3 rounded-lg">
              <p className="text-xs text-gray-700 leading-relaxed">
                <img src={idea} alt="Consejo" className="w-4 h-4 mr-1 inline" />
                <strong>Tip:</strong> Escribe <code className="bg-white px-1.5 py-0.5 rounded text-blue-700 font-semibold text-xs">/join sala</code> para entrar a una sala
              </p>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Chat Empresarial</h2>
                <p className="text-sm text-blue-100">
                  {activeRoom ? `Sala: #${activeRoom}` : 'Chat general'}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 justify-end">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                  <span className="text-sm font-medium">{isConnected ? 'En línea' : 'Fuera de línea'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">👋 ¡Bienvenido al chat!</p>
                  <p className="text-sm">Comienza escribiendo un mensaje</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                if (msg.type === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center py-2">
                      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-full text-xs font-semibold text-center max-w-md">
                        ℹ️ {msg.content}
                      </div>
                    </div>
                  );
                }

                if (msg.type === 'sent') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none px-5 py-3 max-w-xs shadow-md hover:shadow-lg transition">
                        <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                        <p className="text-xs text-blue-100 mt-1.5 text-right">
                          {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (msg.type === 'received') {
                  const sender = msg.sender.split('[#')[0];
                  const room = msg.sender.includes('[#') ? msg.sender.match(/\[#(\w+)\]/)?.[1] : null;
                  
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="flex space-x-3 max-w-xs">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {sender.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline space-x-2 mb-1">
                            <span className="text-sm font-bold text-gray-800">{sender}</span>
                            {room && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">#{room}</span>}
                            <span className="text-xs text-gray-500">
                              {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="bg-gray-200 text-gray-900 rounded-2xl rounded-tl-none px-5 py-3 shadow-sm hover:shadow-md transition">
                            <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-300 p-4 shadow-lg">
            <div className="flex space-x-3 items-end">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe un mensaje o comando (/list, /rooms, /join...)..."
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition duration-200 text-sm"
                disabled={!isConnected}
              />
              <button
                onClick={handleSendMessage}
                disabled={!isConnected || !inputValue.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-2xl font-bold transition duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg disabled:shadow-none"
              >
                <span><img src={send} alt="Enviar" className="w-5 h-5" /></span>
                <span>Enviar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;