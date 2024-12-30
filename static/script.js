document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const conversationsList = document.getElementById('conversations-list');
    const newChatButton = document.getElementById('new-chat-button');
    const themeSwitch = document.getElementById('theme-switch');
    const codeTheme = document.getElementById('code-theme');

    let messages = [];
    let isSummarized = false;
    let isProcessing = false;
    let currentConversationId = null;

    // Theme handling
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateCodeTheme(currentTheme);
    
    themeSwitch.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateCodeTheme(newTheme);
    });
    
    function updateCodeTheme(theme) {
        const isDark = theme === 'dark';
        codeTheme.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-${isDark ? 'dark' : ''}.min.css`;
    }

    // Load conversations on startup
    loadConversations();

    // Configure marked options
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });

    newChatButton.addEventListener('click', () => {
        currentConversationId = null;
        messages = [];
        chatMessages.innerHTML = '';
        updateActiveConversation();
    });

    async function loadConversations() {
        try {
            const response = await fetch('/api/conversations');
            const conversations = await response.json();
            renderConversations(conversations);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    }

    function renderConversations(conversations) {
        conversationsList.innerHTML = '';
        conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = `conversation-item ${conv.id === currentConversationId ? 'active' : ''}`;
            item.innerHTML = `
                <span class="title" data-id="${conv.id}">${conv.title}</span>
                <div class="conversation-actions">
                    <button class="rename-button" data-id="${conv.id}" title="Rename">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M16.474 5.408l2.118 2.117m-.756-3.982L12.109 9.27a2.118 2.118 0 00-.58 1.082L11 13l2.648-.53c.41-.082.786-.283 1.082-.579l5.727-5.727a1.853 1.853 0 000-2.621 1.853 1.853 0 00-2.621 0z" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="delete-button" data-id="${conv.id}" title="Delete">
                        <svg><use href="#trash-icon"/></svg>
                    </button>
                </div>
            `;
            
            // Add click handler for conversation selection
            const titleSpan = item.querySelector('.title');
            titleSpan.addEventListener('click', () => {
                loadConversation(conv.id);
            });

            // Add click handler for rename button
            const renameButton = item.querySelector('.rename-button');
            renameButton.addEventListener('click', (e) => {
                e.stopPropagation();
                startRenaming(conv.id, titleSpan);
            });

            // Add click handler for delete button
            const deleteButton = item.querySelector('.delete-button');
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteConversation(conv.id);
            });

            conversationsList.appendChild(item);
        });
    }

    function startRenaming(conversationId, titleElement) {
        const currentTitle = titleElement.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentTitle;
        input.className = 'rename-input';
        
        // Replace title with input
        titleElement.replaceWith(input);
        input.focus();
        input.select();

        // Handle input events
        input.addEventListener('blur', () => finishRenaming(conversationId, input, currentTitle));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            } else if (e.key === 'Escape') {
                input.value = currentTitle;
                input.blur();
            }
        });
    }

    async function finishRenaming(conversationId, input, originalTitle) {
        const newTitle = input.value.trim();
        const titleSpan = document.createElement('span');
        titleSpan.className = 'title';
        titleSpan.dataset.id = conversationId;

        if (newTitle && newTitle !== originalTitle) {
            try {
                const response = await fetch(`/api/conversations/${conversationId}/rename`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ title: newTitle })
                });

                if (response.ok) {
                    titleSpan.textContent = newTitle;
                } else {
                    titleSpan.textContent = originalTitle;
                    console.error('Failed to rename conversation');
                }
            } catch (error) {
                console.error('Failed to rename conversation:', error);
                titleSpan.textContent = originalTitle;
            }
        } else {
            titleSpan.textContent = originalTitle;
        }

        input.replaceWith(titleSpan);
        titleSpan.addEventListener('click', () => loadConversation(conversationId));
    }

    async function loadConversation(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}`);
            const messages = await response.json();
            
            // Update UI
            currentConversationId = conversationId;
            chatMessages.innerHTML = '';
            messages.forEach(msg => addMessage(msg.content, msg.role === 'user'));
            updateActiveConversation();
            
            // Update messages array
            window.messages = messages;
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    }

    async function deleteConversation(conversationId) {
        if (!confirm('Are you sure you want to delete this conversation?')) return;

        try {
            await fetch(`/api/conversations/${conversationId}`, {
                method: 'DELETE'
            });
            
            if (conversationId === currentConversationId) {
                currentConversationId = null;
                messages = [];
                chatMessages.innerHTML = '';
            }
            
            loadConversations();
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    }

    function updateActiveConversation() {
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === currentConversationId);
        });
    }

    // Handle input height
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });

    // Handle enter key
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendButton.addEventListener('click', () => {
        if (!isProcessing) {
            sendMessage();
        }
    });

    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
        
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'message-content-wrapper';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = isUser ? 'U' : 'A';
        
        headerDiv.appendChild(avatar);
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (isUser) {
            messageContent.textContent = content;
        } else {
            messageContent.innerHTML = marked.parse(content);
            // Initialize syntax highlighting for code blocks
            messageContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
            
            // Add copy button for assistant messages
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
            copyButton.title = 'Copy to clipboard';
            copyButton.onclick = () => {
                navigator.clipboard.writeText(content).then(() => {
                    copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
                    setTimeout(() => {
                        copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
                    }, 2000);
                });
            };
            wrapperDiv.appendChild(copyButton);
        }
        
        wrapperDiv.appendChild(headerDiv);
        wrapperDiv.appendChild(messageContent);
        messageDiv.appendChild(wrapperDiv);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addThinkingIndicator() {
        const thinking = document.createElement('div');
        thinking.className = 'thinking';
        const dotContainer = document.createElement('div');
        dotContainer.className = 'dot-container';
        dotContainer.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;
        thinking.appendChild(dotContainer);
        chatMessages.appendChild(thinking);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return thinking;
    }

    function addSummarizationNotice() {
        if (!isSummarized) {
            const notice = document.createElement('div');
            notice.className = 'message system-message';
            notice.innerHTML = '<div class="message-content"><em>Previous messages have been summarized for context...</em></div>';
            chatMessages.appendChild(notice);
            isSummarized = true;
        }
    }

    async function sendMessage() {
        const content = userInput.value.trim();
        if (!content || isProcessing) return;

        isProcessing = true;
        sendButton.disabled = true;
        userInput.disabled = true;

        // Add user message to chat
        addMessage(content, true);
        messages.push({ role: "user", content: content });

        // Clear input
        userInput.value = '';
        userInput.style.height = 'auto';

        // Add thinking indicator
        const thinking = addThinkingIndicator();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messages,
                    conversation_id: currentConversationId
                }),
            });

            // Remove thinking indicator
            thinking.remove();

            const data = await response.json();

            if (data.status === 'success') {
                if (data.summarized) {
                    addSummarizationNotice();
                }
                messages.push({ role: "assistant", content: data.response });
                addMessage(data.response);
                
                // Update conversation ID and reload conversation list
                if (data.conversation_id) {
                    currentConversationId = data.conversation_id;
                    loadConversations();
                }
            } else {
                addMessage('Error: ' + data.error);
            }
        } catch (error) {
            thinking.remove();
            addMessage('Error: Could not connect to the server');
        } finally {
            isProcessing = false;
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    }
}); 