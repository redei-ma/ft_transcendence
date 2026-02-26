import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../../../services/socketServices';
import { GameEvents } from '../../game.events';
import { theme } from '../../../configs/theme';

interface GameChatProps {
  myUserId: string;
  isVisible: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'system' | 'me' | 'enemy';
  name: string;
  text: string;
  timestamp: number;
}

const SENDER_COLORS: Record<ChatMessage['sender'], string> = {
  system: '#FFD700',
  me: '#66B2FF',
  enemy: '#FF6666',
};

export default function GameChat({ myUserId, isVisible }: GameChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isFaded, setIsFaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);

  // Keep ref in sync for use in event listeners
  isActiveRef.current = isActive;

  const resetFadeTimer = useCallback(() => {
    setIsFaded(false);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      if (!isActiveRef.current) setIsFaded(true);
    }, 5000);
  }, []);

  const openChat = useCallback(() => {
    setIsActive(true);
    setIsFaded(false);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const closeChat = useCallback(() => {
    setIsActive(false);
    inputRef.current?.blur();
    resetFadeTimer();
  }, [resetFadeTimer]);

  const sendMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: `${Date.now()}-me`,
      sender: 'me',
      name: myUserId.charAt(0).toUpperCase() + myUserId.slice(1),
      text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newMsg]);
    socketService.emit(GameEvents.GAME_MESSAGE, { message: text });
    setInputText('');
  }, [inputText, myUserId]);

  // Listen for incoming messages
  useEffect(() => {
    if (!isVisible) return;

  const handler = (data: { message: string; author: string }) => {
    if (data.author === myUserId) return; // ignora i miei, già aggiunti localmente
    
    const newMsg: ChatMessage = {
        id: `${Date.now()}-${data.author}`,
        sender: 'enemy',
        name: data.author,
        text: data.message,
        timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMsg]);
    resetFadeTimer();
  };

    socketService.on(GameEvents.GAME_MESSAGE, handler);
    return () => socketService.off(GameEvents.GAME_MESSAGE, handler);
  }, [isVisible, myUserId, resetFadeTimer]);

  // Global keydown: open chat on Enter if not active
  useEffect(() => {
    if (!isVisible) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isActiveRef.current) return; // handled by input's own handler
      if (e.key === 'Enter') {
        e.preventDefault();
        openChat();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isVisible, openChat]);

  // Input keydown: stop propagation + handle Enter/Escape
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation(); // CRITICAL: prevent WASD etc from reaching InputManager

    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputText.trim()) {
        sendMessage();
        setInputText('');
      }
    } else if ( e.key === 'Escape' || (e.key === 'Shift')) {
      e.preventDefault();
      setInputText('');
      closeChat();
    }
  }, [inputText, sendMessage, closeChat]);

  // Click outside to close
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeChat();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActive, closeChat]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isActive]);

  // Initial fade timer
  useEffect(() => {
    if (!isVisible) return;
    resetFadeTimer();
    return () => { if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current); };
  }, [isVisible, resetFadeTimer]);

  if (!isVisible) return null;

  const visibleMessages = isActive ? messages.slice(-10) : messages.slice(-4);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '280px',
        zIndex: 500,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontFamily: theme.fonts.mono,
        fontSize: '12px',
      }}
    >
      {/* Message list */}
      <div
        style={{
          background: isActive ? 'rgba(0, 0, 0, 0.6)' : 'transparent',
          padding: isActive ? '12px' : '0',
          borderRadius: '8px',
          opacity: isFaded ? 0 : 1,
          transition: isFaded ? 'opacity 1s ease' : 'opacity 0s',
          maxHeight: isActive ? '200px' : 'auto',
        }}
      >
      {visibleMessages.map(msg => {
      const nameText = `${msg.name}: `;
      return (
        <div key={msg.id} style={{ marginBottom: '6px', lineHeight: '1.5' }}>
            <span style={{
                fontWeight: 'bold',
                color: SENDER_COLORS[msg.sender],
                whiteSpace: 'nowrap',
            }}>
                {nameText}
            </span>
            <span style={{
                color: 'rgba(255,255,255,0.85)',
                wordBreak: 'break-word',
            }}>
                {msg.text}
            </span>
        </div>
      );
    })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={inputText}
        maxLength={100}
        onChange={e => setInputText(e.target.value)}
        onKeyDown={handleInputKeyDown}
        onFocus={() => {
          setIsActive(true);
          setIsFaded(false);
          if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        }}
        onBlur={() => {
          if (!inputText.trim()) setIsActive(false);
          resetFadeTimer();
        }}
        placeholder={isActive ? 'Type a message...' : 'Press Enter to chat'}
        style={{
          pointerEvents: 'auto',
          width: '100%',
          height: '32px',
          background: 'rgba(0, 0, 0, 0.7)',
          border: '1px rgba(255,255,255,0.2)',
          borderRadius: '4px',
          color: 'white',
          fontFamily: theme.fonts.mono,
          fontSize: '12px',
          padding: '0 10px',
          outline: 'none',
          boxSizing: 'border-box',
          opacity: isActive ? 1 : 0.5,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );
}
