"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { QUARTER_HOURS } from "@/lib/mail-utils";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}

export default function QuarterDateTimePicker({ label, value, onChange, required }: Props) {
  const [date, setDate] = useState(value ? value.split("T")[0] : "");
  const [time, setTime] = useState(value ? value.split("T")[1] : "12:00");

  useEffect(() => {
    if (!value) { setDate(""); setTime("12:00"); }
  }, [value]);

  function update(d: string, t: string) {
    onChange(d && t ? `${d}T${t}` : "");
  }

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <TextField
        type="date"
        label={label}
        value={date}
        onChange={(e) => { setDate(e.target.value); update(e.target.value, time); }}
        required={required}
        size="small"
        sx={{ flex: 1 }}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        select
        label="Tid"
        value={time}
        onChange={(e) => { setTime(e.target.value); update(date, e.target.value); }}
        required={required}
        size="small"
        sx={{ width: 105 }}
      >
        <MenuItem value="" disabled>HH:MM</MenuItem>
        {QUARTER_HOURS.map((t) => (
          <MenuItem key={t} value={t}>{t}</MenuItem>
        ))}
      </TextField>
    </Box>
  );
}
