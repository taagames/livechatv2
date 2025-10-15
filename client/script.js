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
        this.deviceId = this.getDeviceId();
        this.isAIMode = true;
        this.isMinimized = true;
        this.isToggling = false;
        this.chatEnded = false;
        this.humanTakenOver = false;
        this.hasSetupFirebase = false;
        this.displayedMessages = new Set();
        this.conversationHistory = [];
        // API key is now securely stored in Cloudflare Pages environment variables
        this.aiPromptConfig = null;
        this.systemSettings = {
            liveChatEnabled: true,
            aiChatbotEnabled: true
        };
        
        this.initializeElements();
        this.initializeWidget();
        
        console.log("Live Chat Widget initialized with chat ID:", this.chatId, "Device ID:", this.deviceId);
    }

    setupFirebase() {
        try {
            // Ensure Firebase is initialized
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            this.database = firebase.database();

            // Optionally, you can log confirmation
            console.log("Firebase connection ready for chat ID:", this.chatId);
        } catch (error) {
            console.error("Error setting up Firebase:", error);
        }
    }

    async initializeWidget() {
        const isBlocked = await this.checkBlockedStatus();
        if (isBlocked) {
            return; // Stop initialization if blocked
        }
        
        this.attachEventListeners();
        this.loadAIPromptConfig();
        this.loadSystemSettings();
        await this.loadChatHistory();
        this.listenForMessages();
        this.listenForSystemSettings();
    }

    getChatId() {
        let chatId = localStorage.getItem('livechat_session_id');
        if (!chatId) {
            chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('livechat_session_id', chatId);
        }
        return chatId;
    }

    generateDeviceFingerprint() {
        // Create a semi-persistent device identifier
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
        
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');
        
        return btoa(fingerprint).substring(0, 32);
    }

    getDeviceId() {
        let deviceId = localStorage.getItem('livechat_device_id');
        if (!deviceId) {
            deviceId = this.generateDeviceFingerprint();
            localStorage.setItem('livechat_device_id', deviceId);
        }
        return deviceId;
    }

    async checkBlockedStatus() {
        try {
            // Get device fingerprint for persistent blocking
            const deviceId = this.getDeviceId();
            
            // Check if this user/device is blocked
            const snapshot = await database.ref('blockedUsers').once('value');
            const blockedUsers = snapshot.val();
            
            if (blockedUsers) {
                const isBlocked = Object.values(blockedUsers).some(user => 
                    user.chatId === this.chatId || 
                    user.userId === this.chatId ||
                    user.deviceId === deviceId ||
                    (user.allChatIds && user.allChatIds.includes(this.chatId))
                );
                
                if (isBlocked) {
                    this.showBlockedMessage();
                    return true;
                }
            }

            // Also check if the current chat is marked as blocked
            const chatSnapshot = await database.ref(`chats/${this.chatId}/blocked`).once('value');
            if (chatSnapshot.val() === true) {
                this.showBlockedMessage();
                return true;
            }

            // Check for device-level blocks
            const deviceBlockSnapshot = await database.ref(`blockedDevices/${deviceId}`).once('value');
            if (deviceBlockSnapshot.exists()) {
                this.showBlockedMessage();
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking blocked status:', error);
            return false;
        }
    }

    showBlockedMessage() {
        // Hide the chat widget completely
        const chatWidget = document.getElementById('chatWidget');
        if (chatWidget) {
            chatWidget.style.display = 'none';
        }

        // Show blocked message
        const blockedDiv = document.createElement('div');
        blockedDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 1000;
        `;
        blockedDiv.innerHTML = `
            <strong>Chat Access Blocked</strong><br>
            You have been restricted from using live chat. Please contact support through other channels if you need assistance.
        `;
        document.body.appendChild(blockedDiv);

        // Remove the blocked message after 10 seconds
        setTimeout(() => {
            if (blockedDiv.parentNode) {
                blockedDiv.parentNode.removeChild(blockedDiv);
            }
        }, 10000);
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
        
        // Change bubble to X button instead of hiding it
        this.chatBubble.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white"/>
            </svg>
        `;
        this.chatBubble.style.display = 'flex';
        this.chatBubble.classList.add('close-mode');
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
        
        // Add closing animation
        this.chatWindow.classList.add('closing');
        
        setTimeout(() => {
            this.isMinimized = true;
            
            // Change bubble back to chat icon
            this.chatBubble.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/>
                </svg>
            `;
            this.chatBubble.classList.remove('close-mode');
            this.chatBubble.style.display = 'flex';
            this.chatWindow.classList.remove('open', 'closing');
        }, 500); // Match animation duration
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
        this.conversationHistory.push({ role: 'user', content: message });
        
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
                this.conversationHistory.push({ role: 'assistant', content: aiResponse });
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
const response = await fetch('../ai-prompt-config.json');
            if (!response.ok) {
                throw new Error(`Failed to load ai-prompt-config.json: ${response.status} ${response.statusText}`);
            }
            const text = await response.text();
            let configData;
            try {
                configData = JSON.parse(text);
            } catch (jsonError) {
                throw new Error("Invalid JSON format in ai-prompt-config.json");
            }
            
            // Convert the business info into a comprehensive system prompt
            const systemPrompt = `You are a friendly and helpful AI customer service assistant for The Nebula Centre, a forest school and creative learning space in Manchester.
ABOUT THE NEBULA CENTRE:
${configData.overview}

LOCATION:
Address: ${configData.location.address}
Phone: ${configData.location.phone}
Email: ${configData.location.email}

FREE SUNDAY CLASSES (All completely free!):
${configData.main_offerings.free_sunday_classes.map(c => `- ${c.name} (${c.age}): ${c.time}`).join('\n')}

HOLIDAY CLUBS:
- Mud, Mess and Mayhem (Ages 5-12)
- Full day: ${configData.main_offerings.holiday_clubs.full_day_price}
- Half day: ${configData.main_offerings.holiday_clubs.half_day_price}
- Sibling discount: ${configData.main_offerings.holiday_clubs.sibling_discount}
- Activities: ${configData.main_offerings.holiday_clubs.activities.join(', ')}

BIRTHDAY PARTIES & EVENTS:
${configData.main_offerings.birthday_parties_events.packages.map(p => `- ${p.type} Package: ${p.price} (${p.guests} guests, ${p.duration})`).join('\n')}
- Available on: ${configData.main_offerings.birthday_parties_events.party_slots.join(' and ')}
- Themes available: ${configData.main_offerings.birthday_parties_events.themes.slice(0, 10).join(', ')}, and more!
- Deposit: ${configData.booking_information.deposit_required_for_parties}

ALTERNATIVE PROVISION EDUCATION:
- Forest School-based education for Key Stages 2-5
- Days: ${configData.main_offerings.alternative_provision.days.join(', ')}
- Time: ${configData.main_offerings.alternative_provision.time}

ROOM HIRE:
- Professional therapy rooms available for counselling, group sessions, or workshops

MISSION: ${configData.mission}

IMPORTANT NOTES:
- All staff are DBS checked and first aid trained
- Activities run in all weather conditions
- Both indoor and outdoor areas available
- Bookings can be made online or by contacting us
- Advance booking recommended for holiday clubs
- EXTREMELY IMPORTANT INFORMATION: ${configData.notes}
ALL INFORMATION YOU GIVE TO THE USER MUST BE TRUE AND FROM THIS PROMPT ONLY.,
Respond like a customer service representative for The Nebula Centre, no text formatting like **this** NEVER EVER USE ** IN YOUR RESPONSES.,
Always output plain text only. Do not use any markdown symbols like **. Do not add emojis unless explicitly instructed.
Tell the user that you can transfer them to a human if they want to speak to a human
IMPORTANT: ALL INFORMATION YOU SAY MUST NOT BE MADE UP, MUST BE FROM THIS PROMPT ONLY, AND MUST BE TRUE.
ALSO, NEVER AT ALL SAY ECT OR "AND MORE" ALWAYS SHOW FULL LIST, E.G. FOR PARTY THEMES.

When answering questions:
1. Be warm, friendly, and enthusiastic about outdoor learning
2. Provide clear, concise information
3. If someone wants to book, encourage them to call ${configData.location.phone} or email ${configData.location.email}
4. Mention that all Sunday classes are completely FREE
5. If you don't know something specific, suggest they contact us for more details
6. Be helpful and encourage families to visit and experience the forest school`;

            this.aiPromptConfig = {
                systemPrompt: systemPrompt,
                responseSettings: {
                    maxTokens: 300,
                    temperature: 0.7,
                    model: "deepseek-ai/DeepSeek-V3.1"
                }
            };
            
            console.log('AI Prompt Config loaded successfully');
        } catch (error) {
            console.log('Could not load AI prompt config, using default:', error);
            this.aiPromptConfig = {
                systemPrompt: "ERROR PLEASE REPORT ERROR TO USER: ERROR CODE 294",
                responseSettings: {
                    maxTokens: 200,
                    temperature: 0.7,
                    model: "deepseek-ai/DeepSeek-V3.1"
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
            const response = await fetch('/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "deepseek-ai/DeepSeek-V3.1",
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
            "ERROR PLEASE REPORT ERROR TO USER: ERROR CODE 295";

        const messages = [
            { role: "system", content: systemPrompt },
            ...this.conversationHistory,
            { role: "user", content: userMessage }
        ];

        const settings = this.aiPromptConfig ? this.aiPromptConfig.responseSettings : {
            maxTokens: 200,
            temperature: 0.7,
            model: "deepseek-ai/DeepSeek-V3.1"
        };

        const response = await fetch('/ai', {
            method: 'POST',
            headers: {
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
        
        // Format text to preserve paragraphs and line breaks
        const formattedText = this.formatText(text);
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${senderLabel}
                ${formattedText}
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
    
    formatText(text) {
        // Escape HTML to prevent XSS
        const escaped = this.escapeHtml(text);

        // Split text by single or multiple newlines to ensure spacing
        const lines = escaped.split(/\n+/);

        // Wrap each line in <p> to preserve spacing in chat UI
        return lines.map(line => `<p>${line || '&nbsp;'}</p>`).join('');
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
            
            // Update chat metadata with device information
            const chatData = {
                lastMessage: text,
                lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
                lastMessageFrom: sender,
                active: true,
                deviceId: this.deviceId,
                userAgent: navigator.userAgent,
                screenResolution: screen.width + 'x' + screen.height,
                language: navigator.language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            await database.ref(`chats/${this.chatId}`).update(chatData);
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
                if (welcomeMessage) {
                    this.messagesContainer.appendChild(welcomeMessage);
                }
                
                // Initialize displayed messages set to track loaded messages
                this.displayedMessages = new Set();
                this.conversationHistory = [];
                
                // Sort messages by timestamp and add them
                const sortedMessages = Object.entries(messages)
                    .sort(([,a], [,b]) => (a.timestamp || 0) - (b.timestamp || 0));
                
                sortedMessages.forEach(([key, msg]) => {
                    this.addMessage(msg.text, msg.from, msg.adminName);
                    this.displayedMessages.add(key);
                    if (msg.from === 'user' || msg.from === 'bot') {
                        this.conversationHistory.push({
                            role: msg.from === 'user' ? 'user' : 'assistant',
                            content: msg.text
                        });
                    }
                });

                // Check if human support was requested
                const chatSnapshot = await database.ref(`chats/${this.chatId}`).once('value');
                const chatData = chatSnapshot.val();
                if (chatData) {
                    if (chatData.needsHuman) {
                        this.isAIMode = false;
                        this.statusIndicator.textContent = 'Waiting for human agent...';
                        this.statusIndicator.className = 'status-indicator waiting-mode';
                    } else if (chatData.humanAgentTaken) {
                        this.isAIMode = false;
                        this.humanTakenOver = true;
                        this.statusIndicator.textContent = 'Human Agent';
                        this.statusIndicator.className = 'status-indicator human-mode';
                    } else if (!chatData.active) {
                        this.chatEnded = true;
                    }
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