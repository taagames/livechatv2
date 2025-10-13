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

class AdminDashboard {
    constructor() {
        this.isLoggedIn = false;
        this.adminPassword = "admin123"; // Change this to your desired password
        this.currentChatId = null;
        this.chats = {};
        this.currentFilter = 'all';
        this.systemSettings = {
            liveChatEnabled: true,
            aiChatbotEnabled: true
        };
        this.editingChatName = false;
        this.lastSeenMessages = {}; // Track last seen messages per chat
        this.loadLastSeenMessages();
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkLoginStatus();
    }

    initializeElements() {
        // Login elements
        this.loginScreen = document.getElementById('loginScreen');
        this.loginForm = document.getElementById('loginForm');
        this.passwordInput = document.getElementById('passwordInput');
        this.loginError = document.getElementById('loginError');

        // Dashboard elements
        this.adminDashboard = document.getElementById('adminDashboard');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.totalChatsSpan = document.getElementById('totalChats');
        this.activeChatsSpan = document.getElementById('activeChats');
        this.pendingChatsSpan = document.getElementById('pendingChats');

        // Chat list elements
        this.chatList = document.getElementById('chatList');
        this.filterButtons = document.querySelectorAll('.filter-btn');

        // Chat detail elements
        this.noChatSelected = document.getElementById('noChatSelected');
        this.chatDetail = document.getElementById('chatDetail');
        this.customerName = document.getElementById('customerName');
        this.chatStatus = document.getElementById('chatStatus');
        this.chatMessages = document.getElementById('chatMessages');
        this.adminMessageInput = document.getElementById('adminMessageInput');
        this.sendAdminMessage = document.getElementById('sendAdminMessage');
        this.endChatBtn = document.getElementById('endChatBtn');
        this.takeChatBtn = document.getElementById('takeChatBtn');
        this.switchToAIBtn = document.getElementById('switchToAIBtn');
        this.editNameBtn = document.getElementById('editNameBtn');

        // Control buttons
        this.toggleLiveChatBtn = document.getElementById('toggleLiveChatBtn');
        this.toggleAIChatbotBtn = document.getElementById('toggleAIChatbotBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.refreshChatsBtn = document.getElementById('refreshChatsBtn');

        // Settings modal
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.adminNameInput = document.getElementById('adminNameInput');
        this.saveNameBtn = document.getElementById('saveNameBtn');
        this.suggestionsList = document.getElementById('suggestionsList');
        this.newSuggestionInput = document.getElementById('newSuggestionInput');
        this.addSuggestionBtn = document.getElementById('addSuggestionBtn');
        this.showChatNamesToggle = document.getElementById('showChatNamesToggle');

        // Notification sound
        this.notificationSound = document.getElementById('notificationSound');
    }

    attachEventListeners() {
        // Login
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        // Logout
        this.logoutBtn.addEventListener('click', () => this.logout());

        // Filter buttons
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        // Admin message input
        this.sendAdminMessage.addEventListener('click', () => this.sendMessage());
        this.adminMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Chat actions
        this.endChatBtn.addEventListener('click', () => this.endChat());
        this.takeChatBtn.addEventListener('click', () => this.takeChat());
        this.switchToAIBtn.addEventListener('click', () => this.switchToAI());
        this.editNameBtn.addEventListener('click', () => this.editChatName());

        // Control buttons
        this.toggleLiveChatBtn.addEventListener('click', () => this.toggleLiveChat());
        this.toggleAIChatbotBtn.addEventListener('click', () => this.toggleAIChatbot());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.refreshChatsBtn.addEventListener('click', () => this.refreshChats());

        // Settings modal
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.saveNameBtn.addEventListener('click', () => this.saveAdminName());
        this.addSuggestionBtn.addEventListener('click', () => this.addSuggestion());
        this.newSuggestionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSuggestion();
        });
        this.showChatNamesToggle.addEventListener('change', () => this.updateShowChatNames());
    }

    checkLoginStatus() {
        const isLoggedIn = localStorage.getItem('admin_logged_in');
        if (isLoggedIn === 'true') {
            this.login();
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const password = this.passwordInput.value;
        
        if (password === this.adminPassword) {
            localStorage.setItem('admin_logged_in', 'true');
            this.login();
        } else {
            this.loginError.textContent = 'Incorrect password. Please try again.';
            this.passwordInput.value = '';
        }
    }

    login() {
        this.isLoggedIn = true;
        this.loginScreen.style.display = 'none';
        this.adminDashboard.style.display = 'flex';
        this.loadSystemSettings();
        this.startListening();
        console.log('Admin logged in successfully');
    }

    logout() {
        this.isLoggedIn = false;
        localStorage.removeItem('admin_logged_in');
        this.loginScreen.style.display = 'flex';
        this.adminDashboard.style.display = 'none';
        this.passwordInput.value = '';
        this.loginError.textContent = '';
        console.log('Admin logged out');
    }

    async loadSystemSettings() {
        try {
            const snapshot = await database.ref('systemSettings').once('value');
            const settings = snapshot.val();
            if (settings) {
                this.systemSettings = { ...this.systemSettings, ...settings };
            }
            this.updateControlButtons();
        } catch (error) {
            console.log('Could not load system settings');
        }
    }

    updateControlButtons() {
        // Update Live Chat button
        if (this.systemSettings.liveChatEnabled) {
            this.toggleLiveChatBtn.classList.add('active');
            this.toggleLiveChatBtn.classList.remove('inactive');
            this.toggleLiveChatBtn.querySelector('.btn-text').textContent = 'Disable Live Chat';
        } else {
            this.toggleLiveChatBtn.classList.remove('active');
            this.toggleLiveChatBtn.classList.add('inactive');
            this.toggleLiveChatBtn.querySelector('.btn-text').textContent = 'Enable Live Chat';
        }

        // Update AI Chatbot button
        if (this.systemSettings.aiChatbotEnabled) {
            this.toggleAIChatbotBtn.classList.add('active');
            this.toggleAIChatbotBtn.classList.remove('inactive');
            this.toggleAIChatbotBtn.querySelector('.btn-text').textContent = 'Disable AI Chatbot';
        } else {
            this.toggleAIChatbotBtn.classList.remove('active');
            this.toggleAIChatbotBtn.classList.add('inactive');
            this.toggleAIChatbotBtn.querySelector('.btn-text').textContent = 'Enable AI Chatbot';
        }
    }

    async toggleLiveChat() {
        this.systemSettings.liveChatEnabled = !this.systemSettings.liveChatEnabled;
        
        try {
            await database.ref('systemSettings').update({
                liveChatEnabled: this.systemSettings.liveChatEnabled
            });
            this.updateControlButtons();
            console.log('Live chat toggled:', this.systemSettings.liveChatEnabled);
        } catch (error) {
            console.error('Error toggling live chat:', error);
        }
    }

    async toggleAIChatbot() {
        this.systemSettings.aiChatbotEnabled = !this.systemSettings.aiChatbotEnabled;
        
        try {
            await database.ref('systemSettings').update({
                aiChatbotEnabled: this.systemSettings.aiChatbotEnabled
            });
            this.updateControlButtons();
            console.log('AI chatbot toggled:', this.systemSettings.aiChatbotEnabled);
        } catch (error) {
            console.error('Error toggling AI chatbot:', error);
        }
    }

    refreshChats() {
        this.refreshChatsBtn.style.animation = 'spin 0.5s ease-in-out';
        setTimeout(() => {
            this.refreshChatsBtn.style.animation = '';
        }, 500);
        
        // Force refresh from database
        database.ref('chats').once('value', (snapshot) => {
            this.chats = snapshot.val() || {};
            this.updateChatList();
            this.updateStats();
        });
    }

    startListening() {
        // Listen for all chats
        database.ref('chats').on('value', (snapshot) => {
            this.chats = snapshot.val() || {};
            this.updateChatList();
            this.updateStats();
        });

        // Listen for new messages in the current chat
        if (this.currentChatId) {
            this.listenToCurrentChat();
        }
    }

    updateStats() {
        const chatArray = Object.keys(this.chats);
        const totalChats = chatArray.length;
        const activeChats = chatArray.filter(id => this.chats[id].active).length;
        const pendingChats = chatArray.filter(id => this.chats[id].needsHuman).length;

        this.totalChatsSpan.textContent = `${totalChats} Chats`;
        this.activeChatsSpan.textContent = `${activeChats} Active`;
        this.pendingChatsSpan.textContent = `${pendingChats} Pending`;
    }

    updateChatList() {
        const chatArray = Object.entries(this.chats)
            .filter(([id, chat]) => this.shouldShowChat(chat))
            .sort(([,a], [,b]) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

        if (chatArray.length === 0) {
            this.chatList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>No ${this.currentFilter} chats</h3>
                    <p>Conversations will appear here when customers start chatting</p>
                </div>
            `;
            return;
        }

        this.chatList.innerHTML = chatArray.map(([chatId, chat]) => {
            const isActive = chatId === this.currentChatId;
            const needsHuman = chat.needsHuman;
            const lastMessageTime = chat.lastMessageTime ? 
                new Date(chat.lastMessageTime).toLocaleTimeString() : 'New';
            const lastMessage = chat.lastMessage || 'Chat started';
            
            // Use custom name if available, otherwise use chat ID
            const displayName = chat.customName || `Chat ${chatId.replace('chat_', '').substring(0, 8)}`;
            
            // Check if there are new messages
            const hasNewMessages = this.hasNewMessages(chatId, chat);
            const newMessageClass = hasNewMessages ? 'has-new-messages' : '';

            return `
                <div class="chat-item ${isActive ? 'active' : ''} ${needsHuman ? 'needs-human' : ''} ${newMessageClass}" 
                     data-chat-id="${chatId}">
                    <div class="chat-header">
                        <div class="chat-id">
                            ${this.escapeHtml(displayName)}
                            ${hasNewMessages ? '<span class="new-message-indicator">●</span>' : ''}
                        </div>
                        <div class="chat-time">${lastMessageTime}</div>
                    </div>
                    <div class="last-message">${this.escapeHtml(lastMessage)}</div>
                </div>
            `;
        }).join('');

        // Add click listeners to chat items
        this.chatList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.dataset.chatId;
                this.markChatAsSeen(chatId);
                this.selectChat(chatId);
            });
        });
    }

    shouldShowChat(chat) {
        if (!chat.active && this.currentFilter !== 'all') return false;
        
        switch (this.currentFilter) {
            case 'pending':
                return chat.needsHuman;
            case 'active':
                return chat.active && !chat.needsHuman;
            default:
                return true;
        }
    }

    handleFilterChange(e) {
        this.filterButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.updateChatList();
    }

    selectChat(chatId) {
        // Remove listeners from previous chat
        if (this.currentChatId) {
            database.ref(`chats/${this.currentChatId}`).off();
            database.ref(`chats/${this.currentChatId}/messages`).off();
        }
        
        this.currentChatId = chatId;
        this.noChatSelected.style.display = 'none';
        this.chatDetail.style.display = 'flex';
        
        // Always reset input container first to clear any previous state
        this.resetInputContainer();
        
        this.updateChatUI(chatId);
        this.loadChatMessages(chatId);
        this.listenToCurrentChat();
        this.updateChatList(); // Refresh to show active selection
    }

    updateChatUI(chatId) {
        const chat = this.chats[chatId];
        if (!chat) return;
        
        // Update customer info with custom name if available
        const displayName = chat.customName || `Chat ${chatId.replace('chat_', '').substring(0, 8)}`;
        this.customerName.textContent = displayName;
        
        // Update status and button visibility based on current chat state
        this.updateChatStatus(chat);
    }

    updateChatStatus(chat) {
        if (!chat.active) {
            this.chatStatus.textContent = 'Ended';
            this.chatStatus.className = 'chat-status ended';
            this.takeChatBtn.style.display = 'none';
            this.switchToAIBtn.style.display = 'none';
            this.disableInputForEndedChat();
        } else if (chat.needsHuman) {
            this.chatStatus.textContent = 'Needs Human Support';
            this.chatStatus.className = 'chat-status waiting';
            this.takeChatBtn.style.display = 'inline-block';
            this.switchToAIBtn.style.display = 'none';
        } else if (chat.humanAgentTaken) {
            this.chatStatus.textContent = 'Human Agent';
            this.chatStatus.className = 'chat-status';
            this.takeChatBtn.style.display = 'none';
            this.switchToAIBtn.style.display = 'inline-block';
        } else {
            this.chatStatus.textContent = 'AI Active';
            this.chatStatus.className = 'chat-status';
            this.takeChatBtn.style.display = 'inline-block';
            this.switchToAIBtn.style.display = 'none';
        }
    }

    resetInputContainer() {
        // Find input container more reliably
        let inputContainer = document.querySelector('.message-input-container');
        
        // If not found by class, try to find by element reference
        if (!inputContainer && this.adminMessageInput) {
            inputContainer = this.adminMessageInput.parentElement;
        }
        
        // If still not found, try to find any container with input elements
        if (!inputContainer) {
            inputContainer = document.querySelector('#adminMessageInput')?.parentElement;
        }
        
        // If still not found, find by common parent structure
        if (!inputContainer) {
            const chatDetail = document.querySelector('.chat-detail');
            inputContainer = chatDetail?.querySelector('.message-input-container') || 
                           chatDetail?.querySelector('[class*="input"]')?.parentElement;
        }
        
        if (inputContainer) {
            // Always reset the input container to clear any "ended chat" notices
            inputContainer.innerHTML = `
                <div class="input-wrapper">
                    <textarea id="adminMessageInput" placeholder="Type your response to the customer..." rows="3"></textarea>
                    <button id="sendAdminMessage" class="send-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="white"/>
                        </svg>
                        Send
                    </button>
                </div>
            `;
            
            // Re-initialize elements
            this.adminMessageInput = document.getElementById('adminMessageInput');
            this.sendAdminMessage = document.getElementById('sendAdminMessage');
            
            // Re-attach event listeners
            if (this.sendAdminMessage) {
                this.sendAdminMessage.addEventListener('click', () => this.sendMessage());
            }
            if (this.adminMessageInput) {
                this.adminMessageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                    }
                });
            }
        } else {
            console.error('Could not find input container to reset');
        }
    }

    loadChatMessages(chatId) {
        this.chatMessages.innerHTML = '';
        
        database.ref(`chats/${chatId}/messages`).once('value', (snapshot) => {
            const messages = snapshot.val();
            if (messages) {
                Object.values(messages).forEach(message => {
                    this.addMessageToChat(message);
                });
            }
            this.scrollToBottom();
        });
    }

    listenToCurrentChat() {
        if (!this.currentChatId) return;

        // Listen for chat changes (status updates, etc.)
        database.ref(`chats/${this.currentChatId}`).on('value', (snapshot) => {
            const chat = snapshot.val();
            if (chat) {
                this.chats[this.currentChatId] = chat;
                this.updateChatStatus(chat);
            }
        });

        // Listen for new messages
        database.ref(`chats/${this.currentChatId}/messages`).on('child_added', (snapshot) => {
            const message = snapshot.val();
            
            // Check if message already exists in UI
            const existingMessages = this.chatMessages.querySelectorAll('.message');
            let messageExists = false;
            
            existingMessages.forEach(msg => {
                const messageText = msg.querySelector('p').textContent;
                const messageTime = msg.querySelector('.message-time').textContent;
                const messageTimestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
                
                if (messageText === message.text && messageTime === messageTimestamp) {
                    messageExists = true;
                }
            });
            
            if (!messageExists) {
                this.addMessageToChat(message);
                if (message.from !== 'human') {
                    this.playNotificationSound();
                }
            }
        });
    }

    addMessageToChat(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.from}-message`;
        
        const timestamp = message.timestamp ? 
            new Date(message.timestamp).toLocaleTimeString() : 
            new Date().toLocaleTimeString();

        const senderLabel = {
            'user': 'Customer',
            'bot': 'AI Assistant', 
            'human': 'You'
        }[message.from] || message.from;

        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-sender">${senderLabel}</div>
                <p>${this.escapeHtml(message.text)}</p>
                <span class="message-time">${timestamp}</span>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    async sendMessage() {
        const messageText = this.adminMessageInput.value.trim();
        if (!messageText || !this.currentChatId) return;

        this.adminMessageInput.value = '';
        
        // Save to Firebase first, UI will update via listener
        try {
            const adminName = this.getAdminName();
            const messageData = {
                from: 'human',
                text: messageText,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                chatId: this.currentChatId,
                adminName: adminName
            };
            
            await database.ref(`chats/${this.currentChatId}/messages`).push(messageData);

            // Update chat metadata
            await database.ref(`chats/${this.currentChatId}`).update({
                lastMessage: messageText,
                lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
                lastMessageFrom: 'human',
                needsHuman: false,
                humanAgentTaken: true
            });

            console.log('Message sent successfully');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    async takeChat() {
        if (!this.currentChatId) return;

        try {
            const adminName = this.getAdminName();
            
            await database.ref(`chats/${this.currentChatId}`).update({
                needsHuman: false,
                humanAgentTaken: true,
                takenAt: firebase.database.ServerValue.TIMESTAMP,
                takenBy: adminName
            });

            // Add system message
            await database.ref(`chats/${this.currentChatId}/messages`).push({
                from: 'human',
                text: `Hello! I'm ${adminName} and I'm here to help you. How can I assist you today?`,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                adminName: adminName
            });

            console.log('Chat taken successfully');
        } catch (error) {
            console.error('Error taking chat:', error);
        }
    }

    async switchToAI() {
        if (!this.currentChatId) return;

        try {
            const adminName = this.getAdminName();
            
            await database.ref(`chats/${this.currentChatId}`).update({
                humanAgentTaken: false,
                needsHuman: false,
                aiSwitchBackAt: firebase.database.ServerValue.TIMESTAMP,
                switchedBy: adminName
            });

            // Add system message only - no human message to avoid triggering human mode
            await database.ref(`chats/${this.currentChatId}/messages`).push({
                from: 'system',
                text: 'ai_switched_back',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                adminName: adminName
            });

            console.log('Switched back to AI successfully');
        } catch (error) {
            console.error('Error switching to AI:', error);
        }
    }

    getAdminName() {
        let adminName = localStorage.getItem('admin_display_name');
        if (!adminName) {
            adminName = prompt('Enter your display name for chat messages:') || 'Support Agent';
            localStorage.setItem('admin_display_name', adminName);
        }
        return adminName;
    }

    disableInputForEndedChat() {
        const inputContainer = document.querySelector('.message-input-container') || 
                               (this.adminMessageInput && this.adminMessageInput.parentElement);
        
        if (inputContainer) {
            inputContainer.innerHTML = `
                <div class="ended-chat-notice">
                    <span>💬 This chat has ended</span>
                </div>
            `;
        }
    }

    editChatName() {
        if (!this.currentChatId || this.editingChatName) return;

        this.editingChatName = true;
        const currentName = this.customerName.textContent;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'chat-name-input';
        input.style.cssText = `
            background: transparent;
            border: 2px solid #007bff;
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 16px;
            font-weight: 600;
            color: #333;
            width: 200px;
        `;

        const saveEdit = async () => {
            const newName = input.value.trim();
            if (newName && newName !== currentName) {
                try {
                    await database.ref(`chats/${this.currentChatId}`).update({
                        customName: newName,
                        nameEditedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                    this.customerName.textContent = newName;
                } catch (error) {
                    console.error('Error updating chat name:', error);
                }
            } else {
                this.customerName.textContent = currentName;
            }
            
            this.customerName.style.display = 'block';
            input.remove();
            this.editingChatName = false;
        };

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });

        this.customerName.style.display = 'none';
        this.customerName.parentNode.insertBefore(input, this.customerName);
        input.focus();
        input.select();
    }

    async openSettings() {
        this.settingsModal.style.display = 'flex';
        this.settingsModal.style.animation = 'fadeIn 0.3s ease-out';
        
        // Load current settings
        this.adminNameInput.value = this.getAdminName();
        await this.loadShowChatNamesSettings();
        this.loadChatSuggestions();
    }

    async loadShowChatNamesSettings() {
        try {
            const snapshot = await database.ref('systemSettings/showChatNames').once('value');
            this.showChatNamesToggle.checked = snapshot.val() || false;
        } catch (error) {
            console.log('Could not load showChatNames setting');
        }
    }

    async updateShowChatNames() {
        try {
            await database.ref('systemSettings').update({
                showChatNames: this.showChatNamesToggle.checked
            });
            console.log('Show chat names updated:', this.showChatNamesToggle.checked);
        } catch (error) {
            console.error('Error updating showChatNames:', error);
        }
    }

    closeSettings() {
        this.settingsModal.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            this.settingsModal.style.display = 'none';
        }, 300);
    }

    saveAdminName() {
        const name = this.adminNameInput.value.trim();
        if (name) {
            localStorage.setItem('admin_display_name', name);
            this.saveNameBtn.textContent = 'Saved!';
            this.saveNameBtn.style.background = '#28a745';
            setTimeout(() => {
                this.saveNameBtn.textContent = 'Save Name';
                this.saveNameBtn.style.background = '';
            }, 2000);
        }
    }

    async loadChatSuggestions() {
        try {
            const snapshot = await database.ref('chatSuggestions').once('value');
            const suggestions = snapshot.val() || [];
            
            this.suggestionsList.innerHTML = suggestions.map((suggestion, index) => `
                <div class="suggestion-item">
                    <span class="suggestion-text">${this.escapeHtml(suggestion)}</span>
                    <button class="remove-suggestion" data-index="${index}">🗑️</button>
                </div>
            `).join('');

            // Add remove listeners
            this.suggestionsList.querySelectorAll('.remove-suggestion').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    this.removeSuggestion(index);
                });
            });
        } catch (error) {
            console.log('Could not load suggestions');
        }
    }

    async addSuggestion() {
        const suggestion = this.newSuggestionInput.value.trim();
        if (!suggestion) return;

        try {
            const snapshot = await database.ref('chatSuggestions').once('value');
            const suggestions = snapshot.val() || [];
            suggestions.push(suggestion);
            
            await database.ref('chatSuggestions').set(suggestions);
            this.newSuggestionInput.value = '';
            this.loadChatSuggestions();
        } catch (error) {
            console.error('Error adding suggestion:', error);
        }
    }

    async removeSuggestion(index) {
        try {
            const snapshot = await database.ref('chatSuggestions').once('value');
            const suggestions = snapshot.val() || [];
            suggestions.splice(index, 1);
            
            await database.ref('chatSuggestions').set(suggestions);
            this.loadChatSuggestions();
        } catch (error) {
            console.error('Error removing suggestion:', error);
        }
    }

    async endChat() {
        if (!this.currentChatId) return;

        if (confirm('Are you sure you want to end this chat?')) {
            try {
                await database.ref(`chats/${this.currentChatId}`).update({
                    active: false,
                    endedAt: firebase.database.ServerValue.TIMESTAMP,
                    endedBy: this.getAdminName()
                });

                // Add system message to notify client
                await database.ref(`chats/${this.currentChatId}/messages`).push({
                    from: 'system',
                    text: 'chat_ended',
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });

                // Clear selection
                this.currentChatId = null;
                this.chatDetail.style.display = 'none';
                this.noChatSelected.style.display = 'flex';

                console.log('Chat ended successfully');
            } catch (error) {
                console.error('Error ending chat:', error);
            }
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    playNotificationSound() {
        try {
            this.notificationSound.play().catch(() => {
                // Ignore autoplay restrictions
            });
        } catch (error) {
            console.log('Could not play notification sound:', error);
        }
    }

    loadLastSeenMessages() {
        const saved = localStorage.getItem('admin_last_seen_messages');
        if (saved) {
            this.lastSeenMessages = JSON.parse(saved);
        }
    }

    saveLastSeenMessages() {
        localStorage.setItem('admin_last_seen_messages', JSON.stringify(this.lastSeenMessages));
    }

    hasNewMessages(chatId, chat) {
        if (!chat.lastMessageTime) return false;
        
        const lastSeen = this.lastSeenMessages[chatId] || 0;
        return chat.lastMessageTime > lastSeen;
    }

    markChatAsSeen(chatId) {
        const chat = this.chats[chatId];
        if (chat && chat.lastMessageTime) {
            this.lastSeenMessages[chatId] = chat.lastMessageTime;
            this.saveLastSeenMessages();
            this.updateChatList(); // Refresh to remove indicator
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the admin dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});

// Optional: Global function to manually initialize if needed
window.initAdminDashboard = () => {
    new AdminDashboard();
};