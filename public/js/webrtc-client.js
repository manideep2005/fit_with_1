class WebRTCClient {
    constructor() {
        this.socket = io('/api/socket', {
            path: '/api/socket'
        });
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.currentCallId = null;
        this.isInCall = false;
        
        this.setupSocketListeners();
        this.setupUI();
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
            this.socket.emit('register', { userId: window.currentUserId });
        });

        this.socket.on('incoming-call', (data) => {
            this.handleIncomingCall(data);
        });

        this.socket.on('call-accepted', (data) => {
            this.handleCallAccepted(data);
        });

        this.socket.on('call-rejected', (data) => {
            this.handleCallRejected(data);
        });

        this.socket.on('call-offer', (data) => {
            this.handleCallOffer(data);
        });

        this.socket.on('call-answer', (data) => {
            this.handleCallAnswer(data);
        });

        this.socket.on('ice-candidate', (data) => {
            this.handleIceCandidate(data);
        });

        this.socket.on('call-ended', (data) => {
            this.handleCallEnded(data);
        });
    }

    setupUI() {
        // Add call buttons to chat interface
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader) {
            const callButtons = document.createElement('div');
            callButtons.className = 'call-buttons';
            callButtons.innerHTML = `
                <button id="audio-call-btn" class="btn btn-sm btn-success" title="Audio Call">
                    <i class="fas fa-phone"></i>
                </button>
                <button id="video-call-btn" class="btn btn-sm btn-primary" title="Video Call">
                    <i class="fas fa-video"></i>
                </button>
            `;
            chatHeader.appendChild(callButtons);

            document.getElementById('audio-call-btn').addEventListener('click', () => {
                this.startCall(false);
            });

            document.getElementById('video-call-btn').addEventListener('click', () => {
                this.startCall(true);
            });
        }
    }

    async startCall(isVideo) {
        if (!window.chatManager?.currentFriendId) {
            alert('Please select a friend to call');
            return;
        }

        try {
            this.currentCallId = this.generateCallId();
            this.isInCall = true;

            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: isVideo,
                audio: true
            });

            // Create peer connection
            this.createPeerConnection();

            // Add local stream to peer connection
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Show calling UI
            this.showCallingUI(isVideo);

            // Send call request
            this.socket.emit('call-request', {
                to: window.chatManager.currentFriendId,
                from: {
                    id: window.currentUserId,
                    name: window.currentUserName
                },
                callId: this.currentCallId,
                isVideo: isVideo
            });

        } catch (error) {
            console.error('Error starting call:', error);
            alert('Failed to start call. Please check your camera/microphone permissions.');
            this.endCall();
        }
    }

    async handleIncomingCall(data) {
        if (this.isInCall) {
            // Busy - reject call
            this.socket.emit('call-reject', {
                to: data.from.id,
                callId: data.callId
            });
            return;
        }

        const accept = confirm(`Incoming ${data.isVideo ? 'video' : 'audio'} call from ${data.from.name}. Accept?`);
        
        if (accept) {
            try {
                this.currentCallId = data.callId;
                this.isInCall = true;

                // Get user media
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    video: data.isVideo,
                    audio: true
                });

                // Create peer connection
                this.createPeerConnection();

                // Add local stream
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });

                // Show call UI
                this.showCallUI(data.isVideo);

                // Accept call
                this.socket.emit('call-accept', {
                    to: data.from.id,
                    from: window.currentUserId,
                    callId: data.callId
                });

            } catch (error) {
                console.error('Error accepting call:', error);
                this.socket.emit('call-reject', {
                    to: data.from.id,
                    callId: data.callId
                });
            }
        } else {
            this.socket.emit('call-reject', {
                to: data.from.id,
                callId: data.callId
            });
        }
    }

    async handleCallAccepted(data) {
        console.log('Call accepted');
        
        // Create and send offer
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        this.socket.emit('call-offer', {
            to: window.chatManager.currentFriendId,
            from: window.currentUserId,
            callId: this.currentCallId,
            offer: offer
        });

        this.updateCallStatus('Connected');
    }

    handleCallRejected(data) {
        alert('Call was rejected');
        this.endCall();
    }

    async handleCallOffer(data) {
        await this.peerConnection.setRemoteDescription(data.offer);
        
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.socket.emit('call-answer', {
            to: data.from,
            callId: data.callId,
            answer: answer
        });
    }

    async handleCallAnswer(data) {
        await this.peerConnection.setRemoteDescription(data.answer);
        this.updateCallStatus('Connected');
    }

    async handleIceCandidate(data) {
        if (this.peerConnection && data.candidate) {
            await this.peerConnection.addIceCandidate(data.candidate);
        }
    }

    handleCallEnded(data) {
        this.endCall();
    }

    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    to: window.chatManager.currentFriendId,
                    callId: this.currentCallId,
                    candidate: event.candidate
                });
            }
        };

        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            const remoteVideo = document.getElementById('remote-video');
            if (remoteVideo) {
                remoteVideo.srcObject = this.remoteStream;
            }
        };
    }

    showCallingUI(isVideo) {
        const callModal = document.createElement('div');
        callModal.id = 'call-modal';
        callModal.className = 'call-modal';
        callModal.innerHTML = `
            <div class="call-content">
                <div class="call-header">
                    <h3>Calling...</h3>
                    <div class="call-status">Connecting...</div>
                </div>
                <div class="call-videos">
                    ${isVideo ? `
                        <video id="local-video" autoplay muted></video>
                        <video id="remote-video" autoplay></video>
                    ` : `
                        <div class="audio-call-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                    `}
                </div>
                <div class="call-controls">
                    <button id="end-call-btn" class="btn btn-danger">
                        <i class="fas fa-phone-slash"></i> End Call
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(callModal);

        if (isVideo) {
            document.getElementById('local-video').srcObject = this.localStream;
        }

        document.getElementById('end-call-btn').addEventListener('click', () => {
            this.endCall();
        });
    }

    showCallUI(isVideo) {
        this.showCallingUI(isVideo);
        this.updateCallStatus('Connected');
    }

    updateCallStatus(status) {
        const statusElement = document.querySelector('.call-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    endCall() {
        // Send call end signal
        if (this.currentCallId && window.chatManager?.currentFriendId) {
            this.socket.emit('call-end', {
                to: window.chatManager.currentFriendId,
                callId: this.currentCallId
            });
        }

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Remove call UI
        const callModal = document.getElementById('call-modal');
        if (callModal) {
            callModal.remove();
        }

        // Reset state
        this.currentCallId = null;
        this.isInCall = false;
        this.remoteStream = null;
    }

    generateCallId() {
        return 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Initialize WebRTC client when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.chat-container')) {
        window.webrtcClient = new WebRTCClient();
    }
});