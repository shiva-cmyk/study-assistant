/**
 * api.js
 * 
 * Central frontend API client for communicating with the backend proxy.
 * Ensures the browser NEVER communicates directly with the LLM API.
 * Includes timeout protection, cancellation, and clean error categorization.
 */

import { validateStudySet } from './validateResult';

const API_ENDPOINT = `${import.meta.env.VITE_API_URL || ''}/api/generate`;
const DEFAULT_TIMEOUT_MS = 35000; // 35 seconds safety timeout

/**
 * Custom application error class
 */
export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Sends user notes or topic along with configuration preferences to the backend proxy.
 * 
 * @param {string} input - User notes or topic text
 * @param {object} [config] - Optional study set configuration (difficulty, cardCount, quizCount, mode)
 * @param {AbortSignal} [externalSignal] - Optional external AbortSignal (e.g. from component cancellation)
 * @returns {Promise<object>} Validated StudySet object
 */
export async function generateStudySet(input, config = {}, externalSignal = null) {
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    throw new ApiError('Please enter a topic or paste study notes before generating.', 400);
  }

  // Create timeout controller to guard against slow hanging requests
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error('TIMEOUT'));
  }, DEFAULT_TIMEOUT_MS);

  // Combine external cancellation signal with timeout controller
  const combinedSignal = externalSignal
    ? AbortSignal.any
      ? AbortSignal.any([externalSignal, timeoutController.signal])
      : externalSignal
    : timeoutController.signal;

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: input.trim(),
        config: {
          difficulty: config.difficulty || 'intermediate',
          cardCount: config.cardCount || 8,
          quizCount: config.quizCount || 5,
          mode: config.mode || 'balanced',
        },
      }),
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);

    let json;
    try {
      json = await response.json();
    } catch {
      throw new ApiError(
        'Server returned an unreadable response format.',
        response.status
      );
    }

    if (!response.ok) {
      const serverMessage = json?.error || `Server returned error status ${response.status}`;
      const serverDetails = json?.details || null;
      throw new ApiError(serverMessage, response.status, serverDetails);
    }

    if (!json.success || !json.data) {
      throw new ApiError('Server response is missing payload data.', 422);
    }

    // Defensive client-side structural validation before state update
    const validation = validateStudySet(json.data);
    if (!validation.isValid) {
      throw new ApiError(
        `AI generated output failed validation: ${validation.error}`,
        422
      );
    }

    return validation.data;
  } catch (err) {
    clearTimeout(timeoutId);

    // Differentiate abort types
    if (err.name === 'AbortError' || err.message === 'TIMEOUT' || combinedSignal?.aborted) {
      if (timeoutController.signal.aborted) {
        throw new ApiError(
          'The request took too long. Please try again.',
          408
        );
      }
      throw new ApiError('Request was cancelled.', 499);
    }

    // Network connection errors
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      throw new ApiError(
        'Could not connect to the study generator backend server.',
        503
      );
    }

    if (err instanceof ApiError) {
      throw err;
    }

    throw new ApiError(err.message || 'Something went wrong while generating your study set.', 500);
  }
}
