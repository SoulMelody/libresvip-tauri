import { path } from '@tauri-apps/api';
import { Snackbar } from '@mui/material';
import { useState } from 'react';

export const parsePath = async (filePath: string) => {
    const dir = await path.dirname(filePath);
    const name = await path.basename(filePath);
    try {
        const ext = (await path.extname(filePath));
        const stem = await path.basename(filePath, "." + ext);
        return { dir, name, stem, ext };
    } catch (error) {
        const ext = "";
        const stem = await path.basename(filePath);
        return { dir, name, stem, ext };
    }
    
}

export const useMessage = () => {
    const [open, setOpen] = useState(false);
    const [currentMessage, setCurrentMessage] = useState<{
        text: string;
        severity: 'success'|'info'|'warning'|'error';
    } | null>(null);
    const [messageQueue, setMessageQueue] = useState<Array<{
        text: string;
        severity: 'success'|'info'|'warning'|'error';
    }>>([]);

    const showMessage = (text: string, severity: 'success'|'info'|'warning'|'error' = 'info') => {
        if (currentMessage) {
            setMessageQueue(prev => [...prev, { text, severity }]);
        } else {
            setCurrentMessage({ text, severity });
            setOpen(true);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setTimeout(() => {
            setCurrentMessage(null);
            if (messageQueue.length > 0) {
                const [nextMessage, ...remaining] = messageQueue;
                setCurrentMessage(nextMessage);
                setMessageQueue(remaining);
                setOpen(true);
            }
        }, 300);
    };

    const MessageSnackbar = () => (
        <Snackbar
            open={open}
            autoHideDuration={6000}
            onClose={handleClose}
            message={currentMessage?.text}
        />
    );

    return { showMessage, MessageSnackbar };
}