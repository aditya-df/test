(function () {
  // Configuration options - can be customized when initializing
  const defaultConfig = {
    buttonText: "Chat with Us",
    greeting: "Hello! How can we assist you today?",
    position: "right", // right or left
    primaryColor: "#4936f5",
    secondaryColor: "#3e2ad8",
    allowedPaths: [], // Empty array means all paths are allowed
    excludedPaths: ['/dashboard', '/chatbot'], // Paths to exclude
    autoShowGreeting: true, // Whether to auto-show greeting on hover
    greetingDelay: 1000, // Delay before showing greeting (ms)
    zIndex: 999999999,
    mobileBreakpoint: 768, // Mobile breakpoint in pixels
    mobilePosition: "bottom", // bottom or top
    chatFrameWidth: 420, // Increased default width
    chatFrameHeight: 600, // Increased default height
    showOnMobile: true,
    buttonSize: "medium", // small, medium, large
    borderRadius: "12px", // Border radius for chat frame
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)", // Shadow for chat frame
    
    // Avatar configuration
    buttonStyle: "text-icon", // "text-only", "icon-only", or "text-icon"
    avatarUrl: "https://REPLACE_DOMAIN/support-avatar.jpg", // URL to avatar image (if empty, will use default icon)
    avatarSize: 36, // Size of avatar in pixels
    greetingAvatar: "https://REPLACE_DOMAIN/support-avatar.jpg", // URL to avatar image in greeting bubble
    greetingAvatarSize: 24, // Size of avatar in greeting bubble
    
    // Animation configuration
    animationStyle: "fade-slide-up", // "fade", "slide", "bounce", "fade-slide-up"
    animationDuration: 0.6, // seconds
    animationDelay: 0.2, // seconds
    
    // Draggable configuration
    draggable: true, // Whether the widget can be dragged
    snapToSides: true, // Whether to snap to left or right sides
    snapThreshold: 100, // Distance from edge to snap (in pixels)
    rememberPosition: true // Remember position between page loads
  };

  // Create style tag with configurable options
  const createStyleTag = (config) => {
    return `
      <style>
        #chat-widget {
          position: fixed;
          ${config.position === "right" ? "right: 20px;" : "left: 20px;"}
          bottom: 20px;
          display: flex;
          flex-direction: column;
          align-items: ${config.position === "right" ? "flex-end" : "flex-start"};
          z-index: ${config.zIndex} !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          transition: all 0.3s ease;
          background: transparent;
          opacity: 0;
          transform: translateY(20px);
          animation: chatWidgetFadeIn ${config.animationDuration}s ease-out ${config.animationDelay}s forwards;
          ${config.draggable ? "cursor: move;" : ""}
        }
        
        /* Widget entrance animations */
        @keyframes chatWidgetFadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          60% {
            opacity: 1;
            transform: translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Improved thermometer-style button */
        #btn-trigger-chat {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: none;
          background: transparent;
          padding: 0;
          position: relative;
          height: ${config.buttonSize === "small" ? "40" : config.buttonSize === "large" ? "60" : "50"}px;
          overflow: visible;
          animation: buttonPulse 2s infinite ease-in-out;
          animation-delay: ${config.animationDuration + config.animationDelay + 0.3}s;
        }
        
        @keyframes buttonPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
        
        #btn-trigger-chat:hover {
          transform: translateY(-2px);
          animation-play-state: paused;
        }
        
        /* Button container to ensure proper layout */
        .chat-button-container {
          display: flex;
          align-items: center;
          height: 100%;
          background: transparent;
        }
        
        /* Avatar circle */
        .chat-avatar-container {
          width: ${config.buttonSize === "small" ? "40" : config.buttonSize === "large" ? "60" : "50"}px;
          height: ${config.buttonSize === "small" ? "40" : config.buttonSize === "large" ? "60" : "50"}px;
          border-radius: 50%;
          background-color: ${config.primaryColor};
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
          flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
          transition: all 0.3s ease;
        }
        
        /* Text pill - seamlessly connected to avatar */
        .chat-text-container {
          height: ${config.buttonSize === "small" ? "32" : config.buttonSize === "large" ? "44" : "38"}px;
          background-color: ${config.primaryColor};
          border-radius: 0 ${config.buttonSize === "small" ? "16" : config.buttonSize === "large" ? "22" : "19"}px ${config.buttonSize === "small" ? "16" : config.buttonSize === "large" ? "22" : "19"}px 0;
          display: ${config.buttonStyle === "icon-only" ? "none" : "flex"};
          align-items: center;
          padding-right: ${config.buttonSize === "small" ? "16" : config.buttonSize === "large" ? "24" : "20"}px;
          color: white;
          font-size: ${config.buttonSize === "small" ? "13" : config.buttonSize === "large" ? "16" : "14"}px;
          font-weight: 500;
          margin-left: -${config.buttonSize === "small" ? "20" : config.buttonSize === "large" ? "30" : "25"}px;
          padding-left: ${config.buttonSize === "small" ? "24" : config.buttonSize === "large" ? "36" : "30"}px;
          position: relative;
          z-index: 1;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          transition: all 0.3s ease;
          animation: textSlideIn 0.5s ease-out;
          animation-delay: ${config.animationDuration + config.animationDelay + 0.1}s;
          animation-fill-mode: backwards;
        }
        
        @keyframes textSlideIn {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        /* Avatar/icon styling */
        .chat-icon {
          width: ${config.buttonSize === "small" ? "24" : config.buttonSize === "large" ? "36" : "30"}px;
          height: ${config.buttonSize === "small" ? "24" : config.buttonSize === "large" ? "36" : "30"}px;
          ${config.avatarUrl ? "border-radius: 50%; object-fit: cover;" : "color: white;"}
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Ensure SVG icons are white */
        .chat-icon svg {
          color: white;
          stroke: white;
        }
        
        /* Greeting bubble */
        .chat-greeting {
          background-color: white;
          padding: 12px 18px;
          border-radius: 18px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          margin-bottom: 12px;
          font-size: 14px;
          max-width: 280px;
          display: none;
          animation: fadeIn 0.3s ease;
          border-bottom-${config.position === "right" ? "right" : "left"}-radius: 4px;
          line-height: 1.5;
          color: #333;
        }
        
        /* Improved greeting header with avatar */
        .greeting-header {
          display: ${config.greetingAvatar ? "flex" : "none"};
          align-items: center;
          margin-bottom: 8px;
          background: transparent;
        }
        
        .greeting-avatar-container {
          width: ${config.greetingAvatarSize}px;
          height: ${config.greetingAvatarSize}px;
          border-radius: 50%;
          overflow: hidden;
          margin-right: 8px;
          background-color: ${config.primaryColor};
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .greeting-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .greeting-title {
          font-weight: 600;
          font-size: 14px;
          background: transparent;
        }
        
        /* Chat frame - positioned above the button */
        #chat-frame-widget {
          border-radius: ${config.borderRadius};
          box-shadow: ${config.boxShadow};
          transition: opacity 0.4s ease, transform 0.4s ease;
          transform: translateY(20px);
          opacity: 0;
          pointer-events: none;
          width: ${config.chatFrameWidth}px;
          height: ${config.chatFrameHeight}px;
          background-color: transparent;
          border: none;
          position: absolute;
          bottom: 70px; /* Position above the button */
          ${config.position === "right" ? "right: 0;" : "left: 0;"}
          display: block;
        }
        
        #chat-frame-widget.visible {
          transform: translateY(0);
          opacity: 1;
          pointer-events: all;
          animation: frameFadeIn 0.4s ease-out;
        }
        
        @keyframes frameFadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Drag handle indicator */
        .drag-handle {
          position: absolute;
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 6px;
          background-color: rgba(0,0,0,0.1);
          border-radius: 3px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        #chat-widget:hover .drag-handle {
          opacity: 1;
        }
        
        /* Mobile styles */
        @media (max-width: ${config.mobileBreakpoint}px) {
          #chat-widget {
            ${config.mobilePosition === "bottom" ? "bottom: 10px;" : "top: 10px;"}
            ${config.position === "right" ? "right: 10px;" : "left: 10px;"}
            ${!config.showOnMobile ? "display: none;" : ""}
          }
          
          #chat-frame-widget {
            width: calc(100vw - 20px) !important;
            bottom: 70px !important;
            ${config.position === "right" ? "right: 0 !important;" : "left: 0 !important;"}
            max-width: 100vw;
            height: ${Math.min(config.chatFrameHeight, window.innerHeight - 100)}px !important;
          }
          
          .chat-text-container {
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .chat-greeting {
            font-size: 13px;
            padding: 10px 14px;
            max-width: 250px;
          }
        }
      </style>
    `;
  };

  // Create components with configurable options
  const createComponents = (config) => {
    // Determine what icon to use (custom avatar or default icon)
    const iconElement = config.avatarUrl 
      ? `<img src="${config.avatarUrl}" alt="Chat" class="chat-icon" />`
      : `<svg xmlns="http://www.w3.org/2000/svg" class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path></svg>`;
    
    // Determine close icon (always use the X icon) - explicitly set stroke to white
    const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>`;
    
    // Create greeting with optional avatar
    const greetingHeader = config.greetingAvatar 
      ? `<div class="greeting-header">
           <div class="greeting-avatar-container">
             <img src="${config.greetingAvatar}" alt="Support" class="greeting-avatar" />
           </div>
           <div class="greeting-title">Support Team</div>
         </div>`
      : '';
    
    return {
      icon: iconElement,
      closeIcon: closeIcon,
      greeting: `<div id="chat-greeting" class="chat-greeting">
                   ${greetingHeader}
                   ${config.greeting}
                 </div>`,
      button_text: config.buttonStyle === "icon-only" ? "" : config.buttonText
    };
  };



  // Initialize the chat interface
  async function initChatInterface(sessionToken, userConfig = {}) {
    // Merge default config with user config
    const config = { ...defaultConfig, ...userConfig };
    
    // Check if the current path should be excluded
    const currentPath = window.location.pathname;
    
    // If allowedPaths is specified and not empty, check if current path is allowed
    if (config.allowedPaths.length > 0) {
      const isAllowed = config.allowedPaths.some(path => 
        currentPath === path || currentPath.startsWith(path)
      );
      
      if (!isAllowed) {
        console.log(`Chat widget not shown: current path ${currentPath} is not in allowed paths`);
        return;
      }
    }
    
    // Check if current path is excluded
    const isExcluded = config.excludedPaths.some(path => 
      currentPath === path || currentPath.startsWith(path)
    );
    
    if (isExcluded) {
      console.log(`Chat widget not shown: current path ${currentPath} is excluded`);
      return;
    }

    // Validate session token
    if (!sessionToken) {
      console.error('Session token is required. Chat widget will not be initialized.');
      return;
    }
    
    console.log('Using provided session token');

    // Create style and components
    const styleTag = createStyleTag(config);
    const components = createComponents(config);

    // Create the chat widget using session token
    const chatWidget = document.createElement("div");
    chatWidget.id = "chat-widget";
    chatWidget.innerHTML = `
      ${config.draggable ? '<div class="drag-handle"></div>' : ''}
      ${components.greeting}
      <iframe 
        id="chat-frame-widget" 
        src="https://REPLACE_DOMAIN/chat?token=${sessionToken}" 
      ></iframe>
      <button id="btn-trigger-chat">
        <div class="chat-button-container">
          <div class="chat-avatar-container">
            ${components.icon}
          </div>
          ${config.buttonStyle !== "icon-only" ? 
            `<div class="chat-text-container">${components.button_text}</div>` : 
            ''}
        </div>
      </button>
    `;

    // Add style and widget to the page
    document.head.insertAdjacentHTML("beforeend", styleTag);
    document.body.appendChild(chatWidget);

    // Get elements
    const btn = document.getElementById("btn-trigger-chat");
    const frameWidget = document.getElementById("chat-frame-widget");
    const greeting = document.getElementById("chat-greeting");
    
    // Initialize state
    let greetingTimeout;
    let isFrameVisible = false;

    // Show/hide greeting with delay
    if (config.autoShowGreeting) {
      btn.addEventListener("mouseover", () => {
        if (!isFrameVisible) {
          greetingTimeout = setTimeout(() => {
            greeting.style.display = "block";
          }, config.greetingDelay);
        }
      });

      btn.addEventListener("mouseout", () => {
        clearTimeout(greetingTimeout);
        greeting.style.display = "none";
      });
    }

    // Toggle chat frame
    btn.addEventListener("click", () => {
      isFrameVisible = !isFrameVisible;
      
      if (isFrameVisible) {
        // When opening chat, show close icon and text if applicable
        const avatarContainer = btn.querySelector('.chat-avatar-container');
        if (avatarContainer) {
          avatarContainer.innerHTML = components.closeIcon;
        }
        
        if (config.buttonStyle !== "icon-only") {
          const textContainer = btn.querySelector('.chat-text-container');
          if (textContainer) {
            textContainer.innerHTML = "Close Chat";
          }
        }
        
        frameWidget.classList.add('visible');
        greeting.style.display = "none";
        
        // Stop the pulse animation when chat is open
        btn.style.animationPlayState = 'paused';
      } else {
        // When closing chat, restore original button content
        const avatarContainer = btn.querySelector('.chat-avatar-container');
        if (avatarContainer) {
          avatarContainer.innerHTML = components.icon;
        }
        
        if (config.buttonStyle !== "icon-only") {
          const textContainer = btn.querySelector('.chat-text-container');
          if (textContainer) {
            textContainer.innerHTML = components.button_text;
          }
        }
        
        frameWidget.classList.remove('visible');
        
        // Resume the pulse animation when chat is closed
        btn.style.animationPlayState = 'running';
      }
    });
    
    // Auto-show greeting after a delay
    setTimeout(() => {
      if (!isFrameVisible) {
        greeting.style.display = "block";
        
        // Auto-hide greeting after 5 seconds
        setTimeout(() => {
          if (!isFrameVisible) {
            greeting.style.display = "none";
          }
        }, 5000);
      }
    }, (config.animationDuration + config.animationDelay + 1) * 1000);

    // Make the widget draggable if enabled
    if (config.draggable) {
      makeDraggable(chatWidget, config);
    }
  }

  // Make an element draggable
  function makeDraggable(element, config) {
    let isDragging = false;
    let startX, startLeft, startRight;
    let currentPosition = config.position;
    
    // Try to load saved position from localStorage
    if (config.rememberPosition) {
      const savedPosition = localStorage.getItem('chatWidgetPosition');
      if (savedPosition) {
        try {
          const posData = JSON.parse(savedPosition);
          if (posData.position === 'left') {
            element.style.left = posData.value + 'px';
            element.style.right = 'auto';
            currentPosition = 'left';
          } else {
            element.style.right = posData.value + 'px';
            element.style.left = 'auto';
            currentPosition = 'right';
          }
        } catch (e) {
          console.error('Error parsing saved position:', e);
        }
      }
    }
    
    // Mouse events for desktop
    element.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Touch events for mobile
    element.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
    
    function startDrag(e) {
      // Prevent dragging when clicking the button or when chat is open
      if (e.target.closest('#btn-trigger-chat') || 
          document.getElementById('chat-frame-widget').classList.contains('visible')) {
        return;
      }
      
      e.preventDefault();
      
      // Get event position (works for both mouse and touch)
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      
      isDragging = true;
      element.style.transition = 'none'; // Disable transitions while dragging
      
      // Store initial positions
      startX = clientX;
      
      const rect = element.getBoundingClientRect();
      
      if (currentPosition === 'left') {
        startLeft = rect.left;
      } else {
        startRight = window.innerWidth - rect.right;
      }
      
      // Add a dragging class for visual feedback
      element.classList.add('dragging');
    }
    
    function drag(e) {
      if (!isDragging) return;
      
      e.preventDefault();
      
      // Get event position (works for both mouse and touch)
           const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      
      // Calculate the new position - horizontal movement only
      const deltaX = clientX - startX;
      
      // Update position based on current side
      if (currentPosition === 'left') {
        const newLeft = Math.max(10, startLeft + deltaX);
        element.style.left = newLeft + 'px';
        element.style.right = 'auto';
        
        // Check if we should snap to the right side
        if (config.snapToSides && newLeft > window.innerWidth - config.snapThreshold) {
          currentPosition = 'right';
          element.style.right = '20px';
          element.style.left = 'auto';
          element.style.alignItems = 'flex-end';
        }
      } else {
        const newRight = Math.max(10, startRight - deltaX);
        element.style.right = newRight + 'px';
        element.style.left = 'auto';
        
        // Check if we should snap to the left side
        if (config.snapToSides && newRight > window.innerWidth - config.snapThreshold) {
          currentPosition = 'left';
          element.style.left = '20px';
          element.style.right = 'auto';
          element.style.alignItems = 'flex-start';
        }
      }
      
      // Update the iframe position to match the widget
      updateFramePosition();
    }
    
    function endDrag() {
      if (!isDragging) return;
      
      isDragging = false;
      element.style.transition = 'all 0.3s ease'; // Re-enable transitions
      element.classList.remove('dragging');
      
      // Snap to edges if enabled and close enough
      if (config.snapToSides) {
        const rect = element.getBoundingClientRect();
        
        if (currentPosition === 'left') {
          if (rect.left < config.snapThreshold) {
            element.style.left = '20px';
          }
        } else {
          if (rect.right > window.innerWidth - config.snapThreshold) {
            element.style.right = '20px';
          }
        }
      }
      
      // Update the iframe position after snapping
      updateFramePosition();
      
      // Save position to localStorage if enabled
      if (config.rememberPosition) {
        const rect = element.getBoundingClientRect();
        let positionData;
        
        if (currentPosition === 'left') {
          positionData = {
            position: 'left',
            value: rect.left
          };
        } else {
          positionData = {
            position: 'right',
            value: window.innerWidth - rect.right
          };
        }
        
        localStorage.setItem('chatWidgetPosition', JSON.stringify(positionData));
      }
    }
    
    function updateFramePosition() {
      const frameWidget = document.getElementById('chat-frame-widget');
      if (!frameWidget) return;
      
      // Update the iframe's position to match the widget's horizontal position
      if (currentPosition === 'left') {
        frameWidget.style.left = '0';
        frameWidget.style.right = 'auto';
      } else {
        frameWidget.style.right = '0';
        frameWidget.style.left = 'auto';
      }
    }
  }

  // Handle route changes for SPAs
  function handleRouteChange() {
    const chatWidget = document.getElementById("chat-widget");
    if (!chatWidget) return;

    // Get current config from window object
    const config = window.ChatWidgetConfig || defaultConfig;
    
    const currentPath = window.location.pathname;
    
    // Check if current path is excluded
    const isExcluded = config.excludedPaths.some(path => 
      currentPath === path || currentPath.startsWith(path)
    );
    
    // Check if current path is allowed (if allowedPaths is specified)
    let isAllowed = true;
    if (config.allowedPaths.length > 0) {
      isAllowed = config.allowedPaths.some(path => 
        currentPath === path || currentPath.startsWith(path)
      );
    }
    
    // Show or hide based on path rules
    if (isExcluded || !isAllowed) {
      chatWidget.style.display = "none";
    } else {
      chatWidget.style.display = "flex";
    }
  }

  // Listen for route changes in single page applications
  if (typeof window !== 'undefined') {
    // Use MutationObserver to detect when URL changes in SPAs
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList" && mutation.addedNodes.length) {
          handleRouteChange();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also listen for popstate and pushstate events
    window.addEventListener('popstate', handleRouteChange);

    // Intercept history.pushState and history.replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function () {
      originalPushState.apply(this, arguments);
      handleRouteChange();
    };

    history.replaceState = function () {
      originalReplaceState.apply(this, arguments);
      handleRouteChange();
    };
  }

  // Expose the ChatWidget to the window
  window.ChatWidget = {
    init: async function(sessionToken, config = {}) {
      // Store config for route change handler
      window.ChatWidgetConfig = { ...defaultConfig, ...config };
      await initChatInterface(sessionToken, window.ChatWidgetConfig);
      
      // Initial check for current route
      setTimeout(handleRouteChange, 0);
    },
    show: function() {
      const chatWidget = document.getElementById("chat-widget");
      if (chatWidget) chatWidget.style.display = "flex";
    },
    hide: function() {
      const chatWidget = document.getElementById("chat-widget");
      if (chatWidget) chatWidget.style.display = "none";
    },
    openChat: function() {
      const btn = document.getElementById("btn-trigger-chat");
      const frameWidget = document.getElementById("chat-frame-widget");
      const greeting = document.getElementById("chat-greeting");
      const config = window.ChatWidgetConfig || defaultConfig;
      const components = createComponents(config);
      
      if (btn && frameWidget) {
        // Set button to close state
        const avatarContainer = btn.querySelector('.chat-avatar-container');
        if (avatarContainer) {
          avatarContainer.innerHTML = components.closeIcon;
        }
        
        if (config.buttonStyle !== "icon-only") {
          const textContainer = btn.querySelector('.chat-text-container');
          if (textContainer) {
            textContainer.innerHTML = "Close Chat";
          }
        }
        
        frameWidget.classList.add('visible');
        if (greeting) greeting.style.display = "none";
        
        // Stop the pulse animation when chat is open
        btn.style.animationPlayState = 'paused';
      }
    },
    closeChat: function() {
      const btn = document.getElementById("btn-trigger-chat");
      const frameWidget = document.getElementById("chat-frame-widget");
      const config = window.ChatWidgetConfig || defaultConfig;
      const components = createComponents(config);
      
      if (btn && frameWidget) {
        // Restore original button content
        const avatarContainer = btn.querySelector('.chat-avatar-container');
        if (avatarContainer) {
          avatarContainer.innerHTML = components.icon;
        }
        
        if (config.buttonStyle !== "icon-only") {
          const textContainer = btn.querySelector('.chat-text-container');
          if (textContainer) {
            textContainer.innerHTML = components.button_text;
          }
        }
        
        frameWidget.classList.remove('visible');
        
        // Resume the pulse animation when chat is closed
        btn.style.animationPlayState = 'running';
      }
    },
    // New method to trigger greeting bubble
    showGreeting: function() {
      const greeting = document.getElementById("chat-greeting");
      if (greeting) {
        greeting.style.display = "block";
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          greeting.style.display = "none";
        }, 5000);
      }
    },
    // New method to reset widget position
    resetPosition: function() {
      const chatWidget = document.getElementById("chat-widget");
      const frameWidget = document.getElementById("chat-frame-widget");
      const config = window.ChatWidgetConfig || defaultConfig;
      
      if (chatWidget) {
        // Reset to default position
        if (config.position === "right") {
          chatWidget.style.right = "20px";
          chatWidget.style.left = "auto";
          chatWidget.style.alignItems = "flex-end";
          
          if (frameWidget) {
            frameWidget.style.right = "0";
            frameWidget.style.left = "auto";
          }
        } else {
          chatWidget.style.left = "20px";
          chatWidget.style.right = "auto";
          chatWidget.style.alignItems = "flex-start";
          
          if (frameWidget) {
            frameWidget.style.left = "0";
            frameWidget.style.right = "auto";
          }
        }
        
        // Clear saved position
        if (config.rememberPosition) {
          localStorage.removeItem('chatWidgetPosition');
        }
      }
    }
  };
})();

