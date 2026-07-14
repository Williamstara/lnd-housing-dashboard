import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

interface Props {
  files: File[];
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UploadConfirmDialog({ files, loading, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={files.length > 0} onClose={onCancel}>
      <DialogTitle>
        Ladda upp {files.length} planritning{files.length !== 1 ? "ar" : ""}?
      </DialogTitle>
      <DialogContent>
        <List dense disablePadding>
          {files.map((f) => (
            <ListItem key={f.name} disableGutters>
              <ListItemText primary={f.name.replace(/\.pdf$/i, "")} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Avbryt</Button>
        <Button variant="contained" onClick={onConfirm} disabled={loading}>
          Ladda upp
        </Button>
      </DialogActions>
    </Dialog>
  );
}
