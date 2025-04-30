import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  Divider,
  IconButton,
  Grid,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Alert,
  Chip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextareaAutosize,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';

function ParticipantManager({ onProcessedDataChange, projectId }) {
  // Participants and their responses
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [editResponseDialogOpen, setEditResponseDialogOpen] = useState(false);
  
  // Form states
  const [newParticipantId, setNewParticipantId] = useState('');
  const [newParticipantDetails, setNewParticipantDetails] = useState('');
  const [editingParticipantId, setEditingParticipantId] = useState(null);
  
  const [newResponses, setNewResponses] = useState([{
    id: Date.now().toString(),
    question: '',
    response: '',
    date: new Date().toISOString().split('T')[0]
  }]);
  
  const [editingResponse, setEditingResponse] = useState(null);
  
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkImportFormat, setBulkImportFormat] = useState('diary'); // 'standard' or 'diary'
  const [bulkImportQuestion, setBulkImportQuestion] = useState('What did you do with money today?');
  const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Menu state
  const [participantMenuAnchorEl, setParticipantMenuAnchorEl] = useState(null);
  const [activeParticipantForMenu, setActiveParticipantForMenu] = useState(null);

  // Firestore collection reference
  const participantsCollectionRef = collection(db, `projects/${projectId}/participants`);
  
  // Load participants from Firestore
  useEffect(() => {
    const loadParticipants = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const q = query(participantsCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const loadedParticipants = [];
        querySnapshot.forEach((doc) => {
          loadedParticipants.push({ id: doc.id, ...doc.data() });
        });
        
        setParticipants(loadedParticipants);
        
        if (onProcessedDataChange) {
          onProcessedDataChange(loadedParticipants);
        }
      } catch (error) {
        console.error('Error loading participants:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadParticipants();
  }, [projectId]);
  
  // Save participant to Firestore
  const saveParticipantToFirestore = async (participant) => {
    try {
      await setDoc(doc(participantsCollectionRef, participant.id), participant);
    } catch (error) {
      console.error('Error saving participant:', error);
    }
  };
  
  // Delete participant from Firestore
  const deleteParticipantFromFirestore = async (participantId) => {
    try {
      await deleteDoc(doc(participantsCollectionRef, participantId));
    } catch (error) {
      console.error('Error deleting participant:', error);
    }
  };

  // Handle participant dialog
  const handleOpenParticipantDialog = (participant = null) => {
    if (participant) {
      setNewParticipantId(participant.id);
      setNewParticipantDetails(participant.details || '');
      setEditingParticipantId(participant.id);
    } else {
      setNewParticipantId('');
      setNewParticipantDetails('');
      setEditingParticipantId(null);
    }
    setParticipantDialogOpen(true);
  };

  const handleCloseParticipantDialog = () => {
    setParticipantDialogOpen(false);
    setNewParticipantId('');
    setNewParticipantDetails('');
    setEditingParticipantId(null);
  };

  const handleSaveParticipant = () => {
    if (newParticipantId.trim()) {
      if (editingParticipantId) {
        // Edit existing participant
        const updatedParticipant = {
          id: newParticipantId.trim(),
          details: newParticipantDetails.trim(),
          responses: selectedParticipant ? selectedParticipant.responses : [],
          createdAt: selectedParticipant ? selectedParticipant.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setParticipants(participants.map(p => 
          p.id === editingParticipantId ? updatedParticipant : p
        ));
        
        if (selectedParticipant && selectedParticipant.id === editingParticipantId) {
          setSelectedParticipant(updatedParticipant);
        }
        
        // Save to Firestore
        saveParticipantToFirestore(updatedParticipant);
      } else {
        // Create new participant
        const newParticipant = {
          id: newParticipantId.trim(),
          details: newParticipantDetails.trim(),
          responses: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setParticipants([...participants, newParticipant]);
        
        // Save to Firestore
        saveParticipantToFirestore(newParticipant);
      }
      handleCloseParticipantDialog();
    }
  };

  // Handle response dialog
  const handleOpenResponseDialog = () => {
    setResponseDialogOpen(true);
    setNewResponses([{
      id: Date.now().toString(),
      question: '',
      response: '',
      date: new Date().toISOString().split('T')[0]
    }]);
  };

  const handleCloseResponseDialog = () => {
    setResponseDialogOpen(false);
  };

  const handleAddResponseField = () => {
    setNewResponses([
      ...newResponses,
      {
        id: Date.now().toString(),
        question: newResponses[0].question, // Copy question from first response
        response: '',
        date: new Date().toISOString().split('T')[0]
      }
    ]);
  };

  const handleResponseChange = (id, field, value) => {
    setNewResponses(newResponses.map(resp => 
      resp.id === id ? { ...resp, [field]: value } : resp
    ));
    
    // If changing the question in the first response, update all other responses
    if (field === 'question' && newResponses[0].id === id) {
      setNewResponses(newResponses.map((resp, index) => 
        index === 0 ? { ...resp, question: value } : { ...resp, question: value }
      ));
    }
  };

  const handleRemoveResponseField = (id) => {
    if (newResponses.length > 1) {
      setNewResponses(newResponses.filter(resp => resp.id !== id));
    }
  };

  const handleAddResponse = () => {
    if (selectedParticipant && newResponses.some(r => r.question.trim() && r.response.trim())) {
      const validResponses = newResponses.filter(r => r.question.trim() && r.response.trim());
      
      const updatedParticipant = {
        ...selectedParticipant,
        responses: [...selectedParticipant.responses, ...validResponses],
        updatedAt: new Date().toISOString()
      };
      
      const updatedParticipants = participants.map(p => 
        p.id === selectedParticipant.id ? updatedParticipant : p
      );
      
      setParticipants(updatedParticipants);
      setSelectedParticipant(updatedParticipant);
      
      // Save to Firestore
      saveParticipantToFirestore(updatedParticipant);
      
      if (onProcessedDataChange) {
        onProcessedDataChange(updatedParticipants);
      }
      
      handleCloseResponseDialog();
    }
  };

  // Handle bulk import dialog
  const handleOpenBulkImportDialog = () => {
    setBulkImportText('');
    setBulkImportQuestion('What did you do with money today?');
    setBulkImportFormat('diary');
    setDefaultDate(new Date().toISOString().split('T')[0]);
    setBulkImportDialogOpen(true);
  };

  const handleCloseBulkImportDialog = () => {
    setBulkImportDialogOpen(false);
    setBulkImportText('');
  };

  const handleBulkImport = () => {
    if (selectedParticipant && bulkImportText.trim()) {
      try {
        let newResponses = [];
        
        if (bulkImportFormat === 'standard') {
          // Standard format: Question 1\nResponse 1\nQuestion 2\nResponse 2\n...
          const lines = bulkImportText.trim().split('\n');
          
          for (let i = 0; i < lines.length; i += 2) {
            if (i + 1 < lines.length) {
              newResponses.push({
                id: Date.now().toString() + i,
                question: lines[i].trim(),
                response: lines[i + 1].trim(),
                date: new Date(defaultDate).toISOString(),
                createdAt: new Date().toISOString()
              });
            }
          }
        } else if (bulkImportFormat === 'diary') {
          // Diary format: Each line is a response, with optional date in parentheses
          // Example: "I bought groceries (22/04/25)"
          const lines = bulkImportText.trim().split('\n');
          
          lines.forEach((line, index) => {
            if (line.trim()) {
              // Check if the line contains a date in parentheses
              const date = extractDateFromLine(line);
              let response = line.trim();
              
              // Remove the date part from the response if it exists
              if (date) {
                response = response.replace(/\(\d{2}\/\d{2}\/\d{2}\)/, '').trim();
              }
              
              newResponses.push({
                id: Date.now().toString() + index,
                question: bulkImportQuestion.trim(),
                response: response,
                date: date ? date.toISOString() : new Date(defaultDate).toISOString(),
                createdAt: new Date().toISOString()
              });
            }
          });
        }
        
        if (newResponses.length > 0) {
          const updatedParticipant = {
            ...selectedParticipant,
            responses: [...selectedParticipant.responses, ...newResponses],
            updatedAt: new Date().toISOString()
          };
          
          setParticipants(participants.map(p => 
            p.id === selectedParticipant.id ? updatedParticipant : p
          ));
          
          setSelectedParticipant(updatedParticipant);
          
          // Save to Firestore
          saveParticipantToFirestore(updatedParticipant);
          
          // Notify parent component of data change
          if (onProcessedDataChange) {
            onProcessedDataChange(participants.map(p => 
              p.id === selectedParticipant.id ? updatedParticipant : p
            ));
          }
        }
        
        handleCloseBulkImportDialog();
      } catch (error) {
        console.error('Error parsing bulk import:', error);
        // Could add error handling UI here
      }
    }
  };

  // Extract date from a line if it exists in format (DD/MM/YY)
  const extractDateFromLine = (line) => {
    const dateRegex = /\((\d{2}\/\d{2}\/\d{2})\)/;
    const match = line.match(dateRegex);
    if (match && match[1]) {
      try {
        // Parse the date in DD/MM/YY format
        const [day, month, year] = match[1].split('/').map(Number);
        const date = new Date(2000 + year, month - 1, day);
        return date;
      } catch (e) {
        console.error('Error parsing date:', e);
        return new Date();
      }
    }
    return null;
  };

  // Handle participant selection
  const handleSelectParticipant = (participant) => {
    setSelectedParticipant(participant);
  };

  // Handle participant deletion
  const handleDeleteParticipant = (participantId) => {
    // Delete from Firestore
    deleteParticipantFromFirestore(participantId);
    
    // Update local state
    setParticipants(participants.filter(p => p.id !== participantId));
    if (selectedParticipant && selectedParticipant.id === participantId) {
      setSelectedParticipant(null);
    }
    handleCloseParticipantMenu();
  };

  // Handle response deletion
  const handleDeleteResponse = (responseId) => {
    if (selectedParticipant) {
      const updatedResponses = selectedParticipant.responses.filter(r => r.id !== responseId);
      
      const updatedParticipant = {
        ...selectedParticipant,
        responses: updatedResponses,
        updatedAt: new Date().toISOString()
      };
      
      const updatedParticipants = participants.map(p => 
        p.id === selectedParticipant.id ? updatedParticipant : p
      );
      
      setParticipants(updatedParticipants);
      setSelectedParticipant(updatedParticipant);
      
      // Save to Firestore
      saveParticipantToFirestore(updatedParticipant);
      
      if (onProcessedDataChange) {
        onProcessedDataChange(updatedParticipants);
      }
    }
  };

  // Handle response editing
  const handleOpenEditResponseDialog = (response) => {
    setEditingResponse({...response});
    setEditResponseDialogOpen(true);
  };

  const handleCloseEditResponseDialog = () => {
    setEditResponseDialogOpen(false);
    setEditingResponse(null);
  };

  const handleEditResponseChange = (field, value) => {
    setEditingResponse(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEditedResponse = () => {
    if (selectedParticipant && editingResponse) {
      const updatedResponses = selectedParticipant.responses.map(r => 
        r.id === editingResponse.id ? editingResponse : r
      );
      
      const updatedParticipant = {
        ...selectedParticipant,
        responses: updatedResponses,
        updatedAt: new Date().toISOString()
      };
      
      const updatedParticipants = participants.map(p => 
        p.id === selectedParticipant.id ? updatedParticipant : p
      );
      
      setParticipants(updatedParticipants);
      setSelectedParticipant(updatedParticipant);
      
      // Save to Firestore
      saveParticipantToFirestore(updatedParticipant);
      
      if (onProcessedDataChange) {
        onProcessedDataChange(updatedParticipants);
      }
      
      handleCloseEditResponseDialog();
    }
  };

  // Participant menu handlers
  const handleOpenParticipantMenu = (event, participant) => {
    setParticipantMenuAnchorEl(event.currentTarget);
    setActiveParticipantForMenu(participant);
  };

  const handleCloseParticipantMenu = () => {
    setParticipantMenuAnchorEl(null);
    setActiveParticipantForMenu(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${(date.getFullYear() % 100).toString().padStart(2, '0')}`;
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Participant Manager</Typography>
        <Box>
          <Button 
            variant="contained" 
            startIcon={<PersonAddIcon />} 
            onClick={() => handleOpenParticipantDialog()}
          >
            Add Participant
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={2}>
        {/* Participant List */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ height: '100%', minHeight: 400 }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Participants</Typography>
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <Typography>Loading participants...</Typography>
              </Box>
            ) : participants.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No participants yet</Typography>
                <Button 
                  variant="contained" 
                  startIcon={<PersonAddIcon />} 
                  onClick={() => handleOpenParticipantDialog()}
                  sx={{ mt: 2 }}
                >
                  Add Participant
                </Button>
              </Box>
            ) : (
              <List sx={{ overflow: 'auto', maxHeight: 500 }}>
                {participants.map(participant => (
                  <ListItem 
                    key={participant.id}
                    button
                    selected={selectedParticipant?.id === participant.id}
                    onClick={() => handleSelectParticipant(participant)}
                    secondaryAction={
                      <IconButton 
                        edge="end" 
                        aria-label="more"
                        onClick={(event) => handleOpenParticipantMenu(event, participant)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText 
                      primary={participant.id} 
                      secondary={
                        <>
                          {participant.details && (
                            <span style={{ display: 'block' }}>
                              {participant.details}
                            </span>
                          )}
                          <span style={{ display: 'block' }}>
                            {participant.responses?.length || 0} responses
                          </span>
                        </>
                      } 
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
        
        {/* Participant Details */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ height: '100%', minHeight: 400 }}>
            {selectedParticipant ? (
              <>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6">{selectedParticipant.id}</Typography>
                    {selectedParticipant.details && (
                      <Typography variant="body2" color="text.secondary">
                        {selectedParticipant.details}
                      </Typography>
                    )}
                  </Box>
                  <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={handleOpenResponseDialog}
                  >
                    Add Responses
                  </Button>
                </Box>
                
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Responses ({selectedParticipant.responses?.length || 0})
                  </Typography>
                  
                  {selectedParticipant.responses?.length > 0 ? (
                    <Box>
                      {/* Group responses by question */}
                      {(() => {
                        // Group responses by question
                        const questionGroups = {};
                        selectedParticipant.responses.forEach(response => {
                          if (!questionGroups[response.question]) {
                            questionGroups[response.question] = [];
                          }
                          questionGroups[response.question].push(response);
                        });
                        
                        // Sort questions by the date of the most recent response
                        const sortedQuestions = Object.keys(questionGroups).sort((a, b) => {
                          const aLatestDate = Math.max(...questionGroups[a].map(r => new Date(r.date).getTime()));
                          const bLatestDate = Math.max(...questionGroups[b].map(r => new Date(r.date).getTime()));
                          return bLatestDate - aLatestDate;
                        });
                        
                        // Define a set of colors for the accordions
                        const colors = [
                          { main: '#1976d2', light: '#42a5f5', dark: '#1565c0' }, // Blue (primary)
                          { main: '#2e7d32', light: '#4caf50', dark: '#1b5e20' }, // Green
                          { main: '#d32f2f', light: '#ef5350', dark: '#c62828' }, // Red
                          { main: '#7b1fa2', light: '#9c27b0', dark: '#6a1b9a' }, // Purple
                          { main: '#f57c00', light: '#ff9800', dark: '#e65100' }, // Orange
                          { main: '#0288d1', light: '#03a9f4', dark: '#01579b' }, // Light Blue
                          { main: '#00796b', light: '#009688', dark: '#004d40' }, // Teal
                          { main: '#c2185b', light: '#e91e63', dark: '#880e4f' }, // Pink
                          { main: '#5d4037', light: '#795548', dark: '#3e2723' }, // Brown
                          { main: '#455a64', light: '#607d8b', dark: '#263238' }, // Blue Grey
                        ];
                        
                        return sortedQuestions.map((question, index) => {
                          // Get color for this question (cycle through colors if more questions than colors)
                          const color = colors[index % colors.length];
                          
                          return (
                            <Accordion 
                              key={index} 
                              defaultExpanded={index === 0}
                              sx={{ 
                                mb: 2,
                                boxShadow: 2,
                                '&:before': {
                                  display: 'none',
                                },
                                borderRadius: 2,
                                overflow: 'hidden'
                              }}
                            >
                              <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{ 
                                  backgroundColor: color.main,
                                  color: 'white',
                                  '&.Mui-expanded': {
                                    minHeight: 48,
                                  },
                                  '& .MuiAccordionSummary-expandIconWrapper': {
                                    color: 'white',
                                  }
                                }}
                              >
                                <Typography sx={{ fontWeight: 'bold' }}>
                                  {question} ({questionGroups[question].length})
                                </Typography>
                              </AccordionSummary>
                              <AccordionDetails sx={{ p: 3, bgcolor: 'background.paper' }}>
                                {questionGroups[question].sort((a, b) => 
                                  new Date(b.date).getTime() - new Date(a.date).getTime()
                                ).map(response => (
                                  <Paper 
                                    key={response.id} 
                                    elevation={2} 
                                    sx={{ 
                                      p: 2, 
                                      mb: 2, 
                                      position: 'relative',
                                      borderLeft: '4px solid',
                                      borderColor: color.main,
                                      borderRadius: 1,
                                      transition: 'all 0.2s',
                                      '&:hover': {
                                        boxShadow: 3,
                                        borderLeftWidth: '6px'
                                      }
                                    }}
                                  >
                                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                                      <IconButton 
                                        size="small" 
                                        onClick={() => handleOpenEditResponseDialog(response)}
                                        aria-label="edit response"
                                        sx={{ mr: 1 }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton 
                                        size="small" 
                                        onClick={() => handleDeleteResponse(response.id)}
                                        aria-label="delete response"
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                    
                                    <Grid container spacing={2} alignItems="center">
                                      <Grid item xs={12} sm={9}>
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', pt: 3 }}>
                                          {response.response}
                                        </Typography>
                                      </Grid>
                                      <Grid item xs={12} sm={3}>
                                        <Chip 
                                          label={formatDate(response.date)} 
                                          size="small" 
                                          sx={{ 
                                            fontWeight: 'medium',
                                            bgcolor: color.light,
                                            color: 'white',
                                            borderColor: color.main
                                          }}
                                        />
                                      </Grid>
                                    </Grid>
                                  </Paper>
                                ))}
                              </AccordionDetails>
                            </Accordion>
                          );
                        });
                      })()}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography color="text.secondary">No responses yet</Typography>
                      <Button 
                        variant="contained" 
                        startIcon={<AddIcon />} 
                        onClick={handleOpenResponseDialog}
                        sx={{ mt: 2 }}
                      >
                        Add Responses
                      </Button>
                    </Box>
                  )}
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3 }}>
                <Typography color="text.secondary">Select a participant to view details</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Add/Edit Participant Dialog */}
      <Dialog open={participantDialogOpen} onClose={handleCloseParticipantDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingParticipantId ? 'Edit Participant' : 'Add New Participant'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Participant ID"
            fullWidth
            value={newParticipantId}
            onChange={e => setNewParticipantId(e.target.value)}
            disabled={Boolean(editingParticipantId)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Additional Details (optional)"
            fullWidth
            multiline
            rows={3}
            value={newParticipantDetails}
            onChange={e => setNewParticipantDetails(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseParticipantDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveParticipant} 
            variant="contained" 
            disabled={!newParticipantId.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Response Dialog */}
      <Dialog open={responseDialogOpen} onClose={handleCloseResponseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          Add Responses for {selectedParticipant?.id}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {newResponses.map((responseItem, index) => (
            <Box 
              key={responseItem.id} 
              sx={{ 
                mb: 3, 
                pb: 3, 
                borderBottom: index < newResponses.length - 1 ? '1px dashed' : 'none',
                borderColor: 'divider'
              }}
            >
              {index === 0 && (
                <TextField
                  autoFocus
                  margin="dense"
                  label="Question"
                  fullWidth
                  value={responseItem.question}
                  onChange={(e) => handleResponseChange(responseItem.id, 'question', e.target.value)}
                  required
                  sx={{ mb: 3 }}
                />
              )}
              
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, mb: 2, position: 'relative' }}>
                {index > 0 && (
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleRemoveResponseField(responseItem.id)}
                      aria-label="remove response field"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                
                <Grid container spacing={2} alignItems="flex-start">
                  <Grid item xs={12} sm={9}>
                    <TextField
                      margin="dense"
                      label="Response"
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={20}
                      value={responseItem.response}
                      onChange={(e) => handleResponseChange(responseItem.id, 'response', e.target.value)}
                      required
                      InputProps={{
                        inputComponent: TextareaAutosize,
                        inputProps: {
                          style: { resize: 'vertical' }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      margin="dense"
                      label="Date"
                      type="date"
                      fullWidth
                      value={responseItem.date}
                      onChange={(e) => handleResponseChange(responseItem.id, 'date', e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Box>
          ))}
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />} 
              onClick={handleAddResponseField}
            >
              Add Another Response
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResponseDialog}>Cancel</Button>
          <Button 
            onClick={handleAddResponse} 
            variant="contained" 
            disabled={!newResponses.some(r => r.question.trim() && r.response.trim())}
            startIcon={<AddIcon />}
          >
            Save Responses
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Response Dialog */}
      <Dialog open={editResponseDialogOpen} onClose={handleCloseEditResponseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          Edit Response
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {editingResponse && (
            <>
              <TextField
                margin="dense"
                label="Question"
                fullWidth
                value={editingResponse.question}
                onChange={(e) => handleEditResponseChange('question', e.target.value)}
                required
                sx={{ mb: 3 }}
              />
              
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="flex-start">
                  <Grid item xs={12} sm={9}>
                    <TextField
                      margin="dense"
                      label="Response"
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={20}
                      value={editingResponse.response}
                      onChange={(e) => handleEditResponseChange('response', e.target.value)}
                      required
                      InputProps={{
                        inputComponent: TextareaAutosize,
                        inputProps: {
                          style: { resize: 'vertical' }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      margin="dense"
                      label="Date"
                      type="date"
                      fullWidth
                      value={editingResponse.date}
                      onChange={(e) => handleEditResponseChange('date', e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditResponseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveEditedResponse} 
            variant="contained" 
            disabled={!editingResponse?.question?.trim() || !editingResponse?.response?.trim()}
            startIcon={<EditIcon />}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Participant Menu */}
      <Menu
        anchorEl={participantMenuAnchorEl}
        open={Boolean(participantMenuAnchorEl)}
        onClose={handleCloseParticipantMenu}
      >
        <MenuItem onClick={() => {
          handleOpenParticipantDialog(activeParticipantForMenu);
          handleCloseParticipantMenu();
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleDeleteParticipant(activeParticipantForMenu?.id)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default ParticipantManager;
