/**
 * validateViva.js
 * 
 * Defensive client-side structural validator for AI Mock Viva interview payloads,
 * including question generation and semantic answer evaluations.
 */

/**
 * Validates generated Viva questions schema.
 * @param {any} data 
 * @returns {{ isValid: boolean, error?: string, data?: object }}
 */
export function validateVivaQuestions(data) {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Viva questions payload is not a valid JSON object.' };
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    return { isValid: false, error: 'Viva payload must contain a non-empty "questions" array.' };
  }

  const seenIds = new Set();
  const seenQuestions = new Set();

  for (let i = 0; i < data.questions.length; i++) {
    const q = data.questions[i];
    if (!q || typeof q !== 'object') {
      return { isValid: false, error: `Viva question #${i + 1} is not a valid object.` };
    }
    if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) {
      return { isValid: false, error: `Viva question #${i + 1} is missing a question string.` };
    }

    const qNorm = q.question.trim().toLowerCase();
    if (seenQuestions.has(qNorm)) {
      return { isValid: false, error: `Viva question #${i + 1} is a duplicate question.` };
    }
    seenQuestions.add(qNorm);
  }

  const sanitizedQuestions = data.questions.map((q, i) => {
    const qId = q.id && typeof q.id === 'string' && !seenIds.has(q.id) ? q.id : `viva-q-${i + 1}`;
    seenIds.add(qId);
    return {
      id: qId,
      category: typeof q.category === 'string' && q.category.trim() ? q.category.trim() : 'Core Concept',
      question: q.question.trim(),
      type: ['definition', 'explanation', 'comparison', 'why', 'scenario', 'technical'].includes(q.type?.toLowerCase())
        ? q.type.toLowerCase()
        : 'explanation',
      difficulty: ['beginner', 'intermediate', 'advanced', 'easy', 'medium', 'hard'].includes(q.difficulty?.toLowerCase())
        ? (q.difficulty.toLowerCase() === 'easy' ? 'beginner' : q.difficulty.toLowerCase() === 'hard' ? 'advanced' : q.difficulty.toLowerCase())
        : 'intermediate',
      expectedKeyPoints: Array.isArray(q.expectedKeyPoints)
        ? q.expectedKeyPoints.filter((p) => typeof p === 'string' && p.trim().length > 0)
        : [],
    };
  });

  return {
    isValid: true,
    data: {
      title: typeof data.title === 'string' ? data.title.trim() : 'Mock Viva Examination',
      questions: sanitizedQuestions,
    },
  };
}

/**
 * Validates a semantic answer evaluation response from Gemini / backend proxy.
 * @param {any} data 
 * @returns {{ isValid: boolean, error?: string, data?: object }}
 */
export function validateVivaEvaluation(data) {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Viva evaluation payload is not a valid object.' };
  }

  // Fallback safe defaults for metrics
  const evalScores = {
    correctness: typeof data.evaluation?.correctness === 'number' ? Math.min(Math.max(Math.round(data.evaluation.correctness), 0), 10) : 7,
    completeness: typeof data.evaluation?.completeness === 'number' ? Math.min(Math.max(Math.round(data.evaluation.completeness), 0), 10) : 7,
    clarity: typeof data.evaluation?.clarity === 'number' ? Math.min(Math.max(Math.round(data.evaluation.clarity), 0), 10) : 8,
    relevance: typeof data.evaluation?.relevance === 'number' ? Math.min(Math.max(Math.round(data.evaluation.relevance), 0), 10) : 8,
    overall: typeof data.evaluation?.overall === 'number' ? Math.min(Math.max(Math.round(data.evaluation.overall), 0), 10) : 7,
  };

  const classification = ['correct', 'partially_correct', 'incorrect'].includes(data.classification?.toLowerCase())
    ? data.classification.toLowerCase()
    : evalScores.overall >= 8
    ? 'correct'
    : evalScores.overall >= 5
    ? 'partially_correct'
    : 'incorrect';

  const feedback = typeof data.feedback === 'string' && data.feedback.trim().length > 0
    ? data.feedback.trim()
    : classification === 'correct'
    ? 'Well explained. You captured the essential mechanism accurately.'
    : classification === 'partially_correct'
    ? 'Good start. You touched on the main idea, but a few key technical details were left out.'
    : 'You are on the wrong track. Consider the fundamental purpose of this concept.';

  const strengths = Array.isArray(data.strengths)
    ? data.strengths.filter((s) => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
    : ['Demonstrated initial familiarity with the subject.'];

  const missingConcepts = Array.isArray(data.missingConcepts)
    ? data.missingConcepts.filter((m) => typeof m === 'string' && m.trim().length > 0).map((m) => m.trim())
    : [];

  const followUpRequired = Boolean(data.followUpRequired && typeof data.followUpQuestion === 'string' && data.followUpQuestion.trim().length > 0);
  const followUpQuestion = followUpRequired ? data.followUpQuestion.trim() : null;

  return {
    isValid: true,
    data: {
      evaluation: evalScores,
      classification,
      feedback,
      strengths,
      missingConcepts,
      followUpRequired,
      followUpQuestion,
      nextDifficultyAdjustment: ['increase', 'maintain', 'decrease'].includes(data.nextDifficultyAdjustment)
        ? data.nextDifficultyAdjustment
        : 'maintain',
    },
  };
}
