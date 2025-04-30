/**
 * Analysis Mapping Utility
 * 
 * Implements a complete processing pipeline for diary responses:
 * 1. Normalize & Preprocess Responses
 * 2. Assign Mood Labels
 * 3. Generate Sentence Embeddings
 * 4. Cluster Responses by Semantic Similarity
 * 5. Label & Summarize Clusters
 * 6. Map User-Level Timelines
 * 7. Analyze Task-Mood Relationships
 */

import stopwords from './stopwords';

// Natural language processing helpers
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

// Step 1: Normalize & Preprocess Responses
export const preprocessText = (text) => {
  if (!text) return '';
  
  // Convert to lowercase
  let processed = text.toLowerCase();
  
  // Expand contractions
  Object.keys(contractions).forEach(contraction => {
    processed = processed.replace(new RegExp(contraction, 'g'), contractions[contraction]);
  });
  
  // Remove special characters but keep spaces between words
  processed = processed.replace(/[^\w\s]|_/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Remove stopwords
  const words = processed.split(' ');
  const filteredWords = words.filter(word => {
    // Keep negations like "not", "no", "never"
    if (word === 'not' || word === 'no' || word === 'never') return true;
    return !stopwords.includes(word);
  });
  
  // Simple lemmatization (just a few examples, a real implementation would use a proper NLP library)
  const lemmatized = filteredWords.map(word => {
    if (word.endsWith('ing')) return word.slice(0, -3);
    if (word.endsWith('ed') && word.length > 3) return word.slice(0, -2);
    if (word.endsWith('s') && !word.endsWith('ss') && word.length > 2) return word.slice(0, -1);
    return word;
  });
  
  return lemmatized.join(' ');
};

// Step 2: Assign Mood Labels
export const identifyMood = (text) => {
  if (!text) return 'neutral';
  
  const lowerText = text.toLowerCase();
  
  // Define mood keywords
  const moodKeywords = {
    positive: ['happy', 'excited', 'good', 'great', 'excellent', 'joy', 'pleased', 'satisfied', 'content', 'delighted', 'optimistic', 'confident', 'proud'],
    negative: ['sad', 'unhappy', 'bad', 'terrible', 'awful', 'miserable', 'disappointed', 'upset', 'frustrated', 'angry', 'annoyed', 'irritated', 'depressed'],
    anxious: ['worried', 'anxious', 'nervous', 'stressed', 'overwhelmed', 'concerned', 'fear', 'afraid', 'panic', 'uneasy', 'apprehensive', 'tense', 'dread']
  };
  
  // Count occurrences of mood keywords
  const moodCounts = {
    positive: 0,
    negative: 0,
    anxious: 0
  };
  
  // Check for negations
  const negations = ['not', 'no', 'never', "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't"];
  const hasNegation = negations.some(neg => lowerText.includes(neg));
  
  // Count mood keywords
  Object.keys(moodKeywords).forEach(mood => {
    moodKeywords[mood].forEach(keyword => {
      // Simple regex to find whole words
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) {
        moodCounts[mood] += matches.length;
      }
    });
  });
  
  // Adjust for negations (very simplified)
  if (hasNegation) {
    // If negation is present, reduce positive scores and increase negative ones
    moodCounts.positive = Math.max(0, moodCounts.positive - 1);
    moodCounts.negative += 1;
  }
  
  // Determine the dominant mood
  const maxMood = Object.keys(moodCounts).reduce((a, b) => 
    moodCounts[a] > moodCounts[b] ? a : b
  );
  
  // If no mood is detected, return neutral
  return moodCounts[maxMood] > 0 ? maxMood : 'neutral';
};

// Step 3: Generate Sentence Embeddings (simplified version)
export const generateEmbeddings = (responses) => {
  // In a real implementation, this would use a transformer model
  // Here we'll use a simplified approach based on word overlap
  
  return responses.map(response => {
    const text = response.response;
    const processedText = preprocessText(text);
    const words = processedText.split(' ');
    
    // Create a simple "embedding" based on word presence (1) or absence (0)
    // This is just a placeholder for the real embedding process
    const uniqueWords = [...new Set(words)];
    
    // Return the response with its "embedding"
    return {
      ...response,
      embedding: uniqueWords,
      processedText
    };
  });
};

// Step 4: Cluster Responses by Semantic Similarity
export const clusterResponses = (embeddedResponses, options = {}) => {
  const { distanceThreshold = 0.4, minClusterSize = 2 } = options;
  
  // Calculate similarity matrix
  const similarityMatrix = [];
  for (let i = 0; i < embeddedResponses.length; i++) {
    similarityMatrix[i] = [];
    for (let j = 0; j < embeddedResponses.length; j++) {
      if (i === j) {
        similarityMatrix[i][j] = 1; // Same document has perfect similarity
      } else {
        // Calculate Jaccard similarity between embeddings
        const set1 = new Set(embeddedResponses[i].embedding);
        const set2 = new Set(embeddedResponses[j].embedding);
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        similarityMatrix[i][j] = intersection.size / union.size;
      }
    }
  }
  
  // Simplified DBSCAN clustering
  const clusters = [];
  const visited = new Set();
  
  // Helper function for DBSCAN
  const expandCluster = (pointIndex, neighbors, cluster) => {
    cluster.push(pointIndex);
    visited.add(pointIndex);
    
    // For each neighbor
    neighbors.forEach(neighborIndex => {
      if (!visited.has(neighborIndex)) {
        visited.add(neighborIndex);
        
        // Find neighbors of this neighbor
        const neighborNeighbors = [];
        for (let i = 0; i < similarityMatrix.length; i++) {
          if (similarityMatrix[neighborIndex][i] >= distanceThreshold) {
            neighborNeighbors.push(i);
          }
        }
        
        // If this neighbor has enough neighbors, add them all to the cluster
        if (neighborNeighbors.length >= minClusterSize) {
          neighborNeighbors.forEach(nn => {
            if (!cluster.includes(nn)) {
              expandCluster(nn, neighborNeighbors, cluster);
            }
          });
        }
      }
      
      // Add to cluster if not already in one
      if (!clusters.some(c => c.includes(neighborIndex))) {
        cluster.push(neighborIndex);
      }
    });
  };
  
  // Run DBSCAN
  for (let i = 0; i < embeddedResponses.length; i++) {
    if (visited.has(i)) continue;
    
    // Find neighbors
    const neighbors = [];
    for (let j = 0; j < similarityMatrix.length; j++) {
      if (similarityMatrix[i][j] >= distanceThreshold) {
        neighbors.push(j);
      }
    }
    
    // If not enough neighbors, mark as noise
    if (neighbors.length < minClusterSize) {
      visited.add(i);
      continue;
    }
    
    // Create a new cluster
    const cluster = [];
    expandCluster(i, neighbors, cluster);
    clusters.push(cluster);
  }
  
  // Format clusters with their responses
  const formattedClusters = clusters.map((cluster, index) => {
    const clusterResponses = cluster.map(i => embeddedResponses[i]);
    return {
      cluster_id: index + 1,
      responses: clusterResponses
    };
  });
  
  // Add noise points as a miscellaneous cluster
  const noisePoints = [];
  for (let i = 0; i < embeddedResponses.length; i++) {
    if (!visited.has(i)) {
      noisePoints.push(i);
    }
  }
  
  if (noisePoints.length > 0) {
    formattedClusters.push({
      cluster_id: formattedClusters.length + 1,
      responses: noisePoints.map(i => embeddedResponses[i]),
      is_miscellaneous: true
    });
  }
  
  return formattedClusters;
};

// Step 5: Label & Summarize Clusters
export const labelClusters = (clusters) => {
  return clusters.map(cluster => {
    // Extract all words from the cluster
    const allWords = cluster.responses.flatMap(r => 
      (r.processedText || '').split(' ').filter(w => w.length > 2)
    );
    
    // Count word frequencies
    const wordCounts = {};
    allWords.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Sort by frequency
    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
    
    // Generate a name based on top keywords
    let groupName = cluster.is_miscellaneous 
      ? 'Miscellaneous / Needs Review'
      : `${sortedWords.slice(0, 2).join(' & ')} related responses`;
    
    // Find the most representative response (closest to centroid)
    let representativeResponse = cluster.responses[0]?.response || '';
    if (cluster.responses.length > 1) {
      // Just use the first response for simplicity
      // In a real implementation, we'd find the response closest to the centroid
      representativeResponse = cluster.responses[0].response;
    }
    
    // Generate a summary
    let summary = cluster.is_miscellaneous
      ? 'This group contains responses that don\'t fit well into other clusters and may need manual review.'
      : `This group contains responses related to ${sortedWords.slice(0, 3).join(', ')}. ${representativeResponse.slice(0, 100)}...`;
    
    return {
      ...cluster,
      group_name: groupName,
      summary: summary,
      top_keywords: sortedWords.slice(0, 5)
    };
  });
};

// Step 6: Map User-Level Timelines
export const generateUserTimelines = (responses) => {
  // Group responses by user
  const userResponses = {};
  
  responses.forEach(response => {
    const userId = response.participantId;
    if (!userResponses[userId]) {
      userResponses[userId] = [];
    }
    userResponses[userId].push(response);
  });
  
  // Sort each user's responses by date
  Object.keys(userResponses).forEach(userId => {
    userResponses[userId].sort((a, b) => new Date(a.date) - new Date(b.date));
  });
  
  // Generate timeline for each user
  return Object.keys(userResponses).map(userId => {
    const userResponseList = userResponses[userId];
    
    // Create timeline points
    const timelinePoints = userResponseList.map(response => {
      return {
        date: response.date,
        response: response.response,
        mood: response.mood || identifyMood(response.response),
        tasks: response.tasks || []
      };
    });
    
    // Identify patterns (simplified)
    const moodCounts = {};
    timelinePoints.forEach(point => {
      moodCounts[point.mood] = (moodCounts[point.mood] || 0) + 1;
    });
    
    const dominantMood = Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b, Object.keys(moodCounts)[0]
    );
    
    return {
      userId,
      timelinePoints,
      dominantMood,
      responseCount: timelinePoints.length
    };
  });
};

// Step 7: Analyze Task-Mood Relationships
export const analyzeTaskMoodRelationships = (responses) => {
  // Extract all unique tasks
  const allTasks = new Set();
  responses.forEach(response => {
    const tasks = response.tasks || [];
    tasks.forEach(task => allTasks.add(task));
  });
  
  // For each task, analyze mood distribution
  const taskAnalysis = {};
  
  allTasks.forEach(task => {
    // Find responses with this task
    const responsesWithTask = responses.filter(r => 
      (r.tasks || []).includes(task)
    );
    
    // Count moods
    const moodCounts = {
      positive: 0,
      negative: 0,
      anxious: 0,
      neutral: 0
    };
    
    responsesWithTask.forEach(response => {
      const mood = response.mood || identifyMood(response.response);
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
    
    // Calculate percentages
    const total = responsesWithTask.length;
    const moodPercentages = {};
    
    Object.keys(moodCounts).forEach(mood => {
      moodPercentages[mood] = total > 0 ? (moodCounts[mood] / total) * 100 : 0;
    });
    
    // Determine dominant mood
    const dominantMood = Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b, 'neutral'
    );
    
    taskAnalysis[task] = {
      task,
      responseCount: total,
      moodCounts,
      moodPercentages,
      dominantMood
    };
  });
  
  return taskAnalysis;
};

// Main function to run the entire pipeline
export const runAnalysisPipeline = async (responses) => {
  try {
    // Step 1 & 2: Preprocess and assign moods
    const processedResponses = responses.map(response => ({
      ...response,
      processedText: preprocessText(response.response),
      mood: identifyMood(response.response)
    }));
    
    // Step 3: Generate embeddings
    const embeddedResponses = generateEmbeddings(processedResponses);
    
    // Step 4: Cluster responses
    const clusters = clusterResponses(embeddedResponses);
    
    // Step 5: Label and summarize clusters
    const labeledClusters = labelClusters(clusters);
    
    // Step 6: Generate user timelines
    const userTimelines = generateUserTimelines(processedResponses);
    
    // Step 7: Analyze task-mood relationships
    const taskMoodAnalysis = analyzeTaskMoodRelationships(processedResponses);
    
    // Return the complete analysis
    return {
      clusters: labeledClusters,
      userTimelines,
      taskMoodAnalysis,
      processedResponseCount: processedResponses.length
    };
  } catch (error) {
    console.error('Error in analysis pipeline:', error);
    throw error;
  }
};

export default {
  preprocessText,
  identifyMood,
  generateEmbeddings,
  clusterResponses,
  labelClusters,
  generateUserTimelines,
  analyzeTaskMoodRelationships,
  runAnalysisPipeline
};
