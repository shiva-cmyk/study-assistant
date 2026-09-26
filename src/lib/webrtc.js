/**
 * webrtc.js
 * 
 * WebRTC Mesh P2P audio/video manager for StudyFlow AI Study Rooms.
 * Handles local media stream acquisition, RTCPeerConnection lifecycle,
 * ICE candidates, Web Audio API speaking volume detection, and track muting.
 */

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export class WebRTCManager {
  constructor({ socket, onRemoteStream, onPeerLeft, onSpeakingChange, onMediaError }) {
    this.socket = socket;
    this.onRemoteStream = onRemoteStream;
    this.onPeerLeft = onPeerLeft;
    this.onSpeakingChange = onSpeakingChange;
    this.onMediaError = onMediaError;

    this.localStream = null;
    this.peerConnections = new Map(); // targetSocketId -> RTCPeerConnection
    this.remoteStreams = new Map(); // targetSocketId -> MediaStream

    this.audioContext = null;
    this.analyser = null;
    this.speakingInterval = null;
    this.isSpeaking = false;

    this.setupSocketListeners();
  }

  /**
   * Acquires local camera and microphone stream with graceful fallbacks.
   */
  async startLocalMedia({ video = true, audio = true } = {}) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { max: 24 } } : false,
        audio: audio,
      });

      this.setupSpeakingDetector();
      return { success: true, stream: this.localStream, hasVideo: video, hasAudio: audio };
    } catch (err) {
      console.warn('[WebRTC] Video+Audio acquisition failed, trying audio-only:', err.name);

      // Fallback 1: Audio only
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        this.setupSpeakingDetector();
        return { success: true, stream: this.localStream, hasVideo: false, hasAudio: true };
      } catch (audioErr) {
        console.warn('[WebRTC] Audio acquisition failed (Microphone denied/unavailable):', audioErr.name);
        // Fallback 2: Chat-only (no media)
        this.localStream = new MediaStream();
        if (this.onMediaError) {
          this.onMediaError({
            type: 'PERMISSION_DENIED',
            message: 'Camera and microphone permissions were denied or unavailable. Continuing in chat-only mode.',
          });
        }
        return { success: false, stream: this.localStream, hasVideo: false, hasAudio: false };
      }
    }
  }

  /**
   * Real audio volume level analyser using Web Audio API.
   */
  setupSpeakingDetector() {
    if (!this.localStream || this.localStream.getAudioTracks().length === 0) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.speakingInterval = setInterval(() => {
        if (!this.analyser) return;

        const audioTrack = this.localStream.getAudioTracks()[0];
        if (!audioTrack || !audioTrack.enabled) {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            if (this.onSpeakingChange) this.onSpeakingChange(false);
          }
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const nowSpeaking = average > 18; // Volume threshold

        if (nowSpeaking !== this.isSpeaking) {
          this.isSpeaking = nowSpeaking;
          if (this.onSpeakingChange) this.onSpeakingChange(nowSpeaking);
        }
      }, 200);
    } catch (e) {
      console.warn('[WebRTC] Speaking detector setup error:', e);
    }
  }

  /**
   * Sets up Socket.IO signaling event listeners.
   */
  setupSocketListeners() {
    if (!this.socket) return;

    // Handle Incoming WebRTC Offer
    this.socket.on('webrtc:offer', async ({ senderId, sdp }) => {
      try {
        const pc = this.getOrCreatePeerConnection(senderId);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.socket.emit('webrtc:answer', {
          targetId: senderId,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error('[WebRTC] Error handling offer from', senderId, err);
      }
    });

    // Handle Incoming WebRTC Answer
    this.socket.on('webrtc:answer', async ({ senderId, sdp }) => {
      try {
        const pc = this.peerConnections.get(senderId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      } catch (err) {
        console.error('[WebRTC] Error handling answer from', senderId, err);
      }
    });

    // Handle Incoming ICE Candidate
    this.socket.on('webrtc:ice-candidate', async ({ senderId, candidate }) => {
      try {
        const pc = this.peerConnections.get(senderId);
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.warn('[WebRTC] Error adding ICE candidate from', senderId, err);
      }
    });

    // Handle Participant Left
    this.socket.on('room:participant-left', ({ participantId }) => {
      this.closePeer(participantId);
      if (this.onPeerLeft) this.onPeerLeft(participantId);
    });
  }

  /**
   * Initiates a WebRTC call to a newly joined participant.
   */
  async initiateCall(targetSocketId) {
    try {
      const pc = this.getOrCreatePeerConnection(targetSocketId);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      this.socket.emit('webrtc:offer', {
        targetId: targetSocketId,
        sdp: pc.localDescription,
      });
    } catch (err) {
      console.error('[WebRTC] Error initiating call to', targetSocketId, err);
    }
  }

  /**
   * Creates or returns an existing RTCPeerConnection for target peer.
   */
  getOrCreatePeerConnection(targetId) {
    if (this.peerConnections.has(targetId)) {
      return this.peerConnections.get(targetId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    // ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('webrtc:ice-candidate', {
          targetId,
          candidate: event.candidate,
        });
      }
    };

    // Remote Tracks
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        this.remoteStreams.set(targetId, stream);
        if (this.onRemoteStream) {
          this.onRemoteStream(targetId, stream);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(targetId);
      }
    };

    this.peerConnections.set(targetId, pc);
    return pc;
  }

  /**
   * Toggles microphone audio track on/off.
   */
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = enabled;
      });
    }
  }

  /**
   * Toggles camera video track on/off.
   */
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = enabled;
      });
    }
  }

  /**
   * Closes connection with a specific peer.
   */
  closePeer(targetId) {
    const pc = this.peerConnections.get(targetId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(targetId);
    }
    this.remoteStreams.delete(targetId);
  }

  /**
   * Cleans up all media tracks and peer connections when leaving room.
   */
  cleanup() {
    if (this.speakingInterval) {
      clearInterval(this.speakingInterval);
      this.speakingInterval = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
  }
}
