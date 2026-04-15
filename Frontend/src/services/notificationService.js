import axios from 'axios';

class NotificationService {
  constructor() {
    this.audio = null;
    this.checkInterval = null;
    this.isEnabled = localStorage.getItem('callNotifications') !== 'false'; // Default enabled
    this.lastCheckedTime = null;
    this.activeNotifications = new Set();
    this.dismissedNotifications = new Set(JSON.parse(localStorage.getItem('dismissedCallNotifications') || '[]'));
    this.isInitialized = false; // Prevent multiple initialization
  }

  // Initialize the service
  init() {
    // Prevent multiple initialization
    if (this.isInitialized) {
      console.log('🔄 NotificationService already initialized, skipping...');
      return;
    }

    console.log('🔔 Initializing NotificationService...', {
      isEnabled: this.isEnabled,
      dismissedCount: this.dismissedNotifications.size
    });

    // Preload the audio file
    try {
      this.audio = new Audio('/schdule_call_notification.mp3');
      this.audio.preload = 'auto';
      this.audio.loop = true; // Loop until stopped
      console.log('🔊 Audio file loaded successfully');
    } catch (error) {
      console.warn('Could not load notification sound:', error);
    }

    // Add global click handler to stop sound when clicking anywhere
    this.addGlobalClickHandler();

    // Add keyboard handler for Escape key
    this.addKeyboardHandler();

    // Start checking for upcoming calls every 30 seconds
    this.startChecking();
    
    this.isInitialized = true;
    console.log('✅ NotificationService initialized successfully');
  }

  // Add global click handler to stop notification sound
  addGlobalClickHandler() {
    if (this.globalClickHandler) {
      document.removeEventListener('click', this.globalClickHandler);
    }
    
    this.globalClickHandler = () => {
      // If there are active notifications and user clicks anywhere, stop the sound
      if (this.activeNotifications.size > 0) {
        console.log('Global click detected - stopping notification sound');
        this.stopSound();
        
        // For user panels, also remove notifications completely so they don't show again
        const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
        const isAdmin = user.Role === 'Admin';
        
        if (!isAdmin) {
          // Remove all visible notifications for users and mark them as dismissed
          this.activeNotifications.forEach(callId => {
            // Add to dismissed notifications permanently
            this.dismissedNotifications.add(callId);
            
            const notification = document.getElementById(`notification-${callId}`);
            if (notification) {
              notification.style.animation = 'slideOut 0.3s ease-in';
              setTimeout(() => {
                if (notification.parentNode) {
                  notification.parentNode.removeChild(notification);
                }
              }, 300);
            }
          });
          
          // Save dismissed notifications to localStorage
          localStorage.setItem('dismissedCallNotifications', JSON.stringify([...this.dismissedNotifications]));
          
          // Clear active notifications so they don't trigger again
          this.activeNotifications.clear();
          
          console.log('User panel: All notifications dismissed permanently');
        }
      }
    };
    
    document.addEventListener('click', this.globalClickHandler);
  }

  // Add keyboard handler for Escape key
  addKeyboardHandler() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }
    
    this.keyboardHandler = (e) => {
      // If Escape key is pressed and there are active notifications, stop them
      if (e.key === 'Escape' && this.activeNotifications.size > 0) {
        console.log('Escape key pressed - stopping notification sound');
        this.stopSound();
        
        // Get user role to determine behavior
        const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
        const isAdmin = user.Role === 'Admin';
        
        // Remove all visible notifications
        this.activeNotifications.forEach(callId => {
          // For user panels, add to dismissed notifications permanently
          if (!isAdmin) {
            this.dismissedNotifications.add(callId);
          }
          
          const notification = document.getElementById(`notification-${callId}`);
          if (notification) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 300);
          }
        });
        
        // Save dismissed notifications for user panels
        if (!isAdmin) {
          localStorage.setItem('dismissedCallNotifications', JSON.stringify([...this.dismissedNotifications]));
          console.log('User panel: Escape key dismissed all notifications permanently');
        }
        
        this.activeNotifications.clear();
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
  }

  // Start the periodic check for calls
  startChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkUpcomingCalls();
    }, 30000); // Check every 30 seconds

    // Also check immediately
    this.checkUpcomingCalls();
  }

  // Stop the periodic checking
  stopChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Check for calls that should trigger notifications
  async checkUpcomingCalls() {
    if (!this.isEnabled) {
      return;
    }

    try {
      // Get token from localStorage (try different keys)
      let token = localStorage.getItem('token');
      let user = null;
      
      if (!token) {
        try {
          user = JSON.parse(localStorage.getItem('crm_user') || '{}');
          token = user.token;
        } catch (e) {
          console.warn('Error parsing crm_user from localStorage:', e);
        }
      }
      
      if (!token) {
        console.warn('No token found for notifications', {
          localStorage_token: localStorage.getItem('token'),
          crm_user: localStorage.getItem('crm_user')
        });
        return;
      }
      
      console.log('Found token for notifications:', { hasToken: !!token, tokenLength: token?.length });

      if (!user) {
        console.warn('⚠️ No user found in localStorage');
        return;
      }

      // Use already parsed user or parse again if needed
      if (!user) {
        try {
          user = JSON.parse(localStorage.getItem('crm_user') || '{}');
        } catch (e) {
          console.warn('Error parsing user for role detection:', e);
          user = {};
        }
      }
      const isAdmin = user.Role === 'Admin';
      
      // Admin gets all schedules, users get their own schedules
      const endpoint = isAdmin ? 
        'http://localhost:3000/api/call-schedules' : 
        'http://localhost:3000/api/call-schedules/my-schedules';

      console.log('Checking notifications...', { 
        isAdmin, 
        endpoint, 
        time: new Date().toLocaleTimeString(),
        userRole: user.Role,
        userId: user._id
      });

      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('API response received:', { 
        status: response.status, 
        dataType: typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'not array'
      });

      const schedules = response.data;
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      console.log('🕐 Current time check:', { 
        currentTime, 
        today, 
        schedulesCount: schedules.length,
        dismissedCount: this.dismissedNotifications.size,
        dismissedIds: [...this.dismissedNotifications],
        isEnabled: this.isEnabled,
        activeNotifications: this.activeNotifications.size,
        rawDate: now,
        endpoint: endpoint
      });

      // If no schedules, provide helpful info
      if (schedules.length === 0) {
        console.warn('⚠️ No schedules found in database. Make sure you have:');
        console.warn('1. Created a call schedule for today');
        console.warn('2. Set the status to "scheduled"');
        console.warn('3. Saved it properly in the system');
        return;
      }

       // Debug: Log all schedules first
       console.log('📋 All schedules received:', schedules.map(s => ({
         id: s._id,
         client: s.clientName,
         date: s.scheduledDate,
         time: s.scheduledTime,
         status: s.status
       })));

       // Find calls scheduled for right now (with 1-minute window)
       const currentCalls = schedules.filter(schedule => {
         const scheduleDate = new Date(schedule.scheduledDate);
         const scheduleDateStr = `${scheduleDate.getFullYear()}-${String(scheduleDate.getMonth() + 1).padStart(2, '0')}-${String(scheduleDate.getDate()).padStart(2, '0')}`;
         
         // Check if it's today and the scheduled time matches (with 1-minute window)
         const isToday = scheduleDateStr === today;
         
         // More flexible time matching - handle different formats
         let isRightTime = false;
         const scheduleTime = schedule.scheduledTime;
         if (scheduleTime) {
           // Handle both "1:04" and "01:04" formats
           const normalizedScheduleTime = scheduleTime.includes(':') ? 
             scheduleTime.split(':').map(part => part.padStart(2, '0')).join(':') : 
             scheduleTime;
           isRightTime = normalizedScheduleTime === currentTime;
         }
         const isScheduled = schedule.status === 'scheduled';
         const notAlreadyNotified = !this.activeNotifications.has(schedule._id);
         const notDismissed = !this.dismissedNotifications.has(schedule._id);

         // Log every schedule for debugging
         const normalizedScheduleTime = scheduleTime && scheduleTime.includes(':') ? 
           scheduleTime.split(':').map(part => part.padStart(2, '0')).join(':') : 
           scheduleTime;
           
         console.log(`🔍 Checking schedule for ${schedule.clientName}:`, {
           scheduledDate: schedule.scheduledDate,
           scheduleDateStr,
           today,
           isToday,
           originalScheduledTime: schedule.scheduledTime,
           normalizedScheduleTime,
           currentTime,
           isRightTime,
           status: schedule.status,
           isScheduled,
           notAlreadyNotified,
           notDismissed,
           willTrigger: isToday && isRightTime && isScheduled && notAlreadyNotified && notDismissed
         });
         
         return isToday && isRightTime && isScheduled && notAlreadyNotified && notDismissed;
       });

      console.log('Found current calls:', currentCalls.length);
      
      if (currentCalls.length === 0 && schedules.length > 0) {
        const matchingTimeSchedules = schedules.filter(s => {
          const scheduleDate = new Date(s.scheduledDate);
          const scheduleDateStr = `${scheduleDate.getFullYear()}-${String(scheduleDate.getMonth() + 1).padStart(2, '0')}-${String(scheduleDate.getDate()).padStart(2, '0')}`;
          const normalizedTime = s.scheduledTime && s.scheduledTime.includes(':') ? 
            s.scheduledTime.split(':').map(part => part.padStart(2, '0')).join(':') : s.scheduledTime;
          return scheduleDateStr === today && normalizedTime === currentTime;
        });
        
        if (matchingTimeSchedules.length > 0) {
          console.warn('⚠️ Found schedules matching current time but they are filtered out:');
          matchingTimeSchedules.forEach(s => {
            const isDismissed = this.dismissedNotifications.has(s._id);
            const isActive = this.activeNotifications.has(s._id);
            console.warn(`📞 ${s.clientName}: dismissed=${isDismissed}, active=${isActive}, status=${s.status}`);
          });
          console.warn('💡 To test again, run: resetForTesting() or clearDismissedNotifications()');
        }
      }

      // Trigger notifications for current calls
      currentCalls.forEach(call => {
        console.log('Triggering notification for:', call.clientName);
        this.triggerNotification(call);
      });

    } catch (error) {
      console.error('Error checking upcoming calls:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        headers: error.config?.headers
      });
    }
  }

  // Trigger notification for a specific call
  triggerNotification(call) {
    if (!this.isEnabled || this.activeNotifications.has(call._id)) {
      return;
    }

    console.log('🔔 Triggering notification for:', call.clientName);

    this.activeNotifications.add(call._id);

    // Check user role
    const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
    const isAdmin = user.Role === 'Admin';

    // For user panels, add to dismissed AFTER triggering to prevent repeats
    // Use a short delay to allow the notification to show first
    if (!isAdmin) {
      setTimeout(() => {
        this.dismissedNotifications.add(call._id);
        localStorage.setItem('dismissedCallNotifications', JSON.stringify([...this.dismissedNotifications]));
        console.log('✅ Auto-dismissed notification for user panel to prevent repeats:', call.clientName);
      }, 500); // Dismiss after 500ms to allow notification to show
    }

    // Play sound
    this.playSound();

    // Show browser notification if supported
    this.showBrowserNotification(call);

    // Create visual notification
    this.showVisualNotification(call);
  }

  // Play the notification sound
  playSound() {
    if (this.audio && this.isEnabled) {
      try {
        console.log('Attempting to play notification sound...');
        this.audio.currentTime = 0;
        
        // For browsers that require user interaction, try to play
        const playPromise = this.audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Audio playing successfully');
            })
            .catch(error => {
              console.warn('Could not play notification sound:', error);
              // Try to create a new audio instance if this one failed
              this.tryAlternativeSound();
            });
        }
      } catch (error) {
        console.warn('Error playing sound:', error);
        this.tryAlternativeSound();
      }
    } else {
      console.log('Audio not available or notifications disabled');
    }
  }

  // Try alternative sound loading
  tryAlternativeSound() {
    console.log('Trying alternative sound loading...');
    try {
      // Try different audio file paths
      const audioPaths = [
        '/schdule_call_notification.mp3',
        '/src/assets/schdule_call_notification.mp3',
        './schdule_call_notification.mp3'
      ];
      
      audioPaths.forEach((path, index) => {
        setTimeout(() => {
          const altAudio = new Audio(path);
          altAudio.play().catch(err => {
            console.warn(`Audio path ${path} failed:`, err);
          });
        }, index * 1000);
      });
    } catch (error) {
      console.warn('Alternative sound loading failed:', error);
    }
  }

  // Stop the notification sound
  stopSound() {
    console.log('🔇 Stopping notification sound...');
    
    // Stop main audio instance
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.volume = 0; // Also mute it
        console.log('✅ Main audio stopped successfully');
      } catch (error) {
        console.warn('Error stopping main audio:', error);
      }
    }
    
    // Stop ALL audio elements that might be playing the notification
    try {
      const allAudio = document.querySelectorAll('audio');
      allAudio.forEach((audio, index) => {
        try {
          if (audio.src && (audio.src.includes('schdule_call_notification') || !audio.paused)) {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 0;
            console.log(`🔇 Stopped audio element ${index}`);
          }
        } catch (e) {
          console.warn(`Error stopping audio element ${index}:`, e);
        }
      });
    } catch (error) {
      console.warn('Error stopping alternative audio:', error);
    }
    
    // Clear active notifications
    this.activeNotifications.clear();
    
    console.log('🔇 All notification sounds stopped');
  }

  // Show browser notification
  showBrowserNotification(call) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Scheduled Call', {
          body: `Call with ${call.clientName} is scheduled now!\nReason: ${call.reason}`,
          icon: '/assets/main_logo.webp',
          tag: `call-${call._id}`
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            this.showBrowserNotification(call);
          }
        });
      }
    }
  }

  // Show visual notification overlay
  showVisualNotification(call) {
    // Create notification overlay
    const overlay = document.createElement('div');
    overlay.id = `notification-${call._id}`;
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
      border: 2px solid #fff;
    `;

    overlay.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <svg style="width: 24px; height: 24px; fill: white;" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <path d="M497.39 361.8l-112-48a24 24 0 0 0-28 6.9l-49.6 60.6A370.66 370.66 0 0 1 130.6 204.11l60.6-49.6a24 24 0 0 0 6.9-28l-48-112A24 24 0 0 0 122.6.61l-104 24A24 24 0 0 0 0 48c0 256.5 207.9 464 464 464a24 24 0 0 0 23.4-18.6l24-104a24 24 0 0 0-14.01-27.6z"/>
        </svg>
        <h3 style="margin: 0; font-size: 16px; font-weight: bold;">Scheduled Call</h3>
        <button id="close-notification-${call._id}" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 12px;
          margin-left: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
      </div>
      <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>${call.clientName}</strong></p>
      <p style="margin: 0 0 8px 0; font-size: 12px; opacity: 0.9;">📱 ${call.clientPhone}</p>
      <p style="margin: 0; font-size: 12px; opacity: 0.9;"><strong>Reason:</strong> ${call.reason}</p>
      <p style="margin: 8px 0 0 0; font-size: 11px; opacity: 0.8; text-align: center;">Click to dismiss</p>
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(overlay);

    // Add click handlers
    const closeHandler = () => {
      console.log('🚫 Notification dismissed - stopping sound immediately');
      
      // Stop sound FIRST and immediately
      this.stopSound();
      
      // Get user role to determine behavior
      const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
      const isAdmin = user.Role === 'Admin';
      
      // Remove from active notifications immediately
      this.activeNotifications.delete(call._id);
      
      // Add to dismissed notifications so it doesn't show again
      this.dismissedNotifications.add(call._id);
      localStorage.setItem('dismissedCallNotifications', JSON.stringify([...this.dismissedNotifications]));
      
      // For user panels, remove notification immediately without animation
      if (!isAdmin) {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        console.log('🔇 User panel: Notification removed immediately');
      } else {
        // For admin, use animation
        overlay.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 300);
      }
      
      console.log(`✅ Notification dismissed for ${isAdmin ? 'admin' : 'user'} - call will not notify again`);
    };

    // Click anywhere on notification to dismiss
    overlay.addEventListener('click', (e) => {
      // Don't close if clicking the close button (it has its own handler)
      if (e.target.id !== `close-notification-${call._id}`) {
        closeHandler();
      }
    });

    // Close button handler
    const closeButton = document.getElementById(`close-notification-${call._id}`);
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        closeHandler();
      });
    }

    // Get user role for auto-dismiss timing
    const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
    const isAdmin = user.Role === 'Admin';
    
    // Auto-remove - much shorter time for user panels to prevent spam
    const autoRemoveTime = isAdmin ? 30000 : 5000; // 5 seconds for users, 30 for admin
    setTimeout(() => {
      if (document.getElementById(`notification-${call._id}`)) {
        console.log('⏰ Auto-removing notification after timeout');
        closeHandler();
      }
    }, autoRemoveTime);
  }

  // Enable/disable notifications
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('callNotifications', enabled.toString());
    
    if (!enabled) {
      this.stopSound();
      // Remove any active visual notifications
      this.activeNotifications.forEach(callId => {
        const notification = document.getElementById(`notification-${callId}`);
        if (notification) {
          notification.remove();
        }
      });
      this.activeNotifications.clear();
    }
  }

  // Get current enabled state
  isNotificationEnabled() {
    return this.isEnabled;
  }

  // Manual test function (for debugging)
  testNotification() {
    console.log('Testing notification manually...');
    const testCall = {
      _id: 'test-' + Date.now(),
      clientName: 'Test Client',
      clientPhone: '+1-234-567-8900',
      reason: 'Test notification',
      userName: 'Test User',
      userRole: 'Admin'
    };
    this.triggerNotification(testCall);
  }

  // Force check for notifications (for debugging)
  forceCheck() {
    console.log('🔍 Force checking for notifications...');
    this.checkUpcomingCalls();
  }

  // Reset everything for testing
  resetForTesting() {
    console.log('🔄 Resetting notification service for testing...');
    this.activeNotifications.clear();
    this.dismissedNotifications.clear();
    localStorage.removeItem('dismissedCallNotifications');
    this.stopSound();
    console.log('✅ Reset complete - all notifications can trigger again');
  }

  // Debug current state and check for issues
  async debugStatus() {
    console.log('🔍 === NOTIFICATION DEBUG STATUS ===');
    
    const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
    const isAdmin = user.Role === 'Admin';
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    console.log('📊 Current Status:', {
      isEnabled: this.isEnabled,
      userRole: user.Role,
      isAdmin,
      currentTime,
      today,
      hasToken: !!localStorage.getItem('token') || !!(user?.token),
      dismissedCount: this.dismissedNotifications.size,
      activeCount: this.activeNotifications.size
    });

    // Try to fetch schedules manually
    try {
      let token = localStorage.getItem('token') || user?.token;
      const endpoint = isAdmin ? 
        'http://localhost:3000/api/call-schedules' : 
        'http://localhost:3000/api/call-schedules/my-schedules';
      
      console.log('🌐 Testing API call to:', endpoint);
      
      const response = await axios.get(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ API Response:', {
        status: response.status,
        count: response.data.length,
        schedules: response.data.map(s => ({
          client: s.clientName,
          date: s.scheduledDate,
          time: s.scheduledTime,
          status: s.status
        }))
      });
      
    } catch (error) {
      console.error('❌ API Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }

  // Clear all dismissed notifications (for testing/admin purposes)
  clearDismissedNotifications() {
    console.log('Clearing all dismissed notifications...');
    this.dismissedNotifications.clear();
    localStorage.removeItem('dismissedCallNotifications');
    console.log('Dismissed notifications cleared - all calls can notify again');
  }

  // Show all dismissed notifications (for debugging)
  showDismissedNotifications() {
    console.log('Dismissed notifications:', {
      count: this.dismissedNotifications.size,
      ids: [...this.dismissedNotifications],
      localStorage: localStorage.getItem('dismissedCallNotifications')
    });
    return [...this.dismissedNotifications];
  }

  // Cleanup
  destroy() {
    this.stopChecking();
    this.stopSound();
    this.activeNotifications.clear();
    
    // Remove global click handler
    if (this.globalClickHandler) {
      document.removeEventListener('click', this.globalClickHandler);
      this.globalClickHandler = null;
    }
    
    // Remove keyboard handler
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  window.testNotification = () => notificationService.testNotification();
  window.forceCheck = () => notificationService.forceCheck();
  window.debugStatus = () => notificationService.debugStatus();
  window.resetForTesting = () => notificationService.resetForTesting();
  window.clearDismissedNotifications = () => notificationService.clearDismissedNotifications();
  window.showDismissedNotifications = () => notificationService.showDismissedNotifications();
  window.notificationService = notificationService;
}

export default notificationService;
