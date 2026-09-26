
import { GoogleGenerativeAI } from '@google/generative-ai';

/* =========================================================
   ROOM CODE
========================================================= */

/**
 * Generates a clean 6-character room code.
 *
 * Examples:
 * OS4821
 * AI8392
 * SR4821
 */
export function generateRoomCode(topic = '') {
  let prefix = 'SR';

  if (topic && typeof topic === 'string') {
    const lettersOnly = topic
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase();

    if (lettersOnly.length >= 2) {
      prefix = lettersOnly.slice(0, 2);
    }
  }

  const randomDigits = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}${randomDigits}`;
}

/* =========================================================
   MESSAGE SANITIZATION
========================================================= */

/**
 * Sanitizes chat messages to prevent XSS
 * and limits message length.
 */
export function sanitizeMessage(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  return rawText
    .trim()
    .slice(0, 500)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* =========================================================
   STUDY ROOM MANAGER
========================================================= */

export class StudyRoomManager {
  constructor(io, getGeminiApiKey) {
    this.io = io;
    this.getGeminiApiKey = getGeminiApiKey;

    // roomId -> room
    this.rooms = new Map();

    // socketId -> roomId
    this.socketToRoom = new Map();
  }

  /* =======================================================
     GEMINI HELPERS
  ======================================================= */

  /**
   * Returns the Gemini models that should be attempted.
   *
   * Primary:
   * gemini-3.8-flash
   *
   * Fallback:
   * gemini-3.5-flash-lite
   */
  getGeminiModelNames() {
    return [
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
    ];
  }

  /**
   * Determines whether a Gemini error is temporary.
   */
  isRetryableGeminiError(error) {
    const message = error?.message || String(error);

    return (
      message.includes('503') ||
      message.includes('429') ||
      message.includes('UNAVAILABLE') ||
      message.includes('high demand') ||
      message.includes('Service Unavailable') ||
      message.includes('RESOURCE_EXHAUSTED') ||
      message.includes('temporarily unavailable')
    );
  }

  /**
   * Generates text using Gemini with:
   *
   * gemini-3.8-flash
   *        ↓
   * retry
   *        ↓
   * gemini-3.5-flash-lite
   */
  async generateGeminiText({
    apiKey,
    systemInstruction,
    prompt,
    temperature = 0.2,
  }) {
    if (
      !apiKey ||
      apiKey === 'your_gemini_api_key_here' ||
      apiKey.trim() === ''
    ) {
      throw new Error('Gemini API key is missing.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const models = this.getGeminiModelNames();

    let lastError = null;

    for (const modelName of models) {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: {
          temperature,
        },
      });

      // Two attempts per model
      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(
            `[StudyRoomManager] Gemini ${modelName} attempt ${attempt}/${maxAttempts}`
          );

          const result = await model.generateContent(prompt);

          const generatedText =
            result?.response?.text?.()?.trim?.() || '';

          if (!generatedText) {
            throw new Error(
              `Gemini ${modelName} returned an empty response.`
            );
          }

          console.log(
            `[StudyRoomManager] Gemini ${modelName} succeeded`
          );

          return {
            text: generatedText,
            model: modelName,
          };
        } catch (error) {
          lastError = error;

          const errorMessage =
            error?.message || String(error);

          console.warn(
            `[StudyRoomManager] Gemini ${modelName} failed:`,
            errorMessage
          );

          const retryable =
            this.isRetryableGeminiError(error);

          // Don't retry permanent errors.
          if (!retryable) {
            break;
          }

          // Don't wait after final attempt.
          if (attempt === maxAttempts) {
            break;
          }

          const delay = 1000 * Math.pow(2, attempt - 1);

          console.log(
            `[StudyRoomManager] Retrying ${modelName} in ${delay}ms...`
          );

          await new Promise((resolve) =>
            setTimeout(resolve, delay)
          );
        }
      }

      console.warn(
        `[StudyRoomManager] ${modelName} unavailable. Trying fallback model...`
      );
    }

    throw (
      lastError ||
      new Error('All Gemini models failed.')
    );
  }

  /* =======================================================
     CREATE ROOM
  ======================================================= */

  createRoom(
    {
      name,
      topic,
      studySet,
      maxParticipants = 6,
      privacy = 'code',
      hostName = 'Host',
    },
    socket
  ) {
    let roomId = generateRoomCode(topic);

    let attempts = 0;

    while (
      this.rooms.has(roomId) &&
      attempts < 10
    ) {
      roomId = generateRoomCode(topic);
      attempts++;
    }

    const cleanHostName =
      typeof hostName === 'string'
        ? hostName.trim().slice(0, 60)
        : 'Host';

    const safeTopic =
      typeof topic === 'string' && topic.trim()
        ? topic.trim().slice(0, 150)
        : studySet?.title || 'General Study';

    const hostParticipant = {
      id: socket.id,
      name: cleanHostName || 'Host',
      isHost: true,
      micEnabled: true,
      cameraEnabled: true,
      isSpeaking: false,
      joinedAt: Date.now(),
    };

    const quizPool = Array.isArray(studySet?.quiz)
      ? studySet.quiz
      : [];

    const room = {
      id: roomId,

      name:
        typeof name === 'string' && name.trim()
          ? name.trim().slice(0, 100)
          : `${safeTopic} Room`,

      topic: safeTopic,

      studySet:
        studySet || {
          title: safeTopic,
          summary: '',
          cards: [],
          quiz: [],
        },

      maxParticipants: Math.min(
        Math.max(Number(maxParticipants) || 6, 2),
        12
      ),

      privacy:
        privacy === 'invite'
          ? 'invite'
          : 'code',

      hostId: socket.id,

      participants: new Map([
        [socket.id, hostParticipant],
      ]),

      chatMessages: [
        {
          id: `sys-welcome-${Date.now()}`,
          roomId,
          userId: 'system',
          userName: 'StudyFlow System',
          message: `Study Room created for "${safeTopic}". Welcome!`,
          timestamp: new Date().toLocaleTimeString(
            [],
            {
              hour: '2-digit',
              minute: '2-digit',
            }
          ),
          isSystem: true,
        },
      ],

      /* ---------------------------------------------------
         QUIZ
      --------------------------------------------------- */

      quizState: {
        active: false,

        questionIndex: 0,

        questions: quizPool,

        timerSeconds: 30,

        status: 'idle',

        // Current question answers
        answers: new Map(),

        // userId -> score object
        scores: new Map(),

        // Category -> mistakes
        weakCategories: [],

        // Stores all question results.
        //
        // [
        //   {
        //      questionIndex,
        //      question,
        //      category,
        //      results: Map()
        //   }
        // ]
        history: [],
      },

      /* ---------------------------------------------------
         AI CHALLENGE
      --------------------------------------------------- */

      aiChallenge: {
        active: false,
        question: null,
        context: null,
        status: 'idle',
        analysis: null,
      },

      /* ---------------------------------------------------
         GROUP VIVA
      --------------------------------------------------- */

      groupViva: {
        active: false,
        assignedUserId: null,
        assignedUserName: null,
        question: null,
        status: 'idle',
        answer: null,
        evaluation: null,
      },

      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);

    this.socketToRoom.set(
      socket.id,
      roomId
    );

    socket.join(roomId);

    return room;
  }

  /* =======================================================
     JOIN ROOM
  ======================================================= */

  joinRoom(roomId, userName, socket) {
    const cleanRoomId =
      (roomId || '')
        .trim()
        .toUpperCase();

    const room =
      this.rooms.get(cleanRoomId);

    if (!room) {
      return {
        success: false,
        error:
          'Room not found. Please check the room code.',
      };
    }

    if (
      room.participants.size >=
      room.maxParticipants
    ) {
      return {
        success: false,
        error:
          'Room is full. Maximum participants reached.',
      };
    }

    // Prevent the same socket from accidentally
    // being registered in multiple rooms.
    const existingRoomId =
      this.socketToRoom.get(socket.id);

    if (existingRoomId) {
      return {
        success: false,
        error:
          'You are already connected to a study room.',
      };
    }

    const cleanName =
      typeof userName === 'string'
        ? userName.trim().slice(0, 60)
        : '';

    const finalName =
      cleanName ||
      `Student ${room.participants.size + 1}`;

    const participant = {
      id: socket.id,
      name: finalName,
      isHost: false,
      micEnabled: true,
      cameraEnabled: true,
      isSpeaking: false,
      joinedAt: Date.now(),
    };

    room.participants.set(
      socket.id,
      participant
    );

    this.socketToRoom.set(
      socket.id,
      cleanRoomId
    );

    socket.join(cleanRoomId);

    const joinMsg = {
      id: `sys-join-${Date.now()}-${socket.id.slice(0, 4)}`,
      roomId: cleanRoomId,
      userId: 'system',
      userName: 'StudyFlow System',
      message: `${finalName} joined the study room.`,
      timestamp: new Date().toLocaleTimeString(
        [],
        {
          hour: '2-digit',
          minute: '2-digit',
        }
      ),
      isSystem: true,
    };

    room.chatMessages.push(joinMsg);

    return {
      success: true,
      room,
      participant,
      joinMsg,
    };
  }

  /* =======================================================
     LEAVE ROOM
  ======================================================= */

  leaveRoom(socketId) {
    const roomId =
      this.socketToRoom.get(socketId);

    if (!roomId) {
      return null;
    }

    const room =
      this.rooms.get(roomId);

    this.socketToRoom.delete(socketId);

    if (!room) {
      return null;
    }

    const departingParticipant =
      room.participants.get(socketId);

    room.participants.delete(socketId);

    /* ---------------------------------------------------
       ROOM EMPTY
    --------------------------------------------------- */

    if (room.participants.size === 0) {
      this.rooms.delete(roomId);

      return {
        roomId,
        roomEnded: true,
      };
    }

    let newHostId = null;

    /* ---------------------------------------------------
       HOST TRANSFER
    --------------------------------------------------- */

    if (room.hostId === socketId) {
      const nextParticipant =
        room.participants.values().next().value;

      if (nextParticipant) {
        nextParticipant.isHost = true;

        room.hostId =
          nextParticipant.id;

        newHostId =
          nextParticipant.id;
      }
    }

    const leaveMsg = {
      id: `sys-leave-${Date.now()}-${socketId.slice(0, 4)}`,
      roomId,
      userId: 'system',
      userName: 'StudyFlow System',
      message: `${departingParticipant?.name ||
        'A participant'
        } left the study room.`,
      timestamp: new Date().toLocaleTimeString(
        [],
        {
          hour: '2-digit',
          minute: '2-digit',
        }
      ),
      isSystem: true,
    };

    room.chatMessages.push(leaveMsg);

    return {
      roomId,
      departingId: socketId,
      departingName:
        departingParticipant?.name,
      newHostId,
      room,
      leaveMsg,
      roomEnded: false,
    };
  }

  /* =======================================================
     GET ROOM
  ======================================================= */

  getRoom(roomId) {
    return this.rooms.get(
      (roomId || '').toUpperCase()
    );
  }

  /* =======================================================
     SERIALIZABLE ROOM STATE
  ======================================================= */

  getSerializableRoomState(roomId) {
    const room =
      this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    return {
      id: room.id,

      name: room.name,

      topic: room.topic,

      studySet: room.studySet,

      maxParticipants:
        room.maxParticipants,

      privacy: room.privacy,

      hostId: room.hostId,

      participants:
        Array.from(
          room.participants.values()
        ),

      chatMessages:
        room.chatMessages.slice(-60),

      /* ---------------------------------------------------
         QUIZ STATE
      --------------------------------------------------- */

      quizState: {
        active:
          room.quizState.active,

        questionIndex:
          room.quizState.questionIndex,

        totalQuestions:
          room.quizState.questions.length,

        currentQuestion:
          room.quizState.questions[
          room.quizState.questionIndex
          ] || null,

        timerSeconds:
          room.quizState.timerSeconds,

        status:
          room.quizState.status,

        answers:
          Array.from(
            room.quizState.answers.entries()
          ).map(([uid, answer]) => ({
            userId: uid,

            hasSubmitted: true,

            optionIndex:
              room.quizState.status ===
                'question'
                ? null
                : answer.optionIndex,

            isCorrect:
              room.quizState.status ===
                'question'
                ? null
                : answer.isCorrect,
          })),

        scores:
          Array.from(
            room.quizState.scores.entries()
          ).map(([uid, score]) => ({
            userId: uid,
            name: score.name,
            score: score.score,
            total: score.total,
          })),

        weakCategories:
          room.quizState.weakCategories,
      },

      /* ---------------------------------------------------
         AI CHALLENGE
      --------------------------------------------------- */

      aiChallenge:
        room.aiChallenge,

      /* ---------------------------------------------------
         GROUP VIVA
      --------------------------------------------------- */

      groupViva:
        room.groupViva,

      createdAt:
        room.createdAt,
    };
  }

  /* =======================================================
     CHAT
  ======================================================= */

  addChatMessage(
    roomId,
    socketId,
    message,
    userName
  ) {
    const room =
      this.rooms.get(roomId);

    if (!room) {
      return {
        success: false,
        error: 'Room not found.',
      };
    }

    if (
      !room.participants.has(socketId)
    ) {
      return {
        success: false,
        error:
          'You are not a participant in this room.',
      };
    }

    const cleanMessage =
      sanitizeMessage(message);

    if (!cleanMessage) {
      return {
        success: false,
        error:
          'Message cannot be empty.',
      };
    }

    const participant =
      room.participants.get(socketId);

    const chatMessage = {
      id: `msg-${Date.now()}-${socketId.slice(0, 4)}`,

      roomId,

      userId: socketId,

      userName:
        participant?.name ||
        userName ||
        'Student',

      message: cleanMessage,

      timestamp:
        new Date().toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        ),

      isSystem: false,
      isAi: false,
    };

    room.chatMessages.push(chatMessage);

    // Keep memory under control.
    if (room.chatMessages.length > 100) {
      room.chatMessages =
        room.chatMessages.slice(-60);
    }

    return {
      success: true,
      message: chatMessage,
    };
  }

  /* =======================================================
     GROUP QUIZ
  ======================================================= */

  startGroupQuiz(roomId, socketId) {
    const room =
      this.rooms.get(roomId);

    if (!room) {
      return {
        success: false,
        error: 'Room not found',
      };
    }

    if (room.hostId !== socketId) {
      return {
        success: false,
        error:
          'Only the host can start a group quiz.',
      };
    }

    const quizPool =
      Array.isArray(room.studySet?.quiz)
        ? room.studySet.quiz
        : [];

    if (quizPool.length === 0) {
      return {
        success: false,
        error:
          'No quiz questions available in this study set.',
      };
    }

    room.quizState = {
      active: true,

      questionIndex: 0,

      questions: quizPool,

      timerSeconds: 30,

      status: 'question',

      answers: new Map(),

      scores: new Map(),

      weakCategories: [],

      history: [],
    };

    /* ---------------------------------------------------
       INITIALIZE SCORES
    --------------------------------------------------- */

    room.participants.forEach(
      (participant) => {
        room.quizState.scores.set(
          participant.id,
          {
            score: 0,
            total: quizPool.length,
            name: participant.name,
          }
        );
      }
    );

    const quizStartMsg = {
      id: `sys-quiz-${Date.now()}`,

      roomId,

      userId: 'system',

      userName:
        'StudyFlow System',

      message:
        `🎯 Group Quiz started! (${quizPool.length} questions). Get ready!`,

      timestamp:
        new Date().toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        ),

      isSystem: true,
    };

    room.chatMessages.push(
      quizStartMsg
    );

    return {
      success: true,

      roomState:
        this.getSerializableRoomState(
          roomId
        ),

      quizStartMsg,
    };
  }

  /* =======================================================
     SUBMIT QUIZ ANSWER
  ======================================================= */

  submitQuizAnswer(
    roomId,
    socketId,
    optionIndex
  ) {
    const room =
      this.rooms.get(roomId);

    if (
      !room ||
      !room.quizState.active ||
      room.quizState.status !==
      'question'
    ) {
      return {
        success: false,
        error:
          'Quiz is not accepting answers right now.',
      };
    }

    if (
      !room.participants.has(socketId)
    ) {
      return {
        success: false,
        error:
          'You are not a participant in this room.',
      };
    }

    if (
      room.quizState.answers.has(
        socketId
      )
    ) {
      return {
        success: false,
        error:
          'You have already submitted your answer.',
      };
    }

    const currentQ =
      room.quizState.questions[
      room.quizState.questionIndex
      ];

    if (!currentQ) {
      return {
        success: false,
        error:
          'No active question found.',
      };
    }

    const numericOption =
      Number(optionIndex);

    const isValidOption =
      Number.isInteger(numericOption) &&
      numericOption >= 0 &&
      numericOption <
      (currentQ.options?.length || 0);

    if (!isValidOption) {
      return {
        success: false,
        error:
          'Invalid answer option.',
      };
    }

    const correctAnswer =
      Number(currentQ.answer);

    const isCorrect =
      numericOption ===
      correctAnswer;

    /* ---------------------------------------------------
       STORE CURRENT ANSWER
    --------------------------------------------------- */

    const answerRecord = {
      optionIndex: numericOption,

      isCorrect,

      timeTaken: 0,

      category:
        currentQ.category ||
        'Core Concepts',

      questionIndex:
        room.quizState.questionIndex,
    };

    room.quizState.answers.set(
      socketId,
      answerRecord
    );

    /* ---------------------------------------------------
       UPDATE SCORE
    --------------------------------------------------- */

    const participant =
      room.participants.get(
        socketId
      );

    const pScore =
      room.quizState.scores.get(
        socketId
      ) || {
        score: 0,
        total:
          room.quizState.questions.length,
        name:
          participant?.name ||
          'Participant',
      };

    if (isCorrect) {
      pScore.score += 1;
    }

    room.quizState.scores.set(
      socketId,
      pScore
    );

    /* ---------------------------------------------------
       STORE QUESTION HISTORY
    --------------------------------------------------- */

    let historyEntry =
      room.quizState.history.find(
        (entry) =>
          entry.questionIndex ===
          room.quizState.questionIndex
      );

    if (!historyEntry) {
      historyEntry = {
        questionIndex:
          room.quizState.questionIndex,

        question:
          currentQ.question || '',

        category:
          currentQ.category ||
          'Core Concepts',

        results: new Map(),
      };

      room.quizState.history.push(
        historyEntry
      );
    }

    historyEntry.results.set(
      socketId,
      {
        isCorrect,
        optionIndex: numericOption,
      }
    );

    const allAnswered =
      room.quizState.answers.size >=
      room.participants.size;

    return {
      success: true,

      allAnswered,

      roomState:
        this.getSerializableRoomState(
          roomId
        ),
    };
  }

  /* =======================================================
     REVEAL QUIZ
  ======================================================= */

  revealQuizQuestion(
    roomId,
    socketId
  ) {
    const room =
      this.rooms.get(roomId);

    if (
      !room ||
      !room.quizState.active
    ) {
      return {
        success: false,
        error: 'No active quiz',
      };
    }

    // IMPORTANT:
    // Only host can reveal.
    if (room.hostId !== socketId) {
      return {
        success: false,
        error:
          'Only the host can reveal the answer.',
      };
    }

    room.quizState.status =
      'reveal';

    return {
      success: true,

      roomState:
        this.getSerializableRoomState(
          roomId
        ),
    };
  }

  /* =======================================================
     CALCULATE WEAK AREAS
  ======================================================= */

  calculateWeakCategories(room) {
    const categoryStats = {};

    for (
      const historyEntry
      of room.quizState.history
    ) {
      const category =
        historyEntry.category ||
        'Core Concepts';

      if (!categoryStats[category]) {
        categoryStats[category] = {
          total: 0,
          mistakes: 0,
        };
      }

      for (
        const result
        of historyEntry.results.values()
      ) {
        categoryStats[category].total += 1;

        if (!result.isCorrect) {
          categoryStats[category].mistakes += 1;
        }
      }
    }

    return Object.entries(
      categoryStats
    )
      .map(
        ([category, stats]) => ({
          category,

          mistakeCount:
            stats.mistakes,

          totalAttempts:
            stats.total,

          accuracy:
            stats.total > 0
              ? Math.round(
                ((stats.total -
                  stats.mistakes) /
                  stats.total) *
                100
              )
              : 0,
        })
      )
      .sort(
        (a, b) =>
          b.mistakeCount -
          a.mistakeCount
      );
  }

  /* =======================================================
     NEXT QUIZ QUESTION
  ======================================================= */

  nextQuizQuestion(
    roomId,
    socketId
  ) {
    const room =
      this.rooms.get(roomId);

    if (
      !room ||
      !room.quizState.active
    ) {
      return {
        success: false,
        error: 'No active quiz',
      };
    }

    if (room.hostId !== socketId) {
      return {
        success: false,
        error:
          'Only the host can advance the quiz.',
      };
    }

    // Normally require reveal before moving.
    if (
      room.quizState.status !==
      'reveal'
    ) {
      return {
        success: false,
        error:
          'Reveal the current answer before continuing.',
      };
    }

    const nextIndex =
      room.quizState.questionIndex + 1;

    /* ---------------------------------------------------
       MORE QUESTIONS
    --------------------------------------------------- */

    if (
      nextIndex <
      room.quizState.questions.length
    ) {
      room.quizState.questionIndex =
        nextIndex;

      room.quizState.status =
        'question';

      room.quizState.answers.clear();

      return {
        success: true,

        isFinished: false,

        roomState:
          this.getSerializableRoomState(
            roomId
          ),
      };
    }

    /* ---------------------------------------------------
       FINISH QUIZ
    --------------------------------------------------- */

    room.quizState.status =
      'finished';

    room.quizState.active =
      false;

    room.quizState.weakCategories =
      this.calculateWeakCategories(
        room
      );

    const finishMsg = {
      id: `sys-quiz-finish-${Date.now()}`,

      roomId,

      userId: 'system',

      userName:
        'StudyFlow System',

      message:
        '🏆 Group Quiz completed! Review the group performance and weak concepts below.',

      timestamp:
        new Date().toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        ),

      isSystem: true,
    };

    room.chatMessages.push(
      finishMsg
    );

    return {
      success: true,

      isFinished: true,

      roomState:
        this.getSerializableRoomState(
          roomId
        ),

      finishMsg,
    };
  }

  /* =======================================================
     AI STUDY MODERATOR
  ======================================================= */

  async askAiModerator(
    roomId,
    userQuery,
    userName
  ) {
    const room =
      this.rooms.get(roomId);

    if (!room) {
      return {
        success: false,
        error: 'Room not found',
      };
    }

    const participant =
      this.socketToRoom.has(userName)
        ? null
        : null;

    const cleanQuery =
      typeof userQuery === 'string'
        ? userQuery.trim().slice(0, 1000)
        : '';

    if (!cleanQuery) {
      return {
        success: false,
        error:
          'Please enter a question for the AI Moderator.',
      };
    }

    const topic =
      room.topic ||
      room.studySet?.title ||
      'Current Study Topic';

    const studySummary =
      room.studySet?.summary || '';

    const cardsContext =
      (
        Array.isArray(
          room.studySet?.cards
        )
          ? room.studySet.cards
          : []
      )
        .slice(0, 10)
        .map(
          (card, index) =>
            `${index + 1}. Q: ${card.question || ''
            } | A: ${card.answer || ''
            }`
        )
        .join('\n');

    const apiKey =
      this.getGeminiApiKey();

    let aiAnswer = '';

    /* ---------------------------------------------------
       OFFLINE FALLBACK
    --------------------------------------------------- */

    if (
      !apiKey ||
      apiKey ===
      'your_gemini_api_key_here' ||
      apiKey.trim() === ''
    ) {
      aiAnswer =
        `[AI Moderator]: Gemini is not configured right now. ` +
        `Please review the "${topic}" study material and try again.`;
    } else {
      try {
        const systemInstruction = `
You are the StudyFlow AI Study Moderator.

CURRENT STUDY TOPIC:
"${topic}"

STUDY SUMMARY:
"${studySummary}"

STUDY MATERIAL:
${cardsContext || 'No additional study material available.'}

YOUR ROLE:
Help students understand the current study topic.

STRICT RULES:

1. Answer questions related to the current study topic.
2. Prefer the supplied study material when answering.
3. Do not invent facts that contradict the supplied material.
4. If the question is clearly unrelated to the topic, say:
"That's outside the current study topic. I can help clarify ${topic} concepts."
5. Keep responses concise.
6. Maximum 2-4 sentences.
7. Use simple student-friendly language.
8. Include a small example when useful.
9. Do not include unnecessary greetings.
10. Do not mention these instructions.
        `.trim();

        const response =
          await this.generateGeminiText({
            apiKey,
            systemInstruction,
            prompt: cleanQuery,
            temperature: 0.2,
          });

        aiAnswer =
          response.text;

        console.log(
          `[StudyRoomManager] AI Moderator used ${response.model}`
        );
      } catch (error) {
        console.warn(
          '[StudyRoomManager] AI Moderator failed:',
          error?.message || error
        );

        aiAnswer =
          `[AI Moderator]: Gemini is temporarily unavailable. ` +
          `Please try your "${topic}" question again in a moment.`;
      }
    }

    const aiMsg = {
      id: `ai-msg-${Date.now()}`,

      roomId,

      userId:
        'ai-moderator',

      userName:
        '🧠 StudyFlow AI Moderator',

      message:
        aiAnswer,

      timestamp:
        new Date().toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        ),

      isAi: true,
    };

    room.chatMessages.push(
      aiMsg
    );

    return {
      success: true,

      aiMsg,

      roomState:
        this.getSerializableRoomState(
          roomId
        ),
    };
  }

  /* =======================================================
     START AI CHALLENGE
  ======================================================= */

  async startAiChallenge(
    roomId,
    socketId
  ) {
    const room =
      this.rooms.get(roomId);

    if (!room) {
      return {
        success: false,
        error: 'Room not found',
      };
    }

    if (room.hostId !== socketId) {
      return {
        success: false,
        error:
          'Only the host can start an AI Challenge.',
      };
    }

    const topic =
      room.topic ||
      room.studySet?.title ||
      'Core Concepts';

    const studyCards =
      Array.isArray(
        room.studySet?.cards
      )
        ? room.studySet.cards
        : [];

    const cardsContext =
      studyCards
        .slice(0, 8)
        .map(
          (card, index) =>
            `${index + 1}. Q: ${card.question || ''
            } | A: ${card.answer || ''
            }`
        )
        .join('\n');

    const apiKey =
      this.getGeminiApiKey();

    let question = '';

    /* ---------------------------------------------------
       GEMINI CHALLENGE
    --------------------------------------------------- */

    if (
      apiKey &&
      apiKey !==
      'your_gemini_api_key_here' &&
      apiKey.trim() !== ''
    ) {
      try {
        const systemInstruction = `
You are the StudyFlow AI Group Challenge Generator.

CURRENT TOPIC:
"${topic}"

STUDY MATERIAL:
${cardsContext || 'No study cards available.'}

Generate ONE challenging conceptual discussion question.

Requirements:
- It must be related to the topic.
- Prefer the supplied study material.
- Test reasoning, not memorization.
- Encourage multiple students to discuss.
- Ask about trade-offs, scenarios, debugging, design decisions,
  comparisons, or practical application.
- Keep it under 60 words.
- Return ONLY the question.
        `.trim();

        const response =
          await this.generateGeminiText({
            apiKey,
            systemInstruction,
            prompt:
              `Create a group challenge for ${topic}.`,
            temperature: 0.4,
          });

        question =
          response.text.trim();

        console.log(
          `[StudyRoomManager] AI Challenge generated using ${response.model}`
        );
      } catch (error) {
        console.warn(
          '[StudyRoomManager] AI Challenge generation failed:',
          error?.message || error
        );
      }
    }

    /* ---------------------------------------------------
       GENERIC FALLBACK
    --------------------------------------------------- */

    if (!question) {
      if (studyCards.length > 0) {
        question =
          `Based on our study material, explain the most important trade-off in "${topic}" and describe a real-world situation where choosing the wrong approach could cause problems.`;
      } else {
        question =
          `Choose one important concept from ${topic}. Explain how it works, its main trade-offs, and when you would choose an alternative approach.`;
      }
    }

    room.aiChallenge = {
      active: true,

      question,

      context: topic,

      status: 'discussing',

      analysis: null,
    };

    const challengeMsg = {
      id: `ai-chal-${Date.now()}`,

      roomId,

      userId:
        'ai-moderator',

      userName:
        '💡 AI Group Challenge',

      message:
        `Group Challenge: "${question}" — Discuss with your study group over voice/video/chat! When ready, the host can click "Reveal AI Analysis".`,

      timestamp:
        new Date().toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        ),

      isAi: true,
    };

    room.chatMessages.push(
      challengeMsg
    );

    return {
      success: true,

      roomState:
        this.getSerializableRoomState(
          roomId
        ),

      challengeMsg,
    };
  }

  /* =======================================================
     REVEAL AI CHALLENGE ANALYSIS
  ======================================================= */

  async revealAiChallengeAnalysis(
    roomId,
    socketId
  ) {
    const room =
      this.rooms.get(roomId);

    if (
      !room ||
      !room.aiChallenge.active
    ) {
      return {
        success: false,
        error:
          'No active AI challenge',
      };
    }

    if (room.hostId !== socketId) {
      return {
        success: false,
        error:
          'Only the host can reveal AI analysis.',
      };
    }

    const topic =
      room.topic ||
      'Current Topic';

    const challenge =
      room.aiChallenge.question;

    const apiKey =
      this.getGeminiApiKey();

    let analysis = null;

    /* ---------------------------------------------------
       REAL GEMINI ANALYSIS
    --------------------------------------------------- */

    if (
      apiKey &&
      apiKey !==
      'your_gemini_api_key_here' &&
      apiKey.trim() !== ''
    ) {
      try {
        const systemInstruction = `
You are the StudyFlow AI Group Discussion Evaluator.

TOPIC:
"${topic}"

CHALLENGE QUESTION:
"${challenge}"

The students discussed the question verbally and through
the study room.

There is no direct transcript available.

Therefore, do NOT pretend to know exactly what students said.

Instead, provide a useful EXPECTED ANALYSIS of what a strong
answer should contain.

Return valid JSON with exactly this structure:

{
  "conceptsMentioned": [],
  "conceptsMissed": [],
  "correctReasoning": [],
  "misconceptions": [],
  "recommendedReview": []
}

Rules:
- Arrays must contain short strings.
- Do not use markdown.
- Do not invent student-specific claims.
- Focus on what students should discuss to demonstrate understanding.
        `.trim();

        const response =
          await this.generateGeminiText({
            apiKey,
            systemInstruction,
            prompt:
              `Analyze the expected reasoning for this challenge.`,
            temperature: 0.2,
          });

        let raw =
          response.text.trim();

        // Remove markdown JSON fences if Gemini adds them.
        raw = raw
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        try {
          analysis =
            JSON.parse(raw);
        } catch {
          console.warn(
            '[StudyRoomManager] Gemini returned non-JSON AI Challenge analysis.'
          );
        }

        console.log(
          `[StudyRoomManager] AI Challenge analysis generated using ${response.model}`
        );
      } catch (error) {
        console.warn(
          '[StudyRoomManager] AI Challenge analysis failed:',
          error?.message || error
        );
      }
    }

    /* ---------------------------------------------------
       SAFE FALLBACK
    --------------------------------------------------- */

    if (!analysis) {
      analysis = {
        conceptsMentioned: [
          `Core concepts of ${topic}`,
          'Practical application',
          'Trade-offs and limitations',
        ],

        conceptsMissed: [
          'Edge cases',
          'Alternative approaches',
        ],

        correctReasoning: [
          `A strong answer should explain how the main concepts of ${topic} work and when each approach should be used.`,
        ],

        misconceptions: [
          'Choosing an approach without considering the workload or constraints.',
        ],

        recommendedReview: [
          `Review the ${topic} study material.`,
        ],
      };
    }

    room.aiChallenge.status =
      'analyzed';

    room.aiChallenge.analysis =
      analysis;

    const analysisMsg = {
      id: `ai-analysis-${Date.now()}`,

      roomId,

      userId:
        'ai-moderator',

      userName:
        '💡 AI Challenge Analysis',

      message:
        `AI analysis is ready for the "${topic}" challenge. Check the Discussion Summary tab.`,

      timestamp:
        new Date().toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        ),

      isAi: true,
    };

    room.chatMessages.push(
      analysisMsg
    );

    return {
      success: true,

      roomState:
        this.getSerializableRoomState(
          roomId
        ),

      analysisMsg,
    };
  }

  /* =======================================================
     GROUP VIVA
  ======================================================= */

  /**
   * Starts a group viva.
   *
   * Host only.
   */
  async startGroupViva(
    roomId,
    socketId
  ) {
    const room =
      this.rooms.get(roomId);

    if (!room) {
      return {
        success: false,
        error: 'Room not found.',
      };
    }

    if (room.hostId !== socketId) {
      return {
        success: false,
        error:
          'Only the host can start the Group Viva.',
      };
    }

    const participants =
      Array.from(
        room.participants.values()
      );

    if (participants.length === 0) {
      return {
        success: false,
        error:
          'No participants available.',
      };
    }

    // Pick a participant randomly.
    const assignedParticipant =
      participants[
      Math.floor(
        Math.random() *
        participants.length
      )
      ];

    const topic =
      room.topic ||
      room.studySet?.title ||
      'Core Concepts';

    const apiKey =
      this.getGeminiApiKey();

    let question = '';

    if (
      apiKey &&
      apiKey !==
      'your_gemini_api_key_here' &&
      apiKey.trim() !== ''
    ) {
      try {
        const response =
          await this.generateGeminiText({
            apiKey,

            systemInstruction: `
You are an AI viva examiner.

Topic:
"${topic}"

Generate ONE oral examination question.

Requirements:
- Suitable for a college student.
- Test understanding, not memorization.
- Ask a clear conceptual or practical question.
- Keep it under 40 words.
- Return only the question.
            `.trim(),

            prompt:
              `Generate a viva question for ${topic}.`,

            temperature: 0.3,
          });

        question =
          response.text.trim();
      } catch (error) {
        console.warn(
          '[StudyRoomManager] Group Viva question generation failed:',
          error?.message || error
        );
      }
    }

    if (!question) {
      question =
        `Explain the most important concept in ${topic} and give a practical example of where it is used.`;
    }

    room.groupViva = {
      active: true,

      assignedUserId:
        assignedParticipant.id,

      assignedUserName:
        assignedParticipant.name,

      question,

      status: 'answering',

      answer: null,

      evaluation: null,
    };

    const vivaMsg = {
      id: `viva-start-${Date.now()}`,

      roomId,

      userId:
        'ai-moderator',

      userName:
        '🎤 StudyFlow AI Viva',

      message:
        `Viva question for ${assignedParticipant.name}: ${question}`,

      timestamp:
        new Date().toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        ),

      isAi: true,
    };

    room.chatMessages.push(
      vivaMsg
    );

    return {
      success: true,

      roomState:
        this.getSerializableRoomState(
          roomId
        ),

      vivaMsg,
    };
  }

  /* =======================================================
     SUBMIT VIVA ANSWER
  ======================================================= */

  submitGroupVivaAnswer(
    roomId,
    socketId,
    answer
  ) {
    const room =
      this.rooms.get(roomId);

    if (
      !room ||
      !room.groupViva.active
    ) {
      return {
        success: false,
        error:
          'No active Group Viva.',
      };
    }

    if (
      room.groupViva.assignedUserId !==
      socketId
    ) {
      return {
        success: false,
        error:
          'This viva question is assigned to another participant.',
      };
    }

    const cleanAnswer =
      typeof answer === 'string'
        ? answer.trim().slice(0, 3000)
        : '';

    if (!cleanAnswer) {
      return {
        success: false,
        error:
          'Viva answer cannot be empty.',
      };
    }

    room.groupViva.answer =
      cleanAnswer;

    room.groupViva.status =
      'answering';

    return {
      success: true,

      roomState:
        this.getSerializableRoomState(
          roomId
        ),
    };
  }

  /* =======================================================
     EVALUATE GROUP VIVA
  ======================================================= */

  async evaluateGroupViva(
    roomId,
    socketId
  ) {
    const room =
      this.rooms.get(roomId);

    if (
      !room ||
      !room.groupViva.active
    ) {
      return {
        success: false,
        error:
          'No active Group Viva.',
      };
    }

    if (room.hostId !== socketId) {
      return {
        success: false,
        error:
          'Only the host can evaluate the viva.',
      };
    }

    if (!room.groupViva.answer) {
      return {
        success: false,
        error:
          'The participant has not submitted an answer yet.',
      };
    }

    const topic =
      room.topic ||
      'Current Topic';

    const question =
      room.groupViva.question;

    const answer =
      room.groupViva.answer;

    const apiKey =
      this.getGeminiApiKey();

    let evaluation = null;

    if (
      apiKey &&
      apiKey !==
      'your_gemini_api_key_here' &&
      apiKey.trim() !== ''
    ) {
      try {
        const response =
          await this.generateGeminiText({
            apiKey,

            systemInstruction: `
You are a fair AI viva examiner.

Topic:
"${topic}"

Question:
"${question}"

Student answer:
"${answer}"

Evaluate the answer.

Return valid JSON:

{
  "score": 0,
  "maxScore": 10,
  "verdict": "",
  "strengths": [],
  "improvements": [],
  "idealAnswer": ""
}

Rules:
- score must be between 0 and 10.
- Be fair and educational.
- Do not penalize minor grammar mistakes.
- Judge conceptual correctness.
- Arrays should contain short strings.
- Return JSON only.
            `.trim(),

            prompt:
              'Evaluate the student viva answer.',

            temperature: 0.2,
          });

        let raw =
          response.text.trim();

        raw = raw
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        try {
          evaluation =
            JSON.parse(raw);
        } catch {
          console.warn(
            '[StudyRoomManager] Viva evaluation JSON parsing failed.'
          );
        }
      } catch (error) {
        console.warn(
          '[StudyRoomManager] Viva evaluation failed:',
          error?.message || error
        );
      }
    }

    if (!evaluation) {
      evaluation = {
        score: null,

        maxScore: 10,

        verdict:
          'AI evaluation is temporarily unavailable. Please review the answer manually.',

        strengths: [
          'Answer submitted successfully.',
        ],

        improvements: [
          `Review the key concepts of ${topic}.`,
        ],

        idealAnswer:
          'Review the study material for the expected explanation.',
      };
    }

    room.groupViva.status =
      'evaluated';

    room.groupViva.evaluation =
      evaluation;

    const evaluationMsg = {
      id: `viva-eval-${Date.now()}`,

      roomId,

      userId:
        'ai-moderator',

      userName:
        '🎤 StudyFlow AI Viva',

      message:
        `Viva evaluation completed for ${room.groupViva.assignedUserName}. Check the Viva Evaluation panel.`,

      timestamp:
        new Date().toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        ),

      isAi: true,
    };

    room.chatMessages.push(
      evaluationMsg
    );

    return {
      success: true,

      roomState:
        this.getSerializableRoomState(
          roomId
        ),

      evaluationMsg,
    };
  }

  /* =======================================================
     END GROUP VIVA
  ======================================================= */

  endGroupViva(
    roomId,
    socketId
  ) {
    const room =
      this.rooms.get(roomId);

    if (!room) {
      return {
        success: false,
        error: 'Room not found.',
      };
    }

    if (room.hostId !== socketId) {
      return {
        success: false,
        error:
          'Only the host can end the Group Viva.',
      };
    }

    room.groupViva = {
      active: false,

      assignedUserId: null,

      assignedUserName: null,

      question: null,

      status: 'idle',

      answer: null,

      evaluation: null,
    };

    return {
      success: true,

      roomState:
        this.getSerializableRoomState(
          roomId
        ),
    };
  }
}