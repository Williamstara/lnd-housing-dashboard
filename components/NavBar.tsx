"use client";

import { useState } from "react";
import { useUser } from "@auth0/nextjs-auth0";
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
import { getNationsId } from "@/lib/nations";
import { ROLES, hasRole, isRestrictedToTodo } from "@/lib/roles";

export const NAV_WIDTH = 272;
export const NAV_COLLAPSED_WIDTH = 72;

type NavigationProps = {
  isAdmin: boolean;
  restrictedToTodo: boolean;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
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

function Navigation({ isAdmin, restrictedToTodo, pathname, collapsed = false, onNavigate }: NavigationProps) {
  return (
    <Box sx={{ flex: 1, overflowY: "auto", py: 1 }}>
      {NAV_GROUPS.map((group) => {
        const links = navLinks.filter(
          (link) =>
            link.group === group.key &&
            (!link.adminOnly || isAdmin) &&
            (!restrictedToTodo || link.href === "/todo")
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

export default function NavBar() {
  const { user, isLoading } = useUser();
  const pathname = usePathname();
  const isAdmin = hasRole(user, ROLES.ADMIN);
  const restrictedToTodo = isRestrictedToTodo(user);
  const nationsId = getNationsId(user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
          pathname={pathname}
          collapsed={compact}
          onNavigate={onNavigate}
        />
      ) : (
        <Box sx={{ flex: 1 }} />
      )}
      <Divider sx={{ borderColor: alpha("#fff", 0.1) }} />
      <Box sx={{ p: compact ? 1.25 : 2 }}>
        {isLoading ? (
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
              <Avatar src={user.picture} alt="" sx={{ width: 34, height: 34 }} />
              <Box sx={{ minWidth: 0, display: compact ? "none" : "block" }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {user.name}
                </Typography>
                <Typography variant="caption" sx={{ color: alpha("#fff", 0.58) }}>
                  Visa profil
                </Typography>
              </Box>
            </Stack>
            {compact ? (
              <Tooltip title="Logga ut" placement="right">
                <IconButton component="a" href="/auth/logout" aria-label="Logga ut" color="inherit">
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Button component="a" href="/auth/logout" color="inherit" variant="outlined" fullWidth>
                Logga ut
              </Button>
            )}
          </Stack>
        ) : (
          <Button component="a" href="/auth/login" color="inherit" variant="outlined" fullWidth>
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
