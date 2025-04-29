import React, { useState } from 'react';
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
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider,
  Rating,
  List,
  ListItem,
  ListItemText,
  Grid
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

function AffinityMapEvaluator() {
  const [file, setFile] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  // Handle file upload
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile);
      readFile(selectedFile);
    } else {
      showSnackbar('Please select a valid JSON file', 'error');
    }
  };

  // Read the uploaded file
  const readFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.groups && data.evaluationRequest) {
          setEvaluationData(data);
        } else {
          showSnackbar('Invalid evaluation file format', 'error');
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
        showSnackbar('Error parsing file', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Evaluate the affinity map
  const evaluateAffinityMap = async () => {
    if (!evaluationData) return;

    setLoading(true);
    try {
      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate the evaluation with a local function
      const result = await simulateEvaluation(evaluationData);
      setEvaluation(result);
    } catch (error) {
      console.error('Error evaluating affinity map:', error);
      showSnackbar('Error evaluating affinity map', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Simulate an AI evaluation (in a real app, this would be an API call)
  const simulateEvaluation = (data) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Calculate some basic metrics
        const groups = data.groups;
        const totalGroups = groups.length;
        const totalResponses = groups.reduce((sum, group) => sum + group.responses.length, 0);
        
        // Calculate average responses per group
        const avgResponsesPerGroup = totalResponses / totalGroups;
        
        // Check if groups are balanced
        const responseCounts = groups.map(g => g.responses.length);
        const maxResponses = Math.max(...responseCounts);
        const minResponses = Math.min(...responseCounts);
        const balanceRatio = minResponses / maxResponses;
        
        // Generate group evaluations
        const groupEvaluations = groups.map(group => {
          // Calculate keyword relevance by checking if keywords appear in responses
          const keywordRelevance = group.keywords.map(keyword => {
            const occurrences = group.responses.filter(r => 
              (r.response.toLowerCase().includes(keyword.toLowerCase()) || 
               r.question.toLowerCase().includes(keyword.toLowerCase()))
            ).length;
            return {
              keyword,
              occurrenceRatio: occurrences / group.responses.length
            };
          });
          
          // Calculate average keyword relevance
          const avgKeywordRelevance = keywordRelevance.reduce((sum, k) => sum + k.occurrenceRatio, 0) / keywordRelevance.length;
          
          // Check question consistency - are responses from similar questions?
          const questions = group.responses.map(r => r.question);
          const uniqueQuestions = new Set(questions);
          const questionConsistency = 1 - (uniqueQuestions.size / group.responses.length);
          
          // Calculate overall coherence score
          const coherenceScore = (avgKeywordRelevance * 0.7) + (questionConsistency * 0.3);
          
          return {
            groupId: group.id,
            groupName: group.name,
            responseCount: group.responses.length,
            keywordRelevance: avgKeywordRelevance,
            questionConsistency: questionConsistency,
            coherenceScore: coherenceScore,
            rating: Math.round(coherenceScore * 5),
            feedback: generateFeedback(coherenceScore, group.summary, avgKeywordRelevance, questionConsistency)
          };
        });
        
        // Calculate overall score
        const avgCoherence = groupEvaluations.reduce((sum, g) => sum + g.coherenceScore, 0) / totalGroups;
        const balanceScore = balanceRatio * 0.8 + 0.2; // Ensure score is between 0.2 and 1
        const overallScore = (avgCoherence * 0.7) + (balanceScore * 0.3);
        
        resolve({
          metrics: {
            totalGroups,
            totalResponses,
            avgResponsesPerGroup,
            balanceRatio,
            avgCoherence,
            overallScore
          },
          groupEvaluations,
          overallFeedback: generateOverallFeedback(overallScore, avgCoherence, balanceRatio, groupEvaluations)
        });
      }, 2000); // Simulate processing time
    });
  };

  // Generate feedback for a group
  const generateFeedback = (coherenceScore, summary, keywordRelevance, questionConsistency) => {
    let feedback = '';
    
    if (coherenceScore > 0.8) {
      feedback = `This is a highly coherent group with strong thematic consistency. The summary "${summary}" accurately reflects the content.`;
    } else if (coherenceScore > 0.6) {
      feedback = `This is a good group with clear thematic connections. The summary "${summary}" is relevant to most responses.`;
    } else if (coherenceScore > 0.4) {
      feedback = `This group has moderate coherence. The summary "${summary}" captures some themes but might be refined.`;
    } else {
      feedback = `This group lacks strong coherence. The summary "${summary}" may not accurately reflect the responses.`;
    }
    
    // Add specific feedback about keywords and questions
    if (keywordRelevance < 0.4) {
      feedback += " Consider reviewing the keywords as they don't appear frequently in the responses.";
    }
    
    if (questionConsistency < 0.3) {
      feedback += " The responses come from many different questions, which may reduce thematic focus.";
    } else if (questionConsistency > 0.7) {
      feedback += " The responses come from similar questions, which helps maintain thematic consistency.";
    }
    
    return feedback;
  };

  // Generate overall feedback
  const generateOverallFeedback = (overallScore, avgCoherence, balanceRatio, groupEvaluations) => {
    let feedback = '';
    
    if (overallScore > 0.8) {
      feedback = 'This is an excellent affinity mapping with strong thematic grouping and good balance between groups.';
    } else if (overallScore > 0.6) {
      feedback = 'This is a good affinity mapping with clear themes and reasonable balance between groups.';
    } else if (overallScore > 0.4) {
      feedback = 'This affinity mapping shows moderate effectiveness with some coherent groups but room for improvement.';
    } else {
      feedback = 'This affinity mapping needs significant improvement in group coherence and balance.';
    }
    
    // Add specific feedback about coherence and balance
    if (avgCoherence < 0.5) {
      feedback += ' Consider reviewing group assignments to improve thematic coherence within groups.';
    }
    
    if (balanceRatio < 0.3) {
      feedback += ' The groups are quite unbalanced in size, which may indicate some themes are over or under-represented.';
    }
    
    // Add suggestions based on group evaluations
    const lowCoherenceGroups = groupEvaluations.filter(g => g.coherenceScore < 0.5);
    if (lowCoherenceGroups.length > 0) {
      feedback += ` Consider reviewing ${lowCoherenceGroups.length} groups with low coherence scores.`;
    }
    
    return feedback;
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

  // Reset the evaluator
  const handleReset = () => {
    setFile(null);
    setEvaluationData(null);
    setEvaluation(null);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Affinity Map Evaluator</Typography>
      <Typography variant="body1" paragraph>
        Upload your exported affinity map data to receive an evaluation of its effectiveness.
      </Typography>
      
      {!evaluationData ? (
        <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
          <input
            accept="application/json"
            id="upload-affinity-map"
            type="file"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="upload-affinity-map">
            <Button
              variant="contained"
              component="span"
              startIcon={<UploadFileIcon />}
              sx={{ mb: 2 }}
            >
              Upload Affinity Map Data
            </Button>
          </label>
          <Typography variant="body2" color="text.secondary">
            Upload a JSON file exported from the Auto Affinity Map using the "Export for AI Evaluation" option.
          </Typography>
        </Paper>
      ) : !evaluation ? (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Affinity Map Data</Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Project ID: {evaluationData.projectId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Export Date: {new Date(evaluationData.exportDate).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Groups: {evaluationData.groups.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Responses: {evaluationData.groups.reduce((sum, g) => sum + g.responses.length, 0)}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AssessmentIcon />}
              onClick={evaluateAffinityMap}
              disabled={loading}
            >
              {loading ? 'Evaluating...' : 'Evaluate Affinity Map'}
            </Button>
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                <Typography>Analyzing groupings and generating feedback...</Typography>
              </Box>
            )}
          </Paper>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>Groups Preview</Typography>
            <Grid container spacing={2}>
              {evaluationData.groups.map((group, index) => (
                <Grid item xs={12} sm={6} md={4} key={group.id}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {group.name} ({group.responses.length} responses)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {group.summary}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Keywords: {group.keywords.join(', ')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      ) : (
        <Box>
          <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f9f9f9' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6">Overall Evaluation</Typography>
              <Button variant="outlined" size="small" onClick={handleReset}>
                Evaluate Another Map
              </Button>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" paragraph>
                {evaluation.overallFeedback}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>Overall Effectiveness:</Typography>
                <Rating 
                  value={Math.round(evaluation.metrics.overallScore * 5)} 
                  readOnly 
                  precision={0.5}
                />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  ({(evaluation.metrics.overallScore * 100).toFixed(0)}%)
                </Typography>
              </Box>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Group Coherence</Typography>
                    <Typography variant="h6">
                      {(evaluation.metrics.avgCoherence * 100).toFixed(0)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Group Balance</Typography>
                    <Typography variant="h6">
                      {(evaluation.metrics.balanceRatio * 100).toFixed(0)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Total Groups</Typography>
                    <Typography variant="h6">
                      {evaluation.metrics.totalGroups}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Avg Responses/Group</Typography>
                    <Typography variant="h6">
                      {evaluation.metrics.avgResponsesPerGroup.toFixed(1)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Paper>
          
          <Typography variant="h6" gutterBottom>Group Evaluations</Typography>
          <Grid container spacing={2}>
            {evaluation.groupEvaluations.map((groupEval) => (
              <Grid item xs={12} md={6} key={groupEval.groupId}>
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1">
                        {groupEval.groupName} ({groupEval.responseCount} responses)
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Rating value={groupEval.rating} readOnly size="small" />
                        {groupEval.coherenceScore > 0.6 ? (
                          <CheckCircleIcon color="success" fontSize="small" sx={{ ml: 1 }} />
                        ) : groupEval.coherenceScore < 0.4 ? (
                          <ErrorIcon color="error" fontSize="small" sx={{ ml: 1 }} />
                        ) : null}
                      </Box>
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <Typography variant="body2" paragraph>
                      {groupEval.feedback}
                    </Typography>
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Keyword Relevance: {(groupEval.keywordRelevance * 100).toFixed(0)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Question Consistency: {(groupEval.questionConsistency * 100).toFixed(0)}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      
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

export default AffinityMapEvaluator;
