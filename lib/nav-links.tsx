import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import ApartmentIcon from "@mui/icons-material/Apartment";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import EmailIcon from "@mui/icons-material/Email";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import MapIcon from "@mui/icons-material/Map";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import StorageIcon from "@mui/icons-material/Storage";
import SubjectIcon from "@mui/icons-material/Subject";

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
    href: "/databas",
    label: "Databas",
    description: "Samtliga hyresobjekt med hyresdata och planritningar.",
    icon: StorageIcon,
  },
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
  {
    href: "/epost",
    label: "Skicka e-post",
    description: "Skicka e-post från Gmail med mallar och bifogade planritningar.",
    icon: EmailIcon,
  },
  {
    href: "/mallar",
    label: "E-postmallar",
    description: "Skapa och redigera mallar med variabler för utskick.",
    icon: SubjectIcon,
  },
  {
    href: "/planritningar",
    label: "Planritningar",
    description: "Ladda upp och hantera planritningar som PDF-filer.",
    icon: MapIcon,
  },
];
