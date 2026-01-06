import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StorageService } from '../services/storageService';
import { X, MessageCircle, Users, Pencil, ChevronLeft } from './Icons';
import { useStreamChat } from './StreamChatProvider';
import { Channel, MessageList, MessageInput, Thread, Window } from 'stream-chat-react';
import { cn } from '../lib/utils';

const MotionDiv = motion.div as any;

interface TeacherChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  students?: Array<{ code: string; name: string }>; // Optional list of students for display names
  selectedStudentId?: string | null; // Optional student ID to open chat with
}

const TeacherChatModal: React.FC<TeacherChatModalProps> = ({
  isOpen,
  onClose,
  teacherId,
  students = [],
  selectedStudentId = null
}) => {
  const { client, connectUser, isConnected, createChannel } = useStreamChat();
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState<string>('');
  const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null);

  // Nickname management functions
  const getNicknames = useCallback((): Record<string, string> => {
    const stored = StorageService.getItem<Record<string, string>>('studentNicknames');
    return stored || {};
  }, []);

  const setNickname = useCallback((studentId: string, nickname: string) => {
    const nicknames = getNicknames();
    if (nickname.trim()) {
      nicknames[studentId] = nickname.trim();
    } else {
      delete nicknames[studentId];
    }
    StorageService.setItem('studentNicknames', nicknames, teacherId, 'state');
  }, [getNicknames, teacherId]);

  const getNickname = useCallback((studentId: string): string | null => {
    const nicknames = getNicknames();
    return nicknames[studentId] || null;
  }, [getNicknames]);

  const getDisplayName = useCallback((studentId: string): string => {
    const nickname = getNickname(studentId);
    return nickname ? `${nickname} (${studentId})` : studentId;
  }, [getNickname]);

  // Extract student ID from channel ID (format: teacher-{teacherId}-student-{studentId})
  const getStudentIdFromChannel = (channelId: string): string => {
    const match = channelId.match(/student-(\d+)/);
    return match ? match[1] : 'Unknown';
  };

  // Get other member ID (not the teacher) - defined before use in useEffect
  const getStudentIdFromChannelMembers = (channel: any): string => {
    const members = channel.state?.members || {};
    const memberIds = Object.keys(members);
    const studentId = memberIds.find(id => id !== teacherId);
    return studentId || getStudentIdFromChannel(channel.id);
  };

  // Initialize chat and handle selected student
  useEffect(() => {
    const initializeAndHandleStudent = async () => {
      if (!isOpen || !teacherId) return;

      try {
        setIsLoading(true);

        // Connect teacher user if not already connected
        if (!isConnected) {
          await connectUser(teacherId, 'Teacher');
        }

        // If a specific student is selected, create/get their channel first
        if (selectedStudentId) {
          console.log('Creating/getting channel for student:', selectedStudentId);
          try {
            // Create or get the channel for this specific student
            const studentChannel = await createChannel(teacherId, selectedStudentId);
            console.log('Channel created/retrieved:', studentChannel.id);

            // Ensure the channel is properly watched and both members are added
            const currentMembers = studentChannel.state?.members || {};
            const memberIds = Object.keys(currentMembers);

            if (memberIds.length < 2 || !memberIds.includes(teacherId) || !memberIds.includes(selectedStudentId)) {
              // Force add members if they're missing
              try {
                if (!memberIds.includes(teacherId)) {
                  await studentChannel.addMembers([teacherId]);
                }
                if (!memberIds.includes(selectedStudentId)) {
                  await studentChannel.addMembers([selectedStudentId]);
                }
                // Watch again after adding members
                await studentChannel.watch();
              } catch (addError) {
                console.log('Members may already be in channel:', addError);
              }
            }

            // Watch the channel again to ensure it's fully initialized and ready for messaging
            await studentChannel.watch();

            // Verify channel is ready
            console.log('Channel state after initialization:', {
              id: studentChannel.id,
              members: Object.keys(studentChannel.state?.members || {}),
              ready: studentChannel.state?.initialized
            });

            setActiveChannel(studentChannel);

            // Now query all channels to update the list
            const channelFilters = {
              type: 'messaging',
              members: { $in: [teacherId] }
            };
            const channelSort = [{ last_message_at: -1 }];
            const channelQueryResponse = await client.queryChannels(channelFilters, channelSort, {
              watch: true,
              state: true,
            });
            setChannels(channelQueryResponse);

            // Ensure the student channel is still active
            const foundChannel = channelQueryResponse.find(ch => ch.id === studentChannel.id);
            if (foundChannel) {
              setActiveChannel(foundChannel);
            } else {
              // If not found in query, use the created channel
              setActiveChannel(studentChannel);
              // Add it to the channels list
              setChannels(prev => [studentChannel, ...prev]);
            }
          } catch (error) {
            console.error('Failed to create/get channel for student:', error);
            // Fallback: query all channels
            const channelFilters = {
              type: 'messaging',
              members: { $in: [teacherId] }
            };
            const channelSort = [{ last_message_at: -1 }];
            const channelQueryResponse = await client.queryChannels(channelFilters, channelSort, {
              watch: true,
              state: true,
            });
            setChannels(channelQueryResponse);

            // Try to find existing channel with this student
            const existingChannel = channelQueryResponse.find(channel => {
              const studentId = getStudentIdFromChannelMembers(channel);
              return studentId === selectedStudentId;
            });

            if (existingChannel) {
              setActiveChannel(existingChannel);
            } else if (channelQueryResponse.length > 0) {
              setActiveChannel(channelQueryResponse[0]);
            }
          }
        } else {
          // No specific student selected - just query all channels
          const channelFilters = {
            type: 'messaging',
            members: { $in: [teacherId] }
          };
          const channelSort = [{ last_message_at: -1 }];
          const channelQueryResponse = await client.queryChannels(channelFilters, channelSort, {
            watch: true,
            state: true,
          });
          setChannels(channelQueryResponse);

          // Set the first channel as active if available
          if (channelQueryResponse.length > 0) {
            setActiveChannel(channelQueryResponse[0]);
          }
        }
      } catch (error) {
        console.error('Failed to initialize teacher chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAndHandleStudent();
  }, [isOpen, teacherId, selectedStudentId, client, isConnected, connectUser, createChannel]);


  const selectChannel = (channel: any) => {
    setActiveChannel(channel);
  };

  // Get student name from student ID
  const getStudentName = (studentId: string): string => {
    const student = students.find(s => s.code === studentId);
    return student ? student.name : `Student ${studentId}`;
  };

  // Handle nickname edit
  const handleEditNickname = (e: React.MouseEvent, studentId: string) => {
    e.stopPropagation();
    const currentNickname = getNickname(studentId);
    setNicknameInput(currentNickname || '');
    setEditingStudentId(studentId);
  };

  const handleSaveNickname = () => {
    if (editingStudentId) {
      setNickname(editingStudentId, nicknameInput);
      setEditingStudentId(null);
      setNicknameInput('');
    }
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setNicknameInput('');
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
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-primary/20 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Messages</h3>
                    <p className="text-sm text-text-muted">{channels.length} conversations</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors md:hidden"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="w-6 h-6 border-2 border-purple-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : channels.length === 0 ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 text-text-muted mx-auto mb-2" />
                      <p className="text-text-muted text-sm">No messages yet</p>
                      <p className="text-text-muted text-xs mt-1">Start a conversation from a student's analysis page</p>
                    </div>
                  </div>
                ) : (
                  channels.map((channel) => {
                    const studentId = getStudentIdFromChannelMembers(channel);
                    // Get last message - try multiple ways to extract it
                    const lastMessageObj = channel.state?.last_message;
                    let lastMessage = '';
                    if (lastMessageObj) {
                      if (lastMessageObj.text) {
                        lastMessage = lastMessageObj.text;
                      } else if (lastMessageObj.attachments && lastMessageObj.attachments.length > 0) {
                        lastMessage = '📎 Attachment';
                      } else if (lastMessageObj.type) {
                        lastMessage = `[${lastMessageObj.type}]`;
                      }
                    }

                    const isActive = activeChannel?.id === channel.id;

                    return (
                      <MotionDiv
                        key={channel.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => selectChannel(channel)}
                        className={cn(
                          "p-4 mx-2 mb-2 rounded-2xl cursor-pointer transition-all duration-200 border group",
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
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-bold truncate transition-colors", isActive ? "text-white" : "text-white/80")}>
                                {getDisplayName(studentId)}
                              </p>
                              {lastMessage && (
                                <p className="text-xs text-text-muted truncate font-medium mt-0.5">
                                  {lastMessage}
                                </p>
                              )}
                            </div>
                            {isActive && (
                              <button
                                onClick={(e) => handleEditNickname(e, studentId)}
                                className="w-10 h-10 bg-purple-primary/20 hover:bg-purple-primary/40 rounded-full flex items-center justify-center transition-colors flex-shrink-0 active:scale-90"
                                title="Edit nickname"
                              >
                                <Pencil className="w-5 h-5 text-purple-primary" />
                              </button>
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
                      {activeChannel ? getDisplayName(getStudentIdFromChannelMembers(activeChannel)) : 'Select a conversation'}
                    </h3>
                    <p className="text-sm text-text-muted">
                      {activeChannel ? getStudentName(getStudentIdFromChannelMembers(activeChannel)) : 'Choose a chat from the sidebar'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
                {activeChannel ? (
                  <>
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
                      .str-chat__thread,
                      .str-chat__thread-container {
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
                        padding: 0 !important;
                        background: transparent !important;
                      }
                      
                      /* ===== HIDE ALL AVATARS ===== */
                      .str-chat__avatar,
                      .str-chat__avatar-image,
                      .str-chat__message-sender-avatar,
                      .str-chat__message-simple-sender-avatar {
                        display: none !important;
                      }
                      
                      /* ===== MESSAGE CONTAINER ===== */
                      .str-chat__message,
                      .str-chat__message-simple,
                      .str-chat__message-inner,
                      .str-chat__message-simple-wrapper {
                        background: transparent !important;
                        padding: 0 !important;
                      }
                      
                      /* ===== HIDE FLOATING MESSAGE ACTIONS BAR ===== */
                      .str-chat__message-options,
                      .str-chat__message-simple__actions,
                      .str-chat__message-actions-container,
                      .str-chat__message-reactions-button {
                        display: none !important;
                      }
                      
                      /* ===== MESSAGE TEXT BUBBLES ===== */
                      .str-chat__message-text,
                      .str-chat__message-bubble {
                        background: transparent !important;
                        border: none !important;
                      }
                      
                      /* RECEIVED messages - glass bubble */
                      .str-chat__message:not(.str-chat__message--me) .str-chat__message-text-inner {
                        background: rgba(255, 255, 255, 0.05) !important;
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                        color: #ffffff !important;
                        padding: 12px 18px !important;
                        border-radius: 20px 20px 20px 6px !important;
                        display: inline-block !important;
                        max-width: 300px !important;
                        word-wrap: break-word !important;
                        backdrop-filter: blur(8px) !important;
                      }
                      
                      /* SENT messages - purple glass gradient bubble */
                      .str-chat__message--me .str-chat__message-text-inner {
                        background: linear-gradient(135deg, #a855f720, #6366f120) !important;
                        border: 1px solid rgba(168, 85, 247, 0.3) !important;
                        color: #ffffff !important;
                        padding: 12px 18px !important;
                        border-radius: 20px 20px 6px 20px !important;
                        display: inline-block !important;
                        max-width: 300px !important;
                        word-wrap: break-word !important;
                        backdrop-filter: blur(8px) !important;
                      }
                      
                      .str-chat__message-text-inner p {
                        margin: 0 !important;
                        color: #ffffff !important;
                        line-height: 1.5 !important;
                        font-size: 14px !important;
                      }
                      
                      /* ===== TIMESTAMPS - Inline and subtle ===== */
                      .str-chat__message-data,
                      .str-chat__message-simple-timestamp,
                      .str-chat__message-simple__data,
                      .str-chat__message-simple-data {
                        font-size: 10px !important;
                        color: rgba(255, 255, 255, 0.4) !important;
                        margin-top: 2px !important;
                        margin-left: 0 !important;
                        display: inline-block !important;
                      }
                      
                      /* ===== HIDE SENDER NAME ===== */
                      .str-chat__message-sender-name,
                      .str-chat__message-simple-name {
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
                        font-weight: 500 !important;
                      }
                      
                      /* ===== READ RECEIPTS ===== */
                      .str-chat__message-status {
                        display: inline-flex !important;
                        align-items: center !important;
                        margin-left: 4px !important;
                        vertical-align: middle !important;
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
                      
                      /* ===== REACTIONS ON MESSAGES - Compact ===== */
                      .str-chat__reaction-list,
                      .str-chat__simple-reactions-list {
                        background: rgba(31, 31, 35, 0.9) !important;
                        border: none !important;
                        border-radius: 12px !important;
                        padding: 2px 6px !important;
                        margin-top: 4px !important;
                        display: inline-flex !important;
                        gap: 2px !important;
                      }
                      
                      .str-chat__reaction-list li,
                      .str-chat__simple-reactions-list li {
                        background: transparent !important;
                        padding: 2px !important;
                      }
                      
                      .str-chat__reaction-list button,
                      .str-chat__simple-reactions-list button {
                        font-size: 14px !important;
                        padding: 2px !important;
                      }
                      
                      /* ===== REACTION PICKER - Compact ===== */
                      .str-chat__reaction-selector {
                        background: #1f1f23 !important;
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                        border-radius: 20px !important;
                        padding: 6px 10px !important;
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
                      }
                      
                      .str-chat__reaction-selector ul {
                        display: flex !important;
                        gap: 4px !important;
                        margin: 0 !important;
                        padding: 0 !important;
                      }
                      
                      .str-chat__reaction-selector li {
                        background: transparent !important;
                        list-style: none !important;
                      }
                      
                      .str-chat__reaction-selector button {
                        background: transparent !important;
                        font-size: 18px !important;
                        padding: 4px !important;
                        border-radius: 6px !important;
                        transition: background 0.15s !important;
                      }
                      
                      .str-chat__reaction-selector button:hover {
                        background: rgba(255, 255, 255, 0.1) !important;
                      }
                      
                      /* ===== MESSAGE ACTIONS DROPDOWN ===== */
                      .str-chat__message-actions-box,
                      .str-chat__message-actions-list {
                        background: #1f1f23 !important;
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                        border-radius: 10px !important;
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
                        padding: 4px !important;
                        min-width: 120px !important;
                      }
                      
                      .str-chat__message-actions-list button {
                        background: transparent !important;
                        color: #ffffff !important;
                        border-radius: 6px !important;
                        padding: 8px 12px !important;
                        font-size: 13px !important;
                        width: 100% !important;
                        text-align: left !important;
                      }
                      
                      .str-chat__message-actions-list button:hover {
                        background: rgba(139, 92, 246, 0.2) !important;
                      }
                      
                      /* ===== MESSAGE INPUT AREA - Clean ===== */
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
                        line-height: 1.4 !important;
                        resize: none !important;
                        min-height: 24px !important;
                        max-height: 100px !important;
                      }
                      
                      .str-chat__textarea textarea::placeholder {
                        color: rgba(255, 255, 255, 0.35) !important;
                      }
                      
                      /* Input buttons */
                      .str-chat__file-input-container,
                      .str-chat__input-emojiselect {
                        color: rgba(255, 255, 255, 0.4) !important;
                        background: transparent !important;
                        border: none !important;
                        padding: 4px !important;
                        cursor: pointer !important;
                      }
                      
                      .str-chat__file-input-container:hover,
                      .str-chat__input-emojiselect:hover {
                        color: rgba(255, 255, 255, 0.7) !important;
                      }
                      
                      /* Send button */
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
                        cursor: pointer !important;
                        transition: transform 0.15s, box-shadow 0.15s !important;
                        flex-shrink: 0 !important;
                      }
                      
                      .str-chat__send-button:hover {
                        transform: scale(1.05) !important;
                        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4) !important;
                      }
                      
                      .str-chat__send-button svg {
                        fill: white !important;
                        width: 16px !important;
                        height: 16px !important;
                      }
                      
                      /* ===== EMOJI PICKER ===== */
                      .str-chat__emoji-picker,
                      .emoji-mart,
                      .emoji-mart-bar,
                      .emoji-mart-search,
                      .emoji-mart-scroll,
                      .emoji-mart-category-list {
                        background: #1f1f23 !important;
                      }
                      
                      .emoji-mart {
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                        border-radius: 12px !important;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
                      }
                      
                      .emoji-mart-search input {
                        background: #27272a !important;
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                        color: #ffffff !important;
                        border-radius: 8px !important;
                      }
                      
                      .emoji-mart-category-label span {
                        background: #1f1f23 !important;
                        color: rgba(255, 255, 255, 0.5) !important;
                      }
                      
                      /* ===== MODALS ===== */
                      .str-chat__modal,
                      .str-chat__modal-overlay {
                        background: rgba(0, 0, 0, 0.8) !important;
                      }
                      
                      .str-chat__modal__inner {
                        background: #1f1f23 !important;
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                        border-radius: 12px !important;
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
                      
                      .str-chat__message-list::-webkit-scrollbar-thumb:hover {
                        background: rgba(255, 255, 255, 0.25) !important;
                      }
                    `}</style>
                    <Channel channel={activeChannel} theme="messaging dark">
                      <Window>
                        <MessageList />
                        <MessageInput />
                      </Window>
                      <Thread />
                    </Channel>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-white mb-2">Welcome to Messages</h4>
                      <p className="text-text-muted">Select a conversation to start chatting with your students.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}

      {/* Nickname Edit Modal */}
      {editingStudentId && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={handleCancelEdit}
        >
          <MotionDiv
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e: any) => e.stopPropagation()}
            className="bg-background-primary rounded-xl p-6 w-full max-w-md border border-white/10 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Edit Nickname</h3>
            <p className="text-sm text-text-muted mb-4">Student Code: {editingStudentId}</p>

            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveNickname();
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              placeholder="Enter nickname (leave empty to remove)"
              className="w-full px-4 py-3 bg-surface border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-purple-primary mb-4"
              autoFocus
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNickname}
                className="px-4 py-2 bg-purple-primary hover:bg-purple-primary/90 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};

export default TeacherChatModal;

