import {
  Badge,
  Box,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Pagination,
  Popover,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add24Regular,
  ArrowExportLtr20Regular,
  ArrowTurnRightUp20Regular,
  BinRecycle24Regular,
  Delete24Regular,
  TaskListLtrFilled,
  WrenchScrewdriver24Regular,
} from '@fluentui/react-icons';
import { open } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import PopupState from 'material-ui-popup-state';
import { bindTrigger, bindPopover } from 'material-ui-popup-state/hooks';
import { useConverterStore } from '../store/ConverterStore';
import { useSettingStore } from '../store/SettingStore';
import { createConversionTasksFromPaths } from '../Utils';
import { ErrorDialog } from './ErrorDialog';
import { WarningDialog } from './WarningDialog';

export const TaskListPopover = () => {
  const { t } = useTranslation();
  const {
    conversionTasks,
    curTaskListPage,
    inputPluginInfos,
    addConversionTasks,
    updateConversionTask,
    removeConversionTask,
    clearConversionTasks,
    setCurTaskListPage,
  } = useConverterStore();
  const {
    inputFormat,
    outputFormat,
    conversionMode,
    setInputFormat,
  } = useSettingStore();

  return (
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
                        }, ...Object.entries(inputPluginInfos).map(([identifier, info]) => {
                          return {
                            name: t(`plugin.${identifier}.file_format`),
                            extensions: info.suffixes || [info.suffix],
                          }
                        }).flat()],
                      });
                      if (selected) {
                        const addedFiles = await createConversionTasksFromPaths(selected, inputPluginInfos, inputFormat);
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
                          {
                            task.error && (
                              <ErrorDialog
                                popupId={`error-dialog-${task.id}`}
                                errorMessage={task.error}
                              />
                            )
                          }
                          {
                            task.warning && (
                              <WarningDialog
                                popupId={`warning-dialog-${task.id}`}
                                warningMessage={task.warning}
                              />
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
                        onChange={(_e, page) => {
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
  );
};
