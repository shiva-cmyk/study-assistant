/**
 * vivaApi.js
 * 
 * Frontend API client for the AI Mock Viva / Oral Interview system.
 * Communicates strictly with the backend proxy on /api/viva/* endpoints.
 */

import { validateVivaQuestions, validateVivaEvaluation } from './validateViva';
import { ApiError } from './api';

const VIVA_GENERATE_ENDPOINT = '/api/viva/generate-questions';
const VIVA_EVALUATE_ENDPOINT = '/api/viva/evaluate';
const DEFAULT_TIMEOUT_MS = 35000;

/**
 * Requests structured viva examination questions grounded in the current study set.
 * 
 * @param {object} studyData - Current study set (title, summary, cards, quiz)
 * @param {object} config - Viva configuration (difficulty, interviewType, questionCount, timeLimit)
 * @param {AbortSignal} [externalSignal]
 * @returns {Promise<object>}
 */
export async function generateVivaQuestions(studyData, config = {}, externalSignal = null) {
  if (!studyData || !studyData.title) {
    throw new ApiError('No active study set found to base the Mock Viva upon.', 400);
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error('TIMEOUT'));
  }, DEFAULT_TIMEOUT_MS);

  const combinedSignal = externalSignal
    ? AbortSignal.any
      ? AbortSignal.any([externalSignal, timeoutController.signal])
      : externalSignal
    : timeoutController.signal;

  try {
    const response = await fetch(VIVA_GENERATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studyData: {
          title: studyData.title,
          summary: studyData.summary,
          topics: studyData.metadata?.topics || [],
          cards: (studyData.cards || []).slice(0, 10).map((c) => ({
            question: c.question,
            answer: c.answer,
            category: c.category,
          })),
        },
        config: {
          difficulty: config.difficulty || 'intermediate',
          interviewType: config.interviewType || 'mixed',
          questionCount: config.questionCount || 5,
        },
      }),
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);

    let json;
    try {
      json = await response.json();
    } catch {
      throw new ApiError('Server returned an invalid JSON response format for Viva questions.', response.status);
    }

    if (!response.ok) {
      throw new ApiError(json?.error || 'Failed to generate Mock Viva questions.', response.status);
    }

    const validation = validateVivaQuestions(json.data);
    if (!validation.isValid) {
      throw new ApiError(`Viva questions failed structural validation: ${validation.error}`, 422);
    }

    return validation.data;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError' || err.message === 'TIMEOUT' || combinedSignal?.aborted) {
      if (timeoutController.signal.aborted) {
        throw new ApiError('Viva question generation timed out. Please try again.', 408);
      }
      throw new ApiError('Viva request was cancelled.', 499);
    }

    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Could not connect to the Mock Viva service.', 500);
  }
}

/**
 * Semantically evaluates a student's verbal explanation against the question criteria.
 * 
 * @param {object} params
 * @param {object} params.studyContext
 * @param {object} params.question
 * @param {string} params.answer
 * @param {boolean} params.isFollowUp
 * @param {Array} params.history
 * @param {AbortSignal} [externalSignal]
 * @returns {Promise<object>}
 */
export async function evaluateVivaAnswer({ studyContext, question, answer, isFollowUp = false, history = [] }, externalSignal = null) {
  if (!answer || answer.trim().length === 0) {
    throw new ApiError('Please provide an answer before submitting for evaluation.', 400);
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error('TIMEOUT'));
  }, DEFAULT_TIMEOUT_MS);

  const combinedSignal = externalSignal
    ? AbortSignal.any
      ? AbortSignal.any([externalSignal, timeoutController.signal])
      : externalSignal
    : timeoutController.signal;

  try {
    const response = await fetch(VIVA_EVALUATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studyContext: {
          title: studyContext?.title || '',
          summary: studyContext?.summary || '',
        },
        question: {
          id: question.id,
          question: question.question,
          category: question.category,
          type: question.type,
          difficulty: question.difficulty,
          expectedKeyPoints: question.expectedKeyPoints || [],
        },
        studentAnswer: answer.trim(),
        isFollowUp,
        history: (history || []).slice(-4), // Send last 4 Q&As for conversation context
      }),
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);

    let json;
    try {
      json = await response.json();
    } catch {
      throw new ApiError('Invalid response received while evaluating answer.', response.status);
    }

    if (!response.ok) {
      throw new ApiError(json?.error || 'Failed to evaluate answer.', response.status);
    }

    const validation = validateVivaEvaluation(json.data);
    if (!validation.isValid) {
      throw new ApiError(`Evaluation failed structural validation: ${validation.error}`, 422);
    }

    return validation.data;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError' || err.message === 'TIMEOUT' || combinedSignal?.aborted) {
      if (timeoutController.signal.aborted) {
        throw new ApiError('Answer evaluation timed out. Please try again.', 408);
      }
      throw new ApiError('Evaluation request was cancelled.', 499);
    }

    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Could not connect to the evaluator.', 500);
  }
}
