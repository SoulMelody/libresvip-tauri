import { useRef } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  BrightnessHighFilled,
  Color20Regular,
  MoreHorizontalFilled,
  TextBulletListSquareEdit20Regular,
  Translate20Regular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { useHotkeys } from 'react-hotkeys-hook';
import { ControlledMenu, MenuItem, MenuRadioGroup, SubMenu } from '@szhsin/react-menu';
import { useSettingStore } from '../store/SettingStore';

interface AppMenuProps {
  isMenuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  menuRef: React.RefObject<HTMLButtonElement | null>;
  onLyricRulesOpen: () => void;
}

export const AppMenu = (props: AppMenuProps) => {
  const { isMenuOpen, setMenuOpen, menuRef, onLyricRulesOpen } = props;
  const { t } = useTranslation();
  const {
    darkMode,
    actualTheme,
    language,
    toggleTheme,
    setLanguage,
    setDarkMode,
  } = useSettingStore();

  const themeSubmenuRef = useRef(null);
  useHotkeys('ctrl+t', () => themeSubmenuRef.current.openMenu());

  const languageSubmenuRef = useRef(null);
  useHotkeys('ctrl+l', () => languageSubmenuRef.current.openMenu());

  const kbdSx = {
    marginLeft: '10px',
    marginRight: '10px',
    fontSize: '12px',
    fontWeight: 'bold',
    bgcolor: 'background.default',
    borderRadius: '4px',
    padding: '4px',
    display: 'inline-block',
    height: '20px',
    textAlign: 'center',
    lineHeight: '20px',
    textTransform: 'uppercase',
    borderColor: 'text.primary',
    borderWidth: '1px',
    borderStyle: 'solid',
  } as const;

  const kbdSxNoMl = { ...kbdSx, marginLeft: undefined, marginRight: '10px' } as const;

  return (
    <>
      <Tooltip title={
        t('window.menu') + ' (Ctrl+M)'
      } enterDelay={500}>
        <IconButton
          color="inherit"
          size="large"
          disabled={isMenuOpen}
          ref={menuRef}
          onClick={() => setMenuOpen(true)}
        >
          <MoreHorizontalFilled/>
        </IconButton>
      </Tooltip>
      <ControlledMenu
        state={isMenuOpen ? 'open' : 'closed'} onClose={() => setMenuOpen(false)}
        anchorRef={menuRef} theming={actualTheme === 'dark' ? 'dark' : 'light'}>
        <SubMenu label={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Color20Regular/>
            <Typography>
              {t('window.switch_theme')}
            </Typography>
            <Typography sx={kbdSx}>Ctrl</Typography>
            <Typography>+</Typography>
            <Typography sx={kbdSxNoMl}>T</Typography>
          </Box>
        } instanceRef={themeSubmenuRef}>
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
            <Typography sx={kbdSx}>Ctrl</Typography>
            <Typography>+</Typography>
            <Typography sx={kbdSxNoMl}>L</Typography>
          </Box>
        } instanceRef={languageSubmenuRef}>
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
        <MenuItem onClick={() => { setMenuOpen(false); onLyricRulesOpen(); }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextBulletListSquareEdit20Regular/>
            <Typography>
              {t('lyric_rules.title')}
            </Typography>
          </Box>
        </MenuItem>
      </ControlledMenu>
    </>
  );
};
