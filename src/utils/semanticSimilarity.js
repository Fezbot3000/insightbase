/**
 * Semantic Similarity Utility
 * 
 * This utility provides functions for calculating semantic similarity between texts
 * using a simplified vector-based approach that doesn't require external model loading.
 */

import stopwords from './stopwords';

/**
 * Extract keywords from text
 * @param {string} text - Text to extract keywords from
 * @param {number} maxKeywords - Maximum number of keywords to extract
 * @returns {string[]} Array of keywords
 */
export const extractKeywords = (text, maxKeywords = 5) => {
  if (!text) return [];
  
  // Remove stopwords
  const processedText = removeStopwords(text);
  
  // Split into words
  const words = processedText.split(/\s+/).filter(word => word.length > 2);
  
  // Count word frequencies
  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  // Sort by frequency
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
  
  return sortedWords;
};

/**
 * Remove stopwords from text
 * @param {string} text - Text to process
 * @returns {string} Text with stopwords removed
 */
export const removeStopwords = (text) => {
  if (!text) return '';
  
  // Convert to lowercase and split into words
  const words = text.toLowerCase().split(/\s+/);
  
  // Filter out stopwords
  const filteredWords = words.filter(word => !stopwords.has(word));
  
  // Join back into a string
  return filteredWords.join(' ');
};

/**
 * Preprocess text for embedding
 * @param {string} text - Text to preprocess
 * @returns {string} Preprocessed text
 */
export const preprocessText = (text) => {
  if (!text) return '';
  
  // Convert to lowercase
  let processed = text.toLowerCase();
  
  // Remove punctuation
  processed = processed.replace(/[^\w\s]/g, ' ');
  
  // Replace multiple spaces with a single space
  processed = processed.replace(/\s+/g, ' ').trim();
  
  return processed;
};

/**
 * Generate a simple term frequency vector for a text
 * @param {string} text - Text to vectorize
 * @returns {Object} Term frequency vector
 */
export const generateVector = (text) => {
  if (!text) return {};
  
  // Preprocess text
  const processed = preprocessText(text);
  
  // Remove stopwords
  const withoutStopwords = removeStopwords(processed);
  
  // Split into words
  const words = withoutStopwords.split(/\s+/).filter(word => word.length > 2);
  
  // Create term frequency vector
  const vector = {};
  words.forEach(word => {
    vector[word] = (vector[word] || 0) + 1;
  });
  
  return vector;
};

/**
 * Calculate cosine similarity between two term frequency vectors
 * @param {Object} vec1 - First vector
 * @param {Object} vec2 - Second vector
 * @returns {number} Cosine similarity (between 0 and 1)
 */
export const cosineSimilarity = (vec1, vec2) => {
  // Handle empty vectors
  if (Object.keys(vec1).length === 0 || Object.keys(vec2).length === 0) {
    return 0;
  }
  
  // Calculate dot product
  let dotProduct = 0;
  for (const term in vec1) {
    if (vec2[term]) {
      dotProduct += vec1[term] * vec2[term];
    }
  }
  
  // Calculate magnitudes
  let mag1 = 0;
  for (const term in vec1) {
    mag1 += vec1[term] * vec1[term];
  }
  mag1 = Math.sqrt(mag1);
  
  let mag2 = 0;
  for (const term in vec2) {
    mag2 += vec2[term] * vec2[term];
  }
  mag2 = Math.sqrt(mag2);
  
  // Calculate cosine similarity
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  
  return dotProduct / (mag1 * mag2);
};

/**
 * Calculate semantic similarity between two texts
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Similarity score (between 0 and 1)
 */
export const calculateSimilarity = (text1, text2) => {
  // Generate vectors
  const vec1 = generateVector(text1);
  const vec2 = generateVector(text2);
  
  // Calculate cosine similarity
  return cosineSimilarity(vec1, vec2);
};

/**
 * Generate a summary for a group of texts
 * @param {string[]} texts - Array of texts to summarize
 * @returns {string} Summary
 */
export const generateGroupSummary = (texts) => {
  if (!texts || texts.length === 0) {
    return 'No responses in this group';
  }
  
  // Combine all texts
  const combinedText = texts.join(' ');
  
  // Extract keywords
  const keywords = extractKeywords(combinedText, 5);
  
  if (keywords.length === 0) {
    return 'This group contains responses with similar content';
  }
  
  // Generate summary based on keywords
  return `This group contains responses related to ${keywords.join(', ')}`;
};

/**
 * Generate a name for a group based on its most distinctive keywords
 * @param {string[]} texts - Array of texts in the group
 * @param {string[][]} otherGroupKeywords - Keywords from other groups
 * @returns {string} Group name
 */
export const generateGroupName = (texts, otherGroupKeywords = []) => {
  if (!texts || texts.length === 0) {
    return 'Empty Group';
  }
  
  // Combine all texts
  const combinedText = texts.join(' ');
  
  // Extract keywords
  const keywords = extractKeywords(combinedText, 10);
  
  if (keywords.length === 0) {
    return 'Group';
  }
  
  // Find most distinctive keyword (least common in other groups)
  let bestKeyword = keywords[0];
  let lowestCommonality = Infinity;
  
  keywords.forEach(keyword => {
    // Count how many other groups contain this keyword
    const commonality = otherGroupKeywords.filter(
      groupKeywords => groupKeywords.includes(keyword)
    ).length;
    
    if (commonality < lowestCommonality) {
      lowestCommonality = commonality;
      bestKeyword = keyword;
    }
  });
  
  // Capitalize first letter
  return bestKeyword.charAt(0).toUpperCase() + bestKeyword.slice(1);
};

/**
 * Calculate similarity between a text and a group of texts
 * @param {string} text - Text to compare
 * @param {string[]} groupTexts - Group of texts to compare against
 * @returns {number} Average similarity score
 */
export const calculateGroupSimilarity = (text, groupTexts) => {
  if (!text || !groupTexts || groupTexts.length === 0) {
    return 0;
  }
  
  // Generate vector for the text
  const textVector = generateVector(text);
  
  // Calculate similarity with each text in the group
  let totalSimilarity = 0;
  
  for (const groupText of groupTexts) {
    const groupVector = generateVector(groupText);
    const similarity = cosineSimilarity(textVector, groupVector);
    totalSimilarity += similarity;
  }
  
  // Return average similarity
  return totalSimilarity / groupTexts.length;
};

export default {
  extractKeywords,
  removeStopwords,
  preprocessText,
  generateVector,
  cosineSimilarity,
  calculateSimilarity,
  generateGroupSummary,
  generateGroupName,
  calculateGroupSimilarity
};
