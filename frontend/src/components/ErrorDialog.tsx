import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  TextareaAutosize,
} from '@mui/material';
import {
  ErrorCircle24Regular,
  Clipboard24Regular,
  ClipboardCheckmark24Regular,
} from '@fluentui/react-icons';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useTranslation } from 'react-i18next';
import { bindTrigger, bindDialog, usePopupState } from 'material-ui-popup-state/hooks';

interface ErrorDialogProps {
  popupId: string;
  errorMessage: string;
}

export const ErrorDialog = (props: ErrorDialogProps) => {
  const [clicked, setClicked] = useState<boolean>(false);
  const { popupId, errorMessage } = props;
  const popupState = usePopupState({ variant: 'dialog', popupId: popupId });
  const { t } = useTranslation();
  return (
    <Box>
      <IconButton {...bindTrigger(popupState)}>
        <ErrorCircle24Regular style={{
          color: 'red',
        }}/>
      </IconButton>
      <Dialog
        {...bindDialog(popupState)}
      >
        <DialogTitle id="error-dialog-title" variant="h4" sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexGrow: 1,
        }}>
          {t('window.error')}
        </DialogTitle>
        <DialogContent sx={{
          overflowY: "hidden",
          minWidth: "380px"
        }}>
          <DialogContentText id="error-dialog-description">
            <TextareaAutosize
              minRows={3}
              maxRows={20}
              value={errorMessage}
              readOnly
              style={{
                width: '100%',
                resize: 'none',
              }}
            />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={
            () => {
              writeText(errorMessage);
              setClicked(true);
              setTimeout(() => {
                setClicked(false);
              }, 1000);
            }
          } startIcon={
            clicked ? <ClipboardCheckmark24Regular/> : <Clipboard24Regular/>
          }>
            {clicked ? t('window.copied') : t('window.copy')}
          </Button>
          <Button onClick={
            () => popupState.close()
          }>
            {t('window.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
