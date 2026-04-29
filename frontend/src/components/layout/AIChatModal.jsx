import { useState, useRef, useEffect } from 'react';
import Icon from '../ui/Icon';
import './AIChatModal.css';
import api from '../../services/api';

export default function AIChatModal({ isOpen, onClose }) {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && chatHistory.length === 0) {
      // Initial greeting
      setChatHistory([{
        role: 'model',
        text: 'Hello! I am RESPONDER AI. How can I help you coordinate today?'
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = { role: 'user', text: message };
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);

    try {
      const history = chatHistory.map(m => ({ role: m.role, text: m.text }));
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage.text, history })
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';
      
      setChatHistory(prev => [...prev, { role: 'model', text: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        aiText += chunk;
        
        setChatHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'model', text: aiText };
          return updated;
        });
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { 
        role: 'model', 
        text: 'I am sorry, I encountered an error. Please try again later.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-content" onClick={e => e.stopPropagation()}>
        <header className="ai-modal-header">
          <div className="ai-modal-header__info">
            <div className="ai-modal-icon">
              <Icon name="smart_toy" size={24} filled />
            </div>
            <div>
              <h3>Smart Relief AI</h3>
              <span className="status-badge">Always active</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <Icon name="close" size={24} />
          </button>
        </header>

        <div className="ai-modal-messages">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
              <div className="chat-bubble__content">
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-bubble ai">
              <div className="chat-bubble__content loading">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="ai-modal-input" onSubmit={handleSend}>
          <input 
            type="text" 
            placeholder="Ask anything..." 
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={!message.trim() || loading}>
            <Icon name="send" size={24} />
          </button>
        </form>
      </div>
    </div>
  );
}
