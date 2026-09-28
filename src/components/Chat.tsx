import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';

// Импортируем типы отдельно с помощью import type
import type { Credentials } from '../services/greenApi';

// Импортируем функции как обычные значения
import { 
  sendMessageApi, 
  receiveNotificationApi, 
  deleteNotificationApi, 
  configureInstanceApi 
} from '../services/greenApi';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'contact';
}

const Chat: React.FC = () => {
  const [credentials, setCredentials] = useState<Credentials>({ 
    apiUrl: '', 
    idInstance: '', 
    apiTokenInstance: '' 
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');

  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Авто-скролл к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Остановка опроса при размонтировании
  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  // --- ЛОГИКА ---

  const handleConnect = async (): Promise<void> => {
    if (!credentials.apiUrl || !credentials.idInstance || !credentials.apiTokenInstance) {
      alert('Пожалуйста, заполните все поля для подключения.');
      return;
    }
    await configureInstanceApi(credentials);
    setIsConnected(true);
    startPolling();
  };

  const handleCreateChat = (): void => {
    if (phoneNumber.length < 10) return;
    setCurrentChatId(`${phoneNumber}@c.us`);
  };

  const sendMessage = async (): Promise<void> => {
    if (!newMessage.trim() || !currentChatId) return;

    const userMessage: Message = { id: Date.now(), text: newMessage, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    const success = await sendMessageApi(credentials, currentChatId, userMessage.text);
    if (!success) {
      console.error('Не удалось отправить сообщение');
    }
  };

  const startPolling = (): void => {
    const poll = async (): Promise<void> => {
      const notification = await receiveNotificationApi(credentials);
      
      if (notification) {
        const { receiptId, body } = notification;
        
        if (body.typeWebhook === 'incomingMessageReceived' && body.messageData?.textMessageData?.textMessage) {
          setMessages(prev => [...prev, { 
            id: Date.now(), 
            text: body.messageData!.textMessageData!.textMessage, 
            sender: 'contact' 
          }]);
        }
        
        await deleteNotificationApi(credentials, receiptId);
      }
    };

    pollingInterval.current = setInterval(poll, 3000);
  };

  const handleCredentialChange = (field: keyof Credentials, value: string): void => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  // --- РЕНДЕР ---

  // Экран авторизации
  if (!isConnected) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h2>Вход в MAX</h2>
          <div className="login-form">
            <input 
              placeholder="API URL (https://3100.api.green-api.com)" 
              value={credentials.apiUrl} 
              onChange={(e) => handleCredentialChange('apiUrl', e.target.value)} 
            />
            <input 
              placeholder="ID Instance" 
              value={credentials.idInstance} 
              onChange={(e) => handleCredentialChange('idInstance', e.target.value)} 
            />
            <input 
              type="password"
              placeholder="API Token Instance" 
              value={credentials.apiTokenInstance} 
              onChange={(e) => handleCredentialChange('apiTokenInstance', e.target.value)} 
            />
            <button onClick={handleConnect}>Подключиться</button>
          </div>
        </div>
      </div>
    );
  }

  // Экран чата
  return (
    <div className="chat-wrapper">
      {/* Шапка чата */}
      <div className="chat-header">
        <div className="chat-header-avatar">
          {currentChatId ? currentChatId[0].toUpperCase() : '?'}
        </div>
        <div className="chat-header-info">
          <h3>{currentChatId ? currentChatId.split('@')[0] : 'Новый чат'}</h3>
          <p>{currentChatId ? 'в сети' : 'введите номер'}</p>
        </div>
      </div>

      {/* Создание чата (если еще не создан) */}
      {!currentChatId ? (
        <div className="empty-state">
          <h3>Начните общение</h3>
          <p>Введите номер телефона получателя, чтобы создать чат.</p>
          <div className="input-area" style={{ marginTop: '20px', width: '100%', maxWidth: '400px', border: 'none', background: 'transparent' }}>
            <input 
              placeholder="79999999999" 
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleCreateChat()}
            />
            <button className="send-button" onClick={handleCreateChat}>
              <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Область сообщений */}
          <div className="messages-area">
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>Нет сообщений. Напишите первым!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`message-bubble ${msg.sender === 'user' ? 'message-outgoing' : 'message-incoming'}`}
                >
                  {msg.text}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Поле ввода */}
          <div className="input-area">
            <input 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Введите сообщение..."
            />
            <button className="send-button" onClick={sendMessage}>
              <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;