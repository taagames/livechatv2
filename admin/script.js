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
        this.blockUserBtn = document.getElementById('blockUserBtn');

        // Blocking elements
        this.blockedUsersBtn = document.getElementById('blockedUsersBtn');
        this.blockUserModal = document.getElementById('blockUserModal');
        this.blockedUsersModal = document.getElementById('blockedUsersModal');
        this.blockReason = document.getElementById('blockReason');
        this.confirmBlock = document.getElementById('confirmBlock');
        this.cancelBlock = document.getElementById('cancelBlock');
        this.closeBlockedUsers = document.getElementById('closeBlockedUsers');
        this.blockedUsersList = document.getElementById('blockedUsersList');

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
        this.blockUserBtn.addEventListener('click', () => this.showBlockUserModal());

        // Blocking functionality
        this.blockedUsersBtn.addEventListener('click', () => {
            // Show the blocked users modal with the list
            this.showBlockedUsersModal();
        });
        this.confirmBlock.addEventListener('click', () => this.blockCurrentUser());
        this.cancelBlock.addEventListener('click', () => this.hideBlockUserModal());
        this.closeBlockedUsers.addEventListener('click', () => this.hideBlockedUsersModal());
        
        // Modal close buttons
        this.blockUserModal.querySelector('.modal-close').addEventListener('click', () => this.hideBlockUserModal());
        this.blockedUsersModal.querySelector('.modal-close').addEventListener('click', () => this.hideBlockedUsersModal());

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
        return new Promise((resolve) => {
            this.refreshChatsBtn.style.animation = 'spin 0.5s ease-in-out';
            setTimeout(() => {
                this.refreshChatsBtn.style.animation = '';
            }, 500);
            
            // Force refresh from database
            database.ref('chats').once('value', (snapshot) => {
                this.chats = snapshot.val() || {};
                this.updateChatList();
                this.updateStats();
                resolve();
            });
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
            .filter(([id, chat]) => this.shouldShowChat(chat, id))
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

    shouldShowChat(chat, chatId) {
        // Always show the currently selected chat regardless of filter
        if (chatId === this.currentChatId) return true;
        
        // Apply filter logic for other chats
        switch (this.currentFilter) {
            case 'pending':
                return chat.needsHuman && chat.active;
            case 'active':
                return chat.active && !chat.needsHuman;
            case 'blocked':
                return chat.blocked === true;
            case 'all':
            default:
                return !chat.blocked; // Don't show blocked chats in "All" view
        }
    }

    handleFilterChange(e) {
        this.filterButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.updateChatList();
    }

    async selectChat(chatId) {
        // Remove listeners from previous chat
        if (this.currentChatId) {
            database.ref(`chats/${this.currentChatId}`).off();
            database.ref(`chats/${this.currentChatId}/messages`).off();
        }

        this.currentChatId = chatId;
        
        // Force the display states - critical for ended chats
        this.noChatSelected.style.display = 'none';
        this.chatDetail.style.display = 'flex';

        // Always reset input container first to clear any previous state
        this.resetInputContainer();

        try {
            // Force refresh chat data before loading messages (important for ended chats)
            const snapshot = await database.ref(`chats/${chatId}`).once('value');
            this.chats[chatId] = snapshot.val() || {};
            
            this.updateChatUI(chatId);
            await this.loadChatMessages(chatId);
            
            // Ensure display states are still correct after loading messages
            this.noChatSelected.style.display = 'none';
            this.chatDetail.style.display = 'flex';
            
            this.listenToCurrentChat();
            this.updateChatList(); // Refresh to show active selection
        } catch (error) {
            console.error('Error selecting chat:', error);
            this.showEmptyChat('Failed to load this chat. Please try again.');
        }
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
        // Find the admin input container
        const inputContainer = document.querySelector('.admin-input-container');
        
        if (inputContainer) {
            console.log('Resetting input container');
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
            console.error('Could not find admin-input-container to reset');
        }
    }

    async loadChatMessages(chatId) {
        if (!this.chatMessages) {
            console.error('CRITICAL: chatMessages element not found!');
            return;
        }
        
        // Clear existing messages
        this.chatMessages.innerHTML = '';
        
        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message system-message loading';
        loadingDiv.innerHTML = `
            <div class="message-content">
                <p><em>Loading chat history...</em></p>
            </div>
        `;
        this.chatMessages.appendChild(loadingDiv);
        
        try {
            const snapshot = await database.ref(`chats/${chatId}/messages`).once('value');
            const messages = snapshot.val();
            
            // Remove loading indicator
            this.chatMessages.innerHTML = '';
            
            if (messages && typeof messages === 'object') {
                // Sort messages by timestamp to ensure proper order
                const sortedMessages = Object.entries(messages)
                    .sort(([,a], [,b]) => (a.timestamp || 0) - (b.timestamp || 0))
                    .map(([,message]) => message);
                
                if (sortedMessages.length > 0) {
                    sortedMessages.forEach((message) => {
                        this.addMessageToChat(message);
                    });
                } else {
                    this.showEmptyChat('No messages found in this chat.');
                }
            } else {
                this.showEmptyChat('This chat has no messages yet.');
            }
            
            this.scrollToBottom();
            
        } catch (error) {
            console.error('ERROR loading messages for chat', chatId, ':', error);
            this.chatMessages.innerHTML = '';
            this.showEmptyChat('Error loading chat history. Please try again.');
        }
    }

    showEmptyChat(message) {
        const placeholderDiv = document.createElement('div');
        placeholderDiv.className = 'message system-message empty';
        placeholderDiv.innerHTML = `
            <div class="message-content">
                <p><em>${message}</em></p>
            </div>
        `;
        this.chatMessages.appendChild(placeholderDiv);
    }

    listenToCurrentChat() {
        if (!this.currentChatId) return;

        // Track the current message count to only listen for NEW messages
        const currentMessageCount = this.chatMessages.children.length;

        // Listen for chat changes (status updates, etc.)
        database.ref(`chats/${this.currentChatId}`).on('value', (snapshot) => {
            const chat = snapshot.val();
            if (chat) {
                this.chats[this.currentChatId] = chat;
                this.updateChatStatus(chat);
                
                // Ensure display states remain correct even after updates
                if (this.currentChatId) {
                    this.noChatSelected.style.display = 'none';
                    this.chatDetail.style.display = 'flex';
                }
            }
        });

        // Listen for new messages - but skip existing ones
        let messageCount = 0;
        database.ref(`chats/${this.currentChatId}/messages`).on('child_added', (snapshot) => {
            messageCount++;
            
            // Skip messages that were already loaded
            if (messageCount <= currentMessageCount) {
                return;
            }
            
            const message = snapshot.val();
            
            // Add the new message
            this.addMessageToChat(message);
            if (message.from !== 'human') {
                this.playNotificationSound();
            }
        });
    }

    addMessageToChat(message) {
        if (!message || !message.text) {
            console.warn('Invalid message data:', message);
            return;
        }

        if (!this.chatMessages) {
            console.error('CRITICAL: chatMessages element not found in addMessageToChat!');
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.from}-message`;
        
        const timestamp = message.timestamp ? 
            new Date(message.timestamp).toLocaleTimeString() : 
            new Date().toLocaleTimeString();

        const senderLabels = {
            'user': 'Customer',
            'bot': 'AI Assistant', 
            'human': message.adminName || 'Admin',
            'system': 'System'
        };
        
        const senderLabel = senderLabels[message.from] || message.from;

        // Handle different message types
        let messageContent;
        if (message.from === 'system') {
            // Handle system messages specially
            if (message.text === 'user_blocked') {
                messageContent = `<p><em>User was blocked by ${message.adminName || 'Admin'}</em></p>`;
            } else if (message.text === 'ai_switched_back') {
                messageContent = `<p><em>Chat was switched back to AI by ${message.adminName || 'Admin'}</em></p>`;
            } else if (message.text === 'chat_ended') {
                messageContent = `<p><em>Chat was ended by ${message.adminName || 'Admin'}</em></p>`;
            } else {
                messageContent = `<p><em>${this.escapeHtml(message.text)}</em></p>`;
            }
        } else {
            messageContent = `
                <div class="message-sender">${senderLabel}</div>
                <p>${this.escapeHtml(message.text)}</p>
            `;
        }

        messageDiv.innerHTML = `
            <div class="message-content">
                ${messageContent}
                <span class="message-time">${timestamp}</span>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        
        // Ensure the message is visible
        setTimeout(() => {
            this.scrollToBottom();
        }, 50);
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
        const inputContainer = document.querySelector('.admin-input-container');
        
        if (inputContainer) {
            inputContainer.innerHTML = `
                <div class="ended-chat-notice">
                    <span>💬 This chat has ended</span>
                </div>
            `;
        } else {
            console.error('Could not find admin-input-container to disable input');
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

    // Blocking functionality
    showBlockUserModal() {
        if (!this.currentChatId) return;
        this.blockUserModal.style.display = 'flex';
        this.blockReason.value = '';
    }

    hideBlockUserModal() {
        this.blockUserModal.style.display = 'none';
    }

    async blockCurrentUser() {
        if (!this.currentChatId) return;

        try {
            const chat = this.chats[this.currentChatId];
            if (!chat) return;

            const reason = this.blockReason.value.trim() || 'No reason provided';
            const adminName = this.getAdminName();

            // Get all chats to find the ones from the same device/user
            const allChatsSnapshot = await database.ref('chats').once('value');
            const allChats = allChatsSnapshot.val() || {};
            
            // Find all chat IDs that belong to the same user (by deviceId or userId)
            const userChatIds = [this.currentChatId];
            const currentDeviceId = chat.deviceId;
            const currentUserId = chat.userId;
            
            // Only look for related chats if we have a deviceId or userId
            if (currentDeviceId || currentUserId) {
                Object.entries(allChats).forEach(([chatId, chatData]) => {
                    if (chatId !== this.currentChatId) {
                        // Match by deviceId or userId
                        const matchesDevice = currentDeviceId && chatData.deviceId === currentDeviceId;
                        const matchesUser = currentUserId && chatData.userId === currentUserId;
                        
                        if (matchesDevice || matchesUser) {
                            userChatIds.push(chatId);
                        }
                    }
                });
            }

            // Create comprehensive blocked user data
            const blockedUserData = {
                chatId: this.currentChatId,
                userId: chat.userId || this.currentChatId,
                allChatIds: userChatIds,
                deviceId: chat.deviceId || null,
                blockedAt: firebase.database.ServerValue.TIMESTAMP,
                blockedBy: adminName,
                reason: reason,
                customerName: chat.customName || `Chat ${this.currentChatId.substring(5, 13)}`,
                ipAddress: chat.ipAddress || null,
                userAgent: chat.userAgent || null
            };

            // Add to blocked users list
            const blockedUserRef = await database.ref('blockedUsers').push(blockedUserData);

            // Block all associated chats
            for (const chatId of userChatIds) {
                await database.ref(`chats/${chatId}`).update({
                    blocked: true,
                    blockedAt: firebase.database.ServerValue.TIMESTAMP,
                    blockedBy: adminName,
                    blockReason: reason,
                    blockedUserRef: blockedUserRef.key,
                    active: false
                });
            }

            // If we have device information, block at device level too
            if (chat.deviceId) {
                await database.ref(`blockedDevices/${chat.deviceId}`).set({
                    blockedAt: firebase.database.ServerValue.TIMESTAMP,
                    blockedBy: adminName,
                    reason: reason,
                    originalChatId: this.currentChatId,
                    blockedUserRef: blockedUserRef.key
                });
            }

            // Add system message to current chat
            await database.ref(`chats/${this.currentChatId}/messages`).push({
                from: 'system',
                text: 'user_blocked',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                reason: reason,
                adminName: adminName
            });

            this.hideBlockUserModal();
            
            // Refresh chat list and show success
            await this.refreshChats();
            alert('User has been blocked successfully!');

        } catch (error) {
            console.error('Error blocking user:', error);
            alert('Error blocking user: ' + error.message);
        }
    }

    showBlockedUsersModal() {
        this.blockedUsersModal.style.display = 'flex';
        this.loadBlockedUsers();
    }

    hideBlockedUsersModal() {
        this.blockedUsersModal.style.display = 'none';
    }

    async loadBlockedUsers() {
        try {
            const snapshot = await database.ref('blockedUsers').once('value');
            const blockedUsers = snapshot.val();
            
            this.blockedUsersList.innerHTML = '';

            if (!blockedUsers) {
                this.blockedUsersList.innerHTML = `
                    <div class="empty-state">
                        <p>No blocked users found.</p>
                    </div>
                `;
                return;
            }

            Object.entries(blockedUsers).forEach(([key, user]) => {
                const userDiv = document.createElement('div');
                userDiv.className = 'blocked-user-item';
                userDiv.innerHTML = `
                    <div class="blocked-user-info">
                        <h4>${this.escapeHtml(user.customerName)}</h4>
                        <p><strong>Reason:</strong> ${this.escapeHtml(user.reason)}</p>
                        <div class="blocked-user-meta">
                            Blocked by ${this.escapeHtml(user.blockedBy)} on ${new Date(user.blockedAt).toLocaleDateString()}
                        </div>
                    </div>
                    <button class="unblock-btn" onclick="adminDashboard.unblockUser('${key}')">
                        Unblock
                    </button>
                `;
                this.blockedUsersList.appendChild(userDiv);
            });

        } catch (error) {
            console.error('Error loading blocked users:', error);
            this.blockedUsersList.innerHTML = `
                <div class="empty-state">
                    <p>Error loading blocked users.</p>
                </div>
            `;
        }
    }

    async unblockUser(blockedUserId) {
        if (!confirm('Are you sure you want to unblock this user? This will restore their access to live chat.')) return;

        try {
            // First, get the blocked user data to access all associated information
            const blockedUserSnapshot = await database.ref(`blockedUsers/${blockedUserId}`).once('value');
            const blockedUserData = blockedUserSnapshot.val();
            
            if (!blockedUserData) {
                alert('Blocked user data not found.');
                return;
            }

            // Remove the main blocked user entry
            await database.ref(`blockedUsers/${blockedUserId}`).remove();

            // Unblock all associated chats
            if (blockedUserData.allChatIds && Array.isArray(blockedUserData.allChatIds)) {
                for (const chatId of blockedUserData.allChatIds) {
                    await database.ref(`chats/${chatId}`).update({
                        blocked: null,
                        blockedAt: null,
                        blockedBy: null,
                        blockReason: null,
                        blockedUserRef: null
                    });
                }
            } else if (blockedUserData.chatId) {
                // Fallback to single chat ID
                await database.ref(`chats/${blockedUserData.chatId}`).update({
                    blocked: null,
                    blockedAt: null,
                    blockedBy: null,
                    blockReason: null,
                    blockedUserRef: null
                });
            }

            // Remove device-level block if it exists
            if (blockedUserData.deviceId) {
                await database.ref(`blockedDevices/${blockedUserData.deviceId}`).remove();
            }

            // Refresh data first
            await this.loadBlockedUsers();
            await this.refreshChats();
            
            alert('User has been unblocked successfully and can now access live chat.');
            
        } catch (error) {
            console.error('Error unblocking user:', error);
            alert('Error unblocking user: ' + error.message);
        }
    }
}

// Global reference to admin dashboard
let adminDashboard;

// Initialize the admin dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});

// Optional: Global function to manually initialize if needed
window.initAdminDashboard = () => {
    adminDashboard = new AdminDashboard();
};