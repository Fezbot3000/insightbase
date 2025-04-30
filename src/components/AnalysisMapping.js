import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Grid
} from '@mui/material';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import MoodIcon from '@mui/icons-material/Mood';
import DataArrayIcon from '@mui/icons-material/DataArray';
import HubIcon from '@mui/icons-material/Hub';
import LabelIcon from '@mui/icons-material/Label';
import TimelineIcon from '@mui/icons-material/Timeline';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import * as analysisMapping from '../utils/analysisMapping';

function AnalysisMapping({ projectId }) {
  const [activeStep, setActiveStep] = useState(0);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [sampleText, setSampleText] = useState('');
  const [sampleResult, setSampleResult] = useState(null);

  // Load responses when component mounts
  useEffect(() => {
    const loadResponses = async () => {
      try {
        setLoading(true);
        
        // If no projectId, use sample data
        if (!projectId) {
          const sampleResponses = [
            {
              id: 'sample1',
              participantId: 'user1',
              response: 'I felt anxious about my credit card bill this month. I need to create a better budget.',
              question: 'How did you feel about your finances today?',
              date: new Date().toISOString(),
              tasks: ['budgeting', 'paying bills']
            },
            {
              id: 'sample2',
              participantId: 'user2',
              response: 'I was happy to see that I saved more money than expected this month!',
              question: 'How did you feel about your finances today?',
              date: new Date().toISOString(),
              tasks: ['saving', 'budgeting']
            },
            {
              id: 'sample3',
              participantId: 'user1',
              response: 'Worried about unexpected expenses. My car needs repairs.',
              question: 'What financial concerns do you have?',
              date: new Date(Date.now() - 86400000).toISOString(),
              tasks: ['unexpected expenses', 'budgeting']
            },
            {
              id: 'sample4',
              participantId: 'user3',
              response: 'I feel stressed whenever I check my bank account. I need to pay off my student loans.',
              question: 'How did you feel about your finances today?',
              date: new Date().toISOString(),
              tasks: ['debt management', 'stress']
            },
            {
              id: 'sample5',
              participantId: 'user2',
              response: 'I made a big purchase today and now I feel guilty about spending so much.',
              question: 'What financial decisions did you make today?',
              date: new Date(Date.now() - 172800000).toISOString(),
              tasks: ['spending', 'shopping']
            }
          ];
          setResponses(sampleResponses);
        } else {
          // Load from Firestore - first get all participants
          const participantsRef = collection(db, 'projects', projectId, 'participants');
          const participantsSnap = await getDocs(participantsRef);
          
          // Process all participants to extract their responses
          const allResponses = [];
          
          for (const participantDoc of participantsSnap.docs) {
            const participant = { id: participantDoc.id, ...participantDoc.data() };
            
            // Extract responses from this participant
            if (participant.responses && Array.isArray(participant.responses)) {
              participant.responses.forEach(response => {
                allResponses.push({
                  id: response.id || `resp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  participantId: participant.id,
                  response: response.response,
                  question: response.question,
                  date: response.date || new Date().toISOString(),
                  // Extract tasks if they exist in the response
                  tasks: response.tasks || []
                });
              });
            }
          }
          
          console.log(`Loaded ${allResponses.length} responses from ${participantsSnap.docs.length} participants`);
          setResponses(allResponses);
        }
      } catch (err) {
        console.error('Error loading responses:', err);
        setError('Failed to load responses. Using sample data instead.');
        
        // Use sample data as fallback
        setResponses([
          {
            id: 'sample1',
            participantId: 'user1',
            response: 'I felt anxious about my credit card bill this month. I need to create a better budget.',
            question: 'How did you feel about your finances today?',
            date: new Date().toISOString()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    loadResponses();
  }, [projectId]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setResults(null);
  };
  
  const handleRunAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Run the complete analysis pipeline
      const analysisResults = await analysisMapping.runAnalysisPipeline(responses);
      setResults(analysisResults);
      
      // Move to the final step
      setActiveStep(steps.length);
    } catch (err) {
      console.error('Error running analysis:', err);
      setError('Failed to complete analysis: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestStep = (step) => {
    if (!sampleText) return;
    
    try {
      let result;
      switch (step) {
        case 0: // Preprocessing
          result = analysisMapping.preprocessText(sampleText);
          break;
        case 1: // Mood analysis
          result = analysisMapping.identifyMood(sampleText);
          break;
        default:
          result = "This step can't be tested individually with sample text.";
      }
      
      setSampleResult(result);
    } catch (err) {
      setSampleResult(`Error: ${err.message}`);
    }
  };

  const steps = [
    {
      label: 'Normalize & Preprocess Responses',
      icon: <CleaningServicesIcon />,
      description: 'Clean casing, punctuation, contractions. Remove stopwords (unless they add meaning, e.g. "not"). Lemmatize (e.g., "paying" → "pay").',
      why: 'This ensures downstream models don\'t get noise and produce misleading clusters or keyword analysis.',
      details: [
        'Text normalization (lowercase, remove special characters)',
        'Contraction expansion (e.g., "don\'t" → "do not")',
        'Stopword removal with exceptions for meaningful negations',
        'Lemmatization to reduce words to their base form'
      ],
      testable: true,
      testFunction: (text) => analysisMapping.preprocessText(text)
    },
    {
      label: 'Assign Mood Labels',
      icon: <MoodIcon />,
      description: 'Use a keyword-based or small ML classifier model (e.g., logistic regression or sentiment model). Or: use existing mood tags from your system if reliable.',
      why: 'You can now segment your dataset into mood groups — which enables comparisons like: "What\'s unique about the anxious responses?"',
      details: [
        'Multi-class mood classification (positive, negative, anxious, neutral)',
        'Contextual mood detection considering negations',
        'Integration with existing mood tags if available',
        'Confidence scoring for mood assignments'
      ],
      testable: true,
      testFunction: (text) => analysisMapping.identifyMood(text)
    },
    {
      label: 'Generate Sentence Embeddings',
      icon: <DataArrayIcon />,
      description: 'Use sentence-transformers (like all-MiniLM-L6-v2) to encode meaning. Save these vectors for reuse in all subsequent steps.',
      why: 'Embeddings unlock semantic clustering, similarity, and contextual patterns — they\'re your building block for narrative + theme discovery.',
      details: [
        'Sentence-level embedding generation using transformer models',
        'Dimensionality reduction for visualization (t-SNE/UMAP)',
        'Vector caching for performance optimization',
        'Cross-response similarity matrix calculation'
      ],
      testable: false
    },
    {
      label: 'Cluster Responses by Semantic Similarity',
      icon: <HubIcon />,
      description: 'Run semantic clustering (e.g., DBSCAN, Agglomerative) across all responses. Group by user clusters and mood-specific clusters.',
      why: 'You now know what themes recur for each user over time and what themes are common in anxious moods, vs. positive moods, etc.',
      details: [
        'DBSCAN clustering with optimized epsilon parameter',
        'Hierarchical clustering for nested theme discovery',
        'User-specific longitudinal clustering',
        'Mood-stratified clustering for emotional theme isolation'
      ],
      testable: false
    },
    {
      label: 'Label & Summarize Clusters',
      icon: <LabelIcon />,
      description: 'For each cluster, extract top TF-IDF terms and most representative sentence(s). Generate summary like: "This group is about managing debt stress and unexpected expenses".',
      why: 'With moods + clusters established, your labels have rich context to be meaningful.',
      details: [
        'TF-IDF keyword extraction for cluster labeling',
        'Representative sentence selection using centroids',
        'Natural language summary generation',
        'Cluster coherence scoring and validation'
      ],
      testable: false
    },
    {
      label: 'Map User-Level Timelines',
      icon: <TimelineIcon />,
      description: 'For each user: Plot mood over time, annotate with cluster/topic label per day, highlight repeated themes.',
      why: 'You\'ve already got clusters and mood labels — so the narrative view becomes a readable timeline of semantic events.',
      details: [
        'Temporal mood progression visualization',
        'Theme recurrence detection across time periods',
        'Pattern identification (e.g., weekly cycles, event triggers)',
        'Narrative arc construction from longitudinal data'
      ],
      testable: false
    },
    {
      label: 'Analyze Task–Mood Relationships',
      icon: <AnalyticsIcon />,
      description: 'For each task (e.g., "budgeting", "shopping"): Calculate distribution of moods when that task appears. Use co-occurrence or conditional probability.',
      why: 'It\'s a byproduct of your earlier steps: moods + tags + clusters = strong signal for pattern matching.',
      details: [
        'Task-mood correlation analysis',
        'Conditional probability calculation',
        'Statistical significance testing',
        'Causal relationship hypothesis generation'
      ],
      testable: false
    }
  ];

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>Analysis Processing Pipeline</Typography>
        <Typography variant="body1" paragraph>
          This is the recommended processing order for analyzing diary responses, with each step building on the previous ones to create meaningful insights.
        </Typography>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel 
                StepIconComponent={() => (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: activeStep >= index ? 'primary.main' : 'grey.300',
                    color: 'white'
                  }}>
                    {step.icon}
                  </Box>
                )}
              >
                <Typography variant="subtitle1" fontWeight="medium">
                  {step.label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" paragraph>
                    {step.description}
                  </Typography>
                  
                  <Card sx={{ mb: 2, bgcolor: '#f8f9fa' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Why this step matters:
                      </Typography>
                      <Typography variant="body2">
                        {step.why}
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Implementation details:
                  </Typography>
                  <List dense>
                    {step.details.map((detail, i) => (
                      <ListItem key={i}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={detail} />
                      </ListItem>
                    ))}
                  </List>
                  
                  {step.testable && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Test this step:
                      </Typography>
                      <TextField
                        fullWidth
                        label="Enter sample text"
                        variant="outlined"
                        size="small"
                        value={sampleText}
                        onChange={(e) => setSampleText(e.target.value)}
                        sx={{ mb: 2 }}
                      />
                      <Button 
                        variant="contained" 
                        size="small" 
                        onClick={() => handleTestStep(index)}
                        startIcon={<PlayArrowIcon />}
                        disabled={!sampleText}
                      >
                        Process
                      </Button>
                      
                      {sampleResult && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Result:
                          </Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                            {typeof sampleResult === 'string' ? sampleResult : JSON.stringify(sampleResult, null, 2)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
                <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    variant="outlined"
                    size="small"
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    size="small"
                    endIcon={activeStep === steps.length - 1 ? null : <ArrowForwardIcon />}
                  >
                    {activeStep === steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        
        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3, mt: 3, bgcolor: '#f1f8e9' }}>
            <Typography variant="h6" gutterBottom>
              Run Complete Analysis
            </Typography>
            <Typography variant="body1" paragraph>
              Now that you understand the pipeline, you can run the complete analysis on your data.
              This will process {responses.length} responses through all 7 steps.
            </Typography>
            
            <Button 
              variant="contained" 
              onClick={handleRunAnalysis} 
              disabled={loading || responses.length === 0}
              startIcon={<PlayArrowIcon />}
              sx={{ mb: 3 }}
            >
              {loading ? 'Processing...' : 'Run Analysis'}
            </Button>
            
            {results && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Analysis Results
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Semantic Clusters
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {results.clusters.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Distinct thematic groups identified
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          User Timelines
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {results.userTimelines.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Individual user journeys mapped
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Task-Mood Relationships
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {Object.keys(results.taskMoodAnalysis).length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Task-emotion correlations discovered
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Cluster Examples:
                  </Typography>
                  {results.clusters.slice(0, 3).map((cluster, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {cluster.group_name}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        {cluster.summary}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {cluster.top_keywords.map((keyword, i) => (
                          <Chip key={i} label={keyword} size="small" />
                        ))}
                      </Box>
                    </Paper>
                  ))}
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <Button onClick={handleReset} variant="outlined">
                    Reset
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        )}
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Implementation Status</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip 
            label="Preprocessing" 
            color="success" 
            icon={<CheckCircleIcon />} 
            variant="outlined" 
          />
          <Chip 
            label="Mood Analysis" 
            color="success" 
            icon={<CheckCircleIcon />} 
            variant="outlined" 
          />
          <Chip 
            label="Embeddings" 
            color="success" 
            icon={<CheckCircleIcon />} 
            variant="outlined" 
          />
          <Chip 
            label="Semantic Clustering" 
            color="success" 
            icon={<CheckCircleIcon />} 
            variant="outlined" 
          />
          <Chip 
            label="Cluster Labeling" 
            color="success" 
            icon={<CheckCircleIcon />} 
            variant="outlined" 
          />
          <Chip 
            label="User Timelines" 
            color="success" 
            icon={<CheckCircleIcon />} 
            variant="outlined" 
          />
          <Chip 
            label="Task-Mood Analysis" 
            color="success" 
            icon={<CheckCircleIcon />} 
            variant="outlined" 
          />
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary">
          All seven steps of the pipeline have been implemented and are fully functional. 
          The analysis can be run on any set of diary responses to generate insights.
        </Typography>
      </Paper>
    </Box>
  );
}

export default AnalysisMapping;
