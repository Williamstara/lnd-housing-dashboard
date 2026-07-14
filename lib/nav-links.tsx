import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import ApartmentIcon from "@mui/icons-material/Apartment";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DomainIcon from "@mui/icons-material/Domain";
import EmailIcon from "@mui/icons-material/Email";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import MapIcon from "@mui/icons-material/Map";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import StorageIcon from "@mui/icons-material/Storage";
import SubjectIcon from "@mui/icons-material/Subject";

// Shared between NavBar (grouped dropdown menus) and the landing page
// (flat quick-link cards), so the two never drift out of sync.
export type NavGroupKey = "ekonomi" | "husforman" | "gemensamt";

export type NavLink = {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<SvgIconProps>;
  group: NavGroupKey;
};

export const NAV_GROUPS: Array<{ key: NavGroupKey; label: string }> = [
  { key: "husforman", label: "Husförmän" },
  { key: "gemensamt", label: "Gemensamt" },
  { key: "ekonomi", label: "Ekonomi" },
];

export const navLinks: NavLink[] = [
  {
    href: "/redo-for-kontrakt",
    label: "Redo för kontrakt",
    description: "Hyresgäster som väntar på signerat kontrakt.",
    icon: AssignmentTurnedInIcon,
    group: "ekonomi",
  },
  {
    href: "/uppsagning",
    label: "Uppsägning",
    description: "Bekräfta uppsagda lägenheter.",
    icon: EventBusyIcon,
    group: "ekonomi",
  },
  {
    href: "/besiktningar",
    label: "Besiktningar",
    description: "Flyttbesiktningar, städkostnader och avdrag.",
    icon: FactCheckIcon,
    group: "ekonomi",
  },
  {
    href: "/lediga-lagenheter",
    label: "Lediga lägenheter",
    description: "Lediga objekt och pågående uthyrningar.",
    icon: ApartmentIcon,
    group: "husforman",
  },
  {
    href: "/hyresgastlista",
    label: "Hyresgästlista",
    description: "Alla aktiva hyresgäster i fastighetsbeståndet.",
    icon: PeopleAltIcon,
    group: "husforman",
  },
  {
    href: "/epost",
    label: "Skicka e-post",
    description: "Skicka e-post från Gmail med mallar och bifogade planritningar.",
    icon: EmailIcon,
    group: "husforman",
  },
  {
    href: "/mallar",
    label: "E-postmallar",
    description: "Skapa och redigera mallar med variabler för utskick.",
    icon: SubjectIcon,
    group: "husforman",
  },
  {
    href: "/fastigheter",
    label: "Fastigheter",
    description: "Hantera fastigheter (byggnader) för din nation.",
    icon: DomainIcon,
    group: "husforman",
  },
  {
    href: "/statistik",
    label: "Statistik",
    description: "Missade hyror och annan statistik.",
    icon: QueryStatsIcon,
    group: "gemensamt",
  },
  {
    href: "/databas",
    label: "Databas",
    description: "Samtliga hyresobjekt med hyresdata och planritningar.",
    icon: StorageIcon,
    group: "gemensamt",
  },
  {
    href: "/planritningar",
    label: "Planritningar",
    description: "Ladda upp och hantera planritningar som PDF-filer.",
    icon: MapIcon,
    group: "gemensamt",
  },
  {
    href: "/arkiv",
    label: "Arkiv",
    description: "Avslutade och signerade kontrakt.",
    icon: Inventory2Icon,
    group: "gemensamt",
  },
];
