# myMusic - Generatore di Esercizi di Notazione per Pianoforte

## Obiettivo

Applicazione web che genera esercizi di lettura musicale per pianisti principianti.
L'utente visualizza uno spartito generato casualmente e può riprodurlo per verificare
la propria lettura.

## Funzionalità v1 (Beginner)

### Generazione dello spartito

- **Tempo in chiave**: 4/4 (fisso per semplicità)
- **Numero di battute**: selezionabile dall'utente (4 oppure 8)
- **Durate delle note**: intero (4/4), metà (2/4), quarto (1/4), ottavo (1/8)
- **Estensione**: da Do3 (C4 MIDI) a Sol4 (G5 MIDI) — una ottava e mezza,
  zona comoda per principianti, solo chiave di violino
- **Pause**: sì, stesse durate delle note (intero, metà, quarto, ottavo)
- **Alterazioni**: nessuna (solo tasti bianchi, tonalità di Do maggiore)
- **Dinamiche / articolazioni**: nessuna

### Visualizzazione

- Pentagramma con chiave di violino renderizzato nel browser
- Le note vengono disegnate sullo spartito con gambi, code e punti corretti
- Indicazione del tempo (4/4) a inizio spartito
- Stanghette di battuta e doppia stanghetta finale
- Libreria di rendering: **VexFlow** (open source, standard de facto per notazione web)

### Riproduzione audio

- Pulsante **Play** per ascoltare lo spartito generato
- Pulsante **Stop** per interrompere
- Tempo (BPM) configurabile dall'utente (default: 90 BPM)
- Suono: oscillatore sintetizzato semplice via **Web Audio API**
  (nessuna dipendenza esterna)

### Interfaccia utente

- Pagina singola (SPA), niente backend
- Controlli:
  - Selettore battute: 4 / 8
  - Slider BPM: 60–140
  - Pulsante **Genera nuovo esercizio**
  - Pulsante **Play / Stop**
- Design minimal e responsive

## Stack tecnologico

| Componente       | Scelta                        |
|------------------|-------------------------------|
| Linguaggio       | JavaScript (vanilla ES6+)     |
| Rendering note   | VexFlow 4.x (via CDN)        |
| Audio            | Web Audio API (built-in)      |
| Build            | Nessuno (file statici)        |
| Hosting locale   | Apertura diretta del file HTML oppure `npx serve` |

## Struttura file

```
myMusic/
├── index.html       # Pagina principale + UI
├── style.css        # Stile minimale
├── js/
│   ├── main.js      # Entry point, event listener, orchestrazione
│   ├── generator.js # Logica di generazione casuale dello spartito
│   ├── renderer.js  # Rendering VexFlow sul canvas/SVG
│   └── player.js    # Riproduzione audio via Web Audio API
├── DESIGN.md        # Questo documento
└── README.md        # (futuro) istruzioni d'uso
```

## Algoritmo di generazione

1. Per ogni battuta, riempire 4/4 di durate:
   - Scegliere casualmente una durata tra {1, 1/2, 1/4, 1/8}
   - Decidere casualmente se è nota o pausa (probabilità nota ~85%)
   - Se nota, scegliere un'altezza casuale nell'estensione consentita,
     con preferenza per movimenti per grado congiunto (intervallo di 2a)
     per produrre melodie più naturali
   - Accumulare le durate fino a completare la battuta (4/4)
   - Se la durata scelta sfora la battuta, scegliere la durata che completa
     esattamente lo spazio rimasto
2. Ripetere per tutte le battute richieste

## Possibili evoluzioni future

- Chiave di basso / gran rigo (mano sinistra + destra)
- Tonalità diverse (alterazioni in chiave)
- Durate più brevi (1/16) e punti di valore
- Accordi semplici
- Modalità quiz: l'utente clicca le note che legge e riceve feedback
- Esportazione MIDI / PDF
- Livelli di difficoltà progressivi

---

*Documento creato il 2026-02-10*
