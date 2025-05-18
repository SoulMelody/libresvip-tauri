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
      justifyContent: 'center',
      display: 'flex',
    }}>
      <Box sx={{
        maxWidth: "600px",
      }}>
        <Typography id="about-dialog-title" variant="h4" sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexGrow: 1,
        }}>
          {"LibreSVIP"}
        </Typography>
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
            {t('window.author')}: {t('window.author_name')}
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
            {t('window.author_profile')}
          </Button>
          <Button
            startIcon={<CodePyRectangle16Regular/>}
            component="a"
            href="https://github.com/SoulMelody/LibreSVIP"
            target="_blank"
            variant="contained"
          >
            {t('window.repo_url')}
          </Button>
          </Box>
          <Box>
            {t('window.about_line_1')}
          </Box>
          <Box>
            {t('window.about_line_2')}
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};