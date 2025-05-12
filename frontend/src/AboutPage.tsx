import {
  Box,
  Button,
  Typography
} from '@mui/material';

import {
  PersonAccounts20Regular,
  CodePyRectangle16Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { useWindowStore } from './store/WindowStore';

export const AboutPage = () => {
  const {
    appVersion,
  } = useWindowStore();
  const { t } = useTranslation();
  return (
    <Box sx={{
      bgcolor: 'background.default',
      flexGrow: 1,
      minHeight: "calc(100vh - 52px)",
    }}>
      <Typography id="about-dialog-title" variant="h4" sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        }}>
        {"LibreSVIP"}
      </Typography>
      <Box>
        <Typography id="about-dialog-description">
            <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            flexWrap: 'wrap',
            }}>
            <small>
              {t('window.version')}: {appVersion}
            </small>
            </Box>
            <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            flexWrap: 'wrap',
            }}>
            <small>
              {t('window.author')}: SoulMelody
            </small>
            </Box>
            <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            flexGrow: 1,
            flexWrap: 'wrap',
            }}>
            <Button
              startIcon={<PersonAccounts20Regular/>}
              component="a"
              href="https://space.bilibili.com/175862486"
              target="_blank"
              variant="contained"
            >
              Author's profile
            </Button>
            <Button
              startIcon={<CodePyRectangle16Regular/>}
              component="a"
              href="https://github.com/SoulMelody/LibreSVIP"
              target="_blank"
              variant="contained"
            >
              Repository link
            </Button>
            </Box>
            <Box>
              LibreSVIP is an open-sourced, liberal and extensionable framework that can convert your singing synthesis projects between different file formats.
            </Box>
            <Box>
              All people should have the right and freedom to choose. That's why we're committed to giving you a second chance to keep your creations free from the constraints of platforms and coterie.
            </Box>
        </Typography>
      </Box>
    </Box>
  );
};