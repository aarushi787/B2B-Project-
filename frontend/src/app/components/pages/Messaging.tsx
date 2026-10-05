import { Search, Send } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../auth/AuthProvider";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import toast from "react-hot-toast";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  dealId?: string;
  content: string;
  timestamp: string;
  type: string;
  read?: boolean;
}

interface Conversation {
  id: string; // The other company's ID
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
}

export function Messaging() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [query, setQuery] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedConvId;
  const nameCache = useRef(new Map<string, string>());

  // One subscription for the life of the page. The socket is shared with the whole app, so it is never closed here.
  useEffect(() => {
    if (!user?.companyId) return;
    void fetchData();
    const unsubNewMsg = socketService.on<Message>('messages:new', (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      void refreshConversations();
    });
    const unsubTyping = socketService.on<{ senderId: string; isTyping: boolean }>('messages:typing', (payload) => {
      if (payload.senderId === selectedRef.current) setIsTyping(payload.isTyping);
    });
    return () => { unsubNewMsg(); unsubTyping(); };
  }, [user?.companyId]);

  useEffect(() => { setIsTyping(false); }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchData = async () => {
    try {
      const allMsgs = await apiClient.get<Message[]>(`/messages/company/${user?.companyId}`);
      const ordered = [...allMsgs].reverse(); // the API sends newest first; a chat reads oldest first
      setMessages(ordered);
      await buildConversations(ordered);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const refreshConversations = async () => {
    try {
      const allMsgs = await apiClient.get<Message[]>(`/messages/company/${user?.companyId}`);
      await buildConversations([...allMsgs].reverse());
    } catch (error) {}
  };

  const buildConversations = async (msgs: Message[]) => {
    if (!user?.companyId) return;
    
    const threads = new Map<string, Message[]>();
    msgs.forEach(msg => {
      const otherId = msg.senderId === user.companyId ? msg.receiverId : msg.senderId;
      if (!threads.has(otherId)) threads.set(otherId, []);
      threads.get(otherId)!.push(msg);
    });

    const convs: Conversation[] = [];
    for (const [otherId, threadMsgs] of Array.from(threads.entries())) {
      const lastMsg = threadMsgs[threadMsgs.length - 1];
      let compName = nameCache.current.get(otherId) ?? "";
      if (!compName) {
        try {
          const comp = await apiClient.get<any>(`/companies/${otherId}`);
          if (comp?.name) { compName = comp.name; nameCache.current.set(otherId, compName); }
        } catch { /* fall through to the placeholder */ }
      }
      compName = compName || "Unknown company";
      
      convs.push({
        id: otherId,
        name: compName,
        avatar: compName.substring(0, 2).toUpperCase(),
        lastMessage: lastMsg.content,
        timestamp: new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
        online: false
      });
    }
    setConversations(convs);
    if (convs.length > 0 && !selectedRef.current) {
      setSelectedConvId(convs[0].id);
    }
  };

  const activeMessages = messages.filter(m => 
    (m.senderId === user?.companyId && m.receiverId === selectedConvId) ||
    (m.receiverId === user?.companyId && m.senderId === selectedConvId)
  );
  
  const selectedConv = conversations.find(c => c.id === selectedConvId);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !user?.companyId || !selectedConvId) return;
    
    try {
      const payload = {
        senderId: user.companyId,
        receiverId: selectedConvId,
        content: messageInput
      };
      const sentMsg = await apiClient.post<Message>('/messages/send', payload);
      setMessages(prev => (prev.some((m) => m.id === sentMsg.id) ? prev : [...prev, sentMsg]));
      setMessageInput("");
      socketService.sendTyping(selectedConvId, undefined, false);
      refreshConversations();
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    if (selectedConvId) {
      socketService.sendTyping(selectedConvId, undefined, true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] flex gap-5">
      {/* Left Panel - Conversation List */}
      <div className="w-72 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="search"
              aria-label="Search conversations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7BB8F7] text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-xs text-gray-500 text-center">No messages yet.</div>
          ) : conversations.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())).map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedConvId(conversation.id)}
              className={`w-full p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                selectedConvId === conversation.id ? "bg-[#F3E8F8]" : ""
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 bg-[#6921A5] rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {conversation.avatar}
                </div>
                {conversation.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{conversation.name}</h3>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                    {conversation.timestamp}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 truncate">{conversation.lastMessage}</p>
                  {conversation.unread > 0 && (
                    <span className="ml-1.5 bg-[#6921A5] text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                      {conversation.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        {selectedConvId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 bg-[#6921A5] rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {selectedConv?.avatar}
                  </div>
                  {selectedConv?.online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900">{selectedConv?.name}</h3>
                  <p className="text-xs text-gray-400">
                    {selectedConv?.online ? "Active now" : "Offline"}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeMessages.map((message) => {
                const isMe = message.senderId === user?.companyId;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[70%]`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          isMe
                            ? "bg-[#6921A5] text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        <span className="text-xs text-gray-400">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span className="text-xs text-gray-400">
                            {message.read ? "· Read" : "· Delivered"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={messageInput}
                    onChange={handleTyping}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7BB8F7] resize-none text-sm"
                  />
                </div>
                <button
                  aria-label="Send message"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="p-2.5 bg-[#6921A5] text-white rounded-xl hover:bg-[#492F77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}