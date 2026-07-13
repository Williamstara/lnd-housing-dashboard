import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import ApartmentIcon from "@mui/icons-material/Apartment";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

// Shared between NavBar (top links) and the landing page (quick-link
// cards), so the two never drift out of sync.
export type NavLink = {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<SvgIconProps>;
};

export const navLinks: NavLink[] = [
  {
    href: "/hyresgastlista",
    label: "Hyresgästlista",
    description: "Alla aktiva hyresgäster i fastighetsbeståndet.",
    icon: PeopleAltIcon,
  },
  {
    href: "/lediga-lagenheter",
    label: "Lediga lägenheter",
    description: "Lediga objekt och pågående uthyrningar.",
    icon: ApartmentIcon,
  },
  {
    href: "/redo-for-kontrakt",
    label: "Redo för kontrakt",
    description: "Hyresgäster som väntar på signerat kontrakt.",
    icon: AssignmentTurnedInIcon,
  },
  {
    href: "/arkiv",
    label: "Arkiv",
    description: "Avslutade och signerade kontrakt.",
    icon: Inventory2Icon,
  },
  {
    href: "/uppsagning",
    label: "Uppsägning",
    description: "Bekräfta uppsagda lägenheter.",
    icon: EventBusyIcon,
  },
];
