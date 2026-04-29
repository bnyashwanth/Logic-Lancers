import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, SendHorizonal, X, MessageCircle } from 'lucide-react';
import { apiUrl } from '../config/api';

const MAX_HISTORY_MESSAGES = 12;
const CHAT_DEMO_MODE = import.meta.env.VITE_CHAT_DEMO_MODE || 'fraud-analyst';

function readJsonFromStorage(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function buildChatContext() {
  const authUser = readJsonFromStorage('userData') || readJsonFromStorage('user') || {};
  const latestMl =
    readJsonFromStorage('blackfyre_ml_last_prediction') ||
    readJsonFromStorage('mlLastPrediction') ||
    null;

  return {
    appName: 'Blackfyre',
    demoMode: CHAT_DEMO_MODE,
    currentPage: window.location.pathname,
    user: {
      role: authUser.role || authUser.userType || 'guest',
      username: authUser.username || authUser.name || '',
      email: authUser.email || '',
    },
    ml: latestMl,
  };
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const sampleQuestions = [
    'What is this platform about?',
    'How can I get started?',
    'Tell me about your features',
  ];

  const toggleChat = () => setIsOpen(!isOpen);
  const clearChat = () => setMessages([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;
    
    // Add user message
    const newMsg = {
      id: Date.now(),
      sender: 'YOU',
      text,
      isSelf: true,
    };
    
    setMessages((prev) => [...prev, newMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const history = messages
        .slice(-MAX_HISTORY_MESSAGES)
        .map((msg) => ({
          role: msg.isSelf ? 'user' : 'assistant',
          content: msg.text,
        }));

      const response = await fetch(apiUrl('/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history,
          context: buildChatContext(),
        }),
      });

      const payload = await response.json();
      const replyText = response.ok
        ? (payload.reply || 'No response from model.')
        : (payload.msg || 'Local LLM request failed.');

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'LancerAI',
          text: replyText,
          isSelf: false,
        },
      ]);
    } catch (_err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'LancerAI',
          text: 'Could not reach local LLM. Make sure backend and Ollama are running.',
          isSelf: false,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSampleQuestionClick = (question) => {
    setInputValue(question);
    setTimeout(() => {
      const form = document.querySelector('[data-chat-form]');
      if (form) {
        const event = new Event('submit', { bubbles: true });
        form.dispatchEvent(event);
      }
    }, 0);
  };

  return (
    <div className="fixed bottom-6 right-6 z-100 flex flex-col items-end gap-4 font-body">
        {/* Chat Window */}
      {isOpen && (
        <div className="w-100 bg-white shadow-[0px_24px_48px_rgba(0,0,0,0.15)] flex flex-col transform transition-all duration-200 origin-bottom-right">
          {/* Header */}
          <div className="bg-black p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <MessageSquare className="text-white" size={20} strokeWidth={2.5} />
              <h4 className="font-display font-bold text-white  tracking-tight text-[15px]">
                LancerAI
              </h4>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={clearChat}
                className="text-white/80 text-[11px] font-bold uppercase tracking-wider hover:text-white transition-colors"
                type="button"
              >
                Clear
              </button>
              <button
                onClick={toggleChat}
                className="text-[#FF0000] hover:scale-110 active:scale-95 transition-transform flex items-center justify-center cursor-pointer"
                type="button"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          
          {/* Body */}
          <div className="h-105 overflow-y-auto p-5 flex flex-col gap-6 bg-white scroll-smooth relative border-x border-gray-200">
            {messages.length === 0 && !isTyping && (
              <div className="flex flex-col gap-4 py-8">
                <p className="text-center text-gray-500 text-[13px] font-semibold">
                  How can I help you today?
                </p>
                <div className="flex flex-col gap-3">
                  {sampleQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSampleQuestionClick(question)}
                      className="w-full p-4 text-left text-[13px] border border-gray-300 rounded-none hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 active:bg-gray-100 text-gray-700 font-body"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((msg) => (
              <div key={msg.id} className={`w-full flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'} mt-2`}>
                <span className="text-[9px] font-bold text-gray-500 uppercase mb-1">
                  {msg.sender}
                </span>
                <div 
                  className={`p-4 text-[13px] max-w-[85%] leading-relaxed ${
                    msg.isSelf 
                      ? 'bg-black text-white' 
                      : 'bg-[#f3f3f4] text-black'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="w-full flex flex-col items-start mt-2">
                <span className="text-[9px] font-bold text-gray-500 uppercase mb-1">
                  LancerAI
                </span>
                <div className="p-4 text-[13px] max-w-[85%] bg-[#f3f3f4] text-black flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <form 
            onSubmit={handleSendMessage}
            data-chat-form
            className="bg-white p-4 border-t border-gray-200 flex gap-3 items-center border-x border-b"
          >
            <input 
              className="w-full bg-white border border-gray-400 p-3 text-[13px] text-black placeholder:text-gray-400 focus:border-black focus:outline-none transition-colors duration-100 font-body rounded-none" 
              placeholder="Type a message..." 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button 
              type="submit"
              className="bg-black text-white px-5 py-3 hover:bg-gray-800 active:scale-[0.98] transition-all duration-100 flex items-center justify-center rounded-none shrink-0"
            >
              <SendHorizonal size={20} className="text-white" strokeWidth={2} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button 
          onClick={toggleChat}
          className="w-16 h-16 bg-black text-white shadow-[0px_24px_48px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-105 active:scale-[0.98] transition-all duration-100 cursor-pointer rounded-none border-2 border-white"
        >
          <MessageCircle size={32} className="text-white" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}