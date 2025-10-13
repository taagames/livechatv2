// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBj2rjAUplSwtTHDJQeahM71x79th688_s",
  authDomain: "livechat-310d9.firebaseapp.com",
  databaseURL: "https://livechat-310d9-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "livechat-310d9",
  storageBucket: "livechat-310d9.firebasestorage.app",
  messagingSenderId: "329919854997",
  appId: "1:329919854997:web:51fc14c65a3e5bc7675e9c",
  measurementId: "G-VVKPFG7SN7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

class LiveChatWidget {
    constructor() {
        this.chatId = this.getChatId();
        this.isAIMode = true;
        this.isMinimized = true;
        this.isToggling = false;
        this.chatEnded = false;
        this.humanTakenOver = false;
        this.hasSetupFirebase = false;
        this.displayedMessages = new Set();
        this.openRouterApiKey = "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"; // Replace with your actual OpenRouter API key
        this.aiPromptConfig = null;
        this.systemSettings = {
            liveChatEnabled: true,
            aiChatbotEnabled: true
        };
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadAIPromptConfig();
        this.loadSystemSettings();
        this.loadChatHistory();
        this.listenForMessages();
        this.listenForSystemSettings();
        
        console.log("Live Chat Widget initialized with chat ID:", this.chatId);
    }

    getChatId() {
        let chatId = localStorage.getItem('livechat_session_id');
        if (!chatId) {
            chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('livechat_session_id', chatId);
        }
        return chatId;
    }

    initializeElements() {
        this.chatBubble = document.getElementById('chatBubble');
        this.chatWindow = document.getElementById('chatWindow');
        this.closeButton = document.getElementById('closeChat');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.messagesContainer = document.getElementById('chatMessages');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.statusIndicator = document.getElementById('statusIndicator');
    }

    attachEventListeners() {
        this.chatBubble.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleChat();
        });
        
        this.closeButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeChat();
        });
        
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize input and handle paste
        this.messageInput.addEventListener('input', this.handleInputResize.bind(this));
    }

    toggleChat() {
        // Prevent rapid clicking
        if (this.isToggling) return;
        this.isToggling = true;
        
        setTimeout(() => {
            this.isToggling = false;
        }, 400);
        
        if (this.isMinimized) {
            this.openChat();
        } else {
            this.closeChat();
        }
    }

    openChat() {
        if (!this.isMinimized) return; // Already open
        
        this.isMinimized = false;
        this.chatBubble.style.display = 'none';
        this.chatWindow.classList.add('open');
        
        if (!this.hasSetupFirebase) {
            this.setupFirebase();
            this.hasSetupFirebase = true;
        }
        
        // Focus on input when chat opens
        setTimeout(() => {
            if (this.messageInput) {
                this.messageInput.focus();
            }
        }, 300);
    }

    closeChat() {
        if (this.isMinimized) return; // Already closed
        
        this.isMinimized = true;
        this.chatBubble.style.display = 'flex';
        this.chatWindow.classList.remove('open');
    }

    startNewChat() {
        // Clear old session
        localStorage.removeItem('livechat_session_id');
        
        // Create new chat ID
        this.chatId = this.getChatId();
        this.chatEnded = false;
        this.humanTakenOver = false;
        this.isAIMode = this.systemSettings.aiChatbotEnabled;
        this.chatNamed = false;
        
        // Re-enable input
        this.messageInput.disabled = false;
        this.messageInput.placeholder = 'Type your message...';
        this.sendButton.disabled = false;
        
        // Clear messages and reset UI
        this.loadChatSuggestions();
        
        // Reset status
        this.statusIndicator.textContent = 'AI Assistant Online';
        this.statusIndicator.className = 'status-indicator ai-mode';
        
        // Re-attach listeners for new chat
        this.listenForMessages();
        
        // Open chat
        this.openChat();
        
        console.log("Started new chat with ID:", this.chatId);
    }

    async loadChatSuggestions() {
        try {
            const snapshot = await database.ref('chatSuggestions').once('value');
            const suggestions = snapshot.val();
            
            if (suggestions && suggestions.length > 0) {
                this.messagesContainer.innerHTML = `
                    <div class="message bot-message">
                        <div class="message-content">
                            <p>Hello! 👋 I'm your AI assistant. How can I help you today?</p>
                            <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                    <div class="chat-suggestions">
                        <p class="suggestions-title">Quick options:</p>
                        <div class="suggestion-buttons">
                            ${suggestions.map(suggestion => 
                                `<button class="suggestion-btn" data-message="${this.escapeHtml(suggestion)}">${this.escapeHtml(suggestion)}</button>`
                            ).join('')}
                        </div>
                    </div>
                `;
                
                // Add click listeners to suggestion buttons
                this.messagesContainer.querySelectorAll('.suggestion-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const message = btn.dataset.message;
                        this.messageInput.value = message;
                        this.sendMessage();
                        // Remove suggestions after first use
                        const suggestionsElement = this.messagesContainer.querySelector('.chat-suggestions');
                        if (suggestionsElement) {
                            suggestionsElement.style.animation = 'fadeOut 0.3s ease-out';
                            setTimeout(() => suggestionsElement.remove(), 300);
                        }
                    });
                });
            } else {
                this.messagesContainer.innerHTML = `
                    <div class="message bot-message">
                        <div class="message-content">
                            <p>Hello! 👋 I'm your AI assistant. How can I help you today?</p>
                            <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.log('Could not load chat suggestions');
            this.messagesContainer.innerHTML = `
                <div class="message bot-message">
                    <div class="message-content">
                        <p>Hello! 👋 I'm your AI assistant. How can I help you today?</p>
                        <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>
            `;
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Check if chat is ended
        if (this.chatEnded) {
            this.addMessage('This chat has ended. Starting a new conversation...', 'system');
            setTimeout(() => this.startNewChat(), 1000);
            return;
        }

        this.messageInput.value = '';
        this.addMessage(message, 'user');
        
        // Save user message to Firebase
        await this.saveMessageToFirebase(message, 'user');

        // Generate chat name if this is the first user message
        if (!this.chatNamed) {
            this.generateChatName(message);
        }

        // Check if user wants to talk to human
        if (this.detectHumanRequest(message)) {
            this.switchToHumanMode();
        } else if (this.isAIMode && this.systemSettings.aiChatbotEnabled && !this.humanTakenOver) {
            this.showTyping();
            try {
                const aiResponse = await this.getAIResponse(message);
                this.hideTyping();
                this.addMessage(aiResponse, 'bot');
                await this.saveMessageToFirebase(aiResponse, 'bot');
            } catch (error) {
                this.hideTyping();
                console.error('Error getting AI response:', error);
                this.addMessage('Sorry, I encountered an error. Please try again or request human support.', 'bot');
            }
        }
        
        this.scrollToBottom();
    }

    detectHumanRequest(message) {
        const humanTriggers = [
            'human', 'person', 'agent', 'representative', 'operator',
            'talk to someone', 'speak to someone', 'real person',
            'customer service', 'support agent', 'live agent',
            'escalate', 'transfer', 'connect me'
        ];
        
        const lowerMessage = message.toLowerCase();
        return humanTriggers.some(trigger => lowerMessage.includes(trigger));
    }

    async switchToHumanMode() {
        this.isAIMode = false;
        this.statusIndicator.textContent = 'Connecting to human agent...';
        this.statusIndicator.className = 'status-indicator waiting-mode';
        
        // Update Firebase to indicate human support needed
        await database.ref(`chats/${this.chatId}`).update({
            needsHuman: true,
            humanRequested: firebase.database.ServerValue.TIMESTAMP,
            status: 'waiting_for_human'
        });

        this.addMessage('I\'m connecting you with a human agent. Please wait a moment...', 'bot');
        
        setTimeout(() => {
            this.statusIndicator.textContent = 'Waiting for human agent';
        }, 2000);
    }

    async loadAIPromptConfig() {
        try {
            const response = await fetch('./ai-prompt-config.json');
            this.aiPromptConfig = await response.json();
        } catch (error) {
            console.log('Could not load AI prompt config, using default');
            this.aiPromptConfig = {
                systemPrompt: "You are a friendly and helpful customer support AI assistant. Keep responses concise, helpful, and professional.",
                responseSettings: {
                    maxTokens: 200,
                    temperature: 0.7,
                    model: "gpt-4o-mini"
                }
            };
        }
    }

    async loadSystemSettings() {
        try {
            const snapshot = await database.ref('systemSettings').once('value');
            const settings = snapshot.val();
            if (settings) {
                this.systemSettings = { ...this.systemSettings, ...settings };
            }
            
            // Hide/show chat bubble based on settings
            if (!this.systemSettings.liveChatEnabled) {
                document.getElementById('chatWidget').style.display = 'none';
            }
        } catch (error) {
            console.log('Could not load system settings');
        }
    }

    listenForSystemSettings() {
        database.ref('systemSettings').on('value', (snapshot) => {
            const settings = snapshot.val();
            if (settings) {
                this.systemSettings = { ...this.systemSettings, ...settings };
                
                // Update chat visibility
                const chatWidget = document.getElementById('chatWidget');
                chatWidget.style.display = this.systemSettings.liveChatEnabled ? 'block' : 'none';
                
                // Update AI status
                if (!this.systemSettings.aiChatbotEnabled && this.isAIMode) {
                    this.statusIndicator.textContent = 'AI Chatbot Disabled';
                    this.statusIndicator.className = 'status-indicator disabled-mode';
                }
            }
        });
    }

    async generateChatName(firstMessage) {
        if (!this.systemSettings.aiChatbotEnabled) return;
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openRouterApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "Create a short, descriptive title (max 4 words) for a customer support chat based on the first message. Just return the title, nothing else."
                        },
                        {
                            role: "user",
                            content: firstMessage
                        }
                    ],
                    max_tokens: 20,
                    temperature: 0.3
                })
            });

            if (response.ok) {
                const data = await response.json();
                const chatName = data.choices[0].message.content.trim();
                
                await database.ref(`chats/${this.chatId}`).update({
                    customName: chatName,
                    aiGenerated: true
                });
                
                this.chatNamed = true;
            }
        } catch (error) {
            console.log('Could not generate chat name:', error);
        }
    }

    async getAIResponse(userMessage) {
        const systemPrompt = this.aiPromptConfig ? this.aiPromptConfig.systemPrompt : 
            "You are a friendly and helpful customer support AI assistant. Keep responses concise, helpful, and professional.";

        const messages = [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user", 
                content: userMessage
            }
        ];

        const settings = this.aiPromptConfig ? this.aiPromptConfig.responseSettings : {
            maxTokens: 200,
            temperature: 0.7,
            model: "gpt-4o-mini"
        };

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.openRouterApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: settings.model,
                messages: messages,
                max_tokens: settings.maxTokens,
                temperature: settings.temperature
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    addMessage(text, sender, senderName = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Get sender label based on settings
        let senderLabel = '';
        if (this.systemSettings.showChatNames) {
            if (sender === 'human' && senderName) {
                senderLabel = `<div class="message-sender">${senderName}</div>`;
            } else if (sender === 'bot') {
                senderLabel = `<div class="message-sender">AI Agent</div>`;
            }
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${senderLabel}
                <p>${this.escapeHtml(text)}</p>
                <span class="message-time">${timestamp}</span>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Remove suggestions if this is the first user message
        if (sender === 'user') {
            const suggestions = this.messagesContainer.querySelector('.chat-suggestions');
            if (suggestions) {
                suggestions.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => suggestions.remove(), 300);
            }
        }
    }

    handleAISwitchBack() {
        this.humanTakenOver = false;
        this.isAIMode = true;
        
        // Update status
        this.statusIndicator.textContent = 'AI Assistant Online';
        this.statusIndicator.className = 'status-indicator ai-mode';
        
        // Add a welcome back message from AI (only if no recent messages)
        const lastMessage = this.messagesContainer.lastElementChild;
        const shouldAddMessage = !lastMessage || 
            !lastMessage.querySelector('p')?.textContent.includes('back to assist you');
        
        if (shouldAddMessage) {
            this.addMessage('Hello! I\'m your AI assistant and I\'m ready to help you. What can I do for you today?', 'bot');
        }
        
        console.log('Switched back to AI mode - humanTakenOver:', this.humanTakenOver, 'isAIMode:', this.isAIMode);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showTyping() {
        this.typingIndicator.style.display = 'flex';
        this.scrollToBottom();
    }

    hideTyping() {
        this.typingIndicator.style.display = 'none';
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }

    async loadExistingMessages() {
        try {
            const snapshot = await database.ref(`chats/${this.chatId}/messages`).once('value');
            const messages = snapshot.val();
            
            if (messages) {
                // Initialize displayed messages set
                this.displayedMessages = new Set();
                
                // Sort messages by timestamp
                const sortedMessages = Object.entries(messages).sort(([,a], [,b]) => 
                    (a.timestamp || 0) - (b.timestamp || 0)
                );
                
                sortedMessages.forEach(([key, message]) => {
                    // Add to displayed messages
                    this.displayedMessages.add(key);
                    
                    // Only display human messages and system messages that aren't already shown
                    if (message.from === 'human') {
                        // Check if message already exists in UI
                        const existingMessages = this.messagesContainer.querySelectorAll('.human-message');
                        let exists = false;
                        existingMessages.forEach(msg => {
                            if (msg.querySelector('p')?.textContent === message.text) {
                                exists = true;
                            }
                        });
                        
                        if (!exists) {
                            this.addMessage(message.text, 'human', message.adminName);
                            this.humanTakenOver = true;
                            this.isAIMode = false;
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading existing messages:', error);
        }
    }

    handleInputResize() {
        // Auto-resize functionality can be added here if needed
    }

    async saveMessageToFirebase(text, sender) {
        const messageData = {
            from: sender,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            chatId: this.chatId
        };

        try {
            // Save to messages array
            await database.ref(`chats/${this.chatId}/messages`).push(messageData);
            
            // Update chat metadata
            await database.ref(`chats/${this.chatId}`).update({
                lastMessage: text,
                lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
                lastMessageFrom: sender,
                active: true
            });
        } catch (error) {
            console.error('Error saving message to Firebase:', error);
        }
    }

    async loadChatHistory() {
        try {
            const snapshot = await database.ref(`chats/${this.chatId}/messages`).once('value');
            const messages = snapshot.val();
            
            if (messages) {
                // Clear existing messages except the welcome message
                const welcomeMessage = this.messagesContainer.querySelector('.message');
                this.messagesContainer.innerHTML = '';
                this.messagesContainer.appendChild(welcomeMessage);
                
                // Add historical messages
                Object.values(messages).forEach(msg => {
                    this.addMessage(msg.text, msg.from);
                });

                // Check if human support was requested
                const chatSnapshot = await database.ref(`chats/${this.chatId}`).once('value');
                const chatData = chatSnapshot.val();
                if (chatData && chatData.needsHuman) {
                    this.isAIMode = false;
                    this.statusIndicator.textContent = 'Human agent';
                    this.statusIndicator.className = 'status-indicator human-mode';
                }
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    listenForMessages() {
        // Clear existing listeners to prevent duplicates
        database.ref(`chats/${this.chatId}/messages`).off();
        
        // Load existing messages first
        this.loadExistingMessages();
        
        // Listen for new messages from admin/human agents
        database.ref(`chats/${this.chatId}/messages`).on('child_added', (snapshot) => {
            const message = snapshot.val();
            const messageKey = snapshot.key;
            
            // Skip if this message is already displayed (prevent duplicates)
            if (this.displayedMessages && this.displayedMessages.has(messageKey)) {
                return;
            }
            
            // Add to displayed messages set
            if (!this.displayedMessages) {
                this.displayedMessages = new Set();
            }
            this.displayedMessages.add(messageKey);
            
            // Handle different message types
            if (message.from === 'human') {
                // Mark that human has taken over
                this.humanTakenOver = true;
                this.isAIMode = false;
                
                this.addMessage(message.text, 'human', message.adminName);
                
                // Update status to show human agent is active
                this.statusIndicator.textContent = message.adminName ? `${message.adminName}` : 'Human Agent';
                this.statusIndicator.className = 'status-indicator human-mode';
            } else if (message.from === 'system') {
                if (message.text === 'chat_ended') {
                    this.handleChatEnded();
                } else if (message.text === 'ai_switched_back') {
                    this.handleAISwitchBack();
                }
            }
        });

        // Listen for chat status changes
        database.ref(`chats/${this.chatId}`).on('value', (snapshot) => {
            const chatData = snapshot.val();
            if (chatData && chatData.active === false) {
                this.handleChatEnded();
            }
        });
    }

    handleChatEnded() {
        if (this.chatEnded) return; // Prevent duplicate messages
        
        this.chatEnded = true;
        this.addMessage('This chat has been ended by our support team. Click the chat button to start a new conversation.', 'system');
        this.statusIndicator.textContent = 'Chat Ended';
        this.statusIndicator.className = 'status-indicator ended-mode';
        
        // Replace input with restart button
        this.showRestartButton();
    }

    showRestartButton() {
        const inputContainer = this.messageInput.parentElement;
        inputContainer.innerHTML = `
            <button id="restartChatBtn" class="restart-chat-btn">
                <span>🔄 Start New Chat</span>
            </button>
        `;
        
        document.getElementById('restartChatBtn').addEventListener('click', () => {
            this.startNewChat();
            // Restore original input
            inputContainer.innerHTML = `
                <input type="text" id="messageInput" placeholder="Type your message..." maxlength="500">
                <button id="sendButton">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="#007bff"/>
                    </svg>
                </button>
            `;
            // Re-initialize elements
            this.messageInput = document.getElementById('messageInput');
            this.sendButton = document.getElementById('sendButton');
            this.attachEventListeners();
        });
    }
}

// Initialize the chat widget when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LiveChatWidget();
});

// Optional: Global function to manually initialize if needed
window.initLiveChat = () => {
    new LiveChatWidget();
};