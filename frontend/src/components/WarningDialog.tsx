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
  Alert24Regular,
  Clipboard24Regular,
  ClipboardCheckmark24Regular,
} from '@fluentui/react-icons';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useTranslation } from 'react-i18next';
import { bindTrigger, bindDialog, usePopupState } from 'material-ui-popup-state/hooks';

interface WarningDialogProps {
  popupId: string;
  warningMessage: string;
}

export const WarningDialog = (props: WarningDialogProps) => {
  const [clicked, setClicked] = useState<boolean>(false);
  const { popupId, warningMessage } = props;
  const popupState = usePopupState({ variant: 'dialog', popupId: popupId });
  const { t } = useTranslation();
  return (
    <Box>
      <IconButton {...bindTrigger(popupState)}>
        <Alert24Regular style={{
          color: 'orange',
        }}/>
      </IconButton>
      <Dialog
        {...bindDialog(popupState)}
      >
        <DialogTitle id="warning-dialog-title" variant="h4" sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexGrow: 1,
        }}>
          {t('window.warning')}
        </DialogTitle>
        <DialogContent sx={{
          overflowY: "hidden",
          minWidth: "380px"
        }}>
          <DialogContentText id="warning-dialog-description">
            <TextareaAutosize
              minRows={3}
              maxRows={20}
              value={warningMessage}
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
              writeText(warningMessage);
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
