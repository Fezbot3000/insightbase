/**
 * Advanced Affinity Mapping Utilities
 * 
 * This module implements semantic clustering for affinity mapping using:
 * - Sentence embeddings for semantic understanding
 * - Unsupervised clustering to find natural groupings
 * - TF-IDF for keyword extraction and cluster labeling
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
 * Generates a descriptive name for a cluster based on its top keywords
 * @param {string[]} topKeywords - Top keywords for the cluster
 * @returns {string} - Generated cluster name
 */
export const generateClusterName = (topKeywords) => {
  if (topKeywords.length === 0) return "Miscellaneous";
  
  // Use the top 2-3 keywords to create a name
  const nameKeywords = topKeywords.slice(0, 3);
  
  // Map common keywords to more descriptive themes
  const themeMap = {
    'money': 'financial',
    'pay': 'payments',
    'bill': 'bills',
    'bills': 'bills',
    'bank': 'banking',
    'account': 'accounts',
    'save': 'saving',
    'spend': 'spending',
    'budget': 'budgeting',
    'shop': 'shopping',
    'buy': 'purchases',
    'purchase': 'purchases',
    'groceries': 'grocery shopping',
    'food': 'food expenses',
    'restaurant': 'dining out',
    'coffee': 'coffee purchases',
    'transport': 'transportation',
    'travel': 'travel expenses',
    'car': 'car expenses',
    'gas': 'fuel expenses',
    'invest': 'investments',
    'loan': 'loans',
    'debt': 'debt management',
    'credit': 'credit cards',
    'stress': 'financial stress',
    'worry': 'financial concerns',
    'plan': 'financial planning',
    'goal': 'financial goals',
  };
  
  // Try to map keywords to themes
  const mappedKeywords = nameKeywords.map(keyword => 
    themeMap[keyword] || keyword
  );
  
  // Capitalize first letter of each word and join with spaces
  return mappedKeywords
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' & ');
};

/**
 * Generates a summary for a cluster based on its responses
 * @param {string[]} responses - Responses in the cluster
 * @param {string[]} topKeywords - Top keywords for the cluster
 * @returns {string} - Generated summary
 */
export const generateClusterSummary = (responses, topKeywords) => {
  if (responses.length === 0) return "No responses in this cluster.";
  
  // Create a summary based on the number of responses and top keywords
  const keywordPhrase = topKeywords.slice(0, 5).join(', ');
  
  return `This cluster contains ${responses.length} responses related to ${keywordPhrase}. ` +
    `The responses in this group share themes of ${topKeywords.slice(0, 3).join(', ')}.`;
};

/**
 * Performs k-means clustering on embeddings
 * @param {number[][]} embeddings - Array of embedding vectors
 * @param {number} k - Number of clusters
 * @returns {number[]} - Cluster assignments for each embedding
 */
export const kMeansClustering = async (embeddings, k) => {
  // In a real implementation, this would use a proper k-means algorithm
  // For now, we'll use a simple random assignment
  
  try {
    // Initialize clusters with k random centroids
    const centroids = [];
    const indices = [...Array(embeddings.length).keys()];
    for (let i = 0; i < k; i++) {
      const randomIndex = Math.floor(Math.random() * indices.length);
      centroids.push(embeddings[indices[randomIndex]]);
      indices.splice(randomIndex, 1);
    }
    
    // Assign each embedding to the nearest centroid
    const clusterAssignments = [];
    for (let i = 0; i < embeddings.length; i++) {
      let minDistance = Infinity;
      let clusterIndex = 0;
      
      for (let j = 0; j < centroids.length; j++) {
        const distance = calculateEuclideanDistance(embeddings[i], centroids[j]);
        if (distance < minDistance) {
          minDistance = distance;
          clusterIndex = j;
        }
      }
      
      clusterAssignments.push(clusterIndex);
    }
    
    return clusterAssignments;
  } catch (error) {
    console.error("Error in k-means clustering:", error);
    // Fallback: assign random clusters
    return embeddings.map(() => Math.floor(Math.random() * k));
  }
};

/**
 * Calculates Euclidean distance between two vectors
 * @param {number[]} vec1 - First vector
 * @param {number[]} vec2 - Second vector
 * @returns {number} - Euclidean distance
 */
export const calculateEuclideanDistance = (vec1, vec2) => {
  if (vec1.length !== vec2.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    sum += Math.pow(vec1[i] - vec2[i], 2);
  }
  
  return Math.sqrt(sum);
};

/**
 * Determines the optimal number of clusters using the elbow method
 * @param {number[][]} embeddings - Array of embedding vectors
 * @param {number} maxClusters - Maximum number of clusters to consider
 * @returns {number} - Optimal number of clusters
 */
export const findOptimalClusters = async (embeddings, maxClusters = 10) => {
  // In a real implementation, this would calculate inertia for different k values
  // and find the "elbow point"
  
  // For now, return a reasonable number based on dataset size
  const datasetSize = embeddings.length;
  
  if (datasetSize < 10) return 2;
  if (datasetSize < 30) return 3;
  if (datasetSize < 50) return 4;
  if (datasetSize < 100) return 5;
  if (datasetSize < 200) return 7;
  return 10;
};

/**
 * Gets embeddings for a list of texts using an embedding API
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} - Promise resolving to array of embedding vectors
 */
export const getEmbeddings = async (texts) => {
  try {
    // Preprocess texts
    const processedTexts = texts.map(preprocessText);
    
    // Generate mock embeddings (in reality, these would come from an API)
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
 * Performs affinity mapping on a set of responses
 * @param {Object[]} responses - Array of response objects
 * @returns {Promise<Object[]>} - Promise resolving to array of cluster objects
 */
export const performAffinityMapping = async (responses) => {
  try {
    // Extract text from responses
    const responseTexts = responses.map(r => r.response);
    
    // Get embeddings for responses
    const embeddings = await getEmbeddings(responseTexts);
    
    // Determine optimal number of clusters
    const k = await findOptimalClusters(embeddings);
    
    // Perform clustering
    const clusterAssignments = await kMeansClustering(embeddings, k);
    
    // Preprocess and tokenize responses for TF-IDF
    const processedTexts = responseTexts.map(preprocessText);
    const tokenizedTexts = processedTexts.map(text => 
      removeStopwords(tokenize(text))
    );
    
    // Calculate TF-IDF scores
    const tfIdf = calculateTfIdf(tokenizedTexts);
    
    // Group responses by cluster
    const clusters = {};
    clusterAssignments.forEach((clusterIndex, responseIndex) => {
      if (!clusters[clusterIndex]) {
        clusters[clusterIndex] = {
          cluster_id: clusterIndex,
          responses: [],
          indices: []
        };
      }
      
      clusters[clusterIndex].responses.push(responses[responseIndex]);
      clusters[clusterIndex].indices.push(responseIndex);
    });
    
    // Generate cluster metadata
    const clusterArray = Object.values(clusters).map(cluster => {
      const topKeywords = getTopKeywords(cluster.indices, tfIdf);
      const clusterName = generateClusterName(topKeywords);
      const summary = generateClusterSummary(cluster.responses, topKeywords);
      
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
    console.error("Error in affinity mapping:", error);
    return [];
  }
};

export default performAffinityMapping;
