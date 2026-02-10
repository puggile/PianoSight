using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MyMusic.Native.Services;

// ── Data types ──────────────────────────────────────────────────────────
public record NoteEvent(
    int ScaleDegree,
    int Octave,
    int DurationEighths,
    bool IsRest,
    bool Staccato,
    string? Dynamic,
    bool SlurStart,
    bool SlurEnd);

public record Measure(NoteEvent[] Notes);

public record MusicScore(
    Measure[] RhMeasures,
    Measure[] LhMeasures,
    string Key,
    string TimeSig,
    int[] Progression)
{
    // ── ABC notation export ─────────────────────────────────────────
    public string ToAbc()
    {
        var sb = new StringBuilder();
        sb.AppendLine("X:1");
        sb.AppendLine("T:Sight-Reading Exercise");

        // Parse key root for ABC header
        string abcKey = Key.Replace(" dor", "Dor")
                            .Replace(" mix", "Mix")
                            .Replace(" lyd", "Lyd")
                            .Replace(" phr", "Phr");
        sb.AppendLine($"K:{abcKey}");

        var parts = TimeSig.Split('/');
        sb.AppendLine($"M:{TimeSig}");
        sb.AppendLine($"L:1/8");

        // RH voice
        sb.AppendLine("V:1 clef=treble");
        AppendVoice(sb, RhMeasures);

        // LH voice
        sb.AppendLine("V:2 clef=bass");
        AppendVoice(sb, LhMeasures);

        return sb.ToString();
    }

    private static void AppendVoice(StringBuilder sb, Measure[] measures)
    {
        for (int m = 0; m < measures.Length; m++)
        {
            var measure = measures[m];
            foreach (var n in measure.Notes)
            {
                if (n.SlurStart) sb.Append('(');

                if (n.IsRest)
                {
                    sb.Append('z');
                    if (n.DurationEighths != 1)
                        sb.Append(n.DurationEighths);
                }
                else
                {
                    sb.Append(NoteToAbc(n.ScaleDegree, n.Octave));
                    if (n.DurationEighths != 1)
                        sb.Append(n.DurationEighths);
                    if (n.Staccato) sb.Append('.');
                }

                if (n.SlurEnd) sb.Append(')');
                sb.Append(' ');
            }
            if (m < measures.Length - 1)
                sb.Append("| ");
            else
                sb.Append("|]");
        }
        sb.AppendLine();
    }

    // letterIdx: 0=C,1=D,2=E,3=F,4=G,5=A,6=B
    private static string NoteToAbc(int letterIdx, int octave)
    {
        char[] letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        char letter = letters[letterIdx];

        if (octave <= 4)
        {
            // Uppercase letter, commas for lower octaves
            string s = letter.ToString();
            int commas = 4 - octave;
            for (int i = 0; i < commas; i++) s += ",";
            return s;
        }
        else
        {
            // Lowercase letter, apostrophes for higher octaves
            string s = char.ToLower(letter).ToString();
            int apos = octave - 5;
            for (int i = 0; i < apos; i++) s += "'";
            return s;
        }
    }
}

// ── Generator ───────────────────────────────────────────────────────────
public static class Generator
{
    private static readonly Random _rng = new();

    // ── Chord progressions by mode ──────────────────────────────────
    private static readonly Dictionary<string, int[][]> ClosedProgressions = new()
    {
        ["major"]      = [[0,3,4,0], [0,5,4,0], [0,1,4,0]],
        ["minor"]      = [[0,3,4,0], [0,6,4,0], [0,5,4,0]],
        ["dorian"]     = [[0,3,4,0], [0,3,6,0], [0,1,3,0]],
        ["mixolydian"] = [[0,6,3,0], [0,3,6,0], [0,4,6,0]],
        ["lydian"]     = [[0,1,6,0], [0,1,4,0], [0,6,1,0]],
        ["phrygian"]   = [[0,1,6,0], [0,1,3,0], [0,5,1,0]],
    };

    private static readonly Dictionary<string, int[][]> OpenProgressions = new()
    {
        ["major"]      = [[0,5,3,4], [0,1,3,4], [0,3,1,4]],
        ["minor"]      = [[0,3,5,4], [0,5,6,4], [0,3,6,4]],
        ["dorian"]     = [[0,3,6,4], [0,1,3,4], [0,6,3,4]],
        ["mixolydian"] = [[0,3,6,4], [0,6,3,4], [0,4,3,6]],
        ["lydian"]     = [[0,1,6,4], [0,6,1,4], [0,1,4,6]],
        ["phrygian"]   = [[0,1,5,3], [0,5,1,3], [0,1,3,6]],
    };

    // ── RH rhythm patterns ──────────────────────────────────────────
    private static readonly Dictionary<string, Dictionary<string, int[][]>> RhRhythms = new()
    {
        ["4/4"] = new()
        {
            ["beginner"]     = [[8], [4,4]],
            ["intermediate"] = [[4,4], [2,2,4], [4,2,2], [2,2,2,2], [2,4,2]],
            ["advanced"]     = [[4,4], [2,2,4], [4,2,2], [2,2,2,2], [2,4,2],
                                [1,1,2,2,2], [2,2,1,1,2], [2,2,2,1,1], [4,2,1,1]],
        },
        ["3/4"] = new()
        {
            ["beginner"]     = [[6], [4,2], [2,4]],
            ["intermediate"] = [[2,2,2], [4,2], [2,4]],
            ["advanced"]     = [[2,2,2], [1,1,2,2], [2,1,1,2], [2,2,1,1], [4,1,1], [1,1,4]],
        },
        ["2/4"] = new()
        {
            ["beginner"]     = [[4], [2,2]],
            ["intermediate"] = [[2,2], [4]],
            ["advanced"]     = [[2,2], [1,1,2], [2,1,1], [1,1,1,1]],
        },
    };

    // ── LH patterns (multiple per timesig/difficulty, randomly picked) ──
    // chordToneIndex: 0=root, 1=third, 2=fifth
    // Mirrors JS version: each difficulty has multiple patterns, one picked at random per measure
    private static readonly Dictionary<string, Dictionary<string, (int tone, int dur)[][]>> LhPatterns = new()
    {
        ["4/4"] = new()
        {
            ["beginner"] =
            [
                [(0, 8)],                                             // whole root
                [(0, 4), (2, 4)],                                     // root + fifth
            ],
            ["intermediate"] =
            [
                [(0, 8)],                                             // whole root
                [(0, 4), (2, 4)],                                     // root + fifth
                [(0, 2), (1, 2), (2, 2), (1, 2)],                    // ascending arpeggio
            ],
            ["advanced"] =
            [
                [(0, 8)],                                             // whole root
                [(0, 4), (2, 4)],                                     // root + fifth
                [(0, 2), (1, 2), (2, 2), (1, 2)],                    // ascending arpeggio
                [(0, 2), (2, 2), (1, 2), (2, 2)],                    // Alberti
                [(0, 2), (1, 2), (0, 2), (2, 2)],                    // bass + alternating
            ],
        },
        ["3/4"] = new()
        {
            ["beginner"] =
            [
                [(0, 6)],                                             // whole root
                [(0, 4), (2, 2)],                                     // root + fifth
            ],
            ["intermediate"] =
            [
                [(0, 6)],                                             // whole root
                [(0, 4), (2, 2)],                                     // root + fifth
                [(0, 2), (1, 2), (2, 2)],                             // ascending arpeggio
            ],
            ["advanced"] =
            [
                [(0, 6)],                                             // whole root
                [(0, 4), (2, 2)],                                     // root + fifth
                [(0, 2), (1, 2), (2, 2)],                             // ascending arpeggio
                [(0, 2), (2, 2), (1, 2)],                             // Alberti variant
            ],
        },
        ["2/4"] = new()
        {
            ["beginner"] =
            [
                [(0, 4)],                                             // whole root
                [(0, 2), (2, 2)],                                     // root + fifth
            ],
            ["intermediate"] =
            [
                [(0, 4)],                                             // whole root
                [(0, 2), (2, 2)],                                     // root + fifth
                [(0, 2), (1, 2)],                                     // root + third
            ],
            ["advanced"] =
            [
                [(0, 4)],                                             // whole root
                [(0, 2), (2, 2)],                                     // root + fifth
                [(0, 2), (1, 2)],                                     // root + third
                [(0, 1), (2, 1), (1, 1), (2, 1)],                    // Alberti
            ],
        },
    };

    private static (int tone, int dur)[] GetLhPattern(string timeSig, string difficulty)
    {
        var patterns = LhPatterns[timeSig][difficulty];
        return patterns[_rng.Next(patterns.Length)];
    }

    // ── Mode parsing ────────────────────────────────────────────────
    public static string ParseMode(string key)
    {
        if (key.Contains(" dor")) return "dorian";
        if (key.Contains(" mix")) return "mixolydian";
        if (key.Contains(" lyd")) return "lydian";
        if (key.Contains(" phr")) return "phrygian";
        // "m" but not "maj" and not "mix"
        if (key.Contains('m') && !key.Contains("maj") && !key.Contains("mix")) return "minor";
        return "major";
    }

    // ── Chord tones for a given scale degree (triad: root, third, fifth) ──
    private static int[] ChordTones(int root)
    {
        return [(root) % 7, (root + 2) % 7, (root + 4) % 7];
    }

    // ── Nearest note in pool to a target scale degree ──────────────
    private static (int letterIdx, int octave) NearestInPool(
        (int letterIdx, int octave)[] pool,
        int targetLetterIdx,
        (int letterIdx, int octave) current)
    {
        // Find all pool entries matching the target letter
        var matches = pool.Where(p => p.letterIdx == targetLetterIdx).ToArray();
        if (matches.Length == 0) return current;

        // Pick closest by absolute pitch distance
        int currentPitch = current.octave * 7 + current.letterIdx;
        return matches.OrderBy(m => Math.Abs(m.octave * 7 + m.letterIdx - currentPitch)).First();
    }

    // ── Strong beat detection ───────────────────────────────────────
    private static bool IsStrongBeat(int posEighths, string timeSig)
    {
        return timeSig switch
        {
            "4/4" => posEighths == 0 || posEighths == 4,
            "3/4" => posEighths == 0,
            "2/4" => posEighths == 0,
            _ => posEighths == 0,
        };
    }

    // ── Main generation ─────────────────────────────────────────────
    public static MusicScore Generate(
        int numMeasures = 4,
        string key = "C",
        string timeSig = "4/4",
        string difficulty = "intermediate")
    {
        string mode = ParseMode(key);

        // Pick progression
        int[] progression;
        if (numMeasures <= 4)
        {
            var opts = ClosedProgressions[mode];
            progression = opts[_rng.Next(opts.Length)];
        }
        else
        {
            var openOpts = OpenProgressions[mode];
            var closedOpts = ClosedProgressions[mode];
            var open = openOpts[_rng.Next(openOpts.Length)];
            var closed = closedOpts[_rng.Next(closedOpts.Length)];
            progression = [.. open, .. closed];
        }

        // Ensure progression length matches numMeasures
        while (progression.Length < numMeasures)
            progression = [.. progression, .. progression];
        progression = progression[..numMeasures];

        // Difficulty parameters
        double restProb = difficulty switch
        {
            "beginner" => 0.0,
            "intermediate" => 0.04,
            _ => 0.08,
        };
        double staccatoProb = difficulty switch
        {
            "beginner" => 0.0,
            "intermediate" => 0.12,
            _ => 0.20,
        };
        double slurProb = difficulty switch
        {
            "beginner" => 0.0,
            "intermediate" => 0.15,
            _ => 0.25,
        };

        string[] dynamics = ["f", "p", "mf", "mp"];

        // Pool: C4 to G5 = 12 notes
        var pool = new (int letterIdx, int octave)[]
        {
            (0,4),(1,4),(2,4),(3,4),(4,4),(5,4),(6,4),
            (0,5),(1,5),(2,5),(3,5),(4,5),
        };

        // ── Generate RH ─────────────────────────────────────────────
        var rhMeasures = new List<Measure>();
        var rhPatterns = RhRhythms[timeSig][difficulty];
        var current = pool[_rng.Next(pool.Length)];

        for (int m = 0; m < numMeasures; m++)
        {
            int chordRoot = progression[m];
            int[] chordDegrees = ChordTones(chordRoot);
            int[] rhythm = rhPatterns[_rng.Next(rhPatterns.Length)];

            string? measureDynamic = (m % 2 == 0) ? dynamics[(m / 2) % dynamics.Length] : null;

            var notes = new List<NoteEvent>();
            int pos = 0;
            for (int n = 0; n < rhythm.Length; n++)
            {
                int dur = rhythm[n];
                bool strong = IsStrongBeat(pos, timeSig);
                bool staccato = false;
                string? dyn = (n == 0) ? measureDynamic : null;

                if (!strong && _rng.NextDouble() < restProb)
                {
                    notes.Add(new NoteEvent(0, 4, dur, true, false, dyn, false, false));
                    pos += dur;
                    continue;
                }

                // Pick pitch
                if (strong)
                {
                    // Nearest chord tone
                    int bestDeg = chordDegrees
                        .OrderBy(d => Math.Abs(PitchDistance(current, (d, FindBestOctave(current, d)))))
                        .First();
                    current = (bestDeg, FindBestOctave(current, bestDeg));
                }
                else
                {
                    if (_rng.NextDouble() < 0.3)
                    {
                        // Chord tone
                        int bestDeg = chordDegrees
                            .OrderBy(d => Math.Abs(PitchDistance(current, (d, FindBestOctave(current, d)))))
                            .First();
                        current = (bestDeg, FindBestOctave(current, bestDeg));
                    }
                    else
                    {
                        // Step conjunct: +/-1 scale degree
                        int step = _rng.Next(2) == 0 ? 1 : -1;
                        int newLetter = current.letterIdx + step;
                        int newOctave = current.octave;
                        if (newLetter > 6) { newLetter = 0; newOctave++; }
                        else if (newLetter < 0) { newLetter = 6; newOctave--; }

                        // Clamp to pool range C4..G5
                        if (newOctave < 4 || (newOctave == 4 && newLetter < 0)) { newLetter = 0; newOctave = 4; }
                        if (newOctave > 5 || (newOctave == 5 && newLetter > 4)) { newLetter = 4; newOctave = 5; }

                        current = (newLetter, newOctave);
                    }
                }

                // Last note of last measure: resolve to nearest tonic
                if (m == numMeasures - 1 && n == rhythm.Length - 1)
                {
                    current = NearestInPool(pool, 0, current);
                }

                // Staccato on short weak-beat notes
                if (!strong && dur <= 2 && _rng.NextDouble() < staccatoProb)
                    staccato = true;

                notes.Add(new NoteEvent(current.letterIdx, current.octave, dur, false, staccato, dyn, false, false));
                pos += dur;
            }

            // Apply slurs
            ApplySlurs(notes, slurProb);

            rhMeasures.Add(new Measure([.. notes]));
        }

        // ── Generate LH ─────────────────────────────────────────────
        var lhMeasures = new List<Measure>();
        for (int m = 0; m < numMeasures; m++)
        {
            int chordRoot = progression[m];
            int[] chordDegrees = ChordTones(chordRoot);

            // Chord voicing: root in octave 3, third and fifth close above
            int rootLetter = chordDegrees[0];
            int thirdLetter = chordDegrees[1];
            int fifthLetter = chordDegrees[2];

            int rootOctave = 3;
            int thirdOctave = (thirdLetter > rootLetter) ? 3 : 4;
            int fifthOctave = (fifthLetter > rootLetter) ? 3 : 4;
            // If third is below fifth in letter index but octave puts it above, adjust
            if (thirdOctave * 7 + thirdLetter > fifthOctave * 7 + fifthLetter)
                fifthOctave = thirdOctave;

            var voicing = new (int letter, int octave)[]
            {
                (rootLetter, rootOctave),
                (thirdLetter, thirdOctave),
                (fifthLetter, fifthOctave),
            };

            string? measureDynamic = (m % 2 == 0) ? dynamics[(m / 2) % dynamics.Length] : null;
            var pattern = GetLhPattern(timeSig, difficulty);

            var notes = new List<NoteEvent>();
            for (int i = 0; i < pattern.Length; i++)
            {
                var (tone, dur) = pattern[i];
                var v = voicing[tone];
                string? dyn = (i == 0) ? measureDynamic : null;
                notes.Add(new NoteEvent(v.letter, v.octave, dur, false, false, dyn, false, false));
            }

            lhMeasures.Add(new Measure([.. notes]));
        }

        return new MusicScore([.. rhMeasures], [.. lhMeasures], key, timeSig, progression);
    }

    // ── Slur application ────────────────────────────────────────────
    private static void ApplySlurs(List<NoteEvent> notes, double slurProb)
    {
        if (slurProb <= 0) return;

        int i = 0;
        while (i < notes.Count)
        {
            if (!notes[i].IsRest && !notes[i].Staccato && _rng.NextDouble() < slurProb)
            {
                // Determine group length 2-3
                int groupLen = _rng.Next(2) == 0 ? 2 : 3;
                int end = Math.Min(i + groupLen, notes.Count);

                // Check all notes in group are non-rest, non-staccato
                bool valid = true;
                for (int j = i; j < end; j++)
                {
                    if (notes[j].IsRest || notes[j].Staccato) { valid = false; break; }
                }

                if (valid && end - i >= 2)
                {
                    notes[i] = notes[i] with { SlurStart = true };
                    notes[end - 1] = notes[end - 1] with { SlurEnd = true };
                    i = end;
                    continue;
                }
            }
            i++;
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────
    private static int PitchDistance((int letterIdx, int octave) a, (int letterIdx, int octave) b)
    {
        return (b.octave * 7 + b.letterIdx) - (a.octave * 7 + a.letterIdx);
    }

    private static int FindBestOctave((int letterIdx, int octave) current, int targetLetter)
    {
        int currentPitch = current.octave * 7 + current.letterIdx;
        // Try the same octave and +/-1, pick closest
        int bestOctave = current.octave;
        int bestDist = int.MaxValue;
        for (int o = current.octave - 1; o <= current.octave + 1; o++)
        {
            // Clamp to reasonable range (3-5)
            if (o < 3 || o > 5) continue;
            int pitch = o * 7 + targetLetter;
            int dist = Math.Abs(pitch - currentPitch);
            if (dist < bestDist)
            {
                bestDist = dist;
                bestOctave = o;
            }
        }
        return bestOctave;
    }
}
