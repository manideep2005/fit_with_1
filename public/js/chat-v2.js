document.addEventListener('DOMContentLoaded', function() {
    const contactList = document.getElementById('contactList');
    const chatTitle = document.getElementById('chatTitle');
    const messageArea = document.getElementById('messageArea');
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const newChatBtn = document.getElementById('newChatBtn');

    let currentChat = null;
    let friends = [];

    // Fetch friends list
    async function fetchFriends() {
        try {
            const response = await fetch('/api/chat/friends');
            const data = await response.json();

            if (data.success) {
                friends = data.friends;
                displayFriends(data.friends);
            } else {
                console.error('Failed to fetch friends:', data.error);
                showAddFriendsMessage();
            }
        } catch (error) {
            console.error('Error fetching friends:', error);
            showAddFriendsMessage();
        }
    }
    
    // Show message when no friends
    function showAddFriendsMessage() {
        contactList.innerHTML = `
            <div class="no-friends-message">
                <i class="fas fa-users" style="font-size: 2rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p>No friends yet</p>
                <button onclick="showAddFriendModal()" class="btn-add-friend">Add Friends</button>
            </div>
        `;
    }

    // Display friends in the sidebar
    function displayFriends(friendsList) {
        if (friendsList.length === 0) {
            showAddFriendsMessage();
            return;
        }
        
        contactList.innerHTML = friendsList.map(friend => `
            <li class="contact-item" data-id="${friend._id}" data-type="User">
                <div class="contact-avatar">
                    <img src="${friend.avatar}" alt="${friend.fullName}" style="width: 40px; height: 40px; border-radius: 50%;">
                </div>
                <div class="contact-info">
                    <h4>${friend.fullName}</h4>
                    <p>${friend.isOnline ? 'Online' : 'Offline'}</p>
                </div>
            </li>
        `).join('');

        // Add click listeners to friends
        document.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', () => {
                const friendId = item.dataset.id;
                const friend = friends.find(f => f._id === friendId);
                
                currentChat = {
                    id: friendId,
                    type: 'User',
                    name: friend.fullName
                };
                
                chatTitle.textContent = friend.fullName;
                fetchMessages(friendId);
                document.querySelectorAll('.contact-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    // Fetch messages for a chat
    async function fetchMessages(friendId) {
        try {
            const response = await fetch(`/api/chat/messages/${friendId}`);
            const data = await response.json();

            if (data.success) {
                displayMessages(data.messages);
            } else {
                console.error('Failed to fetch messages:', data.error);
                messageArea.innerHTML = '<div class="no-messages">Start a conversation!</div>';
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            messageArea.innerHTML = '<div class="no-messages">Failed to load messages</div>';
        }
    }

    // Display messages in the chat window
    function displayMessages(messages) {
        messageArea.innerHTML = messages.map(message => `
            <div class="message ${message.isSender ? 'sent' : 'received'}">
                ${!message.isSender ? `<strong>${message.senderName}</strong><br>` : ''}
                ${message.content}
            </div>
        `).join('');
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    // Send a message
    async function sendMessage() {
        if (!currentChat || !messageInput.value.trim()) return;

        const messageContent = messageInput.value.trim();
        messageInput.value = '';

        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiverId: currentChat.id,
                    content: messageContent
                })
            });

            const data = await response.json();

            if (data.success) {
                // Add message to UI immediately
                messageArea.innerHTML += `
                    <div class="message sent">
                        <div class="message-content">${messageContent}</div>
                        <div class="message-time">${new Date().toLocaleTimeString()}</div>
                    </div>
                `;
                messageArea.scrollTop = messageArea.scrollHeight;
            } else {
                console.error('Failed to send message:', data.error);
                alert('Failed to send message: ' + data.error);
                messageInput.value = messageContent; // Restore message
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
            messageInput.value = messageContent; // Restore message
        }
    }
    
    // Add friend functionality
    newChatBtn.addEventListener('click', showAddFriendModal);
    
    window.showAddFriendModal = function() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Friend</h3>
                    <button onclick="closeModal()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="email" id="friendEmail" placeholder="Enter friend's email" class="friend-input">
                    <button onclick="sendFriendRequest()" class="btn-send-request">Send Friend Request</button>
                </div>
                <div class="friend-requests-section">
                    <h4>Pending Requests</h4>
                    <div id="friendRequests">Loading...</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        loadFriendRequests();
    };
    
    window.closeModal = function() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
    };
    
    window.sendFriendRequest = async function() {
        const email = document.getElementById('friendEmail').value.trim();
        if (!email) {
            alert('Please enter an email address');
            return;
        }
        
        try {
            const response = await fetch('/api/chat/send-friend-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    friendEmail: email,
                    message: 'Hi! I would like to connect with you.'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Friend request sent successfully!');
                document.getElementById('friendEmail').value = '';
            } else {
                alert('Failed to send friend request: ' + data.error);
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            alert('Failed to send friend request');
        }
    };
    
    async function loadFriendRequests() {
        try {
            const response = await fetch('/api/chat/friend-requests');
            const data = await response.json();
            
            const requestsDiv = document.getElementById('friendRequests');
            
            if (data.success && data.requests.length > 0) {
                requestsDiv.innerHTML = data.requests.map(request => `
                    <div class="friend-request-item">
                        <div class="request-info">
                            <strong>${request.sender.fullName}</strong>
                            <p>${request.sender.email}</p>
                            <small>${request.message}</small>
                        </div>
                        <div class="request-actions">
                            <button onclick="respondToRequest('${request._id}', 'accept')" class="btn-accept">Accept</button>
                            <button onclick="respondToRequest('${request._id}', 'reject')" class="btn-reject">Reject</button>
                        </div>
                    </div>
                `).join('');
            } else {
                requestsDiv.innerHTML = '<p>No pending requests</p>';
            }
        } catch (error) {
            console.error('Error loading friend requests:', error);
            document.getElementById('friendRequests').innerHTML = '<p>Failed to load requests</p>';
        }
    }
    
    window.respondToRequest = async function(requestId, action) {
        try {
            const response = await fetch(`/api/chat/friend-requests/${requestId}/${action}`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(`Friend request ${action}ed successfully!`);
                loadFriendRequests();
                fetchFriends(); // Refresh friends list
            } else {
                alert(`Failed to ${action} friend request: ` + data.error);
            }
        } catch (error) {
            console.error(`Error ${action}ing friend request:`, error);
            alert(`Failed to ${action} friend request`);
        }
    };

    sendMessageBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Initial load
    fetchFriends();
});