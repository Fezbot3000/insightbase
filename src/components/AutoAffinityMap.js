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
  LinearProgress
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
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import semanticSimilarity from '../utils/semanticSimilarity';
import stopwords from '../utils/stopwords';

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

function AutoAffinityMap({ projectId }) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [responses, setResponses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // Auto-grouping settings
  const [numGroups, setNumGroups] = useState(5);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [groupingMethod, setGroupingMethod] = useState('semantic');
  const [includeQuestions, setIncludeQuestions] = useState(true);

  // Load project data and extract responses
  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Load project data
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        
        if (projectSnap.exists()) {
          const projectData = projectSnap.data();
          
          // Load participants
          const participantsResponses = [];
          const participantsCollectionRef = collection(db, `projects/${projectId}/participants`);
          const participantsSnap = await getDocs(participantsCollectionRef);
          
          participantsSnap.forEach((doc) => {
            const participant = { id: doc.id, ...doc.data() };
            
            // Extract responses
            if (participant.responses && participant.responses.length > 0) {
              participant.responses.forEach(response => {
                participantsResponses.push({
                  id: `${participant.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  participantId: participant.id,
                  responseId: response.id || Date.now().toString(),
                  question: response.question,
                  response: response.response,
                  date: response.date,
                  groupId: null, // Initially not assigned to any group
                  keywords: extractKeywords(response.response, response.question)
                });
              });
            }
          });
          
          setResponses(participantsResponses);
          
          // Load affinity groups if they exist
          if (projectData.autoAffinityGroups) {
            setGroups(projectData.autoAffinityGroups);
            
            // Update responses with group assignments
            if (projectData.autoAffinityAssignments) {
              const updatedResponses = participantsResponses.map(response => {
                const assignment = projectData.autoAffinityAssignments.find(
                  a => a.responseId === response.responseId && a.participantId === response.participantId
                );
                
                return {
                  ...response,
                  groupId: assignment?.groupId || null
                };
              });
              
              setResponses(updatedResponses);
            }
          }
        }
      } catch (error) {
        console.error('Error loading project data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProjectData();
  }, [projectId]);

  // Extract keywords from text
  const extractKeywords = (text, question = '') => {
    // Combine question and response if includeQuestions is true
    const textToProcess = includeQuestions ? `${question} ${text}` : text;
    
    return semanticSimilarity.extractKeywords(textToProcess, 10);
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
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        
        // Create assignments from responses
        const affinityAssignments = responses
          .filter(r => r.groupId)
          .map(r => ({
            participantId: r.participantId,
            responseId: r.responseId,
            groupId: r.groupId
          }));
        
        await setDoc(projectRef, {
          ...projectData,
          autoAffinityGroups: groups,
          autoAffinityAssignments: affinityAssignments
        });
        
        showSnackbar('Affinity map saved successfully', 'success');
      }
    } catch (error) {
      console.error('Error saving affinity data:', error);
      showSnackbar('Error saving affinity map', 'error');
    }
  };

  // Save specific values to Firestore (used for delete operations)
  const saveAffinityDataWithValues = async (groupsToSave, responsesToSave) => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        
        // Create assignments from responses
        const affinityAssignments = responsesToSave
          .filter(r => r.groupId)
          .map(r => ({
            participantId: r.participantId,
            responseId: r.responseId,
            groupId: r.groupId
          }));
        
        await setDoc(projectRef, {
          ...projectData,
          autoAffinityGroups: groupsToSave,
          autoAffinityAssignments: affinityAssignments
        });
        
        showSnackbar('Affinity map saved successfully', 'success');
      }
    } catch (error) {
      console.error('Error saving affinity data:', error);
      showSnackbar('Error saving affinity map', 'error');
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

  // Handle group deletion
  const handleDeleteGroup = (groupId) => {
    // Remove group
    const updatedGroups = groups.filter(g => g.id !== groupId);
    setGroups(updatedGroups);
    
    // Unassign responses from this group
    const updatedResponses = responses.map(r => 
      r.groupId === groupId ? { ...r, groupId: null } : r
    );
    setResponses(updatedResponses);
    
    // Save changes to Firestore immediately
    saveAffinityDataWithValues(updatedGroups, updatedResponses);
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
      
      if (format === 'json') {
        // Prepare data for JSON export
        exportData = {
          projectId,
          exportDate: new Date().toISOString(),
          groups: groups.map(group => ({
            id: group.id,
            name: group.name,
            summary: group.summary,
            keywords: group.keywords,
            responses: getGroupResponses(group.id).map(response => ({
              id: response.id,
              participantId: response.participantId,
              question: response.question,
              response: response.response,
              date: response.date
            }))
          })),
          unassignedResponses: getUnassignedResponses().map(response => ({
            id: response.id,
            participantId: response.participantId,
            question: response.question,
            response: response.response,
            date: response.date
          }))
        };
        
        fileContent = JSON.stringify(exportData, null, 2);
        fileName = `affinity-map-${timestamp}.json`;
        
        // Create and download the file
        downloadFile(fileContent, fileName, 'application/json');
        
        showSnackbar('Affinity map exported as JSON', 'success');
      } else if (format === 'csv') {
        // Prepare data for CSV export
        // Header row
        const csvRows = [
          ['Group ID', 'Group Name', 'Group Summary', 'Response ID', 'Participant ID', 'Question', 'Response', 'Date']
        ];
        
        // Add data for each group and its responses
        groups.forEach(group => {
          const groupResponses = getGroupResponses(group.id);
          
          if (groupResponses.length === 0) {
            // Add a row for empty groups
            csvRows.push([
              group.id,
              group.name,
              group.summary,
              '', '', '', '', ''
            ]);
          } else {
            // Add rows for each response in the group
            groupResponses.forEach(response => {
              csvRows.push([
                group.id,
                group.name,
                group.summary,
                response.id,
                response.participantId,
                response.question,
                response.response,
                response.date
              ]);
            });
          }
        });
        
        // Add unassigned responses
        getUnassignedResponses().forEach(response => {
          csvRows.push([
            'UNASSIGNED',
            'Unassigned Responses',
            '',
            response.id,
            response.participantId,
            response.question,
            response.response,
            response.date
          ]);
        });
        
        // Convert to CSV string
        fileContent = csvRows.map(row => 
          row.map(cell => 
            // Escape quotes and wrap in quotes if contains comma, newline or quote
            typeof cell === 'string' && (cell.includes(',') || cell.includes('\n') || cell.includes('"')) 
              ? `"${cell.replace(/"/g, '""')}"` 
              : cell
          ).join(',')
        ).join('\n');
        
        fileName = `affinity-map-${timestamp}.csv`;
        
        // Create and download the file
        downloadFile(fileContent, fileName, 'text/csv');
        
        showSnackbar('Affinity map exported as CSV', 'success');
      } else if (format === 'evaluation') {
        // Prepare data for evaluation export - specialized format for AI analysis
        exportData = {
          projectId,
          exportDate: new Date().toISOString(),
          evaluationRequest: "Please evaluate the effectiveness of this affinity mapping based on the coherence of groups and the relevance of the summaries.",
          groups: groups.map(group => ({
            id: group.id,
            name: group.name,
            summary: group.summary,
            keywords: group.keywords,
            responses: getGroupResponses(group.id).map(response => ({
              question: response.question,
              response: response.response,
            }))
          }))
        };
        
        fileContent = JSON.stringify(exportData, null, 2);
        fileName = `affinity-map-evaluation-${timestamp}.json`;
        
        // Create and download the file
        downloadFile(fileContent, fileName, 'application/json');
        
        showSnackbar('Evaluation data exported. Upload this file to get AI feedback on your groupings.', 'success');
      }
    } catch (error) {
      console.error('Error exporting affinity map:', error);
      showSnackbar('Error exporting affinity map', 'error');
    }
  };

  // Helper function to download a file
  const downloadFile = (content, fileName, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle export menu
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState(null);
  
  const handleOpenExportMenu = (event) => {
    setExportMenuAnchorEl(event.currentTarget);
  };
  
  const handleCloseExportMenu = () => {
    setExportMenuAnchorEl(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Automated Affinity Mapping</Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<TuneIcon />} 
            onClick={handleOpenSettingsDialog}
            sx={{ mr: 1 }}
          >
            Settings
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<FileDownloadIcon />} 
            onClick={handleOpenExportMenu}
            sx={{ mr: 1 }}
            disabled={groups.length === 0}
          >
            Export
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<SaveIcon />} 
            onClick={saveAffinityData}
            sx={{ mr: 1 }}
          >
            Save
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AutoFixHighIcon />} 
            onClick={handleAutoGenerateGroups}
            disabled={processing || responses.length === 0}
          >
            Auto-Generate Groups
          </Button>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : processing ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 5 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Analyzing responses and generating groups...</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {/* Affinity Groups */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Affinity Groups</Typography>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />} 
                onClick={() => handleOpenGroupDialog()}
                size="small"
              >
                Add Group
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
              {groups.length === 0 ? (
                <Paper sx={{ p: 3, width: '100%', textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No affinity groups yet. Click "Auto-Generate Groups" to analyze your responses and create groups automatically.
                  </Typography>
                </Paper>
              ) : (
                groups.map(group => (
                  <Card 
                    key={group.id} 
                    sx={{ 
                      width: 300,
                      minHeight: 200,
                      display: 'flex',
                      flexDirection: 'column',
                      borderTop: `4px solid ${group.color}`,
                    }}
                  >
                    <CardHeader
                      title={group.name}
                      action={
                        <Box>
                          <IconButton 
                            size="small" 
                            onClick={() => handleOpenGroupDialog(group)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteGroup(group.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                      sx={{ 
                        pb: 1,
                        '& .MuiCardHeader-title': {
                          fontSize: '1rem',
                          fontWeight: 'bold'
                        }
                      }}
                    />
                    <Divider />
                    <CardContent sx={{ pt: 1, pb: 1, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                      <Typography variant="body2" color="text.secondary">
                        {group.summary}
                      </Typography>
                    </CardContent>
                    <Divider />
                    <CardContent sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 400 }}>
                      {getGroupResponses(group.id).length === 0 ? (
                        <Typography color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
                          No responses in this group
                        </Typography>
                      ) : (
                        getGroupResponses(group.id).map(response => (
                          <Paper
                            key={response.id}
                            sx={{ 
                              p: 1.5, 
                              mb: 1.5, 
                              position: 'relative',
                            }}
                          >
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                              {response.question}
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {response.response.length > 100 
                                ? `${response.response.substring(0, 100)}...` 
                                : response.response}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {response.participantId}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(response.date).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Paper>
                        ))
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          </Grid>
          
          {/* Unassigned Responses */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Unassigned Responses</Typography>
            {getUnassignedResponses().length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  All responses have been assigned to groups.
                </Typography>
              </Paper>
            ) : (
              Object.entries(getResponsesByQuestion()).map(([question, questionResponses]) => (
                <Box key={question} sx={{ mb: 4 }}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText'
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight="bold">
                      {question} ({questionResponses.length})
                    </Typography>
                  </Paper>
                  <Grid container spacing={2}>
                    {questionResponses.map(response => (
                      <Grid item xs={12} sm={6} md={4} key={response.id}>
                        <Paper
                          sx={{ 
                            p: 2, 
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                            {response.response}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto' }}>
                            <Typography variant="caption" color="text.secondary">
                              {response.participantId}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(response.date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ))
            )}
          </Grid>
        </Grid>
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
      
      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchorEl}
        open={Boolean(exportMenuAnchorEl)}
        onClose={handleCloseExportMenu}
      >
        <MenuItem onClick={() => { exportAffinityMap('json'); handleCloseExportMenu(); }}>
          Export as JSON
        </MenuItem>
        <MenuItem onClick={() => { exportAffinityMap('csv'); handleCloseExportMenu(); }}>
          Export as CSV
        </MenuItem>
        <MenuItem onClick={() => { exportAffinityMap('evaluation'); handleCloseExportMenu(); }}>
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
}

export default AutoAffinityMap;
