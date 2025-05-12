import { createTheme } from '@mui/material/styles';

export const createAppTheme = (mode: 'light' | 'dark') => {
  return createTheme({
    palette: {
      mode: mode,
    },
    typography: {
      fontFamily: 'inherit',
      h1: {
        color: mode === 'light'? '#000' : '#fff',
      },
      h2: {
        color: mode === 'light'? '#000' : '#fff',
      },
      h3: {
        color: mode === 'light'? '#000' : '#fff',
      },
      h4: {
        color: mode === 'light'? '#000' : '#fff',
      },
      h5: {
        color: mode === 'light'? '#000' : '#fff',
      },
      h6: {
        color: mode === 'light'? '#000' : '#fff',
      },
      body1: {
        color: mode === 'light' ? '#000' : '#fff',
      },
      body2: {
        color: mode === 'light'? '#000' : '#fff',
      },
      subtitle1: {
        color: mode === 'light'? '#000' : '#fff',
      },
      subtitle2: {
        color: mode === 'light'? '#000' : '#fff',
      },
    },
    components: {
      MuiFormControlLabel: {
        styleOverrides: {
          label: {
            color: mode === 'light'? '#000' : '#fff',
          },
        },
      }
    }
  });
};