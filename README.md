# PadNotes — Taccuino Digitale per iPad, Apple Pencil & PC (Stile Goodnotes)

Web app progressiva (PWA) progettata per prendere appunti con **Apple Pencil** e **tastiera Bluetooth** su iPad, con accesso e sincronizzazione da PC e iPhone.

## ✨ Funzionalità Principali
- **Inchiostro Digitale & Sensibilità Pressione**: tratti fluidi con algoritmo vettoriale, evidenziatore realistico e forme geometriche.
- **Palm Rejection ("Solo Apple Pencil")**: appoggia la mano sullo schermo senza creare tratti indesiderati.
- **Gesture Torna Indietro (Undo)**: tocca lo schermo con 2 dita per annullare l'ultimo tratto (o usa il tasto dedicato). Con 3 dita ripristina (Redo).
- **Importazione Documenti**:
  - **PDF (.pdf)**: rendering vettoriale nitido, ogni pagina diventa un foglio annotabile.
  - **Word (.docx)**: impaginazione automatica del testo con margini per appunti.
  - **Apple Pages (.pages)**: estrazione dell'anteprima nativa o importazione facilitata via esportazione PDF.
- **Cartelle e Taccuini**: cartelle colorate (es. "Mass media", "Studio", "Progetti") e diversi tipi di carta (A Righe, A Quadretti, A Puntini, Bianco, Dark OLED).
- **Esportazione in PDF**: salva il taccuino completo con tutte le annotazioni e disegni in un file PDF pronto da stampare o condividere.
- **Sincronizzazione Cloud**: integrazione con Google Drive API e backup istantaneo `.padnotes` per consultare le note su qualsiasi dispositivo.

## 🚀 Avvio Locale
```bash
npm install
npm run dev -- --host
```
Apri Safari sul tuo iPad e collegati a:
`http://[IP-DEL-TUO-PC]:5173`
Poi tocca **Condividi > Aggiungi alla schermata Home**.
