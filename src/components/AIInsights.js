import React, { useState } from 'react';
import { 
  Typography, 
  Box, 
  Button, 
  Paper, 
  Chip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  Collapse,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import AnalyticsIcon from '@mui/icons-material/Analytics';

// Mock AI function - in a real app, this would call an actual AI service
const mockGenerateInsights = (processedEntries, themes, type) => {
  // This is a simplified mock that returns predefined insights
  // In a real implementation, this would call an API
  
  // Wait for 1-2 seconds to simulate API call
  return new Promise(resolve => {
    setTimeout(() => {
      const insights = [];
      
      if (type === 'theme' && themes.length > 0) {
        // Generate theme-based insights
        themes.forEach(theme => {
          // Find entries with this theme
          const entriesWithTheme = processedEntries.filter(entry => 
            entry.appliedThemes?.includes(theme.id) || 
            entry.taggedHighlights?.some(h => h.themeId === theme.id)
          );
          
          if (entriesWithTheme.length > 0) {
            // Create insight with confidence based on number of entries
            const confidence = entriesWithTheme.length > 3 ? 'high' : 
                              entriesWithTheme.length > 1 ? 'medium' : 'low';
                              
            // Find specific highlights for this theme
            const highlights = [];
            entriesWithTheme.forEach(entry => {
              const entryHighlights = entry.taggedHighlights?.filter(h => h.themeId === theme.id) || [];
              entryHighlights.forEach(h => {
                highlights.push({
                  text: h.text,
                  field: h.field,
                  participantId: entry.participant,
                  date: entry.date
                });
              });
            });
            
            insights.push({
              id: `insight-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              type: 'theme',
              themeId: theme.id,
              text: `${entriesWithTheme.length} participants mentioned topics related to "${theme.name}"`,
              confidence,
              sources: entriesWithTheme.map(e => ({
                entryId: e.id,
                participantId: e.participant,
                date: e.date,
                highlights: highlights.filter(h => h.participantId === e.participant)
              })),
              status: 'pending',
              createdAt: new Date().toISOString()
            });
          }
        });
      } else if (type === 'participant') {
        // Get unique participants
        const participants = [...new Set(processedEntries.map(e => e.participant))];
        
        // Generate participant-based insights
        participants.forEach(participant => {
          const participantEntries = processedEntries.filter(e => e.participant === participant);
          
          if (participantEntries.length > 0) {
            // Find themes for this participant
            const participantThemes = new Set();
            participantEntries.forEach(entry => {
              (entry.appliedThemes || []).forEach(themeId => participantThemes.add(themeId));
              (entry.taggedHighlights || []).forEach(h => participantThemes.add(h.themeId));
            });
            
            if (participantThemes.size > 0) {
              const themeNames = Array.from(participantThemes)
                .map(id => themes.find(t => t.id === id)?.name || 'Unknown')
                .join(', ');
              
              insights.push({
                id: `insight-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: 'participant',
                participantId: participant,
                text: `Participant ${participant} mentioned ${participantThemes.size} themes: ${themeNames}`,
                confidence: participantThemes.size > 2 ? 'high' : 'medium',
                sources: participantEntries.map(e => ({
                  entryId: e.id,
                  participantId: e.participant,
                  date: e.date,
                  highlights: (e.taggedHighlights || []).map(h => ({
                    text: h.text,
                    field: h.field,
                    participantId: e.participant,
                    date: e.date,
                    themeId: h.themeId
                  }))
                })),
                status: 'pending',
                createdAt: new Date().toISOString()
              });
            }
          }
        });
      } else if (type === 'trends') {
        // Simple trend analysis based on dates
        const dateMap = new Map();
        
        // Group entries by date
        processedEntries.forEach(entry => {
          if (!dateMap.has(entry.date)) {
            dateMap.set(entry.date, []);
          }
          dateMap.get(entry.date).push(entry);
        });
        
        // Sort dates
        const sortedDates = Array.from(dateMap.keys()).sort();
        
        if (sortedDates.length > 1) {
          // Find themes that appear across multiple days
          const themesByDate = new Map();
          
          sortedDates.forEach(date => {
            const entries = dateMap.get(date);
            const themesOnDate = new Set();
            
            entries.forEach(entry => {
              (entry.appliedThemes || []).forEach(themeId => themesOnDate.add(themeId));
              (entry.taggedHighlights || []).forEach(h => themesOnDate.add(h.themeId));
            });
            
            themesByDate.set(date, themesOnDate);
          });
          
          // Find themes present on multiple consecutive days
          const consistentThemes = new Map();
          
          themes.forEach(theme => {
            let consecutiveDays = 0;
            let maxConsecutive = 0;
            
            sortedDates.forEach(date => {
              if (themesByDate.get(date).has(theme.id)) {
                consecutiveDays++;
                maxConsecutive = Math.max(maxConsecutive, consecutiveDays);
              } else {
                consecutiveDays = 0;
              }
            });
            
            if (maxConsecutive > 1) {
              consistentThemes.set(theme.id, maxConsecutive);
            }
          });
          
          // Generate insights for consistent themes
          consistentThemes.forEach((days, themeId) => {
            const theme = themes.find(t => t.id === themeId);
            if (theme) {
              // Find all entries with this theme
              const entriesWithTheme = processedEntries.filter(entry => 
                entry.appliedThemes?.includes(themeId) || 
                entry.taggedHighlights?.some(h => h.themeId === themeId)
              );
              
              insights.push({
                id: `insight-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: 'trend',
                themeId: themeId,
                text: `"${theme.name}" was mentioned consistently across ${days} days`,
                confidence: days > 2 ? 'high' : 'medium',
                sources: entriesWithTheme.map(e => ({
                  entryId: e.id,
                  participantId: e.participant,
                  date: e.date,
                  highlights: (e.taggedHighlights || [])
                    .filter(h => h.themeId === themeId)
                    .map(h => ({
                      text: h.text,
                      field: h.field,
                      participantId: e.participant,
                      date: e.date
                    }))
                })),
                status: 'pending',
                createdAt: new Date().toISOString()
              });
            }
          });
        }
      }
      
      resolve(insights);
    }, 1500);
  });
};

function AIInsights({ processedEntries, themes }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [editingInsight, setEditingInsight] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [filterConfidence, setFilterConfidence] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Generate insights
  const handleGenerateInsights = async (type) => {
    setLoading(true);
    try {
      const newInsights = await mockGenerateInsights(processedEntries, themes, type);
      setInsights([...insights, ...newInsights]);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update insight status
  const handleUpdateStatus = (insightId, status) => {
    setInsights(insights.map(insight => 
      insight.id === insightId ? { ...insight, status } : insight
    ));
  };

  // Toggle expanded insight
  const handleToggleExpand = (insightId) => {
    setExpandedInsight(expandedInsight === insightId ? null : insightId);
  };

  // Edit insight
  const handleEditInsight = (insight) => {
    setEditingInsight(insight);
    setEditedText(insight.text);
  };

  // Save edited insight
  const handleSaveEdit = () => {
    if (editingInsight && editedText.trim()) {
      setInsights(insights.map(insight => 
        insight.id === editingInsight.id ? { ...insight, text: editedText.trim() } : insight
      ));
      setEditingInsight(null);
      setEditedText('');
    }
  };

  // Filter insights
  const filteredInsights = insights.filter(insight => {
    let matchesConfidence = filterConfidence === 'all' || insight.confidence === filterConfidence;
    let matchesStatus = filterStatus === 'all' || insight.status === filterStatus;
    return matchesConfidence && matchesStatus;
  });

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'low': return '#f44336';
      default: return '#757575';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return '#4caf50';
      case 'rejected': return '#f44336';
      case 'pending': return '#ff9800';
      default: return '#757575';
    }
  };

  // Get theme name by ID
  const getThemeName = (themeId) => {
    return themes.find(t => t.id === themeId)?.name || 'Unknown';
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        AI Insights
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        AI insights are generated only from processed entries. All insights include source mapping and confidence levels.
      </Alert>
      
      {/* Generate Insights Panel */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Generate New Insights</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => handleGenerateInsights('theme')}
            disabled={loading || themes.length === 0}
            startIcon={<AnalyticsIcon />}
          >
            By Theme
          </Button>
          <Button 
            variant="contained" 
            onClick={() => handleGenerateInsights('participant')}
            disabled={loading || processedEntries.length === 0}
            startIcon={<AnalyticsIcon />}
          >
            By Participant
          </Button>
          <Button 
            variant="contained" 
            onClick={() => handleGenerateInsights('trends')}
            disabled={loading || processedEntries.length === 0}
            startIcon={<AnalyticsIcon />}
          >
            Identify Trends
          </Button>
        </Box>
        {loading && (
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
            Generating insights...
          </Typography>
        )}
      </Paper>
      
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Confidence</InputLabel>
          <Select
            value={filterConfidence}
            onChange={(e) => setFilterConfidence(e.target.value)}
            label="Confidence"
          >
            <MenuItem value="all">All Confidence</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Status"
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending Review</MenuItem>
            <MenuItem value="accepted">Accepted</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {/* Insights List */}
      {filteredInsights.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            No insights available. Generate insights using the buttons above.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredInsights.map(insight => (
            <Grid item xs={12} key={insight.id}>
              <Card 
                sx={{ 
                  borderLeft: `5px solid ${getConfidenceColor(insight.confidence)}`,
                  boxShadow: expandedInsight === insight.id ? 3 : 1
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6">{insight.text}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip 
                          label={`Confidence: ${insight.confidence.charAt(0).toUpperCase() + insight.confidence.slice(1)}`}
                          sx={{ bgcolor: getConfidenceColor(insight.confidence), color: 'white' }}
                          size="small"
                        />
                        <Chip 
                          label={`Status: ${insight.status.charAt(0).toUpperCase() + insight.status.slice(1)}`}
                          sx={{ bgcolor: getStatusColor(insight.status), color: 'white' }}
                          size="small"
                        />
                        {insight.type === 'theme' && (
                          <Chip 
                            label={`Theme: ${getThemeName(insight.themeId)}`}
                            size="small"
                          />
                        )}
                        {insight.type === 'participant' && (
                          <Chip 
                            label={`Participant: ${insight.participantId}`}
                            size="small"
                          />
                        )}
                        {insight.type === 'trend' && (
                          <Chip 
                            label="Trend Analysis"
                            size="small"
                          />
                        )}
                      </Box>
                    </Box>
                    <IconButton onClick={() => handleToggleExpand(insight.id)}>
                      {expandedInsight === insight.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  
                  <Collapse in={expandedInsight === insight.id}>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1">Source Material:</Typography>
                      <List>
                        {insight.sources.map((source, index) => (
                          <ListItem key={`${source.entryId}-${index}`} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <ListItemText 
                              primary={`Participant: ${source.participantId}`}
                              secondary={`Date: ${source.date}`}
                            />
                            {source.highlights && source.highlights.length > 0 && (
                              <Box sx={{ ml: 2, mt: 1, width: '100%' }}>
                                <Typography variant="caption">Highlighted Text:</Typography>
                                {source.highlights.map((highlight, hIndex) => (
                                  <Paper 
                                    key={`highlight-${hIndex}`} 
                                    sx={{ 
                                      p: 1, 
                                      mt: 0.5, 
                                      bgcolor: '#fffde7',
                                      borderLeft: highlight.themeId ? 
                                        `3px solid ${getConfidenceColor('medium')}` : 
                                        'none'
                                    }}
                                  >
                                    <Typography variant="body2">
                                      "{highlight.text}"
                                      {highlight.themeId && (
                                        <Chip 
                                          label={getThemeName(highlight.themeId)}
                                          size="small"
                                          sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                        />
                                      )}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                      From {highlight.field}
                                    </Typography>
                                  </Paper>
                                ))}
                              </Box>
                            )}
                            <Divider sx={{ width: '100%', my: 1 }} />
                          </ListItem>
                        ))}
                      </List>
                      
                      <Typography variant="subtitle1" sx={{ mt: 2 }}>Confidence Explanation:</Typography>
                      <Paper sx={{ p: 1.5, bgcolor: '#f5f5f5' }}>
                        <Typography variant="body2">
                          {insight.confidence === 'high' && 
                            `High confidence based on multiple direct quotes from ${insight.sources.length} sources.`}
                          {insight.confidence === 'medium' && 
                            `Medium confidence based on limited but clear evidence from ${insight.sources.length} sources.`}
                          {insight.confidence === 'low' && 
                            `Low confidence due to limited data or speculative connections from ${insight.sources.length} sources.`}
                        </Typography>
                      </Paper>
                    </Box>
                  </Collapse>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                  {insight.status === 'pending' && (
                    <>
                      <Button 
                        startIcon={<CheckCircleIcon />}
                        color="success"
                        onClick={() => handleUpdateStatus(insight.id, 'accepted')}
                      >
                        Accept
                      </Button>
                      <Button 
                        startIcon={<CancelIcon />}
                        color="error"
                        onClick={() => handleUpdateStatus(insight.id, 'rejected')}
                      >
                        Reject
                      </Button>
                      <Button 
                        startIcon={<EditIcon />}
                        onClick={() => handleEditInsight(insight)}
                      >
                        Edit
                      </Button>
                    </>
                  )}
                  {insight.status === 'accepted' && (
                    <Button 
                      startIcon={<CancelIcon />}
                      onClick={() => handleUpdateStatus(insight.id, 'pending')}
                    >
                      Revert to Pending
                    </Button>
                  )}
                  {insight.status === 'rejected' && (
                    <Button 
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleUpdateStatus(insight.id, 'pending')}
                    >
                      Revert to Pending
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={Boolean(editingInsight)} onClose={() => setEditingInsight(null)}>
        <DialogTitle>Edit Insight</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            sx={{ mt: 1, minWidth: 400 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingInsight(null)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AIInsights;
