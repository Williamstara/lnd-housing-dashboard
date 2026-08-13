"use client";

import { useUser } from "@auth0/nextjs-auth0";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { NAV_GROUPS, navLinks } from "@/lib/nav-links";
import { ROLES, hasRole, isRestrictedToTodo } from "@/lib/roles";
import { isFeatureEnabled } from "@/lib/table-columns";

type NavGridProps = { enabledFeatures?: string[] };

export default function NavGrid({ enabledFeatures }: NavGridProps) {
  const { user } = useUser();
  const isAdmin = hasRole(user, ROLES.ADMIN);
  const restrictedToTodo = isRestrictedToTodo(user);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 2 }}>
      {NAV_GROUPS.map((group) => {
        const links = navLinks.filter(
          (link) =>
            link.group === group.key &&
            (!link.adminOnly || isAdmin) &&
            (!restrictedToTodo || link.href === "/todo") &&
            isFeatureEnabled(enabledFeatures, link.featureKey)
        );
        if (links.length === 0) return null;
        return (
          <Paper key={group.key} variant="outlined" sx={{ overflow: "hidden" }}>
            <Typography
              variant="overline"
              sx={{ display: "block", px: 2, pt: 1.5, color: "primary.main", fontWeight: 700, letterSpacing: 1 }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {links.map((link) => (
                <ListItemButton
                  key={link.href}
                  component={Link}
                  href={link.href}
                  sx={{ px: 2, py: 1.25, alignItems: "flex-start", "&:hover": { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05) } }}
                >
                  <ListItemIcon sx={{ minWidth: 40, mt: 0.25, color: "primary.main" }}>
                    <link.icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={link.label}
                    secondary={link.description}
                    slotProps={{
                      primary: { sx: { fontWeight: 650, fontSize: "0.9rem" } },
                      secondary: { sx: { mt: 0.25, lineHeight: 1.35 } },
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        );
      })}
    </Box>
  );
}
