// /**
//  * socket.js
//  * 
//  * Socket.IO client singleton and lifecycle manager for StudyFlow AI.
//  */

// import { io } from 'socket.io-client';

// let socketInstance = null;

// export function getSocket() {
//   if (!socketInstance) {
//     // In local dev, backend runs on port 5000 or current origin in production
//     const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
//     socketInstance = io(socketUrl, {
//       transports: ['websocket', 'polling'],
//       reconnectionAttempts: 5,
//       reconnectionDelay: 1000,
//       autoConnect: true,
//     });

//     socketInstance.on('connect', () => {
//       console.log('[Socket.IO Client] Connected, id:', socketInstance.id);
//     });

//     socketInstance.on('disconnect', (reason) => {
//       console.log('[Socket.IO Client] Disconnected:', reason);
//     });

//     socketInstance.on('connect_error', (err) => {
//       console.warn('[Socket.IO Client] Connection error:', err.message);
//     });
//   }

//   return socketInstance;
// }

// export function disconnectSocket() {
//   if (socketInstance) {
//     socketInstance.disconnect();
//     socketInstance = null;
//   }
// }


/**
 * socket.js
 *
 * Socket.IO client singleton and lifecycle manager for StudyFlow AI.
 */

import { io } from 'socket.io-client';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    // Use the Render backend in production.
    // Use localhost:5000 during local development.
    const socketUrl =
      import.meta.env.VITE_API_URL ||
      (window.location.hostname === 'localhost'
        ? 'http://localhost:5000'
        : window.location.origin);

    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.IO Client] Connected, id:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket.IO Client] Disconnected:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket.IO Client] Connection error:', err.message);
    });
  }

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}