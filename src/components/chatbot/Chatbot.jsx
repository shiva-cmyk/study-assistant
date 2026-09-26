// import React, { useEffect, useState } from "react";
// import "./Chatbot.css"; // Import the CSS file

// const Chatbot = () => {
//     const [isBotpressLoaded, setIsBotpressLoaded] = useState(false);

//     useEffect(() => {
//         // Load Botpress scripts
//         const script1 = document.createElement("script");
//         script1.src = "https://cdn.botpress.cloud/webchat/v2.1/inject.js";
//         script1.async = true;
//         script1.onload = () => {
//             // First script loaded, now load the config script
//             const script2 = document.createElement("script");
//             script2.src =
//                 "https://mediafiles.botpress.cloud/10678383-37cf-4747-a819-770608bffc5e/webchat/v2.1/config.js";
//             script2.async = true;
//             script2.onload = () => {
//                 // Both scripts loaded, set isBotpressLoaded to true
//                 setIsBotpressLoaded(true);
//             };
//             document.body.appendChild(script2);
//         };
//         document.body.appendChild(script1);

//         // Cleanup function to remove scripts and close chatbot
//         return () => {
//             document.body.removeChild(script1);
//             if (window.botpress) {
//                 window.botpress.close();
//             }
//         };
//     }, []);

//     const openChatbot = () => {
//         if (window.botpress) {
//             window.botpress.open();
//         } else {
//             console.error("Botpress is not loaded yet.");
//         }
//     };

//     const closeChatbot = () => {
//         if (window.botpress) {
//             window.botpress.close();
//         } else {
//             console.error("Botpress is not loaded yet.");
//         }
//     };

//     const toggleChatbot = () => {
//         if (window.botpress) {
//             window.botpress.toggle();
//         } else {
//             console.error("Botpress is not loaded yet.");
//         }
//     };

//     return (
//         <div className="bot">
//             {/* Glassmorphism Card */}
//             <div className="bot-card">
//                 <h1>
//                     Chat with <span>DataQueryAI</span>
//                 </h1>
//                 <p className="ask">
//                     Ask anything about your data and get instant insights!
//                 </p>

//                 {/* Button Group */}
//                 <div className="button-group">
//                     <button className="btn blue" onClick={openChatbot} disabled={!isBotpressLoaded}>
//                         Open Chatbot
//                     </button>
//                     <button className="btn yellow" onClick={toggleChatbot} disabled={!isBotpressLoaded}>
//                         Toggle Chatbot
//                     </button>
//                     <button className="btn red" onClick={closeChatbot} disabled={!isBotpressLoaded}>
//                         Close Chatbot
//                     </button>
//                 </div>

//                 {/* Display loading message if Botpress is not loaded yet */}
//                 {!isBotpressLoaded && (
//                     <p className="loading-message">Loading chatbot, please wait...</p>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default Chatbot;

import React, { useEffect, useState } from "react";
import "./Chatbot.css";

const Chatbot = () => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Prevent loading Botpress multiple times
        if (document.getElementById("botpress-inject")) {
            setIsLoaded(true);
            return;
        }

        const script1 = document.createElement("script");
        script1.id = "botpress-inject";
        script1.src =
            "https://cdn.botpress.cloud/webchat/v2.1/inject.js";
        script1.async = true;

        script1.onload = () => {
            const script2 = document.createElement("script");
            script2.id = "botpress-config";
            script2.src =
                "https://mediafiles.botpress.cloud/10678383-37cf-4747-a819-770608bffc5e/webchat/v2.1/config.js";
            script2.async = true;

            script2.onload = () => {
                setIsLoaded(true);
            };

            document.body.appendChild(script2);
        };

        document.body.appendChild(script1);

        return () => {
            // Don't remove scripts when navigating between components
            // because Botpress should remain globally available.
        };
    }, []);

    const openChatbot = () => {
        if (window.botpress) {
            window.botpress.open();
        }
    };

    return (
        <button
            className={`chatbot-floating-button ${!isLoaded ? "loading" : ""
                }`}
            onClick={openChatbot}
            disabled={!isLoaded}
            aria-label="Open StudyFlow AI Assistant"
            title="Ask StudyFlow AI"
        >
            <span className="chatbot-icon">✦</span>

            <span className="chatbot-label">
                AI Assistant
            </span>
        </button>
    );
};

export default Chatbot;