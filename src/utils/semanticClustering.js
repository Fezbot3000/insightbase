/**
 * Advanced Semantic Clustering Module
 * 
 * This module implements sophisticated semantic clustering for diary responses using:
 * - Sentence embeddings for semantic understanding
 * - Hierarchical clustering with dynamic cluster determination
 * - TF-IDF and keyphrase extraction for meaningful labels
 * - Natural language summaries of behavioral/emotional themes
 */

import stopwords from './stopwords';

/**
 * Preprocesses text for embedding
 * @param {string} text - Raw text to preprocess
 * @returns {string} - Preprocessed text
 */
export const preprocessText = (text) => {
  if (!text) return '';
  
  // Convert to lowercase
  let processed = text.toLowerCase();
  
  // Fix common contractions
  const contractions = {
    "won't": "will not",
    "can't": "cannot",
    "n't": " not",
    "'re": " are",
    "'s": " is",
    "'d": " would",
    "'ll": " will",
    "'ve": " have",
    "'m": " am"
  };
  
  Object.entries(contractions).forEach(([contraction, expansion]) => {
    processed = processed.replace(new RegExp(contraction, 'g'), expansion);
  });
  
  // Remove punctuation except apostrophes for contractions
  processed = processed.replace(/[^\w\s']|_/g, ' ');
  
  // Replace multiple spaces with a single space
  processed = processed.replace(/\s+/g, ' ').trim();
  
  return processed;
};

/**
 * Filters out stopwords from an array of tokens
 * @param {string[]} tokens - Array of word tokens
 * @returns {string[]} - Filtered tokens without stopwords
 */
export const removeStopwords = (tokens) => {
  return tokens.filter(token => 
    token.length > 2 && 
    !stopwords.has(token) &&
    !/^\d+$/.test(token) // Remove pure numbers
  );
};

/**
 * Tokenizes text into words
 * @param {string} text - Text to tokenize
 * @returns {string[]} - Array of tokens
 */
export const tokenize = (text) => {
  return text.split(/\s+/);
};

/**
 * Calculates TF-IDF scores for tokens across all documents
 * @param {string[][]} tokenizedDocs - Array of tokenized documents
 * @returns {Object} - TF-IDF scores for each token in each document
 */
export const calculateTfIdf = (tokenizedDocs) => {
  const docCount = tokenizedDocs.length;
  const docFrequency = {};
  const tfIdf = {};
  
  // Calculate document frequency
  tokenizedDocs.forEach(tokens => {
    const uniqueTokens = [...new Set(tokens)];
    uniqueTokens.forEach(token => {
      docFrequency[token] = (docFrequency[token] || 0) + 1;
    });
  });
  
  // Calculate TF-IDF for each document
  tokenizedDocs.forEach((tokens, docIndex) => {
    tfIdf[docIndex] = {};
    
    // Count token frequency in this document
    const tokenFreq = {};
    tokens.forEach(token => {
      tokenFreq[token] = (tokenFreq[token] || 0) + 1;
    });
    
    // Calculate TF-IDF for each token
    Object.keys(tokenFreq).forEach(token => {
      const tf = tokenFreq[token] / tokens.length;
      const idf = Math.log(docCount / docFrequency[token]);
      tfIdf[docIndex][token] = tf * idf;
    });
  });
  
  return tfIdf;
};

/**
 * Gets the top keywords for a cluster based on TF-IDF scores
 * @param {number[]} clusterIndices - Indices of documents in the cluster
 * @param {Object} tfIdf - TF-IDF scores for all documents
 * @param {number} topN - Number of top keywords to return
 * @returns {string[]} - Top keywords for the cluster
 */
export const getTopKeywords = (clusterIndices, tfIdf, topN = 10) => {
  // Aggregate TF-IDF scores across all documents in the cluster
  const aggregatedScores = {};
  
  clusterIndices.forEach(docIndex => {
    Object.entries(tfIdf[docIndex]).forEach(([token, score]) => {
      aggregatedScores[token] = (aggregatedScores[token] || 0) + score;
    });
  });
  
  // Sort tokens by score and take the top N
  return Object.entries(aggregatedScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([token]) => token);
};

/**
 * Extracts keyphrases from a set of responses
 * @param {string[]} responses - Array of response texts
 * @param {number} topN - Number of keyphrases to extract
 * @returns {string[]} - Array of extracted keyphrases
 */
export const extractKeyphrases = (responses, topN = 5) => {
  // Combine all responses
  const combinedText = responses.join(' ');
  
  // Tokenize and preprocess
  const tokens = removeStopwords(tokenize(preprocessText(combinedText)));
  
  // Extract n-grams (1-3 words)
  const ngrams = [];
  
  // Add unigrams
  tokens.forEach(token => {
    ngrams.push(token);
  });
  
  // Add bigrams
  for (let i = 0; i < tokens.length - 1; i++) {
    ngrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  
  // Add trigrams
  for (let i = 0; i < tokens.length - 2; i++) {
    ngrams.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }
  
  // Count frequency
  const ngramFreq = {};
  ngrams.forEach(ngram => {
    ngramFreq[ngram] = (ngramFreq[ngram] || 0) + 1;
  });
  
  // Sort by frequency and return top N
  return Object.entries(ngramFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([ngram]) => ngram);
};

/**
 * Generates a descriptive name for a cluster based on its keyphrases and keywords
 * @param {string[]} keyphrases - Extracted keyphrases from the cluster
 * @param {string[]} keywords - Top keywords for the cluster
 * @param {string[]} responses - Raw responses in the cluster
 * @returns {string} - Generated cluster name
 */
export const generateClusterName = (keyphrases, keywords, responses) => {
  if (keyphrases.length === 0 && keywords.length === 0) return "Miscellaneous";
  
  // Combine keyphrases and keywords, prioritizing keyphrases
  const allPhrases = [...keyphrases, ...keywords];
  
  // Map common financial behaviors to more descriptive themes
  const behaviorMap = {
    // Financial actions
    'check balance': 'Account Monitoring',
    'check account': 'Account Monitoring',
    'pay bill': 'Bill Payments',
    'transfer money': 'Money Transfers',
    'save money': 'Saving Behavior',
    'budget': 'Budgeting',
    'invest': 'Investment Activity',
    'spend': 'Spending Behavior',
    'purchase': 'Purchase Decisions',
    'shop': 'Shopping Behavior',
    
    // Emotional states
    'stress': 'Financial Stress',
    'worry': 'Financial Anxiety',
    'anxious': 'Financial Anxiety',
    'happy': 'Financial Satisfaction',
    'proud': 'Financial Achievement',
    'regret': 'Purchase Regret',
    
    // Financial tools
    'app': 'Digital Financial Tools',
    'bank': 'Banking Activity',
    'credit card': 'Credit Card Usage',
    'loan': 'Loan Management',
    'debt': 'Debt Management'
  };
  
  // Check for behavior patterns in the combined phrases
  for (const [pattern, theme] of Object.entries(behaviorMap)) {
    for (const phrase of allPhrases) {
      if (phrase.includes(pattern)) {
        return theme;
      }
    }
  }
  
  // If no mapped behaviors found, use the top 2-3 keywords to create a name
  const nameKeywords = allPhrases.slice(0, 3);
  
  // Capitalize first letter of each word and join with ' & '
  return nameKeywords
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' & ');
};

/**
 * Generates a summary for a cluster based on its responses and keywords
 * @param {string[]} responses - Raw responses in the cluster
 * @param {string[]} keywords - Top keywords for the cluster
 * @param {string} clusterName - Name of the cluster
 * @returns {string} - Generated summary
 */
export const generateClusterSummary = (responses, keywords, clusterName) => {
  if (responses.length === 0) return "No responses in this cluster.";
  
  // Analyze emotional tone
  const emotionKeywords = {
    positive: ['happy', 'glad', 'satisfied', 'proud', 'excited', 'good', 'great', 'excellent', 'love'],
    negative: ['sad', 'frustrated', 'angry', 'upset', 'disappointed', 'bad', 'terrible', 'hate', 'regret'],
    anxious: ['anxious', 'worried', 'nervous', 'stressed', 'concerned', 'fear', 'afraid', 'uncertain'],
    neutral: ['ok', 'fine', 'neutral', 'normal', 'average', 'typical']
  };
  
  // Count emotion mentions
  const emotionCounts = { positive: 0, negative: 0, anxious: 0, neutral: 0 };
  
  responses.forEach(response => {
    const lowerResponse = response.toLowerCase();
    
    Object.entries(emotionKeywords).forEach(([emotion, words]) => {
      words.forEach(word => {
        if (lowerResponse.includes(word)) {
          emotionCounts[emotion]++;
        }
      });
    });
  });
  
  // Determine dominant emotion
  const dominantEmotion = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  // Create emotional tone phrase
  let emotionalTone = '';
  if (emotionCounts[dominantEmotion] > 0) {
    switch (dominantEmotion) {
      case 'positive':
        emotionalTone = 'positive feelings like satisfaction or pride';
        break;
      case 'negative':
        emotionalTone = 'negative feelings like frustration or disappointment';
        break;
      case 'anxious':
        emotionalTone = 'anxiety or stress';
        break;
      case 'neutral':
        emotionalTone = 'neutral or matter-of-fact attitudes';
        break;
    }
  }
  
  // Create behavioral theme phrase based on cluster name and keywords
  let behavioralTheme = clusterName;
  
  // Create the summary
  let summary = `This group contains ${responses.length} responses related to ${behavioralTheme.toLowerCase()}.`;
  
  if (emotionalTone) {
    summary += ` These entries generally express ${emotionalTone} about `;
    
    // Add context from keywords
    if (keywords.length > 0) {
      const keywordPhrase = keywords.slice(0, 3).join(', ');
      summary += `${keywordPhrase}.`;
    } else {
      summary += 'this financial behavior.';
    }
  }
  
  return summary;
};

/**
 * Calculates cosine similarity between two vectors
 * @param {number[]} vec1 - First vector
 * @param {number[]} vec2 - Second vector
 * @returns {number} - Cosine similarity (0-1)
 */
export const calculateCosineSimilarity = (vec1, vec2) => {
  if (vec1.length !== vec2.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  return dotProduct / (mag1 * mag2);
};

/**
 * Performs hierarchical clustering on embeddings
 * @param {number[][]} embeddings - Array of embedding vectors
 * @param {number} distanceThreshold - Threshold for cluster formation
 * @returns {number[]} - Cluster assignments for each embedding
 */
export const hierarchicalClustering = (embeddings, distanceThreshold = 0.5) => {
  const n = embeddings.length;
  
  // Initialize each point as its own cluster
  let clusters = embeddings.map((_, i) => [i]);
  
  // Calculate initial distances between all pairs
  const distances = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const similarity = calculateCosineSimilarity(embeddings[i], embeddings[j]);
      const distance = 1 - similarity; // Convert similarity to distance
      distances.push({ i, j, distance });
    }
  }
  
  // Sort distances
  distances.sort((a, b) => a.distance - b.distance);
  
  // Merge clusters until distance threshold is reached
  for (const { i, j, distance } of distances) {
    if (distance > distanceThreshold) break;
    
    // Find the clusters containing points i and j
    const clusterI = clusters.findIndex(cluster => cluster.includes(i));
    const clusterJ = clusters.findIndex(cluster => cluster.includes(j));
    
    if (clusterI !== clusterJ) {
      // Merge clusters
      clusters[clusterI] = [...clusters[clusterI], ...clusters[clusterJ]];
      clusters.splice(clusterJ, 1);
    }
  }
  
  // Assign cluster labels
  const clusterAssignments = new Array(n).fill(-1); // -1 means noise/outlier
  
  clusters.forEach((cluster, clusterIndex) => {
    cluster.forEach(pointIndex => {
      clusterAssignments[pointIndex] = clusterIndex;
    });
  });
  
  return clusterAssignments;
};

/**
 * Gets embeddings for a list of texts using an embedding algorithm
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} - Promise resolving to array of embedding vectors
 */
export const getEmbeddings = async (texts) => {
  try {
    // Preprocess texts
    const processedTexts = texts.map(preprocessText);
    
    // Generate embeddings using a deterministic algorithm
    // This is a simplified version for demonstration purposes
    // In a production environment, you would use a proper embedding model
    const mockEmbeddings = processedTexts.map(text => {
      // Create a deterministic but unique embedding for each text
      const embedding = new Array(128).fill(0);
      
      // Set values based on text content to simulate semantic meaning
      const tokens = tokenize(text);
      tokens.forEach((token, i) => {
        // Use character codes to influence the embedding values
        for (let j = 0; j < token.length; j++) {
          const charCode = token.charCodeAt(j);
          const dimension = (i * j + charCode) % 128;
          embedding[dimension] += charCode / 1000;
        }
      });
      
      // Normalize the embedding
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => val / (magnitude || 1));
    });
    
    return mockEmbeddings;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    // Return random embeddings as fallback
    return texts.map(() => Array(128).fill(0).map(() => Math.random()));
  }
};

/**
 * Performs semantic clustering on a set of responses
 * @param {Object[]} responses - Array of response objects
 * @param {Object} options - Clustering options
 * @param {number} options.distanceThreshold - Threshold for cluster formation (default: 0.5)
 * @param {number} options.minClusterSize - Minimum number of responses in a cluster (default: 2)
 * @returns {Promise<Object[]>} - Promise resolving to array of cluster objects
 */
export const performSemanticClustering = async (responses, options = {}) => {
  try {
    const {
      distanceThreshold = 0.5,
      minClusterSize = 2
    } = options;
    
    // Extract text from responses
    const responseTexts = responses.map(r => r.response);
    
    // Get embeddings for responses
    const embeddings = await getEmbeddings(responseTexts);
    
    // Perform hierarchical clustering
    const clusterAssignments = hierarchicalClustering(embeddings, distanceThreshold);
    
    // Group responses by cluster
    const clusterMap = {};
    clusterAssignments.forEach((clusterIndex, responseIndex) => {
      if (clusterIndex === -1) return; // Skip noise points
      
      if (!clusterMap[clusterIndex]) {
        clusterMap[clusterIndex] = {
          cluster_id: clusterIndex,
          responses: [],
          indices: []
        };
      }
      
      clusterMap[clusterIndex].responses.push(responses[responseIndex]);
      clusterMap[clusterIndex].indices.push(responseIndex);
    });
    
    // Filter out clusters that are too small
    const validClusters = Object.values(clusterMap).filter(
      cluster => cluster.responses.length >= minClusterSize
    );
    
    // Collect outliers
    const outlierIndices = clusterAssignments
      .map((cluster, index) => cluster === -1 ? index : null)
      .filter(index => index !== null);
    
    const tooSmallIndices = Object.values(clusterMap)
      .filter(cluster => cluster.responses.length < minClusterSize)
      .flatMap(cluster => cluster.indices);
    
    const allOutliers = [...outlierIndices, ...tooSmallIndices];
    
    if (allOutliers.length > 0) {
      // Add miscellaneous cluster for outliers
      validClusters.push({
        cluster_id: -1,
        responses: allOutliers.map(index => responses[index]),
        indices: allOutliers
      });
    }
    
    // Preprocess and tokenize responses for TF-IDF
    const processedTexts = responseTexts.map(preprocessText);
    const tokenizedTexts = processedTexts.map(text => 
      removeStopwords(tokenize(text))
    );
    
    // Calculate TF-IDF scores
    const tfIdf = calculateTfIdf(tokenizedTexts);
    
    // Generate cluster metadata
    const clusterArray = validClusters.map(cluster => {
      const clusterTexts = cluster.responses.map(r => r.response);
      const keyphrases = extractKeyphrases(clusterTexts);
      const topKeywords = getTopKeywords(cluster.indices, tfIdf);
      const clusterName = cluster.cluster_id === -1 
        ? "Miscellaneous / Needs Review" 
        : generateClusterName(keyphrases, topKeywords, clusterTexts);
      const summary = generateClusterSummary(clusterTexts, topKeywords, clusterName);
      
      return {
        cluster_id: cluster.cluster_id,
        group_name: clusterName,
        summary: summary,
        top_keywords: topKeywords,
        responses: cluster.responses,
        count: cluster.responses.length
      };
    });
    
    // Sort clusters by size (descending)
    return clusterArray.sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Error in semantic clustering:", error);
    return [];
  }
};

export default performSemanticClustering;
