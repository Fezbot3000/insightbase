import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, 
  Button, 
  TextField, 
  List, 
  ListItem, 
  ListItemText, 
  Box, 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  IconButton,
  Divider,
  Paper,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const navigate = useNavigate();

  // Fetch projects from Firestore
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const projectsCollectionRef = collection(db, 'projects');
        const q = query(projectsCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const projectsList = [];
        querySnapshot.forEach((doc) => {
          const projectData = { id: doc.id, ...doc.data() };
          
          // Calculate entries count
          const entriesCount = (projectData.processedEntries || []).length;
          projectsList.push({
            ...projectData,
            entriesCount
          });
        });
        
        setProjects(projectsList);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);

  const handleOpenDialog = (project = null) => {
    if (project) {
      setEditingProject(project);
      setNewProjectName(project.name);
      setNewProjectDescription(project.description || '');
    } else {
      setEditingProject(null);
      setNewProjectName('');
      setNewProjectDescription('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setNewProjectName('');
    setNewProjectDescription('');
    setEditingProject(null);
  };

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      try {
        if (editingProject) {
          // Edit existing project
          const updatedProject = { 
            ...editingProject,
            name: newProjectName.trim(), 
            description: newProjectDescription.trim(),
            updatedAt: new Date().toISOString()
          };
          
          await setDoc(doc(db, 'projects', editingProject.id), updatedProject);
          
          setProjects(projects.map(p => 
            p.id === editingProject.id ? updatedProject : p
          ));
        } else {
          // Create new project
          const timestamp = Date.now().toString();
          const newProject = {
            id: timestamp,
            name: newProjectName.trim(),
            description: newProjectDescription.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            entries: [],
            processedEntries: [],
            themes: []
          };
          
          await setDoc(doc(db, 'projects', timestamp), newProject);
          
          setProjects([newProject, ...projects]);
        }
        handleCloseDialog();
      } catch (error) {
        console.error('Error saving project:', error);
      }
    }
  };

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'projects', id));
      setProjects(projects.filter(project => project.id !== id));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Research Projects
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Project
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      ) : projects.length === 0 ? (
        <Paper 
          elevation={0}
          sx={{ 
            p: 6, 
            textAlign: 'center', 
            backgroundColor: 'rgba(63, 81, 181, 0.05)', 
            borderRadius: 4,
            border: '1px dashed #3f51b5'
          }}
        >
          <FolderIcon sx={{ fontSize: 60, color: 'primary.light', mb: 2 }} />
          <Typography variant="h5" gutterBottom>No Projects Yet</Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Create your first research project to get started with qualitative data analysis.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            size="large"
          >
            Create First Project
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {projects.map(project => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="h2" noWrap>
                      {project.name}
                    </Typography>
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(project);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          onClick={(e) => handleDeleteProject(project.id, e)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography 
                    variant="body2" 
                    color="textSecondary" 
                    sx={{ 
                      mt: 1, 
                      mb: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      minHeight: '40px'
                    }}
                  >
                    {project.description || 'No description provided.'}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Created: {new Date(project.createdAt).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {project.entriesCount} {project.entriesCount === 1 ? 'entry' : 'entries'}
                    </Typography>
                  </Box>
                </CardContent>
                <Divider />
                <CardActions>
                  <Button 
                    size="small" 
                    endIcon={<ArrowForwardIcon />} 
                    sx={{ ml: 'auto' }}
                  >
                    Open Project
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Project Description (optional)"
            fullWidth
            multiline
            rows={3}
            value={newProjectDescription}
            onChange={e => setNewProjectDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleCreateProject} 
            variant="contained" 
            disabled={!newProjectName.trim()}
          >
            {editingProject ? 'Save Changes' : 'Create Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Dashboard;
