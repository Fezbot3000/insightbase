import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container, useTheme } from '@mui/material';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import InsightsIcon from '@mui/icons-material/Insights';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  const isHome = location.pathname === '/';
  
  return (
    <AppBar position="static" sx={{ 
      backgroundColor: theme.palette.background.paper, 
      color: theme.palette.text.primary,
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
    }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Box 
            component={Link} 
            to="/"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              textDecoration: 'none'
            }}
          >
            <InsightsIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography
              variant="h6"
              noWrap
              sx={{
                mr: 2,
                fontWeight: 700,
                color: theme.palette.primary.main,
                textDecoration: 'none',
              }}
            >
              InsightBase
            </Typography>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {!isHome && (
            <Button 
              component={Link}
              to="/"
              sx={{ my: 2, color: theme.palette.text.secondary }}
            >
              All Projects
            </Button>
          )}
          
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.open('https://example.com/docs', '_blank')}
            sx={{ ml: 2 }}
          >
            Help
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Header;
