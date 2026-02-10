using MyMusic.Native.Services;

namespace MyMusic.Native;

public partial class MainPage : ContentPage
{
    // ── Key picker data ─────────────────────────────────────────────
    private static readonly (string display, string value)[] KeyOptions =
    [
        // Maggiore
        ("Do Maggiore (C)", "C"),
        ("Sol Maggiore (G)", "G"),
        ("Re Maggiore (D)", "D"),
        ("La Maggiore (A)", "A"),
        ("Mi Maggiore (E)", "E"),
        ("Si Maggiore (B)", "B"),
        ("Fa Maggiore (F)", "F"),
        ("Sib Maggiore (Bb)", "Bb"),
        ("Mib Maggiore (Eb)", "Eb"),
        ("Lab Maggiore (Ab)", "Ab"),
        // Minore
        ("La minore (Am)", "Am"),
        ("Mi minore (Em)", "Em"),
        ("Si minore (Bm)", "Bm"),
        ("Fa# minore (F#m)", "F#m"),
        ("Re minore (Dm)", "Dm"),
        ("Sol minore (Gm)", "Gm"),
        ("Do minore (Cm)", "Cm"),
        ("Fa minore (Fm)", "Fm"),
        // Dorico
        ("Re Dorico", "D dor"),
        ("Sol Dorico", "G dor"),
        ("La Dorico", "A dor"),
        ("Do Dorico", "C dor"),
        // Misolidio
        ("Sol Misolidio", "G mix"),
        ("Do Misolidio", "C mix"),
        ("Re Misolidio", "D mix"),
        ("Fa Misolidio", "F mix"),
        // Lidio
        ("Fa Lidio", "F lyd"),
        ("Do Lidio", "C lyd"),
        ("Sol Lidio", "G lyd"),
        ("Sib Lidio", "Bb lyd"),
        // Frigio
        ("Mi Frigio", "E phr"),
        ("La Frigio", "A phr"),
        ("Si Frigio", "B phr"),
        ("Re Frigio", "D phr"),
    ];

    private static readonly string[] DifficultyOptions = ["beginner", "intermediate", "advanced"];
    private static readonly string[] DifficultyDisplayNames = ["Beginner", "Intermediate", "Advanced"];
    private static readonly string[] TimeSigOptions = ["4/4", "3/4", "2/4"];
    private static readonly string[] MeasuresOptions = ["4", "8"];

    private MusicScore? _currentScore;
    private MidiPlayer? _midiPlayer;
    private readonly ScoreDrawable _drawable = new();

    public MainPage()
    {
        InitializeComponent();
        SetupPickers();
        NotationView.Drawable = _drawable;
        Loaded += OnPageLoaded;
    }

    private void SetupPickers()
    {
        foreach (var (display, _) in KeyOptions)
            KeyPicker.Items.Add(display);
        KeyPicker.SelectedIndex = 0;

        foreach (var d in DifficultyDisplayNames)
            DifficultyPicker.Items.Add(d);
        DifficultyPicker.SelectedIndex = 1;

        foreach (var ts in TimeSigOptions)
            TimeSigPicker.Items.Add(ts);
        TimeSigPicker.SelectedIndex = 0;

        foreach (var m in MeasuresOptions)
            MeasuresPicker.Items.Add($"{m} bars");
        MeasuresPicker.SelectedIndex = 0;
    }

    private void OnPageLoaded(object? sender, EventArgs e) => GenerateExercise();

    private void OnPickerChanged(object? sender, EventArgs e) { }

    private void OnBpmChanged(object? sender, ValueChangedEventArgs e)
    {
        int bpm = (int)Math.Round(e.NewValue);
        BpmLabel.Text = $"BPM  {bpm}";
    }

    private void OnGenerateClicked(object? sender, EventArgs e) => GenerateExercise();

    private void OnPlayStopClicked(object? sender, EventArgs e)
    {
        if (_midiPlayer?.IsPlaying == true)
            StopPlayback();
        else
            StartPlayback();
    }

    private void GenerateExercise()
    {
        try
        {
            StopPlayback();

            string key = KeyPicker.SelectedIndex >= 0
                ? KeyOptions[KeyPicker.SelectedIndex].value : "C";
            string difficulty = DifficultyPicker.SelectedIndex >= 0
                ? DifficultyOptions[DifficultyPicker.SelectedIndex] : "intermediate";
            string timeSig = TimeSigPicker.SelectedIndex >= 0
                ? TimeSigOptions[TimeSigPicker.SelectedIndex] : "4/4";
            int measures = MeasuresPicker.SelectedIndex >= 0
                ? int.Parse(MeasuresOptions[MeasuresPicker.SelectedIndex]) : 4;

            _currentScore = Generator.Generate(measures, key, timeSig, difficulty);

            _drawable.Score = _currentScore;
            NotationView.Invalidate();

            PlayStopBtn.IsEnabled = true;
            SetPlayState();

            string mode = Generator.ParseMode(key);
            string prog = string.Join(" - ", _currentScore.Progression.Select(ToRomanNumeral));
            ProgressionLabel.Text = $"{key} ({mode})  |  {timeSig}  |  {measures} bars  |  {prog}";
            StatusLabel.Text = "Generated new exercise";
        }
        catch (Exception ex)
        {
            StatusLabel.Text = $"Error: {ex.Message}";
        }
    }

    private void StartPlayback()
    {
        if (_currentScore == null) return;

        try
        {
            _midiPlayer?.Dispose();
            _midiPlayer = new MidiPlayer();
            _midiPlayer.PlaybackEnded += OnPlaybackEnded;

            int bpm = (int)Math.Round(BpmSlider.Value);
            _midiPlayer.Play(_currentScore, bpm);

            SetStopState();
            StatusIndicator.IsVisible = true;
            StatusLabel.Text = $"Playing at {bpm} BPM...";
        }
        catch (Exception ex)
        {
            StatusLabel.Text = $"Playback error: {ex.Message}";
            SetPlayState();
        }
    }

    private void StopPlayback()
    {
        if (_midiPlayer != null)
        {
            _midiPlayer.PlaybackEnded -= OnPlaybackEnded;
            _midiPlayer.Stop();
            _midiPlayer.Dispose();
            _midiPlayer = null;
        }
        SetPlayState();
        StatusIndicator.IsVisible = false;
    }

    private void OnPlaybackEnded()
    {
        MainThread.BeginInvokeOnMainThread(() =>
        {
            SetPlayState();
            StatusIndicator.IsVisible = false;
            StatusLabel.Text = "Playback finished";
        });
    }

    private void SetPlayState()
    {
        PlayStopBtn.Text = "Play";
        PlayStopBtn.BackgroundColor = Color.FromArgb("#10b981");
    }

    private void SetStopState()
    {
        PlayStopBtn.Text = "Stop";
        PlayStopBtn.BackgroundColor = Color.FromArgb("#ef4444");
    }

    private static string ToRomanNumeral(int degree) => degree switch
    {
        0 => "I", 1 => "ii", 2 => "iii", 3 => "IV",
        4 => "V", 5 => "vi", 6 => "vii", _ => degree.ToString(),
    };
}

// ── Custom drawable ─────────────────────────────────────────────────
public class ScoreDrawable : IDrawable
{
    public MusicScore? Score { get; set; }

    public void Draw(ICanvas canvas, RectF dirtyRect)
    {
        if (Score == null)
        {
            canvas.FillColor = Color.FromArgb("#fefcf3");
            canvas.FillRectangle(dirtyRect);
            canvas.FontColor = Color.FromArgb("#94a3b8");
            canvas.FontSize = 15;
            canvas.DrawString("Click 'Generate' to create an exercise",
                              dirtyRect.X, dirtyRect.Y, dirtyRect.Width, dirtyRect.Height,
                              HorizontalAlignment.Center, VerticalAlignment.Center);
            return;
        }

        NotationRenderer.Render(canvas, Score, dirtyRect.Width, dirtyRect.Height);
    }
}
