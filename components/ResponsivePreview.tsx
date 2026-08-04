"use client";

import { useState, type Key, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

export type PreviewColumn<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

type Props<T> = {
  ariaLabel: string;
  rows: T[];
  columns: PreviewColumn<T>[];
  rowKey?: (row: T, index: number) => Key;
};

export default function ResponsivePreview<T>({ ariaLabel, rows, columns, rowKey }: Props<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const pageRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <Box sx={{ display: { xs: "none", sm: "block" } }}>
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader aria-label={ariaLabel}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.key} align={column.align}>{column.label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((row, index) => (
                <TableRow key={rowKey?.(row, index) ?? index}>
                  {columns.map((column) => (
                    <TableCell key={column.key} align={column.align}>{column.render(row)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Stack role="list" spacing={1.5} sx={{ display: { xs: "flex", sm: "none" } }}>
        {pageRows.map((row, index) => (
          <Card role="listitem" key={rowKey?.(row, index) ?? index} variant="outlined">
            <CardContent
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 1.5,
                "&:last-child": { pb: 2 },
              }}
            >
              {columns.map((column) => (
                <Box key={column.key} sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    {column.label}
                  </Typography>
                  <Box sx={{ overflowWrap: "anywhere", textAlign: column.align }}>{column.render(row)}</Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        ))}
      </Stack>

      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Rader per sida:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} av ${count}`}
      />
    </>
  );
}
