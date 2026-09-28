import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, Role } from "./pages/DealWorkspace";
import { Send, MessageSquare, Bot, User, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ActivityChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  role: Role;
}

const roleConfig: Record<Role, { color: string; bg: string; icon: React.ElementType }> = {
  Admin: { color: "text-slate-800", bg: "bg-slate-700", icon: Shield },
  Client: { color: "text-blue-700", bg: "bg-blue-500", icon: User },
  Provider: { color: "text-purple-700", bg: "bg-purple-500", icon: User },
};

export function ActivityChat({ messages, onSend, role }: ActivityChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  const getRoleAvatar = (msgRole: Role, sender: string) => {
    if (sender === "System") return null;
    const cfg = roleConfig[msgRole];
    return (
      <div className={`w-7 h-7 rounded-full ${cfg.bg} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
        {sender.charAt(0)}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden" style={{ height: 440 }}>
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-[#0F9D9D]" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900">Activity & Chat</h2>
            <p className="text-[10px] text-slate-400">{messages.length} messages</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-[10px] font-semibold text-slate-500">3 active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.role === role;
            const isSystem = msg.sender === "System";

            if (isSystem) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
                    <Bot className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-500 font-medium">{msg.text}</span>
                    <span className="text-[9px] text-slate-400">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                {getRoleAvatar(msg.role, msg.sender)}
                <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold text-slate-500">{msg.sender}</span>
                    <span className="text-[9px] text-slate-400">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? "bg-[#0F9D9D] text-white rounded-tr-sm shadow-md shadow-teal-500/15"
                      : msg.role === "Admin"
                        ? "bg-slate-800 text-white rounded-tl-sm"
                        : "bg-slate-100 text-slate-700 rounded-tl-sm border border-slate-200"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white flex gap-2 shrink-0">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F9D9D]/30 focus:border-[#0F9D9D] transition-all placeholder:text-slate-400"
          />
        </div>
        <motion.button
          type="submit"
          disabled={!input.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-9 h-9 bg-[#0F9D9D] text-white rounded-xl hover:bg-[#0c8686] disabled:opacity-40 disabled:hover:bg-[#0F9D9D] transition-all shadow-sm shadow-teal-500/20 flex items-center justify-center shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </motion.button>
      </form>
    </div>
  );
}
