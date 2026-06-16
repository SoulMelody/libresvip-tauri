import { useRef } from 'react';
import {
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Dismiss20Regular,
  Maximize20Regular,
  SquareMultiple20Regular,
  Subtract20Regular,
} from '@fluentui/react-icons';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { useWindowStore } from '../store/WindowStore';

const tbBtnSx = {
  borderRadius: "0px",
  ':hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  padding: "16px", marginLeft: "0px", cursor: "default",
  "& .MuiTouchRipple-root .MuiTouchRipple-child": {
    borderRadius: "0px"
  }
} as const;

export const TitleBarButtons = () => {
  const { t } = useTranslation();
  const { isMaximized, setIsMaximized } = useWindowStore();
  const snapOverlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMaximize = async () => {
    await invoke("plugin:window|toggle_maximize");
    setIsMaximized(await invoke("plugin:window|is_maximized"));
  };

  const handleMinimize = async () => {
    await invoke("plugin:window|minimize");
  };

  const handleClose = async () => {
    await invoke("plugin:window|close");
  };

  return (
    <>
      <Divider orientation="vertical" flexItem sx={{ marginLeft: '16px', marginRight: '16px' }}/>
      <div
        data-tauri-drag-region="false" data-tauri-decorum-tb
      >
        <Tooltip title={t('window.minimize')} enterDelay={500}>
          <IconButton
            id="decorum-tb-minimize"
            className="decorum-tb-btn"
            color="inherit"
            onClick={handleMinimize}
            sx={tbBtnSx}
            size="large"
          >
            <Subtract20Regular />
          </IconButton>
        </Tooltip>
        <Tooltip title={isMaximized ? t('window.restore') : t('window.maximize')} enterDelay={500}>
          <IconButton
            id="decorum-tb-maximize"
            className="decorum-tb-btn"
            color="inherit"
            onClick={handleMaximize}
            onMouseEnter={() => {
              if (snapOverlayRef.current === null)
                snapOverlayRef.current = setTimeout(async () => {
                  await invoke("plugin:decorum|show_snap_overlay");
                }, 620);
              }
            }
            onMouseLeave={() => {
              if (snapOverlayRef.current === null) return;
              clearTimeout(snapOverlayRef.current);
              snapOverlayRef.current = null;
            }}
            sx={tbBtnSx}
            size="large"
          >
            {isMaximized ? <SquareMultiple20Regular /> : <Maximize20Regular />}
          </IconButton>
        </Tooltip>
        <Tooltip title={t('window.close')} enterDelay={500}>
          <IconButton
            id="decorum-tb-close"
            className="decorum-tb-btn"
            color="inherit"
            onClick={handleClose}
            sx={{
              ...tbBtnSx,
              ':hover': { backgroundColor: 'rgba(255, 0, 0, 0.75)' },
            }}
            size="large"
          >
            <Dismiss20Regular />
          </IconButton>
        </Tooltip>
      </div>
    </>
  );
};
