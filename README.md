# PianoSight

Applicazione web che genera esercizi casuali di lettura a prima vista per pianisti.
L'utente visualizza un grand staff (chiave di violino + chiave di basso) generato casualmente,
con possibilita di riproduzione audio e download PDF dello spartito.

## Funzionalita

- **Grand staff a due mani** (V:1 treble + V:2 bass)
- **26 tonalita** su 6 modi: Maggiore, Minore, Dorico, Misolidio, Lidio, Frigio
- **4 livelli di difficolta** con progressione lineare
- **3 indicazioni di tempo**: 4/4, 3/4, 2/4
- **Battute selezionabili**: 4, 6 o 8
- **BPM regolabile**: 60-140 (default 90)
- **Bottone Random**: genera esercizi con tonalita, tempo e battute casuali da un pool configurabile
- **Configurazione Random**: modal con checkbox per scegliere quali parametri includere nel pool casuale; le preferenze persistono in localStorage
- **Espansione automatica per difficolta**: Iniziale/Principiante usano il pool configurato, Intermedio aggiunge G/Em/Bb/Gm + 3/4 + 8 battute, Avanzato usa tutte le opzioni disponibili
- **Dinamiche**: f, p, mf, mp assegnate automaticamente per sezione
- **Articolazioni**: staccato, legato, o nessuna (solo iniziale)
- **Download PDF**: esportazione vettoriale dello spartito in formato A4 con nome file univoco basato sulle impostazioni

## Livelli di difficolta

### Iniziale

- Le mani suonano **una per volta**: le misure sono divise 50/50 tra DX e SX
- L'ordine e casuale (a volte DX prima, a volte SX)
- **75%**: ogni blocco riceve un'articolazione diversa (uno staccato, l'altro legato)
- **25%**: esercizio "pulito" senza articolazioni, con dinamiche contrastanti (f vs p)
- Staccato: deterministico sulle note brevi (durata <= croma/semiminima), assente sulle lunghe
- Legato: legatura unica sull'intera sezione
- Ritmi semplici: semibrevi, minime, semiminime
- 2 posizioni fisse: Do4-Sol4 / Re4-La4 (DX), Do3-Sol3 / Re3-La3 (SX)

### Principiante

- **5 posizioni DX** (Fa4-Do5, Do4-Sol4, Do5-Sol5, Sol4-Re5, La4-Mi5) e **3 posizioni SX** (Do3-Sol3, Fa2-Do3, Re3-La3), scelte casualmente
- Alternanza mani: blocchi di 1-2 misure, singole misure, e split intra-battuta (una mano per meta misura)
- Ritmi: semibrevi, minime, semiminime, crome
- **Accidentali**: solo 6° e 7° grado alzati (minore melodica), calcolati per tonalita (es. Do# in Rem, Fa#/Sol# in Lam)
- **Dinamiche controllate**: 1-3 per brano (distribuzione pesata)
- **Crescendo/diminuendo**: 0-4 per brano, durata da 3/4 di battuta a battuta intera + parte della successiva
- Accenti e staccato/legato casuali per blocco
- Pause occasionali (8%)

### Intermedio

- Mani ancora separate, ma **alternano ogni 1-2 misure** (cambi piu frequenti)
- Articolazione casuale per blocco (staccato o gruppi di legatura 2-3 note)
- Pause occasionali (4%)
- Ritmi piu vari: include semiminime e combinazioni miste
- Range DX: Do4-Do5 | Range SX: Sol2-Sol3

### Avanzato

- **Entrambe le mani suonano simultaneamente**
- DX: ritmi complessi (include crome), staccato sulle note corte + gruppi di legatura
- SX: ritmi semplici con gruppi di legatura
- Pause (8%)
- Dinamiche ogni 2 misure
- Range DX: Do4-Sol5 | Range SX: Do2-Sol3

## Algoritmo di generazione

1. **Assegnazione mani**: in base alla difficolta, ogni misura viene assegnata a DX, SX o entrambe
2. **Raggruppamento in blocchi**: le misure consecutive della stessa mano formano un blocco
3. **Generazione melodia**: per ogni blocco, le note vengono scelte dal pool della scala con:
   - Moto congiunto preferito (85%)
   - Salti occasionali di 2-4 gradi (15%)
   - Ultima nota del brano risolta sulla tonica piu vicina
4. **Pause** (solo principiante/intermedio/avanzato): sostituzione probabilistica di singole note
5. **Articolazioni**: staccato deterministico sulle note corte, legatura piena o a gruppi, oppure nessuna (iniziale 25%)
6. **Dinamiche**: contrastanti f/p (iniziale pulito), 1-3 distribuite (principiante), una per sezione (intermedio), ogni 2 misure (avanzato)
7. **Accidentali** (solo principiante): 6° e 7° grado alzati della scala, calcolati in base alla tonalita
8. **Serializzazione**: il tutto viene convertito in notazione ABC e renderizzato tramite ABCJS

## Stack tecnologico

| Componente     | Tecnologia                                         |
|----------------|-----------------------------------------------------|
| Linguaggio     | JavaScript vanilla                                  |
| Rendering note | [ABCJS](https://www.abcjs.net/) 6.6.1 (CDN + SRI) |
| Audio          | ABCJS synth (Web Audio API)                         |
| Export PDF     | [jsPDF](https://github.com/parallax/jsPDF) 2.5.2 + [svg2pdf.js](https://github.com/yWorks/svg2pdf.js) 2.3.0 (CDN + SRI) |
| Build          | Nessuno (file statici)                              |
| Stile          | CSS3 con custom properties, responsive a 3 breakpoint |

## Struttura progetto

```
WebSightreading/
├── index.html        # Pagina singola + controlli UI
├── style.css         # Design system con CSS custom properties
├── favicon.svg       # Icona tastiera SVG
├── LICENSE           # MIT License
├── README.md         # Questo file
└── js/
    ├── main.js       # Entry point, event listener, orchestrazione
    ├── generator.js  # Generazione casuale dello spartito (ABC notation)
    ├── renderer.js   # Wrapper ABCJS per rendering SVG
    ├── player.js     # Riproduzione audio via ABCJS synth
    └── pdf.js        # Export PDF vettoriale via jsPDF + svg2pdf.js
```

## Utilizzo

Aprire `index.html` direttamente nel browser, oppure servire i file con:

```bash
npx serve .
```

1. Selezionare tonalita, difficolta, tempo, numero di battute e BPM
2. Cliccare **Genera** per creare un nuovo esercizio
3. Cliccare **Random** per generare con parametri casuali dal pool configurato
4. Cliccare l'icona **ingranaggio** per aprire le impostazioni Random e personalizzare il pool
5. Cliccare **Play** per ascoltare lo spartito generato, **Stop** per interrompere
6. Cliccare l'icona **download** per scaricare il PDF dello spartito (nome file con tonalita, tempo, battute, difficolta e BPM)

Un esercizio viene generato automaticamente al caricamento della pagina.

## Licenza

[MIT](LICENSE)
