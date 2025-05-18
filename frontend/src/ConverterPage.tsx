import {
  Box,
  CircularProgress,
  Fab,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
  Chip,
  Container,
  Card,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  Popover,
  Select,
  Typography,
  Divider,
  Tab,
  Tabs,
  Avatar,
  Switch,
  FormGroup,
  TextField,
  FormControlLabel,
  Backdrop,
  Button,
} from '@mui/material';
import {
  ArrowLeft20Filled,
  ArrowRight20Filled,
  Info32Regular,
  TagRegular,
  OpenRegular,
  PersonRegular,
  Play20Filled,
  DocumentRegular,
  Folder32Regular,
  QuestionCircle24Regular,
  ArrowUpload32Regular,
  ArrowEnter20Regular,
  ArrowExit20Regular,
  ArrowReset24Regular,
  Wand20Regular,
} from '@fluentui/react-icons';
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from '@tauri-apps/plugin-dialog';
import { useEffect } from 'react';
import { useConverterStore } from './store/ConverterStore';
import { ConversionTask } from './ApiTypes';
import { useSettingStore } from './store/SettingStore';
import { useTranslation } from 'react-i18next';
import { path } from '@tauri-apps/api';
import { parsePath } from './Utils';
import InputNumber from 'rc-input-number';
import 'rc-input-number/assets/index.css';
import Form from '@rjsf/mui';
import { DescriptionFieldProps, FieldTemplateProps, RegistryWidgetsType, WidgetProps, descriptionId, getTemplate, labelValue, getUiOptions } from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import localizer from 'ajv-i18n';
import i18n from './i18n';
import { nanoid } from 'nanoid';
import HoverPopover from 'material-ui-popup-state/HoverPopover';
import PopupState, { bindHover, bindPopover, bindTrigger } from 'material-ui-popup-state';
import { pyInvoke } from 'tauri-plugin-pytauri-api';
import { stat } from '@tauri-apps/plugin-fs';


export const ConverterPage = () => {
  const { t } = useTranslation();
  const {
    pluginInfos,
    middlewareIds,
    middlewareSchemas,
    middlewareFormDatas,
    activeStep,
    optionTab,
    selectedMiddlewares,
    conversionTasks,
    finishedCount,
    handleNext,
    handleBack,
    addConversionTasks,
    setOptionTab,
    clearConversionTasks,
    setSelectedMiddlewares,
    resetFinishedCount,
    setMiddlewareFormData,
  } = useConverterStore();
  const {
    inputFormat,
    outputFormat,
    inputFormatSchema,
    inputFormatUiSchema,
    outputFormatSchema,
    outputFormatUiSchema,
    inputFormatFormData,
    outputFormatFormData,
    outputDirectory,
    conversionMode,
    conflictPolicy,
    revealFileOnFinish,
    maxTrackCount,
    setInputFormat,
    setOutputFormat,
    setOutputDirectory,
    setConversionMode,
    setConflictPolicy,
    setRevealFileOnFinish,
    setMaxTrackCount,
    setInputFormatFormData,
    setOutputFormatFormData,
  } = useSettingStore();
  const tempFormDatas: {[k: string]: {[k: string]: any}} = {};

  const validator = customizeValidator({}, localizer[(
    (lang) => {
      switch (lang) {
        case 'zh_CN':
          return 'zh';
        default:
          return 'en';
      }      
    }
  )(i18n.language)]);

  function CustomFieldTemplate(props: FieldTemplateProps) {
    const {
      id,
      children,
      classNames,
      style,
      disabled,
      displayLabel,
      hidden,
      label,
      onDropPropertyClick,
      onKeyChange,
      readonly,
      required,
      rawErrors = [],
      errors,
      help,
      description,
      rawDescription,
      schema,
      uiSchema,
      registry,
    } = props;
    const uiOptions = getUiOptions(uiSchema);
    const WrapIfAdditionalTemplate = getTemplate(
      'WrapIfAdditionalTemplate',
      registry,
      uiOptions
    );
  
    if (hidden) {
      return <div style={{ display: 'none' }}>{children}</div>;
    }
    return (
      <WrapIfAdditionalTemplate
        classNames={classNames}
        style={style}
        disabled={disabled}
        id={id}
        label={label}
        onDropPropertyClick={onDropPropertyClick}
        onKeyChange={onKeyChange}
        readonly={readonly}
        required={required}
        schema={schema}
        uiSchema={uiSchema}
        registry={registry}
      >
        <FormControl fullWidth={true} error={rawErrors.length ? true : false} required={required} style={{
          backgroundImage: "linear-gradient(to right, #ccc 0%, #ccc 50%, transparent 50%)",
          backgroundRepeat: "repeat-x",
          backgroundSize: "8px 1px",
          paddingTop: 10,
        }}>
          {children}
          {displayLabel && rawDescription ? (
            <Typography variant='caption' color='textSecondary'>
              {description}
            </Typography>
          ) : null}
          {errors}
          {help}
        </FormControl>
      </WrapIfAdditionalTemplate>
    );
  }

  function CustomDescriptionFieldTemplate(props: DescriptionFieldProps) {
    const { description, id } = props;
    return (
      <PopupState variant="popover" popupId={id}>
        {(popupState) => (
          <Box sx={{ float: "inline-end" }}>
            <IconButton {...bindHover(popupState)}>
              <QuestionCircle24Regular />
            </IconButton>
            <HoverPopover
              {...bindPopover(popupState)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
            >
              <Typography sx={{ p: 2 }} variant='subtitle2'>{description}</Typography>
            </HoverPopover>
          </Box>
        )}
      </PopupState>
    );
  }
  const CustomCheckbox = function (props: WidgetProps) {
    const DescriptionFieldTemplate = getTemplate(
      'DescriptionFieldTemplate',
      props.registry,
      props.options
    );
    const description = props.options.description ?? props.schema.description;
    return (
      <Box>
        <FormControlLabel
          control={<Switch
            id={props.id}
            name={props.id}
            checked={props.value}
            onChange={() => props.onChange(!props.value)}
          />}
          label={labelValue(props.label, props.hideLabel, false)}
        />
        {!props.hideLabel && !!description && (
          <DescriptionFieldTemplate
            id={descriptionId(props.id)}
            description={description}
            schema={props.schema}
            uiSchema={props.uiSchema}
            registry={props.registry}
          />
        )}
      </Box>
    );
  };

  const widgets: RegistryWidgetsType = {
    CheckboxWidget: CustomCheckbox,
  };

  const InputOptionsForm = () => {
    return (
      <Form schema={inputFormatSchema} validator={validator}
        uiSchema={inputFormatUiSchema} templates={{
          DescriptionFieldTemplate: CustomDescriptionFieldTemplate,
          FieldTemplate: CustomFieldTemplate
        }} widgets={widgets} onChange={(e) => {
          tempFormDatas['inputOptionsForm'] = e.formData;
        }} onBlur={() => {
          if (
            tempFormDatas['inputOptionsForm']!== undefined
          ) {
            setInputFormatFormData(tempFormDatas['inputOptionsForm']);
          }
        }}
        formData={inputFormatFormData} liveValidate={true}/>
    );
  }

  interface MiddlewareOptionsFormProps {
    identifier: string;
  }

  const MiddlewareOptionsForm = (props: MiddlewareOptionsFormProps) => {
    const { identifier } = props;
    let schema = middlewareSchemas[identifier];
    if (schema === undefined) {
      return <Box/>;
    }
  
    return (
      <Form schema={schema.json_schema} validator={validator}
        uiSchema={schema.ui_schema} templates={{
          DescriptionFieldTemplate: CustomDescriptionFieldTemplate,
          FieldTemplate: CustomFieldTemplate
        }} widgets={widgets} onChange={(e) => {
          tempFormDatas[`middleware-${identifier}`] = e.formData;
        }} onBlur={() => {
          if (
            tempFormDatas[`middleware-${identifier}`] !== undefined
          ) {
            setMiddlewareFormData(identifier, tempFormDatas[`middleware-${identifier}`]);
          }
        }}
        formData={middlewareFormDatas[identifier]} liveValidate={true}/>
    );
  }

  const OutputOptionsForm = () => {
    return (
      <Form schema={outputFormatSchema} validator={validator}
        uiSchema={outputFormatUiSchema} templates={{
          DescriptionFieldTemplate: CustomDescriptionFieldTemplate,
          FieldTemplate: CustomFieldTemplate
        }} widgets={widgets} onChange={(e) => {
          tempFormDatas['outputOptionsForm'] = e.formData;
        }} onBlur={() => {
          if (
            tempFormDatas['outputOptionsForm'] !== undefined
          ) {
            setOutputFormatFormData(tempFormDatas['outputOptionsForm']);
          }
        }}
        formData={outputFormatFormData} liveValidate={true}/>
    );
  }

  useEffect(() => {
    const handleDragDrop = async (event: any) => {
      if (event.event === "tauri://drag-drop"){
        const files = event.payload.paths;
        let addedFiles: ConversionTask[] = [];
        for (let file of files) {
          let statResult = await stat(file);
          if (
            statResult.isDirectory
          ) {
            continue;
          }
          if (path.sep() === '\\') {
            file = file.replace(/\\/g, '/');
          }
          let parsed = await parsePath(file)
          let detectedInputFormat = parsed.ext.toLowerCase() in pluginInfos ? parsed.ext.toLowerCase() : inputFormat;
          if (detectedInputFormat === null) {
            continue;
          }
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
    };
    let webview = getCurrentWebview();
    const unlistenDragDrop = webview.window.onDragDropEvent(handleDragDrop);
    return () => {
      unlistenDragDrop.then((unlisten) => {
        unlisten();
      })
    };
  }, []);

  return (
    <Box sx={{
      bgcolor: 'background.default',
      flexGrow: 1,
      minHeight: "calc(100vh - 52px)",
    }}>
      <Container>
        <Stepper activeStep={activeStep}>
          <Step>
            <StepLabel>{t('converter.import_projects')}</StepLabel>
          </Step>
          <Step>
            <StepLabel>{t('converter.export_config')}</StepLabel>
          </Step>
          <Step>
            <StepLabel>{t('converter.options')}</StepLabel>
          </Step>
          <Step>
            <StepLabel>{t('converter.export_files')}</StepLabel>
          </Step>
        </Stepper>
        {
          activeStep !== 0 && (
            <Tooltip title={t('nav.back')} enterDelay={500}>
              <Fab sx={{
                position: 'absolute',
                bottom: 20,
                left: 20,
              }} onClick={handleBack}>
                <ArrowLeft20Filled />
              </Fab>
            </Tooltip>
          )
        }
        {
          conversionTasks.length > 0 && (
            (
              activeStep === 0 && inputFormat !== null
            ) || (
              activeStep === 1 && outputFormat !== null
            )
          ) && (
            <Tooltip title={
              t('nav.next')
            } enterDelay={500}>
              <Fab sx={{
                position: 'absolute',
                bottom: 20,
                right: 20,
              }} onClick={handleNext}>
                <ArrowRight20Filled />
              </Fab>
            </Tooltip>
          )
        }
        {
          conversionTasks.length > 0 && inputFormat !== null && outputFormat !== null && activeStep === 2 && (
            <Tooltip title={
              t('nav.start')
            } enterDelay={500}>
              <Fab sx={{
                position: 'absolute',
                bottom: 20,
                right: 20,
              }} onClick={() => {
                let curInputFormatFormData = inputFormatFormData;
                let curOutputFormatFormData = outputFormatFormData;
                let curMiddlewareFormDatas = middlewareFormDatas;
                for (let [identifier, formData] of Object.entries(tempFormDatas)) {
                  if (identifier === 'inputOptionsForm') {
                    setInputFormatFormData(formData);
                    curInputFormatFormData = formData;
                  } else if (identifier === 'outputOptionsForm') {
                    setOutputFormatFormData(formData);
                    curOutputFormatFormData = formData;
                  } else {
                    let middlewareIdentifier = identifier.split('-')[1];
                    setMiddlewareFormData(middlewareIdentifier, formData);
                    curMiddlewareFormDatas[middlewareIdentifier] = formData;
                  }
                }
                pyInvoke("start_conversion", {
                  inputFormat: inputFormat,
                  outputFormat: outputFormat,
                  language: i18n.language,
                  mode: conversionMode,
                  maxTrackCount: maxTrackCount,
                  conversionTasks: conversionTasks,
                  inputOptions: curInputFormatFormData,
                  outputOptions: curOutputFormatFormData,
                  selectedMiddlewares: selectedMiddlewares,
                  middlewareOptions: curMiddlewareFormDatas,
                  outputDir: outputDirectory,
                  conflictPolicy: conflictPolicy,
                });
                handleNext();
                resetFinishedCount();
              }}>
                <Play20Filled />
              </Fab>
            </Tooltip>
          )
        }
      </Container>
      {(() => {
        switch(activeStep) {
          case 0:
            return  (
              <Box >
                <FormControl sx={{ m: 1, display: "block" }}>
                  <InputLabel id="conversion-mode-label">{t('converter.conversion_mode')}</InputLabel>
                  <Select
                    labelId="conversion-mode-label" id="conversion_mode" label={t('converter.conversion_mode')}
                    value={conversionMode}
                    onChange={(e) => {
                      setConversionMode(e.target.value);
                    }}
                    sx={{ minWidth: 200 }}
                  >
                    {[
                      "direct",
                      "merge",
                      "split",
                    ].map((mode) => {
                      return (
                        <MenuItem value={mode}>{t(`converter.${mode}`)}</MenuItem>
                      )
                    })}
                  </Select>
                </FormControl>
                {
                  conversionMode === "split" && (
                    <Box>
                      <Typography variant="subtitle1" sx={{
                        p: 2, display: "inline",
                      }}>{t('converter.max_track_count')}</Typography>
                      <InputNumber value={maxTrackCount} min={1} step={1} required={true} changeOnWheel={true} onChange={(e) => {
                        if (e!== null) {
                          setMaxTrackCount(e)
                        }}
                      }/>
                    </Box>
                  )
                }
                <FormControl sx={{ m: 1 }}>
                  <InputLabel id="input-format-label">{t('converter.input_format')}</InputLabel>
                  <Select
                    labelId="input-format-label" id="input_format" label={t('converter.input_format')}
                    value={inputFormat}
                    onChange={(e) => {
                      if (e.target.value !== null){
                        setInputFormat(e.target.value);
                      }
                    }}
                    sx={{ minWidth: 200 }}
                  >
                    {Object.values(pluginInfos).map((info) => {
                      return (
                        <MenuItem value={info.identifier}>{t(`plugin.${info.identifier}.file_format`)} {`(*.${info.suffix})`}</MenuItem>
                      )
                    })}
                  </Select>
                </FormControl>
                <PopupState variant="popover" popupId="input-format-info">
                  {(popupState) => (
                    <Box sx={{ display: 'inline-block' }}>
                      <Tooltip title={t('converter.view_plugin_info')} enterDelay={500}>
                        <IconButton size="medium" sx={{ marginTop: "10px", outlineWidth: "1px", outlineColor: "#aaaaaa", outlineStyle: "solid" }} {...bindTrigger(popupState)}>
                          <Info32Regular/>
                        </IconButton>
                      </Tooltip>
                      <Popover
                        {...bindPopover(popupState)}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'center',
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'center',
                        }}
                      >
                        {
                          inputFormat!== null && pluginInfos[inputFormat]!== undefined && (
                            <Card>
                              <Box sx={{flexDirection: 'row', display: 'flex'}}>
                                <Avatar src={"data:image/png;base64," + pluginInfos[inputFormat].icon_base64} sx={{ width: 150, height: 150 }} /> 
                                <Divider orientation="vertical" />
                                <Box>
                                  <Typography variant="h5" sx={{ p: 2 }}>{
                                    t(`plugin.${inputFormat}.name`)
                                  }</Typography>
                                  <Box sx={{flexDirection: 'row', display: 'flex'}}>
                                    <Chip icon={<TagRegular/>} label={pluginInfos[inputFormat].version} sx={{ m: 1 }}/>
                                    <Chip
                                      icon={<PersonRegular/>}
                                      deleteIcon={<OpenRegular/>}
                                      label={t(`plugin.${inputFormat}.author`)}
                                      component="a"
                                      href={pluginInfos[inputFormat].website || '#'}
                                      target="_blank"
                                      sx={{ m: 1 }}
                                      clickable
                                      onDelete={() => {}}
                                    />
                                  </Box>
                                  <Chip icon={<DocumentRegular/>} label={t(`plugin.${inputFormat}.file_format`) + " " + `(*.${pluginInfos[inputFormat].suffix})`} sx={{ m: 1 }}/>
                                </Box>
                              </Box>
                              <Divider />
                              <Typography variant="body1" sx={{ p: 2 }}>{t(`plugin.${inputFormat}.description`)}</Typography>
                            </Card>
                          ) 
                        }
                      </Popover>
                    </Box>
                  )}
                </PopupState>
                <Box 
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
                        let parsed = await parsePath(file)
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
                  sx={{
                    p: 4,
                    border: '2px dashed',
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                    borderRadius: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: (theme) => theme.palette.text.primary,
                    backgroundColor: (theme) => theme.palette.background.paper,
                    display: 'flex',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minHeight: 'calc(100vh - 370px)',
                    maxHeight: 'calc(100vh - 370px)',
                  }}>
                    <ArrowUpload32Regular/>
                  <Typography variant="body1" sx={{ p: 2 }}>{t('converter.drag_and_drop_files_here')}</Typography>
                </Box>
              </Box>
            );
          case 1:
            return (
              <FormGroup sx={{
                minHeight: 'calc(100vh - 160px)',
                maxHeight: 'calc(100vh - 160px)',
              }}>
                <Box>
                  <FormControl sx={{ m: 1 }}>
                    <InputLabel id="output-format-label">{t('converter.output_format')}</InputLabel>
                    <Select labelId="output-format-label" id="output_format" label={t('converter.output_format')}
                      value={outputFormat}
                      onChange={(e) => {
                        if (e.target.value !== null) {
                          setOutputFormat(e.target.value)
                        }
                      }}
                      sx={{ minWidth: 200 }}
                    >
                      {Object.values(pluginInfos).map((info) => {
                        return (
                          <MenuItem value={info.identifier}>{t(`plugin.${info.identifier}.file_format`)} {`(*.${info.suffix})`}</MenuItem>
                        )
                      })}
                    </Select>
                  </FormControl>
                  <PopupState variant="popover" popupId="input-format-info">
                    {(popupState) => (
                      <Box sx={{ display: 'inline-block' }}>
                        <Tooltip title={t('converter.view_plugin_info')} enterDelay={500}>
                          <IconButton size="medium" sx={{ marginTop: "10px", outlineWidth: "1px", outlineColor: "#aaaaaa", outlineStyle: "solid" }} {...bindTrigger(popupState)}>
                            <Info32Regular/>
                          </IconButton>
                        </Tooltip>
                        <Popover
                          {...bindPopover(popupState)}
                          anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'center',
                          }}
                          transformOrigin={{
                            vertical: 'top',
                            horizontal: 'center',
                          }}
                        >
                          {
                            outputFormat !== null && pluginInfos[outputFormat]!== undefined && (
                              <Card>
                                <Box sx={{flexDirection: 'row', display: 'flex'}}>
                                  <Avatar src={"data:image/png;base64," + pluginInfos[outputFormat].icon_base64} sx={{ width: 150, height: 150 }} />
                                  <Divider orientation="vertical" />
                                  <Box>
                                    <Typography variant="h5" sx={{ p: 2 }}>{
                                      t(`plugin.${outputFormat}.name`)
                                    }</Typography>
                                    <Box sx={{flexDirection: 'row', display: 'flex'}}>
                                      <Chip icon={<TagRegular/>} label={pluginInfos[outputFormat].version} sx={{ m: 1 }}/>
                                      <Chip
                                        icon={<PersonRegular/>}
                                        deleteIcon={<OpenRegular/>}
                                        label={t(`plugin.${outputFormat}.author`)}
                                        component="a"
                                        href={pluginInfos[outputFormat].website || '#'}
                                        target="_blank"
                                        sx={{ m: 1 }}
                                        clickable
                                        onDelete={() => {}}
                                      />
                                    </Box>
                                    <Chip icon={<DocumentRegular/>} label={t(`plugin.${outputFormat}.file_format`) + " " + `(*.${pluginInfos[outputFormat].suffix})`} sx={{ m: 1 }}/>
                                  </Box>
                                </Box>
                                <Divider />
                                <Typography variant="body1" sx={{ p: 2 }}>{t(`plugin.${outputFormat}.description`)}</Typography>
                              </Card>
                            ) 
                          }
                        </Popover>
                      </Box>
                    )}
                  </PopupState>
                  </Box>
                  <Box>
                  <FormControl sx={{ m: 1, minWidth: 300 }}>
                    <TextField id="output_directory" label={t('converter.output_directory')}
                      value={outputDirectory}
                      disabled={true}
                    >
                    </TextField>
                  </FormControl>
                  <Tooltip title={t('converter.select_output_dir')} enterDelay={500}>
                    <IconButton size="medium" sx={{ marginTop: "10px", outlineWidth: "1px", outlineColor: "#aaaaaa", outlineStyle: "solid" }} onClick={
                      async (event: React.MouseEvent<HTMLButtonElement>) => {
                        const selected = await open({
                          multiple: false,
                          directory: true,
                          defaultPath: outputDirectory,
                        });
                        if (selected) {
                          setOutputDirectory(selected);
                        }
                      }
                    }>
                      <Folder32Regular/>
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box>
                  <FormControl sx={{ m: 1, minWidth: 300 }}>
                    <InputLabel id="conflict-policy-label">{t('converter.conflict_policy')}</InputLabel>
                    <Select
                      labelId="conflict-policy-label" id="conflict_policy" label={t('converter.conflict_policy')}
                      value={conflictPolicy}
                      onChange={(e) => {
                        setConflictPolicy(e.target.value)
                      }}
                    >
                      <MenuItem value="overwrite">{t('converter.overwrite')}</MenuItem>
                      <MenuItem value="skip">{t('converter.skip')}</MenuItem>
                      <MenuItem value="rename">{t('converter.rename')}</MenuItem>
                      <MenuItem value="prompt">{t('converter.prompt')}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box>
                  <Switch checked={revealFileOnFinish} onChange={(e) => {
                    setRevealFileOnFinish(e.target.checked) 
                  }} />
                  <Typography sx={{
                    display: 'inline',
                  }}>{t('converter.reveal_file_on_finish')}</Typography>
                </Box>
              </FormGroup>
            );
          case 2:
            return (
              <Box sx={{ width: "100%" }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={optionTab} onChange={(event: React.SyntheticEvent, newValue: number) => {
                    setOptionTab(newValue);
                  }} sx={{
                    height: '32px',
                    minHeight: '32px',
                  }} scrollButtons="auto" variant='scrollable' allowScrollButtonsMobile={true} >
                    <Tab icon={<ArrowEnter20Regular/>} label={t('converter.input_options')} id="input-options-tab" aria-controls="input-tabpanel" iconPosition="start" sx={{
                      height: '32px',
                      minHeight: '32px',
                    }}/>
                    <Tab icon={<ArrowExit20Regular/>} label={t('converter.output_options')} id="output-options-tab" aria-controls="output-tabpanel" iconPosition="start" sx={{
                      height: '32px',
                      minHeight: '32px',
                    }} />
                    <Tab icon={<Wand20Regular/>} label={t('converter.middleware_options')} id="middleware-options-tab" aria-controls="middleware-tabpanel" iconPosition="start" sx={{
                      height: '32px',
                      minHeight: '32px',
                    }} />
                  </Tabs>
                  <Box role="tabpanel" hidden={optionTab !== 0} id="input-tabpanel" aria-labelledby="input-options-tab" key={0}>
                    {
                      optionTab === 0 && (
                        <Box sx={{ overflowY: "auto", minHeight: "calc(100vh - 240px)", maxHeight: "calc(100vh - 240px)" }}>
                          {
                            <InputOptionsForm/>
                          }
                        </Box>
                      )
                    }
                  </Box>
                  <Box role="tabpanel" hidden={optionTab !== 1} id="output-tabpanel" aria-labelledby="output-options-tab" key={2}>
                    {
                      optionTab === 1 && (
                        <Box sx={{ overflowY: "auto", minHeight: "calc(100vh - 240px)", maxHeight: "calc(100vh - 240px)" }}>
                          {
                            <OutputOptionsForm/>
                          }
                        </Box>
                      )
                    }
                  </Box>
                  <Box role="tabpanel" hidden={optionTab !== 2} id="middleware-tabpanel" aria-labelledby="middleware-options-tab" key={1}>
                    {
                      optionTab === 2 && (
                        <Box sx={{ overflowY: "auto", minHeight: "calc(100vh - 240px)", maxHeight: "calc(100vh - 240px)" }}>
                          {middlewareIds.map((identifier) => (
                            <Box>
                              <Switch key={identifier} checked={selectedMiddlewares.includes(identifier)} onChange={() => {
                                if (selectedMiddlewares.includes(identifier)) {
                                  setSelectedMiddlewares(selectedMiddlewares.filter((value) => value !== identifier));
                                } else {
                                  setSelectedMiddlewares([...selectedMiddlewares, identifier]);
                                }
                              }} />
                              <Typography sx={{
                                display: 'inline',
                              }}>{t(`middleware.${identifier}.name`)}</Typography>
                              <Tooltip
                                title={t(`middleware.${identifier}.description`)}
                                enterDelay={500}
                              >
                                <IconButton>
                                  <QuestionCircle24Regular/>
                                </IconButton>
                              </Tooltip>
                              {
                                selectedMiddlewares.includes(identifier) && (
                                  <MiddlewareOptionsForm identifier={`${identifier}`} />
                                )
                              }
                            </Box>
                          ))}
                        </Box>
                      )
                    }
                  </Box>
                </Box>
              </Box>
            );
          case 3:
            let busy = finishedCount < (conversionMode === "merge" ? 1 : conversionTasks.length);
            return busy ? (
              <Backdrop open={true} sx={{
                color: (theme) => theme.palette.common.white,
                zIndex: (theme) => theme.zIndex.drawer + 1,
                inset: "52px 0px 0px 0px",
              }}>
                <Box sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}>
                  <CircularProgress color="inherit" />
                  <Typography variant="body1" sx={{ p: 2 }}>{`${finishedCount} / ${conversionMode === "merge"? 1 : conversionTasks.length}`}</Typography>
                </Box>
              </Backdrop>
            ) : (
              <Box sx={{
                width: "100%",
                height: "calc(100vh - 160px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}>
                <Button startIcon={<ArrowReset24Regular/>} onClick={() => {
                  clearConversionTasks();
                }} variant="contained">
                  {t('converter.reset')}
                </Button>
              </Box>
            );
        }
      })()}
    </Box>
  );
};