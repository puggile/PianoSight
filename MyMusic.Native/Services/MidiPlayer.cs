using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Melanchall.DryWetMidi.Core;
using Melanchall.DryWetMidi.Interaction;
using Melanchall.DryWetMidi.Common;

#if MACCATALYST || IOS
using AVFoundation;
using Foundation;
#endif

namespace MyMusic.Native.Services;

public class MidiPlayer : IDisposable
{
    private bool _disposed;
    private string? _tempFilePath;

    public bool IsPlaying { get; private set; }
    public event Action? PlaybackEnded;

#if MACCATALYST || IOS
    private AVMidiPlayer? _avPlayer;
#endif

    // ── Root note MIDI base values (within octave 0) ────────────────
    private static readonly Dictionary<string, int> RootNotes = new()
    {
        ["C"]  = 0,  ["C#"] = 1, ["Db"] = 1,
        ["D"]  = 2,  ["D#"] = 3, ["Eb"] = 3,
        ["E"]  = 4,  ["Fb"] = 4,
        ["F"]  = 5,  ["F#"] = 6, ["Gb"] = 6,
        ["G"]  = 7,  ["G#"] = 8, ["Ab"] = 8,
        ["A"]  = 9,  ["A#"] = 10, ["Bb"] = 10,
        ["B"]  = 11, ["Cb"] = 11,
    };

    // ── Mode semitone intervals from root ───────────────────────────
    private static readonly Dictionary<string, int[]> ModeIntervals = new()
    {
        ["major"]      = [0, 2, 4, 5, 7, 9, 11],
        ["minor"]      = [0, 2, 3, 5, 7, 8, 10],
        ["dorian"]     = [0, 2, 3, 5, 7, 9, 10],
        ["mixolydian"] = [0, 2, 4, 5, 7, 9, 10],
        ["lydian"]     = [0, 2, 4, 6, 7, 9, 11],
        ["phrygian"]   = [0, 1, 3, 5, 7, 8, 10],
    };

    private static string ParseRoot(string key)
    {
        string root = "";
        for (int i = 0; i < key.Length; i++)
        {
            char c = key[i];
            if (i == 0) { root += c; continue; }
            if (c == '#' || c == 'b') { root += c; continue; }
            break;
        }
        return root;
    }

    private static int ToMidiNote(int scaleDegree, int octave, int rootBase, int[] intervals)
    {
        int baseMidi = (octave + 1) * 12;
        int semitoneOffset = intervals[scaleDegree % 7];
        int extraOctaves = scaleDegree / 7;
        return baseMidi + rootBase + semitoneOffset + extraOctaves * 12;
    }

    private static SevenBitNumber DynamicToVelocity(string? dynamic)
    {
        int vel = dynamic switch
        {
            "f" => 100,
            "mf" => 80,
            "mp" => 64,
            "p" => 48,
            _ => 72,
        };
        return (SevenBitNumber)vel;
    }

    // ── Build MIDI file from MusicScore ─────────────────────────────
    private static MidiFile BuildMidiFile(MusicScore score, int bpm)
    {
        string mode = Generator.ParseMode(score.Key);
        string root = ParseRoot(score.Key);
        int rootBase = RootNotes.GetValueOrDefault(root, 0);
        int[] intervals = ModeIntervals[mode];

        int ticksPerBeat = 480;
        int ticksPerEighth = ticksPerBeat / 2;

        var tempoTrack = new TrackChunk();
        using (var manager = tempoTrack.ManageTimedEvents())
        {
            manager.Objects.Add(new TimedEvent(
                new SetTempoEvent((long)(60_000_000.0 / bpm)), 0));
        }

        var rhTrack = BuildTrack(score.RhMeasures, 0, rootBase, intervals, ticksPerEighth);
        var lhTrack = BuildTrack(score.LhMeasures, 1, rootBase, intervals, ticksPerEighth);

        var midiFile = new MidiFile(tempoTrack, rhTrack, lhTrack);
        midiFile.TimeDivision = new TicksPerQuarterNoteTimeDivision((short)ticksPerBeat);
        return midiFile;
    }

    private static TrackChunk BuildTrack(
        Measure[] measures, int channel, int rootBase, int[] intervals, int ticksPerEighth)
    {
        var track = new TrackChunk();

        using (var manager = track.ManageTimedEvents())
        {
            manager.Objects.Add(new TimedEvent(
                new ProgramChangeEvent((SevenBitNumber)0) { Channel = (FourBitNumber)channel }, 0));
        }

        var notes = new List<Note>();
        long currentTick = 0;
        SevenBitNumber currentVelocity = (SevenBitNumber)72;

        foreach (var measure in measures)
        {
            foreach (var noteEvent in measure.Notes)
            {
                long durationTicks = noteEvent.DurationEighths * ticksPerEighth;

                if (noteEvent.Dynamic != null)
                    currentVelocity = DynamicToVelocity(noteEvent.Dynamic);

                if (!noteEvent.IsRest)
                {
                    int midiNote = ToMidiNote(noteEvent.ScaleDegree, noteEvent.Octave, rootBase, intervals);
                    midiNote = Math.Clamp(midiNote, 0, 127);

                    long noteDuration = noteEvent.Staccato ? durationTicks / 2 : durationTicks - 10;
                    if (noteDuration < 10) noteDuration = 10;

                    notes.Add(new Note(
                        (SevenBitNumber)midiNote,
                        noteDuration,
                        currentTick)
                    {
                        Velocity = currentVelocity,
                        Channel = (FourBitNumber)channel,
                    });
                }

                currentTick += durationTicks;
            }
        }

        using (var notesManager = track.ManageNotes())
        {
            foreach (var note in notes)
                notesManager.Objects.Add(note);
        }
        return track;
    }

    // ── Playback via AVMIDIPlayer (Apple built-in synthesizer) ──────
    public void Play(MusicScore score, int bpm)
    {
        Stop();

        var midiFile = BuildMidiFile(score, bpm);

        // Write MIDI to temp file
        _tempFilePath = Path.Combine(Path.GetTempPath(), $"mymusic_{Guid.NewGuid():N}.mid");
        midiFile.Write(_tempFilePath, true);

#if MACCATALYST || IOS
        var url = NSUrl.FromFilename(_tempFilePath);
        _avPlayer = new AVMidiPlayer(url, null, out var error);

        if (error != null)
        {
            CleanupTempFile();
            throw new InvalidOperationException($"AVMIDIPlayer: {error.LocalizedDescription}");
        }

        _avPlayer.PrepareToPlay();
        IsPlaying = true;
        _avPlayer.Play(() =>
        {
            IsPlaying = false;
            CleanupTempFile();
            PlaybackEnded?.Invoke();
        });
#else
        CleanupTempFile();
        throw new PlatformNotSupportedException("MIDI playback requires macOS or iOS.");
#endif
    }

    public void Stop()
    {
#if MACCATALYST || IOS
        if (_avPlayer != null)
        {
            try { _avPlayer.Stop(); } catch { }
            _avPlayer.Dispose();
            _avPlayer = null;
        }
#endif
        IsPlaying = false;
        CleanupTempFile();
    }

    private void CleanupTempFile()
    {
        if (_tempFilePath != null)
        {
            try { File.Delete(_tempFilePath); } catch { }
            _tempFilePath = null;
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        Stop();
        GC.SuppressFinalize(this);
    }
}
