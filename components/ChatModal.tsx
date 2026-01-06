import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle } from './Icons';
import { useStreamChat } from './StreamChatProvider';
import { Channel, MessageList, MessageInput, Thread, Window } from 'stream-chat-react';
import GlassCard from './GlassCard';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  studentId: string;
  studentName?: string;
}

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  teacherId,
  studentId,
  studentName = 'Student'
}) => {
  const { createChannel, connectUser, isConnected } = useStreamChat();
  const [channel, setChannel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && teacherId && studentId) {
      initializeChat();
    }
  }, [isOpen, teacherId, studentId]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);

      // Connect teacher user if not already connected
      if (!isConnected) {
        await connectUser(teacherId, 'Teacher');
      }

      // Create or get existing channel (this already watches the channel)
      const chatChannel = await createChannel(teacherId, studentId);
      setChannel(chatChannel);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl h-[80vh] max-h-[600px] bg-background-primary rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-surface/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-primary/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-purple-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Chat with {studentName}
                  </h3>
                  <p className="text-sm text-text-muted">Student ID: {studentId}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex flex-col" style={{ height: 'calc(100% - 80px)' }}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-purple-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-text-muted">Connecting to chat...</p>
                  </div>
                </div>
              ) : channel ? (
                <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
                  <style>{`
                    /* ===== DARK THEME - MAIN CONTAINERS ===== */
                    .str-chat,
                    .str-chat__container,
                    .str-chat__channel,
                    .str-chat__main-panel,
                    .str-chat__message-list,
                    .str-chat__message-list-scroll,
                    .str-chat__list,
                    .str-chat__ul,
                    .str-chat__virtual-list,
                    .str-chat__thread {
                      background: #0a0a0a !important;
                    }
                    
                    .str-chat__channel {
                      height: 100% !important;
                      display: flex !important;
                      flex-direction: column !important;
                    }
                    
                    .str-chat__main-panel {
                      flex: 1 !important;
                      display: flex !important;
                      flex-direction: column !important;
                      min-height: 0 !important;
                    }
                    
                    .str-chat__message-list {
                      flex: 1 !important;
                      overflow-y: auto !important;
                      padding: 16px !important;
                    }
                    
                    .str-chat__li {
                      margin-bottom: 8px !important;
                      background: transparent !important;
                    }
                    
                    /* ===== HIDE AVATARS ===== */
                    .str-chat__avatar,
                    .str-chat__avatar-image {
                      display: none !important;
                    }
                    
                    /* ===== MESSAGE CONTAINER ===== */
                    .str-chat__message,
                    .str-chat__message-simple,
                    .str-chat__message-inner {
                      background: transparent !important;
                      padding: 0 !important;
                    }
                    
                    /* ===== HIDE FLOATING ACTION BAR ===== */
                    .str-chat__message-options,
                    .str-chat__message-simple__actions,
                    .str-chat__message-actions-container,
                    .str-chat__message-reactions-button {
                      display: none !important;
                    }
                    
                    /* ===== MESSAGE BUBBLES ===== */
                    .str-chat__message-text,
                    .str-chat__message-bubble {
                      background: transparent !important;
                      border: none !important;
                    }
                    
                    .str-chat__message:not(.str-chat__message--me) .str-chat__message-text-inner {
                      background: #27272a !important;
                      color: #ffffff !important;
                      padding: 10px 14px !important;
                      border-radius: 18px 18px 18px 4px !important;
                      display: inline-block !important;
                      max-width: 300px !important;
                    }
                    
                    .str-chat__message--me .str-chat__message-text-inner {
                      background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
                      color: #ffffff !important;
                      padding: 10px 14px !important;
                      border-radius: 18px 18px 4px 18px !important;
                      display: inline-block !important;
                      max-width: 300px !important;
                    }
                    
                    .str-chat__message-text-inner p {
                      margin: 0 !important;
                      color: #ffffff !important;
                      line-height: 1.5 !important;
                      font-size: 14px !important;
                    }
                    
                    /* ===== TIMESTAMPS ===== */
                    .str-chat__message-data,
                    .str-chat__message-simple-timestamp {
                      font-size: 10px !important;
                      color: rgba(255, 255, 255, 0.4) !important;
                      margin-top: 2px !important;
                      display: inline-block !important;
                    }
                    
                    /* ===== HIDE SENDER NAME ===== */
                    .str-chat__message-sender-name {
                      display: none !important;
                    }
                    
                    /* ===== DATE SEPARATORS ===== */
                    .str-chat__date-separator {
                      margin: 20px 0 !important;
                      background: transparent !important;
                      display: flex !important;
                      justify-content: center !important;
                    }
                    
                    .str-chat__date-separator-line {
                      display: none !important;
                    }
                    
                    .str-chat__date-separator-date {
                      background: rgba(139, 92, 246, 0.15) !important;
                      color: #a78bfa !important;
                      font-size: 11px !important;
                      padding: 6px 14px !important;
                      border-radius: 14px !important;
                    }
                    
                    /* ===== READ RECEIPTS ===== */
                    .str-chat__message-status {
                      display: inline-flex !important;
                      align-items: center !important;
                      margin-left: 4px !important;
                    }
                    
                    .str-chat__message-status svg {
                      color: #6b7280 !important;
                      fill: #6b7280 !important;
                      width: 14px !important;
                      height: 14px !important;
                    }
                    
                    .str-chat__message-status--read svg {
                      color: #3b82f6 !important;
                      fill: #3b82f6 !important;
                    }
                    
                    /* ===== REACTIONS ===== */
                    .str-chat__reaction-list {
                      background: rgba(31, 31, 35, 0.9) !important;
                      border: none !important;
                      border-radius: 12px !important;
                      padding: 2px 6px !important;
                    }
                    
                    .str-chat__reaction-selector {
                      background: #1f1f23 !important;
                      border: 1px solid rgba(255, 255, 255, 0.1) !important;
                      border-radius: 20px !important;
                      padding: 6px 10px !important;
                    }
                    
                    /* ===== MESSAGE INPUT ===== */
                    .str-chat__message-input {
                      background: #0a0a0a !important;
                      border: none !important;
                      border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
                      padding: 12px 16px !important;
                    }
                    
                    .str-chat__message-input-inner {
                      background: #18181b !important;
                      border: 1px solid rgba(255, 255, 255, 0.1) !important;
                      border-radius: 22px !important;
                      display: flex !important;
                      align-items: center !important;
                      padding: 6px 8px 6px 14px !important;
                      gap: 8px !important;
                    }
                    
                    .str-chat__textarea {
                      flex: 1 !important;
                    }
                    
                    .str-chat__textarea textarea {
                      background: transparent !important;
                      color: #ffffff !important;
                      border: none !important;
                      outline: none !important;
                      padding: 6px 0 !important;
                      font-size: 14px !important;
                    }
                    
                    .str-chat__textarea textarea::placeholder {
                      color: rgba(255, 255, 255, 0.35) !important;
                    }
                    
                    .str-chat__file-input-container,
                    .str-chat__input-emojiselect {
                      color: rgba(255, 255, 255, 0.4) !important;
                      background: transparent !important;
                    }
                    
                    .str-chat__send-button {
                      background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
                      border: none !important;
                      border-radius: 50% !important;
                      width: 34px !important;
                      height: 34px !important;
                      min-width: 34px !important;
                      display: flex !important;
                      align-items: center !important;
                      justify-content: center !important;
                    }
                    
                    .str-chat__send-button svg {
                      fill: white !important;
                      width: 16px !important;
                      height: 16px !important;
                    }
                    
                    /* ===== SCROLLBAR ===== */
                    .str-chat__message-list::-webkit-scrollbar {
                      width: 5px !important;
                    }
                    
                    .str-chat__message-list::-webkit-scrollbar-track {
                      background: transparent !important;
                    }
                    
                    .str-chat__message-list::-webkit-scrollbar-thumb {
                      background: rgba(255, 255, 255, 0.15) !important;
                      border-radius: 3px !important;
                    }
                  `}</style>
                  <Channel channel={channel} theme="messaging dark">
                    <Window>
                      <MessageList />
                      <MessageInput />
                    </Window>
                    <Thread />
                  </Channel>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-text-muted">Failed to load chat</p>
                    <button
                      onClick={initializeChat}
                      className="mt-2 px-4 py-2 bg-purple-primary text-white rounded-lg hover:bg-purple-dark transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatModal;
