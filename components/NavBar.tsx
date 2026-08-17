"use client";

import { useState } from "react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import HolidayVillageIcon from "@mui/icons-material/HolidayVillage";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { NAV_GROUPS, navLinks } from "@/lib/nav-links";
import { ROLES, hasRole, isRestrictedToTodo, normalizeRoles } from "@/lib/roles";
import { isFeatureEnabled } from "@/lib/table-columns";

export const NAV_WIDTH = 272;
export const NAV_COLLAPSED_WIDTH = 72;

type NavigationProps = {
  isAdmin: boolean;
  restrictedToTodo: boolean;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  enabledFeatures?: string[];
};

function Brand({ nationsId, compact = false }: { nationsId?: string; compact?: boolean }) {
  return (
    <Stack
      component={Link}
      href="/"
      direction="row"
      sx={{ alignItems: "center", gap: 1.5, color: "inherit", textDecoration: "none" }}
    >
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 42,
          height: 42,
          borderRadius: 2.5,
          bgcolor: "secondary.main",
          color: "primary.dark",
          flexShrink: 0,
        }}
      >
        <HolidayVillageIcon />
      </Box>
      <Box sx={{ minWidth: 0, display: compact ? "none" : "block" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
          {nationsId ?? "LND"}
        </Typography>
        <Typography variant="caption" sx={{ color: alpha("#fff", 0.66) }}>
          Housing Dashboard
        </Typography>
      </Box>
    </Stack>
  );
}

function Navigation({
  isAdmin,
  restrictedToTodo,
  pathname,
  collapsed = false,
  onNavigate,
  enabledFeatures,
}: NavigationProps) {
  return (
    <Box sx={{ flex: 1, overflowY: "auto", py: 1 }}>
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
          <List
            key={group.key}
            dense
            subheader={collapsed ? undefined : (
              <ListSubheader
                disableSticky
                sx={{
                  bgcolor: "transparent",
                  color: alpha("#fff", 0.5),
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  lineHeight: "32px",
                  textTransform: "uppercase",
                }}
              >
                {group.label}
              </ListSubheader>
            )}
            sx={{ px: collapsed ? 1 : 1.5, py: 0.5 }}
          >
            {links.map((link) => {
              const active = pathname === link.href;
              const item = (
                <ListItemButton
                  key={link.href}
                  component={Link}
                  href={link.href}
                  selected={active}
                  aria-label={collapsed ? link.label : undefined}
                  onClick={onNavigate}
                  sx={{
                    minHeight: 42,
                    justifyContent: collapsed ? "center" : "flex-start",
                    px: collapsed ? 1 : 2,
                    borderRadius: 2,
                    mb: 0.25,
                    color: alpha("#fff", active ? 1 : 0.78),
                    "&.Mui-selected": {
                      bgcolor: alpha("#F4EED9", 0.14),
                      boxShadow: "inset 3px 0 0 #F4EED9",
                    },
                    "&.Mui-selected:hover, &:hover": { bgcolor: alpha("#F4EED9", 0.1) },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 38, justifyContent: "center", color: "inherit" }}>
                    <link.icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={link.label}
                    sx={{ display: collapsed ? "none" : "block" }}
                    slotProps={{ primary: { sx: { fontSize: "0.84rem", fontWeight: active ? 700 : 500 } } }}
                  />
                </ListItemButton>
              );
              return collapsed ? (
                <Tooltip key={link.href} title={link.label} placement="right">
                  {item}
                </Tooltip>
              ) : item;
            })}
          </List>
        );
      })}
    </Box>
  );
}

type NavBarProps = { enabledFeatures?: string[] };

export default function NavBar({ enabledFeatures }: NavBarProps) {
  const { user, isLoaded } = useUser();
  const { sessionClaims } = useAuth();
  const { signOut } = useClerk();
  const roles = normalizeRoles(sessionClaims?.roles);
  const pathname = usePathname();
  const isAdmin = hasRole(roles, ROLES.ADMIN);
  const restrictedToTodo = isRestrictedToTodo(roles);
  const nationsId = typeof sessionClaims?.nations_id === "string" ? sessionClaims.nations_id : null;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // signOut()'s redirectUrl option navigates via Next's client-side router,
  // not a full page load -- the server-side auth.protect() check that
  // would redirect to /sign-in only runs on a fresh server render, so a
  // soft navigation can land back on a stale, still-authenticated-looking
  // cached shell of "/" instead. A hard navigation in the completion
  // callback guarantees a real server hit.
  function handleSignOut() {
    signOut(() => {
      window.location.href = "/";
    });
  }

  const content = (onNavigate?: () => void, compact = false) => (
    <Stack sx={{ height: "100%" }}>
      <Stack
        direction={compact ? "column" : "row"}
        sx={{ alignItems: "center", justifyContent: "space-between", gap: compact ? 1 : 0, px: compact ? 1 : 2.5, py: compact ? 1.5 : 2.5 }}
      >
        <Brand nationsId={nationsId ?? undefined} compact={compact} />
        {!onNavigate ? (
          <Tooltip title={compact ? "Expandera navigering" : "Minimera navigering"} placement="right">
            <IconButton
              aria-label={compact ? "Expandera navigering" : "Minimera navigering"}
              color="inherit"
              size="small"
              onClick={() => setCollapsed((value) => !value)}
            >
              {compact ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
      <Divider sx={{ borderColor: alpha("#fff", 0.1) }} />
      {user ? (
        <Navigation
          isAdmin={isAdmin}
          restrictedToTodo={restrictedToTodo}
          enabledFeatures={enabledFeatures}
          pathname={pathname}
          collapsed={compact}
          onNavigate={onNavigate}
        />
      ) : (
        <Box sx={{ flex: 1 }} />
      )}
      <Divider sx={{ borderColor: alpha("#fff", 0.1) }} />
      <Box sx={{ p: compact ? 1.25 : 2 }}>
        {!isLoaded ? (
          <CircularProgress size={20} color="inherit" />
        ) : user ? (
          <Stack spacing={1.5} sx={{ alignItems: compact ? "center" : "stretch" }}>
            <Stack
              component={Link}
              href="/profil"
              direction="row"
              onClick={onNavigate}
              aria-label={compact ? "Visa profil" : undefined}
              sx={{ alignItems: "center", justifyContent: compact ? "center" : "flex-start", gap: 1.25, color: "inherit", textDecoration: "none" }}
            >
              <Avatar src={user.imageUrl} alt="" sx={{ width: 34, height: 34 }} />
              <Box sx={{ minWidth: 0, display: compact ? "none" : "block" }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {user.fullName}
                </Typography>
                <Typography variant="caption" sx={{ color: alpha("#fff", 0.58) }}>
                  Visa profil
                </Typography>
              </Box>
            </Stack>
            {compact ? (
              <Tooltip title="Logga ut" placement="right">
                <IconButton onClick={() => handleSignOut()} aria-label="Logga ut" color="inherit">
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Button onClick={() => handleSignOut()} color="inherit" variant="outlined" fullWidth>
                Logga ut
              </Button>
            )}
          </Stack>
        ) : (
          <Button component={Link} href="/sign-in" color="inherit" variant="outlined" fullWidth>
            Logga in
          </Button>
        )}
      </Box>
    </Stack>
  );

  return (
    <>
      <AppBar position="fixed" sx={{ display: { xs: "block", md: "none" } }}>
        <Toolbar sx={{ gap: 1.5 }}>
          {user ? (
            <IconButton aria-label="Öppna meny" color="inherit" onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
          ) : null}
          <Brand nationsId={nationsId ?? undefined} />
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        aria-label="Huvudnavigering"
        sx={{ width: { md: collapsed ? NAV_COLLAPSED_WIDTH : NAV_WIDTH }, flexShrink: 0 }}
      >
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: collapsed ? NAV_COLLAPSED_WIDTH : NAV_WIDTH,
              boxSizing: "border-box",
              bgcolor: "primary.dark",
              color: "primary.contrastText",
              borderRight: 0,
              overscrollBehavior: "contain",
            },
          }}
        >
          {content(undefined, collapsed)}
        </Drawer>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: NAV_WIDTH,
              bgcolor: "primary.dark",
              color: "primary.contrastText",
              overscrollBehavior: "contain",
            },
          }}
        >
          {content(() => setMobileOpen(false))}
        </Drawer>
      </Box>
    </>
  );
}
