import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Typography, 
  Box, 
  Button, 
  TextField, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  IconButton, 
  Select, 
  MenuItem, 
  InputLabel, 
  FormControl, 
  Checkbox, 
  ListItemText, 
  Tabs, 
  Tab, 
  Popover, 
  Tooltip, 
  Card, 
  CardContent, 
  Divider,
  Container,
  Breadcrumbs,
  Alert,
  CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import HighlightIcon from '@mui/icons-material/Highlight';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import PersonIcon from '@mui/icons-material/Person';
import ScienceIcon from '@mui/icons-material/Science';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import AIInsights from './AIInsights';
import ParticipantManager from './ParticipantManager';
import AffinityMap from './AffinityMap';
import AutoAffinityMap from './AutoAffinityMap';
import AnalysisMapping from './AnalysisMapping';

function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('Research Project');
  const [entries, setEntries] = useState([]);
  const [manualEntry, setManualEntry] = useState({
    participant: '',
    date: '',
    answer1: '',
    answer2: '',
    answer3: '',
    matrix: ''
  });
  const [search, setSearch] = useState('');

  // Phase 2 - Theme Management and Processed Data
  const [themes, setThemes] = useState([]); // {id, name}
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [themeName, setThemeName] = useState('');
  const [editingThemeId, setEditingThemeId] = useState(null);

  const [processedEntries, setProcessedEntries] = useState([]); // { ...entry, appliedThemes: [], taggedHighlights: [], notes: '' }
  const [viewMode, setViewMode] = useState('raw'); // 'raw' or 'processed'
  
  // Highlight and Tag functionality
  const [selectedText, setSelectedText] = useState('');
  const [highlightAnchorEl, setHighlightAnchorEl] = useState(null);
  const [currentHighlightField, setCurrentHighlightField] = useState(null);
  const [currentHighlightEntryId, setCurrentHighlightEntryId] = useState(null);
  
  // Filtered Views
  const [filterType, setFilterType] = useState('all'); // 'all', 'theme', 'participant', 'question'
  const [filterValue, setFilterValue] = useState('');
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState(null);
  
  // Phase 3 - AI Layer
  const [activeTab, setActiveTab] = useState('participants'); // 'entries', 'participants', or 'ai-insights'
  const [rawProcessingTab, setRawProcessingTab] = useState('manual'); // 'manual' or 'auto'

  // Load project data from Firestore
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        return;
      }

      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        
        if (projectSnap.exists()) {
          const projectData = { id: projectSnap.id, ...projectSnap.data() };
          setProjectName(projectData.name || `Research Project ${projectId}`);
          setEntries(projectData.entries || []);
          setProcessedEntries(projectData.processedEntries || []);
          setThemes(projectData.themes || []);
        } else {
          // Create new project in Firestore if it doesn't exist
          const newProject = {
            id: projectId,
            name: `Research Project ${projectId}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            entries: [],
            processedEntries: [],
            themes: []
          };
          setProjectName(newProject.name);
          setEntries(newProject.entries);
          setProcessedEntries(newProject.processedEntries);
          setThemes(newProject.themes);
          
          // Save the new project to Firestore
          await setDoc(projectRef, newProject);
        }
      } catch (error) {
        console.error('Error loading project:', error);
      }
    };
    
    loadProject();
  }, [projectId]);

  // Handle participant data changes
  const handleParticipantDataChange = (updatedParticipants) => {
    // Convert participant data to processed entries
    const newProcessedEntries = [];
    
    updatedParticipants.forEach(participant => {
      participant.responses?.forEach(response => {
        newProcessedEntries.push({
          id: `${participant.id}-${response.id}`,
          participantId: participant.id,
          question: response.question || '',
          response: response.response || '',
          date: response.date || new Date().toISOString().split('T')[0],
          appliedThemes: [],
          taggedHighlights: [],
          notes: ''
        });
      });
    });
    
    setProcessedEntries(newProcessedEntries);
    
    // Update project in Firestore
    const saveProject = async () => {
      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          const projectData = { id: projectSnap.id, ...projectSnap.data() };
          const updatedProject = {
            ...projectData,
            processedEntries: newProcessedEntries,
            updatedAt: new Date().toISOString()
          };
          await setDoc(projectRef, updatedProject);
        } else {
          // Create a new project if it doesn't exist
          const newProject = {
            id: projectId,
            name: projectName || `Research Project ${projectId}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            entries: [],
            processedEntries: newProcessedEntries,
            themes: themes || []
          };
          await setDoc(projectRef, newProject);
        }
      } catch (error) {
        console.error('Error saving project:', error);
      }
    };
    
    saveProject();
  };

  // Theme CRUD
  const handleOpenThemeDialog = (theme = null) => {
    if (theme) {
      setThemeName(theme.name);
      setEditingThemeId(theme.id);
    } else {
      setThemeName('');
      setEditingThemeId(null);
    }
    setThemeDialogOpen(true);
  };
  const handleCloseThemeDialog = () => {
    setThemeDialogOpen(false);
    setThemeName('');
    setEditingThemeId(null);
  };
  const handleSaveTheme = () => {
    if (themeName.trim()) {
      if (editingThemeId) {
        setThemes(themes.map(t => t.id === editingThemeId ? { ...t, name: themeName.trim() } : t));
      } else {
        setThemes([...themes, { id: Date.now().toString(), name: themeName.trim() }]);
      }
      handleCloseThemeDialog();
      
      // Update project in Firestore
      const saveProject = async () => {
        try {
          const projectRef = doc(db, 'projects', projectId);
          const projectSnap = await getDoc(projectRef);
          if (projectSnap.exists()) {
            const projectData = { id: projectSnap.id, ...projectSnap.data() };
            const updatedProject = {
              ...projectData,
              themes: themes,
              updatedAt: new Date().toISOString()
            };
            await setDoc(projectRef, updatedProject);
          }
        } catch (error) {
          console.error('Error saving project:', error);
        }
      };
      
      saveProject();
    }
  };
  const handleDeleteTheme = id => {
    setThemes(themes.filter(t => t.id !== id));
    // Optionally remove theme from processedEntries
    setProcessedEntries(processedEntries.map(e => ({ 
      ...e, 
      appliedThemes: (e.appliedThemes||[]).filter(tid => tid !== id),
      taggedHighlights: (e.taggedHighlights||[]).filter(h => h.themeId !== id)
    })));
    
    // Update project in Firestore
    const saveProject = async () => {
      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          const projectData = { id: projectSnap.id, ...projectSnap.data() };
          const updatedProject = {
            ...projectData,
            themes: themes,
            updatedAt: new Date().toISOString()
          };
          await setDoc(projectRef, updatedProject);
        }
      } catch (error) {
        console.error('Error saving project:', error);
      }
    };
    
    saveProject();
  };

  // Manual Entry Handling (Raw)
  const handleManualEntryChange = e => {
    setManualEntry({ ...manualEntry, [e.target.name]: e.target.value });
  };
  const handleAddManualEntry = () => {
    if (
      manualEntry.participant &&
      manualEntry.date &&
      manualEntry.answer1 &&
      manualEntry.answer2 &&
      manualEntry.answer3
    ) {
      const newEntry = { ...manualEntry, id: Date.now().toString() };
      setEntries([...entries, newEntry]);
      setManualEntry({ participant: '', date: '', answer1: '', answer2: '', answer3: '', matrix: '' });
      // Also create a processed copy
      setProcessedEntries([
        ...processedEntries,
        {
          ...newEntry,
          appliedThemes: [],
          taggedHighlights: [],
          notes: ''
        }
      ]);
      
      // Update project in Firestore
      const saveProject = async () => {
        try {
          const projectRef = doc(db, 'projects', projectId);
          const projectSnap = await getDoc(projectRef);
          if (projectSnap.exists()) {
            const projectData = { id: projectSnap.id, ...projectSnap.data() };
            const updatedProject = {
              ...projectData,
              entries: [...entries, newEntry],
              processedEntries: [...processedEntries, {
                ...newEntry,
                appliedThemes: [],
                taggedHighlights: [],
                notes: ''
              }],
              updatedAt: new Date().toISOString()
            };
            await setDoc(projectRef, updatedProject);
          }
        } catch (error) {
          console.error('Error saving project:', error);
        }
      };
      
      saveProject();
    }
  };

  // Processed Entry Tagging
  const handleThemeChange = (entryId, selectedThemeIds) => {
    setProcessedEntries(processedEntries.map(e =>
      e.id === entryId ? { ...e, appliedThemes: selectedThemeIds } : e
    ));
    
    // Update project in Firestore
    const saveProject = async () => {
      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          const projectData = { id: projectSnap.id, ...projectSnap.data() };
          const updatedProject = {
            ...projectData,
            processedEntries: processedEntries.map(e =>
              e.id === entryId ? { ...e, appliedThemes: selectedThemeIds } : e
            ),
            updatedAt: new Date().toISOString()
          };
          await setDoc(projectRef, updatedProject);
        }
      } catch (error) {
        console.error('Error saving project:', error);
      }
    };
    
    saveProject();
  };
  const handleNoteChange = (entryId, note) => {
    setProcessedEntries(processedEntries.map(e =>
      e.id === entryId ? { ...e, notes: note } : e
    ));
    
    // Update project in Firestore
    const saveProject = async () => {
      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          const projectData = { id: projectSnap.id, ...projectSnap.data() };
          const updatedProject = {
            ...projectData,
            processedEntries: processedEntries.map(e =>
              e.id === entryId ? { ...e, notes: note } : e
            ),
            updatedAt: new Date().toISOString()
          };
          await setDoc(projectRef, updatedProject);
        }
      } catch (error) {
        console.error('Error saving project:', error);
      }
    };
    
    saveProject();
  };

  // Highlight and Tag Functionality
  const handleTextSelection = (e, entryId, field) => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selection.rangeCount > 0) {
      setSelectedText(selectedText);
      setCurrentHighlightEntryId(entryId);
      setCurrentHighlightField(field);
      setHighlightAnchorEl(e.currentTarget);
    }
  };

  const handleCloseHighlightMenu = () => {
    setHighlightAnchorEl(null);
    setSelectedText('');
    setCurrentHighlightEntryId(null);
    setCurrentHighlightField(null);
  };

  const handleAddHighlight = (themeId) => {
    if (selectedText && currentHighlightEntryId && currentHighlightField) {
      const newHighlight = {
        id: Date.now().toString(),
        text: selectedText,
        field: currentHighlightField,
        themeId: themeId
      };
      
      setProcessedEntries(processedEntries.map(entry => 
        entry.id === currentHighlightEntryId 
          ? { 
              ...entry, 
              taggedHighlights: [...(entry.taggedHighlights || []), newHighlight] 
            } 
          : entry
      ));
      
      handleCloseHighlightMenu();
      
      // Update project in Firestore
      const saveProject = async () => {
        try {
          const projectRef = doc(db, 'projects', projectId);
          const projectSnap = await getDoc(projectRef);
          if (projectSnap.exists()) {
            const projectData = { id: projectSnap.id, ...projectSnap.data() };
            const updatedProject = {
              ...projectData,
              processedEntries: processedEntries.map(entry => 
                entry.id === currentHighlightEntryId 
                  ? { 
                      ...entry, 
                      taggedHighlights: [...(entry.taggedHighlights || []), newHighlight] 
                    } 
                  : entry
              ),
              updatedAt: new Date().toISOString()
            };
            await setDoc(projectRef, updatedProject);
          }
        } catch (error) {
          console.error('Error saving project:', error);
        }
      };
      
      saveProject();
    }
  };

  const handleRemoveHighlight = (entryId, highlightId) => {
    setProcessedEntries(processedEntries.map(entry => 
      entry.id === entryId 
        ? { 
            ...entry, 
            taggedHighlights: (entry.taggedHighlights || []).filter(h => h.id !== highlightId) 
          } 
        : entry
    ));
    
    // Update project in Firestore
    const saveProject = async () => {
      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          const projectData = { id: projectSnap.id, ...projectSnap.data() };
          const updatedProject = {
            ...projectData,
            processedEntries: processedEntries.map(entry => 
              entry.id === entryId 
                ? { 
                    ...entry, 
                    taggedHighlights: (entry.taggedHighlights || []).filter(h => h.id !== highlightId) 
                  } 
                : entry
            ),
            updatedAt: new Date().toISOString()
          };
          await setDoc(projectRef, updatedProject);
        }
      } catch (error) {
        console.error('Error saving project:', error);
      }
    };
    
    saveProject();
  };

  // Filtered Views
  const handleOpenFilterMenu = (event) => {
    setFilterMenuAnchorEl(event.currentTarget);
  };

  const handleCloseFilterMenu = () => {
    setFilterMenuAnchorEl(null);
  };

  const handleFilterChange = (type, value = '') => {
    setFilterType(type);
    setFilterValue(value);
    handleCloseFilterMenu();
  };

  // Filtering
  const getFilteredEntries = () => {
    // First apply text search
    let filtered = entries.filter(entry =>
      entry.participant.toLowerCase().includes(search.toLowerCase()) ||
      entry.date.includes(search) ||
      entry.answer1.toLowerCase().includes(search.toLowerCase()) ||
      entry.answer2.toLowerCase().includes(search.toLowerCase()) ||
      entry.answer3.toLowerCase().includes(search.toLowerCase())
    );
    
    return filtered;
  };

  const getFilteredProcessedEntries = () => {
    // First apply text search
    let filtered = processedEntries.filter(entry =>
      entry.participant.toLowerCase().includes(search.toLowerCase()) ||
      entry.date.includes(search) ||
      entry.answer1.toLowerCase().includes(search.toLowerCase()) ||
      entry.answer2.toLowerCase().includes(search.toLowerCase()) ||
      entry.answer3.toLowerCase().includes(search.toLowerCase())
    );
    
    // Then apply specific filters
    if (filterType === 'theme' && filterValue) {
      filtered = filtered.filter(entry => 
        entry.appliedThemes?.includes(filterValue) || 
        entry.taggedHighlights?.some(h => h.themeId === filterValue)
      );
    } else if (filterType === 'participant' && filterValue) {
      filtered = filtered.filter(entry => entry.participant === filterValue);
    } else if (filterType === 'question') {
      // This will filter by which question field contains highlighted content
      if (filterValue === 'answer1') {
        filtered = filtered.filter(entry => 
          entry.taggedHighlights?.some(h => h.field === 'answer1')
        );
      } else if (filterValue === 'answer2') {
        filtered = filtered.filter(entry => 
          entry.taggedHighlights?.some(h => h.field === 'answer2')
        );
      } else if (filterValue === 'answer3') {
        filtered = filtered.filter(entry => 
          entry.taggedHighlights?.some(h => h.field === 'answer3')
        );
      }
    }
    
    return filtered;
  };

  // Helper to render highlighted text
  const renderHighlightedText = (entry, field) => {
    const highlights = entry.taggedHighlights?.filter(h => h.field === field) || [];
    if (!highlights.length) return entry[field];

    let text = entry[field];
    let result = [];
    let lastIndex = 0;

    // Simple highlighting approach (note: this is basic and doesn't handle overlapping highlights)
    highlights.forEach((highlight, idx) => {
      const startIndex = text.indexOf(highlight.text);
      if (startIndex === -1) return;

      // Add text before highlight
      if (startIndex > lastIndex) {
        result.push(<span key={`text-${idx}`}>{text.substring(lastIndex, startIndex)}</span>);
      }

      // Add highlighted text
      const theme = themes.find(t => t.id === highlight.themeId);
      result.push(
        <Tooltip 
          key={`highlight-${idx}`} 
          title={`Theme: ${theme?.name || 'Unknown'}`}
        >
          <span 
            style={{ 
              backgroundColor: 'yellow', 
              position: 'relative',
              cursor: 'pointer'
            }}
            onClick={() => handleRemoveHighlight(entry.id, highlight.id)}
          >
            {highlight.text}
          </span>
        </Tooltip>
      );

      lastIndex = startIndex + highlight.text.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      result.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }

    return result;
  };

  // Get unique participants for filtering
  const uniqueParticipants = [...new Set(processedEntries.map(e => e.participant))];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Project Header */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
          <Link 
            color="inherit" 
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <ArrowBackIcon sx={{ mr: 0.5 }} fontSize="small" />
            All Projects
          </Link>
          <Typography color="text.primary">{projectName}</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            {projectName}
          </Typography>
        </Box>
      </Box>
      
      {/* Main Tabs - Entries vs AI Insights */}
      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            value="participants" 
            label="Participants" 
            icon={<PersonIcon />} 
            iconPosition="start"
          />
          <Tab 
            value="entries" 
            label="Raw Processing" 
            icon={<ScienceIcon />} 
            iconPosition="start"
          />
          <Tab 
            value="ai-insights" 
            label="AI Insights" 
            icon={<AnalyticsIcon />} 
            iconPosition="start"
          />
        </Tabs>
      </Paper>
      
      {/* Content for the selected tab */}
      {activeTab === 'participants' && (
        <ParticipantManager 
          onProcessedDataChange={handleParticipantDataChange}
          projectId={projectId} 
        />
      )}
      
      {activeTab === 'entries' && (
        <Box>
          <Tabs 
            value={rawProcessingTab} 
            onChange={(_, v) => setRawProcessingTab(v)}
            sx={{ mb: 3 }}
          >
            <Tab value="manual" label="Manual Affinity Map" />
            <Tab value="auto" label="Auto Affinity Map" />
            <Tab value="evaluator" label="Analysis Mapping" />
          </Tabs>
          
          {rawProcessingTab === 'manual' ? (
            <AffinityMap projectId={projectId} />
          ) : rawProcessingTab === 'auto' ? (
            <AutoAffinityMap projectId={projectId} />
          ) : (
            <AnalysisMapping projectId={projectId} />
          )}
        </Box>
      )}
      
      {activeTab === 'ai-insights' && (
        <AIInsights processedEntries={processedEntries} themes={themes} />
      )}
      
      {/* Theme Dialog */}
      <Dialog open={themeDialogOpen} onClose={handleCloseThemeDialog}>
        <DialogTitle>{editingThemeId ? 'Edit Theme' : 'Add Theme'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Theme Name"
            value={themeName}
            onChange={e => setThemeName(e.target.value)}
            fullWidth
            autoFocus
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseThemeDialog}>Cancel</Button>
          <Button onClick={handleSaveTheme} variant="contained" disabled={!themeName.trim()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ProjectPage;
