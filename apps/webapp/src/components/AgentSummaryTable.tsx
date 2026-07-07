import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { keepPreviousData } from '@tanstack/react-query';
import { useGetAgentSummary } from '../lib/api';
import { formatDate, formatDuration } from '../lib/formatters';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const CARD_HEIGHT = 800;

export const AgentSummaryTable = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minInteractions, setMinInteractions] = useState(1);

  const resetToFirstPage = () => setPage(0);

  const { data, isLoading, isError, isFetching } = useGetAgentSummary(
    {
      page: page + 1,
      pageSize,
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(minInteractions > 1 ? { minInteractions } : {}),
    },
    { query: { placeholderData: keepPreviousData } }
  );

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setMinInteractions(1);
    resetToFirstPage();
  };

  const hasActiveFilters = dateFrom !== '' || dateTo !== '' || minInteractions > 1;

  const rows = data?.data.data ?? [];
  const total = data?.data.total ?? 0;

  return (
    <Card
      sx={{
        p: 2,
        height: CARD_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        Agent Daily Summary
      </Typography>

      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 1 }}
      >
        <TextField
          label="From"
          type="date"
          size="small"
          value={dateFrom}
          onChange={(event) => {
            setDateFrom(event.target.value);
            resetToFirstPage();
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={dateTo}
          onChange={(event) => {
            setDateTo(event.target.value);
            resetToFirstPage();
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Min interactions"
          type="number"
          size="small"
          value={minInteractions}
          onChange={(event) => {
            const next = Math.max(1, Number(event.target.value) || 1);
            setMinInteractions(next);
            resetToFirstPage();
          }}
          slotProps={{ htmlInput: { min: 1 } }}
          sx={{ width: 150 }}
        />
        <Button
          size="small"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          Clear
        </Button>
      </Stack>

      <Box sx={{ height: 4, mb: 1 }}>{isFetching && <LinearProgress />}</Box>

      {isError ? (
        <Typography color="error">Failed to load agent summary.</Typography>
      ) : (
        <>
          <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Table size="small" stickyHeader aria-label="agent daily summary">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Agent</TableCell>
                  <TableCell align="right">Total Interactions</TableCell>
                  <TableCell align="right">Avg Length (hh:mm:ss)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>Loading…</TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>No data.</TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={`${row.date}-${row.agentName}-${index}`} hover>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell>{row.agentName}</TableCell>
                      <TableCell align="right">
                        {row.totalInteractions}
                      </TableCell>
                      <TableCell align="right">
                        {formatDuration(row.aveInteractionLength)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_event, newPage) => setPage(newPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => {
              setPageSize(parseInt(event.target.value, 10));
              setPage(0); 
            }}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          />
        </>
      )}
    </Card>
  );
};
