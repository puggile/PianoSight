# myMusic

Applicazione web che genera esercizi casuali di lettura a prima vista per pianisti.
L'utente visualizza un grand staff (chiave di violino + chiave di basso) generato casualmente,
con possibilita di riproduzione audio per verificare la propria lettura.

## Funzionalita

- **Grand staff a due mani** (V:1 treble + V:2 bass)
- **26 tonalita** su 6 modi: Maggiore, Minore, Dorico, Misolidio, Lidio, Frigio
- **3 livelli di difficolta** con progressione lineare
- **3 indicazioni di tempo**: 4/4, 3/4, 2/4
- **Battute selezionabili**: 4, 6 o 8
- **BPM regolabile**: 60-140 (default 90)
- **Bottone Random**: genera esercizi con tonalita, tempo e battute casuali da un pool configurabile
- **Configurazione Random**: modal con checkbox per scegliere quali parametri includere nel pool casuale; le preferenze persistono in localStorage
- **Espansione automatica per difficolta**: Principiante usa il pool configurato, Intermedio aggiunge G/Em/Bb/Gm + 3/4 + 8 battute, Avanzato usa tutte le opzioni disponibili
- **Dinamiche**: f, p, mf, mp assegnate automaticamente per sezione
- **Articolazioni**: staccato e legato con assegnazione variata

## Livelli di difficolta

### Principiante

- Le mani suonano **una per volta**: le misure sono divise 50/50 tra DX e SX
- L'ordine e casuale (a volte DX prima, a volte SX)
- Ogni blocco riceve un'articolazione diversa (uno staccato, l'altro legato)
- Staccato: deterministico sulle note brevi (durata <= croma/semiminima), assente sulle lunghe
- Legato: legatura unica sull'intera sezione
- Ritmi semplici: semibrevi, minime, semiminime
- Range DX: Do4-La4 | Range SX: Do3-Sol3

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
4. **Pause** (solo intermedio/avanzato): sostituzione probabilistica di singole note
5. **Articolazioni**: staccato deterministico sulle note corte (dur <= 2 unita), legatura piena o a gruppi
6. **Dinamiche**: una per sezione (beginner/intermedio) o ogni 2 misure (avanzato)
7. **Serializzazione**: il tutto viene convertito in notazione ABC e renderizzato tramite ABCJS

## Stack tecnologico

| Componente     | Tecnologia                          |
|----------------|-------------------------------------|
| Linguaggio     | JavaScript vanilla                  |
| Rendering note | [ABCJS](https://www.abcjs.net/) 6.x (CDN) |
| Audio          | ABCJS synth (Web Audio API)         |
| Build          | Nessuno (file statici)              |
| Stile          | CSS3 puro, responsive               |

## Struttura progetto

```
WebSightreading/
├── index.html        # Pagina singola + controlli UI
├── style.css         # Foglio di stile responsive
├── DESIGN.md         # Specifiche di design originali
├── README.md         # Questo file
└── js/
    ├── main.js       # Entry point, event listener, orchestrazione
    ├── generator.js  # Generazione casuale dello spartito (ABC notation)
    ├── renderer.js   # Wrapper ABCJS per rendering SVG
    └── player.js     # Riproduzione audio via ABCJS synth
```

## Utilizzo

Aprire `index.html` direttamente nel browser, oppure servire i file con:

```bash
npx serve .
```

1. Selezionare tonalita, difficolta, tempo, numero di battute e BPM
2. Cliccare **Genera** per creare un nuovo esercizio
3. Cliccare **Random** per generare con parametri casuali dal pool configurato
4. Cliccare l'icona **ingranaggio** (⚙) per aprire le impostazioni Random e personalizzare il pool di tonalita, tempi e battute
5. Cliccare **Play** per ascoltare lo spartito generato
6. Cliccare **Stop** per interrompere la riproduzione

Un esercizio viene generato automaticamente al caricamento della pagina.

## Esempio di output (Beginner, Do maggiore, 4/4)

```abc
X:1
T:Sight Reading Exercise
M:4/4
L:1/8
K:C
V:1 clef=treble
!f! .C2 .E2 .G2 .E2 | .D1 .E1 .F2 E4 | z8 | z8 |]
V:2 clef=bass
z8 | z8 | !p! (G,2 E,2 C,1 D,1 E,2 | D,4 C,4) |]
```
