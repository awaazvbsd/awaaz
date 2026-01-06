import React, { createContext, useContext, useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import { Chat, Channel, ChannelList, MessageList, MessageInput, Thread, Window } from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';

// Initialize Stream Chat client
// API Key: kt3cr78evu5y
// API Secret: kpfebwva7mvhp3wwwv8cynfgeemdrf7wkrexszr8zhz4p8nj2gnjr5jy4tadsamb
// Note: API Secret should be stored server-side for production token generation
const chatClient = StreamChat.getInstance('kt3cr78evu5y');

interface StreamChatContextType {
  client: StreamChat;
  isConnected: boolean;
  connectUser: (userId: string, userName?: string) => Promise<void>;
  disconnectUser: () => void;
  createChannel: (teacherId: string, studentId: string, createdBy?: string) => Promise<any>;
  getChannel: (channelId: string) => any;
}

const StreamChatContext = createContext<StreamChatContextType | undefined>(undefined);

export const useStreamChat = () => {
  const context = useContext(StreamChatContext);
  if (context === undefined) {
    throw new Error('useStreamChat must be used within a StreamChatProvider');
  }
  return context;
};

interface StreamChatProviderProps {
  children: React.ReactNode;
}

export const StreamChatProvider: React.FC<StreamChatProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Set up connection state listener
    const handleConnectionChange = (event: any) => {
      setIsConnected(event.online);
    };

    chatClient.on('connection.changed', handleConnectionChange);

    return () => {
      chatClient.off('connection.changed', handleConnectionChange);
    };
  }, []);

  const connectUser = async (userId: string, userName?: string) => {
    try {
      // Skip if already connected with this user (prevents multi-tab conflicts)
      if (chatClient.userID === userId && chatClient.wsConnection?.isHealthy) {
        console.log('[StreamChat] User already connected:', userId);
        setIsConnected(true);
        return;
      }

      // Disconnect any existing user first (handles switching users)
      if (chatClient.userID && chatClient.userID !== userId) {
        console.log('[StreamChat] Disconnecting previous user before connecting new one');
        await chatClient.disconnectUser();
      }

      // Get JWT token from backend server
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/stream-chat-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userName: userName || `User ${userId}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate token');
      }

      const { token } = await response.json();

      await chatClient.connectUser(
        {
          id: userId,
          name: userName || `User ${userId}`,
        },
        token
      );

      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect user:', error);
      throw error;
    }
  };

  const disconnectUser = () => {
    chatClient.disconnectUser();
    setIsConnected(false);
  };

  const createChannel = async (teacherId: string, studentId: string, createdBy?: string) => {
    try {
      const channelId = `teacher-${teacherId}-student-${studentId}`;
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

      // Step 1: Create channel SERVER-SIDE with admin permissions
      // This bypasses the client-side permission restrictions
      try {
        const createResponse = await fetch(`${backendUrl}/stream-chat-channel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            teacherId,
            studentId,
          }),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          console.warn('[StreamChat] Server-side channel creation failed:', errorData.error);
          // Continue anyway - we'll try client-side as fallback
        } else {
          console.log('[StreamChat] Channel created server-side:', channelId);
        }
      } catch (serverError) {
        console.warn('[StreamChat] Server-side channel creation error:', serverError);
        // Continue anyway
      }

      // Step 2: Get channel reference and watch it client-side
      const channel = chatClient.channel('messaging', channelId, {
        members: [teacherId, studentId],
      } as any);

      // Watch the channel (this now works because it was created server-side with proper permissions)
      await channel.watch();

      console.log('[StreamChat] Channel ready for messaging:', channelId, 'Members:', Object.keys(channel.state?.members || {}));

      return channel;
    } catch (error) {
      console.error('Failed to create channel:', error);
      throw error;
    }
  };

  const getChannel = (channelId: string) => {
    return chatClient.channel('messaging', channelId);
  };

  const value = {
    client: chatClient,
    isConnected,
    connectUser,
    disconnectUser,
    createChannel,
    getChannel,
  };

  return (
    <StreamChatContext.Provider value={value}>
      <Chat client={chatClient} theme="messaging light">
        {children}
      </Chat>
    </StreamChatContext.Provider>
  );
};

export default StreamChatProvider;
