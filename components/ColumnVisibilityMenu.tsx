"use client";

import { useState, type MouseEvent } from "react";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";

export type ToggleableColumn = { key: string; label: string };

type Props = {
  columns: ToggleableColumn[];
  isVisible: (key: string) => boolean;
  onToggle: (key: string) => void;
};

// A small "which columns should show" menu, reused across every table in
// the app. Doesn't touch the underlying data or export — purely what's
// rendered. Stays open across multiple toggles rather than closing after
// each pick, since hiding several columns in one go is the common case.
export default function ColumnVisibilityMenu({ columns, isVisible, onToggle }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title="Visa/dölj kolumner">
        <IconButton aria-label="Visa eller dölj kolumner" size="small" onClick={(event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}>
          <ViewColumnIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {columns.map((col) => (
          <MenuItem key={col.key} onClick={() => onToggle(col.key)} dense>
            <Checkbox slotProps={{ input: { "aria-label": col.label } }} checked={isVisible(col.key)} size="small" sx={{ p: 0, mr: 1 }} />
            <ListItemText primary={col.label} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
