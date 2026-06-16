import "./index.css";

import { Suspense, lazy, useEffect } from 'react';
import {
  Avatar,
  Box,
  AppBar,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  ThemeProvider,
} from "@mui/material";
import { createAppTheme } from './Theme';
import {
  ArrowSync20Regular,
  PanelLeftExpandFilled,
  QuestionCircle20Regular,
} from '@fluentui/react-icons';
import i18n from './i18n';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { useSettingStore } from './store/SettingStore';
import { useWindowStore } from './store/WindowStore';
import { useConverterStore } from "./store/ConverterStore";
import { useMessage } from './Utils';
import "@szhsin/react-menu/dist/index.css";
import { ListItemProps } from '@mui/material/ListItem';
import {
  Link as RouterLink,
  Route,
  Routes,
} from 'react-router';
import { useHotkeys } from 'react-hotkeys-hook';
import { useRef, useState } from 'react';
import { client } from './client';
import { TaskListPopover } from './components/TaskListPopover';
import { AppMenu } from './components/AppMenu';
import { TitleBarButtons } from './components/TitleBarButtons';

interface ListItemLinkProps extends ListItemProps {
  to: string;
  open?: boolean;
}

interface Props {
  windowProps?: () => Window;
}

const navItems = [
  { path: '/'  },
  { path: '/about' },
];

const ConverterPage = lazy(() =>
  import("./ConverterPage").then((module) => ({ default: module.ConverterPage }))
);
const AboutPage = lazy(() =>
  import("./AboutPage").then((module) => ({ default: module.AboutPage }))
);
const LyricReplaceRulesPanel = lazy(() =>
  import("./components/LyricReplaceRulesPanel").then((module) => ({
    default: module.LyricReplaceRulesPanel,
  }))
);

function PageFallback() {
  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 52px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        bgcolor: "background.default",
      }}
    >
      <CircularProgress size={28} />
    </Box>
  );
}

function DialogFallback() {
  return (
    <Box
      sx={{
        minHeight: 240,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <CircularProgress size={24} />
    </Box>
  );
}

export function App(props: Props) {
  const { windowProps } = props;
  const {
    drawerOpen,
    appVersion,
    toggledrawerOpen,
    setAppVersion,
  } = useWindowStore();
  const {
    darkMode,
    actualTheme,
    language,
    inputFormat,
    outputFormat,
    loadInputFormatSchema,
    loadOutputFormatSchema,
    setActualTheme,
  } = useSettingStore();
  const {
    filterConversionTasksByInputFormat,
    loadMiddlewareSchemas,
    setActiveStep,
  } = useConverterStore();
  const {
    MessageSnackbar,
  } = useMessage();

  const handleDrawerToggle = toggledrawerOpen;

  // Sidecar startup + version polling (runs once on mount)
  useEffect(() => {
    const startServer = async () => {
      await invoke("start_sidecar_command");
    }
    i18n.changeLanguage(language);
    startServer();

    const getAppVersion = async () => {
      try {
        let appVersionRes = await client.version({}, {timeoutMs: 1000});
        setAppVersion(appVersionRes.version);
        clearInterval(appVersionIntervalId);
        loadMiddlewareSchemas(language);
        if (inputFormat !== null) {
          loadInputFormatSchema(inputFormat, language);
        }
        if (outputFormat !== null) {
          loadOutputFormatSchema(outputFormat, language);
        }
      } catch (e) {
        console.error(e);
      }
    }

    let appVersionIntervalId = setInterval(getAppVersion, 2000);

    return () => {
      clearInterval(appVersionIntervalId);
    };
  }, []);

  // System theme listener
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (darkMode === 'system') {
        setActualTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [darkMode]);

  // Disable context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Zustand subscriptions
  useEffect(() => {
    const unsubConversionTasks = useConverterStore.subscribe((state) => state.conversionTasks, (conversionTasks, prevConversionTasks) => {
      if ((conversionTasks.length === 0 && conversionTasks !== prevConversionTasks) || (conversionTasks.length > prevConversionTasks.length)) {
        setActiveStep(0);
      }
    });

    const unsubInputFormat = useSettingStore.subscribe((state) => state.inputFormat, (inputFormat, prevInputFormat) => {
      setActiveStep(0);
      if (inputFormat !== prevInputFormat && inputFormat !== null) {
        filterConversionTasksByInputFormat(inputFormat);
        loadInputFormatSchema(inputFormat, i18n.language);
      }
    });

    const unsubOutputFormat = useSettingStore.subscribe((state) => state.outputFormat, (outputFormat, prevOutputFormat) => {
      if (outputFormat !== prevOutputFormat && outputFormat !== null) {
        loadOutputFormatSchema(outputFormat, i18n.language);
      }
    });

    const unsubLanguage = useSettingStore.subscribe((state) => state.language, (language, prevLanguage) => {
      if (language !== prevLanguage) {
        i18n.changeLanguage(language);
        loadMiddlewareSchemas(language);
      }
    });

    return () => {
      unsubConversionTasks();
      unsubInputFormat();
      unsubOutputFormat();
      unsubLanguage();
    };
  }, []);

  const theme = createAppTheme(actualTheme);

  const { t } = useTranslation();

  const menuRef = useRef(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  useHotkeys('ctrl+m', () => setMenuOpen(!isMenuOpen), [isMenuOpen]);

  const [lyricRulesOpen, setLyricRulesOpen] = useState(false);

  const navItemNames: { [key: string]: string } = {
    '/': 'nav.converter',
    '/about': 'nav.about',
  };
  const navItemIcons: { [key: string]: React.ReactNode } = {
    '/': <ArrowSync20Regular />,
    '/about': <QuestionCircle20Regular />,
  };

  function ListItemLink(props: ListItemLinkProps) {
    const { to, open, ...other } = props;
    const primary = navItemNames[to];
    let icon = navItemIcons[to];

    return (
      <ListItemButton component={RouterLink as any} to={to} {...other}>
        <ListItemIcon>
          {icon}
        </ListItemIcon>
        <ListItemText primary={t(primary)} />
      </ListItemButton>
    );
  }

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Box sx={{width: '100%', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Avatar src={require("./assets/libresvip.png")} variant="square" sx={{
          width: '60px', height: '60px'
        }}/>
      </Box>
      <Typography variant="h5">
        LibreSVIP
      </Typography>
      <Typography variant="h6">
        <small>{appVersion}</small>
      </Typography>
      <Divider />
      <List disablePadding>
        {navItems.map((item) => (
          <ListItemLink key={item.path} to={item.path}>
          </ListItemLink>
        ))}
      </List>
    </Box>
  );

  const handleStartDragging = async (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    await invoke("plugin:window|start_dragging");
  }

  const handleMaximize = async () => {
    await invoke("plugin:window|toggle_maximize");
  };

  const container = windowProps !== undefined ? () => windowProps().document.body : undefined;

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static">
        <Toolbar onDoubleClick={handleMaximize} draggable={true} onDragStart={handleStartDragging} sx={{
          paddingLeft: "16px !important",
          paddingRight: "0px !important",
          minHeight: "40px !important",
        }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            size="large"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <PanelLeftExpandFilled />
          </IconButton>

          <TaskListPopover />
          <AppMenu
            isMenuOpen={isMenuOpen}
            setMenuOpen={setMenuOpen}
            menuRef={menuRef}
            onLyricRulesOpen={() => setLyricRulesOpen(true)}
          />
          <TitleBarButtons />
        </Toolbar>
      </AppBar>
      <Box component="nav">
        <Drawer
          container={container}
          variant="temporary"
          open={drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <MessageSnackbar/>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route index path="" element={<ConverterPage/>}></Route>
          <Route path='about' element={<AboutPage/>}></Route>
        </Routes>
      </Suspense>
      <Dialog fullScreen open={lyricRulesOpen} onClose={() => setLyricRulesOpen(false)} fullWidth>
        <DialogTitle>{t('lyric_rules.title')}</DialogTitle>
        <DialogContent>
          <Suspense fallback={<DialogFallback />}>
            <LyricReplaceRulesPanel />
          </Suspense>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLyricRulesOpen(false)}>{t('window.close')}</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default App;
