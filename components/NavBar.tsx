"use client";

import { useState, type MouseEvent } from "react";
import { useUser } from "@auth0/nextjs-auth0";
import { usePathname } from "next/navigation";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HolidayVillageIcon from "@mui/icons-material/HolidayVillage";
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
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { NAV_GROUPS, navLinks, type NavGroupKey } from "@/lib/nav-links";
import { getNationsId } from "@/lib/nations";
import { ROLES, hasRole, isRestrictedToTodo } from "@/lib/roles";

function NavGroupMenu({
  groupKey,
  label,
  active,
  isAdmin,
  restrictedToTodo,
}: {
  groupKey: NavGroupKey;
  label: string;
  active: boolean;
  isAdmin: boolean;
  restrictedToTodo: boolean;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const links = navLinks.filter(
    (link) =>
      link.group === groupKey &&
      (!link.adminOnly || isAdmin) &&
      (!restrictedToTodo || link.href === "/todo")
  );
  if (links.length === 0) return null;

  function handleOpen(event: MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        endIcon={<ExpandMoreIcon fontSize="small" />}
        size="small"
        sx={{
          color: "inherit",
          px: 1.5,
          borderRadius: 1.5,
          bgcolor: active
            ? (theme) => alpha(theme.palette.secondary.main, 0.28)
            : "transparent",
          "&:hover": {
            bgcolor: (theme) => alpha(theme.palette.secondary.main, active ? 0.34 : 0.16),
          },
        }}
      >
        {label}
      </Button>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose}>
        {links.map((link) => (
          <MenuItem key={link.href} component={Link} href={link.href} onClick={handleClose}>
            <ListItemIcon>
              <link.icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{link.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function MobileNavDrawer({
  open,
  onClose,
  isAdmin,
  restrictedToTodo,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  restrictedToTodo: boolean;
  pathname: string;
}) {
  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 280 }} role="presentation">
        {NAV_GROUPS.map((group, index) => {
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
              subheader={<ListSubheader component="div">{group.label}</ListSubheader>}
            >
              {links.map((link) => (
                <ListItemButton
                  key={link.href}
                  component={Link}
                  href={link.href}
                  selected={link.href === pathname}
                  onClick={onClose}
                >
                  <ListItemIcon>
                    <link.icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={link.label} />
                </ListItemButton>
              ))}
              {index < NAV_GROUPS.length - 1 && <Divider sx={{ my: 1 }} />}
            </List>
          );
        })}
      </Box>
    </Drawer>
  );
}

export default function NavBar() {
  const { user, isLoading } = useUser();
  const pathname = usePathname();
  const isAdmin = hasRole(user, ROLES.ADMIN);
  const restrictedToTodo = isRestrictedToTodo(user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const nationsId = getNationsId(user);
  const appTitle = `${nationsId ?? "LND"} Housing Dashboard`;

  return (
    <AppBar position="static" color="primary" enableColorOnDark>
      <Toolbar sx={{ gap: 2, flexWrap: "wrap", py: 1.25 }}>
        {user && (
          <IconButton
            aria-label="Öppna meny"
            color="inherit"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: "inline-flex", sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Stack
          direction="row"
          component={Link}
          href="/"
          sx={{
            alignItems: "center",
            gap: 1,
            flexGrow: 1,
            color: "inherit",
            textDecoration: "none",
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 1.5,
              bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.9),
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            <HolidayVillageIcon fontSize="small" />
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              letterSpacing: -0.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {appTitle}
          </Typography>
        </Stack>

        {user && (
          <Stack direction="row" sx={{ display: { xs: "none", sm: "flex" }, flexWrap: "wrap", gap: 0.5 }}>
            {NAV_GROUPS.map((group) => {
              const active = navLinks.some(
                (link) => link.group === group.key && link.href === pathname
              );
              return (
                <NavGroupMenu
                  key={group.key}
                  groupKey={group.key}
                  label={group.label}
                  active={active}
                  isAdmin={isAdmin}
                  restrictedToTodo={restrictedToTodo}
                />
              );
            })}
          </Stack>
        )}

        {user && (
          <MobileNavDrawer
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            isAdmin={isAdmin}
            restrictedToTodo={restrictedToTodo}
            pathname={pathname}
          />
        )}

        {isLoading ? (
          <CircularProgress size={20} color="inherit" />
        ) : user ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              component={Link}
              href="/profil"
              sx={{ display: "flex", alignItems: "center", gap: 1, color: "inherit", textDecoration: "none", "&:hover": { opacity: 0.85 } }}
            >
              {user.picture && (
                <Avatar
                  src={user.picture}
                  alt={user.name ?? "User"}
                  sx={{
                    width: 32,
                    height: 32,
                    border: (theme) => `2px solid ${alpha(theme.palette.secondary.main, 0.7)}`,
                  }}
                />
              )}
              <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>
                {user.name}
              </Typography>
            </Box>
            <Button
              component="a"
              href="/auth/logout"
              color="inherit"
              variant="outlined"
              size="small"
              sx={{ borderColor: (theme) => alpha(theme.palette.secondary.main, 0.6) }}
            >
              Logga ut
            </Button>
          </Box>
        ) : (
          <Button
            component="a"
            href="/auth/login"
            color="inherit"
            variant="outlined"
            sx={{ borderColor: (theme) => alpha(theme.palette.secondary.main, 0.6) }}
          >
            Logga in
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
