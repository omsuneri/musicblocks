/**
 * Represents a AI Widget.
 * @constructor
 */
function AIDebuggerWidget() {
    const ICONSIZE = 32;
    const CHATWIDTH = 900;
    const CHATHEIGHT = 600;
    const SIDEBARWIDTH = 150;
    
    // Backend configuration
    const BACKEND_CONFIG = {
        BASE_URL: "http://localhost:8000",
        ENDPOINTS: {
            ANALYZE: "/analyze"
        },
        TIMEOUT: 30000 // 30 seconds
    };
    
    /**
     * Chat history array to store conversation
     * @type {Array}
     */
    this.chatHistory = [];
    
    /**
     * Prompt count for tracking conversation progression
     * @type {number}
     */
    this.promptCount = 0;
    
    /**
     * Current conversation ID for tracking sessions
     * @type {string}
     */
    this.conversationId = null;
    
    /**
     * Reference to the activity object
     * @type {object}
     */
    this.activity = null;
    
    /**
     * Widget window reference
     * @type {object}
     */
    this.widgetWindow = null;
    
    /**
     * Chat log container
     * @type {HTMLElement}
     */
    this.chatLog = null;
    
    /**
     * Input field for messages
     * @type {HTMLElement}
     */
    this.messageInput = null;
    
    /**
     * Send button
     * @type {HTMLElement}
     */
    this.sendButton = null;
    
    /**
     * Sidebar container
     * @type {HTMLElement}
     */
    this.sidebar = null;

    /**
     * Generates a unique conversation ID
     * @returns {string} Unique conversation identifier
     * @private
     */
    this._generateConversationId = function() {
        return "conv_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    };

    // Initialize conversation ID after the function is defined
    this.conversationId = this._generateConversationId();

    /**
     * Initializes the Debugger Widget.
     * @param {object} activity - The activity object.
     * @returns {void}
     */
    this.init = function(activity) {
        this.activity = activity;
        this.activity.isInputON = true;
        
        // Ensure conversation ID is set
        if (!this.conversationId) {
            this.conversationId = this._generateConversationId();
        }

        const widgetWindow = window.widgetWindows.windowFor(this, "Debugger");
        this.widgetWindow = widgetWindow;
        widgetWindow.clear();
        widgetWindow.show();
        
        // Set window size
        widgetWindow.getWidgetBody().style.width = CHATWIDTH + "px";
        widgetWindow.getWidgetBody().style.height = CHATHEIGHT + "px";
        
        // Handle window close event
        widgetWindow.onclose = () => {
            widgetWindow.destroy();
            this.activity.isInputON = false;
        };
        
        // Handle window maximize event
        widgetWindow.onmaximize = this._scale.bind(this);
        
        // Create the main layout
        this._createLayout();
        
        // Initialize with project loading instead of simple welcome message
        this._loadProjectAndInitialize();
        
        widgetWindow.sendToCenter();
        
        this.activity.textMsg(_("Debugger initialized"));
    };

    /**
     * Creates the main layout structure
     * @private
     */
    this._createLayout = function() {
        const mainContainer = document.createElement("div");
        mainContainer.style.display = "flex";
        mainContainer.style.height = "100%";
        mainContainer.style.width = "100%";
        
        // Create sidebar
        this._createSidebar(mainContainer);
        
        // Create chat area
        this._createChatArea(mainContainer);
        
        this.widgetWindow.getWidgetBody().appendChild(mainContainer);
    };

    /**
     * Creates the sidebar with controls
     * @param {HTMLElement} container - Parent container
     * @private
     */
    this._createSidebar = function(container) {
        this.sidebar = document.createElement("div");
        this.sidebar.style.width = SIDEBARWIDTH + "px";
        this.sidebar.style.height = "100%";
        this.sidebar.style.backgroundColor = "#f5f5f5";
        this.sidebar.style.borderRight = "1px solid #ddd";
        this.sidebar.style.padding = "15px";
        this.sidebar.style.boxSizing = "border-box";
        this.sidebar.style.display = "flex";
        this.sidebar.style.flexDirection = "column";
        this.sidebar.style.gap = "10px";
        
        // Title
        const title = document.createElement("h3");
        title.textContent = "Debugger Controls";
        title.style.margin = "0 0 15px 0";
        title.style.fontSize = "16px";
        title.style.color = "#333";
        title.style.textAlign = "center";
        this.sidebar.appendChild(title);
        
        // New Conversation Button
        const newChatButton = document.createElement("button");
        newChatButton.textContent = "Reset conversation";
        newChatButton.style.padding = "10px 15px";
        newChatButton.style.backgroundColor = "#4CAF50";
        newChatButton.style.color = "white";
        newChatButton.style.border = "none";
        newChatButton.style.borderRadius = "5px";
        newChatButton.style.cursor = "pointer";
        newChatButton.style.fontSize = "14px";
        newChatButton.style.transition = "background-color 0.3s";
        
        newChatButton.onmouseover = function() {
            this.style.backgroundColor = "#45a049";
        };
        newChatButton.onmouseout = function() {
            this.style.backgroundColor = "#4CAF50";
        };
        
        newChatButton.onclick = () => {
            this._resetConversation();
        };
        
        this.sidebar.appendChild(newChatButton);
        
        // Export Chat Button
        const exportButton = document.createElement("button");
        exportButton.textContent = "Export Chat";
        exportButton.style.padding = "10px 15px";
        exportButton.style.backgroundColor = "#FF9800";
        exportButton.style.color = "white";
        exportButton.style.border = "none";
        exportButton.style.borderRadius = "5px";
        exportButton.style.cursor = "pointer";
        exportButton.style.fontSize = "14px";
        exportButton.style.transition = "background-color 0.3s";
        
        exportButton.onmouseover = function() {
            this.style.backgroundColor = "#F57C00";
        };
        exportButton.onmouseout = function() {
            this.style.backgroundColor = "#FF9800";
        };
        
        exportButton.onclick = () => {
            this._exportChat();
        };
        
        this.sidebar.appendChild(exportButton);
        
        container.appendChild(this.sidebar);
    };

    /**
     * Creates the main chat area
     * @param {HTMLElement} container - Parent container
     * @private
     */
    this._createChatArea = function(container) {
        const chatContainer = document.createElement("div");
        chatContainer.style.flex = "1";
        chatContainer.style.display = "flex";
        chatContainer.style.flexDirection = "column";
        chatContainer.style.height = "100%";
        
        // Chat log area
        this.chatLog = document.createElement("div");
        this.chatLog.className = "chatLog";
        this.chatLog.style.flex = "1";
        this.chatLog.style.overflowY = "auto";
        this.chatLog.style.padding = "15px";
        this.chatLog.style.backgroundColor = "#fafafa";
        this.chatLog.style.display = "flex";
        this.chatLog.style.flexDirection = "column";
        this.chatLog.style.gap = "10px";
        
        chatContainer.appendChild(this.chatLog);
        
        // Input area
        const inputContainer = document.createElement("div");
        inputContainer.style.display = "flex";
        inputContainer.style.padding = "15px";
        inputContainer.style.backgroundColor = "#fff";
        inputContainer.style.borderTop = "1px solid #ddd";
        inputContainer.style.gap = "10px";
        
        // Message input
        this.messageInput = document.createElement("input");
        this.messageInput.type = "text";
        this.messageInput.placeholder = "Type your message here...";
        this.messageInput.style.flex = "1";
        this.messageInput.style.padding = "12px";
        this.messageInput.style.border = "1px solid #ddd";
        this.messageInput.style.borderRadius = "25px";
        this.messageInput.style.fontSize = "14px";
        this.messageInput.style.outline = "none";
        
        // Focus styling
        this.messageInput.onfocus = function() {
            this.style.borderColor = "#2196F3";
            this.style.boxShadow = "0 0 5px rgba(33, 150, 243, 0.3)";
        };
        this.messageInput.onblur = function() {
            this.style.borderColor = "#ddd";
            this.style.boxShadow = "none";
        };
        
        // Send button
        this.sendButton = document.createElement("button");
        this.sendButton.textContent = "Send";
        this.sendButton.style.padding = "12px 20px";
        this.sendButton.style.backgroundColor = "#2196F3";
        this.sendButton.style.color = "white";
        this.sendButton.style.border = "none";
        this.sendButton.style.borderRadius = "25px";
        this.sendButton.style.cursor = "pointer";
        this.sendButton.style.fontSize = "14px";
        this.sendButton.style.fontWeight = "bold";
        this.sendButton.style.transition = "background-color 0.3s";
        
        this.sendButton.onmouseover = function() {
            this.style.backgroundColor = "#1976D2";
        };
        this.sendButton.onmouseout = function() {
            this.style.backgroundColor = "#2196F3";
        };
        
        // Event listeners
        this.sendButton.onclick = () => {
            this._sendMessage();
        };
        
        this.messageInput.onkeypress = (e) => {
            if (e.key === "Enter") {
                this._sendMessage();
            }
        };
        
        inputContainer.appendChild(this.messageInput);
        inputContainer.appendChild(this.sendButton);
        
        chatContainer.appendChild(inputContainer);
        container.appendChild(chatContainer);
    };

    /**
     * Adds welcome message to chat
     * @private
     */
    this._addWelcomeMessage = function() {
        const welcomeMessage = {
            type: "system",
            content: "Welcome to Music Blocks Debugger! I can help you with music composition, Music Blocks programming, and general music theory questions.",
            timestamp: new Date().toISOString()
        };
        
        this._addMessageToUI(welcomeMessage);
    };

    /**
     * Sends a message
     * @private
     */
    this._sendMessage = function() {
        const messageText = this.messageInput.value.trim();
        if (messageText === "") return;
        
        // Create user message object
        const userMessage = {
            type: "user",
            content: messageText,
            timestamp: new Date().toISOString()
        };
        
        // Add to chat history
        this.chatHistory.push(userMessage);
        
        // Add to UI
        this._addMessageToUI(userMessage);
        
        // Clear input
        this.messageInput.value = "";
        
        // Update message count
        this._updateMessageCount();
        
        // Send to backend (placeholder for now)
        this._sendToBackend(messageText);
    };

    /**
     * Adds a message to the UI
     * @param {object} message - Message object
     * @private
     */
    this._addMessageToUI = function(message) {
        const messageDiv = document.createElement("div");
        messageDiv.style.maxWidth = "80%";
        messageDiv.style.padding = "12px 16px";
        messageDiv.style.borderRadius = "18px";
        messageDiv.style.marginBottom = "8px";
        messageDiv.style.wordWrap = "break-word";
        messageDiv.style.fontSize = "14px";
        messageDiv.style.lineHeight = "1.4";
        
        // Add timestamp
        const timeDiv = document.createElement("div");
        timeDiv.style.fontSize = "11px";
        timeDiv.style.opacity = "0.7";
        timeDiv.style.marginTop = "4px";
        timeDiv.textContent = new Date(message.timestamp).toLocaleTimeString();
        
        if (message.type === "user") {
            messageDiv.style.alignSelf = "flex-end";
            messageDiv.style.backgroundColor = "#2196F3";
            messageDiv.style.color = "white";
            messageDiv.textContent = message.content;
            messageDiv.appendChild(timeDiv);
        } else if (message.type === "bot") {
            messageDiv.style.alignSelf = "flex-start";
            messageDiv.style.backgroundColor = "#e0e0e0";
            messageDiv.style.color = "#333";
            messageDiv.textContent = message.content;
            messageDiv.appendChild(timeDiv);
        } else if (message.type === "system") {
            messageDiv.style.alignSelf = "center";
            messageDiv.style.backgroundColor = "#fff3cd";
            messageDiv.style.color = "#856404";
            messageDiv.style.border = "1px solid #ffeaa7";
            messageDiv.style.fontStyle = "italic";
            messageDiv.textContent = message.content;
            messageDiv.appendChild(timeDiv);
        }
        
        this.chatLog.appendChild(messageDiv);
        this.chatLog.scrollTop = this.chatLog.scrollHeight;
    };

    /**
     * Sends message to backend
     * @param {string} message - User message
     * @private
     */
    this._sendToBackend = function(message) {
        // Show typing indicator
        this._showTypingIndicator();
        
        // Increment prompt count
        this.promptCount++;
        
        // Get current project data
        let projectData;
        try {
            const rawProjectData = this.activity.prepareExport();
            // Parse the JSON string to ensure it's valid JSON, then convert back to string
            const parsedData = JSON.parse(rawProjectData);
            projectData = rawProjectData; // Keep as string for backend
            console.log("Project data prepared:", parsedData.length, "blocks");
        } catch (error) {
            console.error("Error getting project data:", error);
            projectData = "[]"; // Fallback to empty project
        }
        
        // Convert chat history to the format expected by your backend
        const history = this.chatHistory
            .filter(msg => msg.type !== "system") // Exclude system messages from history
            .map(msg => ({
                role: msg.type === "user" ? "user" : "assistant",
                content: msg.content
            }));
        
        const payload = {
            code: projectData,
            prompt: message,
            history: history,
            prompt_count: this.promptCount
        };
        
        // DEBUG: Log the payload being sent to backend
        console.log("=== SENDING MESSAGE TO BACKEND ===");
        console.log("Backend URL:", `${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ANALYZE}`);
        console.log("Message payload:");
        console.log("- user message:", message);
        console.log("- code length:", typeof projectData === "string" ? projectData.length : "not a string");
        console.log("- history length:", payload.history.length);
        console.log("- prompt_count:", payload.prompt_count);
        console.log("- First 100 chars of code:", typeof projectData === "string" ? projectData.substring(0, 1000) + "..." : projectData);
        console.log("================================");

        fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ANALYZE}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        })
            .then(response => {
                console.log("=== MESSAGE RESPONSE ===");
                console.log("Status:", response.status, response.statusText);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Response data:", data);
                console.log("======================");
                
                this._hideTypingIndicator();
                
                if (data.response) {
                    const botResponse = {
                        type: "bot",
                        content: data.response,
                        timestamp: new Date().toISOString()
                    };
                    
                    this.chatHistory.push(botResponse);
                    this._addMessageToUI(botResponse);
                    this._updateMessageCount();
                } else {
                    throw new Error("No response from backend");
                }
            })
            .catch(error => {
                this._hideTypingIndicator();
                console.error("=== MESSAGE ERROR ===");
                console.error("Error type:", error.constructor.name);
                console.error("Error message:", error.message);
                console.error("Full error:", error);
                console.error("==================");
                
                // Check if it's a network error
                if (error instanceof TypeError && error.message.includes("fetch")) {
                    console.error("This looks like a network/CORS error. Make sure your backend is running on port 8000");
                }
                
                // Fallback response when backend fails
                const fallbackResponse = {
                    type: "bot",
                    content: `I'm sorry, I'm having trouble connecting to the AI backend. Error: ${error.message}. Please check your connection and try again.`,
                    timestamp: new Date().toISOString()
                };
                
                this.chatHistory.push(fallbackResponse);
                this._addMessageToUI(fallbackResponse);
                this._updateMessageCount();
            });
    };

    /**
     * Shows typing indicator
     * @private
     */
    this._showTypingIndicator = function() {
        const typingDiv = document.createElement("div");
        typingDiv.className = "typing-indicator";
        typingDiv.style.alignSelf = "flex-start";
        typingDiv.style.backgroundColor = "#e0e0e0";
        typingDiv.style.color = "#666";
        typingDiv.style.padding = "12px 16px";
        typingDiv.style.borderRadius = "18px";
        typingDiv.style.marginBottom = "8px";
        typingDiv.style.fontSize = "14px";
        typingDiv.style.fontStyle = "italic";
        typingDiv.textContent = "Debugger is typing...";
        
        // Add animation
        let dots = 0;
        const animateTyping = setInterval(() => {
            dots = (dots + 1) % 4;
            typingDiv.textContent = "Debugger is typing" + ".".repeat(dots);
        }, 500);
        
        typingDiv.setAttribute("data-animation-id", animateTyping);
        
        this.chatLog.appendChild(typingDiv);
        this.chatLog.scrollTop = this.chatLog.scrollHeight;
    };

    /**
     * Hides typing indicator
     * @private
     */
    this._hideTypingIndicator = function() {
        const typingIndicator = this.chatLog.querySelector(".typing-indicator");
        if (typingIndicator) {
            const animationId = typingIndicator.getAttribute("data-animation-id");
            if (animationId) {
                clearInterval(parseInt(animationId));
            }
            typingIndicator.remove();
        }
    };

    /**
     * Updates message count in sidebar (now removed, kept for compatibility)
     * @private
     */
    this._updateMessageCount = function() {
        // Message count display removed from sidebar
        // This method is kept for compatibility with existing calls
    };

    /**
     * Loads current project data and initializes conversation with backend
     * @private
     */
    this._loadProjectAndInitialize = function() {
        try {
            // Get current project data as JSON
            const projectData = this.activity.prepareExport();
            
            // DEBUG: Log the project data to console
            console.log("=== MUSIC BLOCKS PROJECT DATA ===");
            console.log("Raw project data (first 500 chars):", projectData.substring(0, 5000) + "...");
            
            try {
                const parsedData = JSON.parse(projectData);
                console.log("Parsed project data:");
                console.log("- Number of blocks:", parsedData.length);
                console.log("- Sample block data:", parsedData.slice(0, 3)); // Show first 3 blocks
                console.log("- Full JSON data:", parsedData);
            } catch (parseError) {
                console.error("Error parsing project data:", parseError);
                console.log("Raw data that failed to parse:", projectData);
            }
            console.log("==================================");
            
            // Show loading message
            const loadingMessage = {
                type: "system",
                content: "Loading your current project and initializing AI assistant...",
                timestamp: new Date().toISOString()
            };
            this._addMessageToUI(loadingMessage);
            
            // Send project data to backend for initialization
            this._initializeBackendWithProject(projectData);
            
        } catch (error) {
            console.error("Error loading project data:", error);
            
            // Show error message and fall back to simple welcome
            const errorMessage = {
                type: "system",
                content: "Could not load project data. Starting with basic assistant...",
                timestamp: new Date().toISOString()
            };
            this._addMessageToUI(errorMessage);
            
            // Fallback to simple welcome
            this._addWelcomeMessage();
        }
    };

    /**
     * Initializes backend with current project data
     * @param {string} projectData - JSON string of current project
     * @private
     */
    this._initializeBackendWithProject = function(projectData) {
        // Convert chat history to the format expected by your backend
        const history = this.chatHistory.map(msg => ({
            role: msg.type === "user" ? "user" : "assistant",
            content: msg.content
        }));
        
        const initPayload = {
            code: projectData,
            prompt: "", // Empty prompt for initial analysis
            history: history,
            prompt_count: 1
        };
        
        // DEBUG: Log the payload being sent to backend
        console.log("=== SENDING TO BACKEND ===");
        console.log("Backend URL:", `${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ANALYZE}`);
        console.log("Payload structure:");
        console.log("- code length:", typeof projectData === "string" ? projectData.length : "not a string");
        console.log("- prompt:", initPayload.prompt);
        console.log("- history length:", initPayload.history.length);
        console.log("- prompt_count:", initPayload.prompt_count);
        console.log("- First 200 chars of code:", typeof projectData === "string" ? projectData.substring(0, 200) + "..." : projectData);
        console.log("========================");
        
        // Show typing indicator during initialization
        this._showTypingIndicator();

        fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ANALYZE}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(initPayload)
        })
            .then(response => {
                console.log("=== BACKEND RESPONSE ===");
                console.log("Status:", response.status, response.statusText);
                console.log("Headers:", response.headers);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Response data:", data);
                console.log("=====================");
                
                this._hideTypingIndicator();
                
                if (data.response) {
                    // Add the backend's initial response
                    const botResponse = {
                        type: "bot",
                        content: data.response,
                        timestamp: new Date().toISOString()
                    };
                    
                    this.chatHistory.push(botResponse);
                    this._addMessageToUI(botResponse);
                    this._updateMessageCount();
                    this.promptCount = 1; // Set initial prompt count
                } else {
                    throw new Error("No response from backend");
                }
            })
            .catch(error => {
                this._hideTypingIndicator();
                console.error("=== BACKEND ERROR ===");
                console.error("Error type:", error.constructor.name);
                console.error("Error message:", error.message);
                console.error("Full error:", error);
                console.error("===================");
                
                // Check if it's a network error
                if (error instanceof TypeError && error.message.includes("fetch")) {
                    console.error("This looks like a network/CORS error. Make sure your backend is running on port 8000");
                }
                
                // Remove loading message and show error
                const errorMessage = {
                    type: "system",
                    content: `Could not connect to AI backend: ${error.message}. Check console for details. Make sure backend is running on http://localhost:8000`,
                    timestamp: new Date().toISOString()
                };
                this._addMessageToUI(errorMessage);
                
                // Add basic welcome message as fallback
                this._addWelcomeMessage();
            });
    };

    /**
     * Resets the conversation and initializes with project data
     * @private
     */
    this._resetConversation = function() {
        this.chatHistory = [];
        this.promptCount = 0; // Reset prompt count
        this.conversationId = this._generateConversationId();
        this.chatLog.innerHTML = "";
        
        // Load current project data and send to backend
        this._loadProjectAndInitialize();
        
        this._updateMessageCount();
        
        this.activity.textMsg(_("Conversation reset"));
    };

    /**
     * Exports the chat conversation as a text file
     * @private
     */
    this._exportChat = function() {
        if (this.chatHistory.length === 0) {
            this.activity.textMsg(_("No conversation to export"));
            return;
        }
        
        // Get current project data for export
        let projectData = "";
        try {
            projectData = this.activity.prepareExport();
        } catch (error) {
            console.error("Error getting project data for export:", error);
            projectData = "Could not retrieve project data";
        }
        
        // Create export content matching Streamlit format
        let exportContent = "Music Blocks Debugger Chat Export\n";
        exportContent += "Generated at: " + new Date().toLocaleString() + "\n\n";
        exportContent += "Project Code:\n";
        exportContent += projectData + "\n\n";
        exportContent += "Chat History:\n\n";
        
        // Add each message in Streamlit format
        this.chatHistory.forEach((message) => {
            const role = message.type === "user" ? "You" : "Music Blocks Bot";
            exportContent += role + ":\n";
            exportContent += message.content + "\n\n";
        });
        
        // Create and download file
        const blob = new Blob([exportContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "music_blocks_chat_" + new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] + "_" + new Date().toTimeString().split(" ")[0].replace(/:/g, "") + ".txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.activity.textMsg(_("Chat exported successfully"));
    };

    /**
     * Clears the chat display
     * @private
     */
    this._clearChat = function() {
        this.chatLog.innerHTML = "";
        this.activity.textMsg(_("Chat cleared"));
    };

    /**
     * Scales the widget window
     * @private
     */
    this._scale = function() {
        if (this.widgetWindow.isMaximized()) {
            const body = this.widgetWindow.getWidgetBody();
            body.style.width = "100%";
            body.style.height = "100%";
        } else {
            const body = this.widgetWindow.getWidgetBody();
            body.style.width = CHATWIDTH + "px";
            body.style.height = CHATHEIGHT + "px";
        }
    };
}
