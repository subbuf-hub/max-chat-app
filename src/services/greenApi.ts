// src/services/greenApi.ts

export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export interface GreenApiNotification {
  receiptId: number;
  body: {
    typeWebhook: string;
    senderData?: {
      chatId: string;
      senderName?: string;
    };
    messageData?: {
      textMessageData?: {
        textMessage: string;
      };
    };
  };
}

// 1. Отправка сообщения
export const sendMessageApi = async (
  credentials: Credentials,
  chatId: string,
  message: string
): Promise<boolean> => {
  const url = `${credentials.apiUrl}/waInstance${credentials.idInstance}/SendMessage/${credentials.apiTokenInstance}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });

  if (!response.ok) {
    // Читаем тело ответа, чтобы увидеть причину ошибки
    const errorData = await response.json().catch(() => null);
    console.error('GREEN-API SendMessage Error:', errorData);
    return false;
  }
  return true;
};

// 2. Получение уведомления
export const receiveNotificationApi = async (
  credentials: Credentials
): Promise<GreenApiNotification | null> => {
  const url = `${credentials.apiUrl}/waInstance${credentials.idInstance}/ReceiveNotification/${credentials.apiTokenInstance}?receiveTimeout=5`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const text = await response.text();
    if (!text) return null;
    
    return JSON.parse(text) as GreenApiNotification;
  } catch (error) {
    console.error('Receive API error:', error);
    return null;
  }
};

// 3. Удаление уведомления
export const deleteNotificationApi = async (
  credentials: Credentials,
  receiptId: number
): Promise<void> => {
  const url = `${credentials.apiUrl}/waInstance${credentials.idInstance}/DeleteNotification/${credentials.apiTokenInstance}/${receiptId}`;
  try {
    await fetch(url, { method: 'DELETE' });
  } catch (error) {
    console.error('Delete API error:', error);
  }
};

// 4. Настройка инстанса (чтобы приходили входящие)
export const configureInstanceApi = async (credentials: Credentials): Promise<void> => {
  const url = `${credentials.apiUrl}/waInstance${credentials.idInstance}/SetSettings/${credentials.apiTokenInstance}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: "",
        incomingWebhook: "yes",
        outgoingWebhook: "yes",
        stateWebhook: "yes"
      })
    });
  } catch (error) {
    console.error('SetSettings API error:', error);
  }
};