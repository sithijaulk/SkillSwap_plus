import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Hi! I am the community AI assistant. Ask me anything and I will try to help.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const API_KEY = 'AIzaSyCfo1LTolD5RPLVUM6Vxn9rDU5cHGxXgHY';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const result = await model.generateContent(userMessage);
      const text = result.response.text();
      
      if (text) {
        setMessages((prev) => [...prev, { role: 'model', text }]);
      } else {
        setMessages((prev) => [...prev, { role: 'model', text: 'Sorry, I received an empty response from the AI.' }]);
      }
    } catch (error) {
      console.error('Error fetching from Gemini API:', error);
      let errorMsg = error.message;
      if (errorMsg.includes('quota')) {
         errorMsg = 'API Quota Exceeded. Please try again later or use a different key.';
      }
      setMessages((prev) => [...prev, { role: 'model', text: `API Error: ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Reddit-style Inline Search Bar Trigger */}
      <form 
        onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isLoading) {
                setIsOpen(true);
                handleSend(e);
            } else {
                setIsOpen(true);
            }
        }}
        className="flex items-center w-full bg-white dark:bg-slate-900 border-[2px] border-blue-500 rounded-full transition-shadow shadow-md hover:shadow-blue-500/20"
      >
        <div className="p-1 px-2 flex items-center justify-center">
          <div className="bg-blue-500 rounded-full w-9 h-9 flex items-center justify-center text-white">
            <Bot size={20} />
          </div>
        </div>
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent px-2 py-3 text-[15px] focus:outline-none dark:text-white"
          placeholder="Find anything"
        />
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-2"></div>
        <button 
          type="submit"
          className="flex items-center gap-1.5 px-5 text-slate-700 dark:text-slate-300 font-bold text-[15px] hover:text-blue-600 transition-colors"
        >
          <Sparkles className="text-blue-500" size={20} />
          Ask
        </button>
      </form>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] h-[32rem] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col z-[9999] border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shadow-md z-10">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Community AI</h3>
                <p className="text-indigo-200 text-xs mt-0.5">Powered by Gemini</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-indigo-100 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-800/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                    <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                  }`}
                >
                  <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-2 flex-shrink-0 shadow-sm">
                  <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl rounded-bl-sm shadow-sm flex space-x-1 items-center">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-px" />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form onSubmit={handleSend} className="flex space-x-2 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 border focus:border-indigo-500 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
