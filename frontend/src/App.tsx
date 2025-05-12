import "./index.css";

import { useEffect } from 'react';
import {
  Badge,
  Box,
  AppBar,
  Avatar,
  Card,
  CardActions,
  CardContent,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Pagination,
  Popover,
  TextField,
  Typography,
  Toolbar,
  Tooltip,
  ThemeProvider,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { createAppTheme } from './Theme';
import {
  ArrowSync20Regular,
  BinRecycle24Regular,
  BrightnessHighFilled,
  Dismiss20Regular,
  QuestionCircle20Regular,
  PanelLeftExpandFilled,
  Maximize20Regular,
  SquareMultiple20Regular,
  Subtract20Regular,
  TaskListLtrFilled,
  Translate20Regular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
  Add24Regular,
  ArrowExportLtr20Regular,
  ArrowTurnRightUp20Regular,
  ErrorCircle24Regular,
  Delete24Regular,
  MoreHorizontalFilled,
  Color20Regular,
  WrenchScrewdriver24Regular,
} from '@fluentui/react-icons';
import i18n from './i18n';
import { useTranslation } from 'react-i18next';
import { AboutPage } from "./AboutPage";
import { ConverterPage } from "./ConverterPage";
import { path } from '@tauri-apps/api';
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from '@tauri-apps/plugin-dialog';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { pyInvoke } from 'tauri-plugin-pytauri-api';
import { useSettingStore } from './store/SettingStore';
import { useWindowStore } from './store/WindowStore';
import { useConverterStore } from "./store/ConverterStore";
import { ConversionTask } from './ApiTypes';
import { parsePath, useMessage } from './Utils';
import { Menu, MenuItem, MenuRadioGroup, SubMenu } from '@szhsin/react-menu';
import { nanoid } from 'nanoid';
import PopupState from 'material-ui-popup-state';
import { bindTrigger, bindPopover, bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import "@szhsin/react-menu/dist/index.css";
import { ListItemProps } from '@mui/material/ListItem';
import {
  Link as RouterLink,
  Route,
  Routes,
} from 'react-router';

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

export function App(props: Props) {
  const { windowProps } = props;
  const {
    drawerOpen,
    isMaximized,
    appVersion,
    toggledrawerOpen,
    setIsMaximized,
    setAppVersion,
  } = useWindowStore();
  const {
    darkMode,
    actualTheme,
    language,
    inputFormat,
    outputFormat,
    conversionMode,
    outputDirectory,
    revealFileOnFinish,
    loadInputFormatSchema,
    loadOutputFormatSchema,
    toggleTheme,
    setInputFormat,
    setLanguage,
    setActualTheme,
    setDarkMode,
  } = useSettingStore();
  const {
    conversionTasks,
    curTaskListPage,
    middlewareIds,
    pluginInfos,
    addConversionTasks,
    updateConversionTask,
    removeConversionTask,
    filterConversionTasksByInputFormat,
    clearConversionTasks,
    loadMiddlewareSchema,
    setActiveStep,
    increaseFinishedCount,
    setCurTaskListPage,
  } = useConverterStore();
  const {
    showMessage,
    MessageSnackbar,
  } = useMessage();

  const handleDrawerToggle = toggledrawerOpen;

  useEffect(() => {
    const unlistenTaskProgress = listen('task_progress', (event) => {
      let task = event.payload as ConversionTask;
      updateConversionTask(task.id, task);
      if (!task.running) {
        if (task.success !== false) {
          pyInvoke("move_file", {
            "id": task.id,
          })
        } else {
          showMessage(
            t("conversion_failed"),
            'error'
          );
          increaseFinishedCount();
        }
      }
    })
    const unlistenMoveResult = listen('move_result', (event) => {
      let task = event.payload as ConversionTask;
      updateConversionTask(task.id, task);
      if (task.outputPath !== null && revealFileOnFinish) {
        revealItemInDir(task.outputPath);
      }
      increaseFinishedCount();
    })

    const getAppVersion = async () => {
      setAppVersion(await pyInvoke('app_version', {}));
    }
    getAppVersion();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (darkMode === 'system') {
        setActualTheme(e.matches ? 'dark' : 'light');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const unsubConversionTasks = useConverterStore.subscribe((state) => state.conversionTasks, (conversionTasks, prevConversionTasks) => {
      if (conversionTasks.length === 0 && conversionTasks !== prevConversionTasks) {
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
      if (outputFormat!== prevOutputFormat && outputFormat!== null) {
        loadOutputFormatSchema(outputFormat, i18n.language);
      }
    });
    if (inputFormat !== null) {
      loadInputFormatSchema(inputFormat, language);
    }
    if (outputFormat !== null) {
      loadOutputFormatSchema(outputFormat, language);
    }

    const unsubLanguage = useSettingStore.subscribe((state) => state.language, (language, prevLanguage) => {
      if (language !== prevLanguage) {
        i18n.changeLanguage(language);
        for (const middlewareId of middlewareIds) {
          loadMiddlewareSchema(middlewareId, language);
        }
      }
    });

    for (const middlewareId of middlewareIds) {
      loadMiddlewareSchema(middlewareId, language);
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      unlistenTaskProgress.then((unsub) => unsub());
      unlistenMoveResult.then((unsub) => unsub());
      unsubConversionTasks();
      unsubInputFormat();
      unsubOutputFormat();
      unsubLanguage();
    };
  }, [darkMode]);

  const theme = createAppTheme(actualTheme);

  const { t } = useTranslation();

  const ErrorDialog = (
    popupId: string,
    errorMessage: string
  ) => {
    const popupState = usePopupState({ variant: 'dialog', popupId: popupId })
    return (
      <Box>
        <IconButton {...bindTrigger(popupState)}>
          <ErrorCircle24Regular/>
          {t('window.about')}
        </IconButton>
        <Dialog
          {...bindDialog(popupState)}
        >
          <DialogTitle id="about-dialog-title" variant="h4" sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
          }}>
            {"LibreSVIP"}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="about-dialog-description">
              <Typography variant="body1" sx={{ p: 2 }}>
                {errorMessage}
              </Typography>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={
              () => popupState.close()
            }>OK</Button>
          </DialogActions>
        </Dialog>
      </Box>
    )
  };

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
          <ListItemLink to={item.path}>
          </ListItemLink>
        ))}
      </List>
    </Box>
  ); 
  
  const handleMaximize = async () => {
    let webview = getCurrentWebview();
    if (isMaximized) {
      await webview.window.unmaximize(); 
    } else {
      await webview.window.maximize();
    }
    setIsMaximized(!isMaximized);
  };
  
  const handleMinimize = async () => {
    let webview = getCurrentWebview();
    await webview.window.minimize();
  }
  
  const handleClose = async () => {
    let webview = getCurrentWebview();
    await webview.window.close();
  }

  const handleStartDragging = async (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    let webview = getCurrentWebview();
    await webview.window.startDragging();
  }

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

          <PopupState variant="popover" popupId="task-list-popover">
            {(popupState) => (
              <Box sx={{ display: 'inline', ml: 'auto' }}>
                <Tooltip title={t('window.task_list')} enterDelay={500}>
                  <IconButton
                    color="inherit"
                    size="large"
                    disabled={popupState.isOpen}
                    {...bindTrigger(popupState)}
                  >
                    <Badge badgeContent={conversionTasks.length} color="secondary">
                      <TaskListLtrFilled/>
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Popover
                  {...bindPopover(popupState)}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right', 
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right', 
                  }}
                  sx={{
                    '& .MuiPopover-paper': {
                      width: '500px',
                      maxHeight: '500px',
                      overflowY: 'auto',
                      borderRadius: '0px',
                    }, 
                  }}
                >
                  <Card>
                    <CardActions>
                      <SpeedDial
                        ariaLabel="Task List Actions"
                        icon={<SpeedDialIcon icon={<WrenchScrewdriver24Regular/>} />}
                        direction="right"
                      >
                        <SpeedDialAction
                          key='converter.add'
                          icon={<Add24Regular/>}
                          slotProps={{
                            tooltip: {
                              title: t('converter.add')
                            },
                          }}
                          onClick={async () => {
                            const selected = await open({
                              multiple: true,
                              directory: false,
                              filters: [{
                                name: t('converter.all_files'),
                                extensions: ['*'],
                              }, ...Object.entries(pluginInfos).map(([identifier, info]) => {
                                return {
                                  name: t(`plugin.${identifier}.file_format`),
                                  extensions: [info.suffix],
                                }
                              }).flat()],
                            });
                            let addedFiles: ConversionTask[] = [];
                            if (selected) {
                              for (let file of selected) {
                                if (path.sep() === '\\') {
                                  file = file.replace(/\\/g, '/');
                                }
                                let parsed = await parsePath(file);
                                let detectedInputFormat = parsed.ext.toLowerCase() in pluginInfos ? parsed.ext.toLowerCase() : inputFormat;
                                if (detectedInputFormat === null)
                                  continue;
                                let task: ConversionTask = {
                                  id: nanoid(),
                                  inputPath: file,
                                  baseName: parsed.name,
                                  outputStem: parsed.stem,
                                  inputFormat: detectedInputFormat,
                                  running: false,
                                  success: null,
                                  error: null,
                                  outputPath: null,
                                  warning: null,
                                }
                                addedFiles.push(task);
                              }
                              if (addedFiles.length > 0) {
                                addConversionTasks(addedFiles);
                                setInputFormat(addedFiles[addedFiles.length - 1].inputFormat);
                              }
                            }
                          }}
                        />
                        <SpeedDialAction
                          key='converter.clear'
                          icon={<BinRecycle24Regular/>}
                          slotProps={{
                            tooltip: {
                              title: t('converter.clear')
                            },
                          }}
                          onClick={clearConversionTasks}
                        />
                      </SpeedDial>
                    </CardActions>
                    <CardContent>
                      {
                        conversionTasks.length > 0 ? (
                          <List>
                            {conversionTasks.slice(
                              (curTaskListPage - 1) * 5,
                              curTaskListPage * 5
                            ).map((task, index) => (
                              <ListItem key={index} disablePadding>
                                <Tooltip title={task.baseName} enterDelay={500}>
                                  <ListItemText primary={task.baseName} sx={{
                                    overflowX: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '190px',
                                  }}/>
                                </Tooltip>
                                <ListItemIcon>
                                  {
                                    ((index === 0 && curTaskListPage === 1) || conversionMode !== "merge") ? (
                                      <ArrowExportLtr20Regular/>
                                    ): (
                                      <ArrowTurnRightUp20Regular style={{
                                        marginLeft: '0px',
                                      }}/>
                                    )
                                  }
                                </ListItemIcon>
                                {
                                  ((index === 0 && curTaskListPage === 1) || conversionMode !== "merge") && (
                                    <TextField
                                      variant="outlined"
                                      size="small"
                                      value={task.outputStem}
                                      onChange={(e) => {
                                        const newOutputStem = e.target.value;
                                        updateConversionTask(task.id,
                                          {
                                            ...task,
                                            outputStem: newOutputStem,
                                          }
                                        );
                                      }}
                                      sx={{ width: '150px' }}
                                    />
                                  )
                                }
                                {
                                  ((index === 0 && curTaskListPage === 1) || conversionMode !== "merge") && (
                                    <Typography variant="body2">
                                      {`.${outputFormat}`}
                                    </Typography>
                                  )
                                }
                                {
                                  task.running && (
                                    <CircularProgress size={20} sx={
                                      {
                                        ml: 'auto',
                                      }
                                    }/>
                                  )
                                }
                                <IconButton onClick={
                                  () => {
                                    let newInputFormat = removeConversionTask(task.id);
                                    if (newInputFormat !== null) {
                                      setInputFormat(newInputFormat);
                                    }
                                  }
                                } sx={{
                                  ml: 'auto',
                                }}>
                                  <Delete24Regular/>
                                </IconButton>
                              </ListItem>
                            ))}
                            <Pagination
                              count={Math.ceil(conversionTasks.length / 5)}
                              page={curTaskListPage}
                              onChange={(e, page) => {
                                setCurTaskListPage(page);
                              }}
                              sx={{
                                justifyContent: 'center',
                                marginTop: '16px',
                              }}
                            />
                          </List>
                        ) : (
                          <Typography variant="body2" sx={{ padding: '16px' }}>
                            {t('window.no_task')}
                          </Typography>
                        )
                      }
                    </CardContent>
                  </Card>
                </Popover>
              </Box>
            )}
          </PopupState>
          <Menu menuButton={({ open }) => (
            <Tooltip title={t('window.menu')} enterDelay={500}>
              <IconButton
                color="inherit"
                size="large"
                disabled={open}
              >
                <MoreHorizontalFilled/>
            </IconButton>
          </Tooltip>)} theming={actualTheme === 'dark' ? 'dark' : 'light'}>
            <SubMenu label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Color20Regular/>
                <Typography>
                  {t('window.switch_theme')}
                </Typography>
              </Box>
            }>
              <MenuRadioGroup
                value={darkMode}
                onRadioChange={(e) => {
                  setDarkMode(e.value);
                  toggleTheme();
                }}
              >
                <MenuItem type="radio" value="system">
                  <BrightnessHighFilled />
                  {t('window.system_theme')}
                </MenuItem>
                <MenuItem type="radio" value="dark">
                  <WeatherMoonRegular />
                  {t('window.dark_theme')}
                </MenuItem>
                <MenuItem type="radio" value="light">
                  <WeatherSunnyRegular />
                  {t('window.light_theme')}
                </MenuItem>
              </MenuRadioGroup>
            </SubMenu>
            <SubMenu label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Translate20Regular/>
                <Typography>
                  {t('window.switch_language')}
                </Typography>
              </Box>
            }>
              <MenuRadioGroup
                value={language}
                onRadioChange={(e) => {
                  setLanguage(e.value);
                }}
              >
                <MenuItem type="radio" value="en_US">
                  English
                </MenuItem>
                <MenuItem type="radio" value="zh_CN">
                  简体中文
                </MenuItem>
              </MenuRadioGroup>
            </SubMenu>
          </Menu>
          <Divider orientation="vertical" flexItem sx={{ marginLeft: '16px', marginRight: '16px' }}/>
          <Tooltip title={t('window.minimize')} enterDelay={500}>
            <IconButton
              color="inherit"
              onClick={handleMinimize}
              sx={{
                borderRadius: "0px",
                ':hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                padding: "16px", marginLeft: "0px", cursor: "default",
                "& .MuiTouchRipple-root .MuiTouchRipple-child": {
                  borderRadius: "0px"
                }
              }}
              size="large"
            >
              <Subtract20Regular />
            </IconButton>
          </Tooltip>
          <Tooltip title={isMaximized ? t('window.restore') : t('window.maximize')} enterDelay={500}>
            <IconButton
              color="inherit"
              onClick={handleMaximize}
              sx={{
                borderRadius: "0px",
                ':hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                padding: "16px", marginLeft: "0px", cursor: "default",
                "& .MuiTouchRipple-root .MuiTouchRipple-child": {
                  borderRadius: "0px"
                }
              }}
              size="large"
            >
              {isMaximized ? <SquareMultiple20Regular /> : <Maximize20Regular />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('window.close')} enterDelay={500}>
            <IconButton
              color="inherit"
              onClick={handleClose}
              sx={{
                borderRadius: "0px",
                ':hover': { backgroundColor: 'rgba(255, 0, 0, 0.75)' },
                padding: "16px", marginLeft: "0px", cursor: "default",
                "& .MuiTouchRipple-root .MuiTouchRipple-child": {
                  borderRadius: "0px"
                }
              }}
              size="large"
            >
              <Dismiss20Regular />
            </IconButton>
          </Tooltip>
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
      <Routes>
        <Route index path="" element={<ConverterPage/>}></Route>
        <Route path='about' element={<AboutPage/>}></Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
