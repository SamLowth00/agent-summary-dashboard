import { useEffect, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  Fab,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { useAssistantStream } from './useAssistantStream';

export const AssistantWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isStreaming, error, send } = useAssistantStream();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const submit = () => {
    send(input);
    setInput('');
  };

  return (
    <>
      {open && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 96,
            right: 24,
            width: 360,
            height: 480,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: (theme) => theme.zIndex.modal,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
          >
            <Typography variant="subtitle1">Assistant</Typography>
            <IconButton size="small" onClick={() => setOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box
            ref={listRef}
            sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}
          >
            {messages.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Ask about interactions for customers and agents.
              </Typography>
            )}
            <Stack spacing={1.5}>
              {messages.map((m, i) => (
                <Box
                  key={i}
                  sx={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor:
                      m.role === 'user' ? 'primary.main' : 'action.hover',
                    color:
                      m.role === 'user'
                        ? 'primary.contrastText'
                        : 'text.primary',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {m.content ||
                      (isStreaming && i === messages.length - 1 ? '…' : '')}
                  </Typography>
                </Box>
              ))}
            </Stack>
            {error && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 1, display: 'block' }}
              >
                {error}
              </Typography>
            )}
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              disabled={isStreaming}
            />
            <IconButton
              color="primary"
              onClick={submit}
              disabled={isStreaming || !input.trim()}
            >
              {isStreaming ? <CircularProgress size={20} /> : <SendIcon />}
            </IconButton>
          </Stack>
        </Paper>
      )}

      <Fab
        color="primary"
        aria-label="assistant"
        onClick={() => setOpen((v) => !v)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: (theme) => theme.zIndex.modal + 1,
        }}
      >
        {open ? <CloseIcon /> : <ChatBubbleOutlineIcon />}
      </Fab>
    </>
  );
};

export default AssistantWidget;
