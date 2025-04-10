"use client";

import { useState, useEffect, useRef } from 'react';

const ChatTab = ({ document, documentId }) => {
  const [messages, setMessages] = useState([
    {
      role: 'system',
      content: 'Hello! I\'m your AI assistant. Ask me questions about this document.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // In a real implementation, you would make an API call here
      // For now, we'll just simulate a response
      setTimeout(() => {
        const aiResponse = { 
          role: 'assistant', 
          content: `I'll help you understand this document. You asked: "${input}"`
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsLoading(false);
      }, 1000);

      // A real implementation would look something like this:
      /*
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          message: input,
          history: messages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      */
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`${
              message.role === 'user' 
                ? 'bg-[#1087da]-100 dark:bg-[#1087da]-900 ml-auto' 
                : 'bg-gray-100 dark:bg-gray-800 mr-auto'
            } p-3 rounded-lg max-w-[80%] shadow-sm`}
          >
            <p className="text-sm">{message.content}</p>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <div className="h-3 w-3 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="h-3 w-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            <div className="h-3 w-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="mt-auto">
        <div className="flex items-center border dark:border-gray-700 rounded-lg overflow-hidden">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question about this document..."
            className="flex-1 p-3 border-none focus:ring-0 dark:bg-gray-800 dark:text-gray-100"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="p-3 bg-[#1087da] text-white hover:bg-[#1087da]-700 disabled:bg-[#1087da]-400"
            disabled={!input.trim() || isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatTab;
