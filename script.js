// Smooth scroll behavior for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add active class to navigation links on scroll
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-menu a');

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

// Add scroll reveal animation for cards
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all cards for animation
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.era-card, .champion-card, .circuit-card, .timeline-item');
    
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
});

// Add parallax effect to hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero && scrolled < window.innerHeight) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// Counter animation for champion numbers
const animateCounters = () => {
    const counters = document.querySelectorAll('.champion-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };
        
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && counter.textContent === String(target)) {
                    counter.textContent = '0';
                    updateCounter();
                    counterObserver.unobserve(counter);
                }
            });
        }, { threshold: 0.5 });
        
        counterObserver.observe(counter);
    });
};

// Initialize counter animation
document.addEventListener('DOMContentLoaded', animateCounters);

// Add responsive mobile menu functionality
const createMobileMenu = () => {
    if (window.innerWidth <= 768) {
        const nav = document.querySelector('.nav-container');
        if (!document.querySelector('.menu-toggle')) {
            const menuToggle = document.createElement('button');
            menuToggle.className = 'menu-toggle';
            menuToggle.innerHTML = '☰';
            menuToggle.style.cssText = `
                background: none;
                border: none;
                color: white;
                font-size: 2rem;
                cursor: pointer;
                display: none;
            `;
            
            if (window.innerWidth <= 768) {
                menuToggle.style.display = 'block';
            }
            
            menuToggle.addEventListener('click', () => {
                const navMenu = document.querySelector('.nav-menu');
                navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
            });
            
            nav.appendChild(menuToggle);
        }
    }
};

window.addEventListener('resize', createMobileMenu);
document.addEventListener('DOMContentLoaded', createMobileMenu);

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

console.log('F1 History website loaded successfully!');

// ===== GENIE CHAT FUNCTIONALITY =====

// Configuration - API endpoints are served from same domain by Azure Static Web Apps
const GENIE_API_BASE = '/api'; // Managed functions in Azure Static Web App

// Chat state
let currentConversationId = null;
let isProcessing = false;

// DOM elements
const chatToggle = document.getElementById('chat-toggle');
const chatPanel = document.getElementById('chat-panel');
const chatClose = document.getElementById('chat-close');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatMessages = document.getElementById('chat-messages');
const suggestionButtons = document.querySelectorAll('.suggestion-btn');

// Toggle chat panel
chatToggle.addEventListener('click', () => {
    const isVisible = chatPanel.style.display === 'flex';
    chatPanel.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
        chatInput.focus();
    }
});

chatClose.addEventListener('click', () => {
    chatPanel.style.display = 'none';
});

// Handle suggestion buttons
suggestionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const question = btn.getAttribute('data-question');
        chatInput.value = question;
        sendMessage();
    });
});

// Send message on button click
chatSend.addEventListener('click', sendMessage);

// Send message on Enter key
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

/**
 * Send a message to Genie
 */
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || isProcessing) return;

    // Clear input
    chatInput.value = '';
    
    // Add user message to chat
    addUserMessage(message);
    
    // Show typing indicator
    const typingIndicator = addTypingIndicator();
    
    // Disable input during processing
    setProcessing(true);

    try {
        let response;
        
        if (currentConversationId) {
            // Continue existing conversation
            response = await fetch(`${GENIE_API_BASE}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: currentConversationId,
                    message: message
                })
            });
        } else {
            // Start new conversation
            response = await fetch(`${GENIE_API_BASE}/startChat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('API Response:', data);
        
        // Store conversation ID for follow-up messages
        if (data.conversationId) {
            currentConversationId = data.conversationId;
        }

        // Remove typing indicator
        typingIndicator.remove();

        // Display response
        if (data.response) {
            addBotMessage(data.response);
        } else {
            throw new Error('No response received from Genie');
        }

    } catch (error) {
        console.error('Error sending message:', error);
        typingIndicator.remove();
        addErrorMessage(`Error: ${error.message}. Check browser console for details.`);
    } finally {
        setProcessing(false);
    }
}

/**
 * Add user message to chat
 */
function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message user-message';
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${escapeHtml(text)}</p>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

/**
 * Add bot message to chat
 */
function addBotMessage(response) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot-message';
    
    let content = `<div class="message-content">`;
    
    // Add text response
    if (response.text) {
        content += `<p>${escapeHtml(response.text)}</p>`;
    }
    
    // Add SQL query if available (optional, can be hidden by default)
    if (response.query) {
        content += `<div class="message-query">SQL: ${escapeHtml(response.query)}</div>`;
    }
    
    // Add data table if available
    if (response.data && response.data.rows && response.data.rows.length > 0) {
        content += formatDataTable(response.data);
    }
    
    content += `</div>`;
    messageDiv.innerHTML = content;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

/**
 * Format data as HTML table
 */
function formatDataTable(data) {
    if (!data.schema || !data.rows || data.rows.length === 0) {
        return '';
    }

    let table = '<div class="message-data"><table>';
    
    // Add headers
    table += '<thead><tr>';
    data.schema.forEach(col => {
        table += `<th>${escapeHtml(col.name)}</th>`;
    });
    table += '</tr></thead>';
    
    // Add rows (limit to first 10 for display)
    table += '<tbody>';
    const rowsToShow = data.rows.slice(0, 10);
    rowsToShow.forEach(row => {
        table += '<tr>';
        row.forEach(cell => {
            const cellValue = cell === null ? 'NULL' : String(cell);
            table += `<td>${escapeHtml(cellValue)}</td>`;
        });
        table += '</tr>';
    });
    table += '</tbody></table>';
    
    if (data.rows.length > 10) {
        table += `<p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-gray);">Showing 10 of ${data.rows.length} rows</p>`;
    }
    
    table += '</div>';
    return table;
}

/**
 * Add typing indicator
 */
function addTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot-message';
    messageDiv.id = 'typing-indicator';
    messageDiv.innerHTML = `
        <div class="message-content typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
}

/**
 * Add error message
 */
function addErrorMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot-message';
    messageDiv.innerHTML = `
        <div class="message-content error-message">
            ${escapeHtml(text)}
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

/**
 * Set processing state
 */
function setProcessing(processing) {
    isProcessing = processing;
    chatInput.disabled = processing;
    chatSend.disabled = processing;
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
