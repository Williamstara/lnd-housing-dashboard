import AttachFileIcon from "@mui/icons-material/AttachFile";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { resolvePreview } from "@/lib/mail-utils";

interface Template { id: string; name: string; message: string; attachmentName: string | null }
interface FloorPlan { id: string; aptName: string }

interface Props {
  template: Template | null;
  to: string[];
  bcc: boolean;
  subject: string;
  variables: Record<string, string>;
  matchedPlan: FloorPlan | null;
}

export default function EmailPreview({ template, to, bcc, subject, variables, matchedPlan }: Props) {
  const toDisplay = to.length === 0
    ? <span style={{ color: "#aaa" }}>mottagare@example.com</span>
    : bcc
      ? `${to.length} mottagare (BCC)`
      : to.join(", ");

  return (
    <Paper
      elevation={0}
      sx={{ flex: 1, border: 1, borderColor: "divider", borderRadius: 2, p: 3, display: "flex", flexDirection: "column", gap: 2 }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Förhandsvisning</Typography>
      {!template ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
          Välj en mall för att se förhandsvisning
        </Typography>
      ) : (
        <>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{bcc ? "BCC" : "Till"}</Typography>
            <Typography variant="body2">{toDisplay}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Ämne</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {[subject || template.name, variables.aptName].filter(Boolean).join(" ")}
            </Typography>
          </Box>
          <Divider />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>Innehåll</Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
              {resolvePreview(template.message, variables)}
            </Typography>
          </Box>
          {template.attachmentName && (
            <>
              <Divider />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AttachFileIcon fontSize="small" color="primary" />
                <Typography variant="caption">{template.attachmentName}</Typography>
              </Box>
            </>
          )}
          {matchedPlan && (
            <>
              <Divider />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AttachFileIcon fontSize="small" color="action" />
                <Typography variant="caption">{matchedPlan.aptName}.pdf</Typography>
              </Box>
            </>
          )}
        </>
      )}
    </Paper>
  );
}
