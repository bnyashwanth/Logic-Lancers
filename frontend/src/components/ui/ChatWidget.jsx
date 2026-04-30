import { useState, useRef, useEffect } from 'react';
import Icon from '../ui/Icon';
import api from '../../services/api';
import ReactMarkdown from 'react-markdown';
import './ChatWidget.css';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Hello! I am **SMART RELIEF AI**. How can I help you coordinate today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const currentInput = input.trim();
    const userMsg = { role: 'user', text: currentInput };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(1).map(m => ({ role: m.role, text: m.text }));
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: currentInput, history })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Server error (${response.status})`);
      }

      const contentType = response.headers.get('content-type') || '';

      // If it's a JSON response (non-streaming fallback)
      if (contentType.includes('application/json')) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'model', text: data.response || data.message || 'No response' }]);
      } else {
        // Streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiText = '';
        
        setMessages(prev => [...prev, { role: 'model', text: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          aiText += chunk;
          
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'model', text: aiText };
            return updated;
          });
        }

        // If no text was received, show fallback
        if (!aiText.trim()) {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'model', text: '_No response received. Please try again._' };
            return updated;
          });
        }
      }
    } catch (err) {
      console.error('[CHAT ERROR]', err);
      setMessages(prev => [...prev, { role: 'model', text: `_Sorry, I am having trouble connecting right now. (${err.message})_` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`chat-widget ${isOpen ? 'open' : ''}`}>
      {isOpen ? (
        <div className="chat-window animate-slide-up">
          <div className="chat-header">
            <div className="chat-header__info">
              <div className="chat-header__avatar">
                <Icon name="smart_toy" size={18} />
              </div>
              <div>
                <div className="chat-header__name">SMART RELIEF AI</div>
                <div className="chat-header__status">Always active</div>
              </div>
            </div>
            <button className="chat-header__close" onClick={() => setIsOpen(false)}>
              <Icon name="close" size={20} />
            </button>
          </div>
          
          <div className="chat-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble-container ${m.role}`}>
                <div className={`chat-bubble ${m.role}`}>
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-bubble-container model">
                <div className="chat-bubble model typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
          </div>

          <form className="chat-input-container" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Ask anything..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={isLoading} className={input.trim() ? 'active' : ''}>
              <Icon name="send" size={20} />
            </button>
          </form>
        </div>
      ) : (
        <button className="chat-trigger animate-bounce-subtle" onClick={() => setIsOpen(true)}>
          <Icon name="chat" size={28} />
          <span className="chat-trigger__badge">AI</span>
        </button>
      )}
    </div>
  );
}
