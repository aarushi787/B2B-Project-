import { Search, Send, MoreVertical, Paperclip, Smile, Phone, Video } from "lucide-react";
import { useState } from "react";

const conversations = [
  {
    id: 1,
    name: "TechCorp Solutions",
    avatar: "TC",
    lastMessage: "Let's finalize the contract terms",
    timestamp: "10:30 AM",
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: "Jane Smith",
    avatar: "JS",
    lastMessage: "Thanks for the update!",
    timestamp: "Yesterday",
    unread: 0,
    online: false,
  },
  {
    id: 3,
    name: "Green Energy Ltd",
    avatar: "GE",
    lastMessage: "The payment has been processed",
    timestamp: "Yesterday",
    unread: 1,
    online: true,
  },
  {
    id: 4,
    name: "Michael Chen",
    avatar: "MC",
    lastMessage: "Can we schedule a call?",
    timestamp: "Apr 15",
    unread: 0,
    online: false,
  },
  {
    id: 5,
    name: "HealthFirst Medical",
    avatar: "HM",
    lastMessage: "Document uploaded successfully",
    timestamp: "Apr 14",
    unread: 3,
    online: true,
  },
];

const messageData = {
  1: [
    {
      id: 1,
      sender: "them",
      text: "Hi! I wanted to discuss the equipment purchase deal.",
      timestamp: "10:15 AM",
      read: true,
    },
    {
      id: 2,
      sender: "me",
      text: "Of course! I've reviewed the initial proposal. What specific aspects would you like to cover?",
      timestamp: "10:18 AM",
      read: true,
    },
    {
      id: 3,
      sender: "them",
      text: "Let's finalize the contract terms",
      timestamp: "10:30 AM",
      read: true,
    },
    {
      id: 4,
      sender: "them",
      text: "Especially the payment schedule and delivery timeline",
      timestamp: "10:30 AM",
      read: false,
    },
  ],
  2: [
    {
      id: 1,
      sender: "me",
      text: "I've sent over the updated contract for your review.",
      timestamp: "9:45 AM",
      read: true,
    },
    {
      id: 2,
      sender: "them",
      text: "Thanks for the update!",
      timestamp: "10:00 AM",
      read: true,
    },
  ],
  3: [
    {
      id: 1,
      sender: "them",
      text: "The payment has been processed",
      timestamp: "3:20 PM",
      read: false,
    },
  ],
};

export function Messaging() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messages = messageData[selectedConversation.id as keyof typeof messageData] || [];

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      setMessageInput("");
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 2000);
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
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation)}
              className={`w-full p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                selectedConversation.id === conversation.id ? "bg-teal-50" : ""
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {conversation.avatar}
                </div>
                {conversation.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-xs font-bold text-gray-900 truncate">{conversation.name}</h3>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                    {conversation.timestamp}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 truncate">{conversation.lastMessage}</p>
                  {conversation.unread > 0 && (
                    <span className="ml-1.5 bg-teal-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
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
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {selectedConversation.avatar}
              </div>
              {selectedConversation.online && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">{selectedConversation.name}</h3>
              <p className="text-[10px] text-gray-400">
                {selectedConversation.online ? "Active now" : "Offline"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Video className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[70%]`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    message.sender === "me"
                      ? "bg-teal-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-xs leading-relaxed">{message.text}</p>
                </div>
                <div
                  className={`flex items-center gap-1 mt-1 ${
                    message.sender === "me" ? "justify-end" : "justify-start"
                  }`}
                >
                  <span className="text-[10px] text-gray-400">{message.timestamp}</span>
                  {message.sender === "me" && (
                    <span className="text-[10px] text-gray-400">
                      {message.read ? "· Read" : "· Delivered"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

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
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-end gap-2">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Smile className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                rows={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-xs"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              className="p-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}