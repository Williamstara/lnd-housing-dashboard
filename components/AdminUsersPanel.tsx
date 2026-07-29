"use client";

import { useMemo, useState, useTransition } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import SearchIcon from "@mui/icons-material/Search";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { assignNationsIdAction, deleteUserAction } from "@/app/admin/actions";
import type { AppUser } from "@/lib/app-users";

type Props = { initialUsers: AppUser[]; nationIds: string[] };

type SortKey = "name" | "email";

function matchesSearch(user: AppUser, query: string): boolean {
  if (!query) return true;
  return [user.name, user.email].join(" ").toLocaleLowerCase("sv").includes(query);
}

export default function AdminUsersPanel({ initialUsers, nationIds }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<SortKey>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("sv");
    const filtered = users.filter((u) => matchesSearch(u, query));
    const direction = order === "asc" ? 1 : -1;
    return filtered.sort(
      (a, b) => direction * a[orderBy].localeCompare(b[orderBy], "sv", { sensitivity: "base" })
    );
  }, [users, search, orderBy, order]);

  function handleSort(key: SortKey) {
    if (orderBy === key) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(key);
      setOrder("asc");
    }
    setPage(0);
  }

  function handleAssign(user: AppUser) {
    const nationsId = (selection[user.sub] ?? "").trim();
    if (!nationsId) {
      setError("Ange en nationsID att tilldela.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await assignNationsIdAction(user.sub, nationsId);
        setUsers((prev) => prev.filter((u) => u.sub !== user.sub));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  function handleDelete(user: AppUser) {
    if (!confirm(`Ta bort användaren "${user.name}" permanent? Detta går inte att ångra.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteUserAction(user.sub);
        setUsers((prev) => prev.filter((u) => u.sub !== user.sub));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Användare utan nationsID
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Alla som loggat in men saknar en nationsID. Användaren måste logga ut och in igen
        efter tilldelning för att ändringen ska slå igenom.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        placeholder="Sök namn eller e-post..."
        value={search}
        onChange={(event) => { setSearch(event.target.value); setPage(0); }}
        size="small"
        sx={{ mb: 2, maxWidth: 320 }}
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {users.length === 0 ? (
        <Typography color="text.secondary">Inga användare saknar nationsID.</Typography>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={orderBy === "name" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "name"}
                      direction={orderBy === "name" ? order : "asc"}
                      onClick={() => handleSort("name")}
                    >
                      Namn
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === "email" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "email"}
                      direction={orderBy === "email" ? order : "asc"}
                      onClick={() => handleSort("email")}
                    >
                      E-post
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Tilldela nationsID</TableCell>
                  <TableCell align="right">Åtgärder</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Inga träffar.
                    </TableCell>
                  </TableRow>
                ) : (
                  visible
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((user) => (
                      <TableRow key={user.sub}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Autocomplete
                            freeSolo
                            options={nationIds}
                            inputValue={selection[user.sub] ?? ""}
                            onInputChange={(_event, value) =>
                              setSelection((prev) => ({ ...prev, [user.sub]: value }))
                            }
                            disabled={isPending}
                            renderInput={(params) => (
                              <TextField {...params} size="small" placeholder="nationsID" />
                            )}
                            sx={{ minWidth: 220 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            disabled={isPending}
                            onClick={() => handleAssign(user)}
                            sx={{ mr: 1 }}
                          >
                            Tilldela
                          </Button>
                          <IconButton
                            aria-label="Ta bort"
                            size="small"
                            disabled={isPending}
                            onClick={() => handleDelete(user)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={visible.length}
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
      )}
    </Paper>
  );
}
