"use client";

import { useState } from "react";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import type { AppRole, AppUser } from "@/lib/app-users";
import AdminPage from "@/components/AdminPage";
import AdminUsersPanel from "@/components/AdminUsersPanel";

type Props = { initialNationIds: string[]; initialUsers: AppUser[]; availableRoles: AppRole[] };

export default function AdminShell({ initialNationIds, initialUsers, availableRoles }: Props) {
  const [tab, setTab] = useState(0);

  return (
    <>
      <Tabs value={tab} onChange={(_event, value) => setTab(value)} sx={{ mb: 3 }}>
        <Tab label="Nationer & inställningar" />
        <Tab label="Användare utan nationsID" />
      </Tabs>
      {tab === 0 && <AdminPage initialNationIds={initialNationIds} />}
      {tab === 1 && (
        <AdminUsersPanel
          initialUsers={initialUsers}
          nationIds={initialNationIds}
          availableRoles={availableRoles}
        />
      )}
    </>
  );
}
