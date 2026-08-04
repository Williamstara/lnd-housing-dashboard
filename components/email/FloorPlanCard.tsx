import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

interface FloorPlan { id: string; aptName: string }

interface Props {
  plan: FloorPlan;
  onEdit: (plan: FloorPlan) => void;
  onDelete: (id: string) => void;
}

export default function FloorPlanCard({ plan, onEdit, onDelete }: Props) {
  const fileUrl = `/api/floor-plans/${plan.id}/file`;
  return (
    <Card sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <CardContent sx={{ pb: 0.5 }}>
        <Typography variant="subtitle2" align="center" noWrap>{plan.aptName}</Typography>
      </CardContent>
      <Box sx={{ mx: 1, height: 200, bgcolor: "grey.100", overflow: "hidden", flexShrink: 0, borderRadius: 1 }}>
        <iframe
          src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
          title={plan.aptName}
        />
      </Box>
      <CardActions sx={{ justifyContent: "flex-end", pt: 0.5 }}>
        <IconButton aria-label={`Öppna planritning för ${plan.aptName}`} size="small" href={fileUrl} target="_blank" title="Öppna fil">
          <OpenInNewIcon fontSize="small" />
        </IconButton>
        <IconButton aria-label={`Byt namn på planritning för ${plan.aptName}`} size="small" onClick={() => onEdit(plan)} title="Byt namn">
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton aria-label={`Ta bort planritning för ${plan.aptName}`} size="small" onClick={() => onDelete(plan.id)} color="error" title="Ta bort">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}
