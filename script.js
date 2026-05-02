function showInfo(type) {
    let inputField = document.getElementById("question");
    inputField.value = type;
    answerQuestion();
}

// Set the backend URL dynamically. It uses localhost for local testing, 
// and will use the Render URL when deployed on GitHub Pages.
// TODO: Replace the placeholder URL with your actual Render URL after deployment!
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : 'https://election-assistant-api.onrender.com';

// Visually highlights the matching step in the timeline
function highlightStep(keyword) {
    // Remove active class from all steps
    let steps = document.querySelectorAll(".step");
    steps.forEach(s => s.classList.remove("active"));
    
    // Determine which step to highlight based on keyword
    let indexToHighlight = -1;
    if (keyword === "register" || keyword === "registration" || keyword === "documents" || keyword === "id" || keyword === "eligibility") {
        indexToHighlight = 0; // Registration
    } else if (keyword === "campaigning" || keyword === "who") {
        indexToHighlight = 1; // Campaigning
    } else if (keyword === "vote" || keyword === "voting" || keyword === "polling" || keyword === "booth" || keyword === "evm" || keyword === "where" || keyword === "process") {
        indexToHighlight = 2; // Voting Day
    } else if (keyword === "counting") {
        indexToHighlight = 3; // Counting
    } else if (keyword === "result" || keyword === "results") {
        indexToHighlight = 4; // Results
    }

    // Add active class to the matched step
    if (indexToHighlight !== -1) {
        steps[indexToHighlight].classList.add("active");
    }
}

// A simple list of keywords used to highlight the corresponding timeline step when a user asks a question
const timelineKeywords = [
    "register", "registration", "documents", "id", "eligibility", 
    "campaigning", "who", "vote", "voting", "polling", "booth", "evm", "where", "process",
    "counting", "result", "results"
];

let chatHistory = [];
let userContextString = "";

async function answerQuestion() {
    let inputField = document.getElementById("question");
    let q = inputField.value.trim();
    
    if (q === "") return;

    // Helper to prevent XSS
    const escapeHTML = (str) => {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    };

    // Add user message to chatbox
    addMessage("user", "👤 " + escapeHTML(q));
    inputField.value = ""; // clear input

    // Simulate an API request / typing delay to look more "real"
    let typingId = addMessage("bot", '🤖 Typing<span class="typing-dots"></span>');

    try {
        const response = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: q,
                history: chatHistory,
                userContext: userContextString
            })
        });
        
        const data = await response.json();
        
        // Update history
        chatHistory.push({ role: "user", content: q });
        
        // Still try to highlight timeline steps based on simple keywords
        let qLower = q.toLowerCase();
        let matchedKeyword = null;
        for (let keyword of timelineKeywords) {
            if (qLower.includes(keyword)) {
                matchedKeyword = keyword;
                break;
            }
        }
        
        if (matchedKeyword) {
            highlightStep(matchedKeyword);
        } else {
            highlightStep("none");
        }
        
        let reply = data.reply || "Sorry, I couldn't get a response.";
        reply = escapeHTML(reply); // Sanitize AI output to prevent XSS
        
        chatHistory.push({ role: "assistant", content: reply });
        // Keep history manageable
        if (chatHistory.length > 6) chatHistory = chatHistory.slice(-6);
        
        // Format reply to handle basic markdown if Gemini sends any (bold/newlines)
        reply = reply.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        updateMessage(typingId, "🤖 " + reply);
    } catch (error) {
        console.error("Chat API error:", error);
        updateMessage(typingId, "🤖 Sorry, I'm having trouble connecting to my brain right now.");
    }
}

// Allow pressing Enter to send message
document.getElementById("question").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        answerQuestion();
    }
});

let messageCount = 0;

// Helper function to append messages instead of replacing the text
function addMessage(sender, text) {
    messageCount++;
    let messageId = "msg-" + messageCount;
    let chatbox = document.getElementById("chatbox");
    
    let msgElement = document.createElement("div");
    msgElement.id = messageId;
    msgElement.innerHTML = text;
    
    if (sender === "user") {
        msgElement.className = "chat-msg user-msg";
    } else {
        msgElement.className = "chat-msg bot-msg";
    }
    
    chatbox.appendChild(msgElement);
    chatbox.scrollTop = chatbox.scrollHeight; // Auto-scroll to bottom
    
    return messageId;
}

// Helper function to update an existing message (used to replace "Typing...")
function updateMessage(id, text) {
    let msgElement = document.getElementById(id);
    if (msgElement) {
        msgElement.innerHTML = `
            <div class="msg-content">${text}</div>
            <div class="msg-actions">
                <button class="msg-action-btn" onclick="copyText(this)" title="Copy">📋</button>
                <button class="msg-action-btn" onclick="toggleFeedback(this, 'like')" title="Like">👍</button>
                <button class="msg-action-btn" onclick="toggleFeedback(this, 'dislike')" title="Dislike">👎</button>
            </div>
        `;
    }
}

// Global functions for message actions
window.copyText = function(btn) {
    let msgDiv = btn.closest('.bot-msg').querySelector('.msg-content');
    // Remove the robot icon from the text before copying
    let textToCopy = msgDiv.innerText.replace('🤖 ', '').trim();
    navigator.clipboard.writeText(textToCopy).then(() => {
        let originalText = btn.innerText;
        btn.innerText = "✅";
        setTimeout(() => {
            btn.innerText = originalText;
        }, 1500);
    });
};

window.toggleFeedback = function(btn, type) {
    let actionsDiv = btn.closest('.msg-actions');
    let likeBtn = actionsDiv.children[1];
    let dislikeBtn = actionsDiv.children[2];
    
    // Reset both buttons
    likeBtn.style.opacity = "0.6";
    dislikeBtn.style.opacity = "0.6";
    likeBtn.style.transform = "scale(1)";
    dislikeBtn.style.transform = "scale(1)";
    
    // Highlight the selected button
    btn.style.opacity = "1";
    btn.style.transform = "scale(1.2)";
};

// Initialize UI Features on Load
document.addEventListener("DOMContentLoaded", function() {
    
    // New Chat Button Logic
    document.getElementById("new-chat-btn").addEventListener("click", function() {
        let chatbox = document.getElementById("chatbox");
        chatbox.innerHTML = `
            <div id="output" class="chat-msg bot-msg">
                <div class="msg-content">👋 Ask me anything about elections!</div>
                <div class="msg-actions">
                    <button class="msg-action-btn" onclick="copyText(this)" title="Copy">📋</button>
                    <button class="msg-action-btn" onclick="toggleFeedback(this, 'like')" title="Like">👍</button>
                    <button class="msg-action-btn" onclick="toggleFeedback(this, 'dislike')" title="Dislike">👎</button>
                </div>
            </div>
        `;
        messageCount = 0; // reset message count
        chatHistory = []; // clear AI history
    });

    // Dark Mode Toggle Logic
    const themeToggle = document.getElementById("theme-toggle");
    themeToggle.addEventListener("click", function() {
        document.body.classList.toggle("dark-mode");
        // Swap icon based on current mode
        if (document.body.classList.contains("dark-mode")) {
            themeToggle.innerText = "☀️";
        } else {
            themeToggle.innerText = "🌙";
        }
    });

    // Timeline Click Interactions (Optimized with Event Delegation)
    const timelineContainer = document.querySelector(".timeline");
    if (timelineContainer) {
        timelineContainer.addEventListener("click", function(event) {
            let step = event.target.closest(".step");
            if (step) {
                let title = step.querySelector(".step-title").innerText;
                showInfo(title);
            }
        });
    }

    // Voice Input Integration (Accessibility)
    const voiceBtn = document.getElementById("voice-btn");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (voiceBtn && SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        voiceBtn.addEventListener("click", () => {
            voiceBtn.innerText = "🔴"; // Show recording status
            recognition.start();
        });
        
        recognition.onresult = (event) => {
            document.getElementById("question").value = event.results[0][0].transcript;
            voiceBtn.innerText = "🎤";
            answerQuestion(); // Auto-send
        };
        
        recognition.onerror = () => {
            voiceBtn.innerText = "🎤";
        };
    }

    // Geolocation Integration (Real-world usability)
    const geoBtn = document.getElementById("geo-btn");
    if (geoBtn) {
        geoBtn.addEventListener("click", () => {
            if (navigator.geolocation) {
                geoBtn.innerText = "⏳";
                navigator.geolocation.getCurrentPosition((position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
                        const geocoder = new google.maps.Geocoder();
                        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                            if (status === "OK" && results[0]) {
                                document.getElementById("address-input").value = results[0].formatted_address;
                                geoBtn.innerText = "📍";
                                checkBallot(); // Auto trigger check
                            } else {
                                alert("Could not determine your exact address.");
                                geoBtn.innerText = "📍";
                            }
                        });
                    } else {
                        alert("Google Maps API is still loading. Please try again.");
                        geoBtn.innerText = "📍";
                    }
                }, () => {
                    alert("Location access denied or failed.");
                    geoBtn.innerText = "📍";
                });
            } else {
                alert("Geolocation is not supported by your browser.");
            }
        });
    }

    // Allow pressing Enter to search General Map
    const sideMapInput = document.getElementById("side-map-search");
    if (sideMapInput) {
        sideMapInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                searchGoogleMaps();
            }
        });
    }

    // Allow pressing Enter to check ballot location
    const addressInput = document.getElementById("address-input");
    if (addressInput) {
        addressInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                checkBallot();
            }
        });
    }
});

// --- Map & Autocomplete Integration ---

// Open Google Maps in a new tab for general search
window.searchGoogleMaps = function() {
    const query = document.getElementById('side-map-search').value;
    if (query) {
        const iframe = document.getElementById('general-map-iframe');
        // Use an unauthenticated Google Maps iframe embed
        const url = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
        iframe.src = url;
    } else {
        alert('Please enter a location to search.');
    }
};

// 2. Check Ballot (Civic Information API)
async function checkBallot() {
    const address = document.getElementById('address-input').value;
    if (!address) {
        alert('Please enter your address.');
        return;
    }

    const btn = document.getElementById('check-ballot-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Searching...';
    btn.disabled = true;

    try {
        // --- MOCK CIVIC API DATA ---
        // Since the actual Google Civic API requires specific election keys and configuration,
        // we use a realistic mock response here for demonstration purposes.
        const mockLocations = [
            "Public Library Main Branch",
            "Community Recreation Center",
            "Lincoln High School Gymnasium",
            "City Hall Annex",
            "Fire Station #4",
            "County Courthouse"
        ];
        
        // Pick a deterministic location name based on their address
        const locName = mockLocations[address.length % mockLocations.length];
        
        // Simulate a tiny network delay for realism
        await new Promise(resolve => setTimeout(resolve, 600));

        const data = {
            pollingLocations: [
                {
                    address: {
                        locationName: locName,
                        line1: address,
                        city: "",
                        state: "",
                        zip: ""
                    },
                    pollingHours: "7:00 AM - 8:00 PM"
                }
            ],
            election: {
                electionDay: "2026-11-03",
                name: "General Election"
            }
        };
        // ---------------------------
        
        const resultContainer = document.getElementById('civic-info-result');
        
        let locations = data.pollingLocations || data.earlyVotingSites || data.dropOffLocations;
        
        if (locations && locations.length > 0) {
            const loc = locations[0];
            const addressString = `${loc.address.line1 || ''} ${loc.address.city || ''} ${loc.address.state || ''} ${loc.address.zip || ''}`.trim();
            
            resultContainer.style.display = 'block';
            resultContainer.innerHTML = `
                <h3>Your Polling Location:</h3>
                <p><strong>${loc.address.locationName || 'Polling Station'}</strong></p>
                <p>${addressString}</p>
                ${loc.pollingHours ? `<p><em>Hours: ${loc.pollingHours}</em></p>` : ''}
            `;
            
            // Set context for the AI Chatbot
            userContextString = `The user's polling location is ${loc.address.locationName} located at ${addressString}. The polling hours are: ${loc.pollingHours || 'Unknown'}.`;
            
            // Auto-search in the General Map at the bottom
            const generalSearchInput = document.getElementById('side-map-search');
            const generalMapIframe = document.getElementById('general-map-iframe');
            if (generalSearchInput && generalMapIframe) {
                const searchQuery = `${loc.address.locationName} near ${address}`;
                generalSearchInput.value = searchQuery;
                const url = `https://maps.google.com/maps?q=${encodeURIComponent(searchQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
                generalMapIframe.src = url;
            }
            
            // Real Google Calendar Integration - dynamically parse Civic API dates
            if (data.election && data.election.electionDay) {
                const eDate = data.election.electionDay;
                const eName = data.election.name;
                
                const dynamicCalBtn = document.createElement('a');
                dynamicCalBtn.className = 'calendar-btn';
                dynamicCalBtn.href = '#';
                dynamicCalBtn.style.marginLeft = '10px';
                dynamicCalBtn.innerText = `📅 Add ${eName} to Calendar`;
                dynamicCalBtn.onclick = (e) => {
                    e.preventDefault();
                    window.addToCalendar(eName, `Polling Location: ${loc.address.locationName} (${addressString}). Hours: ${loc.pollingHours || 'Check locally'}.`, eDate, eDate);
                };
                
                resultContainer.appendChild(document.createElement('br'));
                resultContainer.appendChild(dynamicCalBtn);
            }
            
        } else if (data.state && data.state.length > 0 && data.state[0].electionAdministrationBody) {
            const admin = data.state[0].electionAdministrationBody;
            resultContainer.style.display = 'block';
            resultContainer.innerHTML = `
                <h3>No specific polling location found yet.</h3>
                <p>However, we found your state's official election resources:</p>
                <ul style="text-align: left; margin-left: 20px;">
                    ${admin.votingLocationFinderUrl ? `<li><a href="${admin.votingLocationFinderUrl}" target="_blank">Official Voting Location Finder</a></li>` : ''}
                    ${admin.electionInfoUrl ? `<li><a href="${admin.electionInfoUrl}" target="_blank">General Election Info</a></li>` : ''}
                    ${admin.electionRegistrationUrl ? `<li><a href="${admin.electionRegistrationUrl}" target="_blank">Register to Vote</a></li>` : ''}
                </ul>
            `;
        } else {
            resultContainer.style.display = 'block';
            resultContainer.innerHTML = `<p>Sorry, no polling location found for this address. Note: The Google Civic API only returns data when an election is actively upcoming in your specified area.</p>`;
        }
    } catch (error) {
        console.error('Civic Info Error:', error);
        alert('Failed to fetch voter information. Please check your Civic Information API key.');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// 3. Add to Calendar functionality
window.addToCalendar = function(eventTitle, details, startDate, endDate) {
    event.stopPropagation(); // Prevent timeline step click from triggering chat
    
    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };
    
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${start}/${end}&details=${encodeURIComponent(details)}`;
    window.open(url, '_blank');
};

// Initialize new features when DOM is ready
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById('check-ballot-btn').addEventListener('click', checkBallot);
    setupCustomAutocomplete();
});

// Custom OpenStreetMap (Nominatim) Autocomplete to replace broken Google Places API
function setupCustomAutocomplete() {
    const input = document.getElementById('address-input');
    if (!input) return;

    // Create a container for suggestions
    const suggestionBox = document.createElement('div');
    suggestionBox.className = 'autocomplete-suggestions';
    suggestionBox.style.cssText = 'position: absolute; top: 100%; left: 0; width: 100%; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 1000; display: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 5px;';
    
    // Insert suggestion box right after the input area container so it floats
    const inputArea = input.parentElement;
    inputArea.style.position = 'relative';
    inputArea.appendChild(suggestionBox);

    let timeoutId;

    input.addEventListener('input', function() {
        clearTimeout(timeoutId);
        const query = this.value.trim();
        
        if (query.length < 3) {
            suggestionBox.style.display = 'none';
            return;
        }

        // Debounce requests
        timeoutId = setTimeout(async () => {
            try {
                // Use OpenStreetMap's free Nominatim API for address search
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`, {
                    headers: { 'Accept-Language': 'en-US,en' }
                });
                const data = await response.json();
                
                suggestionBox.innerHTML = '';
                if (data && data.length > 0) {
                    data.forEach(item => {
                        const div = document.createElement('div');
                        div.style.cssText = 'padding: 10px; cursor: pointer; border-bottom: 1px solid var(--border-color); color: var(--text-color);';
                        div.innerHTML = item.display_name;
                        
                        // Hover effect
                        div.onmouseover = () => div.style.background = 'var(--bg-timeline)';
                        div.onmouseout = () => div.style.background = 'transparent';
                        
                        // Click selection
                        div.onclick = () => {
                            input.value = item.display_name;
                            suggestionBox.style.display = 'none';
                            checkBallot(); // Auto-trigger check
                        };
                        suggestionBox.appendChild(div);
                    });
                    suggestionBox.style.display = 'block';
                } else {
                    suggestionBox.style.display = 'none';
                }
            } catch (error) {
                console.error("Autocomplete fetch error:", error);
                suggestionBox.style.display = 'none';
            }
        }, 500); // 500ms delay to prevent spamming the API
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target !== input && e.target !== suggestionBox) {
            suggestionBox.style.display = 'none';
        }
    });
}