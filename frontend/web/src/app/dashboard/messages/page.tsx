"use client";

import { useState } from "react";
import { Send, Search, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MOCK_CONVERSATIONS = [
  {
    id: "c1",
    name: "Rajesh Kumar Singh",
    role: "Municipal Corporator",
    lastMessage: "The pothole repair crew has been dispatched. Expected completion by Friday.",
    time: "2h ago",
    unread: 2,
  },
  {
    id: "c2",
    name: "BBMP Helpdesk",
    role: "Official",
    lastMessage: "Your complaint #ISS-004 has been forwarded to the water supply division.",
    time: "5h ago",
    unread: 0,
  },
  {
    id: "c3",
    name: "Ward 113 Group",
    role: "Community",
    lastMessage: "Priya: Has anyone else noticed the new speed breakers on 5th Cross?",
    time: "1d ago",
    unread: 12,
  },
  {
    id: "c4",
    name: "Dr. Priya Nair",
    role: "MLA",
    lastMessage: "Thank you for your feedback on the health camp initiative.",
    time: "3d ago",
    unread: 0,
  },
];

const MOCK_MESSAGES = [
  { id: "m1", sender: "other", text: "Namaste! Thank you for reporting the pothole issue on MG Road.", time: "10:30 AM" },
  { id: "m2", sender: "self", text: "Thank you for the quick acknowledgment, sir. It's been causing problems for many commuters.", time: "10:35 AM" },
  { id: "m3", sender: "other", text: "I understand the urgency. I've personally directed the roads department to prioritize this.", time: "10:42 AM" },
  { id: "m4", sender: "self", text: "That's great to hear! Do you have a timeline for when repairs might start?", time: "11:00 AM" },
  { id: "m5", sender: "other", text: "The pothole repair crew has been dispatched. Expected completion by Friday.", time: "2:15 PM" },
];

export default function MessagesPage() {
  const [selectedConvo, setSelectedConvo] = useState(MOCK_CONVERSATIONS[0].id);
  const [newMessage, setNewMessage] = useState("");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Messages</h1>
        <p className="page-subtitle">Communicate with leaders and officials</p>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex h-[600px]">
          {/* Conversations list */}
          <div className="w-80 border-r border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-btn px-3 py-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {MOCK_CONVERSATIONS.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConvo(convo.id)}
                  className={cn(
                    "w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors",
                    selectedConvo === convo.id && "bg-saffron-50 border-l-2 border-l-saffron",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={convo.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 truncate">{convo.name}</p>
                        <span className="text-xs text-gray-400 flex-shrink-0">{convo.time}</span>
                      </div>
                      <p className="text-xs text-gray-500">{convo.role}</p>
                      <p className="text-sm text-gray-600 truncate mt-1">{convo.lastMessage}</p>
                    </div>
                    {convo.unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-saffron text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {convo.unread}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100">
              <Button variant="outline" className="w-full" size="sm">
                <Plus className="w-4 h-4" /> New Message
              </Button>
            </div>
          </div>

          {/* Message thread */}
          <div className="flex-1 flex flex-col">
            {/* Thread header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <Avatar name="Rajesh Kumar Singh" size="sm" />
              <div>
                <p className="font-semibold text-gray-900 text-sm">Rajesh Kumar Singh</p>
                <p className="text-xs text-gray-500">Municipal Corporator, Ward 113</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {MOCK_MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.sender === "self" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] px-4 py-3 rounded-2xl text-sm",
                      msg.sender === "self"
                        ? "bg-saffron text-white rounded-br-md"
                        : "bg-gray-100 text-gray-800 rounded-bl-md",
                    )}
                  >
                    <p>{msg.text}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      msg.sender === "self" ? "text-white/70" : "text-gray-400",
                    )}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 rounded-btn border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-saffron/50 focus:border-saffron"
                />
                <Button size="md">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
