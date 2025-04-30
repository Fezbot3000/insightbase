import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Menu,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Chip,
  Badge
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoodIcon from '@mui/icons-material/Mood';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloudIcon from '@mui/icons-material/Cloud';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import semanticSimilarity from '../utils/semanticSimilarity';
import stopwords from '../utils/stopwords';
import { performAffinityMapping } from '../utils/affinityMapping';
import { performSemanticClustering } from '../utils/semanticClustering';

// Color palette for affinity groups
const colorPalette = [
  '#1976d2', // Blue
  '#2e7d32', // Green
  '#d32f2f', // Red
  '#7b1fa2', // Purple
  '#f57c00', // Orange
  '#0288d1', // Light Blue
  '#00796b', // Teal
  '#c2185b', // Pink
  '#5d4037', // Brown
  '#455a64', // Blue Grey
];

function Synthesis({ projectId }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('wordcloud');
  const [taskGroups, setTaskGroups] = useState([]);
  const [moodGroups, setMoodGroups] = useState([]);
  const [expandedAccordions, setExpandedAccordions] = useState({});
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState({
    painPoints: true,
    nonPainPoints: true,
    tasks: {},
    moods: {},
    clusters: {}
  });
  const [currentFilters, setCurrentFilters] = useState({
    painPoints: true,
    nonPainPoints: true,
    tasks: {},
    moods: {}
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  
  // Word cloud state
  const [wordCloudData, setWordCloudData] = useState([]);
  const [wordCloudMax, setWordCloudMax] = useState(100);
  
  // Auto-grouping settings
  const [numGroups, setNumGroups] = useState(5);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [groupingMethod, setGroupingMethod] = useState('semantic');
  const [includeQuestions, setIncludeQuestions] = useState(true);

  // New state for semantic clusters
  const [semanticClusters, setSemanticClusters] = useState([]);
  const [clusteringInProgress, setClusteringInProgress] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState(null);

  // Load project data and extract responses
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setLoading(true);
        
        // Sample data for testing when Firebase permissions are unavailable
        const sampleResponses = [
          {
            id: '1',
            participantId: 'user1',
            response: 'I checked my bank account balance this morning and paid my electricity bill.',
            date: new Date().toISOString(),
            question: 'What did you do with your money today?'
          },
          {
            id: '2',
            participantId: 'user2',
            response: 'I felt anxious about my credit card debt so I created a budget plan to pay it off.',
            date: new Date().toISOString(),
            question: 'What did you do with your money today?'
          },
          {
            id: '3',
            participantId: 'user3',
            response: 'I went grocery shopping and tried to stick to my shopping list to avoid impulse purchases.',
            date: new Date().toISOString(),
            question: 'What did you do with your money today?'
          },
          {
            id: '4',
            participantId: 'user4',
            response: 'I saved $50 in my emergency fund and felt good about making progress on my financial goals.',
            date: new Date().toISOString(),
            question: 'What did you do with your money today?'
          },
          {
            id: '5',
            participantId: 'user5',
            response: 'I was stressed about an unexpected car repair bill that I had to put on my credit card.',
            date: new Date().toISOString(),
            question: 'What did you do with your money today?'
          },
          {
            id: '6',
            participantId: 'user6',
            response: 'I compared prices online before buying a new laptop to make sure I got the best deal.',
            date: new Date().toISOString(),
            question: 'What did you do with your money today?'
          },
          {
            id: '7',
            participantId: 'user7',
            response: 'I transferred money to my savings account for my upcoming vacation.',
            date: new Date().toISOString(),
            question: 'What did you do with your money today?'
          },
          {
            id: '8',
            participantId: 'user8',
            response: 'I reviewed my investment portfolio and decided to increase my monthly contributions.',
            date: new Date().toISOString(),
            question: 'What did you do with your money today?'
          },
          {
            id: '9',
            participantId: 'user9',
            response: 'I bought coffee and lunch at work even though I know I should bring food from home to save money.',
            date: new Date().toISOString(),
            question: 'What did you do with your money today?'
          },
          {
            id: '10',
            participantId: 'user10',
            response: 'I used a budgeting app to track my spending for the day and realized I\'m over budget for the month.',
            date: new Date().toISOString(),
            question: 'What did you do with your money today?'
          },
          {
            id: '11',
            participantId: 'user11',
            response: 'I felt happy that I was able to pay all my bills on time this month without any overdrafts.',
            date: new Date().toISOString(),
            question: 'What did you do with your money today?'
          },
          {
            id: '12',
            participantId: 'user12',
            response: 'I researched different credit cards to find one with better rewards for my spending habits.',
            date: new Date().toISOString(),
            question: 'What did you do with your money today?'
          }
        ];
        
        // Try to get project data from Firebase
        let responseData = [];
        
        try {
          // Get project data
          const projectRef = doc(db, 'projects', projectId);
          const projectSnap = await getDoc(projectRef);
          
          if (projectSnap.exists()) {
            // Get responses for this project
            const responsesRef = collection(db, 'responses');
            const q = query(responsesRef, where('projectId', '==', projectId));
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach((doc) => {
              responseData.push({ id: doc.id, ...doc.data() });
            });
          }
        } catch (error) {
          console.error('Error loading project data:', error);
          // Use sample data if Firebase data loading fails
          responseData = sampleResponses;
          
          // Show a message about using sample data
          setSnackbarMessage('Using sample data for demonstration');
          setSnackbarSeverity('info');
          setSnackbarOpen(true);
        }
        
        // If no data was loaded from Firebase, use sample data
        if (responseData.length === 0) {
          responseData = sampleResponses;
          
          // Show a message about using sample data
          setSnackbarMessage('Using sample data for demonstration');
          setSnackbarSeverity('info');
          setSnackbarOpen(true);
        }
        
        setResponses(responseData);
        
        // Generate initial groupings
        await generateAffinityGroups(responseData);
        
        setLoading(false);
      } catch (error) {
        console.error('Error in loadProjectData:', error);
        setLoading(false);
        
        // Show error message
        setSnackbarMessage('Error loading data: ' + error.message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    };
    
    if (projectId) {
      loadProjectData();
    } else {
      // If no projectId is provided, use sample data
      const sampleResponses = [
        {
          id: '1',
          participantId: 'user1',
          response: 'I checked my bank account balance this morning and paid my electricity bill.',
          date: new Date().toISOString(),
          question: 'What did you do with your money today?'
        },
        {
          id: '2',
          participantId: 'user2',
          response: 'I felt anxious about my credit card debt so I created a budget plan to pay it off.',
          date: new Date().toISOString(),
          question: 'What did you do with your money today?'
        },
        {
          id: '3',
          participantId: 'user3',
          response: 'I went grocery shopping and tried to stick to my shopping list to avoid impulse purchases.',
          date: new Date().toISOString(),
          question: 'What did you do with your money today?'
        },
        {
          id: '4',
          participantId: 'user4',
          response: 'I saved $50 in my emergency fund and felt good about making progress on my financial goals.',
          date: new Date().toISOString(),
          question: 'What did you do with your money today?'
        },
        {
          id: '5',
          participantId: 'user5',
          response: 'I was stressed about an unexpected car repair bill that I had to put on my credit card.',
          date: new Date().toISOString(),
          question: 'What did you do with your money today?'
        }
      ];
      
      setResponses(sampleResponses);
      generateAffinityGroups(sampleResponses);
      setLoading(false);
      
      // Show a message about using sample data
      setSnackbarMessage('Using sample data for demonstration');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    }
  }, [projectId]);
  
  // Generate affinity groups based on responses
  const generateAffinityGroups = async (responseData) => {
    if (!responseData || responseData.length === 0) return;
    
    // Generate word cloud data
    generateWordCloudData(responseData);
    
    // Generate task groups
    categorizeTasks(responseData);
    
    // Generate mood groups
    categorizeMoods(responseData);
    
    // Generate semantic clusters using the new algorithm
    try {
      setClusteringInProgress(true);
      console.log('Starting advanced semantic clustering...');
      
      // Use the new semantic clustering algorithm with advanced options
      const clusters = await performSemanticClustering(responseData, {
        distanceThreshold: 0.4, // Adjust similarity threshold (lower = more clusters)
        minClusterSize: 2       // Minimum responses per cluster
      });
      
      console.log('Semantic clustering complete:', clusters);
      setSemanticClusters(clusters);
      
      // Initialize visibility state for clusters
      const clusterVisibility = {};
      clusters.forEach(cluster => {
        clusterVisibility[cluster.group_name] = true;
      });
      
      setVisibleCategories(prev => ({
        ...prev,
        clusters: clusterVisibility
      }));
      
      setClusteringInProgress(false);
    } catch (error) {
      console.error('Error generating semantic clusters:', error);
      setClusteringInProgress(false);
    }
  };

  // Extract keywords from text
  const extractKeywords = (text, question = '') => {
    // Combine question and response if includeQuestions is true
    const textToProcess = includeQuestions ? `${question} ${text}` : text;
    
    return semanticSimilarity.extractKeywords(textToProcess, 10);
  };

  // Analyze text for pain points
  const isPainPoint = (text) => {
    const painPointIndicators = [
      'frustrat', 'annoy', 'difficult', 'hard', 'problem', 'issue', 'trouble', 
      'fail', 'confus', 'disappoint', 'bad', 'hate', 'dislike', 'struggle', 
      'complain', 'concern', 'worry', 'stress', 'anxious', 'angry', 'upset',
      'error', 'bug', 'glitch', 'crash', 'slow', 'broken', 'not working', 
      'couldn\'t', 'can\'t', 'unable', 'impossible', 'never', 'terrible',
      'awful', 'horrible', 'poor', 'waste', 'lost', 'missing'
    ];
    
    const text_lower = text.toLowerCase();
    const foundIndicators = [];
    
    painPointIndicators.forEach(indicator => {
      if (text_lower.includes(indicator)) {
        foundIndicators.push(indicator);
      }
    });
    
    return {
      isPain: foundIndicators.length > 0,
      indicators: foundIndicators
    };
  };

  // Categorize responses into pain points and non-pain points
  const categorizePainPoints = () => {
    const painPoints = [];
    const nonPainPoints = [];
    
    responses.forEach(response => {
      const analysis = isPainPoint(response.response);
      const enrichedResponse = {
        ...response,
        painAnalysis: analysis
      };
      
      if (analysis.isPain) {
        painPoints.push(enrichedResponse);
      } else {
        nonPainPoints.push(enrichedResponse);
      }
    });
    
    // Update state
    setVisibleCategories(prev => ({
      ...prev,
      painPoints: painPoints.length > 0,
      nonPainPoints: nonPainPoints.length > 0
    }));
  };

  // Identify tasks from responses
  const identifyTasks = (text) => {
    // Define broader task categories with related verbs and phrases
    const taskCategories = {
      'financial_management': [
        'check balance', 'check account', 'transfer money', 'transfer funds', 'pay bill', 
        'withdraw', 'deposit', 'save money', 'budget', 'invest', 'spending', 'payment',
        'transaction', 'bank', 'banking', 'finance', 'financial', 'money', 'cash', 'credit',
        'debit', 'loan', 'mortgage', 'insurance'
      ],
      'shopping': [
        'buy', 'purchase', 'shop', 'order', 'cart', 'checkout', 'store', 'mall', 'online shopping',
        'retail', 'grocery', 'supermarket', 'food shopping', 'clothes shopping'
      ],
      'planning': [
        'plan', 'schedule', 'organize', 'arrange', 'prepare', 'calendar', 'appointment',
        'meeting', 'event', 'reminder', 'deadline', 'goal', 'target', 'objective'
      ],
      'research': [
        'research', 'search', 'look for', 'find', 'investigate', 'explore', 'browse',
        'read about', 'learn about', 'study', 'analyze', 'compare', 'review'
      ],
      'transportation': [
        'drive', 'commute', 'travel', 'trip', 'journey', 'car', 'bus', 'train', 'flight',
        'ticket', 'booking', 'reservation', 'parking', 'gas', 'fuel'
      ]
    };
    
    const text_lower = text.toLowerCase();
    const detectedTasks = new Set();
    
    // Check for each task category
    Object.entries(taskCategories).forEach(([category, indicators]) => {
      indicators.forEach(indicator => {
        if (text_lower.includes(indicator)) {
          detectedTasks.add(category);
        }
      });
    });
    
    // If no specific tasks detected, categorize as 'other'
    if (detectedTasks.size === 0) {
      return ['other'];
    }
    
    return Array.from(detectedTasks);
  };

  // Categorize responses by tasks
  const categorizeTasks = (responseData) => {
    const taskMap = {};
    
    responseData.forEach(response => {
      const tasks = identifyTasks(response.response);
      
      tasks.forEach(task => {
        if (!taskMap[task]) {
          taskMap[task] = [];
        }
        taskMap[task].push(response);
      });
    });
    
    // Convert map to array of task groups
    const taskGroupsArray = Object.entries(taskMap).map(([task, responses]) => ({
      id: `task-${task.replace(/\s+/g, '-')}`,
      name: task.charAt(0).toUpperCase() + task.slice(1),
      responses,
      count: responses.length
    })).sort((a, b) => b.count - a.count);
    
    // Debug: Log the task groups to console
    console.log('Task Groups:', taskGroupsArray);
    console.log('Total task categories:', taskGroupsArray.length);
    taskGroupsArray.forEach(group => {
      console.log(`${group.name}: ${group.count} responses`);
    });
    
    setTaskGroups(taskGroupsArray);
    
    // Update visibility state for tasks
    const taskVisibility = {};
    taskGroupsArray.forEach(group => {
      taskVisibility[group.id] = true;
    });
    setVisibleCategories(prev => ({
      ...prev,
      tasks: taskVisibility
    }));
  };

  // Analyze text for mood/emotion
  const identifyMood = (text) => {
    // Define broader mood categories with multiple indicators for each
    const moodCategories = {
      'positive': [
        'happy', 'glad', 'pleased', 'delighted', 'satisfied', 'content', 'joy', 'excited', 'great',
        'good', 'wonderful', 'fantastic', 'amazing', 'excellent', 'love', 'enjoy', 'like', 'appreciate',
        'grateful', 'thankful', 'relieved', 'proud', 'confident', 'optimistic', 'hopeful'
      ],
      'negative': [
        'frustrat', 'annoy', 'irritat', 'upset', 'angry', 'mad', 'furious', 'rage',
        'sad', 'unhappy', 'disappoint', 'depress', 'miserable', 'terrible', 'awful',
        'hate', 'dislike', 'disgusted', 'fed up', 'tired of', 'sick of', 'bad', 'poor',
        'horrible', 'dreadful', 'regret'
      ],
      'anxious': [
        'anxious', 'nervous', 'worry', 'concern', 'stress', 'tense', 'uneasy', 'afraid',
        'fear', 'scared', 'dread', 'panic', 'alarm', 'apprehensive', 'troubled',
        'uncertain', 'unsure', 'doubt', 'hesitant', 'reluctant'
      ],
      'neutral': [
        'ok', 'fine', 'alright', 'neutral', 'normal', 'regular', 'usual', 'typical',
        'standard', 'average', 'moderate', 'acceptable', 'adequate', 'reasonable',
        'fair', 'decent', 'satisfactory'
      ]
    };
    
    const text_lower = text.toLowerCase();
    const moodScores = {};
    
    // Initialize scores for each mood category
    Object.keys(moodCategories).forEach(mood => {
      moodScores[mood] = 0;
    });
    
    // Calculate score for each mood category based on indicator presence
    Object.entries(moodCategories).forEach(([mood, indicators]) => {
      indicators.forEach(indicator => {
        if (text_lower.includes(indicator)) {
          moodScores[mood] += 1;
        }
      });
    });
    
    // Analyze sentence structure for additional context
    // Negative phrases often contain negations
    if (text_lower.match(/\b(don't|doesn't|didn't|won't|can't|cannot|never|no|not)\b/g)) {
      moodScores['negative'] += 1;
    }
    
    // Exclamation marks often indicate strong emotions (positive or negative)
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 0) {
      // If already leaning negative, amplify that
      if (moodScores['negative'] > moodScores['positive']) {
        moodScores['negative'] += exclamationCount;
      } else {
        moodScores['positive'] += exclamationCount;
      }
    }
    
    // Question marks might indicate uncertainty or anxiety
    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount > 1) { // Multiple questions suggest anxiety
      moodScores['anxious'] += questionCount - 1;
    }
    
    // Find the mood with the highest score
    let highestScore = 0;
    let dominantMood = 'neutral'; // Default to neutral
    
    Object.entries(moodScores).forEach(([mood, score]) => {
      if (score > highestScore) {
        highestScore = score;
        dominantMood = mood;
      }
    });
    
    // If no strong indicators, return neutral
    if (highestScore === 0) {
      return 'neutral';
    }
    
    return dominantMood;
  };

  // Categorize responses by mood
  const categorizeMoods = (responseData) => {
    const moodMap = {};
    
    responseData.forEach(response => {
      const mood = identifyMood(response.response);
      
      if (!moodMap[mood]) {
        moodMap[mood] = [];
      }
      moodMap[mood].push(response);
    });
    
    // Convert map to array of mood groups
    const moodGroupsArray = Object.entries(moodMap).map(([mood, responses]) => ({
      id: `mood-${mood}`,
      name: mood.charAt(0).toUpperCase() + mood.slice(1),
      responses,
      count: responses.length
    })).sort((a, b) => b.count - a.count);
    
    // Debug: Log the mood groups to console
    console.log('Mood Groups:', moodGroupsArray);
    console.log('Total mood categories:', moodGroupsArray.length);
    moodGroupsArray.forEach(group => {
      console.log(`${group.name}: ${group.count} responses`);
    });
    
    setMoodGroups(moodGroupsArray);
    
    // Update visibility state for moods
    const moodVisibility = {};
    moodGroupsArray.forEach(group => {
      moodVisibility[group.id] = true;
    });
    setVisibleCategories(prev => ({
      ...prev,
      moods: moodVisibility
    }));
  };

  // Calculate text similarity based on shared keywords
  const calculateKeywordSimilarity = (keywords1, keywords2) => {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    
    // Find intersection
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    // Calculate Jaccard similarity
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  };

  // Group responses by keyword similarity
  const groupByKeywordSimilarity = () => {
    // Start with empty groups
    const newGroups = Array.from({ length: numGroups }, (_, i) => ({
      id: `auto-group-${Date.now()}-${i}`,
      name: `Group ${i + 1}`,
      color: colorPalette[i % colorPalette.length],
      summary: '',
      keywords: []
    }));
    
    // Copy responses to avoid modifying state directly
    const responsesToGroup = [...responses];
    
    // Reset all group assignments
    responsesToGroup.forEach(r => r.groupId = null);
    
    // Initialize groups with seed responses (pick responses that are most different from each other)
    if (responsesToGroup.length >= numGroups) {
      // Start with a random response as the first seed
      const seeds = [responsesToGroup[Math.floor(Math.random() * responsesToGroup.length)]];
      
      // Find the remaining seeds by maximizing distance from existing seeds
      while (seeds.length < numGroups) {
        let maxMinDistance = -1;
        let nextSeed = null;
        
        for (const response of responsesToGroup) {
          if (seeds.some(seed => seed.id === response.id)) continue;
          
          // Find minimum distance to any existing seed
          let minDistance = Infinity;
          for (const seed of seeds) {
            const similarity = calculateKeywordSimilarity(seed.keywords, response.keywords);
            const distance = 1 - similarity;
            minDistance = Math.min(minDistance, distance);
          }
          
          // If this response is further from all seeds than our current best, select it
          if (minDistance > maxMinDistance) {
            maxMinDistance = minDistance;
            nextSeed = response;
          }
        }
        
        if (nextSeed) {
          seeds.push(nextSeed);
        } else {
          break;
        }
      }
      
      // Assign seeds to groups
      seeds.forEach((seed, i) => {
        seed.groupId = newGroups[i].id;
        
        // Initialize group keywords from seed
        newGroups[i].keywords = [...seed.keywords];
      });
    }
    
    // Assign remaining responses to the most similar group
    responsesToGroup.forEach(response => {
      if (response.groupId) return; // Skip already assigned responses
      
      let bestGroupId = null;
      let highestSimilarity = -1;
      
      newGroups.forEach(group => {
        // Skip empty groups with no keywords
        if (group.keywords.length === 0) return;
        
        const similarity = calculateKeywordSimilarity(response.keywords, group.keywords);
        
        if (similarity > highestSimilarity && similarity > similarityThreshold) {
          highestSimilarity = similarity;
          bestGroupId = group.id;
        }
      });
      
      // If no good match, assign to the smallest group
      if (!bestGroupId) {
        const groupSizes = newGroups.map(group => 
          responsesToGroup.filter(r => r.groupId === group.id).length
        );
        const smallestGroupIndex = groupSizes.indexOf(Math.min(...groupSizes));
        bestGroupId = newGroups[smallestGroupIndex].id;
      }
      
      response.groupId = bestGroupId;
      
      // Update group keywords with this response's keywords
      const groupIndex = newGroups.findIndex(g => g.id === bestGroupId);
      if (groupIndex >= 0) {
        // Merge keywords, keeping the most frequent ones
        const allKeywords = [...newGroups[groupIndex].keywords, ...response.keywords];
        const keywordFreq = {};
        allKeywords.forEach(word => {
          keywordFreq[word] = (keywordFreq[word] || 0) + 1;
        });
        
        newGroups[groupIndex].keywords = Object.entries(keywordFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([word]) => word);
      }
    });
    
    // Generate summaries for each group
    newGroups.forEach((group, i) => {
      const groupResponses = responsesToGroup.filter(r => r.groupId === group.id);
      
      if (groupResponses.length > 0) {
        // Use keywords to generate a summary
        const topKeywords = group.keywords.slice(0, 5).join(', ');
        group.summary = `This group contains ${groupResponses.length} responses related to: ${topKeywords}`;
        
        // Update group name based on top keywords if it's still the default
        if (group.name === `Group ${i + 1}` && group.keywords.length > 0) {
          group.name = `${group.keywords[0].charAt(0).toUpperCase() + group.keywords[0].slice(1)} Group`;
        }
      } else {
        group.summary = 'No responses in this group';
      }
    });
    
    // Update state
    setGroups(newGroups);
    setResponses(responsesToGroup);
    
    // Save to Firestore
    saveAffinityData();
  };

  // Group responses by semantic similarity
  const groupBySemanticSimilarity = () => {
    try {
      console.log('Starting semantic similarity grouping');
      
      // Start with empty groups
      const newGroups = Array.from({ length: numGroups }, (_, i) => ({
        id: `auto-group-${Date.now()}-${i}`,
        name: `Group ${i + 1}`,
        color: colorPalette[i % colorPalette.length],
        summary: '',
        keywords: []
      }));
      
      // Copy responses to avoid modifying state directly
      const responsesToGroup = [...responses];
      
      // Reset all group assignments
      responsesToGroup.forEach(r => r.groupId = null);
      
      // Initialize groups with seed responses (pick responses that are most different from each other)
      if (responsesToGroup.length >= numGroups) {
        // Start with a random response as the first seed
        const seeds = [responsesToGroup[Math.floor(Math.random() * responsesToGroup.length)]];
        
        // Find the remaining seeds by maximizing distance from existing seeds
        while (seeds.length < numGroups) {
          let maxMinDistance = -1;
          let nextSeed = null;
          
          for (const response of responsesToGroup) {
            if (seeds.some(seed => seed.id === response.id)) continue;
            
            // Find minimum distance to any existing seed
            let minDistance = Infinity;
            for (const seed of seeds) {
              const seedText = includeQuestions ? `${seed.question} ${seed.response}` : seed.response;
              const responseText = includeQuestions ? `${response.question} ${response.response}` : response.response;
              
              const similarity = semanticSimilarity.calculateSimilarity(seedText, responseText);
              const distance = 1 - similarity;
              minDistance = Math.min(minDistance, distance);
            }
            
            // If this response is further from all seeds than our current best, select it
            if (minDistance > maxMinDistance) {
              maxMinDistance = minDistance;
              nextSeed = response;
            }
          }
          
          if (nextSeed) {
            seeds.push(nextSeed);
          } else {
            break;
          }
        }
        
        // Assign seeds to groups
        seeds.forEach((seed, i) => {
          seed.groupId = newGroups[i].id;
          
          // Extract keywords from seed
          const seedText = includeQuestions ? `${seed.question} ${seed.response}` : seed.response;
          newGroups[i].keywords = semanticSimilarity.extractKeywords(seedText, 10);
        });
      }
      
      // Assign remaining responses to the most similar group
      for (const response of responsesToGroup) {
        if (response.groupId) continue; // Skip already assigned responses
        
        let bestGroupId = null;
        let highestSimilarity = -1;
        
        // Calculate similarity to each group
        for (const group of newGroups) {
          // Get all responses already in this group
          const groupResponses = responsesToGroup.filter(r => r.groupId === group.id);
          
          if (groupResponses.length === 0) continue;
          
          // Get text content for all responses in the group
          const groupTexts = groupResponses.map(r => 
            includeQuestions ? `${r.question} ${r.response}` : r.response
          );
          
          // Get text content for the current response
          const responseText = includeQuestions ? `${response.question} ${response.response}` : response.response;
          
          // Calculate average similarity to all responses in the group
          const avgSimilarity = semanticSimilarity.calculateGroupSimilarity(responseText, groupTexts);
          
          if (avgSimilarity > highestSimilarity && avgSimilarity > similarityThreshold) {
            highestSimilarity = avgSimilarity;
            bestGroupId = group.id;
          }
        }
        
        // If no good match, assign to the smallest group
        if (!bestGroupId) {
          const groupSizes = newGroups.map(group => 
            responsesToGroup.filter(r => r.groupId === group.id).length
          );
          const smallestGroupIndex = groupSizes.indexOf(Math.min(...groupSizes));
          bestGroupId = newGroups[smallestGroupIndex].id;
        }
        
        // Assign to group
        response.groupId = bestGroupId;
      }
      
      // Generate summaries and names for each group
      const categoryNames = [
        'Financial', 'Spending', 'Savings', 'Bills', 'Groceries', 
        'Transport', 'Entertainment', 'Food', 'Shopping', 'Investments'
      ];
      
      for (let i = 0; i < newGroups.length; i++) {
        const group = newGroups[i];
        const groupResponses = responsesToGroup.filter(r => r.groupId === group.id);
        
        if (groupResponses.length > 0) {
          // Get all response texts in this group
          const responseTexts = groupResponses.map(r => r.response);
          const combinedText = responseTexts.join(' ').toLowerCase();
          
          // Generate summary
          group.summary = semanticSimilarity.generateGroupSummary(responseTexts);
          
          // Extract keywords from all responses in the group
          const allText = responseTexts.join(' ');
          group.keywords = semanticSimilarity.extractKeywords(allText, 10);
          
          // Assign a distinctive name based on content
          let groupName = '';
          
          // Check for specific financial activities in the responses
          if (combinedText.includes('fuel') || combinedText.includes('gas') || combinedText.includes('petrol')) {
            groupName = 'Fuel Expenses';
          } else if (combinedText.includes('coffee') || combinedText.includes('cafe')) {
            groupName = 'Coffee & Cafes';
          } else if (combinedText.includes('groceries') || combinedText.includes('supermarket')) {
            groupName = 'Grocery Shopping';
          } else if (combinedText.includes('bill') || combinedText.includes('bills') || combinedText.includes('payment')) {
            groupName = 'Bill Payments';
          } else if (combinedText.includes('check') || combinedText.includes('balance') || combinedText.includes('account')) {
            groupName = 'Account Checking';
          } else if (combinedText.includes('transfer') || combinedText.includes('sent money')) {
            groupName = 'Money Transfers';
          } else if (combinedText.includes('save') || combinedText.includes('saving') || combinedText.includes('savings')) {
            groupName = 'Savings Activities';
          } else if (combinedText.includes('spend') || combinedText.includes('purchase') || combinedText.includes('buy')) {
            groupName = 'General Spending';
          } else if (combinedText.includes('dinner') || combinedText.includes('lunch') || combinedText.includes('restaurant')) {
            groupName = 'Dining Out';
          } else if (combinedText.includes('online') || combinedText.includes('shopping')) {
            groupName = 'Online Shopping';
          } else {
            // Use a category name if no specific activity is detected
            groupName = `${categoryNames[i % categoryNames.length]} Activities`;
          }
          
          // Assign the name
          group.name = groupName;
          
          console.log(`Created group: ${groupName} with ${groupResponses.length} responses`);
        } else {
          group.summary = 'No responses in this group';
          group.name = `Empty Group ${i+1}`;
        }
      }
      
      // Make sure group names are unique
      const usedNames = new Set();
      newGroups.forEach(group => {
        if (usedNames.has(group.name)) {
          // If name is already used, append a number
          let counter = 1;
          let newName = `${group.name} ${counter}`;
          while (usedNames.has(newName)) {
            counter++;
            newName = `${group.name} ${counter}`;
          }
          group.name = newName;
        }
        usedNames.add(group.name);
      });
      
      console.log('Final group names:', newGroups.map(g => g.name));
      
      // Update state
      setGroups(newGroups);
      setResponses(responsesToGroup);
      
      // Save to Firestore
      saveAffinityData();
      
    } catch (error) {
      console.error('Error in semantic grouping:', error);
      showSnackbar('Error in semantic grouping. Falling back to keyword-based grouping.', 'error');
      
      // Fallback to keyword grouping
      groupByKeywordSimilarity();
    }
  };

  // Auto-generate affinity groups
  const handleAutoGenerateGroups = async () => {
    try {
      setProcessing(true);
      
      // Log the current grouping method for debugging
      console.log(`Using grouping method: ${groupingMethod}`);
      
      if (groupingMethod === 'keyword') {
        console.log('Running keyword-based grouping');
        groupByKeywordSimilarity();
      } else if (groupingMethod === 'semantic') {
        console.log('Running semantic-based grouping');
        groupBySemanticSimilarity();
      }
      
      showSnackbar('Affinity groups generated successfully', 'success');
    } catch (error) {
      console.error('Error generating affinity groups:', error);
      showSnackbar('Error generating affinity groups', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Save affinity map data to Firestore
  const saveAffinityData = async () => {
    try {
      setProcessing(true);
      
      // Skip saving to Firebase if we're using sample data
      if (!projectId) {
        setSnackbarMessage('Affinity groups saved (demo mode)');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setProcessing(false);
        return;
      }
      
      // Prepare data for saving
      const affinityData = {
        autoAffinityGroups: semanticClusters.map(cluster => ({
          id: cluster.cluster_id,
          name: cluster.group_name,
          summary: cluster.summary,
          keywords: cluster.top_keywords || []
        })),
        autoAffinityAssignments: []
      };
      
      // Create assignments
      semanticClusters.forEach(cluster => {
        cluster.responses.forEach(response => {
          affinityData.autoAffinityAssignments.push({
            responseId: response.id,
            participantId: response.participantId,
            groupId: cluster.cluster_id
          });
        });
      });
      
      // Save to Firebase
      try {
        const projectRef = doc(db, 'projects', projectId);
        await setDoc(projectRef, { 
          autoAffinityGroups: affinityData.autoAffinityGroups,
          autoAffinityAssignments: affinityData.autoAffinityAssignments,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
        
        setSnackbarMessage('Affinity groups saved successfully');
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error saving affinity data:', error);
        setSnackbarMessage('Error saving affinity groups: ' + error.message);
        setSnackbarSeverity('error');
      }
      
      setSnackbarOpen(true);
      setProcessing(false);
    } catch (error) {
      console.error('Error in saveAffinityData:', error);
      setSnackbarMessage('Error: ' + error.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setProcessing(false);
    }
  };

  // Handle group dialog
  const handleOpenGroupDialog = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setNewGroupName(group.name);
    } else {
      setEditingGroup(null);
      setNewGroupName('');
    }
    setDialogOpen(true);
  };

  const handleCloseGroupDialog = () => {
    setDialogOpen(false);
    setNewGroupName('');
    setEditingGroup(null);
  };

  const handleSaveGroup = () => {
    if (newGroupName.trim()) {
      if (editingGroup) {
        // Edit existing group
        const updatedGroups = groups.map(g => 
          g.id === editingGroup.id 
            ? { ...g, name: newGroupName.trim() } 
            : g
        );
        setGroups(updatedGroups);
      } else {
        // Create new group
        const newGroup = {
          id: `manual-group-${Date.now()}`,
          name: newGroupName.trim(),
          color: colorPalette[groups.length % colorPalette.length],
          summary: 'Manually created group',
          keywords: []
        };
        setGroups([...groups, newGroup]);
      }
      
      saveAffinityData();
      handleCloseGroupDialog();
    }
  };

  // Handle removing a group
  const handleRemoveGroup = (groupId) => {
    // Update groups
    const updatedGroups = groups.filter(g => g.id !== groupId);
    setGroups(updatedGroups);
    
    // Update responses to remove group assignment
    const updatedResponses = responses.map(r => 
      r.groupId === groupId ? { ...r, groupId: null } : r
    );
    setResponses(updatedResponses);
    
    // Save changes to Firestore immediately
    saveAffinityData();
  };

  // Handle settings dialog
  const handleOpenSettingsDialog = () => {
    setSettingsDialogOpen(true);
  };

  const handleCloseSettingsDialog = () => {
    setSettingsDialogOpen(false);
  };

  // Show snackbar message
  const showSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Get responses for a specific group
  const getGroupResponses = (groupId) => {
    return responses.filter(r => r.groupId === groupId);
  };

  // Get unassigned responses
  const getUnassignedResponses = () => {
    return responses.filter(r => !r.groupId);
  };

  // Group responses by question
  const getResponsesByQuestion = () => {
    const questionGroups = {};
    
    responses.forEach(response => {
      if (!response.groupId) { // Only include unassigned responses
        if (!questionGroups[response.question]) {
          questionGroups[response.question] = [];
        }
        questionGroups[response.question].push(response);
      }
    });
    
    return questionGroups;
  };

  // Export affinity map data
  const exportAffinityMap = (format) => {
    try {
      let exportData;
      let fileName;
      let fileContent;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      console.log(`Starting export in ${format} format for ${activeTab} data...`);
      
      // Prepare export data based on active tab
      if (activeTab === 'semantic') {
        exportData = semanticClusters;
      } else if (activeTab === 'tasks') {
        exportData = taskGroups;
      } else if (activeTab === 'moods') {
        exportData = moodGroups;
      } else {
        exportData = wordCloudData;
      }
      
      // Convert to appropriate format
      let content = '';
      if (format === 'json') {
        content = JSON.stringify(exportData, null, 2);
      } else {
        // Simple CSV conversion
        const rows = [];
        
        // Add headers
        if (activeTab === 'semantic' || activeTab === 'tasks' || activeTab === 'moods') {
          rows.push(['Group Name', 'Response Count']);
          exportData.forEach(group => {
            rows.push([group.name || group.group_name, group.responses.length]);
          });
        } else {
          rows.push(['Word', 'Frequency']);
          exportData.forEach(item => {
            rows.push([item.text, item.value]);
          });
        }
        
        content = rows.map(row => row.join(',')).join('\n');
      }
      
      // Create download link
      const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      
      // Append to document, click, and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSnackbarMessage(`Downloaded ${activeTab} data as ${format.toUpperCase()}`);
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Export error:', error);
      setSnackbarMessage('Export failed: ' + error.message);
      setSnackbarSeverity('error');
    }
  };

  // Export AI evaluation data
  const exportAIEvaluation = () => {
    try {
      // Create comprehensive evaluation data structure
      const evaluationData = {
        exportDate: new Date().toISOString(),
        evaluationRequest: "Please evaluate the effectiveness of this synthesis based on the coherence of groups and the relevance of the insights.",
        projectId: projectId || "demo-project",
        // Include all analysis types
        wordCloud: {
          data: wordCloudData,
          maxFrequency: wordCloudMax
        },
        taskGroups: taskGroups.map(group => ({
          id: group.id,
          name: group.name,
          count: group.count,
          responses: group.responses.map(response => ({
            id: response.id,
            participantId: response.participantId,
            response: response.response,
            question: response.question,
            date: response.date,
            tasks: identifyTasks(response.response),
            mood: identifyMood(response.response)
          }))
        })),
        moodGroups: moodGroups.map(group => ({
          id: group.id,
          name: group.name,
          count: group.count,
          responses: group.responses.map(response => ({
            id: response.id,
            participantId: response.participantId,
            response: response.response,
            question: response.question,
            date: response.date,
            tasks: identifyTasks(response.response),
            mood: identifyMood(response.response)
          }))
        })),
        semanticClusters: semanticClusters.map(cluster => ({
          cluster_id: cluster.cluster_id,
          group_name: cluster.group_name,
          summary: cluster.summary,
          top_keywords: cluster.top_keywords,
          responses: cluster.responses.map(response => ({
            id: response.id,
            participantId: response.participantId,
            response: response.response,
            question: response.question,
            date: response.date,
            tasks: identifyTasks(response.response),
            mood: identifyMood(response.response)
          }))
        })),
        allResponses: responses.map(response => ({
          id: response.id,
          participantId: response.participantId,
          response: response.response,
          question: response.question,
          date: response.date,
          tasks: identifyTasks(response.response),
          mood: identifyMood(response.response)
        }))
      };
      
      // Convert to JSON
      const content = JSON.stringify(evaluationData, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `synthesis-complete-${timestamp}.json`;
      
      // Create and download file using a safer approach
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      // Safely add and remove the link
      try {
        document.body.appendChild(link);
        link.click();
        
        // Use setTimeout to ensure the browser has time to process the download
        setTimeout(() => {
          try {
            document.body.removeChild(link);
          } catch (e) {
            console.warn('Link element already removed:', e);
          }
          URL.revokeObjectURL(url);
        }, 100);
      } catch (e) {
        console.error('Error with download link:', e);
        // Fallback method if appendChild fails
        link.dispatchEvent(new MouseEvent('click'));
        URL.revokeObjectURL(url);
      }
      
      console.log(`Complete synthesis file created: ${fileName}`);
      setSnackbarMessage(`Complete synthesis data downloaded`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error creating synthesis export file:', error);
      setSnackbarMessage('Error creating export file: ' + error.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Export data directly (alternative method)
  const exportDataDirectly = (format) => {
    try {
      let data = null;
      let fileName = `affinity-map-${new Date().getTime()}.${format}`;
      let mimeType = format === 'json' ? 'application/json' : 'text/csv';
      
      // Prepare data based on active tab
      if (activeTab === 'semantic') {
        data = semanticClusters;
      } else if (activeTab === 'tasks') {
        data = taskGroups;
      } else if (activeTab === 'moods') {
        data = moodGroups;
      } else {
        data = wordCloudData;
      }
      
      // Convert to appropriate format
      let content = '';
      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
      } else {
        // Simple CSV conversion
        const rows = [];
        
        // Add headers
        if (activeTab === 'semantic' || activeTab === 'tasks' || activeTab === 'moods') {
          rows.push(['Group Name', 'Response Count']);
          data.forEach(group => {
            rows.push([group.name || group.group_name, group.responses.length]);
          });
        } else {
          rows.push(['Word', 'Frequency']);
          data.forEach(item => {
            rows.push([item.text, item.value]);
          });
        }
        
        content = rows.map(row => row.join(',')).join('\n');
      }
      
      // Create download link
      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      
      // Append to document, click, and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSnackbarMessage(`Downloaded ${activeTab} data as ${format.toUpperCase()}`);
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Export error:', error);
      setSnackbarMessage('Export failed: ' + error.message);
      setSnackbarSeverity('error');
    }
  };

  // Handle export menu
  const handleOpenExportMenu = (event) => {
    setExportMenuAnchorEl(event.currentTarget);
    setExportMenuOpen(true);
  };
  
  const handleCloseExportMenu = () => {
    setExportMenuAnchorEl(null);
    setExportMenuOpen(false);
  };

  // Handle accordion expansion
  const handleAccordionChange = (accordionId) => (_, isExpanded) => {
    setExpandedAccordions({
      ...expandedAccordions,
      [accordionId]: isExpanded
    });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Toggle filter dialog
  const handleToggleFilterDialog = () => {
    setFilterDialogOpen(!filterDialogOpen);
  };

  // Update filters
  const handleFilterChange = (filterType, value) => {
    setCurrentFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Handle filter dialog close
  const handleFilterDialogClose = () => {
    setFilterDialogOpen(false);
  };

  // Generate word cloud data
  const generateWordCloudData = (responseData) => {
    // Common stop words to exclude
    const stopWords = new Set([
      'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
      'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
      'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
      'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
      'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
      'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
      'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
      'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
      'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
      'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
      'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
      'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which',
      'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d',
      'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves', 'also', 'just', 'like', 'will',
      'get', 'got', 'getting', 'go', 'going', 'went', 'gone', 'make', 'made', 'making', 'take', 'took', 'taking',
      'taken', 'use', 'used', 'using', 'today', 'now', 'day', 'week', 'month', 'year', 'time', 'thing', 'things'
    ]);
    
    // Combine all responses into one text
    const allText = responseData.reduce((acc, response) => {
      return acc + ' ' + response.response.toLowerCase();
    }, '');
    
    // Tokenize and count word frequencies
    const words = allText.match(/\b(\w+)\b/g) || [];
    const wordCounts = {};
    
    words.forEach(word => {
      if (!stopWords.has(word) && word.length > 2) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    
    // Convert to array format for visualization
    const wordCountArray = Object.entries(wordCounts)
      .map(([text, value]) => ({ text, value }))
      .filter(item => item.value > 1) // Only include words that appear more than once
      .sort((a, b) => b.value - a.value)
      .slice(0, 100); // Limit to top 100 words
    
    // Find the maximum frequency for scaling
    const maxValue = wordCountArray.length > 0 ? wordCountArray[0].value : 0;
    
    // Debug: Log the word cloud data
    console.log('Word Cloud Data:', wordCountArray.slice(0, 20));
    console.log('Total unique words (appearing more than once):', wordCountArray.length);
    console.log('Top 10 words:');
    wordCountArray.slice(0, 10).forEach(word => {
      console.log(`${word.text}: ${word.value} occurrences`);
    });
    
    setWordCloudData(wordCountArray);
    setWordCloudMax(maxValue);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Synthesis</Typography>
        <Box>
          <Tooltip title="Export Data">
            <IconButton onClick={handleOpenExportMenu}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filter">
            <IconButton onClick={handleToggleFilterDialog}>
              <FilterListIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : responses.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No responses found. Add participant responses to start creating affinity maps.
        </Alert>
      ) : (
        <>
          {/* New tabbed interface for different categorization methods */}
          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab 
                value="wordcloud" 
                label="Word Cloud" 
                icon={<CloudIcon />} 
                iconPosition="start"
              />
              <Tab 
                value="tasks" 
                label="Tasks" 
                icon={<AssignmentIcon />} 
                iconPosition="start"
              />
              <Tab 
                value="moods" 
                label="Mood" 
                icon={<MoodIcon />} 
                iconPosition="start"
              />
              <Tab 
                value="semantic" 
                label="Semantic Clusters" 
                icon={<InfoIcon />} 
                iconPosition="start"
              />
            </Tabs>
          </Paper>
          
          {/* Filter button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button 
              startIcon={<FilterListIcon />} 
              onClick={handleToggleFilterDialog}
              color="primary"
            >
              Filter
            </Button>
          </Box>
          
          {/* Word Cloud Tab */}
          {activeTab === "wordcloud" && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Word Cloud Analysis
              </Typography>
              
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  minHeight: 400,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {wordCloudData.length === 0 ? (
                  <Typography color="text.secondary">No data available for word cloud</Typography>
                ) : (
                  <Box sx={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative'
                  }}>
                    {wordCloudData.map((word, index) => {
                      // Calculate font size based on frequency (value)
                      // Scale between 12px and 60px
                      const fontSize = 12 + (word.value / wordCloudMax) * 48;
                      
                      // Generate a color based on frequency
                      const hue = 210 + (word.value / wordCloudMax) * 150; // Blue to purple spectrum
                      const color = `hsl(${hue}, 70%, 50%)`;
                      
                      return (
                        <Box 
                          key={index}
                          component="span"
                          sx={{
                            fontSize: `${fontSize}px`,
                            fontWeight: 'bold',
                            color: color,
                            padding: '5px 8px',
                            display: 'inline-block',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            '&:hover': {
                              transform: 'scale(1.1)'
                            }
                          }}
                          onClick={() => {
                            // Show a snackbar with the word frequency
                            setSnackbarMessage(`"${word.text}" appears ${word.value} times in responses`);
                            setSnackbarSeverity('info');
                            setSnackbarOpen(true);
                          }}
                        >
                          {word.text}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Paper>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Top 20 Words
                </Typography>
                <Grid container spacing={2}>
                  {wordCloudData.slice(0, 20).map((word, index) => (
                    <Grid item xs={6} sm={4} md={3} key={index}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Typography variant="body1" fontWeight="medium">
                          {word.text}
                        </Typography>
                        <Chip 
                          label={word.value} 
                          size="small" 
                          color="primary"
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          )}
          
          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Task-Based Analysis
              </Typography>
              
              {taskGroups.map((taskGroup) => (
                <Accordion 
                  key={taskGroup.id}
                  expanded={expandedAccordions[taskGroup.id] !== false}
                  onChange={handleAccordionChange(taskGroup.id)}
                  sx={{ 
                    mb: 2, 
                    boxShadow: 3, 
                    borderLeft: '5px solid #1976d2'
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AssignmentIcon sx={{ mr: 1, color: '#1976d2' }} />
                      <Typography variant="subtitle1" fontWeight="bold">
                        {taskGroup.name}
                      </Typography>
                      <Chip 
                        label={taskGroup.count} 
                        size="small" 
                        sx={{ ml: 1, bgcolor: '#bbdefb', color: '#1976d2' }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {taskGroup.responses.map((response) => (
                      <Paper 
                        key={response.id} 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          borderLeft: '3px solid #1976d2',
                          bgcolor: '#f8fbff'
                        }}
                      >
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          {response.question}
                        </Typography>
                        <Typography variant="body1">
                          {response.response}
                        </Typography>
                        <Box sx={{ mt: 1, mb: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            <strong>Tasks:</strong> {identifyTasks(response.response).join(', ')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            <strong>Mood:</strong> {identifyMood(response.response)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Participant: {response.participantId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(response.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </AccordionDetails>
                </Accordion>
              ))}
              
              {taskGroups.length === 0 && (
                <Typography color="text.secondary">No tasks identified</Typography>
              )}
            </Box>
          )}
          
          {/* Mood Tab */}
          {activeTab === "moods" && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Mood-Based Analysis
              </Typography>
              
              {moodGroups.map((moodGroup) => {
                // Define color based on mood
                let moodColor = '#607d8b'; // Default gray
                let bgColor = '#f5f5f5';
                
                switch(moodGroup.name.toLowerCase()) {
                  case 'positive':
                    moodColor = '#2e7d32'; // Green
                    bgColor = '#f8fff8';
                    break;
                  case 'negative':
                    moodColor = '#d32f2f'; // Red
                    bgColor = '#fff8f8';
                    break;
                  case 'anxious':
                    moodColor = '#ed6c02'; // Orange
                    bgColor = '#fff8f0';
                    break;
                  case 'neutral':
                    moodColor = '#9c27b0'; // Purple
                    bgColor = '#faf4fb';
                    break;
                  default:
                    break;
                }
                
                return (
                  <Accordion 
                    key={moodGroup.id}
                    expanded={expandedAccordions[moodGroup.id] !== false}
                    onChange={handleAccordionChange(moodGroup.id)}
                    sx={{ 
                      mb: 2, 
                      boxShadow: 3, 
                      borderLeft: `5px solid ${moodColor}`
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <MoodIcon sx={{ mr: 1, color: moodColor }} />
                        <Typography variant="subtitle1" fontWeight="bold">
                          {moodGroup.name}
                        </Typography>
                        <Chip 
                          label={moodGroup.count} 
                          size="small" 
                          sx={{ ml: 1, bgcolor: bgColor, color: moodColor }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {moodGroup.responses.map((response) => (
                        <Paper 
                          key={response.id} 
                          elevation={1} 
                          sx={{ 
                            p: 2, 
                            mb: 2, 
                            borderLeft: `3px solid ${moodColor}`,
                            bgcolor: bgColor
                          }}
                        >
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            {response.question}
                          </Typography>
                          <Typography variant="body1">
                            {response.response}
                          </Typography>
                          <Box sx={{ mt: 1, mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              <strong>Tasks:</strong> {identifyTasks(response.response).join(', ')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              <strong>Mood:</strong> {identifyMood(response.response)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Participant: {response.participantId}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(response.date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Paper>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
              
              {moodGroups.length === 0 && (
                <Typography color="text.secondary">No moods identified</Typography>
              )}
            </Box>
          )}
          
          {/* Semantic Clusters Tab */}
          {activeTab === "semantic" && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Semantic Clusters
              </Typography>
              
              {semanticClusters.map((cluster) => (
                <Accordion 
                  key={cluster.group_name}
                  expanded={expandedAccordions[cluster.group_name] !== false}
                  onChange={handleAccordionChange(cluster.group_name)}
                  sx={{ 
                    mb: 2, 
                    boxShadow: 3, 
                    borderLeft: '5px solid #1976d2'
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <InfoIcon sx={{ mr: 1, color: '#1976d2' }} />
                      <Typography variant="subtitle1" fontWeight="bold">
                        {cluster.group_name}
                      </Typography>
                      <Chip 
                        label={cluster.responses.length} 
                        size="small" 
                        sx={{ ml: 1, bgcolor: '#bbdefb', color: '#1976d2' }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {cluster.responses.map((response) => (
                      <Paper 
                        key={response.id} 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          borderLeft: '3px solid #1976d2',
                          bgcolor: '#f8fbff'
                        }}
                      >
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          {response.question}
                        </Typography>
                        <Typography variant="body1">
                          {response.response}
                        </Typography>
                        <Box sx={{ mt: 1, mb: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            <strong>Tasks:</strong> {identifyTasks(response.response).join(', ')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            <strong>Mood:</strong> {identifyMood(response.response)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Participant: {response.participantId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(response.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </AccordionDetails>
                </Accordion>
              ))}
              
              {semanticClusters.length === 0 && (
                <Typography color="text.secondary">No semantic clusters identified</Typography>
              )}
            </Box>
          )}
        </>
      )}
      
      {/* Add/Edit Group Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseGroupDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingGroup ? 'Edit Group' : 'Add Affinity Group'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroupDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveGroup} 
            variant="contained" 
            disabled={!newGroupName.trim()}
          >
            {editingGroup ? 'Save Changes' : 'Create Group'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={handleCloseSettingsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Auto-Grouping Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Number of Groups</Typography>
            <Slider
              value={numGroups}
              onChange={(_, value) => setNumGroups(value)}
              min={2}
              max={10}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Similarity Threshold</Typography>
            <Slider
              value={similarityThreshold}
              onChange={(_, value) => setSimilarityThreshold(value)}
              min={0.1}
              max={0.5}
              step={0.05}
              marks
              valueLabelDisplay="auto"
            />
            <Typography variant="caption" color="text.secondary">
              Higher values create more distinct groups. Lower values allow more similar responses to be grouped together.
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Grouping Method</InputLabel>
              <Select
                value={groupingMethod}
                onChange={e => setGroupingMethod(e.target.value)}
                label="Grouping Method"
              >
                <MenuItem value="keyword">Keyword Similarity</MenuItem>
                <MenuItem value="semantic">Semantic Similarity</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {groupingMethod === 'keyword' 
                ? 'Keyword similarity analyzes common words between responses to group them.'
                : 'Semantic similarity uses advanced NLP to understand the meaning of responses and group them based on semantic relatedness.'}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={includeQuestions}
                  onChange={e => setIncludeQuestions(e.target.checked)}
                />
              }
              label="Include questions in analysis"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              When enabled, the question text will be considered when grouping responses.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettingsDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onClose={handleFilterDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Filter Options</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Pain Points</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={currentFilters.painPoints}
                  onChange={(e) => handleFilterChange('painPoints', e.target.checked)}
                />
              }
              label="Show Pain Points"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={currentFilters.nonPainPoints}
                  onChange={(e) => handleFilterChange('nonPainPoints', e.target.checked)}
                />
              }
              label="Show Non-Pain Points"
            />
          </Box>
          
          {taskGroups.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Tasks</Typography>
              {taskGroups.map(task => (
                <FormControlLabel
                  key={task.id}
                  control={
                    <Switch
                      checked={currentFilters.tasks[task.id] !== false}
                      onChange={(e) => handleFilterChange('tasks', {
                        ...currentFilters.tasks,
                        [task.id]: e.target.checked
                      })}
                    />
                  }
                  label={`${task.name} (${task.count})`}
                />
              ))}
            </Box>
          )}
          
          {moodGroups.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Moods</Typography>
              {moodGroups.map(mood => (
                <FormControlLabel
                  key={mood.id}
                  control={
                    <Switch
                      checked={currentFilters.moods[mood.id] !== false}
                      onChange={(e) => handleFilterChange('moods', {
                        ...currentFilters.moods,
                        [mood.id]: e.target.checked
                      })}
                    />
                  }
                  label={`${mood.name} (${mood.count})`}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFilterDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchorEl}
        open={exportMenuOpen}
        onClose={handleCloseExportMenu}
      >
        <MenuItem onClick={() => { exportAffinityMap('json'); handleCloseExportMenu(); }}>
          Export as JSON
        </MenuItem>
        <MenuItem onClick={() => { exportAffinityMap('csv'); handleCloseExportMenu(); }}>
          Export as CSV
        </MenuItem>
        <MenuItem onClick={() => { exportDataDirectly('json'); handleCloseExportMenu(); }}>
          Export JSON (Direct)
        </MenuItem>
        <MenuItem onClick={() => { exportDataDirectly('csv'); handleCloseExportMenu(); }}>
          Export CSV (Direct)
        </MenuItem>
        <MenuItem onClick={() => { exportAIEvaluation(); handleCloseExportMenu(); }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AssessmentIcon fontSize="small" sx={{ mr: 1 }} />
            Export for AI Evaluation
          </Box>
        </MenuItem>
      </Menu>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Synthesis;
