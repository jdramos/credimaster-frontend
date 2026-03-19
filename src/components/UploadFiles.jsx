import { useState } from "react";
import { Button, Stack, TextField } from "@mui/material";
import API from "../api";


export default function UploadCreditDoc({ loanId }) {
  const [docType, setDocType] = useState("ID");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");

  const upload = async () => {
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc_type", docType);
    fd.append("doc_name", file.name);

    const res = await API.post(`/api/credit-files/${loanId}/documents`, fd);

    const data = await res.json();
    if (!res.ok) {
      setMsg(data?.message || "Error subiendo");
      return;
    }

    setMsg(`Subido OK. id=${data.id}`);
    // si querés abrir el archivo inmediatamente:
    if (data.signed_url_60s) window.open(data.signed_url_60s, "_blank");
  };

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        label="Tipo documento"
        value={docType}
        onChange={(e) => setDocType(e.target.value)}
      />
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Button variant="contained" onClick={upload} disabled={!file}>
        Subir a Wasabi
      </Button>
      {msg && <div>{msg}</div>}
    </Stack>
  );
}