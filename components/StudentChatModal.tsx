import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Users, ChevronLeft, Plus, Send } from './Icons';
import { useStreamChat } from './StreamChatProvider';
import { Channel, MessageList, MessageInput, Thread, Window } from 'stream-chat-react';
import { cn } from '../lib/utils';

interface StudentChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName?: string;
}

const MotionDiv = motion.div as any;

const StudentChatModal: React.FC<StudentChatModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName = 'Student'
}) => {
  const { client, connectUser, isConnected, createChannel } = useStreamChat();
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  // Teacher ID (hardcoded - same as admin code)
  const teacherId = '9999';

  useEffect(() => {
    if (isOpen && studentId) {
      initializeStudentChat();
    }
  }, [isOpen, studentId]);

  const initializeStudentChat = async () => {
    try {
      setIsLoading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const teacherId = '9999';

      // Connect student user if not already connected
      if (!isConnected) {
        await connectUser(studentId, studentName);
      }

      // Step 1: Ensure channel exists server-side with admin permissions
      // This is critical - students can't create/query channels on their own
      try {
        await fetch(`${backendUrl}/stream-chat-channel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teacherId, studentId }),
        });
        console.log('[StudentChat] Ensured channel exists server-side');
      } catch (serverError) {
        console.warn('[StudentChat] Server-side channel creation error:', serverError);
      }

      // Step 2: Now try to watch the channel (should work since it was created server-side)
      let channelQueryResponse: any[] = [];
      const channelId = `teacher-${teacherId}-student-${studentId}`;

      try {
        const existingChannel = client.channel('messaging', channelId);
        await existingChannel.watch();

        if (existingChannel.state) {
          channelQueryResponse = [existingChannel];
          console.log('[StudentChat] Successfully connected to channel:', channelId);
        }
      } catch (watchError: any) {
        console.warn('[StudentChat] Failed to watch channel:', watchError);
        // Try querying all channels as fallback
        try {
          const channelFilters = {
            type: 'messaging',
            members: { $in: [studentId] }
          };
          channelQueryResponse = await client.queryChannels(channelFilters, [{ last_message_at: -1 }], {
            watch: true,
            state: true,
          });
        } catch (queryError) {
          console.warn('[StudentChat] Channel query also failed:', queryError);
        }
      }

      setChannels(channelQueryResponse);

      // Set the first channel as active if available AND we're on desktop
      if (channelQueryResponse.length > 0 && window.innerWidth > 768) {
        setActiveChannel(channelQueryResponse[0]);
      }
    } catch (error) {
      console.error('Failed to initialize student chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectChannel = (channel: any) => {
    setActiveChannel(channel);
  };

  const createNewChatWithTeacher = async () => {
    try {
      setIsCreatingChannel(true);

      if (!isConnected) {
        await connectUser(studentId, studentName);
      }

      const newChannel = await createChannel(teacherId, studentId);
      await initializeStudentChat();
      setActiveChannel(newChannel);
    } catch (error) {
      console.error('Failed to create chat with teacher:', error);
      alert('Failed to start chat with teacher. Please try again.');
    } finally {
      setIsCreatingChannel(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-0 md:p-6"
          onClick={onClose}
        >
          <MotionDiv
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e: any) => e.stopPropagation()}
            className="w-full h-full md:max-w-5xl md:h-[80vh] md:max-h-[750px] bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl flex relative md:rounded-[32px] overflow-hidden"
          >
            {/* Sidebar - Channel List */}
            <div className={cn(
              "w-full md:w-80 border-r border-white/10 bg-white/5 flex flex-col transition-all duration-300",
              activeChannel ? "hidden md:flex" : "flex"
            )}>
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                      <Users className="w-6 h-6 text-purple-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">Messages</h3>
                      <p className="text-xs text-text-muted font-medium">{channels.length} {channels.length === 1 ? 'conversation' : 'conversations'}</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="md:hidden w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <button
                  onClick={createNewChatWithTeacher}
                  disabled={isCreatingChannel}
                  className="w-full px-4 py-3.5 bg-purple-primary text-white rounded-2xl hover:bg-purple-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-black text-sm uppercase tracking-wider shadow-lg shadow-purple-primary/20"
                >
                  {isCreatingChannel ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Message Teacher</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 custom-scrollbar">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="w-6 h-6 border-2 border-purple-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : channels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 h-full text-center">
                    <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mb-4">
                      <MessageCircle className="w-8 h-8 text-white/10" />
                    </div>
                    <p className="text-white/40 text-sm font-medium">No messages yet</p>
                  </div>
                ) : (
                  channels.map((channel) => {
                    const lastMessageObj = channel.state?.last_message;
                    let lastMessage = '';
                    if (lastMessageObj?.text) lastMessage = lastMessageObj.text;
                    else if (lastMessageObj?.attachments?.length) lastMessage = '📎 Attachment';

                    const isActive = activeChannel?.id === channel.id;

                    return (
                      <MotionDiv
                        key={channel.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => selectChannel(channel)}
                        className={cn(
                          "p-4 rounded-2xl cursor-pointer transition-all duration-200 border group",
                          isActive
                            ? "bg-purple-primary/20 border-purple-primary/30 shadow-lg shadow-purple-primary/10"
                            : "hover:bg-white/[0.03] border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center border transition-colors",
                            isActive ? "bg-purple-primary/40 border-purple-primary/50" : "bg-white/5 border-white/10 group-hover:border-white/20"
                          )}>
                            <MessageCircle className={cn("w-5 h-5", isActive ? "text-white" : "text-purple-300")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-bold truncate transition-colors", isActive ? "text-white" : "text-white/80")}>
                              {channel.data?.name || 'Teacher Chat'}
                            </p>
                            {lastMessage && (
                              <p className="text-xs text-text-muted truncate font-medium mt-0.5">
                                {lastMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      </MotionDiv>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Content */}
            <div className={cn(
              "flex-1 flex flex-col bg-black/20",
              activeChannel ? "flex" : "hidden md:flex"
            )}>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-4">
                  {activeChannel && (
                    <button
                      onClick={() => setActiveChannel(null)}
                      className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                  )}
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full flex items-center justify-center border border-white/10">
                    <MessageCircle className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {activeChannel ? (activeChannel.data?.name || 'Teacher Chat') : 'Chat Platform'}
                    </h3>
                    <p className="text-xs text-text-muted font-medium">
                      {activeChannel ? 'Connected with Counselor' : 'Select a conversation'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors hidden md:flex"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex-1 flex flex-col relative" style={{ minHeight: 0 }}>
                {activeChannel ? (
                  <>
                    <style>{`
                      .str-chat, .str-chat__container, .str-chat__channel, .str-chat__main-panel,
                      .str-chat__message-list, .str-chat__message-list-scroll, .str-chat__list,
                      .str-chat__ul, .str-chat__virtual-list, .str-chat__thread {
                        background: transparent !important;
                      }
                      .str-chat__channel { height: 100% !important; display: flex !important; flex-direction: column !important; position: relative !important; }
                      .str-chat__main-panel { flex: 1 !important; display: flex !important; flex-direction: column !important; min-height: 0 !important; height: 100% !important; }
                      .str-chat__message-list { flex: 1 !important; padding: 24px !important; }
                      
                      .str-chat__li { margin-bottom: 12px !important; }
                      .str-chat__avatar { display: none !important; }
                      .str-chat__message, .str-chat__message-simple { background: transparent !important; width: 100% !important; }
                       .str-chat__message-inner { 
                         background: transparent !important; 
                         width: 100% !important; 
                         display: flex !important; 
                         flex-direction: column !important;
                       }
                       .str-chat__message--me .str-chat__message-inner { align-items: flex-end !important; }
                       .str-chat__message:not(.str-chat__message--me) .str-chat__message-inner { align-items: flex-start !important; }
                       
                       .str-chat__message-bubble { background: transparent !important; border: none !important; box-shadow: none !important; width: auto !important; max-width: 85% !important; }
                      .str-chat__message-options { display: none !important; }
                       .str-chat__message:not(.str-chat__message--me) .str-chat__message-text-inner {
                         background: rgba(255, 255, 255, 0.05) !important;
                         border: 1px solid rgba(255, 255, 255, 0.1) !important;
                         color: #ffffff !important;
                         padding: 12px 18px !important;
                         border-radius: 20px 20px 20px 6px !important;
                         width: max-content !important;
                         max-width: 100% !important;
                         min-width: 60px !important;
                         display: block !important;
                         backdrop-filter: blur(8px) !important;
                         word-break: normal !important;
                         overflow-wrap: break-word !important;
                       }
                       .str-chat__message--me .str-chat__message-text-inner {
                         background: linear-gradient(135deg, #a855f720, #6366f120) !important;
                         border: 1px solid rgba(168, 85, 247, 0.3) !important;
                         color: #ffffff !important;
                         padding: 12px 18px !important;
                         border-radius: 20px 20px 6px 20px !important;
                         width: max-content !important;
                         max-width: 100% !important;
                         min-width: 60px !important;
                         display: block !important;
                         backdrop-filter: blur(8px) !important;
                         word-break: normal !important;
                         overflow-wrap: break-word !important;
                       }
                      
                      .str-chat__message-text-inner p { color: #ffffff !important; font-size: 15px !important; line-height: 1.6 !important; }
                      .str-chat__message-data { font-size: 10px !important; color: rgba(255, 255, 255, 0.4) !important; opacity: 1 !important; }
                      
                      .str-chat__date-separator { margin: 32px 0 !important; }
                      .str-chat__date-separator-date { 
                        background: rgba(255, 255, 255, 0.05) !important; 
                        color: rgba(255, 255, 255, 0.6) !important;
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                        font-family: inherit !important;
                        font-weight: 600 !important;
                        letter-spacing: 0.05em !important;
                      }

                      /* Custom Input Reset */
                      .str-chat__message-input { 
                         background: transparent !important; 
                         border: none !important; 
                         padding: 16px 24px 24px 24px !important;
                         width: 100% !important;
                         margin: 0 auto !important;
                         max-width: 900px !important;
                      }
                      .str-chat__message-input-inner {
                        background: rgba(0, 0, 0, 0.4) !important;
                      backdrop-filter: blur(20px) !important;
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                        border-radius: 24px !important;
                        padding: 8px 12px 8px 18px !important;
                      }
                       .str-chat__textarea textarea { 
                         font-size: 15px !important; 
                         height: auto !important; 
                         max-height: 120px !important; 
                         color: #ffffff !important;
                         caret-color: #a855f7 !important;
                       }
                       .str-chat__textarea textarea::placeholder { color: rgba(255, 255, 255, 0.4) !important; }
                       .str-chat__send-button {
                        background: linear-gradient(135deg, #a855f7, #7c3aed) !important;
                        box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3) !important;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                        width: 40px !important;
                        height: 40px !important;
                        border-radius: 12px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        padding: 0 !important;
                        margin-left: 8px !important;
                      }
                      .str-chat__send-button:hover { 
                        transform: translateY(-2px) scale(1.05) !important; 
                        box-shadow: 0 6px 16px rgba(168, 85, 247, 0.4) !important;
                        filter: brightness(1.1) !important; 
                      }
                      .str-chat__send-button:active { transform: translateY(0) scale(0.95) !important; }
                      .str-chat__send-button svg { display: none !important; }
                      .str-chat__send-button::after {
                        content: '';
                        display: block;
                        width: 20px;
                        height: 20px;
                        background-color: white;
                        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='1.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5'/%3E%3C/svg%3E") no-repeat center;
                        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='1.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5'/%3E%3C/svg%3E") no-repeat center;
                      }
                    `}</style>
                    <div className="flex-1 overflow-hidden">
                      <Channel channel={activeChannel} {...{ theme: "messaging dark" } as any}>
                        <Window>
                          <MessageList />
                          <MessageInput />
                        </Window>
                        <Thread />
                      </Channel>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-3xl flex items-center justify-center border border-white/10 mb-6 shadow-2xl">
                      <MessageCircle className="w-10 h-10 text-purple-300/50" />
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-2 tracking-tight">Your Safe Space</h4>
                    <p className="text-text-muted max-w-xs font-medium">
                      Select a conversation or start a new one to chat with our supportive counseling team.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};

export default StudentChatModal;
