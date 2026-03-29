import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/api';
import './CustomerChatbot.css';

const MESSAGE_CHAR_LIMIT = 600;
const DEFAULT_DISCLAIMER = 'This is general information and not medical advice. Consult your doctor before changing medicines, dosage, or diet.';

const QUICK_PROMPTS = [
    'Which medicines in my recent purchases are expiring soon?',
    'Suggest a simple daily routine for better health and energy.',
    'What are 5 easy food habits I can follow for wellness?'
];

const createMessage = (role, text, extras = {}) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
    ...extras
});

const formatMessageTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
};

const CustomerChatbot = ({ customerName }) => {
    const threadRef = useRef(null);

    const welcomeMessage = useMemo(() => {
        const name = customerName?.trim();
        const label = name ? name : 'there';

        return `Hi ${label}! I am Medi. You can ask me about health and wellness, and also about your medicine purchases/reminders whenever you want.`;
    }, [customerName]);

    const [messages, setMessages] = useState([
        createMessage('assistant', welcomeMessage)
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const threadElement = threadRef.current;
        if (!threadElement) {
            return;
        }

        threadElement.scrollTo({
            top: threadElement.scrollHeight,
            behavior: 'smooth'
        });
    }, [messages, isSending]);

    const resetConversation = () => {
        setErrorMessage('');
        setInputValue('');
        setMessages([createMessage('assistant', welcomeMessage)]);
    };

    const sendMessage = async (rawMessage) => {
        const message = rawMessage.trim();

        if (!message || isSending) {
            return;
        }

        if (message.length > MESSAGE_CHAR_LIMIT) {
            setErrorMessage(`Message is too long. Keep it under ${MESSAGE_CHAR_LIMIT} characters.`);
            return;
        }

        setErrorMessage('');
        setIsSending(true);
        setInputValue('');
        setMessages((prev) => [...prev, createMessage('user', message)]);

        try {
            const response = await api.post('/customer/chat', { message });
            const reply = response.data?.reply || 'I could not generate a response right now.';
            const meta = response.data?.meta || {};

            setMessages((prev) => [
                ...prev,
                createMessage('assistant', reply, { meta })
            ]);
        } catch (err) {
            const apiMessage = err.response?.data?.msg;
            const fallback = 'I am having trouble right now. Please try again in a moment.';

            setErrorMessage(apiMessage || fallback);
            setMessages((prev) => [
                ...prev,
                createMessage('assistant', fallback)
            ]);
        } finally {
            setIsSending(false);
        }
    };

    const onSubmit = (event) => {
        event.preventDefault();
        sendMessage(inputValue);
    };

    const onInputKeyDown = (event) => {
        if (event.key !== 'Enter') {
            return;
        }

        if (event.shiftKey) {
            return;
        }

        event.preventDefault();
        sendMessage(inputValue);
    };

    const inputLength = inputValue.trim().length;
    const hasMessages = messages.length > 1;

    return (
        <section className="health-chatbot card" aria-label="Health Assistant Chat">
            <header className="health-chatbot__header">
                <div>
                    <h4>Medi</h4>
                    <p>Your friendly wellness assistant. Ask health questions anytime.</p>
                </div>

                <div className="health-chatbot__header-actions">
                    <span className="health-chatbot__status">Medi online</span>
                    <button
                        type="button"
                        className="btn health-chatbot__clear-btn"
                        onClick={resetConversation}
                        disabled={!hasMessages || isSending}
                    >
                        Clear chat
                    </button>
                </div>
            </header>

            <div className="health-chatbot__quick-prompts" aria-label="Quick questions">
                {QUICK_PROMPTS.map((prompt) => (
                    <button
                        key={prompt}
                        type="button"
                        className="health-chatbot__quick-prompt"
                        disabled={isSending}
                        onClick={() => sendMessage(prompt)}
                    >
                        {prompt}
                    </button>
                ))}
            </div>

            <div className="health-chatbot__thread" ref={threadRef}>
                {messages.map((entry, index) => (
                    <div
                        key={entry.id || `${entry.role}-${index}`}
                        className={`health-chatbot__message-row ${entry.role === 'user' ? 'is-user' : 'is-assistant'}`}
                    >
                        <div className="health-chatbot__message-bubble">
                            {entry.text}
                        </div>

                        <div className="health-chatbot__meta-row">
                            <span>{formatMessageTime(entry.createdAt)}</span>
                            {entry.role === 'assistant' && entry.meta?.cached && (
                                <span className="health-chatbot__meta-chip">cached</span>
                            )}
                            {entry.role === 'assistant' && entry.meta?.providerErrorType && (
                                <span className="health-chatbot__meta-chip">local assist</span>
                            )}
                        </div>
                    </div>
                ))}

                {isSending && (
                    <div className="health-chatbot__typing" aria-live="polite">
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                        <span className="label">Medi is thinking...</span>
                    </div>
                )}
            </div>

            <form onSubmit={onSubmit} className="health-chatbot__composer">
                <textarea
                    className="health-chatbot__input"
                    rows={3}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Talk to Medi..."
                    maxLength={MESSAGE_CHAR_LIMIT}
                    aria-label="Health Assistant input"
                    disabled={isSending}
                />

                <div className="health-chatbot__composer-footer">
                    <small className={`health-chatbot__char-count ${inputLength > MESSAGE_CHAR_LIMIT * 0.8 ? 'is-near-limit' : ''}`}>
                        {inputLength}/{MESSAGE_CHAR_LIMIT}
                    </small>
                    <button type="submit" className="btn btn-primary" disabled={isSending || !inputValue.trim()}>
                        {isSending ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </form>

            {errorMessage && (
                <div className="health-chatbot__error" role="alert">
                    {errorMessage}
                </div>
            )}

            <p className="health-chatbot__global-disclaimer">
                {DEFAULT_DISCLAIMER}
            </p>
        </section>
    );
};

export default CustomerChatbot;
