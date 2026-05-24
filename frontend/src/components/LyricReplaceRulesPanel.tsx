import { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add24Regular, Delete24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { useSettingStore, LyricRule } from '@/store/SettingStore';
import { LyricsReplaceMode } from '@/libresvip_tauri_pb';

const RE_IGNORECASE = 2;
const RE_MULTILINE = 8;
const RE_DOTALL = 16;

const MODE_LABELS: Record<LyricsReplaceMode, string> = {
  [LyricsReplaceMode.FULL]: 'lyric_rules.full',
  [LyricsReplaceMode.ALPHABETIC]: 'lyric_rules.alphabetic',
  [LyricsReplaceMode.NON_ALPHABETIC]: 'lyric_rules.non_alphabetic',
  [LyricsReplaceMode.REGEX]: 'lyric_rules.regex',
};

function FlagsEditor({ flags, onChange }: { flags: number; onChange: (f: number) => void }) {
  const { t } = useTranslation();
  const toggle = (bit: number) => onChange(flags ^ bit);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <FormControlLabel
        control={<Checkbox size="small" checked={!!(flags & RE_IGNORECASE)} onChange={() => toggle(RE_IGNORECASE)} />}
        label={<Typography variant="caption">{t('lyric_rules.ignore_case')}</Typography>}
      />
      <FormControlLabel
        control={<Checkbox size="small" checked={!!(flags & RE_MULTILINE)} onChange={() => toggle(RE_MULTILINE)} />}
        label={<Typography variant="caption">{t('lyric_rules.multiline')}</Typography>}
      />
      <FormControlLabel
        control={<Checkbox size="small" checked={!!(flags & RE_DOTALL)} onChange={() => toggle(RE_DOTALL)} />}
        label={<Typography variant="caption">{t('lyric_rules.dotall')}</Typography>}
      />
    </Box>
  );
}

export function LyricReplaceRulesPanel() {
  const { t } = useTranslation();
  const {
    lyricReplaceRules,
    activeLyricPreset,
    addLyricPreset,
    removeLyricPreset,
    setActiveLyricPreset,
    addLyricRule,
    updateLyricRule,
    removeLyricRule,
  } = useSettingStore();

  const [newPresetName, setNewPresetName] = useState('');

  const presetNames = Object.keys(lyricReplaceRules);
  const currentRules: LyricRule[] = lyricReplaceRules[activeLyricPreset] ?? [];
  const isRegexMode = (rule: LyricRule) => rule.mode === LyricsReplaceMode.REGEX;

  return (
    <Box sx={{ p: 2, minWidth: 700 }}>
      <Toolbar disableGutters sx={{ gap: 1, flexWrap: 'wrap' }}>
        <Select
          size="small"
          value={activeLyricPreset}
          onChange={(e) => setActiveLyricPreset(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          {presetNames.map((name) => (
            <MenuItem key={name} value={name}>{name}</MenuItem>
          ))}
        </Select>

        <TextField
          size="small"
          label={t('lyric_rules.preset_name')}
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          sx={{ width: 150 }}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={<Add24Regular />}
          onClick={() => {
            if (newPresetName.trim()) {
              addLyricPreset(newPresetName.trim());
              setNewPresetName('');
            }
          }}
        >
          {t('lyric_rules.add_preset')}
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<Delete24Regular />}
          disabled={presetNames.length <= 1}
          onClick={() => removeLyricPreset(activeLyricPreset)}
        >
          {t('lyric_rules.remove_preset')}
        </Button>
      </Toolbar>

      <TableContainer sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>{t('lyric_rules.mode')}</TableCell>
              <TableCell>{t('lyric_rules.pattern_main')}</TableCell>
              <TableCell>{t('lyric_rules.replacement')}</TableCell>
              <TableCell>{t('lyric_rules.pattern_prefix')}</TableCell>
              <TableCell>{t('lyric_rules.pattern_suffix')}</TableCell>
              <TableCell>{t('lyric_rules.flags')}</TableCell>
              <TableCell>{t('lyric_rules.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentRules.map((rule, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Typography variant="caption">{t(MODE_LABELS[rule.mode])}</Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={rule.patternMain}
                    onChange={(e) => updateLyricRule(activeLyricPreset, idx, { patternMain: e.target.value })}
                    sx={{ width: 120 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={rule.replacement}
                    onChange={(e) => updateLyricRule(activeLyricPreset, idx, { replacement: e.target.value })}
                    sx={{ width: 120 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={rule.patternPrefix}
                    disabled={!isRegexMode(rule)}
                    onChange={(e) => updateLyricRule(activeLyricPreset, idx, { patternPrefix: e.target.value })}
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={rule.patternSuffix}
                    disabled={!isRegexMode(rule)}
                    onChange={(e) => updateLyricRule(activeLyricPreset, idx, { patternSuffix: e.target.value })}
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <FlagsEditor
                    flags={rule.flags}
                    onChange={(f) => updateLyricRule(activeLyricPreset, idx, { flags: f })}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title={t('converter.clear')}>
                    <IconButton size="small" onClick={() => removeLyricRule(activeLyricPreset, idx)}>
                      <Delete24Regular />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ alignSelf: 'center', mr: 1 }}>{t('lyric_rules.add_rule')}:</Typography>
        <ButtonGroup size="small" variant="outlined">
          <Button onClick={() => addLyricRule(activeLyricPreset, LyricsReplaceMode.FULL)}>
            {t('lyric_rules.full')}
          </Button>
          <Button onClick={() => addLyricRule(activeLyricPreset, LyricsReplaceMode.ALPHABETIC)}>
            {t('lyric_rules.alphabetic')}
          </Button>
          <Button onClick={() => addLyricRule(activeLyricPreset, LyricsReplaceMode.NON_ALPHABETIC)}>
            {t('lyric_rules.non_alphabetic')}
          </Button>
          <Button onClick={() => addLyricRule(activeLyricPreset, LyricsReplaceMode.REGEX)}>
            {t('lyric_rules.regex')}
          </Button>
        </ButtonGroup>
      </Box>
    </Box>
  );
}
