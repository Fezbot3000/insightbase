import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
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
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

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

function AffinityMap({ projectId }) {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState(null);
  const [colorMenuAnchorEl, setColorMenuAnchorEl] = useState(null);
  const [activeGroupForColor, setActiveGroupForColor] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedOverGroup, setDraggedOverGroup] = useState(null);

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
                  groupId: null // Initially not assigned to any group
                });
              });
            }
          });
          
          setResponses(participantsResponses);
          
          // Load affinity groups if they exist
          if (projectData.affinityGroups) {
            setGroups(projectData.affinityGroups);
            
            // Update responses with group assignments
            const updatedResponses = participantsResponses.map(response => {
              const assignment = projectData.affinityAssignments?.find(
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
      } catch (error) {
        console.error('Error loading project data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProjectData();
  }, [projectId]);

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
          affinityGroups: groups,
          affinityAssignments
        });
      }
    } catch (error) {
      console.error('Error saving affinity data:', error);
    }
  };

  // Save specific values to Firestore
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
          affinityGroups: groupsToSave,
          affinityAssignments
        });
      }
    } catch (error) {
      console.error('Error saving affinity data:', error);
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
          id: Date.now().toString(),
          name: newGroupName.trim(),
          color: colorPalette[groups.length % colorPalette.length]
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
    
    // Save with the updated values directly rather than relying on state updates
    saveAffinityDataWithValues(updatedGroups, updatedResponses);
  };

  // Handle color menu
  const handleOpenColorMenu = (event, group) => {
    setColorMenuAnchorEl(event.currentTarget);
    setActiveGroupForColor(group);
  };

  const handleCloseColorMenu = () => {
    setColorMenuAnchorEl(null);
    setActiveGroupForColor(null);
  };

  const handleColorChange = (color) => {
    if (activeGroupForColor) {
      const updatedGroups = groups.map(g => 
        g.id === activeGroupForColor.id ? { ...g, color } : g
      );
      setGroups(updatedGroups);
      saveAffinityData();
    }
    handleCloseColorMenu();
  };

  // Handle drag and drop
  const handleDragStart = (event, response) => {
    event.dataTransfer.setData('text/plain', response.id);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedItem(response);
  };

  const handleDragOver = (event, groupId) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDraggedOverGroup(groupId);
  };

  const handleDragLeave = () => {
    setDraggedOverGroup(null);
  };

  const handleDrop = (event, groupId) => {
    event.preventDefault();
    const responseId = event.dataTransfer.getData('text/plain');
    
    const responseToMove = responses.find(r => r.id === responseId);
    if (responseToMove) {
      // Update the response's group assignment
      const updatedResponses = responses.map(r => 
        r.id === responseToMove.id ? { ...r, groupId } : r
      );
      
      setResponses(updatedResponses);
      saveAffinityData();
    }
    
    setDraggedItem(null);
    setDraggedOverGroup(null);
  };

  // Get unassigned responses
  const getUnassignedResponses = () => {
    return responses.filter(r => !r.groupId);
  };

  // Get responses for a specific group
  const getGroupResponses = (groupId) => {
    return responses.filter(r => r.groupId === groupId);
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Affinity Mapping</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => handleOpenGroupDialog()}
        >
          Add Group
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {/* Affinity Groups */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Affinity Groups</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
              {groups.length === 0 ? (
                <Paper sx={{ p: 3, width: '100%', textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No affinity groups created yet. Create groups to organize your research data.
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
                      backgroundColor: draggedOverGroup === group.id ? 'rgba(0, 0, 0, 0.04)' : 'background.paper'
                    }}
                    onDragOver={(e) => handleDragOver(e, group.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, group.id)}
                  >
                    <CardHeader
                      title={group.name}
                      action={
                        <Box>
                          <IconButton 
                            size="small" 
                            onClick={(e) => handleOpenColorMenu(e, group)}
                            sx={{ mr: 1 }}
                          >
                            <ColorLensIcon fontSize="small" />
                          </IconButton>
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
                    <CardContent sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 400 }}>
                      {getGroupResponses(group.id).length === 0 ? (
                        <Typography color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
                          Drag responses here
                        </Typography>
                      ) : (
                        getGroupResponses(group.id).map(response => (
                          <Paper
                            key={response.id}
                            sx={{ 
                              p: 1.5, 
                              mb: 1.5, 
                              position: 'relative',
                              cursor: 'grab',
                              '&:hover': {
                                boxShadow: 2
                              }
                            }}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, response)}
                          >
                            <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
                              <DragIndicatorIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.5 }} />
                            </Box>
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
                            cursor: 'grab',
                            '&:hover': {
                              boxShadow: 2
                            }
                          }}
                          draggable="true"
                          onDragStart={(e) => handleDragStart(e, response)}
                        >
                          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                            <DragIndicatorIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.5 }} />
                          </Box>
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
      
      {/* Color Menu */}
      <Menu
        anchorEl={colorMenuAnchorEl}
        open={Boolean(colorMenuAnchorEl)}
        onClose={handleCloseColorMenu}
      >
        <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', maxWidth: 200, gap: 1 }}>
          {colorPalette.map(color => (
            <Box
              key={color}
              sx={{
                width: 30,
                height: 30,
                bgcolor: color,
                borderRadius: '50%',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 3
                }
              }}
              onClick={() => handleColorChange(color)}
            />
          ))}
        </Box>
      </Menu>
    </Box>
  );
}

export default AffinityMap;
